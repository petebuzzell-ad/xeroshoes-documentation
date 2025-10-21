class recentlyProducts extends HTMLElement {
    constructor() {
      super();
      this.recentlyViewed = [];
      this.container = document.querySelector('.recently-viewed-main');

      this.manageRecentlyViewed();
    }
    
    manageRecentlyViewed(){
      let getRecentlyViewed = localStorage.getItem("user_recently_viewed");
      if (getRecentlyViewed != null) {
        this.recentlyViewed = JSON.parse(getRecentlyViewed);        
        this.recentlyViewed.reverse();

        if(this.recentlyViewed.length > 0) this.showRecentlyViewed(this.recentlyViewed);
      }
      
      if(window.globalSpace.template == 'product'){
        const productData = window.globalSpace.product;
        let requiredData = {
          id: productData.id,
          handle: productData.handle,
          title: productData.title,
          price: productData.price,
          compared_at_price: productData.compare_at_price,
          image: productData.featured_image
        }
        this.addToRecentlyViewed(requiredData);
      }
    }

    showRecentlyViewed(products) {
      let recentlyViewedHTML = '';
      let totalProducts = 0;
      products.forEach(product => {
        const currentProduct = window.globalSpace.product?.id || '123';
        const currentIndex = product.id == currentProduct;
        if(currentIndex == false){
          totalProducts += 1;
          recentlyViewedHTML += ` <swiper-slide>
            <div class="card card-product card-product-style-1 text-start rounded-0 border-0">
              <div class="card-img text-center border-0">
              <a href="/products/${product.handle}" class="d-block product-link position-relative">
              <img src="${product.image}"></a>
              </div>
              <div class="card-body bg-white ps-0 pe-0">
                <a href="/products/${product.handle}" class="d-block product-link h6"><h6 class="card-title m-0">${product.title}</h6></a>
                <span class="price m-0 p-0">${Utility.formatMoney(product.price, window.globalSpace.money_format)}</span>
              </div>
            </div>
          </swiper-slide>`;
        }
      });

      if(totalProducts > 0){
        let sliderHTML = `<swiper-container class="recentlyViewe--swiper"
          slides-per-view="1.2"
          space-between="15"
          loop="false"
          grabCursor="true"
          navigation="true" 
          >${recentlyViewedHTML}</swiper-container>`

        this.container.classList.remove('d-none');
        this.container.querySelector("recently-products").innerHTML = sliderHTML;
      }
    }

    addToRecentlyViewed(product) {
      const productExist = this.recentlyViewed.findIndex((x) => {
        return x.id == product.id;
      });

      if (productExist == -1) {
        this.recentlyViewed.push(product)
        localStorage.setItem(
          "user_recently_viewed",
          JSON.stringify(this.recentlyViewed)
        );
      }
    }
}
customElements.define("recently-products", recentlyProducts);

// Update Swiper slider breakpoints

const swiperRecentlyViewedEl = document.querySelector('.recentlyViewe--swiper');
const swiperRecentlyViewed = {
  breakpoints: {
      560: {
          slidesPerView: 2.1,
          spaceBetween: 20,
      },
      768: {
          slidesPerView: 3.1,
          spaceBetween: 30,
      },
      992: {
          slidesPerView: 3.6,
          spaceBetween: 30,
      },
      1200: {
        slidesPerView: 4,
        spaceBetween: 30,
      }
  },
  on: {
    init() {
      
    },
  },
};
Object.assign(swiperRecentlyViewedEl, swiperRecentlyViewed);
swiperRecentlyViewedEl.initialize();

// const swiperRecentlyViewedEl = document.querySelector('.recentlyViewe--swiper');
// let breakpoints = {
//     560: {
//         slidesPerView: 2.1,
//         spaceBetween: 20,
//     },
//     768: {
//         slidesPerView: 3.1,
//         spaceBetween: 30,
//     },
//     992: {
//         slidesPerView: 3.6,
//         spaceBetween: 30,
//     },
//     1200: {
//       slidesPerView: 4,
//       spaceBetween: 30,
//     }
// }
// swiperRecentlyViewedEl.breakpoints = breakpoints;
// swiperRecentlyViewedEl.update();