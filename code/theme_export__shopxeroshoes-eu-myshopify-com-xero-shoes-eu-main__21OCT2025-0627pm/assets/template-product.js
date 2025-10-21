const selectors = {
  productContainer: document.querySelector('[data-product-container]')
};

class TemplateProductJS {
  constructor() {
    this.abortController = undefined;
    this.pendingRequestUrl = null;
    this.container = selectors.productContainer;

    // Product page option change event to update dynamic data
    eventBus.subscribe(PUB_SUB_EVENTS.optionChange, (eventData) => {
      const { target, selectedOptionsId } = eventData.data;
      this.handleOptionValueChange(target, selectedOptionsId);
    });

     // Initialize sticky bar functionality
    this.initStickyBar();

    this.updateVideoJSVideoLabel();
  }

  initStickyBar() {
    const stickyBtn = document.querySelector('[data-stickyBtn]');
    const productImagesWrapper = document.querySelector('.product-images-wrapper');
    const productInfo = document.querySelector('.product-info');
    const mainAddToCartBtn = document.querySelector('.product-add-cart');

    if (!stickyBtn || !productImagesWrapper || !productInfo) {
      return;
    }

    let isProductInfoSticky = true;
    let lastScrollTop = 0;

    // Check if main add to cart button is visible
    const isMainAddToCartVisible = () => {
      if (!mainAddToCartBtn) return false;

      const rect = mainAddToCartBtn.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    };

    // Check if we're still in the image scroll area
    const isInImageScrollArea = () => {
      const imagesWrapperRect = productImagesWrapper.getBoundingClientRect();
      const imagesWrapperHeight = productImagesWrapper.scrollHeight;
      const viewportHeight = window.innerHeight;

      // If images wrapper is still visible and has more content to scroll
      return imagesWrapperRect.bottom > 0 && imagesWrapperHeight > viewportHeight;
    };

    // Update sticky bar visibility
    const updateStickyBar = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const isScrollingUp = scrollTop < lastScrollTop;
      lastScrollTop = scrollTop;

      // Handle product-info sticky behavior
      if (isInImageScrollArea()) {
        // We're in the image scroll area, make product-info sticky
        if (!isProductInfoSticky) {
          isProductInfoSticky = true;
          productInfo.style.position = 'sticky';
          productInfo.style.top = '0';
        }
      } else {
        // We're past the image scroll area, make product-info relative
        if (isProductInfoSticky) {
          isProductInfoSticky = false;
          productInfo.style.position = 'relative';
          productInfo.style.top = 'auto';
        }
      }

      // Show sticky bar ONLY when:
      // 1. Main add to cart is not visible AND
      // 2. Not at the top of the page (scrollTop > 10 to account for small scroll amounts)
      const shouldShowStickyBar = !isMainAddToCartVisible();

      if (shouldShowStickyBar) {
        if (stickyBtn.classList.contains('d-none')) {
          stickyBtn.classList.remove('d-none');
        }
        stickyBtn.classList.add('d-block');
        document.body.style.paddingBottom = `${stickyBtn.offsetHeight}px`;
      } else {
        if (stickyBtn.classList.contains('d-block')) {
          stickyBtn.classList.remove('d-block');
        }
        stickyBtn.classList.add('d-none');
        document.body.style.paddingBottom = '0px';
      }
    };

    // Add scroll event listener
    document.addEventListener('scroll', updateStickyBar, { passive: true });

    // Recalculate on window resize
    window.addEventListener('resize', () => {
      updateStickyBar();
    }, { passive: true });

    // Initial check
    updateStickyBar();
  }

  addPreProcessCallback(callback) {
    this.preProcessHtmlCallbacks.push(callback);
  }

  handleOptionValueChange(target, selectedOptionsId){
    if (!this.container.contains(target)) return;

    const productUrl = target.dataset.productUrl || this.container.pendingRequestUrl || this.container.dataset.url;
    this.pendingRequestUrl = productUrl;
    const swapProduct = this.container.dataset.url !== productUrl;
    const fetchFullPage = this.container.dataset.updateUrl === 'true' && swapProduct;

    this.renderProductInfo({
      requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionsId, fetchFullPage),
      targetId: target.id,
      callback: swapProduct
        ? this.handleSwapProduct(productUrl, fetchFullPage)
        : this.handleUpdateProductInfo(productUrl),
    });
  }

  renderProductInfo({ requestUrl, targetId, callback }) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    fetch(requestUrl, { signal: this.abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        this.pendingRequestUrl = null;
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        callback(html);
      })
      .then(() => {
        // set focus to last clicked option value
        document.querySelector(`#${targetId}`)?.focus();
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user');
        } else {
          console.error(error);
        }
      });
  }

  handleSwapProduct(productUrl, updateFullPage) {
    // console.log(productUrl, updateFullPage);
  }

  handleUpdateProductInfo(productUrl){
    return (html) => {
      const productId = this.container.dataset.product;
      const updateSourceFromDestination = (id) => {
        const source = html.querySelector(id);
        const destination = this.container.querySelector(id);

        if (source && destination) {
          destination.innerHTML = source.innerHTML;
          destination.classList.remove('d-none');
        }else{
          destination?.classList.add('d-none')
        }
      };

      updateSourceFromDestination(`#Inventory-${productId}`);
      updateSourceFromDestination(`#Sku-${productId}`);
      updateSourceFromDestination(`#Quantity-${productId}`);
      updateSourceFromDestination(`#Volume-discount-${productId}`);
    }
  }

  buildRequestUrlWithParams(url, optionValues, fetchFullPage = false) {
    const params = [];
    !fetchFullPage && params.push(`section_id=${this.container.dataset.section}`);
    if (optionValues.length) {
      params.push(`option_values=${optionValues.join(',')}`);
    }
    return `${url}?${params.join('&')}`;
  }

  updateVideoJSVideoLabel() {
    document.querySelectorAll('.preview-gif').forEach((el, idx) => {
      if (typeof videojs(el.dataset.target)) {
        const player = videojs(el.dataset.target);
        player?.ready(function () {
          this.el().setAttribute('aria-label', 'Video Player ' + (idx + 1));
        });
      }
    });
  }
}

typeof TemplateProductJS !== 'undefined' && new TemplateProductJS();

// Regex to extract YouTube id from many URL formats or return the string if it already looks like an id
  function extractYouTubeID(input) {
    if (!input) return null;
    input = String(input).trim();
    // if it already looks like an ID (alphanumeric, - or _, ~ 11+ chars), return cleaned
    const maybeId = input.replace(/[^A-Za-z0-9_-]/g, '');
    if (maybeId.length >= 8 && maybeId.length <= 20) return maybeId; // loose check
    // try to extract from common URL forms
    const regex = /(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/i;
    const m = input.match(regex);
    return m ? m[1] : null;
  }

  // Preload and pick first usable thumbnail among candidates
  function preloadAndSet(id, imgEl) {
    const variants = [
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${id}/sddefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    ];

    let i = 0;
    function tryNext() {
      if (i >= variants.length) {
        // all failed — hide or set a placeholder
        imgEl.src = variants[variants.length - 1]; // last-resort
        return;
      }
      const testUrl = variants[i++];
      const tester = new Image();
      tester.onload = function () {
        // YouTube sometimes returns a tiny placeholder image instead of a 404.
        // treat images <=120px wide as placeholders and keep trying.
        if (tester.naturalWidth > 120 || testUrl.endsWith('hqdefault.jpg')) {
          imgEl.src = testUrl;
        } else {
          tryNext();
        }
      };
      tester.onerror = function () {
        tryNext();
      };
      tester.src = testUrl;
    }
    tryNext();
  }

  // Apply to all images with class "yt-thumb"
  document.querySelectorAll('img.yt-thumb').forEach(function(img) {
    // get id from data attribute or data-video-url or current src
    let raw = img.dataset.videoId || img.dataset.videoUrl || img.getAttribute('data-src') || img.getAttribute('src') || '';
    const id = extractYouTubeID(raw);

    if (!id) {
      // nothing valid — hide image or set a generic placeholder
      img.style.display = 'none';
      return;
    }

    // sanitize the id strictly (only allowed chars)
    const cleanId = String(id).trim().replace(/[^A-Za-z0-9_-]/g, '');

    // preload best available thumbnail and then set the <img> src
    preloadAndSet(cleanId, img);
  });

  (() => {
    const mainContent = document.querySelector('#MainContent');
    if (!mainContent) return;
  
    const checkSections = () => {
      mainContent.querySelectorAll('.shopify-section').forEach(section => {
        const isHidden = section.offsetHeight === 0 || section.offsetParent === null;
        section.classList.toggle('no-data-height', isHidden);
      });
    };
  
    // Debounce helper for performance
    const debounce = (fn, delay = 150) => {
      let timer;
      return () => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      };
    };
  
    const debouncedCheck = debounce(checkSections);
  
    // Initial + safe load check
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkSections);
    } else {
      checkSections();
    }
    window.addEventListener('load', checkSections);
  
    // Recheck on resize/orientation
    window.addEventListener('resize', debouncedCheck);
    window.addEventListener('orientationchange', debouncedCheck);
  
    // Observe DOM + style/class changes
    new MutationObserver(debouncedCheck).observe(mainContent, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  })();
  
