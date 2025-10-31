#!/usr/bin/env node
/**
 * Fetch Google PageSpeed Insights reports for critical pages only.
 * 
 * This script:
 * - Reads merged performance data to identify truly critical pages
 * - Only fetches PSI for pages marked as "critical" urgency
 * - Respects rate limits and includes delays between requests
 * - Extracts Lighthouse audit data for detailed diagnostics
 * 
 * Configuration:
 * - Set PSI_MIN_URGENCY in config to control which pages get scanned (default: 'critical')
 * - Set PSI_MAX_PAGES to limit total API calls per run (default: 50)
 */

import fs from 'fs';
import path from 'path';
import { requireConfig } from './config.js';

const ROOT = path.resolve(process.cwd(), '../../');
const OUT_DIR = path.join(ROOT, 'data', 'performance', 'out');

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch PageSpeed Insights data for a URL
 */
async function fetchPSI(url, apiKey, strategy = 'mobile') {
  // PSI API endpoint
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
  const params = new URLSearchParams({
    url: url,
    key: apiKey,
    strategy: strategy, // 'mobile' or 'desktop'
    category: ['performance', 'accessibility', 'best-practices', 'seo'].join(','),
    // Request Lighthouse data for detailed diagnostics
    lighthouseResult: 'true'
  });

  try {
    const response = await fetch(`${apiUrl}?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PSI API error: ${response.status} ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch PSI for ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract key metrics and diagnostics from PSI Lighthouse data
 */
function extractPSIData(psiResult) {
  if (!psiResult?.lighthouseResult) return null;

  const lh = psiResult.lighthouseResult;
  const audits = lh.audits || {};
  
  // Extract Core Web Vitals
  const lcp = audits['largest-contentful-paint']?.numericValue ? 
    audits['largest-contentful-paint'].numericValue / 1000 : null;
  const cls = audits['cumulative-layout-shift']?.numericValue || null;
  const inp = audits['interaction-to-next-paint']?.numericValue ? 
    audits['interaction-to-next-paint'].numericValue / 1000 : null;
  
  // Extract LCP element details
  let lcpElement = null;
  if (audits['largest-contentful-paint-element']?.details?.items?.[0]) {
    const item = audits['largest-contentful-paint-element'].details.items[0];
    lcpElement = {
      element: item.node?.snippet || item.selector || 'unknown',
      url: item.url || null,
      size: item.size || null
    };
  }
  
  // Extract CLS sources
  const clsSources = [];
  if (audits['layout-shift-elements']?.details?.items) {
    audits['layout-shift-elements'].details.items.forEach(item => {
      if (item.score < 0.25) { // Only include significant shifts
        clsSources.push({
          element: item.node?.snippet || item.selector || 'unknown',
          shift: item.score,
          area: item.areaFraction || null
        });
      }
    });
  }
  
  // Extract INP interactions
  const inpInteractions = [];
  if (audits['longest-chain']?.details?.items) {
    audits['longest-chain'].details.items.forEach(item => {
      inpInteractions.push({
        element: item.node?.snippet || item.selector || 'unknown',
        duration: item.duration || null,
        type: item.eventType || 'interaction'
      });
    });
  }
  
  // Extract diagnostic metrics
  const diagnostics = {
    ttfb: audits['server-response-time']?.numericValue || null,
    tbt: audits['total-blocking-time']?.numericValue || null,
    fcp: audits['first-contentful-paint']?.numericValue ? 
      audits['first-contentful-paint'].numericValue / 1000 : null,
    si: audits['speed-index']?.numericValue ? 
      audits['speed-index'].numericValue / 1000 : null,
    tti: audits['interactive']?.numericValue ? 
      audits['interactive'].numericValue / 1000 : null
  };
  
  // Extract resource sizes
  if (audits['total-byte-weight']?.numericValue) {
    diagnostics.totalSize = audits['total-byte-weight'].numericValue;
  }
  if (audits['offscreen-images']?.details?.items) {
    diagnostics.imageSize = audits['offscreen-images'].details.items.reduce((sum, img) => 
      sum + (img.url ? (img.totalBytes || 0) : 0), 0);
  }
  if (audits['unused-javascript']?.details?.items) {
    diagnostics.jsSize = audits['unused-javascript'].details.items.reduce((sum, js) => 
      sum + (js.url ? (js.totalBytes || 0) : 0), 0);
  }
  
  // Performance score
  const performanceScore = lh.categories?.performance?.score ? 
    Math.round(lh.categories.performance.score * 100) : null;
  
  return {
    metrics: { LCP: lcp, CLS: cls, INP: inp },
    diagnostics,
    elements: { lcpElement, clsSources, inpInteractions },
    performanceScore,
    fetchTime: new Date().toISOString()
  };
}

/**
 * Generate CrUX (Chrome User Experience Report) URL
 */
function getCruxUrl(url) {
  try {
    const urlObj = new URL(url);
    // CrUX dashboard URL format
    const origin = urlObj.origin;
    const path = urlObj.pathname;
    // Use PageSpeed Insights CrUX tool
    return `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

async function main() {
  const config = requireConfig();
  const apiKey = config.googlePagespeed?.apiKey;
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_PAGESPEED_INSIGHTS_API_KEY_HERE') {
    console.error('❌ Google PageSpeed Insights API key not configured in config.json');
    console.error('   Set googlePagespeed.apiKey in config.json to use this script.');
    process.exit(1);
  }

  // Load merged data to identify critical pages
  const merged = loadJson(path.join(OUT_DIR, 'merged.json'));
  if (!merged || !merged.items || merged.items.length === 0) {
    console.error('❌ No merged performance data found. Run merge-metrics.js first.');
    process.exit(1);
  }

  // Filter for critical pages only
  const minUrgency = config.googlePagespeed?.minUrgency || 'critical';
  const maxPages = config.googlePagespeed?.maxPages || 50;
  const strategy = config.googlePagespeed?.strategy || 'mobile'; // 'mobile' or 'desktop'
  
  const criticalPages = merged.items
    .filter(item => {
      const urgency = item.urgency || 'medium';
      if (minUrgency === 'critical') return urgency === 'critical';
      if (minUrgency === 'high') return urgency === 'critical' || urgency === 'high';
      return urgency !== 'medium';
    })
    .sort((a, b) => {
      // Sort by urgency then by page loads (traffic)
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return (b.loads || 0) - (a.loads || 0);
    })
    .slice(0, maxPages);

  if (criticalPages.length === 0) {
    console.log('✅ No critical pages found. All pages are within acceptable thresholds.');
    process.exit(0);
  }

  console.log(`📊 Found ${criticalPages.length} critical pages. Fetching PSI reports...`);
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Rate limit: 1 request per 2 seconds\n`);

  const psiResults = {};
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < criticalPages.length; i++) {
    const page = criticalPages[i];
    const url = page.url;
    
    console.log(`[${i + 1}/${criticalPages.length}] Fetching PSI for: ${url}`);
    
    const psiData = await fetchPSI(url, apiKey, strategy);
    
    if (psiData) {
      const extracted = extractPSIData(psiData);
      if (extracted) {
        psiResults[url] = extracted;
        psiResults[url].cruxUrl = getCruxUrl(url);
        successCount++;
        console.log(`   ✅ Success (Score: ${extracted.performanceScore || 'N/A'}, LCP: ${extracted.metrics.LCP?.toFixed(2) || 'N/A'}s)`);
      } else {
        errorCount++;
        console.log(`   ⚠️  No data extracted`);
      }
    } else {
      errorCount++;
      console.log(`   ❌ Failed`);
    }

    // Rate limiting: 1 request per 2 seconds (well under PSI's 400/day limit)
    if (i < criticalPages.length - 1) {
      await sleep(2000);
    }
  }

  // Save results
  const outputPath = path.join(OUT_DIR, 'google-psi.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    fetchTime: new Date().toISOString(),
    strategy,
    totalPages: criticalPages.length,
    successCount,
    errorCount,
    results: psiResults
  }, null, 2));

  console.log(`\n✅ PSI fetch complete:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

