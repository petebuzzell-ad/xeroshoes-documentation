window.activeSession = null;
const sectionMethods = {

  _initSection() {
    // console.log('Section Method Loaded');
    // document.addEventListener('shopify:section:load', e => { sectionMethods._onSectionLoad(e) });
    // document.addEventListener('shopify:section:unload', e => {sectionMethods._onSectionUnload(e) });
    document.addEventListener('shopify:section:select', e => { sectionMethods._onSelect(e) });
    document.addEventListener('shopify:section:deselect', e => { sectionMethods._onDeselect(e) });
    document.addEventListener('shopify:block:select', e => { sectionMethods._onBlockSelect(e) });
    // document.addEventListener('shopify:block:deselect', e => { sectionMethods._onBlockDeselect(e) });
  },

  _onSectionLoad: (e)=> {
    console.log('section load', e);
    const sectionId = e.detail.sectionId;
  },

  _onSectionUnload: function(e) {
    // console.log('section Unload', e);
    const sectionId = e.detail.sectionId;
  },

  _onSelect: (e)=> {
    const sectionDetails = JSON.parse(e.target.dataset.shopifyEditorSection);
    const sectionType = sectionDetails.type;
    window.activeSession = sectionType;

    console.log('Select Section=======>', e.target);
    sectionMethods.updateLozad();

    switch (sectionType) {
      case 'header': {
        break;
      }
      case 'search-layer': {
        let openSearch = document.querySelector('[data-toggledrawer="header-search-layer"]');
        openSearch.dispatchEvent(new Event('click'));
        break;
      }
      case 'newsletter': {
        const $newsletterPopup = document.querySelector('#PopupModal-newsletter');
        $newsletterPopup?.show();
        break;
      }
      case 'component-cart-drawer': {
        let openCart = document.querySelector('[data-toggledrawer="component-cart-drawer"]');
        openCart.dispatchEvent(new Event('click'));
        break;
      }
      default: {
        break;
      }
    }
  },

  _onDeselect: (e)=> {
    const sectionDetails = JSON.parse(e.target.dataset.shopifyEditorSection);
    const sectionType = sectionDetails.type;
    window.activeSession = null;

    switch (sectionType) {
      case 'mobile-navigation': {
        let closeMobileMenu = document.querySelector('.close-mobile--navbar');
        closeMobileMenu.dispatchEvent(new Event('click'));
        break;
      }
      case 'search-layer': {
        let closeSearchBar = document.querySelector('.search-modal__close-button');
        closeSearchBar.dispatchEvent(new Event('click'));
        break;
      }
      case 'component-cart-drawer': {
        let closeSearchBar = document.querySelector('.close-ajax--cart');
        closeSearchBar.dispatchEvent(new Event('click'));
        break;
      }
      case 'newsletter': {
        const $newsletterPopup = document.querySelector('#PopupModal-newsletter .modal');
        if($newsletterPopup){
          $newsletterPopup.classList.remove('open');
          SiteOverlay.prototype.hideOverlay();
        }
        break;
      }
      default: {
        break;
      }
    }
  },

  _onReorder: (e)=> {
    const sectionId = e.detail.sectionId;
  },

  _onBlockSelect: (e)=> {
    console.log(e);
    switch (window.activeSession) {
      case 'global-header-slider': {
        let parentElement = e.target.closest('swiper-container');
        let index = e.target.dataset.index || 1;

        setTimeout(() => {
          parentElement?.swiper.slideTo(index-1, 0, false);
        }, 700);
        break;
      }
      default: {
        break;
      }
    }
  },

  _onBlockDeselect: (e)=> {
    // console.log('block Deselect', e);
    const sectionId = e.detail.sectionId;
  },

  updateLozad(){
    lazyImageObserver.observe();
  }
};

sectionMethods._initSection();