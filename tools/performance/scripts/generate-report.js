#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), '../../');
const OUT_DIR = path.join(ROOT, 'data', 'performance', 'out');

function loadMerged() {
  const p = path.join(OUT_DIR, 'merged.json');
  if (!fs.existsSync(p)) throw new Error('Missing merged.json. Run merge step first.');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function badge(score) {
  if (score === 'good') return '<span class="badge success">Good</span>';
  if (score === 'needs-improvement') return '<span class="badge warning">Needs improvement</span>';
  if (score === 'poor') return '<span class="badge danger">Poor</span>';
  return '<span class="badge">N/A</span>';
}

function urgencyBadge(urgency) {
  if (urgency === 'critical') return '<span class="badge danger">Critical</span>';
  if (urgency === 'high') return '<span class="badge warning">High</span>';
  if (urgency === 'medium') return '<span class="badge">Medium</span>';
  return '<span class="badge">Medium</span>';
}

function formatRemediation(text) {
  // Highlight element references, URLs, metrics, and file sizes
  let formatted = text
    .replace(/(element:|image:|at)\s+([.#]?[\w-]+(?:\s+[\w-]+)*)/g, '<strong class="element-ref">$1 $2</strong>')
    .replace(/(on|at)\s+([.#][\w-]+)/g, '<strong class="element-ref">$1 $2</strong>')
    .replace(/\(([a-z]+:\/\/[^)]+)\)/g, '<code class="url-ref">$1</code>')
    .replace(/(LCP|CLS|INP|TTFB|TBT)\s+([\d.]+(?:s|ms)?)/g, '<strong class="metric-val">$1 $2</strong>')
    .replace(/([\d.]+(?:KB|MB|B))/g, '<code class="size-ref">$1</code>');
  return formatted;
}

function remediationCell(item) {
  const recs = Array.isArray(item.recommendations) ? item.recommendations : [];
  if (recs.length === 0) return '<span class="text-muted">—</span>';
  
  // Separate element-level insights from general recommendations
  const elementInsights = recs.filter(r => 
    r.includes('element:') || r.includes('image:') || r.includes('at ') || 
    r.includes('caused by layout shift on') || r.includes('interaction at')
  );
  const generalRecs = recs.filter(r => !elementInsights.includes(r));
  
  const totalRecs = recs.length;
  const hasElements = elementInsights.length > 0;
  
  // Very compact: just show count, everything in expandable details
  let html = `<details class="recs-details"><summary>${totalRecs} recommendation${totalRecs > 1 ? 's' : ''}${hasElements ? ' • 🔍 Element insights' : ''} <span class="ai-badge-small">AI</span></summary><ul>`;
  
  if (hasElements) {
    html += `<li class="element-insight-header"><strong>🔍 Element-level insights:</strong></li>`;
    html += elementInsights.map(r => `<li>${formatRemediation(r)}</li>`).join('');
    if (generalRecs.length > 0) {
      html += `<li class="rec-divider"><strong>General recommendations:</strong></li>`;
    }
  }
  
  html += generalRecs.map(r => `<li>${formatRemediation(r)}</li>`).join('');
  html += `</ul></details>`;
  
  return html;
}

function metricCell(value, score, source, metric) {
  const fmt = (v, m) => v == null ? '—' : (m === 'CLS' ? v.toFixed(3) : v.toFixed(2));
  const valueStr = fmt(value, metric);
  const scoreBadge = badge(score);
  const sourceStr = source ? `<small class="source">${source}</small>` : '';
  return `<div class="metric-cell"><span class="metric-value">${valueStr}</span> ${scoreBadge} ${sourceStr}</div>`;
}

function toRow(item, index) {
  const segment = item.segment ?? 'other';
  const urgency = item.urgency ?? 'medium';
  const loads = item.loads || 0;
  const loadsFormatted = loads >= 1000 ? `${(loads / 1000).toFixed(1)}k` : loads.toString();
  const psiScore = item.psi?.performanceScore;
  const cruxUrl = item.cruxUrl;
  
  // URL cell with CrUX link
  let urlCell = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a>`;
  if (cruxUrl) {
    urlCell += ` <a href="${cruxUrl}" target="_blank" rel="noopener noreferrer" title="View CrUX data" style="margin-left:4px;font-size:11px;color:#195c49;">📊 CrUX</a>`;
  }
  
  // Page Type cell (without traffic info - that's now a separate column)
  const segmentCell = `<span class="segment-badge">${segment}</span>`;
  
  // Page Loads cell
  const loadsCell = loads > 0 
    ? `<span title="${loads.toLocaleString()} page loads">${loads.toLocaleString()}</span>`
    : '<span class="text-muted">—</span>';
  
  // Urgency cell with PSI score if available
  let urgencyCell = urgencyBadge(urgency);
  if (psiScore != null) {
    const psiColor = psiScore >= 90 ? '#0a6c3e' : psiScore >= 50 ? '#856404' : '#842029';
    urgencyCell += ` <span style="margin-left:4px;font-size:11px;color:${psiColor};font-weight:600;" title="PSI Performance Score">PSI:${psiScore}</span>`;
  }
  
  return `
    <tr data-urgency="${urgency}" data-segment="${segment}" data-lcp-value="${item.LCP.value ?? ''}" data-cls-value="${item.CLS.value ?? ''}" data-inp-value="${item.INP.value ?? ''}" data-loads="${loads}">
      <td>${urlCell}</td>
      <td>${urgencyCell}</td>
      <td>${segmentCell}</td>
      <td>${loadsCell}</td>
      <td>${metricCell(item.LCP.value, item.LCP.score, item.LCP.source, 'LCP')}</td>
      <td>${metricCell(item.CLS.value, item.CLS.score, item.CLS.source, 'CLS')}</td>
      <td>${metricCell(item.INP.value, item.INP.score, item.INP.source, 'INP')}</td>
      <td>${remediationCell(item)}</td>
    </tr>
  `;
}

function buildDistributionBar(distribution, metric) {
  if (!distribution) return '<td class="text-muted">—</td>';
  
  const total = distribution.good + distribution.needsImprovement + distribution.poor;
  if (total === 0) return '<td class="text-muted">—</td>';
  
  const goodPct = (distribution.good / total) * 100;
  const needsPct = (distribution.needsImprovement / total) * 100;
  const poorPct = (distribution.poor / total) * 100;
  
  return `
    <td>
      <div class="dist-bar-container" title="${goodPct.toFixed(1)}% good, ${needsPct.toFixed(1)}% needs improvement, ${poorPct.toFixed(1)}% poor">
        <div class="dist-bar">
          <div class="dist-segment dist-good" style="width: ${goodPct}%"></div>
          <div class="dist-segment dist-needs" style="width: ${needsPct}%"></div>
          <div class="dist-segment dist-poor" style="width: ${poorPct}%"></div>
        </div>
        <span class="dist-percent">${goodPct.toFixed(0)}%</span>
      </div>
    </td>
  `;
}

function calculateSegmentPriority(segment) {
  // Calculate priority based on traffic (page loads) and metric severity
  // Similar logic to individual page impact scoring
  const loads = segment.loads || 0;
  const logLoads = Math.log10(loads + 1);
  
  // Calculate severity weight based on worst metric
  let maxSeverityWeight = 0;
  
  if (segment.LCP) {
    const lcpWeight = segment.LCP.score === 'poor' ? 3 : (segment.LCP.score === 'needs-improvement' ? 2 : 0);
    maxSeverityWeight = Math.max(maxSeverityWeight, lcpWeight);
  }
  if (segment.CLS) {
    const clsWeight = segment.CLS.score === 'poor' ? 3 : (segment.CLS.score === 'needs-improvement' ? 2 : 0);
    maxSeverityWeight = Math.max(maxSeverityWeight, clsWeight);
  }
  if (segment.INP) {
    const inpWeight = segment.INP.score === 'poor' ? 3 : (segment.INP.score === 'needs-improvement' ? 2 : 0);
    maxSeverityWeight = Math.max(maxSeverityWeight, inpWeight);
  }
  
  // Priority = severity_weight * log(page_loads) * 100
  // If no issues, use loads alone for prioritization (but with lower weight)
  const severityWeight = maxSeverityWeight > 0 ? maxSeverityWeight : 0.5;
  return severityWeight * logLoads * 100;
}

function segmentRows(data, pageTypes) {
  let segs = data.segments || [];
  
  // Calculate priority for each segment and sort
  segs = segs.map(s => ({
    ...s,
    priority: calculateSegmentPriority(s)
  })).sort((a, b) => b.priority - a.priority);
  
  // Map our segment names to Shopify page types
  const segmentToPageType = {
    'pdp': 'product',
    'collections': 'collection',
    'homepage': 'index',
    'search': 'search',
    'blog': 'article',
    'pages': 'page'
  };
  
  return segs.map(s => {
    const pageType = segmentToPageType[s.name] || s.name;
    const lcpData = pageTypes?.['LCP']?.[pageType] || null;
    const clsData = pageTypes?.['CLS']?.[pageType] || null;
    const inpData = pageTypes?.['INP']?.[pageType] || null;
    
    const lcpDist = lcpData?.distribution || null;
    const clsDist = clsData?.distribution || null;
    const inpDist = inpData?.distribution || null;
    
    const issues = s.issues || { total: 0, critical: 0, high: 0, medium: 0 };
    const issuesBadge = issues.total > 0 
      ? `<span style="margin-left:8px;font-size:11px;color:${issues.critical > 0 ? '#842029' : issues.high > 0 ? '#856404' : '#666'}">
          ${issues.total} issue${issues.total > 1 ? 's' : ''} 
          ${issues.critical > 0 ? `(${issues.critical} critical)` : issues.high > 0 ? `(${issues.high} high)` : ''}
        </span>`
      : '';
    
    return `
    <tr>
      <td><strong>${s.name}</strong>${issuesBadge}</td>
      <td>${s.urls}<br><small style="color:#666">${issues.total} with issues</small></td>
      <td>${s.loads ? s.loads.toLocaleString() : '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">${s.LCP ? s.LCP.value?.toFixed(2) : '—'}</span>
          ${s.LCP ? badge(s.LCP.score === 'good' ? 'good' : (s.LCP.score === 'needs-improvement' ? 'needs-improvement' : 'poor')) : ''}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">${s.CLS ? s.CLS.value?.toFixed(3) : '—'}</span>
          ${s.CLS ? badge(s.CLS.score === 'good' ? 'good' : (s.CLS.score === 'needs-improvement' ? 'needs-improvement' : 'poor')) : ''}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">${s.INP ? s.INP.value?.toFixed(2) : '—'}</span>
          ${s.INP ? badge(s.INP.score === 'good' ? 'good' : (s.INP.score === 'needs-improvement' ? 'needs-improvement' : 'poor')) : ''}
        </div>
      </td>
      ${buildDistributionBar(lcpDist, 'LCP')}
      ${buildDistributionBar(clsDist, 'CLS')}
      ${buildDistributionBar(inpDist, 'INP')}
    </tr>
  `;
  }).join('\n');
}

function buildTrendsSection(overtime) {
  if (!overtime || (!overtime.LCP?.length && !overtime.CLS?.length && !overtime.INP?.length)) {
    return '';
  }
  
  function formatDay(day) {
    const d = new Date(day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function buildMetricTrend(metric, data) {
    if (!data || !data.length) return '';
    
    const rows = data.map(day => {
      const value = day.value != null ? (metric === 'CLS' ? day.value.toFixed(3) : day.value.toFixed(2)) : '—';
      const total = day.distribution?.good + day.distribution?.needsImprovement + day.distribution?.poor || 0;
      
      let distBar = '';
      if (total > 0 && day.distribution) {
        const goodPct = (day.distribution.good / total) * 100;
        const needsPct = (day.distribution.needsImprovement / total) * 100;
        const poorPct = (day.distribution.poor / total) * 100;
        
        const score = scoreMetric(metric, day.value);
        const scoreBadgeHtml = badge(score === 'good' ? 'good' : (score === 'needs-improvement' ? 'needs-improvement' : 'poor'));
        
        distBar = `
          <div class="dist-bar-container" title="${goodPct.toFixed(1)}% good, ${needsPct.toFixed(1)}% needs improvement, ${poorPct.toFixed(1)}% poor">
            <div class="dist-bar">
              <div class="dist-segment dist-good" style="width: ${goodPct}%"></div>
              <div class="dist-segment dist-needs" style="width: ${needsPct}%"></div>
              <div class="dist-segment dist-poor" style="width: ${poorPct}%"></div>
            </div>
            <span class="dist-percent">${goodPct.toFixed(0)}%</span>
          </div>
        `;
      } else {
        distBar = '<span class="text-muted">—</span>';
      }
      
      return `
        <tr>
          <td>${formatDay(day.day)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:600">${value}</span>
              ${day.value != null ? badge(scoreMetric(metric, day.value) === 'good' ? 'good' : (scoreMetric(metric, day.value) === 'needs-improvement' ? 'needs-improvement' : 'poor')) : ''}
            </div>
          </td>
          <td>${distBar}</td>
        </tr>
      `;
    }).join('');
    
    return `
      <h3>${metric} Trends (Last 7 Days)</h3>
      <div class="table-wrap">
        <table class="data-table">
          <tr>
            <th>Date</th>
            <th>p75 ${metric}</th>
            <th>Distribution</th>
          </tr>
          ${rows}
        </table>
      </div>
    `;
  }
  
  function scoreMetric(metric, value) {
    if (value == null) return 'unknown';
    if (metric === 'LCP') return value <= 2.5 ? 'good' : value <= 4.0 ? 'needs-improvement' : 'poor';
    if (metric === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    if (metric === 'INP') return value <= 0.2 ? 'good' : value <= 0.5 ? 'needs-improvement' : 'poor'; // INP in seconds
    return 'unknown';
  }
  
  return `
    <hr style="margin:40px 0;border:none;border-top:1px solid #e5e7eb">
    <h2 id="trends">Performance Trends (Last 7 Days)</h2>
    <div style="background:#f9f9f9;padding:12px;border-radius:4px;margin-bottom:16px;border-left:3px solid #195c49">
      <strong>What this means:</strong> Daily snapshots of overall site performance across ALL page loads, showing whether performance is improving or degrading over time.
      The "% good" shows what portion of all page loads met Core Web Vitals thresholds each day.
      <br><br>
      <strong>Why you should care:</strong> Trends reveal if recent changes (deploys, content updates, third-party additions) are causing regressions. 
      If you see a sudden drop in "% good" on a specific day, investigate what changed. Conversely, if trends are improving, your optimization efforts are working.
      This is site-wide data, so it includes both problematic and good pages—giving you the full performance picture over time.
    </div>
    <p style="color:#666;font-size:13px;margin-bottom:12px">
      Daily trends from Shopify Core Web Vitals data showing p75 metrics and distribution percentages.
    </p>
    ${buildMetricTrend('LCP', overtime.LCP)}
    ${buildMetricTrend('CLS', overtime.CLS)}
    ${buildMetricTrend('INP', overtime.INP)}
  `;
}

function getUniqueSegments(items) {
  const segments = new Set(items.map(i => i.segment ?? 'other').filter(Boolean));
  return Array.from(segments).sort();
}

function loadExtendedData() {
  const pageTypesPath = path.join(OUT_DIR, 'shopify-page-types.json');
  const overtimePath = path.join(OUT_DIR, 'shopify-overtime.json');
  
  const pageTypes = fs.existsSync(pageTypesPath)
    ? JSON.parse(fs.readFileSync(pageTypesPath, 'utf8'))
    : null;
    
  const overtime = fs.existsSync(overtimePath)
    ? JSON.parse(fs.readFileSync(overtimePath, 'utf8'))
    : null;
  
  return { pageTypes, overtime };
}

function buildQuickDashboard(data) {
  const items = data.items || [];
  const summary = data.summary || {};
  
  // Count pages by urgency
  const criticalCount = items.filter(i => i.urgency === 'critical').length;
  const highCount = items.filter(i => i.urgency === 'high').length;
  const mediumCount = items.filter(i => i.urgency === 'medium').length;
  
  // Count by segment with most issues
  const segmentsByIssues = data.segments 
    ? data.segments
        .filter(s => s.issues && s.issues.total > 0)
        .sort((a, b) => {
          // Sort by critical count, then total issues
          if (b.issues.critical !== a.issues.critical) return b.issues.critical - a.issues.critical;
          return b.issues.total - a.issues.total;
        })
        .slice(0, 3)
    : [];
  
  // Top high-traffic problematic pages
  const highTrafficIssues = items
    .filter(i => (i.loads || 0) >= 1000)
    .sort((a, b) => (b.loads || 0) - (a.loads || 0))
    .slice(0, 5);
  
  // Pages with poor metrics
  const poorLCP = items.filter(i => i.LCP?.score === 'poor').length;
  const poorCLS = items.filter(i => i.CLS?.score === 'poor').length;
  const poorINP = items.filter(i => i.INP?.score === 'poor').length;
  
  return `
    <div class="dashboard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:24px 0">
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">🚨 Critical Pages</h3>
        <div style="font-size:32px;font-weight:700;color:#842029;margin-bottom:8px">${criticalCount}</div>
        <p style="margin:0;font-size:13px;color:#666">Pages with critical performance issues</p>
        <a href="#perf-table" onclick="filterByUrgency('critical'); return false;" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline;cursor:pointer">View critical pages →</a>
      </div>
      
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">📊 Total Issues</h3>
        <div style="font-size:32px;font-weight:700;color:#856404;margin-bottom:8px">${items.length}</div>
        <p style="margin:0;font-size:13px;color:#666">Pages requiring attention (${highCount} high, ${mediumCount} medium)</p>
        <a href="#perf-table" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline">View all issues →</a>
      </div>
      
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">📈 Segment Analysis</h3>
        <div style="font-size:18px;font-weight:600;color:#333;margin-bottom:8px">
          ${segmentsByIssues.length > 0 ? segmentsByIssues.map(s => `${s.name}: ${s.issues.total}`).join(', ') : 'No segment data'}
        </div>
        <p style="margin:0;font-size:13px;color:#666">Top segments by issue count</p>
        <a href="#segment-rollups" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline">View segment rollups →</a>
      </div>
      
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">⚠️ Poor Metrics</h3>
        <div style="display:flex;gap:16px;margin-bottom:8px">
          <div>
            <div style="font-size:20px;font-weight:700;color:#842029">${poorLCP}</div>
            <div style="font-size:11px;color:#666">Poor LCP</div>
          </div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#842029">${poorCLS}</div>
            <div style="font-size:11px;color:#666">Poor CLS</div>
          </div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#842029">${poorINP}</div>
            <div style="font-size:11px;color:#666">Poor INP</div>
          </div>
        </div>
        <p style="margin:0;font-size:13px;color:#666">Pages with "Poor" scores</p>
        <a href="#perf-table" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline">Filter by metric →</a>
      </div>
      
      ${highTrafficIssues.length > 0 ? `
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">🔥 High-Traffic Issues</h3>
        <div style="font-size:14px;font-weight:600;color:#333;margin-bottom:8px">
          Top ${highTrafficIssues.length} pages by traffic with issues
        </div>
        <ul style="margin:0;padding-left:20px;font-size:12px;color:#666;line-height:1.6">
          ${highTrafficIssues.map((item, idx) => 
            `<li>${(item.loads || 0).toLocaleString()} loads - ${item.segment || 'other'}</li>`
          ).join('')}
        </ul>
        <a href="#perf-table" onclick="sortByLoads(); return false;" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline;cursor:pointer">Sort by traffic →</a>
      </div>
      ` : ''}
      
      <div class="dashboard-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#333">📅 7-Day Trends</h3>
        <div style="font-size:14px;color:#666;margin-bottom:8px">
          Daily performance tracking
        </div>
        <p style="margin:0;font-size:13px;color:#666">Track improvements and regressions</p>
        <a href="#trends" style="display:inline-block;margin-top:12px;font-size:13px;color:#195c49;text-decoration:underline">View trends →</a>
      </div>
    </div>
  `;
}

function buildHtml(data) {
  const rows = data.items.map((item, idx) => toRow(item, idx)).join('\n');
  
  // Load extended Shopify data
  let extendedData;
  try {
    extendedData = loadExtendedData();
  } catch (err) {
    extendedData = { pageTypes: null, overtime: null };
  }
  
  const segRows = segmentRows(data, extendedData.pageTypes);
  const trendsSection = buildTrendsSection(extendedData.overtime);
const uniqueSegments = getUniqueSegments(data.items);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Analysis & Remediation</title>
  <link rel="stylesheet" href="arcadia-style.css">
  <link rel="icon" type="image/png" href="assets/favicon.png">
  <link rel="icon" type="image/webp" href="assets/favicon.webp">
  <style>
    .badge{display:inline-block;padding:2px 6px;border-radius:4px;background:#e0e0e0;font-size:12px}
    .badge.success{background:#d2f2e3;color:#0a6c3e}
    .badge.warning{background:#fff3cd;color:#8a6d3b}
    .badge.danger{background:#f8d7da;color:#842029}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
    th.sortable{cursor:pointer;user-select:none;position:relative;padding-right:20px}
    th.sortable:hover{background:#f5f5f5}
    th.sortable::after{content:'↕';position:absolute;right:4px;opacity:0.3}
    th.sortable.asc::after{content:'↑';opacity:1}
    th.sortable.desc::after{content:'↓';opacity:1}
    .filters{display:flex;gap:12px;margin:16px 0;padding:12px;background:#f9f9f9;border-radius:4px;flex-wrap:wrap;align-items:center}
    .filters label{font-weight:600;font-size:14px}
    .filters select{padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:14px}
    .metric-cell{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .metric-value{font-weight:600;min-width:45px}
    .metric-cell .source{color:#666;font-size:10px}
    .recs-details{margin:0;font-size:12px}
    .recs-details summary{cursor:pointer;color:#195c49;padding:2px 0;font-weight:500}
    .recs-details ul{margin:6px 0 0 16px;padding:0;list-style-type:disc}
    .recs-details li{margin:4px 0;font-size:11px;line-height:1.4}
    .element-insight-header{margin-top:8px;list-style:none;font-weight:600;color:#0a6c3e}
    .rec-divider{margin-top:8px;list-style:none;font-weight:600}
    .element-ref{color:#195c49;font-family:monospace;background:#e8f5f0;padding:1px 3px;border-radius:2px;font-weight:600}
    .url-ref{color:#0c5460;font-size:10px;background:#e8f4f7;padding:1px 2px;border-radius:2px;word-break:break-all}
    .metric-val{color:#8b4513;font-weight:600}
    .size-ref{color:#5a4e42;font-family:monospace;font-size:10px;background:#f5f3f0;padding:1px 2px;border-radius:2px}
    .segment-badge{display:inline-block;padding:2px 6px;border-radius:3px;background:#eef2f0;color:#195c49;font-size:11px;text-transform:uppercase}
    .text-muted{color:#999;font-size:12px}
    tr.hidden{display:none}
    .data-sources{margin:20px 0}
    .data-sources h3{margin-top:16px;margin-bottom:8px;font-size:16px}
    .data-sources ul,.data-sources ol{margin:8px 0;padding-left:24px}
    .data-sources li{margin:4px 0;line-height:1.5}
    .footnotes{margin:20px 0}
    .footnotes ol{margin:12px 0;padding-left:24px}
    .footnotes li{margin:8px 0;line-height:1.6}
    .ai-disclaimer{color:#842029;background:#f8d7da;padding:2px 4px;border-radius:3px;font-size:12px;font-weight:600}
    .ai-badge-small{display:inline-block;color:#842029;background:#f8d7da;padding:1px 3px;border-radius:2px;font-size:9px;font-weight:600;margin-left:4px;vertical-align:middle}
    sup{font-size:11px;color:#195c49;font-weight:600}
    .dist-bar-container{display:flex;align-items:center;gap:8px}
    .dist-bar{position:relative;flex:1;height:20px;background:#f0f0f0;border-radius:3px;overflow:hidden;display:flex}
    .dist-segment{height:100%;transition:width 0.2s}
    .dist-segment.dist-good{background:#0a6c3e}
    .dist-segment.dist-needs{background:#ffc107}
    .dist-segment.dist-poor{background:#dc3545}
    .dist-percent{font-size:12px;font-weight:600;color:#333;min-width:35px;text-align:right}
    .dashboard-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:box-shadow 0.2s}
    .dashboard-card a{transition:color 0.2s}
    .dashboard-card a:hover{color:#0a6c3e}
  </style>
 </head>
<body>
  <div id="header-placeholder"></div>
  <div class="container">
    <h1>Performance Analysis & Remediation</h1>
    <p class="lead">Merged Shopify Core Web Vitals (LCP/CLS/INP) with Calibre measurements for XeroShoes.com pages. Generated at ${data.generatedAt}.</p>

    ${data.summary ? `
    <div class="alert info">
      <strong>Performance Summary:</strong> Out of <strong>${data.summary.totalPages}</strong> total pages analyzed, 
      <strong>${data.summary.pagesWithIssues}</strong> (${(100 - parseFloat(data.summary.allGoodPercent)).toFixed(1)}%) have performance issues requiring attention. 
      <strong>${data.summary.pagesAllGood}</strong> pages (${data.summary.allGoodPercent}%) have all metrics in the "Good" range and are excluded from the details table below.
      <br><br>
      <em>💡 Why this matters:</em> The <strong>Segment Rollups</strong> and <strong>Performance Trends</strong> sections show aggregated data for ALL pages (including the good ones), while the <strong>Page Performance Details</strong> table focuses only on pages with issues to prioritize remediation efforts.
    </div>
    ` : `
    <div class="alert info">
      <strong>Note:</strong> Pages with all "Good" metrics have been automatically filtered out. ${data.items.length} pages require attention.
    </div>
    `}

    ${data.deviceData ? `
    <div class="alert" style="background:#e8f4f7;border-left:3px solid #0c5460;margin-bottom:24px">
      <strong>📱 Device Prioritization:</strong> ${Object.entries(data.deviceData.byDevice)
        .sort((a, b) => b[1].sessions - a[1].sessions)
        .map(([device, data]) => `<strong>${device.charAt(0).toUpperCase() + device.slice(1)}</strong>: ${data.sessionPercent}%`)
        .join(', ')} of sessions.
      <br><br>
      <em>Focus remediation efforts on devices that drive the most traffic.</em> Mobile performance is critical given ${data.deviceData.byDevice.mobile?.sessionPercent || 0}% of sessions.
    </div>
    ` : ''}

    ${buildQuickDashboard(data)}

    <h2>Data Sources & Methodology</h2>
    
    <div class="data-sources">
      <h3>Metric Data Sources</h3>
      <ul>
        <li><strong>Shopify Core Web Vitals¹:</strong> Real User Monitoring (RUM) data collected directly from user sessions on XeroShoes.com. Metrics represent 75th percentile (p75) values from actual page loads.</li>
        <li><strong>Calibre App²:</strong> Synthetic monitoring data from automated performance tests. Used as primary source when available, with Shopify RUM as fallback. Includes TimeSeries data for historical trends and diagnostic metrics (TTFB, TBT, resource sizes).</li>
        <li><strong>Calibre Lighthouse Audits³:</strong> When available, element-level diagnostics are extracted from Lighthouse audits to identify specific problematic elements (LCP images, CLS sources, INP interactions).</li>
        <li><strong>Google PageSpeed Insights⁶:</strong> For critical pages only (configurable via <code>googlePagespeed.minUrgency</code>), full Lighthouse reports are fetched via PSI API. This provides detailed diagnostics including element-level insights, resource sizes, and performance scores. PSI data takes precedence over Calibre Lighthouse audits when available. <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank" rel="noopener noreferrer">PSI API documentation</a></li>
      </ul>
      
      <h3>Data Precedence</h3>
      <p>For each metric (LCP, CLS, INP), the following precedence is used:</p>
      <ol>
        <li>Google PageSpeed Insights (for critical pages only)</li>
        <li>Calibre point-in-time measurements (if available)</li>
        <li>Calibre TimeSeries latest snapshot (if point-in-time unavailable)</li>
        <li>Shopify RUM data (fallback)</li>
      </ol>
      <p><strong>Note:</strong> Element-level diagnostics use the same precedence, with PSI Lighthouse data taking priority when available.</p>
      
      <h3>AI-Generated Content Disclaimer</h3>
      <div class="alert warning">
        <strong>⚠️ AI-Generated Recommendations:</strong> The remediation recommendations in this report are generated algorithmically based on metric thresholds and diagnostic data. These are <em>suggested actions</em> and should be validated by a performance engineer before implementation. The recommendations are not reviewed or verified by human experts.
        <br><br>
        <strong>What's AI-generated:</strong>
        <ul style="margin:8px 0 0 20px;padding-left:0">
          <li>All remediation recommendations and action items</li>
          <li>Urgency classifications and prioritization guidance</li>
          <li>Diagnostic-based suggestions (TTFB, bundle size, third-party impact analysis)</li>
        </ul>
        <br>
        <strong>What's from real data:</strong>
        <ul style="margin:8px 0 0 20px;padding-left:0">
          <li>All metric values (LCP, CLS, INP) — from Shopify or Calibre</li>
          <li>Metric scores (Good/Needs improvement/Poor) — calculated from actual metric values against Core Web Vitals thresholds</li>
          <li>Element-level insights — extracted from Calibre Lighthouse audits (when available)</li>
          <li>Confidence scores and data source indicators</li>
        </ul>
      </div>
    </div>

    <div class="alert success">
      <strong>🔍 Element-Level Insights:</strong> When available, remediation actions include specific element references extracted from Lighthouse audits:
      <ul style="margin:8px 0 0 20px;padding-left:0">
        <li><strong>LCP elements:</strong> Identifies the exact image or element causing slow Largest Contentful Paint</li>
        <li><strong>CLS sources:</strong> Lists elements causing layout shifts with their shift values</li>
        <li><strong>INP interactions:</strong> Identifies specific interactions and their target elements</li>
      </ul>
    </div>

    <h2 id="segment-rollups">Segment Rollups</h2>
    <div style="background:#f9f9f9;padding:12px;border-radius:4px;margin-bottom:16px;border-left:3px solid #195c49">
      <strong>What this means:</strong> These are <strong>aggregated, weighted averages</strong> across all pages in each segment (including pages with good metrics). 
      The weighted averages can mask issues when critical pages have low traffic—high-traffic good pages can pull down the average.
      <br><br>
      <strong>What to look for:</strong> Check the <strong>"URLs (with issues)"</strong> column and issue counts next to segment names. 
      If a segment shows "48 issues (12 critical)" but the weighted average is "good", it means the critical pages have low traffic 
      relative to the high-traffic good pages. The distribution bars show the true breakdown of page load performance.
      <br><br>
      <strong>Priority:</strong> Segments are sorted by impact score (traffic × severity), so high-traffic segments with issues appear first.
    </div>
    <p style="color:#666;font-size:13px;margin-bottom:12px">
      Weighted averages calculated from page loads. Metrics use data precedence: Calibre → Shopify RUM. 
      <a href="#footnotes" style="color:#195c49;text-decoration:underline">See footnotes</a> for data source details.
    </p>
    <div class="table-wrap">
      <table class="data-table">
        <tr>
          <th>Segment</th>
          <th>URLs<br><small>(with issues)</small></th>
          <th>Weighted Loads</th>
          <th>Weighted LCP (s)¹²</th>
          <th>Weighted CLS¹²</th>
          <th>Weighted INP (s)¹²</th>
          <th>LCP Distribution</th>
          <th>CLS Distribution</th>
          <th>INP Distribution</th>
        </tr>
        ${segRows}
      </table>
    </div>
    <p style="color:#666;font-size:12px;margin-top:8px">
      <span style="display:inline-flex;align-items:center;gap:4px;margin-right:16px">
        <span class="dist-segment dist-good" style="width:12px;height:12px;display:inline-block"></span>
        Good
      </span>
      <span style="display:inline-flex;align-items:center;gap:4px;margin-right:16px">
        <span class="dist-segment dist-needs" style="width:12px;height:12px;display:inline-block"></span>
        Needs Improvement
      </span>
      <span style="display:inline-flex;align-items:center;gap:4px">
        <span class="dist-segment dist-poor" style="width:12px;height:12px;display:inline-block"></span>
        Poor
      </span>
    </p>

    ${trendsSection}

    <h2>Page Performance Details</h2>
    <div style="background:#fff3cd;padding:12px;border-radius:4px;margin-bottom:16px;border-left:3px solid #856404">
      <strong>⚠️ Important:</strong> This table shows <strong>ONLY pages with performance issues</strong> (pages where at least one metric is "Needs Improvement" or "Poor"). 
      Pages with all metrics in the "Good" range are intentionally filtered out to focus attention on what needs fixing.
    </div>
    
    <div class="filters">
      <label>Filter by Urgency:</label>
      <select id="filter-urgency">
        <option value="all">All</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
      </select>
      
      <label>Filter by Page Type:</label>
      <select id="filter-segment">
        <option value="all">All</option>
        ${uniqueSegments.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      
      <span id="result-count" style="margin-left:auto;font-weight:600"></span>
    </div>

    <div class="table-wrap">
      <table class="data-table" id="perf-table">
        <thead>
          <tr>
            <th class="sortable" data-sort="url">Page URL</th>
            <th class="sortable" data-sort="urgency">Urgency<sup>⁴</sup></th>
            <th class="sortable" data-sort="segment">Page Type</th>
            <th class="sortable" data-sort="loads">Page Loads</th>
            <th class="sortable" data-sort="lcp-value">LCP¹²</th>
            <th class="sortable" data-sort="cls-value">CLS¹²</th>
            <th class="sortable" data-sort="inp-value">INP¹²</th>
            <th>Recommendations<sup>⁵</sup></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="alert warning">
      <strong>Prioritization tip:</strong> Address <em>Critical</em> urgency pages first (LCP>5s, poor CLS/INP), then <em>High</em> (LCP≤5s, needs-improvement CLS). Pages with <strong>🔍 Element-level insights</strong> provide specific, actionable targets for optimization.
    </div>

    <hr style="margin:40px 0;border:none;border-top:1px solid #e5e7eb">

    <h2 id="footnotes">Footnotes & Data Attribution</h2>
    
    <div class="footnotes">
      <ol style="line-height:1.8">
        <li><strong>Shopify Core Web Vitals:</strong> Real User Monitoring data from actual browser sessions on XeroShoes.com. Represents 75th percentile (p75) values. <a href="https://web.dev/vitals/" target="_blank" rel="noopener noreferrer">Core Web Vitals specification</a></li>
        <li><strong>Calibre App:</strong> Synthetic monitoring data from automated performance tests. Metrics are from Calibre's p95 measurements. Used as primary source when available, with Shopify RUM as fallback. <a href="https://calibreapp.com" target="_blank" rel="noopener noreferrer">Calibre App documentation</a></li>
        <li><strong>Lighthouse Audits:</strong> When available, element-level diagnostics are extracted from Calibre's Lighthouse audit data to identify specific problematic elements. Currently limited by API access patterns. <a href="https://developers.google.com/web/tools/lighthouse" target="_blank" rel="noopener noreferrer">Lighthouse documentation</a></li>
        <li><strong>Urgency Classification:</strong> Algorithmically calculated based on metric scores and values:
          <ul style="margin:4px 0 0 20px;padding-left:0">
            <li><strong>Critical:</strong> LCP status:poor AND LCP>5s, OR CLS status:poor, OR INP status:poor</li>
            <li><strong>High:</strong> LCP status:poor AND LCP≤5s, OR CLS status:needs-improvement</li>
            <li><strong>Medium:</strong> All other cases (needs-improvement metrics, etc.)</li>
          </ul>
        </li>
        <li><strong>Remediation Recommendations:</strong> <strong class="ai-disclaimer">AI-Generated Content</strong> — These recommendations are algorithmically generated based on metric thresholds, diagnostic data (TTFB, bundle sizes, third-party impact), and Core Web Vitals best practices. Recommendations are <em>not</em> reviewed or verified by human performance engineers and should be validated before implementation. Generated by automated analysis scripts using rule-based logic and performance heuristics.</li>
        <li><strong>Google PageSpeed Insights & CrUX Links⁶:</strong> Critical pages (as determined by urgency classification and traffic volume) are automatically sent through Google's PageSpeed Insights API for full Lighthouse audits. The PSI Performance Score (0-100) is displayed next to urgency when available. All pages include a CrUX (Chrome User Experience Report) link for additional real-world performance data.</li>
      </ol>
      
      <div class="alert" style="margin-top:20px;background:#f0f9f5;border-left:3px solid #0a6c3e">
        <strong>Data Export Information:</strong> This report is based on data exports from:
        <ul style="margin:8px 0 0 20px;padding-left:0">
          <li>Shopify Core Web Vitals: Export date varies by data collection period</li>
          <li>Calibre App: Latest available snapshots and TimeSeries data (typically 7 days)</li>
        </ul>
        Report generated: <strong>${data.generatedAt}</strong>
      </div>
    </div>
  </div>
  <div id="footer-placeholder"></div>

  <script>
    // Load header/footer
    fetch('templates/header.html').then(r=>r.text()).then(html=>{document.getElementById('header-placeholder').innerHTML=html}).catch(e=>console.error('Error loading header:',e));
    fetch('templates/footer.html').then(r=>r.text()).then(html=>{document.getElementById('footer-placeholder').innerHTML=html}).catch(e=>console.error('Error loading footer:',e));
    
    // Table sorting and filtering
    (function() {
      const table = document.getElementById('perf-table');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      // Default sort preserves impact-based ordering from backend (urgency desc, which correlates with impact)
      // Data is pre-sorted by impact score = urgency_weight * log(page_loads)
      let currentSort = { column: 'urgency', direction: 'desc' };
      
      function getCellValue(row, sortType) {
        const urgency = row.dataset.urgency || 'medium';
        const segment = row.dataset.segment || 'other';
        const cells = row.querySelectorAll('td');
        
        switch(sortType) {
          case 'url': return cells[0].textContent.trim();
          case 'urgency': return urgency === 'critical' ? 0 : urgency === 'high' ? 1 : urgency === 'medium' ? 2 : 3;
          case 'segment': return segment;
          case 'lcp-value': return parseFloat(row.dataset.lcpValue) || 0;
          case 'cls-value': return parseFloat(row.dataset.clsValue) || 0;
          case 'inp-value': return parseFloat(row.dataset.inpValue) || 0;
          case 'loads': return parseInt(row.dataset.loads || 0, 10);
          default: return '';
        }
      }
      
      function sortTable(column, direction) {
        rows.sort((a, b) => {
          const aVal = getCellValue(a, column);
          const bVal = getCellValue(b, column);
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
          return 0;
        });
        
        rows.forEach(row => tbody.appendChild(row));
        
        // Update header indicators
        document.querySelectorAll('th.sortable').forEach(th => {
          th.classList.remove('asc', 'desc');
          if (th.dataset.sort === column) {
            th.classList.add(direction);
          }
        });
      }
      
      // Sort handlers
      document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const column = th.dataset.sort;
          // Metric columns and urgency default to descending (higher values are worse)
          const metricColumns = ['lcp-value', 'cls-value', 'inp-value'];
          const descDefaultColumns = [...metricColumns, 'urgency', 'loads'];
          const isDescDefault = descDefaultColumns.includes(column);
          
          let direction;
          if (isDescDefault) {
            // For desc-default columns: desc on first click, then toggle
            direction = currentSort.column === column && currentSort.direction === 'desc' ? 'asc' : 'desc';
          } else {
            // For other columns: asc on first click, then toggle
            direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
          }
          
          currentSort = { column, direction };
          sortTable(column, direction);
          updateResultCount();
        });
      });
      
      // Filter handlers
      function applyFilters() {
        const urgencyFilter = document.getElementById('filter-urgency').value;
        const segmentFilter = document.getElementById('filter-segment').value;
        
        rows.forEach(row => {
          const urgency = row.dataset.urgency || 'medium';
          const segment = row.dataset.segment || 'other';
          
          const matchUrgency = urgencyFilter === 'all' || urgency === urgencyFilter;
          const matchSegment = segmentFilter === 'all' || segment === segmentFilter;
          
          if (matchUrgency && matchSegment) {
            row.classList.remove('hidden');
          } else {
            row.classList.add('hidden');
          }
        });
        
        updateResultCount();
      }
      
      function updateResultCount() {
        const visible = rows.filter(r => !r.classList.contains('hidden')).length;
        document.getElementById('result-count').textContent = \`Showing \${visible} of \${rows.length} pages\`;
      }
      
      document.getElementById('filter-urgency').addEventListener('change', applyFilters);
      document.getElementById('filter-segment').addEventListener('change', applyFilters);
      
      // Helper functions for dashboard links
      window.filterByUrgency = function(urgency) {
        const filter = document.getElementById('filter-urgency');
        if (filter) {
          filter.value = urgency;
          applyFilters();
          // Scroll to table
          document.getElementById('perf-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      
      window.sortByLoads = function() {
        sortTable('loads', 'desc');
        updateResultCount();
        // Scroll to table
        document.getElementById('perf-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      
      // Initial sort
      sortTable('urgency', 'desc');
      updateResultCount();
    })();
  </script>
</body>
</html>`;
}

function main() {
  const data = loadMerged();
  const reportPath = path.join(ROOT, 'performance-analysis.html');
  const html = buildHtml(data);
  fs.writeFileSync(reportPath, html);
  console.log('Wrote', reportPath);
}

main();
