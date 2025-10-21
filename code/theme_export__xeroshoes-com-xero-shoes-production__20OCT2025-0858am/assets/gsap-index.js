
// Wait for GSAP to be loaded before running any GSAP code
function waitForGSAP() {
  return new Promise((resolve) => {
    const checkGSAP = () => {
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        resolve();
      } else {
        setTimeout(checkGSAP, 100);
      }
    };
    checkGSAP();
  });
}

// Wait for both GSAP and the parallax elements to be available
async function initGSAPAnimations() {
  await waitForGSAP();
  
  const intervalId = setInterval(() => {
    let countprod = document.querySelectorAll(".parallax-imgs img");
    if(countprod.length > 0){
      clearInterval(intervalId);
      // Your code to run after the element is found
      console.log("Element found, running GSAP code.");
      runParallaxAnimations();
    }
  }, 500);
}

function runParallaxAnimations() {
  document.querySelectorAll(".parallax-imgs img").forEach((img) => {
    let anim01 = gsap.timeline().fromTo(img, {objectPosition: "center 100%"}, {objectPosition: "center 10%"}, 0);
    ScrollTrigger.create({
      trigger: img.parentElement,
      animation: anim01,
      start: "top bottom",
      end: "bottom top+=10%",
      scrub: 0.6,
      // markers: true
    });
  }); 

  // Image rotation
  ScrollTrigger.create({
    trigger: '.parallax-text-with-image',
    animation: gsap.timeline()
      .fromTo('.parallax-text-with-image .image-block', {rotation: 20}, {rotation: -20}),
    start: "top bottom",
    end: "bottom top",
    scrub: 2,
    // markers: {fontSize: "14px", indent: 0}
  });
  
  ScrollTrigger.matchMedia({
    "(min-width: 992px)": function () {
      // Random scroll speed for each text/image item
      gsap.utils.toArray('.parallax-ti-items > *').forEach((item) => {
        const randomY = gsap.utils.random(20, 50); // Adjust range as needed

        gsap.fromTo(item,
          { y: `${randomY}vh` },
          {
            y: `-${randomY}vh`,
            ease: "none",
            scrollTrigger: {
              trigger: '.parallax-text-with-image',
              start: "top bottom",
              end: "bottom top",
              scrub: 1.3,
              // markers: true
            }
          }
        );
      });
    }
  });

  ScrollTrigger.create({
    trigger: ".star-reviews-group",
    animation: gsap.timeline().fromTo(".border-element-anim", {width: 0}, {width: "100%"}, 0),
    start: "top bottom",
    end: "bottom-=20% center",
    scrub: 1,
    // markers: true
  }); 
}

// Initialize GSAP animations when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGSAPAnimations);
} else {
  initGSAPAnimations();
}
