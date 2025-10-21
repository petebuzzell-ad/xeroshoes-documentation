(() => {
  const filterNodes = {
    container: document.getElementById('collection-container') || document.getElementById('search-container'),
    parent: document.getElementById('storefront-filters-parent'),
    collectionBanner: document.querySelector('[data-collectionBanner]')
  }
  
  class storefrontFilters {
    constructor() {
      if(!filterNodes.container || !filterNodes.parent) return;
  
      this.form = filterNodes.container.querySelector('#storefront-filters-form');
      this.gridsContainer = filterNodes.container.querySelector('#products-listing');
      this.paginate = filterNodes.container.querySelector('[data-pagination-parent]');
      this.activeFilters = filterNodes.container.querySelector('[data-activeFilters]');
      this.filterDrawer = filterNodes.parent.querySelector('#storefront-filter-drawer');
      this.sortDrawer = filterNodes.parent.querySelector('#storefront-sort-drawer');
      this.filterDrawerFooter = filterNodes.parent.querySelector('[data-filterFooter]');
      this.applyfilterbtn = filterNodes.parent.querySelector('[data-applyfilters]');
      this.resetfilterbtn = filterNodes.parent.querySelector('[data-reset-filters]');
  
       // Infinite scroll properties
      this.loadMoreButton = null;
      this.isLoading = false;
      this.infiniteScrollObserver = null;
  
      this.debouncedOnSubmit = Utility.debounce((event) => this.onSubmitHandler(event), 500);
  
      this.closeButtonsFilter = filterNodes.parent.querySelectorAll('[data-closedrawer-f]');
  
      if (this.form) {
        this.form.addEventListener('input', (evt) => {
          const element = evt.target || evt.currentTarget;
          // if (element.type === 'range' || (element.nodeName !== 'FORM' && element.name != 'sort_by' && window.innerWidth < 992)) return;
          let checkparent = (element.tagName).toLowerCase();
          if(checkparent == 'form'){
            this.debouncedOnSubmit(evt);
          }else{
            this.getSelectedProductCount(evt);
          }
        });
        
        
        // Apply button handler moved to dynamicEleEvents to handle DOM updates
  
        this.form.addEventListener('submit', this.debouncedOnSubmit.bind(this));
      }
  
      this.closeButtonsFilter.forEach((btn) => {
        btn.addEventListener('click', (evt) => {
          this.closeDrawerFilter(evt);
        });
        // btn.addEventListener('click',, this.closeDrawerFilter.bind(evt));
      });
  
      document.querySelector('.template-collection site-overlay')?.addEventListener('click', (evt) => {
         this.closeButtonsFilter.forEach((btn) => {
          btn.dispatchEvent(new Event('click'));
         });
        // SiteOverlay.prototype.hideOverlay();
        // this.closeDrawerFilter();
      });
      // this.addEventListener('keyup',  this.filterDrawer.onKeyUp.bind(this));
      // this.addEventListener('focusout',  this.filterDrawer.focusOut.bind(this));
      this.manageDrawerUI(window.innerWidth);
      this.bindEvents();
      this.dynamicEleEvents();
       // Initialize infinite scroll
      this.setupInfiniteScroll();
      
      // Initialize color filter auto-selection
    }
  
    // onClick(evt){
      
    // }
  
  
    /**
     * Get color filter value from URL parameters
     */
    getColorFilterFromURL() {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check for common color filter parameter names
      const colorParamNames = [
        'filter.v.option.color',
        'filter.p.m.product.color',
        'filter.v.option.colour',
        'filter.p.m.custom.colour',
        'filter.v.option.Color',
        'filter.p.m.product.Color',
        'filter.v.option.Colour',
        'filter.p.m.custom.Colour',
        'color',
        'colour',
        'Color',
        'Colour',
        'filter.v.option.1',
        'filter.p.m.custom.1',
        'option1',
        'option_1'
      ];

      for (const paramName of colorParamNames) {
        const colorValue = urlParams.get(paramName);
        if (colorValue) {
          const decodedValue = decodeURIComponent(colorValue);
          return decodedValue;
        }
      }

      return null;
    }
  
    /**
     * Wait for URL to be updated with filter parameters, then auto-select colors
     */
    async waitForURLUpdateAndSelectColors() {
      const maxAttempts = 30;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const colorFilter = this.getColorFilterFromURL();
        
        if (colorFilter) {
          // Wait a bit more for DOM to be fully ready
          await new Promise(resolve => setTimeout(resolve, 200));
          await this.autoSelectColorVariants();
          return;
        }
        
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
        attempts++;
      }
    }
  
    /**
     * Wait for URL to be updated with filter parameters, then auto-select colors for load more
     */
    async waitForURLUpdateAndSelectColorsForLoadMore() {
      const maxAttempts = 20;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const colorFilter = this.getColorFilterFromURL();
        
        if (colorFilter) {
          await this.autoSelectColorVariantsForLoadMore();
          return;
        }
        
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
        attempts++;
      }
    }
  
    /**
     * Test partial matching logic with specific examples
     */
    testPartialMatching() {
      
      // Test cases
      const testCases = [
        { filter: 'black', options: ['Black', 'Black Leather', 'Black / Asphalt', 'Steel Gray / Black'] },
        { filter: 'blue', options: ['Blue Iolite', 'Blue Aster', 'Navy Blue', 'Steel Blue'] },
        { filter: 'red', options: ['Red', 'Salsa Red', 'Red Ochre', 'Burgundy Red'] },
        { filter: 'white', options: ['White', 'White / Black', 'Light Gray', 'Off White'] }
      ];
      
      testCases.forEach(testCase => {
        testCase.options.forEach(option => {
          const normalizedFilter = this.normalizeColorName(testCase.filter);
          const normalizedOption = this.normalizeColorName(option);
          const match = normalizedOption.includes(normalizedFilter);
        });
      });
      
    }
  
    /**
     * Manual test function - call this from console to test color detection
     */
    testColorDetection() {
      const colorFilter = this.getColorFilterFromURL();
      
      if (colorFilter) {
        this.autoSelectColorVariants();
      } else {
      }
    }
  
    /**
     * Normalize color names for matching
     */
    normalizeColorName(colorName) {
      if (!colorName) return '';
      
      return colorName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/\b(blk)\b/g, 'black') // Only normalize obvious abbreviations
        .replace(/\b(wht)\b/g, 'white') // Only normalize obvious abbreviations
        .replace(/\b(blu)\b/g, 'blue') // Only normalize obvious abbreviations
        .replace(/\b(rd)\b/g, 'red') // Only normalize obvious abbreviations
        .replace(/\b(grn)\b/g, 'green') // Only normalize obvious abbreviations
        .replace(/\b(ylw)\b/g, 'yellow') // Only normalize obvious abbreviations
        .replace(/\b(pnk)\b/g, 'pink') // Only normalize obvious abbreviations
        .replace(/\b(prpl)\b/g, 'purple') // Only normalize obvious abbreviations
        .replace(/\b(org)\b/g, 'orange') // Only normalize obvious abbreviations
        .replace(/\b(gry)\b/g, 'gray') // Only normalize obvious abbreviations
        .replace(/\b(brn)\b/g, 'brown') // Only normalize obvious abbreviations
        .replace(/\b(leather|canvas|knit|mesh)\b/g, '') // Remove material words
        .replace(/\b(steel|asphalt|lunar|tidal|orion|morel|alloy)\b/g, '') // Remove specific color modifiers
        .trim();
    }
  
    /**
     * Find matching variant option for the color filter
     */
    findMatchingVariantOption(colorFilter, variantSelects) {
      const normalizedFilterColor = this.normalizeColorName(colorFilter);
      
      // Get all available variant options
      const variantData = variantSelects._getVariantData();
      
      if (!variantData || variantData.length === 0) {
        return null;
      }
  
  
      // First, try exact match in option1 only
      for (const variant of variantData) {
        if (variant.option1) {
          const normalizedOption1 = this.normalizeColorName(variant.option1);
          
          
          if (normalizedOption1 === normalizedFilterColor) {
            return variant.option1;
          }
        }
      }
  
      // If no exact match, try word boundary matching first (more precise)
      // Collect all word boundary matches first, then prioritize the best one
      const wordBoundaryMatches = [];
      
      for (const variant of variantData) {
        if (variant.option1) {
          const normalizedOption1 = this.normalizeColorName(variant.option1);
          
          const words = normalizedOption1.split(/\s+/);
          
          
          if (words.includes(normalizedFilterColor)) {
            wordBoundaryMatches.push({
              variant: variant.option1,
              normalized: normalizedOption1,
              words: words,
              // Prioritize variants where the filter color is the first word
              priority: words[0] === normalizedFilterColor ? 1 : 2
            });
          }
        }
      }
      
      // Sort by priority (first word matches first) and return the best match
      if (wordBoundaryMatches.length > 0) {
        wordBoundaryMatches.sort((a, b) => a.priority - b.priority);
        const bestMatch = wordBoundaryMatches[0];
        return bestMatch.variant;
      }
  
      // If no word boundary match, try partial match (contains) in option1 only
      for (const variant of variantData) {
        if (variant.option1) {
          const normalizedOption1 = this.normalizeColorName(variant.option1);
          
          
          // Enhanced partial matching - check if filter color is contained in option
          if (normalizedOption1.includes(normalizedFilterColor)) {
            return variant.option1;
          }
          
          // Also check if any word in the option contains the filter color
          const optionWords = normalizedOption1.split(/\s+/);
          for (const word of optionWords) {
            if (word.includes(normalizedFilterColor) && word.length >= normalizedFilterColor.length) {
              return variant.option1;
            }
          }
        }
      }
  
  
      // Final attempt: try reverse partial matching (filter contains option color)
      for (const variant of variantData) {
        if (variant.option1) {
          const normalizedOption1 = this.normalizeColorName(variant.option1);
          
          // Check if any word in the option is contained in the filter
          const optionWords = normalizedOption1.split(/\s+/);
          for (const word of optionWords) {
            if (normalizedFilterColor.includes(word) && word.length >= 3) {
              return variant.option1;
            }
          }
        }
      }
  
  
      return null;
    }
  
    /**
     * Wait for variant-selects to be ready using async/await
     */
    async waitForVariantSelectsReady(variantSelects, maxAttempts = 50) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Check if variant-selects is fully initialized
        if (variantSelects._getVariantData && typeof variantSelects._getVariantData === 'function') {
          const variantData = variantSelects._getVariantData();
          if (variantData && variantData.length > 0) {
            // Additional check: make sure the inputs are also rendered
            const inputs = variantSelects.querySelectorAll('input[type="radio"]');
            if (inputs.length > 0) {
              return true;
            }
          }
        }
        
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      return false;
    }
  
    /**
     * Auto-select color variants on product cards using async/await
     */
    async autoSelectColorVariants() {
      const colorFilter = this.getColorFilterFromURL();
      
      if (!colorFilter) {
        return;
      }

      // Find all product cards with variant selects
      const productCards = document.querySelectorAll('[data-product-card]');
      
      // Process each card
      for (let i = 0; i < productCards.length; i++) {
        const card = productCards[i];
        
        const variantSelects = card.querySelector('variant-selects');
        if (!variantSelects) {
          continue;
        }

        // Wait for variant-selects to be ready
        const isReady = await this.waitForVariantSelectsReady(variantSelects);
        if (!isReady) {
          continue;
        }

        // Find matching color option
        const matchingOption = this.findMatchingVariantOption(colorFilter, variantSelects);
        
        if (!matchingOption) {
          continue;
        }

        // Find the input for this color option
        const colorInput = variantSelects.querySelector(`input[value="${CSS.escape(matchingOption)}"]`);
        
        if (!colorInput || colorInput.checked) {
          continue;
        }

        // Click the color option to trigger natural selection
        colorInput.click();
        
        // Wait for variant change to complete
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
  
    /**
     * Auto-select color variants specifically for load more products
     */
    async autoSelectColorVariantsForLoadMore() {
      const colorFilter = this.getColorFilterFromURL();
      
      if (!colorFilter) {
        return;
      }
  
      
      // Find only the newly loaded product cards (those without data-color-filter-processed)
      const allProductCards = document.querySelectorAll('[data-product-card]');
      const newProductCards = Array.from(allProductCards).filter(card => !card.hasAttribute('data-color-filter-processed'));
      
      if (newProductCards.length === 0) {
        return;
      }
      
      // Process each new card
      for (const card of newProductCards) {
        const variantSelects = card.querySelector('variant-selects');
        if (!variantSelects) {
          // Mark as processed even if no variant-selects found
          card.setAttribute('data-color-filter-processed', 'true');
          continue;
        }
  
        // Wait for variant-selects to be ready
        const isReady = await this.waitForVariantSelectsReady(variantSelects);
        if (!isReady) {
          card.setAttribute('data-color-filter-processed', 'true');
          continue;
        }
  
        // Find matching color option
        const matchingOption = this.findMatchingVariantOption(colorFilter, variantSelects);
        
        // Mark this card as processed regardless of whether we found a match
        card.setAttribute('data-color-filter-processed', 'true');
        
        if (!matchingOption) {
          continue;
        }
  
        // Find the input for this color option
        const colorInput = variantSelects.querySelector(`input[value="${CSS.escape(matchingOption)}"]`);
        if (!colorInput || colorInput.checked) {
          continue;
        }
  
        
        // Click the color option to trigger natural selection
        colorInput.click();
        
        // Wait for variant change to complete
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
  
    }
  
    
    updateallinputs(evt){
      evt.preventDefault();
      const inputs = this.form.querySelectorAll('input[type="checkbox"], input[type="radio"]');
      // Uncheck all of them
      inputs.forEach(input => input.checked = false);
      this.getSelectedProductCount(evt);
      let ele = evt.currentTarget.classList.add('disabled')
    }
  
    getSelectedProductCount(evt){
      evt.preventDefault();
      const searchParams = this._createQueryString(this.form)
      this.renderSelectedProductCount(searchParams);
    }
  
  
    async renderSelectedProductCount(searchParams, updateURLHash = true) {
      this.gridsContainer.classList.add('loading');
  
      const url = `${window.location.pathname}?${searchParams}`;
      await this.renderProdCountFromFetch(url, 'filter');
    }
  
     async renderProdCountFromFetch(url, type) {
      if(!url) return;
  
      const sectionID = filterNodes.container.dataset.section;
      url += type === 'sub_collection' ? `&sections=${sectionID},template-collection-banner` : `&sections=${sectionID}`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
        const gridHTML = data[sectionID];
  
        const html = new DOMParser().parseFromString(gridHTML, 'text/html');
        const totalFilterElement = filterNodes.container.querySelector('[data-applyfilters]');
        if (totalFilterElement && html.querySelector('[data-applyfilters]')) { // Update total products count
          totalFilterElement.innerHTML = html.querySelector('[data-applyfilters]').innerHTML;
        } else if (totalFilterElement) {
          totalFilterElement.innerHTML = 'View Products (0)';
        }
        const resetFilterElement = filterNodes.container.querySelector('[data-reset-filters]');
        let countfilter = 0;
        if (html.querySelector('[data-reset-filters]')) {
          countfilter = html.querySelector('[data-reset-filters]').getAttribute('data-selected-filter');
        }
        
        if (resetFilterElement) { 
          if (html.querySelector('[data-reset-filters]')) {
            resetFilterElement.innerHTML = html.querySelector('[data-reset-filters]').innerHTML;
          } else {
            let selectedFiltersCount = 0;
            selectedFiltersCount = document.querySelectorAll('#storefront-filters-form .individual-filter-block input.filter-option:checked').length;
            resetFilterElement.innerHTML = `Clear Filters <span>(${selectedFiltersCount})</span>`;
          }
          if(parseInt(countfilter) > 0){
            resetFilterElement.classList.remove('disabled')
          }
          resetFilterElement.addEventListener('click', (evt) => {
            this.updateallinputs(evt);
          });
        }
        // this.renderProductGrid(type, gridHTML, bannerHTML);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  
  
  
    /**
     * Switch between Drawer/Colume view
    */
    manageDrawerUI(windowWidth){
      let filterGrid = filterNodes.parent.querySelector('#storefront-filter-grid');
      const elementToClone = filterGrid;
  
      filterGrid.remove();
  
      this.filterDrawer.querySelector('div.drawer-body').appendChild(elementToClone);
      filterGrid = elementToClone;
    }
  
    closeDrawerFilter(evt) {
        
        let closestDrawer = evt.currentTarget.closest('custom-drawer');
        closestDrawer.isOpen = false;
        closestDrawer.classList.remove('open');
        closestDrawer.setAttribute('aria-hidden', 'true');
        closestDrawer.openedBy?.setAttribute('aria-expanded', false);
  
        SiteOverlay.prototype.hideOverlay();
        Utility.removeTrapFocus(closestDrawer.openedBy);
        closestDrawer.openedBy = null;
  
        // replace older value
        let currentSearchParam = (window.location.search).replace('?','')
        this.renderPage(currentSearchParam);
  
        // this.debouncedOnSubmit(evt);
  
        // this.isOpen = false;
        /*
        this.classList.remove('open');
        this.setAttribute('aria-hidden', 'true');
        this.openedBy?.setAttribute('aria-expanded', false);
        
        SiteOverlay.prototype.hideOverlay();
        Utility.removeTrapFocus(this.openedBy);
        this.openedBy = null;
  
        // Close all open dropdowns/panels when drawer is closed
        // this.hideOpenPanels();*/
    }
  
    /**
     * bind events to UI element events
    */
    bindEvents() {
      window.onresize = () => {
        this.manageDrawerUI(window.innerWidth);
      };
  
      const sortByOptions = filterNodes.container.querySelectorAll('#sortby-dropdown .sortby_options, #sortby-dropdown-drawer .sortby_options');
      sortByOptions.forEach(input => input.addEventListener('change', this.updateSortBy.bind(this)));
  
      const paginateByValues = filterNodes.container.querySelectorAll('#products-per-page [name="paginateBy"]');
      paginateByValues.forEach(input => input.addEventListener('change', this.paginateProductsBy.bind(this)));
  
      const closeFilters = filterNodes.parent.querySelectorAll('[data-closefilter]');
      closeFilters.forEach(btn => { 
        btn.addEventListener('click', (evt)=>{
          evt.preventDefault();
          this.filterDrawer?.closeDrawer();
        });
      });
  
      const backFilters = filterNodes.parent.querySelectorAll('[data-back]');
      backFilters.forEach(btn => { 
        btn.addEventListener('click', (evt)=>{
          evt.preventDefault();
          let panel = evt.currentTarget.closest('[is="collapsiblePanel"]');
          panel?.querySelector('[data-toggle="panel"]')?.click();
        });
      });
  
      document.body.addEventListener('click', (evt) => {
        if(evt.target.closest('#storefront-filters-form') != null) return;
        // this.hideFilters();
      });
    }
  
    dynamicEleEvents() {
      const collectionLinks = filterNodes.parent.querySelectorAll('[data-subcollectionslinks]');
      collectionLinks.forEach(link => link.addEventListener('click', this._manageSubCollections.bind(this)));

      const applyBtn = filterNodes.parent.querySelector('[data-applyFilters]');
      applyBtn?.addEventListener('click', () => {
        const searchParams = this._createQueryString(this.form)
        this.renderPage(searchParams);
      });

      const paginationLinks = filterNodes.container.querySelectorAll('[data-pagelinks], [data-loadmore]');
      paginationLinks.forEach(link => link.addEventListener('click', this._managePagination.bind(this)));
  
      // let resetfilterbtn = filterNodes.parent.querySelector('[data-reset-filters]');
      // resetfilterbtn.addEventListener('click', (evt) => {
      //   console.log('click==>>')
      //     this.updateallinputs(evt);
      // });
  
    this.colorOptionsStyling();
    this.bindActiveFilterButtonEvents();
    }
  
    hideFilters(){
      // let openPanels = this.form.querySelectorAll('[is="collapsiblePanel"].open');
      // if(openPanels){
      //   openPanels.forEach(panel => panel.querySelector('[data-toggle="panel"]').click());
      // }
    }
  
    /**
     * Filter form submit event
     */
    onSubmitHandler(event) {
      event.preventDefault();
      const searchParams = this._createQueryString(this.form)
      this.renderPage(searchParams);
    }
  
    /**
     * click event To Remove current selections
     * @param {element} form Collection page filter form
     */
    _createQueryString(form){
      const formData = new FormData(form);
      const priceGTE = form.querySelector('[name="filter.v.price.gte"]');
      const priceLTE = form.querySelector('[name="filter.v.price.lte"]');
  
      formData.delete('sort_by_mobile');
  
       // Helper function to check if price filter should be removed
       const shouldRemovePriceFilter = (input, formDataKey) => {
        if (!input) return false;
        const currentValue = formData.get(formDataKey);
        const defaultValue = formDataKey.includes('.gte') ? input.min : input.max;
        return currentValue === '' || parseInt(currentValue) === parseInt(defaultValue);
      };
  
      if (shouldRemovePriceFilter(priceGTE, 'filter.v.price.gte')) formData.delete('filter.v.price.gte');    
      if (shouldRemovePriceFilter(priceLTE, 'filter.v.price.lte')) formData.delete('filter.v.price.lte');
      
      return new URLSearchParams(Array.from(formData)).toString();
    }
  
    /**
     * 
     * @param {String} searchParams Query Parameters
     * @param {Boolean} updateURLHash true/false
    */
    async renderPage(searchParams, updateURLHash = true) {
      this.gridsContainer.classList.add('loading');
  
      const url = `${window.location.pathname}?${searchParams}`;
      await this.renderGridFromFetch(url, 'filter');
  
      if (updateURLHash) this.updateURLHash(searchParams);
    }
  
    /**
     * Add background color in label of Color options
     */
    colorOptionsStyling(){
      const colorSwatchContainer = filterNodes.parent.querySelector('[data-colorFilter]');
      if(!colorSwatchContainer) return;
  
      colorSwatchContainer.querySelectorAll('.color-options').forEach(swatch => {
        const colorHandle = swatch.querySelector('input[type="checkbox"]').dataset.handle;
        const swatchStyle = Utility.getSwatchStyle(colorHandle);
        swatch.querySelector('.option-label').setAttribute('style', swatchStyle);
      });
    }
  
    /**
     * Remove active filters
     */
     onActiveFilterClick(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if(event.currentTarget.href){
        const URLString = new URL(event.currentTarget.href).searchParams.toString();
        if(URLString != null) this.renderPage(URLString);
      }
    }
  
     /**
     * Update Window URL
     */
    onHistoryChange(event) {
      const searchParams = event.state?.searchParams || '';
      this.renderPage(searchParams, false);
    }
  
    /**
     * 
     * @param {String} url URL for fetching results
     * @param {String} type filter / pagination / sub_collection
     */
    async renderGridFromFetch(url, type) {
      if(!url) return;
  
      let chkURL = url;
  
      const sectionID = filterNodes.container.dataset.section;
      url += type === 'sub_collection' ? `&sections=${sectionID},template-collection-banner` : `&sections=${sectionID}`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
        const gridHTML = data[sectionID];
        const bannerHTML = data['template-collection-banner'];
        this.renderProductGrid(type, gridHTML, bannerHTML,chkURL);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  
    /**
     * 
     * @param {HTMlResponse} html 
     * @param {String} type filter / pagination / sub_collection
     */
    renderProductGrid(type, grid, banner,url) {
      let checkmainurl = url;
  
      const html = new DOMParser().parseFromString(grid, 'text/html');
      const filterPanels = html.querySelectorAll('#storefront-filters-form .individual-filter-block');
  
      const paginationType = this.paginate?.dataset.type || 'numbers';
      const productGrids = this.gridsContainer.querySelector('[data-products-grid');
      const loadMoreBtn = this.gridsContainer.querySelector('[data-loadmore]');
      const totalProductsElement = filterNodes.container.querySelector('[data-totalProducts]');
  
      if (type === 'pagination' && paginationType === 'loadmore') {
          productGrids.insertAdjacentHTML('beforeend', html.querySelector('[data-products-grid]').innerHTML);
  
          const newLoadMoreBtn = html.querySelector('[data-loadmore]');
          if (newLoadMoreBtn && loadMoreBtn) {
              loadMoreBtn.parentNode.replaceChild(newLoadMoreBtn, loadMoreBtn);
          } else if (loadMoreBtn) {
              loadMoreBtn.remove();
          }
          
          // Auto-select color variants for newly loaded products
          this.waitForURLUpdateAndSelectColorsForLoadMore();
          
      } else {
        this.gridsContainer.innerHTML = html.querySelector('#products-listing').innerHTML;
      }
      lazyImageObserver.observe();
      if (typeof StampedFn !== 'undefined') StampedFn?.loadBadges();
      
      // Manage filter panels display
      let filterBlocks = document.querySelectorAll('#storefront-filters-form .individual-filter-block');
      filterBlocks.forEach(panel => panel.classList.add('d-none'));
  
      filterPanels.forEach(panel => {
        const filterBlock = document.querySelector(`.individual-filter-block[data-index="${panel.dataset.index}"]`);
        if (filterBlock) {
            filterBlock.querySelector('.filter__block').innerHTML = panel.querySelector('.filter__block').innerHTML;
            filterBlock.classList.remove('d-none');
        }
      });
      
      // if(filterNodes.parent.dataset.layout == 'topbar'){
      //   this.form.querySelector('.individual-filter-block.open[is="collapsiblePanel"]')?.querySelector('[data-toggle="panel"]').click();
      // }
      if(filterNodes.parent.dataset.layout == 'topbar') {
        // Get all open collapsible panels except the first one
        const openPanels = Array.from(
          this.form.querySelectorAll('.individual-filter-block.open[is="collapsiblePanel"]')
        ).slice(1); // Skip first element
        
        // Click all remaining panels
        openPanels.forEach(panel => {
          panel.querySelector('[data-toggle="panel"]')?.click();
        });
      }
  
      if (totalProductsElement && html.querySelector('[data-totalProducts]')) { // Update total products count
        totalProductsElement.innerHTML = html.querySelector('[data-totalProducts]').innerHTML;
      } else if (totalProductsElement) {
        totalProductsElement.innerHTML = `<p class="m-0">0 Products</p>`;
      }
  
      if (this.filterDrawerFooter && html.querySelector('[data-filterFooter]')) {
        this.filterDrawerFooter.innerHTML = html.querySelector('[data-filterFooter]').innerHTML; // Update drawer footer
      }
  
      const activeFilters = html.querySelector('[data-activeFilters]'); // Update active filters
      if (activeFilters) {
        this.activeFilters.innerHTML = activeFilters.innerHTML;
      }
  
      if (type === 'sub_collection' && filterNodes.collectionBanner && banner) {  // Change banner on subcollection
        const bannerNode = new DOMParser().parseFromString(banner, 'text/html');
        filterNodes.collectionBanner.innerHTML = bannerNode.querySelector('[data-collectionBanner]').innerHTML;
      }
  
      this.dynamicEleEvents();
      
      // Auto-select color variants if color filter is applied
      // Wait for URL to be updated with filter parameters
      this.waitForURLUpdateAndSelectColors();
  
      // Handle infinite scroll reset for filter changes (not pagination)
      if (type === 'filter' && this.infiniteScrollObserver) {
        this.resetInfiniteScroll();
      }
  
      if(checkmainurl.includes('?sort_by')){
        if (this.filterDrawer?.isOpen) this.filterDrawer.closeDrawer(); // Close drawer if open
      }
      if (this.sortDrawer?.isOpen) this.sortDrawer.closeDrawer(); // Close drawer if open
  
      if(typeof checkAllScrollOverflows == 'function') {
        if (type === 'pagination') {
          // For load more, process overflow indicators for new products only
          setTimeout(() => {
            checkAllScrollOverflowsForNewProducts(this.gridsContainer);
          }, 100);
        } else {
          // For filters and other operations, process normally
          checkAllScrollOverflows();
        }
      }
      if(typeof setupArrowScroll == 'function') setupArrowScroll();
    }
  
  
    
    /**
     * Re-Binding events on active filters after ajax request
     */
    bindActiveFilterButtonEvents() {
      const removeActiveFilters = Array.from(document.getElementsByClassName('filter-option-clear'));
      if(removeActiveFilters.length > 0){
        removeActiveFilters.forEach((element) => {
          element.addEventListener('click', this.onActiveFilterClick.bind(this), { once: true });
        });
      }
    }
  
    /**
     * Update the url
     * @param {String} searchParams 
     */
    updateURLHash(searchParams) {
      window.history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }
  
    updateSortBy(event){
      const currentEle = event.currentTarget;
      const sortByInput = this.form.querySelector('input[name="sort_by"]');
      sortByInput.value = currentEle.value;
      this.form.dispatchEvent(new Event('input', { once: true }));
    }
  
    async paginateProductsBy(event){
      event.preventDefault();
      const currentValue = document.querySelector('#products-per-page [name="paginateBy"]:checked').value;
      const requestData = { attributes: { 'products_per_page': currentValue } };
  
      try {
        await fetch("/cart/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(requestData),
        });
        const searchParams = this._createQueryString(this.form);
        const url = `${window.location.pathname}?${searchParams}`;
        await this.renderGridFromFetch(url, 'pagination');
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    }
  
    async _manageSubCollections(event){
      event.preventDefault();
      const _this =  event.currentTarget;
      const queryString = this._createQueryString(this.form);
      const collURL = `${_this.href}?${queryString}`;
  
      await this.renderGridFromFetch(collURL, 'sub_collection');
  
      setTimeout(() => {
        window.history.pushState({}, '', collURL);
      }, 500);
    }
  
    async _managePagination(event){
      event.preventDefault();
      const _this = event.currentTarget;
      await this.renderGridFromFetch(_this.href, 'pagination');
  
      const paginationType = this.paginate?.dataset.type || 'numbers';
      if(paginationType != 'loadmore'){
        setTimeout(() => {
          window.history.pushState({}, '', _this.href);
        }, 500);
      }
    }
  
    /**
     * Setup infinite scroll functionality
     */
    setupInfiniteScroll() {
      // Check if we're on a collection page with load more pagination
      const paginationParent = this.paginate;
      if (!paginationParent || paginationParent.dataset.type !== 'loadmore') {
        return;
      }
  
      this.loadMoreButton = filterNodes.container.querySelector('[data-loadmore]');
      if (!this.loadMoreButton) {
        return;
      }
  
      // Add infinite scroll active class to body
      document.body.classList.add('infinite-scroll-active');
  
      // Set up intersection observer to watch for the load more button
      this.setupIntersectionObserver();
    }
  
    /**
     * Setup intersection observer for infinite scroll
     */
    setupIntersectionObserver() {
      const options = {
        root: null, // Use viewport as root
        rootMargin: '100px', // Start loading 100px before the button comes into view
        threshold: 0.1 // Trigger when 10% of the button is visible
      };
  
      this.infiniteScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isLoading) {
            this.triggerInfiniteScroll();
          }
        });
      }, options);
  
      this.infiniteScrollObserver.observe(this.loadMoreButton);
    }
  
    /**
     * Trigger infinite scroll load more
     */
    triggerInfiniteScroll() {
      if (this.isLoading || !this.loadMoreButton) {
        return;
      }
  
      // Check if the button is still visible and clickable
      if (this.loadMoreButton.style.display === 'none' || 
          this.loadMoreButton.style.visibility === 'hidden' ||
          this.loadMoreButton.offsetParent === null) {
        return;
      }
  
      this.isLoading = true;
  
      // Add loading state to button
      this.loadMoreButton.classList.add('loading');
      this.loadMoreButton.style.pointerEvents = 'none';
  
      // Store original text
      const originalText = this.loadMoreButton.textContent;
      this.loadMoreButton.textContent = 'Loading...';
  
      // Add loading indicator to the products grid
      this.addLoadingIndicator();
  
      // Simulate click on the load more button
      this.loadMoreButton.click();
  
      // Listen for the completion of the load more operation
      this.waitForInfiniteScrollComplete(originalText);
    }
  
    /**
     * Wait for infinite scroll load to complete
     */
    waitForInfiniteScrollComplete(originalText) {
      // Store initial product count
      const initialProductCount = this.gridsContainer.querySelectorAll('[data-product-card]').length;
  
      // Check for changes every 100ms
      const checkInterval = setInterval(() => {
        const currentProductCount = this.gridsContainer.querySelectorAll('[data-product-card]').length;
  
        // If product count increased, loading is complete
        if (currentProductCount > initialProductCount) {
          clearInterval(checkInterval);
  
          // Wait a bit for the DOM to settle, then reset loading state
          setTimeout(() => {
            this.resetInfiniteScrollState(originalText);
            this.removeLoadingIndicator();
  
            // Update the load more button reference and re-observe
            this.updateInfiniteScrollButton();
          }, 500);
        }
      }, 100);
  
      // Fallback: if no changes detected within 10 seconds, reset loading state
      setTimeout(() => {
        clearInterval(checkInterval);
        this.resetInfiniteScrollState(originalText);
        this.removeLoadingIndicator();
      }, 10000);
    }
  
    /**
     * Reset infinite scroll loading state
     */
    resetInfiniteScrollState(originalText) {
      this.isLoading = false;
  
      if (this.loadMoreButton) {
        this.loadMoreButton.classList.remove('loading');
        this.loadMoreButton.style.pointerEvents = '';
        this.loadMoreButton.textContent = originalText;
      }
    }
  
    /**
     * Update infinite scroll button reference after new content is loaded
     */
    updateInfiniteScrollButton() {
      // Disconnect current observer
      if (this.infiniteScrollObserver) {
        this.infiniteScrollObserver.disconnect();
      }
  
      // Get the updated load more button
      this.loadMoreButton = filterNodes.container.querySelector('[data-loadmore]');
  
      if (this.loadMoreButton) {
        // Re-observe the new button
        this.infiniteScrollObserver.observe(this.loadMoreButton);
      } else {
        // No more pages to load, infinite scroll is complete
        document.body.classList.remove('infinite-scroll-active');
      }
    }
  
    /**
     * Add loading indicator to products grid
     */
    addLoadingIndicator() {
      const productsGrid = this.gridsContainer.querySelector('[data-products-grid]');
      if (!productsGrid) return;
  
      // Remove any existing loading indicator
      this.removeLoadingIndicator();
  
      // Create loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'infinite-scroll-loading';
      loadingIndicator.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading more products...</p>
        </div>
      `;
  
      // Insert after the products grid
      productsGrid.parentNode.insertBefore(loadingIndicator, productsGrid.nextSibling);
    }
  
    /**
     * Remove loading indicator from products grid
     */
    removeLoadingIndicator() {
      const existingIndicator = this.gridsContainer.querySelector('.infinite-scroll-loading');
      if (existingIndicator) {
        existingIndicator.remove();
      }
    }
  
    /**
     * Reset infinite scroll when filters are applied
     */
    resetInfiniteScroll() {
      this.isLoading = false;
      if (this.infiniteScrollObserver) {
        this.infiniteScrollObserver.disconnect();
      }
      document.body.classList.remove('infinite-scroll-active');
  
      // Remove any loading indicators
      this.removeLoadingIndicator();
  
      // Re-initialize after a delay to allow for DOM updates
      setTimeout(() => {
        this.setupInfiniteScroll();
      }, 1000);
    }
  
  }
  if (typeof storefrontFilters !== 'undefined') {
    const storefrontFiltersInstance = new storefrontFilters();
    
    // Auto-select colors on page load if color filter is present
    if (storefrontFiltersInstance) {
      // Wait for DOM to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          storefrontFiltersInstance.waitForURLUpdateAndSelectColors();
        });
      } else {
        // DOM is already loaded
        storefrontFiltersInstance.waitForURLUpdateAndSelectColors();
      }
    }
    
    // Make test functions available globally
    window.testColorDetection = () => {
      storefrontFiltersInstance.testColorDetection();
    };
    
    window.testPartialMatching = () => {
      storefrontFiltersInstance.testPartialMatching();
    };
  }
  })();
  
  class PriceRange extends HTMLElement {
    constructor() {
      super();
      
      this.querySelectorAll('input[name="filter.v.price.gte"], input[name="filter.v.price.lte"]')
        .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));
  
      this.setMinAndMaxValues();
      this.manageSliderChange();
    }
  
    onRangeChange(event) {
      this.adjustToValidValues(event.currentTarget);
      this.setMinAndMaxValues();
    }
  
    setMinAndMaxValues() {
      const inputs = this.querySelectorAll('input[name="filter.v.price.gte"], input[name="filter.v.price.lte"]');
      const minInput = inputs[0];
      const maxInput = inputs[1];
      if (maxInput.value) minInput.setAttribute('max', maxInput.value);
      if (minInput.value) maxInput.setAttribute('min', minInput.value);
      if (minInput.value === '') maxInput.setAttribute('min', 0);
      if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
    }
  
    // eslint-disable-next-line class-methods-use-this
    adjustToValidValues(input) {
      const value = Number(input.value);
      const min = Number(input.getAttribute('min'));
      const max = Number(input.getAttribute('max'));
  
      if (value < min) input.value = min;
      if (value > max) input.value = max;
    }
  
    // eslint-disable-next-line class-methods-use-this
    manageSliderChange() {
      const sliderSection = this.querySelector("#range-slider");
      const sliders = sliderSection.getElementsByTagName("input");
      Array.from(sliders).forEach(slider => {
        slider.oninput = () => {
          let slide1 = Number(sliders[0].value);
          let slide2 = Number(sliders[1].value);
  
          // Neither slider will clip the other, so make sure we determine which is larger
          if( slide1 > slide2 ){ const tmp = slide2; slide2 = slide1; slide1 = tmp; }
          this.querySelector('input[name="filter.v.price.gte"]').value = slide1;
          this.querySelector('input[name="filter.v.price.lte"]').value = slide2;
        }
        slider.onchange = () =>{
          if(window.innerWidth >= 992) this.closest('form').dispatchEvent(new CustomEvent('submit'));
        }
      });
    }
  }
  customElements.define('price-range', PriceRange);