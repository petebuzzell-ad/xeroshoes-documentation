// Ajax cart JS for Drawer and Cart Page
class quickShopModal {
  constructor() {

  }

  /**
   * Fetch Product data using handle
   * @param {*} handle 
   */
  async _loadQuickShop(handle){
    let requestURL = `/products/${handle}?view=quickview`;
    const response = await fetch(requestURL);
    const quickShopData = await response.text();
    return quickShopData;
  }

  /**
   * Open QuickShop modal and add focus to modal container
   *
   * @param {event} Event instance
   */
  openQuickShop(event) {
    event.preventDefault();
    const body = document.querySelector('#quickshop-drawer [data-quickshop-body]');
    this.openBy = event.currentTarget;
    const handle = this.openBy.dataset.handle;
    if(!handle || !body) return;

    this._loadQuickShop(handle).then(quickShopData => {
      body.innerHTML = quickShopData;
      document.querySelector('#quickshop-drawer').openDrawer(this.openBy);
      document.querySelector('#quickshop-drawer [data-quickshop-body] variant-selects')?.selectCurrentVariantOnLoad();
      lazyImageObserver.observe();
      if (typeof StampedFn !== 'undefined') StampedFn?.loadBadges();
    });
  }
}
if (typeof quickShopModal !== 'undefined') new quickShopModal();

class quickShopButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', (event) => {
      quickShopModal.prototype.openQuickShop(event);
    });
    this.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' || event.keyCode === 13) {
        quickShopModal.prototype.openQuickShop(event);
      }
    });
  }
}
customElements.define("quick-shop-button", quickShopButton);