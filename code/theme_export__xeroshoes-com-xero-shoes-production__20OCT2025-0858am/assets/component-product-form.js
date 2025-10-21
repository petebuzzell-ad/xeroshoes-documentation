/**
 * Product Form Components
 *
 */
class ProductForm extends HTMLElement {
  constructor() {
    super();

    this.form = this.querySelector('form');
    this.cartElement = document.querySelector('cart-form');
    this.submitButton = this.querySelector('[type="submit"]');
    this.stickySubmitButton = this.querySelector('[data-stickybtn] [type="submit"]');
    this.qtyInput = this.querySelector('[data-qty-input]');

    if (this.dataset.format === 'product-page' && typeof this.querySelector('variant-selects')?.selectCurrentVariantOnLoad === 'function') {
      this.querySelector('variant-selects')?.selectCurrentVariantOnLoad();
    }
  }

  connectedCallback() {
    if (this.dataset.format === 'product-page') {
      let btns = this.form.querySelectorAll('[type="submit"]');
      btns.forEach(btn => {
        btn.addEventListener('click', this.onSubmitHandler.bind(this));
      })
    }else{
    this.form?.addEventListener('submit', this.onSubmitHandler.bind(this));
    }
  }

  updateProductDetails(container, variant) {
    if (!variant) {
      this.toggleAddButton('disable');
      return;
    }
    
    
    this.toggleAddButton('enable', variant.available);
    this.updateURLandID(variant);
    this.priceUpdate(container, variant);
    this.updateImage(container, variant.featured_media, variant);
  }

  /**
   * Render Price details based on current variant
   */
  priceUpdate(container, variant) {
    const priceElement = container.querySelectorAll('[data-currentPrice]');
    if (!priceElement && priceElement.length <= 0) return;
    
    const comparePriceElement = container.querySelectorAll('[data-comparePrice]');
    priceElement.forEach(e => {
      e.textContent = Utility.formatMoney(variant.price, window.globalSpace.money_format);
      if(variant.compare_at_price <= 0 || variant.compare_at_price === variant.price){
        e.classList.remove('text-danger')
      }else{
        e.classList.add('text-danger')
      }
    })
    comparePriceElement.forEach(e => {
      if (e) {
        e.textContent = Utility.formatMoney(variant.compare_at_price, window.globalSpace.money_format);
        e.classList.toggle('d-none', !variant.compare_at_price || variant.compare_at_price <= 0 || variant.compare_at_price === variant.price);
      }
    })

    if(variant.compare_at_price > variant.price){
      const savings = variant.compare_at_price - variant.price;
      const salePriceElem = container.querySelectorAll('[data-saleprice]');
      salePriceElem.forEach(e => {
        if (e) {
           e.classList.remove('d-none');
          e.textContent = Utility.formatMoney(savings, window.globalSpace.money_format);
        }
      })
    }else{
      const salePriceElem = container.querySelectorAll('[data-saleprice]');
      salePriceElem.forEach(e => {
        if (e) {
          e.classList.add('d-none');
        }
      });
    }

  }

  /**
   * Toggle the button based on product availability ( add to cart / soldOut )
   * @param {Text} status enable / disable
   * @param {Boolean} variantAvailable true/false
   */
  toggleAddButton(status, variantAvailable) {
    if (!this.submitButton) return;

    const addText = this.submitButton.querySelector('.add-text');
    if (status === 'disable' || (!variantAvailable)) {
        this.submitButton.setAttribute('disabled', true);
        if (addText) addText.textContent = status === 'disable' ? window.variantStrings.unavailable : window.variantStrings.soldOut;
    } else {
        this.submitButton.removeAttribute('disabled');
        if (addText) addText.textContent = this.form.classList.contains('cart-upsell-form') ? window.variantStrings.upsellAddText : window.variantStrings.addToCart;
    }

    if (!this.stickySubmitButton) return;

    const stickyAddText = this.stickySubmitButton.querySelector('.add-text');
    if (status === 'disable' || (!variantAvailable)) {
        this.stickySubmitButton.setAttribute('disabled', true);
        if (stickyAddText) stickyAddText.textContent = status === 'disable' ? window.variantStrings.unavailable : window.variantStrings.soldOut;
    } else {
        this.stickySubmitButton.removeAttribute('disabled');
        if (stickyAddText) stickyAddText.textContent = this.form.classList.contains('cart-upsell-form') ? window.variantStrings.upsellAddText : window.variantStrings.addToCart;
    }
  }

  /**
   * Update URL on variant change event
   * @param {JSON} currentVariant 
   */
  updateURLandID(currentVariant) {
    
    if (!currentVariant || !this.form) return;

    if (this.dataset.format === 'product-page') window.history.replaceState({}, '', `${this.form.dataset.url}?variant=${currentVariant.id}`);
    this.form.querySelector('input[name="id"]').value = currentVariant.id;
  }

  /**
   * Render selected variant image/slide
   * @param {element} container
   * @param {object} variantMedia
   */
  updateImage(container, variantMedia, currentVariant) {
    if (!variantMedia) {
      if (currentVariant && currentVariant.featured_image) {
        variantMedia = { preview_image: currentVariant.featured_image };
      } else {
        return;
      }
    }

    if (this.updateFeaturedImage(container, variantMedia)) {
      return;
    }
    
    // Try alternative image update method
    if (this.updateImageAlternative(container, variantMedia, currentVariant)) {
      return;
    }
  }

  updateFeaturedImage(container, variantMedia) {
    // Try both case variations of the data attribute
    let imgElem = container.querySelector('[data-feauredImage]');
    if (!imgElem) {
      imgElem = container.querySelector('[data-feauredimage]');
    }
    
    if (!imgElem) {
      // Try to find any image in the container
      const allImages = container.querySelectorAll('img');
      if (allImages.length > 0) {
        imgElem = allImages[0];
      }
    }
    
    if (!imgElem) {
      return false;
    }
    
    if (!variantMedia.preview_image?.src) {
      return false;
    }

    // Ensure the image URL has proper protocol
    let imageUrl = variantMedia.preview_image.src;
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    // Remove lazy loading attributes and classes
    imgElem.removeAttribute('srcset');
    imgElem.removeAttribute('data-src');
    imgElem.removeAttribute('data-srcset');
    imgElem.classList.remove('lozad');
    
    // Update all image attributes to the new image
    imgElem.src = `${imageUrl}&width=850`;
    imgElem.setAttribute('data-src', `${imageUrl}&width=750`);
    
    // Create new srcset with proper protocol
    const newSrcset = `${imageUrl}&width=350 350w,${imageUrl}&width=550 550w,${imageUrl}&width=750 750w,${imageUrl}&width=991 991w,${imageUrl}&width=1200 1200w,${imageUrl}&width=1500 1500w,${imageUrl} 1540w`;
    imgElem.setAttribute('srcset', newSrcset);
    imgElem.setAttribute('data-srcset', newSrcset);
    
    return true;
  }

  /**
   * Alternative image update method for cases where updateFeaturedImage fails
   */
  updateImageAlternative(container, variantMedia, currentVariant) {
    // Try to get image from variant.featured_image if variantMedia doesn't work
    let imageSrc = null;
    if (variantMedia?.preview_image?.src) {
      imageSrc = variantMedia.preview_image.src;
    } else if (currentVariant?.featured_image?.src) {
      imageSrc = currentVariant.featured_image.src;
    }
    
    if (!imageSrc) {
      return false;
    }
    
    // Try multiple selectors to find the image
    const selectors = [
      '[data-feauredimage]',
      '[data-feauredImage]', 
      '[data-featured-image]',
      'img[data-feauredimage]',
      'img[data-feauredImage]',
      '.product-image img',
      '.product--media img',
      'img'
    ];
    
    let imgElem = null;
    for (const selector of selectors) {
      imgElem = container.querySelector(selector);
      if (imgElem) {
        break;
      }
    }
    
    if (!imgElem) {
      return false;
    }
    
    // Ensure the image URL has proper protocol
    let imageUrl = imageSrc;
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    // Remove lazy loading attributes and classes
    imgElem.removeAttribute('srcset');
    imgElem.removeAttribute('data-src');
    imgElem.removeAttribute('data-srcset');
    imgElem.classList.remove('lozad');
    
    // Update all image attributes to the new image
    imgElem.src = `${imageUrl}&width=750`;
    imgElem.setAttribute('data-src', `${imageUrl}&width=750`);
    
    // Create new srcset with proper protocol
    const newSrcset = `${imageUrl}&width=350 350w,${imageUrl}&width=550 550w,${imageUrl}&width=750 750w,${imageUrl}&width=991 991w,${imageUrl}&width=1200 1200w,${imageUrl}&width=1500 1500w,${imageUrl} 1540w`;
    imgElem.setAttribute('srcset', newSrcset);
    imgElem.setAttribute('data-srcset', newSrcset);
    
    return true;
  }

  updateImageSlide(container, variantMedia) {
    const imageSlide = container.querySelector(`[data-productSlider] [data-mediaID="${variantMedia.id}"]`);
    if (!imageSlide) return;

    const slideIndex = Array.from(imageSlide.parentNode.children).indexOf(imageSlide);
    const slider = container.querySelector('[data-productSlider]');
    if (slider?.swiper) {
      slider.swiper.slideTo(slideIndex, 0, false);
    }
  }

  // updateImageSlider(container, variantMedia, currentVariant){
  //   const imageSlides = container.querySelectorAll(`[data-productSlider] [data-mediaID]`);
    
  //   const handleizedOptions = currentVariant.options.map(this.handleize);

  //   imageSlides.forEach(element => {
  //     if(element.querySelector('img')){
  //       let src = element.querySelector('img').src;
  //       src = src.toLowerCase();
  //       const containsKeyword = handleizedOptions.some(keyword => src.includes(keyword));
  //       if(containsKeyword == false){
  //         element.classList.add('d-none')
  //       }else{
  //         element.classList.remove('d-none')
  //       }
  //     }
  //   });
  // }

 


  /**
   * Product Form Submit event
   *
   * @param {evt} Event instance
   */
  onSubmitHandler(evt) {
    evt.preventDefault();

    let currentTarget = evt.currentTarget
    

    if (this.dataset.format === 'product-page' && (evt.currentTarget).tagName == 'BUTTON' && (evt.currentTarget).type == 'submit') {
      Utility.setLoadingState(true, currentTarget);
    }else{
      Utility.setLoadingState(true, this.submitButton);
    }

    const formData = this.prepareFormData();
    const fetchCfg = Utility.fetchConfig('javascript', { body: formData });
    
    fetch(routes.cart_add_url + '.js', {
      ...fetchCfg,
      headers: {
        ...fetchCfg.headers,
        Accept: 'text/html',
      },
    })
    .then((response) => response.json())
    .then((res) => this.handleSubmitResponse(res))
    .catch((e) => Utility.handleError(e))
    .finally(() => {
      if (this.dataset.format === 'product-page' && (currentTarget).tagName == 'BUTTON' && (currentTarget).type == 'submit') {
        Utility.setLoadingState(false, currentTarget);
      }else{
        Utility.setLoadingState(false, this.submitButton)
      }
    });
  }

  prepareFormData() {
    const formData = new FormData(this.form);
    formData.append('sections', `${this.cartElement?.dataset?.sectionId || 'template-cart'}`);
    return formData;
  }

  handleSubmitResponse(res) {
    const dataJSON = ((typeof res == 'object') ? res : JSON.parse(res));

    if (dataJSON.status === 422) {
      Utility.handleError(this.cleanErrorMessage(dataJSON.message), 'Add to Cart');
      return;
    } else if (dataJSON.errors) {
      Utility.handleError(dataJSON.errors, 'Add to Cart');
      return;
    }

    this.handleSubmitSuccess(dataJSON);
  }

  cleanErrorMessage(message) {
    // Remove "Validation failed:" prefix if present
    let msg = message.replace(/^Validation failed:\s*/i, "");

    // Fix duplicates like "Send on Send on ..." → "Send on ..."
    msg = msg.replace(/\b([A-Za-z ]+)\s+\1\b/gi, "$1");

    return msg.trim();
  }

  handleSubmitSuccess(dataJSON) {
    eventBus.publish(PUB_SUB_EVENTS.productATC, {
      data: {
        item: dataJSON,
        sections: dataJSON.sections
      },
    });

    if (this.qtyInput) {
      this.qtyInput.value = this.qtyInput.min || 1;
    }
    
    if (this.cartElement) {
      this.cartElement?._updateCart(dataJSON.sections, this.submitButton);
    } else {
      this.updateCartWithoutElement(dataJSON);
    }
  }

  updateCartWithoutElement(dataJSON) {
    const cartSectionID = this.cartElement?.dataset?.sectionId || 'template-cart';
    let cartHTML = dataJSON.sections[cartSectionID];
    cartHTML = new DOMParser().parseFromString(cartHTML, 'text/html');

    const cartJSONEle = cartHTML.querySelector('[data-cartScriptJSON]');
    window.globalSpace.cart = JSON.parse(cartJSONEle.textContent);

    updateCartCountInHeader();
    Utility.handleSuccess(dataJSON.title, 'Added to Cart');
  }
}

customElements.define('product-form', ProductForm);
