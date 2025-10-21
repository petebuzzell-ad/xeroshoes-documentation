# XeroShoes Documentation Hub

A comprehensive technical documentation system for XeroShoes eCommerce platform, built using Arcadia Digital's proven documentation framework.

## Overview

This documentation hub provides both internal technical documentation for developers and client-facing resources for business users managing the XeroShoes.com and XeroShoes.eu platforms.

## Project Structure

```
xeroshoes-documentation/
├── code/                           # Shopify theme exports and code
│   └── theme_export__xeroshoes-com-xero-shoes-production__20OCT2025-0858am/
├── data/                           # Data exports and analytics
├── docs/                          # HTML documentation output
│   ├── index.html                 # Main documentation hub
│   ├── arcadia-style.css          # Arcadia branding stylesheet
│   ├── main-platform.html         # Core platform documentation
│   ├── theme-architecture.html    # Theme customization docs
│   ├── integrations.html         # Third-party integrations
│   ├── operational-procedures.html # Runbooks and procedures
│   ├── platform-overview.html    # Client-facing overview
│   ├── content-management-guide.html # Business user guide
│   └── analytics-reporting.html  # Analytics documentation
├── process/                       # Documentation process framework
│   ├── PROCESS.md                # Arcadia documentation methodology
│   ├── QUICK_START.md            # Setup and workflow guide
│   └── prompts/                  # AI prompts for discovery and documentation
│       ├── 01-discovery.md       # Technical analysis prompts
│       └── 02-documentation.md    # Content creation prompts
├── templates/                     # Reusable HTML templates
│   └── html-template.html        # Base template for new docs
└── README.md                      # This file
```

## Documentation Philosophy

### Hybrid Approach
- **Internal Documentation**: Technical depth for XeroShoes development team
- **Client-Facing Resources**: Business-focused guides for stakeholders
- **Progressive Disclosure**: Start high-level, drill down to technical details

### Arcadia Standards
- **Visual Design**: Professional Arcadia branding with forest green palette
- **Typography**: Piazzolla (headings) and Figtree (body) fonts
- **Content Strategy**: Business-first approach with technical accuracy
- **Client Handoff**: Designed for eventual client ownership and maintenance

## Getting Started

### For Developers
1. Start with `docs/index.html` for navigation
2. Review `process/PROCESS.md` for methodology
3. Use `process/prompts/` for systematic documentation creation
4. Reference `code/` directory for technical analysis

### For Business Users
1. Begin with "Client-Facing Resources" section in `docs/index.html`
2. Focus on `platform-overview.html` and `content-management-guide.html`
3. Use "External Resources" for Shopify admin help

## Documentation Workflow

### Phase 1: Discovery & Analysis
- Use prompts from `process/prompts/01-discovery.md`
- Analyze technical landscape using Shopify theme exports
- Identify user needs and pain points
- Map out system architecture and integrations

### Phase 2: Documentation Creation
- Use prompts from `process/prompts/02-documentation.md`
- Create comprehensive technical documentation
- Develop business-focused user guides
- Document operational procedures and runbooks

### Phase 3: Design & Presentation
- Apply Arcadia branding with `arcadia-style.css`
- Ensure professional visual presentation
- Test responsive design and accessibility
- Validate with actual users

### Phase 4: Client Handoff
- Prepare for client ownership
- Document maintenance procedures
- Transfer repository control
- Provide ongoing support process

## Key Features

### Technical Documentation
- **Platform Architecture**: Shopify Plus multi-site setup
- **Theme Customization**: Dawn theme modifications and Liquid templates
- **Integration Management**: Third-party services and APIs
- **Operational Procedures**: Maintenance, troubleshooting, and emergency protocols

### Business Resources
- **Platform Overview**: Capabilities and business value
- **Content Management**: User-friendly guides for non-technical users
- **Analytics & Reporting**: Performance metrics and business intelligence
- **External Resources**: Links to official Shopify documentation

## Technology Stack

- **Platform**: Shopify Plus
- **Sites**: XeroShoes.com (US) and XeroShoes.eu (EU)
- **Theme**: Dawn with custom modifications
- **Documentation**: HTML-based (not Jekyll) for easier maintenance
- **Styling**: Custom CSS with Arcadia branding
- **Fonts**: Piazzolla (headings) and Figtree (body)

## Maintenance

### Content Updates
- Edit HTML files directly in `docs/` directory
- Maintain consistent styling with `arcadia-style.css`
- Update "Last Updated" dates in footer
- Test responsive design after changes

### Process Improvements
- Review `process/` directory for methodology updates
- Use case studies for reference and improvement
- Iterate based on user feedback
- Document lessons learned

## GitHub Repository

This documentation is hosted on GitHub: [https://github.com/petebuzzell-ad/xeroshoes-documentation](https://github.com/petebuzzell-ad/xeroshoes-documentation)

### Repository Structure
- `docs/` - Live documentation (GitHub Pages ready)
- `code/` - Shopify theme exports and code
- `data/` - Data exports and analytics
- `process/` - Documentation methodology
- `templates/` - Reusable components
- `assets/` - Images, logos, and media files

## Support

For questions about this documentation system:
- **Email**: support@arcadiadigital.com
- **Process Questions**: Review `process/PROCESS.md`
- **Technical Issues**: Check `process/prompts/` for systematic approaches
- **GitHub Issues**: Use the repository's issue tracker for bugs and feature requests

## About Arcadia Digital

This documentation system is built using Arcadia Digital's proven framework, extracted from successful client engagements including Winzer and Superfeet. The methodology emphasizes:

- **Business-first content strategy**
- **Professional visual presentation**
- **Systematic documentation process**
- **Client handoff preparation**

---

*Last Updated: January 2025 | Arcadia Digital*
