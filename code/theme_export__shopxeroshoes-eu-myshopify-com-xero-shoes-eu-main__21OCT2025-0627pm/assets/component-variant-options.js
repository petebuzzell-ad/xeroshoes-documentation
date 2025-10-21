/* eslint-disable class-methods-use-this */
/**
 * Dropdown selection for options
 */
class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.formParent = this.closest('product-form');
    this.form = this.formParent.querySelector('form') || null;
    this.formType = this.formParent.dataset.format || null;
    this.variant_json = this.querySelector('[data-variantJSON]');
    this.variantdraft_json = this.querySelector('[data-variantjsondraft]');
    this.variantsformselector = this.querySelector('[data-main-variants-selects]')
    this.commonvarianthandle = '';

    this.submitbtns = this.form.querySelectorAll('button[type="submit"]');

    // Only initialize allSlides for product pages, not product cards
    if (this.formType === 'product-page') {
      this.allSlides = Array.from(document.querySelectorAll("[data-productSlider] [data-mediaID]"));
    }

    this.container = this.formType === 'product-card' ? this.closest('[data-product-card]') : this.closest('[data-product-container]');

    if(this.formType === 'product-card'){
      this.checkfieldsets();
      window.addEventListener('resize', () => {
        this.checkfieldsets();
      });
    }
  }

  checkfieldsets(){
    let allfieldsets = this.querySelectorAll('fieldset.other-swatch');
    let totalheight = 0;
    if(allfieldsets.length > 1){
      allfieldsets.forEach((fieldset, index, array) => {
        // if (index !== array.length - 1) {
          let fieldsetheight = fieldset.offsetHeight;
          if(index != 0){
            fieldset.style.top = 'calc(100% + ' + totalheight + 'px' + ' - 15px';
            totalheight += fieldsetheight;
          }else{
            totalheight += fieldsetheight;
          }
          if (index == array.length - 1) {
            totalheight = 0;
          }
      });
    }
  }

  connectedCallback() {
    // this.updateSwatchLabel();
    if (this.formType === 'product-page') {
      this.onVariantChange('load');
    } else if (this.formType === 'product-card') {
      // For product cards, we need to set the current variant first
      this.setCurrentVariant();
    }
    if (this.formType === 'product-page'){
      this.switchslider(this.currentVariant);
      
      // this.updateImageSlider(this.currentVariant);
    }
    
    // Initialize draft variants on page load for both product-page and product-card
    setTimeout(() => {
      this.draftvariants(this.currentVariant);
    }, 100);
    setTimeout(() => {
      this.draftafterselected();
    }, 200);

    this.addEventListener('change', (evt) => {
      // Prevent default behavior that might cause page jumping
      evt.preventDefault();
      
      // Mark that this is a user-initiated change
      this._userInitiatedChange = true;
      
      const target = this.getInputForEventTarget(evt.target);
      eventBus.publish(PUB_SUB_EVENTS.optionChange, {
        data: {
          target,
          selectedOptionsId: this.optionValues,
        }
      });
      if (this.formType === 'product-card'){
        this.onVariantChange();
      }
      // Use requestAnimationFrame to ensure smooth execution
      requestAnimationFrame(() => {
        this.onVariantChange();
      });
      
      // Reset the flag after a short delay
      setTimeout(() => {
        this._userInitiatedChange = false;
      }, 100);
    });
  }


  updateSwatchLabel(){
    const colorSwatchContainer = this.querySelector('.color-swatch');
    if(colorSwatchContainer){
      const colorSwatches = colorSwatchContainer.querySelectorAll('.swatch');
      colorSwatches.forEach(swatch => {
        const colorHandle = swatch.querySelector('input[type="radio"]').dataset.handle;
        const swatchStyle = Utility.getSwatchStyle(colorHandle);
        swatch.querySelector('.swatch-label').setAttribute('style', swatchStyle);
      });
    }
  }

  /**
   * Trigger this function variant is changed
   */
  onVariantChange() {
    
    // Preserve scroll position
    const scrollPosition = window.pageYOffset;
    
    this.setCurrentVariant();
    this.updateOptionLabel(this.container);

    eventBus.publish(PUB_SUB_EVENTS.variantChange, {
      data: {
        container: this.container,
        variant: this.currentVariant,
      },
    });

    if(this.container.hasAttribute('data-product-card')){
      const productLink = this.container.querySelectorAll('[data-product-link]');
      productLink.forEach(link => {
        // Add variant ID as URL parameter to open the specific variant
        const baseUrl = link.href.split('?')[0]; // Remove existing query parameters
        const variantId = this.currentVariant.id;
        link.href = `${baseUrl}?variant=${variantId}`;
      });
    }

    

    if (this.formType === 'product-page' && this.currentVariant) {
      globalSpace.product.currentVariant = this.currentVariant;
    }
    
    
    if(typeof this.formParent?.updateProductDetails == 'function'){
      this.formParent.updateProductDetails(this.container, this.currentVariant);
    }
    

    // Always call toggleAddVariantButton for draft variant logic
    this.toggleAddVariantButton(this.currentVariant);
    
    // Restore scroll position if it changed
    if (window.pageYOffset !== scrollPosition) {
      window.scrollTo(0, scrollPosition);
    }
    
    if (this.formType === 'product-page'){
      this.switchslider(this.currentVariant);

    }
   
    if (event) {
      let targetOption = event.target.dataset.option ?? null;
      let targetOnlyOneOption = event.target.dataset.onlyOneOption ?? null;
      if (targetOption && (targetOption.includes("style") || targetOption.includes("color")) || targetOnlyOneOption == "true") {
        if (this.formType === 'product-page'){
          this.switchslider(this.currentVariant);
        }
      } else {
        if (this.formType == 'product-card' && this.currentVariant) {
          this.formParent.onSubmitHandler({
            target: this.form,
            currentTarget: this.form,
            preventDefault: () => {},
            stopPropagation: () => {},
          });
          if (this.currentVariant.option2) {
            const option2 = this.currentVariant.option2;
            const input2 = this.querySelector(`input[value="${CSS.escape(option2)}"]`);
            if (input2) {
              input2.checked = false;
            }
          }

          if (this.currentVariant.option3) {
            const option3 = this.currentVariant.option3;
            const input3 = this.querySelector(`input[value="${CSS.escape(option3)}"]`);
            if (input3) {
              input3.checked = false;
            }
          }
        }
        this.toggleAddVariantButton(this.currentVariant);
      }
    }

    this.draftafterselected();
    
  }

  get selectedOptionValues() {
    const radioChecked = this.querySelectorAll('fieldset .swatch:not(.color-swatch) input[type="radio"]:checked');
    
    if (radioChecked.length > 0) {
      const values = Array.from(this.querySelectorAll('select.variant_selector, fieldset input[type="radio"]:checked')).map(({ value }) => value);
      return values;
    } else {
      const values = Array.from(this.querySelectorAll('select.variant_selector, fieldset input[type="radio"]:checked, fieldset input[type="radio"][data-checked="true"]')).map(({ value }) => value);
      return values;
    }
  }

  draftafterselected(){
    let selectedoptionfromdom = this.querySelectorAll('.swatch.color-swatch');
    if(selectedoptionfromdom.length > 0){
    let selectedcolorele = this.querySelector('.swatch.color-swatch input[type="radio"]:checked').value;
    if(selectedoptionfromdom.length > 0 && this.currentVariant){
      let checkfornextavail = false;
      let oldindex = 0
      selectedoptionfromdom.forEach((element,index) => {
        let selectedcolor = this.currentVariant.option1.toLowerCase();
        let elecolor = element.querySelector('input[type="radio"]').value.toLowerCase();
        if(selectedcolorele.toLowerCase() == elecolor && element.classList.contains('d-none') == true){
          checkfornextavail = true;
          oldindex = index;
        }
        if(checkfornextavail == true){
          selectedoptionfromdom[index + 1].querySelector('input[type="radio"]').checked = true;
          selectedoptionfromdom[index + 1].querySelector('input[type="radio"]').dispatchEvent(new Event('change', { bubbles: true }));
          checkfornextavail = false;
        }
        
      });
    }
    }
  }

  /**
   * change value of currentVariant when variant being changed 
   */
  setCurrentVariant() {
    this.currentVariant = false;
    const options = this.selectedOptionValues;

    const variants = this._getVariantData();

    variants.find(variant => {
        if (variant.options.every((option, i) => options[i] === option)) {
          this.currentVariant = variant;
        }
    });
    
    if (!this.currentVariant) {
    }
  }

slugifyarray(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")        // Replace spaces with -
      .replace(/[^\w\-]+/g, "")    // Remove all non-word chars
      .replace(/\-\-+/g, "-");     // Replace multiple - with single -
  }

  switchslider(currentVariant){
    console.log('mm0msa')
    if (!currentVariant) {
      return;
    }
    if(document.querySelector('.swiper-wrapper__custom--main'))
    {
      let checkattributegallary = document.querySelector('.swiper-wrapper__custom--main').getAttribute('data-attributegallarypdp');
      if(checkattributegallary == true || checkattributegallary == 'true'){


        let slugsvar = (this.slugifyarray(currentVariant.option1));
        let domcheck = document.querySelector(".swiper-wrapper__custom swiper-container").getAttribute('data-pdp-slider')
        
        if(domcheck != slugsvar){
        const url = `${window.location.pathname}?variant=${currentVariant.id}`;
        const section_id = document.querySelector('[data-product-container]')?.dataset.section;
        console.log('section_id',section_id)
        if (!section_id) return;
        fetch(`${url}&section_id=${section_id}`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          console.log('ds',document.querySelector(".swiper-wrapper__custom"))
          if(document.querySelector(".swiper-wrapper__custom") != null){
            document.querySelector(".swiper-wrapper__custom").innerHTML = html.querySelector(".swiper-wrapper__custom").innerHTML;
            let slidervar = document.querySelector(".swiper-wrapper__custom [data-pdp-slider]");
            lazyImageObserver.observe();
            
            // let lazyImageObserver;
            // if(typeof lozad == 'function'){
            //     lazyImageObserver = lozad('.lozad', {
            //         rootMargin: '50px 0px',
            //         enableAutoReload: true
            //     });
            //     lazyImageObserver.observe();
            // }
            // slidervar.classList.remove('d-none');
          }
        })
        .catch((error) => {
          console.error('Error updating product details:', error);
        });
      }
    }
    }
  }


  switchsliderOLD(currentVariant){
    if (!currentVariant) {
      return;
    }
    if(document.querySelector('.swiper-wrapper__custom--main'))
    {
      let checkattributegallary = document.querySelector('.swiper-wrapper__custom--main').getAttribute('data-attributegallarypdp');

      if(checkattributegallary == true || checkattributegallary == 'true'){
        const lowercased = currentVariant.options.map(item => item.toLowerCase());
        const slugsvar = currentVariant.options.map(this.slugifyarray);
        
        const sliderelements = document.querySelectorAll('.swiper-wrapper__custom--main swiper-container');
        sliderelements.forEach(sliderele => {
          let slidervar = sliderele.getAttribute('data-pdp-slider');
          if (slugsvar.includes(slidervar)) {
            sliderele.classList.remove('d-none');
          }else{
            sliderele.classList.add('d-none');
          }
          const swiper = sliderele.swiper;
          // swiper.update();
          // Commented out slideTo to prevent scroll issues
          // swiper.slideTo(0, 0, false);
        });
      }
    }
  }


  updateImageSlider(currentVariant) {
    if (!currentVariant || !currentVariant.sku) {
      return;
    }

    let currentsku = currentVariant.sku;
    let commonsku = currentsku.substring(0, currentsku.lastIndexOf("-"));
    let commonvarianthandle = this.handleize(this.slugify(currentVariant.option1));

    // Only update if SKU actually changes
    if (commonvarianthandle !== this.commonvarianthandle) {
      const swiperContainer = document.querySelector("[data-productSlider]");
      if (!swiperContainer || !swiperContainer.swiper) return;

      const swiper = swiperContainer.swiper;
      let allSlides = this.allSlides;
      if (allSlides == null) {
        allSlides = Array.from(document.querySelectorAll("[data-productSlider] [data-mediaID]"));
      }

      // Filter only matching slides
      const matchingSlides = allSlides.filter(element => {
        const img = element.querySelector("img");
        if (!img) return false;

        const src = img.src.toLowerCase();
        const alt = (img.alt || "").toLowerCase();

        return (alt == (commonvarianthandle.toLowerCase()) || alt == ('global_gallery') || src.includes(commonsku.toLowerCase()));
      });

      // Rebuild swiper with only matching slides
      swiper.removeAllSlides();
      if (matchingSlides.length > 0) {
        swiper.appendSlide(matchingSlides.map(slide => slide.outerHTML));
      } else {
        // show allslides if no matching slides
        swiper.appendSlide(allSlides.map(slide => slide.outerHTML));
      }

      // Update swiper
      swiper.update();

      // Commented out slideTo to prevent scroll issues
      // swiper.slideTo(0, 0, false);

      setTimeout(() => {
        // Reset scrollbar position if it exists
        if (swiper.scrollbar && swiper.scrollbar.el) {
          swiper.scrollbar.setTranslate(0);
          swiper.scrollbar.updateSize();
          if (swiper.scrollbar.dragEl) {
            swiper.scrollbar.dragEl.style.transform = "translate3d(0px, 0px, 0px)";
          }
        }
      }, 50);

      this.commonvarianthandle = commonsku;
    }
  }

  handleize(str) {
    return str
      .toLowerCase()                // Convert to lowercase
      .replace(/[\s_]+/g, '-')      // Replace spaces/underscores with hyphens
      .replace(/[^a-z0-9-]/g, '')   // Remove non-alphanumeric except hyphen
      .replace(/^-+|-+$/g, '');     // Trim leading/trailing hyphens
  }

  slugify(str) {
    return str
      .toLowerCase()                     // Convert to lowercase
      .trim()                            // Remove leading/trailing spaces
      .replace(/[^a-z0-9\s-]/g, '')      // Remove special chars
      .replace(/\s+/g, '-')              // Replace spaces with -
      .replace(/-+/g, '-');              // Remove multiple -
  }

  /**
   * Update selected option name label
   */
  updateOptionLabel(form){
    form.querySelectorAll('[data-optionindex]').forEach(option => {
      const label = option.querySelector('.selected-option');
      if(label) label.textContent = this.currentVariant[`option${option.dataset.optionindex}`];
    });
  }

  /**
   * Store the all the variants json
   */
  _getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.variant_json.textContent);
    return this.variantData;
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }
  
  get optionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }

  draftvariants(currentVariant) {
    // Prevent infinite loops
    if (this._isUpdatingDraftVariants) {
      return;
    }
    this._isUpdatingDraftVariants = true;
    
    // Store overflow indicators state before processing
    const overflowIndicators = this.querySelectorAll('[data-overflow-indicator]');
    const overflowStates = Array.from(overflowIndicators).map(indicator => {
      const wasVisible = !indicator.classList.contains('d-none') && indicator.style.display !== 'none';
      return {
        element: indicator,
        wasVisible
      };
    });
    
    const variants = this._getVariantData();
    const options = this.selectedOptionValues;
    
    // Get draft variant IDs from the existing JSON
    let draftVariantIds = [];
    if (this.variantdraft_json && this.variantdraft_json.textContent) {
      const draftJsonText = this.variantdraft_json.textContent.trim();
      if (draftJsonText) {
        draftVariantIds = draftJsonText.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
    } else {
      
    }
    
    // Get all unique option values for each option
    const option1Values = [...new Set(variants.map(v => v.option1))];
    const option2Values = [...new Set(variants.map(v => v.option2).filter(Boolean))];
    const option3Values = [...new Set(variants.map(v => v.option3).filter(Boolean))];
    
    // Check if we have 2 or 3 options
    const hasOption2 = option2Values.length > 0;
    const hasOption3 = option3Values.length > 0;
    
    // Check which variants are draft
    variants.forEach(variant => {
      const isDraft = draftVariantIds.includes(variant.id);
    });
    
    // For Option 1: Hide if ALL variants with this option1 have draft_variant = true
    option1Values.forEach(option1Value => {
      const variantsWithOption1 = variants.filter(v => v.option1 === option1Value);
      const allDraft = variantsWithOption1.every(v => draftVariantIds.includes(v.id));
      
      const option1Input = this.querySelector(`input[value="${CSS.escape(option1Value)}"]`);
      if (option1Input) {
        const swatch = option1Input.closest('.swatch');
        // Don't hide the overflow indicator
        if (swatch && !swatch.closest('[data-overflow-indicator]')) {
          if (allDraft) {
            swatch.classList.add('d-none');
          } else {
            swatch.classList.remove('d-none');
          }
        }
      }
    });
    
    // For Option 2: Hide specific values if they have draft_variant = true
    if (hasOption2) {
      option2Values.forEach(option2Value => {
        const variantsWithOption2 = variants.filter(v => v.option2 === option2Value);
        const allDraft = variantsWithOption2.every(v => draftVariantIds.includes(v.id));
        
        const option2Input = this.querySelector(`input[value="${CSS.escape(option2Value)}"]`);
        if (option2Input) {
          const swatch = option2Input.closest('.swatch');
          // Don't hide the overflow indicator
          if (swatch && !swatch.closest('[data-overflow-indicator]')) {
            if (allDraft) {
              swatch.classList.add('d-none');
            } else {
              swatch.classList.remove('d-none');
            }
          }
        }
      });
    }
    
    // For Option 3: Hide specific values if they have draft_variant = true
    if (hasOption3) {
      option3Values.forEach(option3Value => {
        const variantsWithOption3 = variants.filter(v => v.option3 === option3Value);
        const allDraft = variantsWithOption3.every(v => draftVariantIds.includes(v.id));
        
        const option3Input = this.querySelector(`input[value="${CSS.escape(option3Value)}"]`);
        if (option3Input) {
          const swatch = option3Input.closest('.swatch');
          // Don't hide the overflow indicator
          if (swatch && !swatch.closest('[data-overflow-indicator]')) {
            if (allDraft) {
              swatch.classList.add('d-none');
            } else {
              swatch.classList.remove('d-none');
            }
          }
        }
      });
    }
    
    // Handle cascading logic: if option1 is selected, hide option2/option3 values that don't have available variants
    if (options.length > 0 && options[0]) {
      const selectedOption1 = options[0];
      const variantsWithSelectedOption1 = variants.filter(v => v.option1 === selectedOption1);
      
      if (hasOption2) {
        let currentOption2Selected = options.length > 1 ? options[1] : null;
        let currentOption2Available = false;
        
        // First, hide/show all option2 values
        option2Values.forEach(option2Value => {
          const hasAvailableVariant = variantsWithSelectedOption1.some(v => 
            v.option2 === option2Value && !draftVariantIds.includes(v.id)
          );
          
          const option2Input = this.querySelector(`input[value="${CSS.escape(option2Value)}"]`);
          if (option2Input) {
            const swatch = option2Input.closest('.swatch');
            // Don't hide the overflow indicator
            if (swatch && !swatch.closest('[data-overflow-indicator]')) {
              if (!hasAvailableVariant) {
                swatch.classList.add('d-none');
              } else {
                swatch.classList.remove('d-none');
                // Check if current selected option2 is still available
                if (option2Value === currentOption2Selected) {
                  currentOption2Available = true;
                }
              }
            }
          }
        });
        
        // Get all available option2 values for the selected option1
        const availableOption2Values = option2Values.filter(option2Value => {
          const hasAvailableVariant = variantsWithSelectedOption1.some(v => 
            v.option2 === option2Value && !draftVariantIds.includes(v.id)
          );
          return hasAvailableVariant;
        });
        
        // Only auto-select if current option2 is not available AND it's not a user-initiated change
        if (availableOption2Values.length > 0 && currentOption2Selected && !currentOption2Available && !this._userInitiatedChange) {
          const firstAvailableOption2 = availableOption2Values[0];
          const firstOption2Input = this.querySelector(`input[value="${CSS.escape(firstAvailableOption2)}"]`);
          if (firstOption2Input) {
            // Set checked state without triggering click to avoid page jumping
            firstOption2Input.checked = true;
            firstOption2Input.setAttribute('checked', 'true');
            
            // Trigger variant change after a small delay, but prevent multiple rapid calls
            if (!this._pendingVariantUpdate) {
              this._pendingVariantUpdate = true;
              setTimeout(() => {
                this.onVariantChange();
                this._pendingVariantUpdate = false;
              }, 10);
            }
          }
        }
      }
      
      if (hasOption3 && options.length > 1 && options[1]) {
        const selectedOption2 = options[1];
        const variantsWithSelectedOptions = variantsWithSelectedOption1.filter(v => v.option2 === selectedOption2);
        let currentOption3Selected = options.length > 2 ? options[2] : null;
        let currentOption3Available = false;
        
        // First, hide/show all option3 values
        option3Values.forEach(option3Value => {
          const hasAvailableVariant = variantsWithSelectedOptions.some(v => 
            v.option3 === option3Value && !draftVariantIds.includes(v.id)
          );
          
          const option3Input = this.querySelector(`input[value="${CSS.escape(option3Value)}"]`);
          if (option3Input) {
            const swatch = option3Input.closest('.swatch');
            // Don't hide the overflow indicator
            if (swatch && !swatch.closest('[data-overflow-indicator]')) {
              if (!hasAvailableVariant) {
                swatch.classList.add('d-none');
              } else {
                swatch.classList.remove('d-none');
                // Check if current selected option3 is still available
                if (option3Value === currentOption3Selected) {
                  currentOption3Available = true;
                }
              }
            }
          }
        });
        
        // Get all available option3 values for the selected option1/option2 combination
        const availableOption3Values = option3Values.filter(option3Value => {
          const hasAvailableVariant = variantsWithSelectedOptions.some(v => 
            v.option3 === option3Value && !draftVariantIds.includes(v.id)
          );
          return hasAvailableVariant;
        });
        
        // Only auto-select if current option3 is not available AND it's not a user-initiated change
        if (availableOption3Values.length > 0 && currentOption3Selected && !currentOption3Available && !this._userInitiatedChange) {
          const firstAvailableOption3 = availableOption3Values[0];
          const firstOption3Input = this.querySelector(`input[value="${CSS.escape(firstAvailableOption3)}"]`);
          if (firstOption3Input) {
            
            // Set checked state without triggering click to avoid page jumping
            firstOption3Input.checked = true;
            firstOption3Input.setAttribute('checked', 'true');
            
            // Trigger variant change after a small delay, but prevent multiple rapid calls
            if (!this._pendingVariantUpdate) {
              this._pendingVariantUpdate = true;
              setTimeout(() => {
                this.onVariantChange();
                this._pendingVariantUpdate = false;
              }, 10);
            }
          }
        }
      }
    }
    
    // Reset the flag
    this.variantsformselector.style.opacity = 1;
    this.submitbtns.forEach(btn => {
      btn.classList.remove('disabled');
    })
    this._isUpdatingDraftVariants = false;
    
    // Restore overflow indicators to their previous state
    overflowStates.forEach(({ element, wasVisible }) => {
      if (wasVisible) {
        element.classList.remove('d-none');
        element.style.display = '';
      }
    });
    
    // Dispatch custom event when draft variant processing is complete
    const event = new CustomEvent('draft-variants-processed', {
      detail: { container: this }
    });
    document.dispatchEvent(event);
    
    // Check overflow for this specific container after draft variants are processed
    // Use setTimeout to ensure DOM updates are complete
    setTimeout(() => {
      // Check overflow indicator count and show/hide accordingly
      const overflowIndicator = this.querySelector('[data-overflow-indicator]');
      if (overflowIndicator) {
        const remainingCountElement = overflowIndicator.querySelector('[data-remaining-count]');
        const count = remainingCountElement ? parseInt(remainingCountElement.textContent) : 0;
        
        if (count > 0) {
          overflowIndicator.classList.remove('d-none');
          overflowIndicator.classList.add('show');
          overflowIndicator.style.display = '';
        } else {
          overflowIndicator.classList.add('d-none');
          overflowIndicator.classList.remove('show');
          overflowIndicator.style.display = 'none !important';
        }
      }
      
      // Only recalculate if not already processed
      if (!this.hasAttribute('data-overflow-processed')) {
        this.checkOverflowForContainer();
      }
    }, 50);
  }
  
  /**
   * Check overflow for color swatches in this container
   */
  checkOverflowForContainer() {
    const container = this;
    const inner = container.querySelector('.color-swatch-list') || container.querySelector('[data-swatch-container]');
    
    if (!inner || inner.children.length === 0) {
      return;
    }
    
    // Check if overflow has already been processed for this container
    if (container.hasAttribute('data-overflow-processed')) {
      return;
    }
    
    // Skip if this is on the main product page (not a product card)
    if (container.closest('.product-form') && !container.closest('product-form[data-format="product-card"]')) {
      return;
    }
    
    const containerWidth = inner.offsetWidth;
    if (containerWidth < 100) {
      return;
    }
    
    let overflowIndicator = container.querySelector('[data-overflow-indicator]');
    
    // Create overflow indicator if it doesn't exist
    if (!overflowIndicator) {
      const productForm = container.closest('product-form');
      const productUrl = productForm ? productForm.getAttribute('data-product-url') || '#' : '#';
      
      overflowIndicator = document.createElement('li');
      overflowIndicator.className = 'swatch-overflow-indicator d-none';
      overflowIndicator.setAttribute('data-overflow-indicator', '');
      // Don't set inline style - let CSS handle it
      
      overflowIndicator.innerHTML = `
        <div class="swatch overflow-swatch">
          <a href="${productUrl}" class="swatch-label overflow-label d-flex align-items-center justify-content-center" title="View all color options">
            <span class="">+<span data-remaining-count>0</span></span>
          </a>
        </div>
      `;
      
      inner.appendChild(overflowIndicator);
    }
    
    // Count total visible swatches first
    let totalSwatches = 0;
    Array.from(inner.children).forEach(child => {
      if (child.hasAttribute('data-overflow-indicator')) {
        return; // Skip the overflow indicator itself
      }
      
      // Check if this li element should be counted
      const isLiHidden = child.classList.contains('d-none') || 
                        child.style.display === 'none' || 
                        child.offsetWidth === 0;
      
      if (!isLiHidden) {
        // Check if the inner color-swatch is hidden
        const colorSwatch = child.querySelector('.color-swatch');
        const isSwatchHidden = colorSwatch && (
          colorSwatch.classList.contains('d-none') ||
          colorSwatch.style.display === 'none' ||
          getComputedStyle(colorSwatch).display === 'none'
        );
        
        if (!isSwatchHidden) {
          totalSwatches++;
        }
      }
    });
    
    // Ensure overflow indicator is not hidden before processing
    if (overflowIndicator) {
      overflowIndicator.classList.remove('d-none');
      overflowIndicator.style.display = '';
    }
    
    // Now calculate how many actually fit in the container and hide overflow elements
    let finalVisibleSwatches = 0;
    let contentWidth = 0;
    // Reserve space for overflow indicator - use mobile size on small screens
    const isMobile = window.innerWidth <= 768;
    const overflowIndicatorWidth = overflowIndicator ? (isMobile ? 30 : 35) : 0;
    
    Array.from(inner.children).forEach(child => {
      if (child.hasAttribute('data-overflow-indicator')) {
        return; // Skip the overflow indicator itself
      }
      
      // Check if this li element should be counted
      const isLiHidden = child.classList.contains('d-none') || 
                        child.style.display === 'none' || 
                        child.offsetWidth === 0;
      
      if (!isLiHidden) {
        // Check if the inner color-swatch is hidden
        const colorSwatch = child.querySelector('.color-swatch');
        const isSwatchHidden = colorSwatch && (
          colorSwatch.classList.contains('d-none') ||
          colorSwatch.style.display === 'none' ||
          getComputedStyle(colorSwatch).display === 'none'
        );
        
        if (!isSwatchHidden) {
          const childWidth = child.offsetWidth;
          const margin = parseFloat(getComputedStyle(child).marginRight) || 0;
          const totalChildWidth = childWidth + margin;
          
          // Check if adding this child would exceed container width (including overflow indicator)
          // Add extra buffer to ensure the overflow indicator doesn't get cut off on mobile
          const buffer = isMobile ? 15 : 8; // More buffer on mobile devices
          if (contentWidth + totalChildWidth + overflowIndicatorWidth + buffer > containerWidth) {
            // This child would cause overflow, hide it
            child.style.display = 'none';
            child.classList.add('d-none');
            return;
          }
          
          // Show this child (in case it was previously hidden)
          child.style.display = '';
          child.classList.remove('d-none');
          contentWidth += totalChildWidth;
          finalVisibleSwatches++;
        }
      }
    });
    
    // Ensure overflow indicator is not affected by the above processing
    if (overflowIndicator) {
      overflowIndicator.classList.remove('d-none');
      overflowIndicator.style.display = '';
    }
    
    const remainingCount = totalSwatches - finalVisibleSwatches;
    
    if (remainingCount > 0) {
      overflowIndicator.classList.remove('d-none');
      overflowIndicator.classList.add('show');
      overflowIndicator.style.display = ''; // Remove inline style that has !important
      
      const remainingCountElement = overflowIndicator.querySelector('[data-remaining-count]');
      if (remainingCountElement) {
        remainingCountElement.textContent = remainingCount;
      }
    } else {
      // Hide the overflow indicator completely when there are no remaining swatches
      overflowIndicator.classList.add('d-none');
      overflowIndicator.classList.remove('show');
      overflowIndicator.style.display = 'none !important'; // Force hide with !important
      
      // Also reset the count to 0
      const remainingCountElement = overflowIndicator.querySelector('[data-remaining-count]');
      if (remainingCountElement) {
        remainingCountElement.textContent = '0';
      }
    }
    
    // Mark this container as processed to prevent future recalculations
    container.setAttribute('data-overflow-processed', 'true');
  }

  /**
   * Check overflow for all product card containers
   */
  static checkAllOverflows() {
    // Try with :has() selector first, then fallback
    let containers = document.querySelectorAll('product-form[data-format="product-card"] fieldset:has(.color-swatch-list)');
    if (containers.length === 0) {
      // Fallback for browsers that don't support :has()
      containers = document.querySelectorAll('product-form[data-format="product-card"] fieldset');
      containers = Array.from(containers).filter(fieldset => fieldset.querySelector('.color-swatch-list'));
    }
    
    containers.forEach(container => {
      const variantOptions = container.closest('product-form')?.querySelector('variant-options');
      if (variantOptions && variantOptions.checkOverflowForContainer) {
        variantOptions.checkOverflowForContainer();
      }
    });
  }

  /**
   * Toggle add to cart variant button status
   * @param {string} status - 'disable' or 'enable'
   */
  toggleAddVariantButton(currentVariant) {
    const options = this.selectedOptionValues;
    const variants = this._getVariantData();
    
    // Always run draft variants logic to handle hide/show
    if (currentVariant) {
      this.draftvariants(currentVariant);
    }

    if (options.length > 1) {
      let allSwatches = this.querySelectorAll('[data-optionindex="2"] .swatch input[type="radio"], [data-optionindex="3"] .swatch input[type="radio"]');
      if (allSwatches.length > 0) {
        allSwatches.forEach(swatch => {
          // swatch.disabled = true;
          swatch.setAttribute('data-disabled', 'true');
        });
      }
    }

    const selectedVariantOtherOptions = variants.filter(variant => variant.option1 === options[0]);

    selectedVariantOtherOptions.forEach(variant => {
      const { option2, option3, available } = variant;

      if (option2) {
        const input2 = this.querySelector(`input[value="${CSS.escape(option2)}"]`);
        if (input2) {
          // input2.disabled = !available;
          input2.setAttribute('data-disabled', !available);
        }
      }

      if (option3) {
        const input3 = this.querySelector(`input[value="${CSS.escape(option3)}"]`);
        if (input3) {
          // input3.disabled = !available;
          input3.setAttribute('data-disabled', !available);
        }
      }
    });

    // If variant is unavailable, switch to the first available variant
    if(!this.currentVariant) {
      
      this.unavailableSelectedSwatches = this.querySelectorAll('fieldset input[type="radio"][data-disabled="true"]:checked, fieldset input[type="radio"][data-checked="true"][data-disabled="true"]');
      if(this.unavailableSelectedSwatches.length > 0) {
        this.unavailableSelectedSwatches.forEach(swatch => {
          if (this.formType == 'product-card') {
            swatch.dataset.checked = false;
            swatch.removeAttribute('data-checked');
            if(swatch.closest('[data-optionindex]').querySelector('input[type="radio"]:not([data-disabled="true"]):not(:disabled)')){
              swatch.closest('[data-optionindex]').querySelector('input[type="radio"]:not([data-disabled="true"]):not(:disabled)').setAttribute('data-checked', true);
            }
          } else {
            swatch.checked = false;
            swatch.removeAttribute('checked');
            if(swatch.closest('[data-optionindex]').querySelector('input[type="radio"]:not([data-disabled="true"]):not(:disabled)')){
              swatch.closest('[data-optionindex]').querySelector('input[type="radio"]:not([data-disabled="true"]):not(:disabled)').checked = true;
            }
          }
        });
        this.onVariantChange();
      }
    }
  }

  selectCurrentVariantOnLoad() {
    this.selectedValues = this.querySelectorAll('fieldset input[type="radio"][data-checked="true"]');
    if (this.selectedValues.length > 0) {
      this.selectedValues.forEach(input => {
        input.checked = true;
      });
    }
  }
}
customElements.define('variant-selects', VariantSelects);

// Initialize overflow checking when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
setTimeout(() => {
  VariantSelects.checkAllOverflows();
}, 100);
});

// Also check on window load
window.addEventListener('load', () => {
setTimeout(() => {
  VariantSelects.checkAllOverflows();
}, 100);
});

// Check on resize
let resizeTimeout;
window.addEventListener('resize', () => {
clearTimeout(resizeTimeout);
resizeTimeout = setTimeout(() => {
  VariantSelects.checkAllOverflows();
}, 100);
});

// Make it available globally for debugging
window.checkAllOverflows = () => VariantSelects.checkAllOverflows();

// Listen for draft variants processing completion to recalculate overflow
document.addEventListener('draft-variants-processed', (event) => {
setTimeout(() => {
  VariantSelects.checkAllOverflows();
}, 100);
});

