#!/usr/bin/env node
import { spawnSync } from 'child_process';

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.status !== 0) process.exit(res.status);
}

run('node', ['scripts/parse-shopify.js']);
// Parse extended Shopify reports (Page Type, Over Time)
run('node', ['scripts/parse-shopify-extended.js']);
// Pull latest Calibre timeseries (last 7 days by default)
run('node', ['scripts/fetch-timeseries.js']);
// Pull latest Calibre per-page point-in-time metrics
run('node', ['scripts/fetch-calibre.js']);
// Fetch Lighthouse audits for element-level diagnostics
run('node', ['scripts/fetch-lighthouse-audits.js']);
run('node', ['scripts/merge-metrics.js']);
// Fetch Google PSI for critical pages (only runs if API key is configured and critical pages exist)
// Don't fail build if PSI fails (it's optional)
const psiRes = spawnSync('node', ['scripts/fetch-google-psi.js'], { stdio: 'inherit' });
if (psiRes.status === 0) {
  // Re-merge to include PSI data if fetch was successful
  run('node', ['scripts/merge-metrics.js']);
} else {
  console.log('⚠️  PSI fetch skipped or failed, continuing without PSI data...');
}
run('node', ['scripts/generate-report.js']);


