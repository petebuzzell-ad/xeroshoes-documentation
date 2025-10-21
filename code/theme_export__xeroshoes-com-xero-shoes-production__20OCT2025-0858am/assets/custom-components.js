/**
* Custom Select
*/
class CustomSelect extends HTMLElement {
  constructor() {
    super();

    this.toggleBtn = this.querySelector('[data-toggle="options"]');
    this.selectContainer = this.querySelector('[data-selectcontainer]');
    this.options = this.selectContainer.querySelectorAll('ul li');

    this.selectContainer.setAttribute('inert', '');
  }

  connectedCallback() {
    this.toggleBtn.addEventListener('click', this.manageVisibility.bind(this));
    this.bindEvents();
  }

  bindEvents(){
    this.options.forEach(option => {
      option.addEventListener('click', (evt) => {
        this.toggleOptions(evt);
      });
      
      option.addEventListener('keyup', (evt) => {
        if(evt.key === 'Enter'){
          evt.preventDefault();
          this.toggleOptions(evt);
        }
      });
    });

    this.addEventListener('keyup', (evt) => {
      if(evt.key === 'Enter'){
          evt.preventDefault();
          this.manageVisibility(evt);
          // evt.currentTarget.click();
      }
      if(evt.key === 'Escape' && this.classList.contains('open')){
        this.closeDropdown();
      }
    });

    document.body.addEventListener('click', () => {
      if(this.classList.contains('open')) this.closeDropdown();
    });

    this.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }

  /**
   * Toggle custom select option
   */
  toggleOptions(event) {
    const selectedOption = event.currentTarget;
    this.options.forEach(option => option.classList.remove('selected'));
    selectedOption.querySelector('label').click();
    selectedOption.classList.add('selected');

    this.toggleBtn.querySelector('.option_txt').textContent = selectedOption.querySelector('label').textContent;
    this.closeDropdown();
  }

  /**
   * Hide/Show of custom select option
   */
  manageVisibility(evt) {
    evt.preventDefault();
    const isOpen = this.classList.contains('open');
    (isOpen) ? this.closeDropdown() : this.openDropdown();
  }

   /**
   * Close the dropdown
   */
   openDropdown() {
    this.selectContainer.removeAttribute('inert');
    this.classList.add('open');
    this.toggleBtn.setAttribute('aria-expanded', 'true');

    Utility.toggleElement(this, 'open');
    const elementTofocus = this.selectContainer.querySelector('input[type="radio"]:checked')?.closest('li')
                          || this.selectContainer.querySelector('li');
    Utility.trapFocus(this.selectContainer, elementTofocus);
  }

  /**
   * Close the dropdown
   */
  closeDropdown() {
    this.selectContainer.setAttribute('inert', '');
    Utility.toggleElement(this, 'close');
    
    this.classList.remove('open');
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    Utility.removeTrapFocus(this.toggleBtn);
  }

  // Optional: Clean up event listeners when the element is removed from the DOM
  disconnectedCallback() {
    this.toggleBtn.removeEventListener('click', this.manageVisibility.bind(this));
    this.options.forEach(option => {
      option.removeEventListener('click', this.toggleOptions.bind(this));
    })
  }
}
customElements.define('custom-select', CustomSelect);

/**
* Tab HTML
*/
class customTabs extends HTMLElement {
    constructor() {
      super();
  
      this.tabLinks = this.querySelectorAll('[data-toggle="tab"]');
      this.tabContainers = this.querySelectorAll('[data-tabpanel]');
      this.shopLinks = this.querySelectorAll('.shop-link');
  
      this.tabLinks.forEach( button => button.addEventListener('click', this.toggleTabs.bind(this)));
      this.addEventListener('keyup', this.onKeyUp.bind(this)); // Bind the keyup event
    }
  
    /**
     * Escape Key Press to close drawer when focus is within the container
     */
    onKeyUp(event) {
      if (event.code && event.code.toUpperCase() === 'ESCAPE') {
        this.closeTabs();
      }
    }
  
    /**
     * Toggle Tabs on link click
     */
    toggleTabs(event){
      event.preventDefault();
      const tabContainer = this.querySelector(event.currentTarget.dataset.target);
      if(!tabContainer) return;

      this.resetCurrentTab();
      this.openTab(event.currentTarget, tabContainer);
      if (typeof checkAllScrollOverflows === 'function') {
        // Skip overflow indicator processing during tab changes to prevent flash
        checkAllScrollOverflows(true);
      }
      if (typeof positionArrowsAtHalfMediaHeight === 'function') {
        setTimeout(positionArrowsAtHalfMediaHeight, 250);
      }
    }
  
    /**
     * Open Tab Container
     *
     * @param {Node} tabTrigger Tab Container Open link
     * @param {Node} tabContainer Tab Container to open
     */
    openTab(tabTrigger, tabContainer) {
      tabTrigger.classList.add('active');
      tabTrigger.setAttribute('aria-selected', true);
      tabTrigger.setAttribute('aria-expanded', true);

      tabContainer.classList.add('open');
      tabContainer?.setAttribute('aria-hidden', false);

      // Handle shop links visibility
      this.updateShopLinksVisibility(tabTrigger);
    }

    /**
     * Close Tabs (optional implementation)
     */
    resetCurrentTab() {
      const activeTab = this.querySelector('[data-toggle="tab"].active');
      const tabContainer = this.querySelector('[data-tabpanel].open');

      tabContainer?.classList.remove('open');
      tabContainer?.setAttribute('aria-hidden', true);

      activeTab?.classList.remove('active');
      activeTab?.setAttribute('aria-selected', false);
      activeTab?.setAttribute('aria-expanded', false);
    }

    /**
     * Update shop links visibility based on active tab
     *
     * @param {Node} activeTabTrigger The currently active tab trigger
     */
    updateShopLinksVisibility(activeTabTrigger) {
      // Get the target ID from the active tab trigger
      const targetId = activeTabTrigger.getAttribute('data-target');
      const tabName = targetId.replace('#', '');

      // Hide all shop links first
      this.shopLinks.forEach(link => {
        link.classList.remove('active');
      });

      // Show only the shop link that matches the active tab
      const activeShopLink = this.querySelector(`.shop-link[data-tab="${tabName}"]`);
      if (activeShopLink) {
        activeShopLink.classList.add('active');
      }
    }

  disconnectedCallback() {
    this.tabLinks.forEach(link => link.removeEventListener('click', this.toggleTabs.bind(this)));
    this.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
customElements.define("custom-tabs", customTabs);

// Removed global key manager - using simpler approach within each panel

/**
  * collaspsible Panel
  *
  * @param {element} element - Collapsible panel element
*/
class collapsiblePanel {
  constructor(element) {
    this.element = element;
    this.toggleBtn = this.element.querySelector('[data-toggle="panel"]');
    // Use the same logic as utility.js to find the content
    this.content = this.element.querySelector('[data-type="content"]') || this.element.querySelector('.toggle-content');
    
    // Add a flag to track if we should prevent closing
    this._preventClosing = false;
    // Store reference to this instance on the element for access from event handlers
    this.element._collapsiblePanelInstance = this;

    this.toggleBtn?.addEventListener('click', this.toggleContent.bind(this));
    this.element.addEventListener('keyup', this.onKeyUp.bind(this)); // Bind the keyup event
    
    // Add a simple event listener to the content area to handle Enter key
    if (this.content) {
      this.content.addEventListener('keydown', (event) => {
        if (event.code && event.code.toUpperCase() === 'ENTER') {
          
          if(event.target.tagName === 'DIV' && event.target.classList.contains('color-options')){
            let getinput = event.target.querySelector('input');
            if(getinput) getinput.dispatchEvent(new Event('click'));
            getinput.checked = !getinput.checked;
            getinput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Handle checkboxes and radio buttons
          if (event.target.type === 'checkbox') {
            event.preventDefault();
            event.target.checked = !event.target.checked;
            event.target.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (event.target.type === 'radio') {
            event.preventDefault();
            event.target.checked = true;
            event.target.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          // Set prevention flag for this specific panel
          this._preventClosing = true;
          setTimeout(() => {
            this._preventClosing = false;
          }, 100);
        }
      });
    }
  }

  /**
   * Check if an event should be ignored (coming from inside content)
  */
  shouldIgnoreEvent(event) {
    if (!event || !event.target || !this.content) {
      return false;
    }
    
    // Check if the event target is inside the content area
    return this.content.contains(event.target);
  }

  /**
   * Ensure all form elements (especially color-options) are focusable
   */
  ensureFormElementsAreFocusable() {
    if (!this.content) return;
    
    // Find all form elements that might not be focusable
    let formElements = [];


    if(this.content.classList.contains('color-options-list')){
      formElements = this.content.querySelectorAll('.form-check');
    }else{
      formElements = this.content.querySelectorAll('input, button, select, textarea, .form-check, not:div.form-check, .color-options');
    
    }

    //not:div.form-check,
    formElements.forEach(element => {
      // For input elements, ensure they don't have negative tabindex
      if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
        if (element.hasAttribute('tabindex') && element.getAttribute('tabindex').startsWith('-')) {
          element.removeAttribute('tabindex');
        }
        // Ensure the element is enabled
        if (element.hasAttribute('disabled')) {
          element.removeAttribute('disabled');
        }
      }
      
      // For form-check and color-options containers, ensure they're focusable
      if (element.classList.contains('form-check') || element.classList.contains('color-options')) {
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '0');
        }
      }
    });
  }

  /**
   * Toggle Row Content
  */
  toggleContent(event) {
    // If the event is coming from inside the content area, don't toggle
    if (this.shouldIgnoreEvent(event)) {
      return;
    }
    
    event.preventDefault();
    const isOpen = this.element.classList.contains('open');
    isOpen ? this.hideContent() : this.showContent();
  }

  /**
   * Escape Key Press to close drawer when focus is within the container
   */
  onKeyUp(event) {
    // If the event is coming from inside the content area, ignore it
    if (this.shouldIgnoreEvent(event)) {
      return;
    }
    
    // Handle Escape key to close the panel
    if (event.code && event.code.toUpperCase() === 'ESCAPE') {
      this.hideContent();
      return;
    }
  }

  /**
   * Show panel content
   */
   showContent() {
    this.content.removeAttribute('inert');
    this.toggleBtn.setAttribute('aria-expanded', true);
    this.content.setAttribute('aria-hidden', false);
    Utility.toggleElement(this.element, 'open');
    
    // Focus on the content area or first focusable element within it
    setTimeout(() => {
      const focusableElements = Utility.getFocusableElements(this.content);
      
      // Look specifically for color-options or form-check elements
      const colorOptions = this.content.querySelectorAll('.color-options input, .form-check input, input[type="checkbox"], input[type="radio"]');
      
      let elementToFocus = null;
      
      // Prioritize color-options and form-check inputs
      if (colorOptions.length > 0) {
        elementToFocus = colorOptions[0];
      } else if (focusableElements.length > 0) {
        elementToFocus = focusableElements[0];
      }
      
      if (elementToFocus) {
        // Ensure the element is focusable
        if (!elementToFocus.hasAttribute('tabindex')) {
          elementToFocus.setAttribute('tabindex', '0');
        }
        elementToFocus.focus();
      } else {
        // If no focusable elements, make content focusable and focus on it
        this.content.setAttribute('tabindex', '-1');
        this.content.focus();
      }
      
      // Ensure all color-options and form-check inputs are focusable
      this.ensureFormElementsAreFocusable();
      
      // Set up focus trapping
      Utility.trapFocus(this.element, this.content);
    }, 100); // Increased delay to ensure content is fully visible

    if(this.element.dataset.behaviour == 'single'){
      const siblingBlocks = this.element.parentNode.querySelectorAll('[is="collapsiblePanel"].open');
      siblingBlocks.forEach(element => {
        if(element == this.element){ return; }
        element.querySelector('.panel_toggle').click();
      });
    }
  }

  /**
   * Hide panel content
   */
  hideContent() {
    
    // Check if we should prevent closing
    if (this._preventClosing) {
      return; // Don't close the panel
    }
    
    this.content.setAttribute('inert', '');
    this.toggleBtn.setAttribute('aria-expanded', false);
    this.content.setAttribute('aria-hidden', true);
    Utility.toggleElement(this.element, 'close');
    Utility.removeTrapFocus(this.element);
    
    // Clean up tabindex attributes that were added
    if (this.content.hasAttribute('tabindex')) {
      this.content.removeAttribute('tabindex');
    }
    
    // Clean up tabindex attributes from form containers
    const formContainers = this.content.querySelectorAll('.form-check, .color-options');
    formContainers.forEach(container => {
      if (container.hasAttribute('tabindex')) {
        container.removeAttribute('tabindex');
      }
    });
  }

  // Clean up event listeners (can be called manually if needed)
  destroy() {
    this.toggleBtn?.removeEventListener('click', this.toggleContent.bind(this));
    this.element.removeEventListener('keyup', this.onKeyUp.bind(this));
    // Note: The keydown listener on toggleBtn is bound with arrow function, so it can't be easily removed
    // This is acceptable for most use cases as panels are typically not destroyed dynamically
  }

  static init() {
    const collapsibleElements = document.querySelectorAll('[is="collapsiblePanel"]');
    collapsibleElements.forEach((ele) => {
      new collapsiblePanel(ele);
    });
  }
}
collapsiblePanel.init();

class ReadMore extends HTMLElement {
  constructor() {
      super();

      this.container = this.querySelector('[data-read-more-wrapper]');
      this.toggleContent = this.querySelector('[data-read-more-content]');
      this.toggleButton = this.querySelector('[data-toggle-text]');
      this.toggleButton.addEventListener('click', this.toggleReadMore.bind(this));
      const isVisible = this.toggleContent.scrollHeight > this.toggleContent.clientHeight;

      if(isVisible) this.toggleButton.classList.remove('d-none');
  }

  toggleReadMore() {
      const isOpen = this.container.classList.contains('open');

      if (isOpen) {
          this.container.classList.remove('open');
          this.toggleButton.setAttribute('aria-expanded', false);
          setTimeout(() => {
            this.toggleButton.textContent = window.readMoreStrings.read_more;
          }, 300);
      } else {
          this.container.classList.add('open');
          this.toggleButton.setAttribute('aria-expanded', true);
          setTimeout(() => {
            this.toggleButton.textContent = window.readMoreStrings.read_less;
          }, 300);
      }
  }

  manageBtnVisibility() {
    const isOpen = this.container.classList.contains('open');
    if(isOpen) {
      this.toggleButton.textContent = window.readMoreStrings.read_less;
    } else {
      this.toggleButton.textContent = window.readMoreStrings.read_more;
    }
  }
}
customElements.define('read-more', ReadMore);