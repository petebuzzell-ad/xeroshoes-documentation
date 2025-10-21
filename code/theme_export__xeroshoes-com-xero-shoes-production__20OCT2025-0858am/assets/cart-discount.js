/**
 * A custom element that applies a discount to the cart.
 */

class CartDiscount extends HTMLElement {
  
    constructor() {
        super();
        this.cartElement = document.querySelector('cart-form');
        
        this.form = this.querySelector('form');
        this.discountCodes = this.querySelectorAll('[data-remove-discount]');
      }

      connectedCallback() {
        this.form.addEventListener('submit', this.applyDiscount);
        this.discountCodes.forEach(code => code.addEventListener('click', this.removeDiscount));

        this.discountCodesObserver = new MutationObserver((mutations) => {
            this.discountCodes = this.querySelectorAll('[data-remove-discount]');
            this.discountCodes.forEach(code => code.addEventListener('click', this.removeDiscount));
        }).observe(this, {childList: true, subtree: true});
      }
    
      disconnectedCallback() {
        this.form.removeEventListener('submit', this.applyDiscount);
        this.discountCodes.forEach(code => code.removeEventListener('click', this.removeDiscount));

        this.discountCodesObserver?.disconnect();
      }

    /**
     * Handles updates to the cart note.
     * @param {SubmitEvent} event - The submit event on our form.
     */
    applyDiscount = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const form = event.currentTarget;
        const discountCode = form.querySelector('input[name="discount"]');
        if (!(discountCode instanceof HTMLInputElement)) return;

        const discountCodeValue = discountCode.value;

        try {
            const existingDiscounts = this.#existingDiscounts();
            if (existingDiscounts.includes(discountCodeValue)) return;

            existingDiscounts.push(discountCodeValue);

            const body = JSON.stringify({ discount: existingDiscounts.join(','), sections: [this.cartElement.dataset.sectionId] });
            const response = await fetch(`${routes.cart_update_url}`, { ...Utility.fetchConfig(), body });
            const data = await response.json();

            if (data.discount_codes.find(discount => discount.code === discountCodeValue && discount.applicable === false)) {
                console.warn('Discount code not applicable:', discountCodeValue);
                Utility.manageResponseText(this.querySelector('[data-discount-error]'));
                return;
            }

            this.cartElement?._updateCart(data.sections);
        } catch (error) {
            throw new Error("Error applying discount ", error);
        } finally {
            console.log('discount apply operation completed');
        }
    };

    /**
     * Handles removing a discount from the cart.
     * @param {MouseEvent | KeyboardEvent} event - The mouse or keyboard event in our pill.
     */
    removeDiscount = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const pill = event.currentTarget.closest('[data-discount-code]');
        if (!(pill instanceof HTMLLIElement)) return;

        const discountCode = pill.dataset.discountCode;
        if (!discountCode) return;

        const existingDiscounts = this.#existingDiscounts();
        const index = existingDiscounts.indexOf(discountCode);
        if (index === -1) return;

        existingDiscounts.splice(index, 1);

        try {
            const body = JSON.stringify({ discount: existingDiscounts.join(','), sections: [this.cartElement.dataset.sectionId] });
            const response = await fetch(`${routes.cart_update_url}`, { ...Utility.fetchConfig(), body });
            const data = await response.json();

            this.querySelector('input[name="discount"]').value = '';
            pill?.remove();
            this.cartElement?._updateCart(data.sections);
        } catch (error) {
            throw new Error("Error removing discount ", error);
        } finally {
            console.log('discount remove operation completed');
        }
    };

    /**
     * Returns an array of existing discount codes.
     * @returns {string[]}
     */
    #existingDiscounts() {
        /** @type {string[]} */
        const discountCodes = [];
        const discountPills = this.querySelectorAll('[data-discount-code]');
        for (const pill of discountPills) {
            if (pill instanceof HTMLLIElement && typeof pill.dataset.discountCode === 'string') {
                discountCodes.push(pill.dataset.discountCode);
            }
        }

        return discountCodes;
    }
}

if (!customElements.get('cart-discount')) {
  customElements.define('cart-discount', CartDiscount);
}
