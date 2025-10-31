#!/usr/bin/env node
import { Snapshot } from 'calibre';
import { requireConfig } from './config.js';

const cfg = requireConfig();
const token = cfg.calibre.token || process.env.CALIBRE_TOKEN || process.env.CALIBRE_API_TOKEN;
const site = cfg.calibre.site || cfg.calibre.siteId || process.env.CALIBRE_SITE || process.env.CALIBRE_SITE_ID;
const count = Number(process.env.CALIBRE_SNAPSHOT_COUNT || cfg.settings.snapshotCount || 10);
const cursor = process.env.CALIBRE_SNAPSHOT_CURSOR || undefined;

async function main() {
  if (!token) {
    console.error('Missing Calibre API token in config.json or CALIBRE_TOKEN environment variable');
    process.exit(1);
  }
  if (!site) {
    console.error('Missing Calibre site slug/ID in config.json or CALIBRE_SITE environment variable');
    process.exit(1);
  }
  try {
    const snapshots = await Snapshot.list({ token, site, count, cursor });
    console.log(JSON.stringify(snapshots, null, 2));
  } catch (e) {
    console.error('Failed to list Calibre snapshots');
    console.error(e?.message || e);
    process.exit(1);
  }
}

main();


