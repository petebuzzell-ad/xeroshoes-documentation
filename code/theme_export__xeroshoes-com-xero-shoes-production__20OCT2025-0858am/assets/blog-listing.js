(() => {
const blogListingNodes = {
  container: document.getElementById('blog-listing-container')
}
class blogListing {
    constructor() {
        this.dynamicEleEvents();
    }

    dynamicEleEvents() {
        this.paginationLink = blogListingNodes.container.querySelector('[data-loadmore]');
        this.paginationLink.addEventListener('click', this._managePagination.bind(this));
    }

     /**
     * 
     * @param {String} url URL for fetching results
     */
    async renderGridFromFetch(url) {
        if(!url) return;

        const sectionID = blogListingNodes.container.dataset.section;
        url += `&sections=${sectionID}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const gridHTML = data[sectionID];
            this.renderBlogListingGrid(gridHTML);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    async _managePagination(event){
        event.preventDefault();
        const _this = event.currentTarget;
        await this.renderGridFromFetch(_this.href, 'pagination');
    }

    renderBlogListingGrid(grid) {
        const html = new DOMParser().parseFromString(grid, 'text/html');
        const blogListingGrids = blogListingNodes.container.querySelector('[data-blog-listing-grid]');
        const loadMoreBtn = blogListingNodes.container.querySelector('[data-loadmore]');

        blogListingGrids.insertAdjacentHTML('beforeend', html.querySelector('[data-blog-listing-grid]').innerHTML);

        const newLoadMoreBtn = html.querySelector('[data-loadmore]');
        if (newLoadMoreBtn && loadMoreBtn) {
            loadMoreBtn.parentNode.replaceChild(newLoadMoreBtn, loadMoreBtn);
        } else if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
        lazyImageObserver.observe();
        this.dynamicEleEvents();
    }
}
if (typeof blogListing !== 'undefined') new blogListing();
})();