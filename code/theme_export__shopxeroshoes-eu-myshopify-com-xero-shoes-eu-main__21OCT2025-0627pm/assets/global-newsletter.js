/**
   * Manage Newsletter Popup based on Cookie
   *
   */
 (function manageNewsletter() {
    const customerPosted = (window.location.href.search('[?&]customer_posted=true') !== -1);
    const $newsletterPopup = document.querySelector('#PopupModal-newsletter .modal');
  
    if(!$newsletterPopup){
      return;
    }
  
    const popupDelay = $newsletterPopup.dataset.popup_delay * 1000;
    const daysUntil = $newsletterPopup.dataset['period_until'];
    const newsletterPopupEnabled = $newsletterPopup.dataset['newsletter_enabled'] == "false" ? false : true;
    const newsletterPopupStatus = Utility.getCookie('newsletter_popup_status');
    const today = new Date();
    
    const expirationDate = new Date();
    expirationDate.setDate(today.getDate() + daysUntil);
    const time = expirationDate.getTime();
    const expireTime = time + 1000 * 36000;
    expirationDate.setTime(expireTime);
  
    // After successful registration get the 'customer_posted' parameter from URL and show popup for confirmation
    if (customerPosted) {
      $newsletterPopup.classList.add('open');
      SiteOverlay.prototype.showOverlay();
    }
  
    let newsletterCloseBtn = document.querySelector('[data-newsletter-close-btn]');
    if(newsletterCloseBtn){
      newsletterCloseBtn.addEventListener('click', () => {
        document.cookie = `newsletter_popup_status=disabled;expires=${expirationDate.toGMTString()};path=/`;
        $newsletterPopup.classList.remove('open');
        SiteOverlay.prototype.hideOverlay();
      });
    }
  
    // do not show the popup if the disabled status cookie exists
    if (newsletterPopupStatus === 'disabled' || !newsletterPopupEnabled) {
      return;
    }
  
    setTimeout(() => {
      $newsletterPopup.classList.add('open');
      SiteOverlay.prototype.showOverlay();
    }, popupDelay);
})();