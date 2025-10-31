#!/usr/bin/env node
/**
 * Fetch Lighthouse audits from Calibre for element-level performance diagnostics.
 * 
 * CURRENT STATE:
 * - ✅ Successfully extracts page UUIDs and URLs from TimeSeries data (calibre-timeseries.json)
 * - ✅ Automatically loads all pages returned in TimeSeries, prioritizing this source
 * - ⚠️  Lighthouse audit fetching via GraphQL API is not working:
 *     - Calibre's GraphQL schema doesn't expose page/lighthouseJson as expected
 *     - Various query patterns tested (organisation->site->page, root Query->page, etc.)
 *     - API may require different authentication or endpoint
 * 
 * FALLBACK BEHAVIOR:
 * - When Lighthouse audits are unavailable, the remediation system falls back to:
 *   - Diagnostic-based recommendations (TTFB, image sizes, JS bundle sizes)
 *   - Severity indicators and actionable step-by-step guidance
 *   - These are comprehensive but lack element-specific targeting
 * 
 * FUTURE ENHANCEMENT:
 * - Once Calibre API access pattern is identified, Lighthouse audit extraction will work automatically
 * - The extraction and remediation code is already structured to use Lighthouse data when available
 * - Check Calibre documentation or contact support for correct Lighthouse audit API endpoint
 * 
 * REFERENCE:
 * - Calibre examples: https://github.com/calibreapp/cli/tree/main/examples/nodejs
 */

import fs from 'fs';
import path from 'path';
import { requireConfig } from './config.js';

const ROOT = path.resolve(process.cwd(), '../../');
const OUT_DIR = path.join(ROOT, 'data', 'performance', 'out');

const cfg = requireConfig();
let CALIBRE_TOKEN = cfg.calibre.token;
let CALIBRE_SITE = cfg.calibre.site;
const CALIBRE_SITE_ID = cfg.calibre.siteId;
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
      organisation {
        site(slug: $slug) {
          id
          slug
          name
          primaryDomain { url }
          pages(first: 500) { nodes { uuid url } }
        }
      }
    }
  `;
  const data = await gql(query, { slug });
  return data.organisation?.site;
}

async function getPagesBySiteId(id) {
  const query = `
    query SiteById($id: ID!) {
      organisation {
        site(id: $id) {
          id
          slug
          name
          primaryDomain { url }
          pages(first: 500) { nodes { uuid url } }
        }
      }
    }
  `;
  const data = await gql(query, { id });
  return data.organisation?.site;
}

async function fetchLighthouseForPage(pageId, siteSlug = null) {
  // Using the same pattern as fetch-calibre.js: query page(id) at root Query level
  // This matches how Calibre's GraphQL API works
  const query = `
    query PageLighthouse($id: ID!) {
      page(id: $id) {
        url
        latestMeasurements(limit: 1) {
          id
          lighthouseJson
        }
      }
    }
  `;
  
  try {
    const data = await gql(query, { id: pageId });
    const page = data.page;
    const url = page?.url || null;
    const lighthouseJson = page?.latestMeasurements?.[0]?.lighthouseJson;
    
    if (!lighthouseJson) {
      return { url, lighthouse: null };
    }
    
    // Parse the Lighthouse JSON
    let lighthouse = null;
    try {
      lighthouse = typeof lighthouseJson === 'string' ? JSON.parse(lighthouseJson) : lighthouseJson;
    } catch (parseErr) {
      console.warn(`Failed to parse Lighthouse JSON for page ${pageId}:`, parseErr.message);
      return { url, lighthouse: null };
    }
    
    return { url, lighthouse };
  } catch (err) {
    console.warn(`Failed to fetch Lighthouse for page ${pageId}:`, err.message);
    return { url: null, lighthouse: null };
  }
}

function extractLCPElement(lighthouse) {
  if (!lighthouse?.audits) return null;
  
  const lcpAuditIds = [
    'largest-contentful-paint-element',
    'largest-contentful-paint'
  ];
  
  for (const auditId of lcpAuditIds) {
    const audit = lighthouse.audits?.find(a => a.id === auditId);
    if (!audit?.details) continue;
    
    const details = typeof audit.details === 'string' ? JSON.parse(audit.details) : audit.details;
    
    if (details.type === 'table' && details.items?.length) {
      const item = details.items[0];
      if (item.node?.selector || item.selector || item.element) {
        return {
          element: item.node?.selector || item.selector || item.element,
          url: item.url || item.node?.url || null,
          type: item.node?.type || item.type || 'unknown'
        };
      }
    }
    if (details.type === 'list' && details.items?.length) {
      const item = details.items[0];
      if (item.node?.selector || item.selector || item.element) {
        return {
          element: item.node?.selector || item.selector || item.element,
          url: item.url || item.node?.url || null,
          type: item.node?.type || item.type || 'unknown'
        };
      }
    }
    if (details.element || details.node) {
      return {
        element: details.node?.selector || details.element?.selector || details.element,
        url: details.url || details.node?.url || null,
        type: details.node?.type || details.type || 'unknown'
      };
    }
  }
  return null;
}

function extractCLSSources(lighthouse) {
  if (!lighthouse?.audits) return [];
  
  const clsAuditIds = ['cumulative-layout-shift', 'layout-shift-elements'];
  const sources = [];
  
  for (const auditId of clsAuditIds) {
    const audit = lighthouse.audits?.find(a => a.id === auditId);
    if (!audit?.details) continue;
    
    const details = typeof audit.details === 'string' ? JSON.parse(audit.details) : audit.details;
    
    if (details.type === 'table' && details.items?.length) {
      for (const item of details.items) {
        if (item.sources && Array.isArray(item.sources)) {
          sources.push(...item.sources.map(s => ({
            element: s.node?.selector || s.selector || s.element?.selector || s.element,
            shift: s.value || s.shift || s.score || null,
            previousRect: s.previousRect || null,
            currentRect: s.currentRect || null
          })));
        } else if (item.node || item.element) {
          sources.push({
            element: item.node?.selector || item.selector || item.element?.selector || item.element,
            shift: item.value || item.shift || item.score || null,
            previousRect: item.previousRect || null,
            currentRect: item.currentRect || null
          });
        }
      }
    }
    if (details.type === 'list' && details.items?.length) {
      for (const item of details.items) {
        if (item.sources && Array.isArray(item.sources)) {
          sources.push(...item.sources.map(s => ({
            element: s.node?.selector || s.selector || s.element?.selector || s.element,
            shift: s.value || s.shift || s.score || null,
            previousRect: s.previousRect || null,
            currentRect: s.currentRect || null
          })));
        }
      }
    }
    
    if (sources.length > 0) break;
  }
  
  return sources.sort((a, b) => (b.shift || 0) - (a.shift || 0)).slice(0, 5);
}

function extractINPInteractions(lighthouse) {
  if (!lighthouse?.audits) return [];
  
  const inpAuditIds = ['interaction-to-next-paint', 'no-slow-inp', 'inp'];
  const interactions = [];
  
  for (const auditId of inpAuditIds) {
    const audit = lighthouse.audits?.find(a => a.id === auditId);
    if (!audit?.details) continue;
    
    const details = typeof audit.details === 'string' ? JSON.parse(audit.details) : audit.details;
    
    if (details.type === 'table' && details.items?.length) {
      for (const item of details.items) {
        if (item.eventTime || item.interactionType || item.type) {
          interactions.push({
            element: item.node?.selector || item.selector || item.element?.selector || item.element || 'unknown',
            type: item.interactionType || item.type || item.eventType || 'unknown',
            delay: item.eventTime || item.delay || item.duration || null
          });
        }
      }
    }
    
    if (interactions.length > 0) break;
  }
  
  return interactions.sort((a, b) => (b.delay || 0) - (a.delay || 0)).slice(0, 3);
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
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

function loadPagesFromTimeSeries() {
  const timeseriesPath = path.join(OUT_DIR, 'calibre-timeseries.json');
  if (!fs.existsSync(timeseriesPath)) {
    return null;
  }
  
  try {
    const timeseries = JSON.parse(fs.readFileSync(timeseriesPath, 'utf8'));
    if (timeseries?.pages && Array.isArray(timeseries.pages) && timeseries.pages.length > 0) {
      return timeseries.pages.map(p => ({
        uuid: p.uuid,
        url: p.url
      }));
    }
  } catch (err) {
    console.warn(`Failed to load pages from timeseries: ${err.message}`);
  }
  
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  
  // Priority 1: Load pages from TimeSeries data (most reliable source)
  const timeseriesPages = loadPagesFromTimeSeries();
  
  // Priority 2: Try site lookup via API
  let site = null;
  if (!timeseriesPages && CALIBRE_SITE_ID) {
    try {
      const s = await getPagesBySiteId(CALIBRE_SITE_ID);
      if (s && s.pages?.nodes?.length) site = s;
    } catch (err) {
      console.warn(`Failed to fetch site by ID ${CALIBRE_SITE_ID}:`, err.message);
    }
  }
  
  if (!timeseriesPages && !site && CALIBRE_SITE) {
    for (const slug of candidateSlugs()) {
      try {
        const s = await getPagesBySiteSlug(slug);
        if (s && s.pages?.nodes?.length) { site = s; break; }
      } catch (err) {
        // Continue to next slug
      }
    }
  }
  
  const results = {};
  
  const siteSlug = site?.slug || CALIBRE_SITE;
  
  // Priority 1: Use pages from TimeSeries data
  if (timeseriesPages) {
    console.log(`\n📊 Loading ${timeseriesPages.length} pages from TimeSeries data`);
    console.log(`   Note: Lighthouse audit fetching may not work until Calibre API access is resolved`);
    for (const p of timeseriesPages) {
      try {
        const { url, lighthouse } = await fetchLighthouseForPage(p.uuid, siteSlug);
        if (!url || !lighthouse) {
          console.warn(`No Lighthouse data for ${p.url || p.uuid}`);
          continue;
        }
        
        const normalized = normalizeUrl(url);
        const extracted = {
          lcpElement: extractLCPElement(lighthouse),
          clsSources: extractCLSSources(lighthouse),
          inpInteractions: extractINPInteractions(lighthouse)
        };
        
        // Only add if we extracted at least one insight
        if (extracted.lcpElement || extracted.clsSources.length > 0 || extracted.inpInteractions.length > 0) {
          results[normalized] = extracted;
          console.log(`✓ Extracted Lighthouse insights for ${normalized}`);
        }
      } catch (err) {
        console.warn(`Failed to process page ${p.uuid}:`, err.message);
      }
    }
  } else if (site) {
    // Priority 2: Use pages from site lookup
    console.log(`Found site "${site.name || site.slug}" with ${site.pages.nodes.length} pages`);
    for (const p of site.pages.nodes) {
      try {
        const { url, lighthouse } = await fetchLighthouseForPage(p.uuid, siteSlug);
        if (!url || !lighthouse) {
          console.warn(`No Lighthouse data for ${p.url || p.uuid}`);
          continue;
        }
        
        const normalized = normalizeUrl(url);
        const extracted = {
          lcpElement: extractLCPElement(lighthouse),
          clsSources: extractCLSSources(lighthouse),
          inpInteractions: extractINPInteractions(lighthouse)
        };
        
        // Only add if we extracted at least one insight
        if (extracted.lcpElement || extracted.clsSources.length > 0 || extracted.inpInteractions.length > 0) {
          results[normalized] = extracted;
          console.log(`✓ Extracted Lighthouse insights for ${normalized}`);
        }
      } catch (err) {
        console.warn(`Failed to process page ${p.uuid}:`, err.message);
      }
    }
  } else if (PAGE_UUIDS) {
    // Priority 3: Fallback to explicit page UUIDs from env
    const ids = PAGE_UUIDS.split(',').map(s => s.trim()).filter(Boolean);
    console.log(`Fetching Lighthouse audits for ${ids.length} pages by UUID`);
    for (const id of ids) {
      try {
        const { url, lighthouse } = await fetchLighthouseForPage(id, siteSlug);
        if (!url || !lighthouse) continue;
        
        const normalized = normalizeUrl(url);
        const extracted = {
          lcpElement: extractLCPElement(lighthouse),
          clsSources: extractCLSSources(lighthouse),
          inpInteractions: extractINPInteractions(lighthouse)
        };
        
        if (extracted.lcpElement || extracted.clsSources.length > 0 || extracted.inpInteractions.length > 0) {
          results[normalized] = extracted;
          console.log(`✓ Extracted Lighthouse insights for ${normalized}`);
        }
      } catch (err) {
        console.warn(`Failed to process page ${id}:`, err.message);
      }
    }
  } else {
    console.warn('No pages found: TimeSeries data not available, no site found, and no PAGE_UUIDS provided.');
    fs.writeFileSync(path.join(OUT_DIR, 'calibre-lighthouse.json'), JSON.stringify({}, null, 2));
    return;
  }
  
  fs.writeFileSync(path.join(OUT_DIR, 'calibre-lighthouse.json'), JSON.stringify({ audits: results, generatedAt: new Date().toISOString() }, null, 2));
  
  const insightCount = Object.keys(results).length;
  console.log(`\n✓ Wrote ${path.join(OUT_DIR, 'calibre-lighthouse.json')} with ${insightCount} pages with Lighthouse insights`);
  
  if (insightCount === 0 && timeseriesPages && timeseriesPages.length > 0) {
    console.log(`\n⚠️  Summary: Processed ${timeseriesPages.length} pages from TimeSeries, but no Lighthouse audit data was available.`);
    console.log(`   This is expected until Calibre API access pattern for Lighthouse audits is resolved.`);
    console.log(`   The remediation system will use diagnostic-based recommendations instead.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
