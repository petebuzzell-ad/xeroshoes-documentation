#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const ROOT = path.resolve(process.cwd(), '../../');
const PERF_DIR = path.join(ROOT, 'data', 'performance');

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    // Remove utm and common tracking params
    const params = url.searchParams;
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach((p)=>params.delete(p));
    url.search = params.toString();
    return url.toString();
  } catch {
    return u;
  }
}

function isAffiliatePath(u) {
  try {
    const url = new URL(u);
    return url.pathname.startsWith('/go/');
  } catch {
    return false;
  }
}

async function main() {
  // Support CSV and JSONL/JSON exports from Shopify
  const files = fs.existsSync(PERF_DIR) ? fs.readdirSync(PERF_DIR) : [];
  const byMetric = { LCP: {}, CLS: {}, INP: {} };

  for (const file of files) {
    const lower = file.toLowerCase();
    const full = path.join(PERF_DIR, file);

    // Skip Page Type and Over Time reports (handled by parse-shopify-extended.js)
    if (lower.includes('page type') || lower.includes('over time')) continue;

    // Determine metric from filename when possible
    const inferMetricFromName = () => {
      if (lower.includes('lcp')) return 'LCP';
      if (lower.includes('cls')) return 'CLS';
      if (lower.includes('inp')) return 'INP';
      return null;
    };

    if (lower.endsWith('.csv')) {
      const rows = await readCsv(full);
      for (const row of rows) {
        const keys = Object.keys(row);
        const urlKey = keys.find(k => /url/i.test(k)) || keys[0];
        const metric = inferMetricFromName() || (keys.find(k => /(lcp|cls|inp)/i.test(k)) || '').toUpperCase();
        if (!urlKey || !metric) continue;
        const url = normalizeUrl(row[urlKey]);
        if (isAffiliatePath(url)) continue;

        const valueKey = keys.find(k => new RegExp(metric, 'i').test(k))
          || keys.find(k => /(value|score|ms|sec|seconds|p75|p95)/i.test(k));
        const vRaw = valueKey ? String(row[valueKey] ?? '').trim() : '';
        let val = parseFloat(vRaw);
        if (!Number.isFinite(val)) continue;
        if ((metric === 'LCP' || metric === 'INP') && val > 20) val = val / 1000;
        const target = byMetric[metric];
        if (!target[url]) target[url] = { value: val, samples: 1 };
        else { target[url].value = Math.max(target[url].value, val); target[url].samples += 1; }
      }
    } else if (lower.endsWith('.jsonl') || lower.endsWith('.json')) {
      // Each line is a JSON object (or a JSON array). Try both.
      const raw = fs.readFileSync(full, 'utf8');
      const lines = lower.endsWith('.jsonl') ? raw.split(/\r?\n/).filter(Boolean) : [raw];
      for (const line of lines) {
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        const records = Array.isArray(obj) ? obj : [obj];
        for (const rec of records) {
          if (!rec || typeof rec !== 'object') continue;
          const keys = Object.keys(rec);
          let url = null;
          const urlKey = keys.find(k => /url/i.test(k));
          if (urlKey) {
            url = normalizeUrl(rec[urlKey]);
          } else if (keys.includes('page_path')) {
            // Build full URL from path
            const host = 'https://www.xeroshoes.com';
            url = normalizeUrl(host.replace(/\/$/,'') + rec.page_path);
          }
          if (!url) continue;
          if (isAffiliatePath(url)) continue;

          const metric = inferMetricFromName();
          if (!metric) continue; // require metric in filename for JSONL inputs

          // Value resolution: direct keys, generic keys, or nested percentiles
          let val = null;
          const directKey = keys.find(k => new RegExp(metric, 'i').test(k))
            || (metric === 'CLS' ? keys.find(k => /p75_cls/i.test(k)) : null)
            || (metric === 'LCP' ? keys.find(k => /p75_lcp/i.test(k)) : null)
            || (metric === 'INP' ? keys.find(k => /p75_inp/i.test(k)) : null);
          if (directKey && Number.isFinite(parseFloat(rec[directKey]))) {
            val = parseFloat(rec[directKey]);
          } else if (rec.value && Number.isFinite(parseFloat(rec.value))) {
            val = parseFloat(rec.value);
          } else if (rec.metric_value && Number.isFinite(parseFloat(rec.metric_value))) {
            val = parseFloat(rec.metric_value);
          } else if (rec.p75 && Number.isFinite(parseFloat(rec.p75))) {
            val = parseFloat(rec.p75);
          } else if (rec.percentile && (Number.isFinite(parseFloat(rec.percentile.p75)) || Number.isFinite(parseFloat(rec.percentile.P75)))) {
            val = parseFloat(rec.percentile.p75 ?? rec.percentile.P75);
          }
          if (val == null || !Number.isFinite(val)) continue;
          if ((metric === 'LCP' || metric === 'INP') && val > 20) val = val / 1000;
          const loads = Number.parseInt(rec.page_loads || rec.samples || rec.count || 0, 10) || 0;
          const percent = Number.parseFloat(rec.percent_of_page_loads || rec.share || 0) || 0;
          const target = byMetric[metric];
          if (!target[url]) target[url] = { value: val, samples: 1, loads, percent };
          else {
            target[url].value = Math.max(target[url].value, val);
            target[url].samples += 1;
            target[url].loads = (target[url].loads || 0) + loads;
            target[url].percent = Math.max(target[url].percent || 0, percent);
          }
        }
      }
    }
  }

  const outDir = path.join(PERF_DIR, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'shopify-metrics.json'), JSON.stringify(byMetric, null, 2));
  const counts = {
    LCP: Object.keys(byMetric.LCP).length,
    CLS: Object.keys(byMetric.CLS).length,
    INP: Object.keys(byMetric.INP).length,
  };
  console.log('Wrote', path.join(outDir, 'shopify-metrics.json'), counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


