# Performance Analysis Tools

Tools to merge Shopify Core Web Vitals data with Calibre performance metrics and generate actionable HTML reports.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API keys:**
   ```bash
   cp config.example.json config.json
   ```
   
   Then edit `config.json` and add your actual API keys:
   - Calibre API token
   - Google PageSpeed Insights API key (optional, for future features)
   - Calibre site slug/ID

   > **Note:** `config.json` is gitignored and will not be committed. Only `config.example.json` is tracked in the repository.

3. **Run the analysis:**
   ```bash
   npm run all
   ```

   This will:
   - Parse Shopify Core Web Vitals data
   - Fetch Calibre TimeSeries metrics
   - Fetch Calibre point-in-time metrics
   - Fetch Lighthouse audits (when available)
   - Merge all data sources
   - Generate `performance-analysis.html`

## Configuration

### config.json Structure

```json
{
  "calibre": {
    "token": "your-calibre-api-token",
    "site": "your-site-slug",
    "siteId": null,
    "pageUuids": ""
  },
  "googlePagespeed": {
    "apiKey": "your-google-pagespeed-api-key"
  },
  "settings": {
    "timeseriesDays": 7,
    "snapshotCount": 10
  }
}
```

### Environment Variable Fallback

Scripts will fall back to environment variables if `config.json` is not found:
- `CALIBRE_TOKEN` or `CALIBRE_API_TOKEN`
- `CALIBRE_SITE` or `CALIBRE_SITE_ID`
- `GOOGLE_PAGESPEED_API_KEY`

## Scripts

- `npm run all` - Run the complete pipeline
- `npm run parse:shopify` - Parse Shopify CWV JSONL files
- `npm run fetch:calibre` - Fetch Calibre point-in-time metrics
- `npm run timeseries` - Fetch Calibre TimeSeries data
- `npm run merge` - Merge Shopify and Calibre data
- `npm run report` - Generate HTML report
- `npm run sites` - List available Calibre sites
- `npm run snapshots` - List Calibre snapshots

## Output

- `data/performance/out/merged.json` - Merged performance data
- `performance-analysis.html` - Interactive HTML report with filtering and sorting

