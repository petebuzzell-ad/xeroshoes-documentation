/**
   * Manage Custom Countdown Timer
   *
   */
class QuantityInput extends HTMLElement {
    constructor() {
        super();

        this.qtyBtns = this.querySelectorAll('[data-qty-btn]');
        this.qtyInput = this.querySelector('[data-qty-input]');
        this.pricePerItem = this.querySelector('[data-price-per-item]')
        this.priceBreakData = this.querySelector('[data-price-break-json]');
        if (this.priceBreakData) {
            this.priceBreakData = JSON.parse(this.priceBreakData.textContent);
        }
    }

    connectedCallback() {
        this.qtyBtns?.forEach(qtyBtn => qtyBtn.addEventListener('click', this.manageQtyBtn.bind(this)));
        this.qtyBtns?.forEach(qtyBtn => qtyBtn.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                this.manageQtyBtn(e);
            }
        }) );
    }

    /**
     * Product Form Quantity Input update action
     */
    manageQtyBtn(event) {
        const {currentTarget} = event;

        event.preventDefault();
        const action = currentTarget.dataset.for || 'increase';
        const decreaseQtyBtn = this.querySelector('[data-for="decrease"]');
        const currentQty = parseInt(this.qtyInput.value) || 1;
        const max = parseInt(this.qtyInput.max) || null; // Ensure max is an integer
        const min = parseInt(this.qtyInput.min) || 1; // Ensure min is an integer
        const step = parseInt(this.qtyInput.step) || 1; // Ensure step is an integer
        let finalQty;

        if (action === 'decrease') {
            finalQty = Math.max(currentQty - step, min);
        } else {
            finalQty = max !== null ? Math.min(currentQty + step, max) : currentQty + step;
        }

        this.qtyInput.value = finalQty; // Update the input value
        decreaseQtyBtn?.classList.toggle('disabled', finalQty <= min); // Disable button if at min

        if(this.priceBreakData && this.pricePerItem) this.updatePricePerItem(finalQty);
        this.qtyInput.dispatchEvent(new Event('change'));
    }

    updatePricePerItem(qty){
        this.priceBreakData.map(item => {
            if (qty >= item.minimum_quantity) {
                this.pricePerItem.innerHTML = window.volumePricingStrings.price_at_each.replace('{{ price }}', Utility.formatMoney(item.price, window.globalSpace.money_format));
                return;
            }
        });
    }

}
customElements.define("quantity-input", QuantityInput);