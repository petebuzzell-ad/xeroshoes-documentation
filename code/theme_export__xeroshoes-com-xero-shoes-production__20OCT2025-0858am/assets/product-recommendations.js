class ProductRecommendations extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
            if(this.dataset.url.indexOf('intent=complementary') > -1){
              const complementaryParent = document.querySelector('[data-complementaryitems]');
              complementaryParent.classList.remove('d-none');
            }

            lazyImageObserver.observe();
            document.querySelectorAll('.swiper-button-next, .swiper-button-prev').forEach(button => {
              button?.removeAttribute('aria-controls');
            });
            
            // Run arrow positioning after dynamic content is loaded
            setTimeout(() => {
              if (typeof positionArrowsAtHalfMediaHeight === 'function') {
                positionArrowsAtHalfMediaHeight();
              }
            }, 100);
          }
        })
        .catch((e) => {
          console.error(e);
        });
    }
}
customElements.define('product-recommendations', ProductRecommendations);

// Make function globally accessible
window.positionArrowsAtHalfMediaHeight = function() {
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
};

document.addEventListener('DOMContentLoaded', function() {
  // Run on page load
  window.positionArrowsAtHalfMediaHeight();
  
  // Run on window resize to handle responsive changes
  window.addEventListener('resize', function() {
      // Debounce the resize event
      clearTimeout(window.resizeTimeout);
      window.resizeTimeout = setTimeout(window.positionArrowsAtHalfMediaHeight, 250);
  });
  
  // Run when images are loaded (in case they affect the media height)
  window.addEventListener('load', window.positionArrowsAtHalfMediaHeight);
  
  // Run when swiper is initialized (if there's a delay in rendering)
  setTimeout(window.positionArrowsAtHalfMediaHeight, 500);
});