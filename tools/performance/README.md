# Performance Analysis Tools

Tools to merge Shopify Core Web Vitals data with Calibre synthetic monitoring metrics and generate an actionable HTML performance report.

## Setup

### Local Development

1. **Install dependencies:**
   ```bash
   cd tools/performance
   npm install
   ```

2. **Configure API keys:**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your API keys
   ```

3. **Ensure Shopify data is in place:**
   - Place Shopify JSONL exports in `data/performance/`
   - Required files:
     - `Largest Contentful Paint (LCP)_ Page URL - *.jsonl`
     - `Cumulative Layout Shift (CLS)_ Page URL - *.jsonl`
     - `Interaction to Next Paint (INP)_ Page URL - *.jsonl`
     - `Largest Contentful Paint (LCP)_ Page Type - *.jsonl`
     - `Cumulative Layout Shift (CLS)_ Page Type - *.jsonl`
     - `Interaction to Next Paint (INP)_ Page Type - *.jsonl`
     - `Largest Contentful Paint (LCP)_ Over Time - *.jsonl`
     - `Cumulative Layout Shift (CLS)_ Over Time - *.jsonl`
     - `Interaction to Next Paint (INP)_ Over Time - *.jsonl`
     - `Sessions by device type - *.jsonl`

4. **Generate report:**
   ```bash
   npm run build
   ```

   Or run individual steps:
   ```bash
   npm run parse:shopify    # Parse Shopify JSONL files
   npm run timeseries      # Fetch Calibre TimeSeries data
   npm run fetch:calibre   # Fetch Calibre per-page metrics
   npm run merge           # Merge all data sources
   npm run report          # Generate HTML report
   ```

## GitHub Actions Automation

The report is automatically generated on:
- **Every push** to `main` (if performance tooling or data files change)
- **Daily at 2 AM UTC** (scheduled run)
- **Manual trigger** via GitHub Actions UI

### Required GitHub Secrets

Configure these in your repository settings (`Settings > Secrets and variables > Actions`):

1. **`CALIBRE_API_TOKEN`** (required)
   - Your Calibre API token with read access
   - Get it from: https://calibreapp.com/api-keys

2. **`GOOGLE_PSI_API_KEY`** (optional but recommended)
   - Google PageSpeed Insights API key
   - Get it from: https://developers.google.com/speed/docs/insights/v5/get-started
   - Used for critical page deep-dive analysis

3. **`CALIBRE_SITE_SLUG`** (optional)
   - Calibre site slug (defaults to `xeroshoes`)
   - Only needed if different from default

### Workflow Behavior

- The workflow automatically:
  1. Installs dependencies
  2. Creates `config.json` from GitHub secrets
  3. Runs the full build pipeline
  4. Commits the generated `performance-analysis.html` back to the repo
  5. Skips CI on the commit (`[skip ci]`) to avoid loops

- The workflow only commits if the report actually changed (checks git diff)

### Updating Shopify Data

When you export new Shopify Core Web Vitals data:

1. Place new JSONL files in `data/performance/`
2. Commit and push
3. The workflow will automatically regenerate the report

Or trigger manually:
1. Go to **Actions** tab in GitHub
2. Select **Generate Performance Report**
3. Click **Run workflow**

## Output

The generated `performance-analysis.html` includes:
- **Quick-link dashboard** with key stats
- **Segment rollups** (weighted averages by page type)
- **7-day performance trends** with distribution charts
- **Page-level details** with actionable remediation recommendations
- **Data source transparency** (footnotes, methodology)

## Troubleshooting

**Report not updating:**
- Check GitHub Actions logs for errors
- Verify API tokens are set correctly in GitHub Secrets
- Ensure Shopify data files are present in `data/performance/`

**Missing Calibre data:**
- Verify `CALIBRE_API_TOKEN` is valid
- Check that the site slug matches your Calibre site
- API rate limits may prevent full data fetch (check logs)

**Missing PSI data:**
- Verify `GOOGLE_PSI_API_KEY` is set (optional)
- PSI only runs for critical pages to conserve API quota
- Build will continue without PSI if fetch fails
