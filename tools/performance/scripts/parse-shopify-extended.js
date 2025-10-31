#!/usr/bin/env node
/**
 * Parse extended Shopify Core Web Vitals reports:
 * - Page Type aggregations
 * - Over Time trends
 * 
 * Extends the base parse-shopify.js functionality to handle
 * additional report types from Shopify's Core Web Vitals dashboard.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), '../../');
const PERF_DIR = path.join(ROOT, 'data', 'performance');
const OUT_DIR = path.join(PERF_DIR, 'out');

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    const params = url.searchParams;
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach((p)=>params.delete(p));
    url.search = params.toString();
    return url.toString();
  } catch {
    return u;
  }
}

/**
 * Parse Page Type report (aggregated by page_type)
 */
function parsePageTypeReports() {
  const pageTypeData = { LCP: {}, CLS: {}, INP: {} };
  
  const files = fs.existsSync(PERF_DIR) ? fs.readdirSync(PERF_DIR) : [];
  const pageTypeFiles = files.filter(f => f.toLowerCase().includes('page type'));
  
  for (const file of pageTypeFiles) {
    const lower = file.toLowerCase();
    const full = path.join(PERF_DIR, file);
    
    // Determine metric from filename
    let metric = null;
    if (lower.includes('lcp')) metric = 'LCP';
    else if (lower.includes('cls')) metric = 'CLS';
    else if (lower.includes('inp')) metric = 'INP';
    if (!metric) continue;
    
    const raw = fs.readFileSync(full, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    
    for (const line of lines) {
      try {
        const rec = JSON.parse(line);
        if (!rec.page_type) continue;
        
        const pageType = rec.page_type;
        const loads = parseInt(rec.page_loads || 0, 10);
        const percent = parseFloat(rec.percent_of_page_loads || 0);
        
        // Extract metric value
        let value = null;
        if (metric === 'LCP') {
          value = rec.lcp_p75_ms ? rec.lcp_p75_ms / 1000 : null;
        } else if (metric === 'CLS') {
          value = rec.p75_cls || rec.cls_p75 || null;
        } else if (metric === 'INP') {
          value = rec.inp_p75_ms ? rec.inp_p75_ms / 1000 : rec.p75_inp || null;
        }
        
        // Parse distribution (good, needs-improvement, poor, unknown)
        const distribution = rec[`${metric.toLowerCase()}_distribution`] || [];
        const distCounts = {
          good: parseInt(distribution[0] || 0, 10),
          needsImprovement: parseInt(distribution[1] || 0, 10),
          poor: parseInt(distribution[2] || 0, 10),
          unknown: parseInt(distribution[3] || 0, 10)
        };
        
        if (!pageTypeData[metric][pageType]) {
          pageTypeData[metric][pageType] = {
            loads: 0,
            percent: 0,
            value: null,
            distribution: { good: 0, needsImprovement: 0, poor: 0, unknown: 0 }
          };
        }
        
        const existing = pageTypeData[metric][pageType];
        existing.loads += loads;
        existing.percent += percent;
        // Use the value from the most recent/largest dataset
        if (value != null) existing.value = value;
        existing.distribution.good += distCounts.good;
        existing.distribution.needsImprovement += distCounts.needsImprovement;
        existing.distribution.poor += distCounts.poor;
        existing.distribution.unknown += distCounts.unknown;
      } catch {
        continue;
      }
    }
  }
  
  return pageTypeData;
}

/**
 * Parse Over Time report (daily trends)
 */
function parseOverTimeReports() {
  const overTimeData = { LCP: [], CLS: [], INP: [] };
  
  const files = fs.existsSync(PERF_DIR) ? fs.readdirSync(PERF_DIR) : [];
  const overTimeFiles = files.filter(f => f.toLowerCase().includes('over time'));
  
  for (const file of overTimeFiles) {
    const lower = file.toLowerCase();
    const full = path.join(PERF_DIR, file);
    
    // Determine metric from filename
    let metric = null;
    if (lower.includes('lcp')) metric = 'LCP';
    else if (lower.includes('cls')) metric = 'CLS';
    else if (lower.includes('inp')) metric = 'INP';
    if (!metric) continue;
    
    const raw = fs.readFileSync(full, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    
    const dailyData = [];
    for (const line of lines) {
      try {
        const rec = JSON.parse(line);
        if (!rec.day) continue;
        
        let value = null;
        if (metric === 'LCP') {
          value = rec.lcp_p75_ms ? rec.lcp_p75_ms / 1000 : null;
        } else if (metric === 'CLS') {
          value = rec.p75_cls || rec.cls_p75 || null;
        } else if (metric === 'INP') {
          value = rec.inp_p75_ms ? rec.inp_p75_ms / 1000 : rec.p75_inp || null;
        }
        
        // Parse distribution
        const distribution = rec[`${metric.toLowerCase()}_distribution`] || [];
        const distCounts = {
          good: parseInt(distribution[0] || 0, 10),
          needsImprovement: parseInt(distribution[1] || 0, 10),
          poor: parseInt(distribution[2] || 0, 10),
          unknown: parseInt(distribution[3] || 0, 10)
        };
        
        dailyData.push({
          day: rec.day,
          value,
          distribution: distCounts
        });
      } catch {
        continue;
      }
    }
    
    // Sort by date
    dailyData.sort((a, b) => a.day.localeCompare(b.day));
    overTimeData[metric] = dailyData;
  }
  
  return overTimeData;
}

/**
 * Parse Device Type report (sessions by device)
 */
function parseDeviceTypeReport() {
  const files = fs.existsSync(PERF_DIR) ? fs.readdirSync(PERF_DIR) : [];
  const deviceFile = files.find(f => f.toLowerCase().includes('sessions by device type'));
  
  if (!deviceFile) return null;
  
  const full = path.join(PERF_DIR, deviceFile);
  const raw = fs.readFileSync(full, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  
  const deviceData = {
    totalSessions: 0,
    totalVisitors: 0,
    byDevice: {}
  };
  
  for (const line of lines) {
    try {
      const rec = JSON.parse(line);
      if (!rec.session_device_type) continue;
      
      const deviceType = rec.session_device_type;
      const sessions = parseInt(rec.sessions || 0, 10);
      const visitors = parseInt(rec.online_store_visitors || 0, 10);
      
      deviceData.byDevice[deviceType] = { sessions, visitors };
      deviceData.totalSessions += sessions;
      deviceData.totalVisitors += visitors;
    } catch {
      continue;
    }
  }
  
  // Calculate percentages
  Object.keys(deviceData.byDevice).forEach(device => {
    const d = deviceData.byDevice[device];
    d.sessionPercent = deviceData.totalSessions > 0 
      ? (d.sessions / deviceData.totalSessions * 100).toFixed(1)
      : '0.0';
  });
  
  return deviceData;
}

async function main() {
  const pageTypeData = parsePageTypeReports();
  const overTimeData = parseOverTimeReports();
  const deviceData = parseDeviceTypeReport();
  
  fs.mkdirSync(OUT_DIR, { recursive: true });
  
  // Save page type aggregations
  if (Object.keys(pageTypeData.LCP).length > 0 || Object.keys(pageTypeData.CLS).length > 0 || Object.keys(pageTypeData.INP).length > 0) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'shopify-page-types.json'),
      JSON.stringify(pageTypeData, null, 2)
    );
    console.log('Wrote shopify-page-types.json');
  }
  
  // Save over time trends
  if (overTimeData.LCP.length > 0 || overTimeData.CLS.length > 0 || overTimeData.INP.length > 0) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'shopify-overtime.json'),
      JSON.stringify(overTimeData, null, 2)
    );
    console.log('Wrote shopify-overtime.json');
  }
  
  // Save device type data
  if (deviceData) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'shopify-devices.json'),
      JSON.stringify(deviceData, null, 2)
    );
    console.log('Wrote shopify-devices.json');
  }
  
  const pageTypeCounts = {
    LCP: Object.keys(pageTypeData.LCP).length,
    CLS: Object.keys(pageTypeData.CLS).length,
    INP: Object.keys(pageTypeData.INP).length
  };
  
  const overtimeCounts = {
    LCP: overTimeData.LCP.length,
    CLS: overTimeData.CLS.length,
    INP: overTimeData.INP.length
  };
  
  console.log('Page Type aggregations:', pageTypeCounts);
  console.log('Over Time data points:', overtimeCounts);
  if (deviceData) {
    console.log('Device breakdown:', Object.keys(deviceData.byDevice).map(d => `${d}: ${deviceData.byDevice[d].sessionPercent}%`).join(', '));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

