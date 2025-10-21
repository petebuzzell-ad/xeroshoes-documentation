/**
 * Enhanced Table of Contents with Scroll Highlighting
 * 
 * A portable JavaScript solution that adds scroll-based highlighting
 * to any table of contents on a documentation site.
 * 
 * Features:
 * - Scroll-based highlighting of current section
 * - Smooth scrolling navigation
 * - Intersection Observer API for performance
 * - Responsive design support
 * - Easy integration
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Add CSS classes: .toc-sidebar, .toc-sidebar a
 * 3. Ensure sections have IDs that match TOC links
 * 
 * @author Arcadia Digital
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuration options
    const CONFIG = {
        // CSS class names
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

    // CSS styles to inject
    const TOC_STYLES = `
        .toc-sidebar a.active {
            color: var(--forest-green, #2d5016);
            font-weight: 600;
            background-color: var(--sage-green, #a8c09a);
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
        
        .toc-sidebar a {
            transition: color 0.3s ease;
        }
    `;

    /**
     * Initialize the enhanced TOC functionality
     */
    function initEnhancedTOC() {
        // Inject CSS styles
        injectStyles();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupTOC);
        } else {
            setupTOC();
        }
    }

    /**
     * Inject CSS styles into the document
     */
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = TOC_STYLES;
        document.head.appendChild(style);
    }

    /**
     * Setup the TOC functionality
     */
    function setupTOC() {
        const tocLinks = document.querySelectorAll(CONFIG.tocLink);
        const sections = document.querySelectorAll(CONFIG.section);
        
        if (tocLinks.length === 0 || sections.length === 0) {
            console.warn('Enhanced TOC: No TOC links or sections found');
            return;
        }

        // Setup smooth scrolling
        setupSmoothScrolling(tocLinks);
        
        // Setup scroll highlighting
        setupScrollHighlighting(tocLinks, sections);
        
        // Highlight initial section
        highlightInitialSection(tocLinks, sections);
    }

    /**
     * Setup smooth scrolling for TOC links
     */
    function setupSmoothScrolling(tocLinks) {
        tocLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: CONFIG.scrollBehavior,
                        block: CONFIG.scrollBlock
                    });
                }
            });
        });
    }

    /**
     * Setup scroll-based highlighting using Intersection Observer
     */
    function setupScrollHighlighting(tocLinks, sections) {
        const observerOptions = {
            root: null,
            rootMargin: CONFIG.rootMargin,
            threshold: CONFIG.threshold
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    const tocLink = document.querySelector(`${CONFIG.tocLink}[href="#${id}"]`);
                    
                    // Remove active class from all TOC links
                    tocLinks.forEach(link => link.classList.remove('active'));
                    
                    // Add active class to current TOC link
                    if (tocLink) {
                        tocLink.classList.add('active');
                    }
                }
            });
        }, observerOptions);

        // Observe all sections
        sections.forEach(section => {
            observer.observe(section);
        });
    }

    /**
     * Highlight the first visible section on page load
     */
    function highlightInitialSection(tocLinks, sections) {
        const firstSection = sections[0];
        if (firstSection) {
            const firstTocLink = document.querySelector(`${CONFIG.tocLink}[href="#${firstSection.id}"]`);
            if (firstTocLink) {
                firstTocLink.classList.add('active');
            }
        }
    }

    /**
     * Public API for manual control
     */
    window.EnhancedTOC = {
        // Manually highlight a specific section
        highlightSection: function(sectionId) {
            const tocLinks = document.querySelectorAll(CONFIG.tocLink);
            const targetLink = document.querySelector(`${CONFIG.tocLink}[href="#${sectionId}"]`);
            
            if (targetLink) {
                tocLinks.forEach(link => link.classList.remove('active'));
                targetLink.classList.add('active');
            }
        },
        
        // Remove all highlighting
        clearHighlighting: function() {
            const tocLinks = document.querySelectorAll(CONFIG.tocLink);
            tocLinks.forEach(link => link.classList.remove('active'));
        },
        
        // Reinitialize (useful for dynamic content)
        reinit: function() {
            setupTOC();
        }
    };

    // Auto-initialize
    initEnhancedTOC();

})();
