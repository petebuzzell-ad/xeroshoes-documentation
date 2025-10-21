class CartNote extends HTMLElement{
    constructor() {
        super();

        this.noteInput = this.querySelector('[name="note"]');
        this.submitBtn = this.querySelector('[data-saveNote]');
        this.resultEle = this.querySelector('[data-resultMsg]');

        if(this.noteInput) this.cartNoteInput();
    }

    /**
     * Manage Cart Notes
     */
    cartNoteInput() {
        const cartNoteEvents = ['input', 'paste'];
        cartNoteEvents.forEach((eventName) => {
            this.noteInput.addEventListener(eventName, () => {
                const defaultNote = this.noteInput.dataset.default;
                this.submitBtn.style.display = (defaultNote !== this.noteInput.value) ? 'block' : 'none';
            }, false);
        });

        // Cart Note Change event
        this.submitBtn.addEventListener("click", evt => {
            evt.preventDefault();
            const cartNote = this.noteInput.value.trim();
            if (cartNote.length <= 0) {
                alert('Add Note before proceeding');
                return;
            }

            const waitText = this.submitBtn.dataset.adding_txt || 'Saving...';
            this.submitBtn.innerHTML = waitText;
            this.submitBtn.disabled = true;
            this.updateCartNote();
        });
    }

    /**
     * Update Cart Note
     */
    updateCartNote() {
        const cartNote = this.noteInput.value.trim();
        const defaultText = this.submitBtn.dataset.default || 'Save';

        const body = JSON.stringify({ note: cartNote });
        fetch(`${routes.cart_update_url}`, { ...Utility.fetchConfig(), body })
            .then((response) => {
                if (response.status === 200) {
                    if (this.resultEle) {
                        this.resultEle.innerText = 'Added note to Order!';
                        Utility.manageResponseText(this.resultEle);
                    }
                    this.noteInput.dataset.default = cartNote;
                    this.submitBtn.style.display = 'none';
                    this.submitBtn.innerHTML = defaultText;
                    this.submitBtn.disabled = false;
                } else {
                    console.error('Request returned an error', response);
                    if (this.resultEle) {
                        this.resultEle.innerText = 'Failed to add note.';
                        Utility.manageResponseText(this.resultEle);
                    }
                    this.submitBtn.innerHTML = defaultText;
                    this.submitBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error('Request failed', error);
                if (this.resultEle) {
                    this.resultEle.innerText = 'An error occurred.';
                    Utility.manageResponseText(this.resultEle);
                }
                this.submitBtn.innerHTML = defaultText;
                this.submitBtn.disabled = false;
            });
    }
}
customElements.define("cart-note", CartNote);