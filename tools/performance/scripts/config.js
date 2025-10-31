#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Config files are in the parent directory (tools/performance/)
// This script is in tools/performance/scripts/, config.json is in tools/performance/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERF_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(PERF_DIR, 'config.json');
const CONFIG_EXAMPLE_PATH = path.join(PERF_DIR, 'config.example.json');

let config = null;

function loadConfig() {
  if (config) return config;
  
  // Try to load config.json
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return config;
    } catch (err) {
      console.warn(`Failed to parse config.json: ${err.message}`);
    }
  }
  
  // Fallback to environment variables for backwards compatibility
  config = {
    calibre: {
      token: process.env.CALIBRE_TOKEN || process.env.CALIBRE_API_TOKEN || null,
      site: process.env.CALIBRE_SITE || null,
      siteId: process.env.CALIBRE_SITE_ID || null,
      pageUuids: process.env.PAGE_UUIDS || process.env.CALIBRE_PAGE_UUIDS || ''
    },
    googlePagespeed: {
      apiKey: process.env.GOOGLE_PAGESPEED_API_KEY || null
    },
    settings: {
      timeseriesDays: Number(process.env.CALIBRE_DAYS || '7'),
      snapshotCount: Number(process.env.CALIBRE_SNAPSHOT_COUNT || '10')
    }
  };
  
  return config;
}

function getConfig() {
  return loadConfig();
}

function requireConfig() {
  const cfg = loadConfig();
  
  // Check if config.json exists, if not, show helpful message
  if (!fs.existsSync(CONFIG_PATH)) {
    if (fs.existsSync(CONFIG_EXAMPLE_PATH)) {
      console.error(`\n⚠️  config.json not found. Please copy config.example.json to config.json and add your API keys.`);
      console.error(`   Example: cp config.example.json config.json\n`);
    } else {
      console.error(`\n⚠️  config.json not found. Please create it with your API keys.\n`);
    }
  }
  
  return cfg;
}

export { getConfig, requireConfig, loadConfig };

