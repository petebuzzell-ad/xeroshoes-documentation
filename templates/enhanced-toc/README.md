# Enhanced Table of Contents

A portable JavaScript solution that adds scroll-based highlighting and smooth navigation to any table of contents on a documentation site.

## ✨ Features

- **Scroll-based highlighting**: Automatically highlights the current section as users scroll
- **Smooth scrolling**: Clicking TOC links smoothly scrolls to target sections
- **Performance optimized**: Uses Intersection Observer API for efficient scroll detection
- **Responsive design**: Works across all device sizes
- **Easy integration**: Drop-in solution with minimal setup required
- **Customizable**: CSS variables and configuration options for easy theming

## 🚀 Quick Start

### 1. Include the Script

Add the enhanced TOC script to your HTML:

```html
<script src="enhanced-toc.js"></script>
```

### 2. HTML Structure

Ensure your HTML follows this structure:

```html
<nav class="toc-sidebar">
    <h3>Table of Contents</h3>
    <ul>
        <li><a href="#section1">Section 1</a></li>
        <li><a href="#section2">Section 2</a>
            <ul>
                <li><a href="#subsection2a">Subsection 2A</a></li>
                <li><a href="#subsection2b">Subsection 2B</a></li>
            </ul>
        </li>
    </ul>
</nav>

<main>
    <section id="section1">...</section>
    <section id="section2">...</section>
    <section id="subsection2a">...</section>
    <section id="subsection2b">...</section>
</main>
```

### 3. Basic CSS

Add these CSS classes to your stylesheet:

```css
.toc-sidebar {
    position: sticky;
    top: 20px;
    /* Your existing TOC styles */
}

.toc-sidebar a {
    /* Your existing link styles */
    transition: color 0.3s ease;
}
```

## 🎨 Styling

The enhanced TOC automatically injects styles for the active state. You can customize the appearance using CSS variables:

```css
:root {
    --forest-green: #2d5016;  /* Active text color */
    --sage-green: #a8c09a;    /* Active background color */
}

.toc-sidebar a.active {
    color: var(--forest-green);
    font-weight: 600;
    background-color: var(--sage-green);
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    margin: 0.25rem -0.75rem;
    transition: all 0.3s ease;
}

.toc-sidebar a.active::before {
    content: "▶";
    margin-right: 0.5rem;
    font-size: 0.8rem;
}
```

## ⚙️ Configuration

The script uses a configuration object that can be modified if needed:

```javascript
const CONFIG = {
    // CSS selectors
    tocContainer: '.toc-sidebar',
    tocLink: '.toc-sidebar a[href^="#"]',
    section: 'section[id]',
    
    // Intersection Observer settings
    rootMargin: '-20% 0px -70% 0px', // Trigger when section is 20% from top
    threshold: 0,
    
    // Smooth scroll behavior
    scrollBehavior: 'smooth',
    scrollBlock: 'start'
};
```

## 🔧 API Reference

The enhanced TOC provides a public API for manual control:

### `EnhancedTOC.highlightSection(sectionId)`

Manually highlight a specific section:

```javascript
EnhancedTOC.highlightSection('introduction');
```

### `EnhancedTOC.clearHighlighting()`

Remove all highlighting:

```javascript
EnhancedTOC.clearHighlighting();
```

### `EnhancedTOC.reinit()`

Reinitialize the TOC (useful for dynamic content):

```javascript
EnhancedTOC.reinit();
```

## 📱 Responsive Design

The enhanced TOC works seamlessly across all device sizes. For mobile devices, consider adjusting the TOC positioning:

```css
@media (max-width: 768px) {
    .toc-sidebar {
        position: relative;
        top: 0;
    }
}
```

## 🌐 Browser Support

- **Chrome**: 51+
- **Firefox**: 55+
- **Safari**: 12.1+
- **Edge**: 79+

The TOC gracefully degrades in older browsers, falling back to standard anchor link behavior.

## 📋 Requirements

- Sections must have `id` attributes that match TOC link `href` values
- TOC links must use `href="#section-id"` format
- Modern browser with Intersection Observer API support

## 🎯 Use Cases

Perfect for:
- Documentation sites
- Long-form articles
- Technical guides
- API documentation
- Tutorial websites
- Knowledge bases

## 🔄 Migration from Basic TOC

If you have an existing TOC, migration is simple:

1. Add the script to your HTML
2. Ensure your sections have proper `id` attributes
3. Add the required CSS classes
4. Customize the styling to match your design

## 🐛 Troubleshooting

### TOC not highlighting
- Ensure sections have `id` attributes
- Check that TOC links use `href="#id"` format
- Verify the script is loaded after the DOM

### Smooth scrolling not working
- Check browser support for `scrollIntoView`
- Ensure target elements exist in the DOM

### Performance issues
- The script uses Intersection Observer for optimal performance
- If you have many sections, consider pagination

## 📄 License

This enhanced TOC solution is provided as-is for use in documentation projects. Feel free to modify and adapt to your needs.

## 🤝 Contributing

To improve this solution:
1. Test across different browsers and devices
2. Optimize for performance with large documents
3. Add accessibility enhancements
4. Improve mobile experience

---

*Created by Arcadia Digital for modern documentation experiences*
