#!/usr/bin/env node
import { TimeSeries } from 'calibre';
import fs from 'fs';
import path from 'path';
import { requireConfig } from './config.js';

const cfg = requireConfig();
const token = cfg.calibre.token;
const site = cfg.calibre.site || cfg.calibre.siteId;
const pagesEnv = process.env.CALIBRE_PAGE_UUIDS || '';
const profilesEnv = process.env.CALIBRE_PROFILE_UUIDS || '';
const measurementsEnv = process.env.CALIBRE_MEASUREMENTS || '';
const daysEnv = cfg.settings.timeseriesDays || process.env.CALIBRE_DAYS || '7';

async function main() {
  if (!token) {
    console.error('Missing Calibre API token in config.json or CALIBRE_TOKEN environment variable');
    process.exit(1);
  }
  if (!site) {
    console.error('Missing Calibre site slug/ID in config.json or CALIBRE_SITE environment variable');
    process.exit(1);
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - Number(daysEnv));

  const pages = pagesEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const profiles = profilesEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const measurements = measurementsEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  try {
    const results = await TimeSeries.list({
      token,
      site,
      from,
      to,
      pages: pages.length ? pages : undefined,
      profiles: profiles.length ? profiles : undefined,
      measurements: measurements.length ? measurements : undefined
    });

    const ROOT = path.resolve(process.cwd(), '../../');
    const OUT_DIR = path.join(ROOT, 'data', 'performance', 'out');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'calibre-timeseries.json'), JSON.stringify(results, null, 2));
    console.log('Wrote', path.join(OUT_DIR, 'calibre-timeseries.json'));
  } catch (e) {
    console.error('Failed to fetch Calibre time series');
    console.error(e?.message || e);
    process.exit(1);
  }
}

main();


