/**
  * Open Modal javscript trigger
  *
  * */
function openModal(modal, opener){
  if(modal && opener != undefined) modal.show(opener);
}

function updateCartCountInHeader(){
  const desktopCartCount = document.querySelector(`#cart-icon-desktop .cart-count`);
  const mobileCartCount = document.querySelector(`#cart-icon-mobile .cart-count`);

  if (desktopCartCount) {
    desktopCartCount.innerHTML = window.globalSpace.cart.item_count;
    desktopCartCount?.classList.toggle('d-none', window.globalSpace.cart.item_count === 0);
  }
  if (mobileCartCount) {
    mobileCartCount.innerHTML = window.globalSpace.cart.item_count;
    mobileCartCount?.classList.toggle('d-none', window.globalSpace.cart.item_count === 0);
  }
}

/**
  * Dropdown component Events and Methods
  *
  * @param {element} element - Dropdown element
  */
 class Dropdown {
  constructor(element) {
    this.dropdown = element;
    this.toggleCTA = element.querySelector('.dropdown-toggle');
    this.supportedEvents = ["click", "touchend", "mouseenter", "mouseleave", "keydown"];

    this.init();
  }

  init() {
    this.supportedEvents.forEach((type) => {
      if (type === 'click' || type === 'touchend') {
        this.toggleCTA.addEventListener(type, (evt) => {
          // if(this.toggleCTA.classList.contains('nav-link'))
          if (window.innerWidth <= 991) {
            evt.preventDefault();
          }else{
            if(!this.toggleCTA.classList.contains('nav-link')){
              evt.preventDefault();
            }
          }
          this.toggleDropdown();
        });
      }else if(type === 'keydown') {
        this.toggleCTA.addEventListener(type, (e) => {
          if(this.toggleCTA.classList.contains('nav-link')){
            if (e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              this.toggleDropdown();
            }
          }
        })
      }else if(type === 'mouseenter') {
        this.toggleCTA.addEventListener(type, (evt) => {
            this.dropdownShow(this.dropdown);
        });
        this.toggleCTA.addEventListener(type, (_evt) => {
          this.childOnFocusChange(this.dropdown);
        });
      } else if(type === 'mouseleave') {
        this.dropdown.addEventListener(type, (evt) => {
          this.dropdownHide(this.dropdown);
        });
      } else if(type == 'focusout'){
        this.dropdown.addEventListener(type, (evt) => {
          if (!this.dropdown.contains(evt.relatedTarget) && this.dropdown.classList.contains('open')) {
            this.dropdownHide(this.dropdown);
          }
        });
      }
    });

    this.bindEvents();
  }

  bindEvents(){
    const closeBtn = this.dropdown.querySelector('.slideout-submenu');
    if (closeBtn) {
      closeBtn.addEventListener('click', (evt) => {
        evt.preventDefault();
        this.dropdownToggle(this.dropdown);
      });
    }
  }

  toggleDropdown() {
    this.dropdownToggle(this.dropdown);
  }

  dropdownToggle(dropdownParent) {
    setTimeout(() => {
      dropdownParent.classList.contains('open')
        ? this.dropdownHide(dropdownParent)
        : this.dropdownShow(dropdownParent);
    }, 50);
  }

  dropdownShow(dropdownParent) {
    if (!dropdownParent) {
      return;
    }
    this.toggleCTA.setAttribute('aria-expanded', true);
    dropdownParent.classList.add('open');
  }

  dropdownHide(dropdownParent) {
    if (!dropdownParent) return;

    this.toggleCTA.setAttribute('aria-expanded', false);
    dropdownParent.classList.remove('open');

    const childDropdowns = dropdownParent.querySelectorAll('.dropdown.open');
    if (childDropdowns.length > 0) {
      childDropdowns.forEach((child) => {
        child.classList.remove('open');
        child.querySelector('.dropdown-toggle').setAttribute('aria-expanded', false);
      });
    }
  }

  childOnFocusChange(dropdownParent) {
    const openDropdowns = Array.from(dropdownParent.parentElement.querySelectorAll('.dropdown.open'));
    const currentIndex = openDropdowns.indexOf(dropdownParent);
    openDropdowns.forEach((ele) => {
      const eleIndex = openDropdowns.indexOf(ele);
      if (eleIndex !== currentIndex) {
        this.dropdownHide(ele);
      }
    });
  }
}
const allDropdowns = document.querySelectorAll('[is="drop-down"]');
allDropdowns.forEach((ele) => {
  new Dropdown(ele);
});

/**
* background Overlay
*/
class SiteOverlay extends HTMLElement{
  constructor() {
    super();
    this.overlayElement = document.querySelector('#site-overlay');
    this.bindEvents();
  }

  /**
   * bind Click and Touchend event to this custom component
   */
  bindEvents(){
    this.addEventListener('click', this.onClick.bind(this));
    this.addEventListener('touchend', this.onClick.bind(this));
  }

  /**
   * Click event of Site overlay
   */
  onClick(){
    const closeSearch = document.querySelector('search-modal')?.classList.contains("open__modal");
    if(closeSearch) document.querySelector('.search-modal__close-button')?.dispatchEvent(new Event('click'));
  
    this.hideOverlay();
  }

  /**
   * Show Overlay
   */
   showOverlay(){
    document.querySelector('#site-overlay').classList.add('overlay--body');
    document.querySelector('#site-overlay').setAttribute('aria-hidden', false);
    document.body.classList.add('scroll-fixed');
  }

  /**
   * Hide overlay
   */
  hideOverlay(){
    const openDrawers = document.querySelectorAll('custom-drawer.open');
    openDrawers.forEach(drawer => {
      drawer.closeDrawer();
    });
    
    document.querySelector('#site-overlay').classList.remove('overlay--body');
    document.querySelector('#site-overlay').setAttribute('aria-hidden', true);
    document.body.classList.remove('scroll-fixed');
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick.bind(this));
    this.removeEventListener('touchend', this.onClick.bind(this));
  }
}
customElements.define("site-overlay", SiteOverlay, {
  once: true
});

/**
* Custom Video
*/
class CustomVideo extends HTMLElement {
  constructor() {
    super();

    this.type = this.getAttribute('data-video-type');
    this.videoURL = this.getAttribute('data-video-id');
    this.placementType = this.getAttribute('data-placement');
    this.videoStatus = 'empty';

    this.container = this.closest('.custom-video-container');
    this.videoModal = document.getElementById('PopupModal-video');
    this.contentSection = this.querySelector('.content-section');
    this.videoSection = this.querySelector('.video-section');
    if(this.placementType == 'popup') this.videoSection = this.videoModal.querySelector('.video-container');
    this.triggerVideo = this.querySelector('[data-trigger-video]') || this.container.querySelector('[data-trigger-video]');
    this.triggerVideoWhole = this.querySelector('[data-trigger-video-whole]') || this.container.querySelector('[data-trigger-video-whole]');
    this.customVideoPlayButton();
  }

  connectedCallback() {
    this.bindEvents();
  }

  disconnectedCallback() {
    if (this.triggerVideo) {
      this.triggerVideo.removeEventListener('click', this.toggleView.bind(this));
    }
    if (this.triggerVideoWhole) {
      this.triggerVideoWhole.removeEventListener('click', this.toggleView.bind(this));
    }
  }

  /**
   * Binding events on the video button
   */
  bindEvents(){
    if(this.querySelector('[data-postervideo]')) this.managePosterVideos();
    if(this.triggerVideo) this.triggerVideo.addEventListener('click', this.toggleView.bind(this));
    if(this.triggerVideoWhole) this.triggerVideoWhole.addEventListener('click', this.toggleView.bind(this));
    if(this.dataset.placement == 'grid' && this.dataset.autoplay == 'true' && !this.closest('swiper-slide')) this.autoplayOnInit();
    // if(this.placementType == 'grid') this.addEventListener('focusout', this.focusOut.bind(this));
    if(window.globalSpace.template == 'index' && this.closest('.header-slider-wrapper')){
      this.autoplayOnInit();
    }

  }

  /**
   * Focus Out Event to close drawer
   *
   * @param {event} Event instance
   */
  focusOut(_event){
    if(this.container.classList.contains('playing--video')) this.toggleView();
  }

  /**
   * Toggle of video modal
   */
  toggleView(event){
    if(event) event.preventDefault();
    const isOpen = this.container.classList.contains('playing--video');
    if (isOpen) {
      this.hideContent();
    } else {
      this.showContent();
    }
  }

  /**
   * Show panel content
   */
  showContent() {
    if (this.videoStatus === 'empty' || this.placementType === 'popup') {
      const videoElement = this._buildVideo();
      videoElement.id = 'custom-video' + Math.floor((Math.random() * 100) + 1);
      this.videoSection.appendChild(videoElement);
      this.videoStatus = 'loaded';

      setTimeout(() => {
        (this.placementType === 'popup') ? openModal(this.videoModal, this.triggerVideo) : this.container.classList.add('playing--video');
        this.videoSection.setAttribute('aria-hidden', 'false');
        if(this.dataset.controls == 'true') this.pauseOnVisibilityChange(videoElement);
      }, 500);
    } else {
      const videoElement = this.querySelector('.video-section video') || this.querySelector('.video-section iframe');
      this.container.classList.add('playing--video');
      this._playVideo(videoElement);
    }
  }

  /**
   * Hide panel content
   */
  hideContent() {
    this.container.classList.remove('playing--video');
    this.videoSection.setAttribute('aria-hidden', 'true');
    const videoElement = this.querySelector('.video-section video') || this.querySelector('.video-section iframe');
    if (videoElement) {
      this._pauseVideo(videoElement);
    }
  }

  _playVideo(video){
    if(this.type == 'local'){
      video.play();
    }else if(this.type == 'youtube'){
      video.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
  }

  _pauseVideo(video) {
    if (this.type === 'local') {
      video.pause();
    } else if (this.type === 'youtube') {
      video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
  }

  /**
   * 
   * Create the video html element
   */
  _buildVideo(){
    let video;
    
    if(this.type == 'local'){
      video = document.createElement('video');
      video.preload = 'none';
      video.src = this.videoURL;
      if(this.dataset.controls == 'true') video.controls = this.dataset.controls;
      if(this.dataset.muted == 'true') video.muted = this.dataset.muted;
      video.autoplay = true;
      if(this.dataset.loop == 'true') video.loop = this.dataset.loop;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
    }else if(this.type == 'youtube'){
      const videoID = this.videoURL.replace('https://www.youtube.com/watch?v=', '');
      video = document.createElement( "iframe" );
      video.setAttribute( "allowfullscreen", "" );
      video.setAttribute( "frameborder", "0" );
      if(window.globalSpace.template == 'index'){
        video.setAttribute( "tabindex", "-1" );
      }
      video.setAttribute( "allow", "autoplay");
      video.setAttribute( "src", `https://www.youtube.com/embed/${videoID}?rel=0&showinfo=0&autoplay=1&mute=${this.dataset.muted == 'true' ? 1 : 0}&controls=${this.dataset.controls == 'true' ? 1 : 0}&loop=${this.dataset.loop == 'true' ? 1 : 0}&enablejsapi=1&playsinline=1&origin=${window.origin}` );
      // &playlist=${videoID}
    }
    return video;
  }

  /**
   * Pause video on scroll when out of viewport
   *
  */
  pauseOnVisibilityChange(videoEle){
    this.scrollObserver = new IntersectionObserver((entries) => { 
      if(videoEle == undefined || videoEle.contentWindow == null){
        this.scrollObserver.disconnect();
        return;
      }

      if(!entries[0].isIntersecting){
        this._pauseVideo(videoEle)
      }
    });
    this.scrollObserver.observe(videoEle);
  }

  /**
   * Poster Video Autoplay
   *
  */
  managePosterVideos(){
    const posterVideo = this.querySelector('[data-postervideo]');
    if(!posterVideo) return;

    const videoIntersection = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target) {
          const sourceTag = document.createElement('source');
          sourceTag.src = entry.target.dataset.src;
          sourceTag.type = "video/mp4";
          entry.target.appendChild(sourceTag)
          entry.target.play();
          observerPosterVideo.disconnect();
        }
      }
    };
    const observerPosterVideo = new IntersectionObserver(videoIntersection);
    observerPosterVideo.observe(posterVideo);
  }

  autoplayOnInit(element = this){
    const elementIntersection = (entries) => {
      if(entries[0].isIntersecting && entries[0].intersectionRatio > 0){
        element.toggleView();
        observeElement.disconnect();
      }
    };
    let observeElement = new IntersectionObserver(elementIntersection);
    observeElement.observe(element);
  }

  customVideoPlayButton(){
    this.customVideoPlayButton = this.closest(".shopify-section").querySelector("[data-custom-video-play-button]");
    if(!this.customVideoPlayButton || !this.triggerVideo) return;
    this.customVideoPlayButton.addEventListener('click', () => {
      this.triggerVideo.dispatchEvent(new Event('click'));
    });
  } 
}
customElements.define("custom-video", CustomVideo);

/**
* Modal Dialogue
*
*/
class ModalDialog extends HTMLElement {
  constructor() {
    super();

    this.modal = this.querySelector('.modal');
    this.modalOpeners = [...document.querySelectorAll(`[data-modal-opener="${this.id}"]`)];
    this.closeBtn = this.querySelector('[id^="ModalClose-"]');
  }

  connectedCallback() {
    this.modalOpeners.forEach((opener)=>{
      opener.addEventListener('click', (evt)=>{
        evt.preventDefault();
        this.show(opener);
      });
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this.hide.bind(this));
    }

    this.addEventListener('click', (evt) => {
      if (evt.target === this) this.hide();
    });

    this.addEventListener('keyup', (evt) => {
      if (evt.code && evt.code.toUpperCase() === 'ESCAPE') this.hide();
    });
  }

  // Clean up event listeners
  disconnectedCallback() {
    this.modalOpeners.forEach((opener) => {
      opener.removeEventListener('click', this.show.bind(this));
    });

    if (this.closeBtn) {
      this.closeBtn.removeEventListener('click', this.hide.bind(this));
    }

    this.removeEventListener('click', this.hide);
    this.removeEventListener('keyup', this.hide);
  }

  /**
   * Open the Modal
   * @param {element} opener 
   */
  show(opener) {
    this.openedBy = opener;
    this.modal.classList.add('open');
    this.setAttribute('aria-hidden', false);

    SiteOverlay.prototype.showOverlay();
    Utility.trapFocus(this);
    Utility.forceFocus(this.closeBtn);
  }

  /**
   * Close Modal Dialogue
   */
  hide() {
    this.modal.classList.remove('open');
    this.setAttribute('aria-hidden', true);

    SiteOverlay.prototype.hideOverlay();
    Utility.removeTrapFocus(this.openedBy);
    if(this.id == 'PopupModal-video') this.querySelector('.video-container').innerHTML = '';
  }
}
customElements.define('modal-dialog', ModalDialog);

/**
   * Manage Custom Notification Trigger
   *
   */
class ToastNotification extends HTMLElement {
  constructor() {
    super();

    this.container = this.querySelector('.snotifyToast');
    this.closeBtn = this.querySelector('.snotifyToast__close');
    this.animateNotifcation = null;

    // Set ARIA role for accessibility
    this.container.setAttribute('role', 'alert');
  }

  connectedCallback() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hide();
      });
    }
  }

  disconnectedCallback() {
    if (this.closeBtn) {
      this.closeBtn.removeEventListener('click', this.hide.bind(this));
    }
  }

  /**
   * Notification Type
   * @param {string} title 
   * @param {string} body 
   * @param {object} options 
   */
  updateNotification(title, body, options){
    this.querySelector('.snotifyToast__title').textContent = title;
    this.querySelector('.snotifyToast__body').textContent = body;

    this.container.classList.add('open', `snotify-${options.type}`);
    this._manageToggle(options.timeout);
  }

  /**
   * Duration of notification to hide again
   * @param timeout 
   */
  _manageToggle(timeout) {
    this.progressBar = this.querySelector('[data-toast-pr]');
    const totalFrames = Math.ceil(timeout / 16.67) / 2;
    let frame =0; 
    let width = 0;

    this.animateNotifcation = () => {
      width = (frame / totalFrames) * 100;
      this.progressBar.setAttribute('style', `width: ${width}%`);
      if (frame < totalFrames) {
        frame++;
        requestAnimationFrame(this.animateNotifcation);
      } else {
        this.closeBtn.dispatchEvent(new Event('click'));
      }
    };
    requestAnimationFrame(this.animateNotifcation);
  }

  hide() {
    if (this.animateNotification) {
      cancelAnimationFrame(this.animateNotification);
    }
    this.container.className = 'snotifyToast';
    [this.querySelector('.snotifyToast__title'),this.querySelector('.snotifyToast__body')].forEach(ele => ele.textContent = '');
    this.querySelector("[data-toast-pr]").removeAttribute("style");
  }
}
customElements.define("toast-notification", ToastNotification);
window.notificationEle = document.querySelector('toast-notification');

class CustomDrawer extends HTMLElement {
  constructor() {
      super();
      this.isOpen = false;

      this.openedBy = null;
      this.toggleDrawer = document.querySelectorAll(`[data-toggleDrawer="${this.id}"], a[href="#${this.id}"]`);
      this.closeButtons = this.querySelectorAll('[data-closedrawer]');
      this.forceFocus = this.querySelector('[data-closedrawer]') || this.querySelector('[data-closedrawer-f]') || this.querySelector('.drawer-header');

      this.setAttribute('inert', '');
  }

  connectedCallback() {
    this.bindEvents()
  }

  disconnectedCallback() {
    this.toggleDrawer.forEach(btn => btn.removeEventListener('click', this.openDrawer()));

    this.closeButtons.forEach(btn => btn.removeEventListener('click', this.closeDrawer.bind(this)));
    this.removeEventListener('keyup', this.onKeyUp.bind(this));
    this.removeEventListener('focusout', this.focusOut.bind(this));
  }

  bindEvents(){
    this.toggleDrawer.forEach(btn => {
      btn.setAttribute('aria-expanded', false);
      btn.addEventListener('click', (evt) => {
        evt.preventDefault();
        (this.isOpen) ? this.closeDrawer(evt) : this.openDrawer(evt.currentTarget);
      });
    });

    this.closeButtons.forEach(btn => btn.addEventListener('click', this.closeDrawer.bind(this)));
    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.focusOut.bind(this));
  }

  /**
   * Escape Key Press to close drawer when focus is within the container
   */
  onKeyUp(event) {
    if(event.code == undefined || event.code && event.code.toUpperCase() !== 'ESCAPE') return;
    this.closeDrawer();
  }

  /**
   * Focus Out Event to close drawer
   */
  focusOut(evt){
    if (!this.contains(evt.relatedTarget) && this.open) {
      this.closeDrawer();
    }
  }

  openDrawer(opener) {
    if(this.id != 'quickshop-drawer') this.resetOtherDrawers();

    this.isOpen = true;
    this.openedBy = opener || null;
    this.classList.add('open');
    this.setAttribute('aria-hidden', 'false');

    this.removeAttribute('inert');

    this.openedBy?.setAttribute('aria-expanded', true);
    
    SiteOverlay.prototype.showOverlay();
    Utility.trapFocus(this, this.forceFocus);
    Utility.forceFocus(this.forceFocus);
    
    // Enable focus for all focusable elements in the drawer
    this.enableDrawerFocus();
  }

  closeDrawer() {
      this.isOpen = false;
      this.classList.remove('open');
      this.setAttribute('aria-hidden', 'true');
      this.openedBy?.setAttribute('aria-expanded', false);
      
      if(this.id != 'quickshop-drawer') SiteOverlay.prototype.hideOverlay();
      
      this.setAttribute('inert', '');

      // Use the existing Utility function to restore focus properly
      Utility.removeTrapFocus(this.openedBy);
      
      // Close all open dropdowns/panels when drawer is closed
      this.hideOpenPanels();
      if(this.id == 'quickshop-drawer') this.querySelector('[data-quickshop-body]').innerHTML = '';

      // Disable focus for all focusable elements in the drawer
      this.disableDrawerFocus();
      
      this.openedBy = null;
  }

  enableDrawerFocus() {
    // Enable focus for all focusable elements in the drawer
    const focusableElements = this.querySelectorAll(`
      input:not([type="hidden"]),
      button,
      select,
      textarea,
      a[href],
      [tabindex="0"]
    `);
    
    focusableElements.forEach(element => {
      if(element.tagName.toLowerCase() == 'a' && element.classList.contains('card-title')){
        let elehref = element.href;
        element.addEventListener('keyup', (e) => {
          if(e.key === 'Enter' || e.key === ' '){
            window.location.href = elehref;
          }
        });
      }
      // Only set tabindex if it's not already set or if it's -1
      if (!element.hasAttribute('tabindex') || element.getAttribute('tabindex') === '-1') {
        element.setAttribute('tabindex', '0');
      }
    });
    
  }

  disableDrawerFocus() {
    // Disable focus for all focusable elements in the drawer
    const focusableElements = this.querySelectorAll(`
      input:not([type="hidden"]),
      button,
      select,
      textarea,
      a[href],
      [tabindex="0"]
    `);
    
    focusableElements.forEach(element => {
      element.setAttribute('tabindex', '-1');
    });
    
  }


  resetOtherDrawers(){
    const openDrawers = document.querySelectorAll('custom-drawer.open');
    openDrawers.forEach(drawer => {
      drawer.closeDrawer();
    });
  }

  hideOpenPanels(){
    if(this.id != 'storefront-filter-drawer'){
 
      let openPanels = this.querySelectorAll('[is="collapsiblePanel"].open');
      openPanels.forEach(panel => panel.querySelector('[data-toggle="panel"]').click());

      let openDropdowns = Array.from(this.querySelectorAll('[is="drop-down"].open'));
      openDropdowns.forEach((ele) => {
        ele.classList.remove('open');
        ele.querySelector('[data-toggle="open"]')?.setAttribute('aria-expanded', false);
      });
    }
  }
}
customElements.define('custom-drawer', CustomDrawer);

const swiperSliders = document.querySelectorAll('swiper-container');
swiperSliders.forEach(swiperEle => {
  swiperEle.addEventListener('swiperslidechange', (event) => {
    const index = event.detail[0].activeIndex;
    const swipDirection = event.detail[0].swipeDirection;
    const prevSlide = swiperEle.querySelector(`swiper-slide[data-index="${swipDirection == 'prev' ? index+2 : index}"]`);
    const activeSlide = swiperEle.querySelector(`swiper-slide[data-index="${index+1}"]`);

    // Pause previous slide video if available
    if(prevSlide && prevSlide.querySelector('.custom-video-container.playing--video')){
      let customElement = prevSlide.querySelector('custom-video');
      let videoEle = customElement.querySelector('video') || customElement.querySelector('iframe');
      if(videoEle && customElement.dataset.controls == 'true') {
        customElement._pauseVideo(videoEle);
      }
    }

    // Play active slide video if available
    if(prevSlide && activeSlide?.querySelector('.custom-video-container')){
      let customElement = activeSlide.querySelector('custom-video');
      if(customElement.videoStatus == 'empty'){
        customElement.toggleView();
      }else{
        let videoEle = customElement.querySelector('video') || customElement.querySelector('iframe');
        if(videoEle) customElement._playVideo(videoEle);
      }
    }
  });
});


function checkAllScrollOverflows() {
  const containers = document.querySelectorAll('product-form[data-format="product-card"] fieldset:has(.color-swatch-list)');

  containers.forEach(container => {
    const inner = container.querySelector('.color-swatch-list');
    const arrow = container.querySelector('.color-arrow-nav');

    const containerWidth = container.offsetWidth - 50; // Adjust for padding or margin if necessary
    // const containerWidth = container.clientWidth - 50;
    let contentWidth = 0;

    Array.from(inner.children).forEach(child => {
      const style = getComputedStyle(child);
      
      // Check if the child itself is hidden
      if (style.display === 'none' || child.classList.contains('d-none')) {
        return;
      }
      
      // If child has a color-swatch, check if it's hidden
      const colorSwatch = child.querySelector('.color-swatch');
      if (colorSwatch && colorSwatch.classList.contains('d-none')) {
        return;
      }
      
      // Calculate width for visible children
      const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      contentWidth += child.offsetWidth + margin;
    });
    if (contentWidth > containerWidth) {
      if (arrow) {
        arrow.style.display = 'block';
        arrow.classList.add('show-nav-arrow');
      }
    } else {
      if (arrow) {
        arrow.style.display = 'none';
        arrow.classList.remove('show-nav-arrow');
      }
    }

  });
}

function setupArrowScroll() {
  const containers = document.querySelectorAll('product-form[data-format="product-card"] fieldset:has(.color-swatch-list)');

  containers.forEach(container => {
    const inner = container.querySelector('.color-swatch-list');
    const arrow = container.querySelector('.color-arrow-nav');

    arrow?.addEventListener('click', () => {
      inner.scrollBy({
        left: 150, // customize scroll amount
        behavior: 'smooth'
      });
    });
  });
}

window.addEventListener('load', () => {
  setTimeout(() => {
    checkAllScrollOverflows();
    setupArrowScroll();
  }, 500);
  window.addEventListener('resize', checkAllScrollOverflows);
});

setTimeout(() => {
  document.querySelectorAll('.swiper-button-next, .swiper-button-prev').forEach(button => {
    button.removeAttribute('aria-controls');
  });
  document.querySelectorAll('.swiper-pagination-bullet').forEach(button => {
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('tabindex', '-1');
  });
}, 500);


class SectionVariantList extends HTMLElement {
  constructor() {
    super();

    this.variantList = this.querySelector('#variant-list');
    this.variantIDs = this.querySelectorAll('[data-variant-id]');
  }

  connectedCallback() {
    this.getAllVariants();
  }

  

  getAllVariants(){
    this.variantIDs.forEach(ele => {
      const id = ele.getAttribute("data-variant-id");
      fetch(`/variants/${id}.js`)
        .then(res => res.json())
        .then(variant => {


          let varianturl = `/variants/${variant.id}`;
          let variantImage = variant.featured_image.src;
          let variantName = variant.name.split(" / ").slice(0, -1).join(" / ");
          let variantPrice = Utility.formatMoney(variant.price, window.globalSpace.money_format);
          // let productTitle = 
          ele.innerHTML = `
            <div class="card card-product 
              pt-md-0 pb-md-0 ps-md-0 pe-md-0 pt-0 pb-0 ps-0 pe-0
          square flex-md-column flex-column flex-nowrap align-items-md-start justify-content-md-start align-items-start justify-content-start column-gap-md-0 row-gap-md-0 column-gap-0 row-gap-0 "
            data-product-card>
            <div class="product--media product-images-wrapper w-100"><div
                class="product--media" data-mediaid="42207082381490">
                <a href="${varianturl}" data-product-link
                  class="d-block product-link position-relative w-100">
                  <img
                    src="${variantImage}&amp;width=750"
                    loading="lazy" sizes="
              (min-width: 1380) 322px, (min-width: 768px) calc((100vw - 130px) / 2), 50vw"
                    "="" alt="Prio - Women-praella" width="1400" height="1700"
                    class="lozad " style="aspect-ratio: ;" fetchpriority="low"
                    data-feauredimage
                    srcset="${variantImage}&amp;width=350 350w,${variantImage}&amp;width=550 550w,${variantImage}&amp;width=750 750w,${variantImage}&amp;width=991 991w,${variantImage}&amp;width=1200 1200w,${variantImage} 1400w"
                    data-loaded="true">
                </a>
              </div>

            </div>

            <div
              class=" group-block group-block--AMGVVZkJNQW15SVN4c__group_ma3rRW col-lg-12 col-md-12 col-12 
              pt-md-3 pb-md-0 ps-md-0 pe-md-0 pt-2 pb-0 ps-0 pe-0
          border-0 d-flex flex-md-column flex-column flex-nowrap align-items-md-start justify-content-md-start align-items-start justify-content-start column-gap-md-0 row-gap-md-0 column-gap-0 row-gap-0  "
              style="background:transparent; border-color: #666666 !important; border-width: 0px !important; border-radius:0px;">
              <!-- Stamped - Begin Star Rating Badge -->
              <span 
                class="stamped-product-reviews-badge" 
                data-id="${variant.featured_image.product_id}" 
                data-product-title="${variant.name.split(" / ").slice(0, -2).join(" / ")}" 
                data-product-type="Shoes">
              </span>
              <!-- Stamped - End Star Rating Badge -->
            </div>

            <a href="${varianturl}" data-product-link
              class="font-family-heading text-body product-title-link fs-xl text-md-start text-start fw-medium text-math-auto mt-md-1 mb-md-1 mt-1 mb-1">${variantName}</a>
            <div
              class="font-family-heading ls-2 price-block text-md-start text-start mt-md-0 mb-md-2 mt-0 mb-1">
              <span class="price m-0 p-0 money fs-16-14 fw-normal " data-currentprice
                style="color:#0f172b">${variantPrice}</span>
            </div>
          </div>
          `;
        })
        .catch(() => {
          ele.classList.add('d-none');
          ele.textContent = `Variant ${id} not found`;
        });
    })
  }
  
}
customElements.define('section-variant-list', SectionVariantList);


(() => {
  document.querySelectorAll('[data-download_all_logos_in_the_section]').forEach(button => {
    button?.addEventListener('click', async (e) => {
      e.preventDefault();
      const section = button.closest('.shopify-section');
      if (!section || typeof JSZip === 'undefined') return;
      const zip = new JSZip();
      const logoUrls = Array.from(section.querySelectorAll('a[download]')).map(btn => btn.getAttribute("href"));
      if (logoUrls.length === 0) return;
      await Promise.all(
        logoUrls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          zip.file(`logo${i + 1}.${blob.type.split("/")[1]}`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "all-logos.zip";
      a.click();
    });
  });
})();


(() => {
  const searchInput = document.querySelector('.sidebar-blog form input[type="search"]');
  const html = document.documentElement;

  if (!searchInput || !html) return;

  searchInput.addEventListener('focus', function() {
    // Temporarily unset scroll-padding-top
    html.style.scrollPaddingTop = 'unset';
  });

  searchInput.addEventListener('blur', function() {
    html.style.scrollPaddingTop = '';
  });
})();

function positionArrowsAtHalfMediaHeight() {
  const arrowsImgCenterContainers = document.querySelectorAll('.arrows-img-center');
  
  arrowsImgCenterContainers.forEach(container => {
      const navigationButtons = container.querySelectorAll('.custom-swiper-navigation .swiper-button-prev, .custom-swiper-navigation .swiper-button-next');
      const productMedia = container.querySelector('.product--media');
      
      if (navigationButtons.length > 0 && productMedia) {
          // Get the actual height of the product--media element
          const mediaHeight = productMedia.offsetHeight;
          const halfMediaHeight = mediaHeight / 2;
          
          // Position buttons at half the media height, accounting for button height
          navigationButtons.forEach(button => {
              const buttonHeight = button.offsetHeight;
              const buttonCenterOffset = buttonHeight / 2;
              const finalPosition = halfMediaHeight - buttonCenterOffset + 10;
              
              button.style.top = finalPosition + 'px';
              button.style.transform = 'translateY(0)'; // Remove any existing transform
          });
      }
  });
}