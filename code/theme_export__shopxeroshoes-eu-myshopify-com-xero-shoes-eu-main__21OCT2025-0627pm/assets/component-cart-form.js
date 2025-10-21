
class AjaxCart extends HTMLElement {
    constructor() {
      super();

      this.cartForm = this.querySelector('form[data-cart-form]');
      this.cartDrawer = document.querySelector('#component-cart-drawer');

      this.updateEvents();

      this.removeDraftVariant();

      this.cartForm.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
        }
      });
      if (navigator.platform === 'iPhone') document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
    }

    /**
     * Observe attribute of component
     * 
     * @returns {array} Attributes to Observe
     */
    static get observedAttributes() {
      return ['updating'];
    }

    removeDraftVariant(){
      this.cartForm.querySelectorAll('[data-item-remove]').forEach(button => {
        if(button.getAttribute('data-remove') == true || button.getAttribute('data-remove') == "true"){
          button.dispatchEvent(new Event('click'));
        }
      });
    }

    /**
     * bind Other inside element events to DOM
     */
    updateEvents(){
      this.cartForm.querySelectorAll('[data-item-remove]').forEach(button => button.addEventListener('click', this.removeItem.bind(this)));

      this.cartForm.querySelectorAll('[data-item-remove]').forEach(button =>{
        button.addEventListener('keyup', (e) => {
          if (e.key === 'Enter' || e.keyCode === 13) {
          this.removeItem(e)
          }
        })
      });

     

      this.cartForm.querySelectorAll('[data-qty-input]').forEach(button => button.addEventListener('change', (evt)=>{
        this.onQtyChange(evt);
      }));
      window?.Shopify?.PaymentButton?.init();
    }
  
    /**
     * Open Cart drawer and add focus to drawer container
     */
    initCartDrawer(elementTofocus) {
      if(this.cartDrawer){
        this.cartDrawer.openDrawer(elementTofocus);
      } else {
        window.location.href = window.routes.cart_fetch_url || '/cart';
      }
    }
  
     /**
     * Fetch latest cart data 
     */
     getCartData(){
      const cartRoute = `${window.location.pathname}?sections=${this.dataset.sectionId}`;
      fetch(cartRoute).then(response => response.json()).then(response => {
          this._updateCart(response);
      }).catch((e) => {
          console.error(e);
      }).finally(() => {
          // Cart HTML fetch done
      });
    }

    /**
     * Update cart HTML and Trigger Open Drawer event
     *
     * @param {string} cartHTML String formatted response from fetch cart.js call
     * @param {HTML Node} openDrawerBtn open drawer node
     */
    _updateCart(response, openDrawerBtn = null){
      if(response === null) return;
      
      this.setAttribute('updating', true);

      let cartHTML = response[this.dataset.sectionId] || response['template-cart'];
      const parser = new DOMParser();
      cartHTML = parser.parseFromString(cartHTML, 'text/html');

      const cartJSONEle = cartHTML.querySelector('[data-cartScriptJSON]');
      window.globalSpace.cart = JSON.parse(cartJSONEle.textContent);

      Utility.updateSourceFromDestination(`#cart-sales-motivator-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-form-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-subtotal-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-discount-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-total-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-discount-codes-${this.dataset.sectionId}`, cartHTML);
      Utility.updateSourceFromDestination(`#cart-item-count-${this.dataset.sectionId}`, cartHTML);

      updateCartCountInHeader();

      // Update cart form container class
      const cartFormContainer = this.querySelector(`#cart-form-container-${this.dataset.sectionId}`);
      (window.globalSpace.cart.item_count <= 0) ? cartFormContainer.classList.add('empty_cart') : cartFormContainer.classList.remove('empty_cart');
      
      this.updateEvents();
      
      if(this.cartDrawer && openDrawerBtn){
        this.initCartDrawer(openDrawerBtn);
      }
      lazyImageObserver.observe();
    }
    
     /**
     * Update Quantity API call 
     *
     * @param {string} line Line Index value of cart Item (Starts from 1)
     * @param {integer} quantity Quantity to update
     */
    updateItemQty(line, quantity){
      // const lineItem = document.querySelectorAll('[data-cart-item]')[line-1];
      const lineItem = document.querySelectorAll('[data-cart-item]');

      if(lineItem.length > 0){ lineItem.forEach(item => item.classList.add('updating')); }
      const body = JSON.stringify({
        line: parseInt(line),
        quantity: parseInt(quantity),
        sections: `${this.dataset.sectionId}`
      });

      fetch(`${routes.cart_change_url}`, { ...Utility.fetchConfig(), ...{ body }})
      .then((response) => response.text())
      .then((_state) => {
        const dataJSON = ((typeof _state == 'object') ? _state : JSON.parse(_state));

        // Handle Error
        if(dataJSON.errors){
          Utility.handleError(dataJSON.errors, 'Cart Update');

          const cartItem = window.globalSpace.cart.items[line-1];
          const qtyInput = this.cartForm.querySelector(`input[data-qty-input][data-index="${line}"]`);
          if(qtyInput) qtyInput.value = cartItem.quantity;
          return;
        }

        eventBus.publish(PUB_SUB_EVENTS.cartUpdate, {
          data: {
            action: (quantity == 0) ? 'remove-item': 'update-qty',
            item: (quantity == 0) ? dataJSON.items_removed : dataJSON.items_added,
            sections: dataJSON.sections
          }
        });
        
        this._updateCart(dataJSON.sections);
      }).catch((error) => {
          Utility.handleError(error, 'Cart Update');
      }).finally(() => {
        setTimeout(() => {
          if(lineItem.length > 0){ lineItem.forEach(item => item.classList.remove('updating')); }
        }, 500);
      });
    }
  
    /**
     * Remove Item Event
     */
    removeItem(event){
      event.preventDefault();
      const {currentTarget} = event;
      const itemIndex = currentTarget.dataset.index || null;
      if(itemIndex !== null){
          this.updateItemQty(itemIndex, 0);
      }
    }

    /**
     * Cart Item Qunatity Input change event
     */
    onQtyChange(evt){
      evt.preventDefault();
      const $qtyInput = evt.currentTarget;
      const qtyValue = $qtyInput.value;
      const itemIndex = $qtyInput.dataset.index || null;

      if(itemIndex) this.updateItemQty(itemIndex, qtyValue);
    }
}
customElements.define("cart-form", AjaxCart);