let lastKey = null;
document.addEventListener('keydown', (e) => {
  lastKey = e.key;
});
document.addEventListener('focusin', (e) => {
  if (lastKey === 'Tab') {
    // console.log('Focused by Tab:', e.target);
  }
});


document.querySelectorAll("iframe").forEach(iframe => {
  iframe.setAttribute("tabindex", "-1");
});

if (window.innerWidth <= 991) {
    document.querySelectorAll(".d-none").forEach(ele => {
        ele.setAttribute("tabindex", "0");
    })
}else{
    document.querySelectorAll(".d-lg-none").forEach(ele => {
        ele.setAttribute("tabindex", "-1");
    })
}
document.querySelectorAll('[data-main-variants-selects] .swatch').forEach(label => {
  label.addEventListener('keydown', e => {
    const input = label.querySelector('input[type="radio"]');
    if (!input) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      label.classList.add('selected');
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const next = label.nextElementSibling || label.parentElement.firstElementChild;
      next && next.focus();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prev = label.previousElementSibling || label.parentElement.lastElementChild;
      prev && prev.focus();
    }
  });
});



// klaviyo form focus
