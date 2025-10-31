#!/usr/bin/env node
import { Site } from 'calibre';
import { requireConfig } from './config.js';

const cfg = requireConfig();
const token = cfg.calibre.token || process.env.CALIBRE_TOKEN || process.env.CALIBRE_API_TOKEN;

async function main() {
  if (!token) {
    console.error('Missing Calibre API token in config.json or CALIBRE_TOKEN environment variable');
    process.exit(1);
  }
  try {
    // The Calibre SDK accepts a token option for authenticated calls
    const sites = await Site.list({ token });
    // Print compact JSON: id, slug, name, primaryDomain
    const out = sites.map(s => ({ id: s.id, slug: s.slug, name: s.name, domain: s.primaryDomain?.url || '' }));
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('Failed to list Calibre sites. If this persists, run `calibre site list --json` locally.');
    console.error(e?.message || e);
    process.exit(1);
  }
}

main();


