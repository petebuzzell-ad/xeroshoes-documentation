class imageZoomJS {
    constructor() {
        this.overlay=null;
        this.enableZoomOnHover(2);
    }

    // create a container and set the full-size image as its background
    createOverlay=(image)=> {
        const overlayImage = document.createElement('img');
        overlayImage.setAttribute('data-overlay',true)

        overlayImage.setAttribute('src', `${image.src}`);
        this.overlay = document.createElement('div');
        this.prepareOverlay(this.overlay, overlayImage);
    
        image.style.opacity = '50%';
    
        image.parentElement.insertBefore(this.overlay, image);
        image.style.opacity = '100%';
    
        return this.overlay;
    };
  
    prepareOverlay=(container, image)=>{
        let newSrc=image.src.split('&width')[0];
        container.setAttribute('class', 'image-magnify-full-size');
        container.setAttribute('aria-hidden', 'true');
        container.style.backgroundImage = `url('${newSrc}')`;
        container.style.backgroundColor = 'var(--pe-color-secondary)';
    }

    moveWithHover=(image, event, zoomRatio)=>{
        // calculate mouse position
        const ratio = image.height / image.width;
        const container = event.target.getBoundingClientRect();
        const xPosition = event.clientX - container.left;
        const yPosition = event.clientY - container.top;
        const xPercent = `${xPosition / (image.clientWidth / 100)}%`;
        const yPercent = `${yPosition / ((image.clientWidth * ratio) / 100)}%`;
        
        // determine what to show in the frame
        this.overlay.style.backgroundPosition = `${xPercent} ${yPercent}`;
        this.overlay.style.backgroundSize = `${image.width * zoomRatio}px`;
    };

    magnify = (image, zoomRatio) => {
        this.overlay = this.createOverlay(image);
        this.overlay.onclick = () => this.overlay.remove();
        this.overlay.onmousemove = (event) => this.moveWithHover(image, event, zoomRatio);
        this.overlay.onmouseleave = () => this.overlay.remove();
    }

    enableZoomOnHover=(zoomRatio)=>{
        const images = document.querySelectorAll('.image-magnify-hover');
        images.forEach(image => {
            image.onclick = (event) => {
                this.magnify(image, zoomRatio);
                this.moveWithHover(image, event, zoomRatio);
            };
        });
    }
}
  
typeof imageZoomJS !== 'undefined' && new imageZoomJS();