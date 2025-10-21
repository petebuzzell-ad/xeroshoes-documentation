class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this.cachedResults = {};
      this.input = this.querySelector('input[type="search"]');
      this.predictiveSearchResults = this.querySelector('[data-predictive-search]');
      this.searchTerm = '';
      this.html = document.documentElement;

      this.mobSearchIcon = document.querySelector('[data-toggleMobSearch]');
  
      this.setupEventListeners();

      document.addEventListener("click", function (event) {
        const siteHeader = document.querySelector(".site-header .navbar-main");
        const searchContainer = document.querySelector(".predictive-search--header");
        const search_clear = document.querySelector('.search-modal__form .clear-btn');

        if (!searchContainer && !siteHeader) return;

        // If search is not open, do nothing
        if (!searchContainer.classList.contains("show-results")) return;

        // Check if the click was inside the search container or site header
        if (!siteHeader.contains(event.target)) {
          // Click was outside, so close the search
          search_clear.click();
        }
      });
    }
  
    /**
     * Bind the events on the search input
     */
    setupEventListeners() {
      if (this.input) {
        this.input.addEventListener('input', Utility.debounce((event) => {
          this.onChange(event);
        }, 500).bind(this))
      }
 
      // this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));
      this.input.addEventListener('focus', this.onFocus.bind(this));
      this.input.addEventListener('blur', this.onBlur.bind(this));

      this.mobSearchIcon.addEventListener('click', this.openMobileSearch.bind(this));
    }
  
    /**
     * 
     * @returns Search Query with trim value
     */
    getQuery() {
      return this.input.value.trim();
    }
  
    onChange() {
        const newSearchTerm = this.getQuery();

        if(!newSearchTerm || newSearchTerm.length <= 0){
            this.hideResults();
            return;
        }
  
        this.searchTerm = newSearchTerm;
        this.getSearchResults(this.searchTerm);
    }
  
    /**
     * Trigger Form Submit event
     * @param {*} event 
     */
  
    onFormSubmit(event) {
      event.preventDefault();
    }
  
    /**
     * Search term was changed from other search input, treat it as a user change
    */
    onFocus() {
      const currentSearchTerm = this.getQuery();
      this.html.style.scrollPaddingTop = 'unset';
  
      if (!currentSearchTerm.length) return;
  
      if (this.searchTerm !== currentSearchTerm) {
        this.onChange();
      }else {
        this.getSearchResults(this.searchTerm);
      }
    }

    onBlur() {
      this.html.style.scrollPaddingTop = '';
    }
  
    /**
     * Call Sections APIs for search results
     * @param {*} searchTerm 
     */
    getSearchResults(searchTerm) {
        const searchFields = 'author,body,product_type,tag,title,variants.barcode,variants.sku,variants.title,vendor';
        const queryKey = searchTerm.replace(" ", "-").toLowerCase();
        this.predictiveSearchResults.setAttribute('loading', true);

        if (this.cachedResults[queryKey]) {
            this.renderSearchResults(this.cachedResults[queryKey]);
            return;
        }
  
        fetch(`${window.routes.predictive_searh}?q=${encodeURIComponent(searchTerm)}&resources[options][fields]=${searchFields}&resources[options][limit]=4&resources[limit_scope]=each&section_id=predictive-search`)
        .then((response) => {
          if (!response.ok) {
            var error = new Error(response.status);
            throw error;
          }

          this.predictiveSearchResults.setAttribute('loading', false);
          return response.text();
        })
        .then((text) => {
          const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
          
          this.cachedResults[queryKey] = resultsMarkup;
          this.renderSearchResults(resultsMarkup);
        })
        .catch((error) => {
            this.predictiveSearchResults.setAttribute('loading', false);
            if (error?.code === 20) {
                // Code 20 means the call was aborted
                return;
            }
            throw error;
        });
    }  
  
    /**
     * Render Search results
     * @param {*} resultsMarkup 
     */
    renderSearchResults(resultsMarkup) {
        this.predictiveSearchResults.innerHTML = resultsMarkup;
        this.predictiveSearchResults.setAttribute('loading', false);
        StampedFn?.loadBadges();
        this.showResults();
    }

    /**
     * Show Search results container
     */
    showResults(){
        this.predictiveSearchResults.classList.add('show-results');
    }

    /**
     * Hide Search results container
     */
    hideResults(){
        this.predictiveSearchResults.classList.remove('show-results');
        this.predictiveSearchResults.innerHTML = '';
        this.closeMobileSearch();
    }

    /**
     * Open Mobile Search
     */
    openMobileSearch(event) {
      event.preventDefault();
      this.predictiveSearchWrapper = document.querySelector('.predictive-search-wrapper');
      this.predictiveSearchWrapper.classList.remove('d-none');
      this.showResults();
      this.input.focus();
      document.body.classList.add('scroll-fixed');
    }

    /**
     * Close Mobile Search
     */
    closeMobileSearch() {
      this.predictiveSearchWrapper = document.querySelector('.predictive-search-wrapper');
      this.predictiveSearchWrapper.classList.add('d-none');
      document.body.classList.remove('scroll-fixed');
      this.input.blur();
    }
}
  
customElements.define('predictive-search', PredictiveSearch);
  