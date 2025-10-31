#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { requireConfig } from './config.js';

// Use GraphQL fetch path for reliability in this environment
const calibreClient = null;

const ROOT = path.resolve(process.cwd(), '../../');
const PERF_DIR = path.join(ROOT, 'data', 'performance');
const OUT_DIR = path.join(PERF_DIR, 'out');

const cfg = requireConfig();
let CALIBRE_TOKEN = cfg.calibre.token;
let CALIBRE_SITE = cfg.calibre.site; // preferred slug
const CALIBRE_SITE_ID = cfg.calibre.siteId; // optional site id
const PAGE_UUIDS = cfg.calibre.pageUuids || process.env.PAGE_UUIDS || '';

// Fallback to environment variables for backwards compatibility
if (!CALIBRE_TOKEN) CALIBRE_TOKEN = process.env.CALIBRE_TOKEN;
if (!CALIBRE_SITE) CALIBRE_SITE = process.env.CALIBRE_SITE;

if (!CALIBRE_TOKEN) {
  console.error('Missing Calibre API token in config.json or CALIBRE_TOKEN environment variable.');
  process.exit(1);
}

const ENDPOINT = 'https://api.calibreapp.com/graphql';

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CALIBRE_TOKEN}` },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(`Calibre GraphQL error: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
}

async function getPagesBySiteSlug(slug) {
  const query = `
    query SitePages($slug: String!) {
      site(slug: $slug) {
        id
        slug
        name
        primaryDomain { url }
        pages(first: 500) { nodes { uuid url } }
        snapshots(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { id createdAt label } }
      }
    }
  `;
  const data = await gql(query, { slug });
  return data.site;
}

async function getPagesBySiteId(id) {
  const query = `
    query SiteById($id: ID!) {
      site(id: $id) {
        id
        slug
        name
        primaryDomain { url }
        pages(first: 500) { nodes { uuid url } }
        snapshots(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { id createdAt label } }
      }
    }
  `;
  const data = await gql(query, { id });
  return data.site;
}

async function fetchMetricsForPage(pageId) {
  const query = `
    query PageMetrics($id: ID!) {
      page(id: $id) {
        url
        latestMeasurements(limit: 1) {
          createdAt
          metrics {
            largestContentfulPaint { p95 }
            cumulativeLayoutShift { p95 }
            interactionToNextPaint { p95 }
          }
        }
      }
    }
  `;
  const data = await gql(query, { id: pageId });
  const url = data.page?.url || null;
  const m = data.page?.latestMeasurements?.[0]?.metrics;
  const metrics = m ? {
    LCP: m.largestContentfulPaint?.p95 ?? null,
    CLS: m.cumulativeLayoutShift?.p95 ?? null,
    INP: m.interactionToNextPaint?.p95 ?? null
  } : { LCP: null, CLS: null, INP: null };
  return { url, metrics };
}

async function fetchLighthouseAudits(pageId) {
  const query = `
    query PageLighthouseAudits($id: ID!) {
      page(id: $id) {
        url
        latestMeasurements(limit: 1) {
          lighthouse {
            audits {
              id
              title
              description
              score
              displayValue
              details {
                type
                ... on LighthouseAuditDetailsTable {
                  headings { key label valueType }
                  items {
                    ... on LighthouseAuditDetailsTableItem {
                      lcpElement { type selector url }
                      node { type selector lhId }
                      sources {
                        ... on LighthouseAuditDetailsSource {
                          value
                          url
                          previousRect { x y width height }
                          currentRect { x y width height }
                          node { type selector lhId }
                        }
                      }
                      node { type selector lhId }
                      eventTime
                      interactionType
                    }
                  }
                }
                ... on LighthouseAuditDetailsList {
                  items {
                    ... on LighthouseAuditDetailsListItem {
                      lcpElement { type selector url }
                      node { type selector lhId }
                      sources {
                        ... on LighthouseAuditDetailsSource {
                          value
                          url
                          previousRect { x y width height }
                          currentRect { x y width height }
                          node { type selector lhId }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const data = await gql(query, { id: pageId });
    const url = data.page?.url || null;
    const audits = data.page?.latestMeasurements?.[0]?.lighthouse?.audits || [];
    return { url, audits };
  } catch (err) {
    console.warn(`Failed to fetch Lighthouse audits for page ${pageId}:`, err.message);
    return { url: null, audits: [] };
  }
}

function candidateSlugs() {
  const base = 'www.xeroshoes.com';
  const candidates = new Set([
    CALIBRE_SITE,
    'xeroshoes-com',
    'www-xeroshoes-com',
    'xero-shoes',
    'xeroshoes',
    base?.replaceAll?.('.', '-')
  ].filter(Boolean));
  return Array.from(candidates);
}

async function main() {
  // Ensure out dir
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Try site by explicit ID first
  let site = null;
  if (CALIBRE_SITE_ID) {
    try {
      const s = await getPagesBySiteId(CALIBRE_SITE_ID);
      if (s && s.pages?.nodes?.length) site = s;
    } catch {}
  }

  // Try site by slug path
  if (!site) {
    for (const slug of candidateSlugs()) {
      try {
        const s = await getPagesBySiteSlug(slug);
        if (s && s.pages?.nodes?.length) { site = s; break; }
      } catch {}
    }
  }

  const results = {};
  let meta = null;

  if (site) {
    for (const p of site.pages.nodes) {
      const { url, metrics } = await fetchMetricsForPage(p.uuid);
      if (url) results[url] = metrics;
    }
    meta = {
      site: { id: site.id, slug: site.slug, name: site.name, domain: site.primaryDomain?.url || '' },
      snapshot: site.snapshots?.nodes?.[0] || null,
      pages: site.pages.nodes.length,
      generatedAt: new Date().toISOString()
    };
  } else if (PAGE_UUIDS) {
    // Fallback: use explicit page UUIDs from env and resolve URLs + metrics
    const ids = PAGE_UUIDS.split(',').map(s => s.trim()).filter(Boolean);
    for (const id of ids) {
      try {
        const { url, metrics } = await fetchMetricsForPage(id);
        if (url) results[url] = metrics;
      } catch {}
    }
    meta = { site: null, snapshot: null, pages: Object.keys(results).length, generatedAt: new Date().toISOString() };
  } else {
    console.warn('No Calibre site found and no PAGE_UUIDS provided; writing empty metrics.');
    fs.writeFileSync(path.join(OUT_DIR, 'calibre-metrics.json'), JSON.stringify({}, null, 2));
    return;
  }

  fs.writeFileSync(path.join(OUT_DIR, 'calibre-metrics.json'), JSON.stringify({ meta, metrics: results }, null, 2));
  console.log('Wrote', path.join(OUT_DIR, 'calibre-metrics.json'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


