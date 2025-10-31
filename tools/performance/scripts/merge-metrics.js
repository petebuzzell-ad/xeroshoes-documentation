#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), '../../');
const OUT_DIR = path.join(ROOT, 'data', 'performance', 'out');

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

function isAffiliatePath(u) {
  try {
    const url = new URL(u);
    return url.pathname.startsWith('/go/');
  } catch {
    return false;
  }
}

function score(metric, value) {
  if (value == null) return 'unknown';
  if (metric === 'LCP') return value <= 2.5 ? 'good' : value <= 4.0 ? 'needs-improvement' : 'poor';
  if (metric === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  if (metric === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
  return 'unknown';
}

function segmentFor(url) {
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p === '/' || p === '') return 'homepage';
    if (p.startsWith('/products/')) return 'pdp';
    if (p.startsWith('/collections/')) return 'collections';
    if (p.startsWith('/search')) return 'search';
    if (p.startsWith('/blogs/') || p.startsWith('/blog/')) return 'blog';
    if (p.startsWith('/pages/')) return 'pages';
    return 'other';
  } catch {
    return 'other';
  }
}

function confidence(shopifyVal, calibreVal, metric) {
  const hasS = shopifyVal != null;
  const hasC = calibreVal != null;
  if (hasS && hasC) {
    const diff = Math.abs(shopifyVal - calibreVal);
    const rel = metric === 'CLS' ? diff : diff / Math.max(0.001, shopifyVal);
    const ok = metric === 'CLS' ? diff <= 0.05 : rel <= 0.2;
    return ok ? 'high' : 'medium';
  }
  if (hasS) return 'medium';
  if (hasC) return 'low';
  return 'unknown';
}

function discrepancy(shopifyVal, calibreVal, metric) {
  if (shopifyVal == null || calibreVal == null) return null;
  const diff = calibreVal - shopifyVal;
  const rel = metric === 'CLS' ? diff : (diff / Math.max(0.001, shopifyVal));
  return { abs: diff, rel };
}

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return null;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getUrgency(scores, values, pageLoads = 0) {
  // Base urgency from metric scores and values
  let baseUrgency = 'medium';
  
  // critical = LCP status:poor AND LCP>5, OR CLS status:poor, OR INP status:poor
  if (scores.CLS === 'poor' || scores.INP === 'poor') {
    baseUrgency = 'critical';
  } else if (scores.LCP === 'poor' && values.LCP > 5) {
    baseUrgency = 'critical';
  }
  // high = LCP status:poor AND LCP<=5, OR CLS status:needs-improvement
  else if (scores.LCP === 'poor' && values.LCP <= 5) {
    baseUrgency = 'high';
  } else if (scores.CLS === 'needs-improvement') {
    baseUrgency = 'high';
  } else if (scores.LCP === 'needs-improvement' || scores.INP === 'needs-improvement') {
    baseUrgency = 'medium';
  }
  
  // Traffic-based urgency boost: high-traffic pages get escalated
  // Thresholds: 10k+ loads = critical boost, 5k+ = high boost, 1k+ = medium boost
  if (pageLoads >= 10000) {
    if (baseUrgency === 'medium') return 'high';
    if (baseUrgency === 'high') return 'critical';
  } else if (pageLoads >= 5000) {
    if (baseUrgency === 'medium') return 'high';
  } else if (pageLoads >= 1000) {
    if (baseUrgency === 'medium' && (scores.LCP !== 'good' || scores.CLS !== 'good' || scores.INP !== 'good')) {
      return 'high';
    }
  }
  
  return baseUrgency;
}

function remediation(urlMetrics, diagnostics, elements) {
  const actions = [];
  const { LCP, CLS, INP } = urlMetrics;
  const diag = diagnostics || {};
  const elem = elements || {};
  
  // Track urgency for overall assessment
  const urgencyLevels = { LCP: 'none', CLS: 'none', INP: 'none' };

  if (LCP?.value != null && score('LCP', LCP.value) !== 'good') {
    urgencyLevels.LCP = score('LCP', LCP.value);
    const lcpVal = LCP.value;
    const ttfb = diag.ttfb;
    const imageSize = diag.imageSize;
    const jsSize = diag.jsSize;
    const lcpElement = elem.lcpElement;
    
    if (lcpElement?.element) {
      const elemDesc = lcpElement.url ? `image: ${lcpElement.element} (${lcpElement.url})` : `element: ${lcpElement.element}`;
      if (ttfb != null && ttfb > 600) {
        actions.push(`Slow server response (TTFB: ${ttfb.toFixed(0)}ms) delaying LCP on ${elemDesc} - optimize backend/CDN or use edge caching.`);
      } else if (imageSize != null && imageSize > 500000) {
        actions.push(`LCP element ${elemDesc} is large (${formatBytes(imageSize)}) - optimize with WebP, proper dimensions, and preload if above-the-fold.`);
      } else if (jsSize != null && jsSize > 1000000) {
        actions.push(`Large JavaScript bundle (${formatBytes(jsSize)}) blocking render of LCP element ${elemDesc} - implement code-splitting and defer non-critical JS.`);
      } else {
        actions.push(`LCP ${lcpVal.toFixed(2)}s is slow on ${elemDesc} - optimize with compression, WebP, proper dimensions, and reduce render-blocking resources.`);
      }
    } else {
      // Calculate severity multiplier
      const target = 2.5; // LCP target in seconds
      const multiplier = (lcpVal / target).toFixed(1);
      const severity = lcpVal > 4 ? '🚨 CRITICAL' : lcpVal > 3 ? '⚠️ HIGH' : '⚠️ NEEDS IMPROVEMENT';
      
      if (ttfb != null && ttfb > 600) {
        actions.push(`${severity}: LCP ${lcpVal.toFixed(2)}s (${multiplier}x target) - Slow server response (TTFB: ${ttfb.toFixed(0)}ms) is the bottleneck. Actions: 1) Check server/CDN status and response times, 2) Enable edge caching, 3) Optimize backend queries and database performance.`);
      } else if (imageSize != null && imageSize > 500000) {
        actions.push(`${severity}: LCP ${lcpVal.toFixed(2)}s (${multiplier}x target) - Large images (${formatBytes(imageSize)}) detected. Actions: 1) Convert hero/above-the-fold images to WebP, 2) Serve properly sized images (not oversized), 3) Preload critical images, 4) Use responsive srcset with appropriate breakpoints.`);
      } else if (jsSize != null && jsSize > 1000000) {
        actions.push(`${severity}: LCP ${lcpVal.toFixed(2)}s (${multiplier}x target) - Large JavaScript bundle (${formatBytes(jsSize)}) blocking render. Actions: 1) Code-split and lazy-load non-critical JS, 2) Defer/async non-essential scripts, 3) Remove unused JavaScript, 4) Use tree-shaking to eliminate dead code.`);
      } else {
        // No diagnostic data - provide comprehensive guidance
        const actionList = lcpVal > 4 
          ? '1) Verify server/CDN is responding (< 600ms TTFB), 2) Check above-the-fold image loading and size, 3) Audit render-blocking resources (CSS/JS), 4) Enable resource preloading, 5) Check network conditions (could be test environment)'
          : '1) Optimize hero image (WebP, proper dimensions, compression), 2) Reduce render-blocking CSS/JS, 3) Preload critical resources, 4) Minimize server response time';
        actions.push(`${severity}: LCP ${lcpVal.toFixed(2)}s (target: < 2.5s, ${multiplier}x slower). Immediate actions: ${actionList}.`);
      }
    }
    if (diag.thirdPartyCount != null && diag.thirdPartyCount > 20) {
      actions.push(`High third-party count (${diag.thirdPartyCount}) may delay LCP - defer or lazy-load non-critical third parties.`);
    }
  }

  if (CLS?.value != null && score('CLS', CLS.value) !== 'good') {
    urgencyLevels.CLS = score('CLS', CLS.value);
    const clsVal = CLS.value;
    const imageSize = diag.imageSize;
    const fontSize = diag.fontSize;
    const clsSources = elem.clsSources || [];
    
    if (clsSources.length > 0) {
      const topSource = clsSources[0];
      const shiftDesc = topSource.shift ? ` (shift: ${topSource.shift.toFixed(3)})` : '';
      actions.push(`CLS ${clsVal.toFixed(3)} caused by layout shift on ${topSource.element}${shiftDesc} - add explicit width/height attributes or aspect-ratio CSS.`);
      if (clsSources.length > 1) {
        const otherCount = clsSources.length - 1;
        actions.push(`${otherCount} additional element${otherCount > 1 ? 's' : ''} contributing to CLS: ${clsSources.slice(1, 4).map(s => s.element).join(', ')}${clsSources.length > 4 ? '...' : ''}`);
      }
    } else {
      const target = 0.1; // CLS target
      const multiplier = (clsVal / target).toFixed(1);
      const severity = clsVal > 0.25 ? '🚨 CRITICAL' : clsVal > 0.15 ? '⚠️ HIGH' : '⚠️ NEEDS IMPROVEMENT';
      
      if (imageSize != null && imageSize > 400000) {
        actions.push(`${severity}: CLS ${clsVal.toFixed(3)} (target: < 0.1, ${multiplier}x higher) - Images without dimensions causing shifts (${formatBytes(imageSize)} total). Actions: 1) Add explicit width/height attributes to all images, 2) Use aspect-ratio CSS property, 3) Reserve space for dynamic content, 4) Avoid inserting content above existing content.`);
      } else if (fontSize != null && fontSize > 150000) {
        actions.push(`${severity}: CLS ${clsVal.toFixed(3)} (target: < 0.1, ${multiplier}x higher) - Font swap causing layout shifts (${formatBytes(fontSize)} fonts). Actions: 1) Use font-display: swap or optional, 2) Preload critical fonts, 3) Use font-display: block for critical text, 4) Consider using system fonts for body text.`);
      } else {
        const actionList = clsVal > 0.25
          ? '1) Add width/height to ALL images (including responsive), 2) Reserve space for ads/banners/widgets, 3) Preload fonts with font-display, 4) Avoid injecting content that pushes existing content, 5) Use CSS containment for dynamic sections'
          : '1) Specify dimensions for images (width/height attributes or aspect-ratio), 2) Avoid late-loading fonts, 3) Reserve space for dynamic content';
        actions.push(`${severity}: CLS ${clsVal.toFixed(3)} (target: < 0.1, ${multiplier}x higher) indicates layout instability. Actions: ${actionList}.`);
      }
    }
    actions.push(`Stabilize dynamic content (ads, banners, injected widgets) that may shift layout after initial render.`);
  }

  if (INP?.value != null && score('INP', INP.value) !== 'good') {
    urgencyLevels.INP = score('INP', INP.value);
    const inpVal = INP.value;
    const tbt = diag.tbt;
    const jsSize = diag.jsSize;
    const thirdPartyMainThread = diag.thirdPartyMainThread;
    const inpInteractions = elem.inpInteractions || [];
    
    if (inpInteractions.length > 0) {
      const topInteraction = inpInteractions[0];
      const delayDesc = topInteraction.delay ? ` (delay: ${(topInteraction.delay * 1000).toFixed(0)}ms)` : '';
      if (tbt != null && tbt > 300) {
        actions.push(`INP ${(inpVal * 1000).toFixed(0)}ms${delayDesc} on ${topInteraction.type} interaction at ${topInteraction.element} - high TBT (${tbt.toFixed(0)}ms) indicates long JavaScript tasks, break up work or defer heavy computations.`);
      } else if (thirdPartyMainThread != null && thirdPartyMainThread > 500) {
        actions.push(`INP ${(inpVal * 1000).toFixed(0)}ms${delayDesc} on ${topInteraction.type} interaction at ${topInteraction.element} - third-party scripts blocking main thread (${thirdPartyMainThread.toFixed(0)}ms), defer or load asynchronously.`);
      } else if (jsSize != null && jsSize > 1000000) {
        actions.push(`INP ${(inpVal * 1000).toFixed(0)}ms${delayDesc} on ${topInteraction.type} interaction at ${topInteraction.element} - large JS bundle (${formatBytes(jsSize)}), code-split, lazy-load, and use passive event listeners.`);
      } else {
        actions.push(`INP ${(inpVal * 1000).toFixed(0)}ms${delayDesc} on ${topInteraction.type} interaction at ${topInteraction.element} - optimize handler, break up long tasks, and use passive event listeners.`);
      }
      if (inpInteractions.length > 1) {
        const otherCount = inpInteractions.length - 1;
        actions.push(`${otherCount} additional slow interaction${otherCount > 1 ? 's' : ''}: ${inpInteractions.slice(1).map(i => `${i.type} at ${i.element}`).join(', ')}`);
      }
    } else {
      const inpMs = inpVal * 1000;
      const target = 200; // INP target in milliseconds
      const multiplier = (inpMs / target).toFixed(1);
      const severity = inpMs > 500 ? '🚨 CRITICAL' : inpMs > 350 ? '⚠️ HIGH' : '⚠️ NEEDS IMPROVEMENT';
      
      if (tbt != null && tbt > 300) {
        actions.push(`${severity}: INP ${inpMs.toFixed(0)}ms (target: < 200ms, ${multiplier}x slower) - High Total Blocking Time (${tbt.toFixed(0)}ms) from long JavaScript tasks. Actions: 1) Break up long tasks into smaller chunks (< 50ms each), 2) Use requestIdleCallback for non-critical work, 3) Defer heavy computations, 4) Optimize event handlers (debounce/throttle), 5) Use Web Workers for heavy processing.`);
      } else if (thirdPartyMainThread != null && thirdPartyMainThread > 500) {
        actions.push(`${severity}: INP ${inpMs.toFixed(0)}ms (target: < 200ms, ${multiplier}x slower) - Third-party scripts blocking main thread (${thirdPartyMainThread.toFixed(0)}ms). Actions: 1) Defer non-critical third parties, 2) Load scripts asynchronously, 3) Use iframe sandboxing for ads/widgets, 4) Lazy-load third-party scripts, 5) Consider removing unnecessary third-party services.`);
      } else if (jsSize != null && jsSize > 1000000) {
        actions.push(`${severity}: INP ${inpMs.toFixed(0)}ms (target: < 200ms, ${multiplier}x slower) - Large JS bundle (${formatBytes(jsSize)}) causing delays. Actions: 1) Code-split by route/page, 2) Lazy-load non-critical JavaScript, 3) Use passive event listeners, 4) Remove unused code (tree-shaking), 5) Optimize bundle size and parse time.`);
      } else {
        const actionList = inpMs > 500
          ? '1) Audit and optimize all interaction handlers (clicks, taps, scroll), 2) Break up long JavaScript tasks, 3) Defer non-critical JS execution, 4) Use passive event listeners, 5) Optimize filter/search with debouncing/throttling, 6) Minimize main thread work during interactions'
          : '1) Defer heavy JavaScript, 2) Break up long tasks, 3) Use passive event listeners, 4) Optimize interaction handlers';
        actions.push(`${severity}: INP ${inpMs.toFixed(0)}ms (target: < 200ms, ${multiplier}x slower). Actions: ${actionList}.`);
      }
      actions.push(`Review interaction handlers on ${urlMetrics.url.replace(/^https?:\/\//, '')} - focus on filter/search, add-to-cart, navigation, and form interactions.`);
    }
  }

  const overallUrgency = getUrgency(urgencyLevels, {
    LCP: LCP?.value ?? null,
    CLS: CLS?.value ?? null,
    INP: INP?.value ?? null
  }, urlMetrics.pageLoads || 0);
  return {
    actions: [...new Set(actions)],
    urgency: overallUrgency
  };
}

function buildCalibreFromTimeseries(ts) {
  if (!ts || !Array.isArray(ts.series) || !Array.isArray(ts.pages)) return { metrics: {}, diagnostics: {} };
  const pageMap = new Map(ts.pages.map(p => {
    const normalized = normalizeUrl(p.url);
    return [p.uuid, normalized];
  }));
  const latestIndex = (arr) => arr.length ? arr.length - 1 : -1;
  const byUrl = {};
  const metricNameMap = {
    LCP: ['largest_contentful_paint', 'largest-contentful-paint'],
    CLS: ['cumulative-layout-shift', 'cumulative_layout_shift'],
    INP: ['interaction-to-next-paint', 'interaction_to_next_paint']
  };

  for (const entry of ts.series) {
    const url = pageMap.get(entry.page);
    if (!url || isAffiliatePath(url)) continue;
    const m = entry.measurement;
    const idx = latestIndex(entry.values);
    if (idx < 0) continue;
    const raw = entry.values[idx];
    if (!byUrl[url]) byUrl[url] = { metrics: {}, diagnostics: {} };
    
    // Core metrics
    if (metricNameMap.LCP.includes(m)) {
      byUrl[url].metrics.LCP = (raw != null) ? raw / 1000 : null;
    } else if (metricNameMap.CLS.includes(m)) {
      byUrl[url].metrics.CLS = (raw != null) ? raw / 1000 : null;
    } else if (metricNameMap.INP.includes(m)) {
      byUrl[url].metrics.INP = (raw != null) ? raw / 1000 : null;
    }
    
    // Diagnostic metrics
    if (m === 'time-to-first-byte') {
      byUrl[url].diagnostics.ttfb = raw;
    } else if (m === 'total-blocking-time') {
      byUrl[url].diagnostics.tbt = raw;
    } else if (m === 'image_body_size_in_bytes' || m === 'image_size_in_bytes') {
      byUrl[url].diagnostics.imageSize = Math.max(byUrl[url].diagnostics.imageSize || 0, raw || 0);
    } else if (m === 'js_body_size_in_bytes' || m === 'js_size_in_bytes') {
      byUrl[url].diagnostics.jsSize = Math.max(byUrl[url].diagnostics.jsSize || 0, raw || 0);
    } else if (m === 'font_body_size_in_bytes' || m === 'font_size_in_bytes') {
      byUrl[url].diagnostics.fontSize = Math.max(byUrl[url].diagnostics.fontSize || 0, raw || 0);
    } else if (m === 'third_party_count') {
      byUrl[url].diagnostics.thirdPartyCount = raw;
    } else if (m === 'third_party_main_thread_duration') {
      byUrl[url].diagnostics.thirdPartyMainThread = raw;
    }
  }

  // Convert to Calibre metrics map shape with diagnostics
  const outMetrics = {};
  const outDiagnostics = {};
  for (const [url, data] of Object.entries(byUrl)) {
    outMetrics[url] = data.metrics;
    outDiagnostics[url] = data.diagnostics;
  }
  return { metrics: outMetrics, diagnostics: outDiagnostics };
}

async function main() {
  const shopify = loadJson(path.join(OUT_DIR, 'shopify-metrics.json')) || { LCP: {}, CLS: {}, INP: {} };
  const calibreRaw = loadJson(path.join(OUT_DIR, 'calibre-metrics.json')) || {};
  let calibre = calibreRaw.metrics || calibreRaw || {};
  let diagnostics = calibreRaw.diagnostics || {};
  
  if (!calibre || (Object.keys(calibre).length === 0)) {
    const ts = loadJson(path.join(OUT_DIR, 'calibre-timeseries.json'));
    if (ts) {
      const tsData = buildCalibreFromTimeseries(ts);
      calibre = tsData.metrics || {};
      diagnostics = tsData.diagnostics || {};
    }
  }
  
  // Load Lighthouse audits for element-level diagnostics
  const lighthouseRaw = loadJson(path.join(OUT_DIR, 'calibre-lighthouse.json')) || {};
  const lighthouseAudits = lighthouseRaw.audits || {};
  
  // Load Google PSI data for critical pages
  const psiRaw = loadJson(path.join(OUT_DIR, 'google-psi.json')) || {};
  const psiResults = psiRaw.results || {};

  const urls = new Set([
    ...Object.keys(shopify.LCP || {}),
    ...Object.keys(shopify.CLS || {}),
    ...Object.keys(shopify.INP || {}),
    ...Object.keys(calibre || {})
  ].map(normalizeUrl).filter(u => !isAffiliatePath(u)));

  const merged = [];
  const segments = {};
  for (const u of urls) {
    const sLCP = shopify.LCP[u]?.value ?? null;
    const sCLS = shopify.CLS[u]?.value ?? null;
    const sINP = shopify.INP[u]?.value ?? null;
    const loads = shopify.LCP[u]?.loads || shopify.CLS[u]?.loads || shopify.INP[u]?.loads || 0;

    const c = calibre[u] || {};
    const cLCP = c.LCP ?? null;
    const cCLS = c.CLS ?? null;
    const cINP = c.INP ?? null;

    const LCPv = cLCP ?? sLCP ?? null;
    const CLSv = cCLS ?? sCLS ?? null;
    const INPv = cINP ?? sINP ?? null;

    const row = {
      url: u,
      LCP: { value: LCPv, source: cLCP != null ? 'Calibre' : (sLCP != null ? 'Shopify' : 'n/a'), score: score('LCP', LCPv), shopify: sLCP, calibre: cLCP, discrepancy: discrepancy(sLCP, cLCP, 'LCP') },
      CLS: { value: CLSv, source: cCLS != null ? 'Calibre' : (sCLS != null ? 'Shopify' : 'n/a'), score: score('CLS', CLSv), shopify: sCLS, calibre: cCLS, discrepancy: discrepancy(sCLS, cCLS, 'CLS') },
      INP: { value: INPv, source: cINP != null ? 'Calibre' : (sINP != null ? 'Shopify' : 'n/a'), score: score('INP', INPv), shopify: sINP, calibre: cINP, discrepancy: discrepancy(sINP, cINP, 'INP') }
    };
    // Merge element diagnostics from Calibre and PSI (PSI takes precedence)
    const calibreElements = lighthouseAudits[u] || {};
    const psiData = psiResults[u];
    const elements = psiData?.elements || calibreElements;
    
    const remediationResult = remediation({ ...row, pageLoads: loads }, diagnostics[u] || {}, elements);
    row.recommendations = remediationResult.actions;
    row.urgency = remediationResult.urgency;
    row.segment = segmentFor(u);
    row.loads = loads;
    
    // Add PSI data and CrUX link if available
    if (psiData) {
      row.psi = {
        performanceScore: psiData.performanceScore,
        fetchTime: psiData.fetchTime,
        metrics: psiData.metrics
      };
      row.cruxUrl = psiData.cruxUrl || null;
    } else {
      // Generate CrUX link for all pages (works even without PSI data)
      try {
        const urlObj = new URL(u);
        row.cruxUrl = `https://pagespeed.web.dev/report?url=${encodeURIComponent(u)}`;
      } catch {
        row.cruxUrl = null;
      }
    }
    row.confidence = {
      LCP: confidence(sLCP, cLCP, 'LCP'),
      CLS: confidence(sCLS, cCLS, 'CLS'),
      INP: confidence(sINP, cINP, 'INP')
    };
    merged.push(row);

    const seg = segments[row.segment] || (segments[row.segment] = { 
      urls: 0, 
      loads: 0, 
      LCP: [], 
      CLS: [], 
      INP: [],
      issues: { total: 0, critical: 0, high: 0, medium: 0 }
    });
    seg.urls += 1;
    seg.loads += (row.loads || 0);
    if (row.LCP.value != null) seg.LCP.push({ v: row.LCP.value, w: row.loads || 1, score: row.LCP.score });
    if (row.CLS.value != null) seg.CLS.push({ v: row.CLS.value, w: row.loads || 1, score: row.CLS.score });
    if (row.INP.value != null) seg.INP.push({ v: row.INP.value, w: row.loads || 1, score: row.INP.score });
    
    // Track issues per segment (from all pages, not just filtered)
    const hasIssues = (row.LCP.score !== 'good' && row.LCP.value != null) ||
                     (row.CLS.score !== 'good' && row.CLS.value != null) ||
                     (row.INP.score !== 'good' && row.INP.value != null);
    if (hasIssues) {
      seg.issues.total += 1;
      if (row.urgency === 'critical') seg.issues.critical += 1;
      else if (row.urgency === 'high') seg.issues.high += 1;
      else if (row.urgency === 'medium') seg.issues.medium += 1;
    }
  }

  // Filter out rows where all metrics are "good" (green)
  const filtered = merged.filter(row => {
    const allGood = 
      (row.LCP.score === 'good' || row.LCP.value == null) &&
      (row.CLS.score === 'good' || row.CLS.value == null) &&
      (row.INP.score === 'good' || row.INP.value == null);
    return !allGood;
  });
  
  // Calculate impact score: combines urgency severity with user impact (page loads)
  // Impact = urgency_weight * log(page_loads + 1) * 100
  // This ensures high-traffic pages rank higher, but doesn't let massive traffic completely overwhelm severity
  // Using log scale prevents super high traffic from completely dominating
  filtered.forEach(row => {
    const urgencyWeight = { critical: 3, high: 2, medium: 1 }[row.urgency] || 0;
    const loads = row.loads || 0;
    // Use log scale to prevent super high traffic from overwhelming everything
    // Add 1 to avoid log(0), multiply by 100 for readable scores
    const logLoads = Math.log10(loads + 1);
    row.impactScore = urgencyWeight * logLoads * 100;
  });

  // Sort by impact score (highest first), then by urgency as tiebreaker
  filtered.sort((a, b) => {
    const impactDiff = b.impactScore - a.impactScore;
    if (Math.abs(impactDiff) > 0.1) return impactDiff;
    
    // Tiebreaker: urgency, then LCP
    const urgencyOrder = { critical: 0, high: 1, medium: 2 };
    const aUrg = urgencyOrder[a.urgency] ?? 3;
    const bUrg = urgencyOrder[b.urgency] ?? 3;
    if (aUrg !== bUrg) return aUrg - bUrg;
    return (b.LCP.value ?? 0) - (a.LCP.value ?? 0);
  });

  function weighted(arr, metric) {
    if (!arr.length) return null;
    const sumW = arr.reduce((s, x) => s + x.w, 0);
    const val = arr.reduce((s, x) => s + x.v * x.w, 0) / Math.max(1, sumW);
    // Calculate score based on weighted average value
    const calculatedScore = score(metric, val);
    // Also calculate distribution based on individual page scores
    const good = arr.filter(x => x.score === 'good').length / arr.length;
    const needs = arr.filter(x => x.score === 'needs-improvement').length / arr.length;
    const poor = arr.filter(x => x.score === 'poor').length / arr.length;
    return { value: val, score: calculatedScore, distribution: { good, needs, poor } };
  }

  const segmentList = Object.entries(segments).map(([name, s]) => ({
    name,
    urls: s.urls,
    loads: s.loads,
    issues: s.issues || { total: 0, critical: 0, high: 0, medium: 0 },
    LCP: weighted(s.LCP, 'LCP'),
    CLS: weighted(s.CLS, 'CLS'),
    INP: weighted(s.INP, 'INP')
  }));

  // Load device data if available
  const deviceData = loadJson(path.join(OUT_DIR, 'shopify-devices.json'));
  
  // Calculate summary stats
  const summary = {
    totalPages: merged.length,
    pagesWithIssues: filtered.length,
    pagesAllGood: merged.length - filtered.length,
    allGoodPercent: merged.length > 0 ? ((merged.length - filtered.length) / merged.length * 100).toFixed(1) : '0.0'
  };
  
  fs.writeFileSync(path.join(OUT_DIR, 'merged.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary,
    items: filtered,
    segments: segmentList,
    deviceData
  }, null, 2));
  console.log(`Wrote ${path.join(OUT_DIR, 'merged.json')} (${filtered.length} items with issues, ${merged.length - filtered.length} all-green items filtered out)`);
}

main().catch(err => { console.error(err); process.exit(1); });


