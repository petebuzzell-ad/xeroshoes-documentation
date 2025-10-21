// Sticky Header

class StickyHeader extends HTMLElement {
  constructor() {
    super();
  }

  /**
   * Calls when Component is Initialized in DOM
   *
   */
  connectedCallback() {
    this.header = document.querySelector('.section-header');
    this.headerIsAlwaysSticky = this.getAttribute('data-sticky-type') === 'always';
    this.headerBounds = {};
    this.currentScrollTop = 0;

    this.onScrollHandler = this.onScroll.bind(this);
    
    if (this.headerIsAlwaysSticky) {
      this.header.classList.add('header-sticky');
    };

    window.addEventListener('scroll', this.onScrollHandler, false);

    this.createObserver();
  }

  /**
   * Calls when Component is removed from DOM
   *
   */
  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScrollHandler);
  }

  /**
   * To observe Sticky header visibility on User Scroll
   *
   */
  createObserver() {
    let observer = new IntersectionObserver((entries, observer) => {
      this.headerBounds = entries[0].intersectionRect;
      observer.disconnect();
    });

    observer.observe(this.header);
  }

  /**
   * Window Scroll event
   *
   */
  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
      requestAnimationFrame(this.hide.bind(this));
    } else if (scrollTop < this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
      requestAnimationFrame(this.reveal.bind(this));
    } else if (scrollTop <= this.headerBounds.top) {
      requestAnimationFrame(this.reset.bind(this));
    }

    this.currentScrollTop = scrollTop;
  }

  /**
   * Hide Sticky header
   * Close Menu Drawer / Cart Drawer
   *
   */
  hide() {
    if (!this.headerIsAlwaysSticky){
      this.header.classList.add('header-hidden', 'header-sticky');
    }    
  }

  /**
   * Show Sticky Header
   *
   */
  reveal() {
    if (!this.headerIsAlwaysSticky) {
      this.header.classList.add('header-sticky', 'animate');
      this.header.classList.remove('header-hidden');
    }
  }

  reset() {
    if (this.headerIsAlwaysSticky) return;
    this.header.classList.remove('header-hidden', 'header-sticky', 'animate');
  }
}
customElements.define('sticky-header', StickyHeader);