/**
 * Cart Upsell Component
 * 
 * This component handles cart upsell functionality by:
 * - Listening to cart update events
 * - Updating upsell block HTML based on cart changes
 */

class CartUpsell extends HTMLElement {
  constructor() {
    super();
    
    this.upsellContainer = this.querySelector('[data-cart-upsell]');
    this.isUpdating = false;
    
    this.init();
  }

  /**
   * Initialize the component
   */
  init() {
    if (!this.upsellContainer) return;
    
    // Subscribe to cart update events
    this.unsubscribeCartUpdate = eventBus.subscribe(PUB_SUB_EVENTS.cartUpdate, this.handleCartUpdate.bind(this));
    this.unsubscribeProductATC = eventBus.subscribe(PUB_SUB_EVENTS.productATC, this.handleProductATC.bind(this));
  }

  /**
   * Handle cart update events
   * @param {Object} eventData - Cart update event data
   */
  handleCartUpdate(eventData) {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    try {
      const { action, item, sections } = eventData.data;
      
      // Update upsell block HTML if needed
      if(action == 'remove-item') this.updateUpsellHTML(sections[this.dataset.sectionId]);
    } catch (error) {
      console.error('Error handling in upsell component:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Handle product add to cart events
   * @param {Object} eventData - Product add to cart event data
   */
  handleProductATC(eventData) {
    if (this.isUpdating) return;
    
    this.isUpdating = true;

    try {
        const { item, sections } = eventData.data;

        // Update upsell block HTML if needed
        this.updateUpsellHTML(sections[this.dataset.sectionId]);
      } catch (error) {
        console.error('Error handling in upsell component:', error);
      } finally {
        this.isUpdating = false;
      }
  }

  /**
   * Update upsell HTML with new content
   * @param {string} newHTML - New HTML content
   */
  updateUpsellHTML(newHTML) {
    if (!newHTML || !this.upsellContainer) return;
    
    const parser = new DOMParser();
    const parsedHTML = parser.parseFromString(newHTML, 'text/html');
    
    // Find the upsell container in the new HTML
    const newUpsellContainer = parsedHTML.querySelector('[data-cart-upsell]');
    if (!newUpsellContainer) return;

    // Update the container content
    this.classList.remove('d-none');
    this.upsellContainer.innerHTML = newUpsellContainer.innerHTML;
    
    lazyImageObserver.observe();
    if (typeof positionArrowsAtHalfMediaHeight === 'function') {
      setTimeout(positionArrowsAtHalfMediaHeight, 250);
    }
  }

  /**
   * Clean up event listeners
   */
  disconnectedCallback() {
    if (this.unsubscribeCartUpdate) {
      this.unsubscribeCartUpdate();
      this.unsubscribeProductATC();
    }
  }
}

// Register the custom element
customElements.define('cart-upsell', CartUpsell);
