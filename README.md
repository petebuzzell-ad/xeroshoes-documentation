# XeroShoes Documentation Hub - AI Handoff Guide

## Repository Overview

This repository contains comprehensive technical documentation for the XeroShoes eCommerce platform, built using Arcadia Digital's proven documentation framework. It serves as both internal technical documentation and client-facing business resources.

**Repository Purpose:** Technical documentation hub for XeroShoes.com and XeroShoes.eu Shopify Plus instances
**Target Audience:** Developers, technical teams, business stakeholders, and future AI assistants
**Documentation Philosophy:** Business-first approach with technical depth, designed for client ownership

## Repository Structure & File Organization

```
xeroshoes-documentation/
├── index.html                              # Main documentation hub (entry point)
├── arcadia-style.css                       # Arcadia branding stylesheet
├── enhanced-toc.js                         # Interactive table of contents
├── robots.txt                              # SEO configuration
├── .nojekyll                               # Disables Jekyll processing for GitHub Pages
│
├── xeroshoes-platform-documentation.html   # Comprehensive platform documentation
├── xeroshoes-integrations-documentation.html # Complete integrations documentation  
├── theme-architecture.html                 # Technical theme architecture & code
├── codebase-comparison-analysis.md         # US vs EU codebase analysis
│
├── templates/                              # Reusable HTML components
│   ├── header.html                         # Site header with navigation
│   └── footer.html                         # Site footer with metadata
│
├── assets/                                 # Static assets
│   ├── Green_Arcadia Digital.png          # Arcadia Digital logo
│   ├── XEROSHOES_Logo.svg                 # XeroShoes logo
│   └── favicon.png                         # Site favicon
│
├── code/                                   # Shopify theme exports
│   ├── theme_export__xeroshoes-com-xero-shoes-production__20OCT2025-0858am/
│   │   └── [Complete US theme export - 435 files]
│   └── theme_export__shopxeroshoes-eu-myshopify-com-xero-shoes-eu-main__21OCT2025-0627pm/
│       └── [Complete EU theme export - 435 files]
│
├── data/                                   # Data exports and configuration
│   ├── AD-EVERYTHING-Export_2025-10-20_085832/
│   │   ├── Export Summary.csv             # Data export summary
│   │   ├── Products.csv                   # Product data with metafields
│   │   └── [Additional CSV exports]
│   └── apps-list.txt                      # List of 36 installed Shopify apps
│
└── process/                                # Development process (local only, not tracked)
    ├── PROCESS.md                          # Arcadia documentation methodology
    ├── QUICK_START.md                      # Setup and workflow guide
    └── prompts/                            # AI prompts for discovery and documentation
        ├── 01-discovery.md                 # Technical analysis prompts
        └── 02-documentation.md             # Content creation prompts
```

## Key Documentation Files

### Primary Documentation
- **`index.html`** - Main hub with navigation to all documentation
- **`xeroshoes-platform-documentation.html`** - Comprehensive platform overview, architecture, content management, product management, and operations
- **`xeroshoes-integrations-documentation.html`** - Complete documentation of all 36 installed apps and integrations
- **`theme-architecture.html`** - Technical implementation details, code examples, and Liquid template documentation

### Supporting Files
- **`codebase-comparison-analysis.md`** - Detailed comparison between US and EU codebases
- **`templates/header.html`** - Reusable header component with navigation
- **`templates/footer.html`** - Reusable footer component with metadata

## Technical Architecture

### Platform Overview
- **Dual-Instance Architecture:** Separate Shopify Plus instances for US (xeroshoes.com) and EU (xeroshoes.eu)
- **Theme:** Fluid Framework v3.0.0 (Praella Agency) with extensive customizations
- **Apps:** 36 installed apps with varying levels of theme integration
- **Custom Metafields:** Extensive metafield system including `custom.draft_variant` for variant visibility control

### Key Technical Components
- **Custom Sections:** 78+ custom Liquid sections for content management
- **JavaScript Modules:** Custom functionality for variant selection, cart management, search
- **CSS Framework:** Arcadia-branded styling with responsive design
- **Metafield System:** Custom product data structure with activity filtering, color management, and variant control

## Documentation Content Strategy

### Business-First Approach
- **Executive Summary:** High-level platform overview and capabilities
- **Platform Architecture:** Technical architecture without code details
- **Content Management:** User-friendly guides for non-technical users
- **Product Management:** Business workflows and data standards
- **Integrations:** App inventory and business value

### Technical Depth
- **Theme Architecture:** Complete code examples and implementation details
- **Custom Implementations:** Specific XeroShoes customizations and their technical implementation
- **Code References:** All technical details consolidated in `theme-architecture.html`

### Data-Driven Documentation
- **US Instance:** Complete documentation based on theme export and data exports
- **EU Instance:** Limited documentation based on pre-launch theme export (to be updated post-launch)
- **App Integration:** Evidence-based documentation showing actual theme integration

## Working with This Repository

### For AI Assistants
1. **Start with `index.html`** - Contains navigation and overview of all documentation
2. **Read `xeroshoes-platform-documentation.html`** - Comprehensive business and technical overview
3. **Reference `theme-architecture.html`** - For all code examples and technical implementation details
4. **Check `codebase-comparison-analysis.md`** - For understanding US vs EU differences
5. **Use `code/` directory** - For analyzing actual theme files and implementations

### For Developers
1. **Theme Analysis:** Use files in `code/` directory for understanding actual implementation
2. **Code Examples:** All technical code is in `theme-architecture.html`
3. **Integration Details:** See `xeroshoes-integrations-documentation.html` for app-specific implementations
4. **Custom Metafields:** Detailed documentation of `custom.draft_variant` and other metafields

### For Business Users
1. **Platform Overview:** Start with `xeroshoes-platform-documentation.html`
2. **Content Management:** Use content management sections for day-to-day operations
3. **Product Management:** Reference product management workflows and data standards
4. **External Resources:** Use links to official Shopify documentation

## Content Maintenance Guidelines

### When Updating Documentation
1. **Keep Business Context Minimal** - Focus on technical and operational information
2. **Update EU Analysis Post-Launch** - Complete EU integration analysis when site goes live
3. **Maintain Code Separation** - Keep all code examples in `theme-architecture.html`
4. **Preserve Data Accuracy** - Base documentation on actual codebase analysis, not assumptions
5. **Update Timestamps** - Change "Last Updated" dates when making changes

### File-Specific Guidelines
- **`xeroshoes-platform-documentation.html`** - High-level business and technical overview
- **`xeroshoes-integrations-documentation.html`** - App inventory and integration details
- **`theme-architecture.html`** - All technical implementation and code examples
- **`index.html`** - Navigation hub, keep links current

## Data Sources & Evidence

### Primary Sources
- **US Theme Export:** Complete Shopify theme export from October 20, 2025
- **EU Theme Export:** Complete Shopify theme export from October 21, 2025 (pre-launch)
- **Data Exports:** Product data, collections, pages, blog posts, redirects, metaobjects
- **Apps List:** 36 installed Shopify apps with theme integration evidence

### Evidence-Based Documentation
- **App Integrations:** Only documented apps with actual theme integration evidence
- **Custom Implementations:** Based on actual code analysis, not assumptions
- **EU Documentation:** Clearly marked as pre-launch analysis, to be updated post-launch

## Security & Sensitive Data

### What's Included
- **Theme Code:** Complete Liquid templates, CSS, and JavaScript
- **Configuration:** Theme settings and app configurations
- **Data Structure:** Product metafields and content organization
- **Integration Details:** App-specific implementations and customizations

### What's NOT Included
- **API Keys:** No sensitive credentials or API keys
- **Customer Data:** No personal information or customer details
- **Financial Data:** No revenue or pricing information
- **Internal Business Logic:** No proprietary business strategies

## Future Enhancements

### Planned Updates
1. **Post-Launch EU Analysis** - Complete integration analysis when EU site launches
2. **GTM Integration** - Add Google Tag Manager and custom events documentation
3. **Shopify Custom Events** - Document custom event tracking and data layer
4. **Performance Monitoring** - Add site performance and optimization documentation

### Integration Opportunities
- **Google Tag Manager Exports** - For comprehensive tracking documentation
- **Shopify Custom Events** - For advanced analytics and conversion tracking
- **Additional Data Exports** - For more comprehensive platform analysis

## Repository Management

### Git Workflow
- **Main Branch:** Production documentation
- **Local Development:** Use `process/` directory for development (not tracked)
- **GitHub Pages:** Automatic deployment from main branch
- **File Organization:** Keep documentation files in root directory for GitHub Pages

### Maintenance
- **Regular Updates:** Update documentation when platform changes
- **Version Control:** Track all changes with descriptive commit messages
- **Backup:** Repository serves as backup of all documentation and code
- **Client Handoff:** Designed for eventual client ownership and maintenance

## Contact & Support

**Repository Owner:** Pete Buzzell (Arcadia Digital)
**Repository URL:** https://github.com/petebuzzell-ad/xeroshoes-documentation
**Documentation Philosophy:** Arcadia Digital's proven documentation framework
**Last Updated:** October 2025

---

*This README serves as a comprehensive handoff document for AI assistants, developers, and business users working with the XeroShoes documentation repository.*