/* eslint-disable no-restricted-syntax */
const trapFocusHandlers = {};
const Utility = {

  /**
    * Gathers all focusable elements and return Node Array
    *
    * @return {Node array} elements - Focusable elements
  */
  getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        ".filter__container, [type='button'], a[href], a[data-href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):not([tabindex^='-']):enabled, select:enabled, textarea:enabled, object, iframe"
      )
    );
  },

  /**
    * Attempts to focus an element, and if unsuccessful adds tabindex to the
    * element and focuses it. Tabindex is removed on element blur.
    *
    * @param {HTML Node} element - The element to be focused
  */
  forceFocus(element) {    
    if(!element) return;
    
    element.focus();

    let isFocused = false;
    if (element == document.activeElement) {
      isFocused = true;
    }

    if(!isFocused){
      element.setAttribute('tabindex', '0');
      setTimeout(() =>{
        element.focus();
      }, 500);
    }
  },

  /**
    * Trap focus within container between first and last element
    *
    * @param {Node Array} elements - container to trap focus
  */
  trapFocus(container, elementToFocus = container) {
    const elements = this.getFocusableElements(container);
    const first = elements[0];
    const last = elements[elements.length - 1];
    
    this.removeTrapFocus();

    trapFocusHandlers.focusin = (event) => {
      // console.log(event.target, container, last, first);
      if (
        event.target !== container &&
        event.target !== last &&
        event.target !== first
      )
      return;

      document.addEventListener('keydown', trapFocusHandlers.keydown);
    };

    trapFocusHandlers.focusout = () => {
      document.removeEventListener('keydown', trapFocusHandlers.keydown);
    };

    trapFocusHandlers.keydown = (event) => {
      if (event.code && event.code.toUpperCase() !== 'TAB') return; // If not TAB key
      if (event.target === last && !event.shiftKey) {
        event.preventDefault();
        first.focus();
      }

      //  On the first focusable element and tab backward, focus the last element.
      if (
        (event.target === container || event.target === first) &&
        event.shiftKey
      ) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('focusout', trapFocusHandlers.focusout);
    document.addEventListener('focusin', trapFocusHandlers.focusin);

    if(!elementToFocus || elementToFocus == undefined) elementToFocus = container;
    elementToFocus.focus();
  },

  /**
    * Release focus from focused elements
    *
    * @param {Node Array} elements - Release focus from these elements
  */
  removeTrapFocus(elementToFocus = null) {
    document.removeEventListener('focusin', trapFocusHandlers.focusin);
    document.removeEventListener('focusout', trapFocusHandlers.focusout);
    document.removeEventListener('keydown', trapFocusHandlers.keydown);

    if (elementToFocus) elementToFocus.focus();
  },

  /**
    * Limit the number of times a function is called within defined timeout
    *
    * @param {function} fn - function to execute
    * @param {integer} wait - Timeout to fire event
  */
  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  /**
   * Return an object from an array of objects that matches the provided key and value
   *
   * @param {array} array - Array of objects
   * @param {string} key - Key to match the value against
   * @param {string} value - Value to get match of
   */
  findInstance(array, key, value) { // Return an object from an array of objects that matches the provided key and value
    for (let i = 0; i < array.length; i += 1) {
      if (array[i][key] === value) {
        return array[i];
      }
    }
    return null;
  },

  /**
   * Remove an object from an array of objects by matching the provided key and value
   *
   * @param {array} array - Array of objects
   * @param {string} key - Key to match the value against
   * @param {string} value - Value to get match of
   */
   removeInstance(array, key, value) {
    if (!Array.isArray(array)) {
      throw new TypeError('Expected an array');
    }

    for (let i = 0; i < array.length; i+=1) {
      if (array[i][key] === value) {
        array.splice(i, 1);
        return array; // Return the modified array
      }
    }
    return array; // Return the array unchanged if no instance was found
  },

  /**
   * _.compact from lodash
   * Remove empty/false items from array
   * Source: https://github.com/lodash/lodash/blob/master/compact.js
   *
   * @param {array} array
   */
   compact(array) {
    if (!Array.isArray(array)) {
      throw new TypeError('Expected an array');
    }

    const result = [];
    for (let i = 0; i < array.length; i+=1) {
        const value = array[i];
        if (value) {
            result.push(value);
        }
    }
    return result;
  },

  /**
   * Remove duplicates from an array of objects
   * @param arr - Array of objects
   * @param prop - Property of each object to compare
   * @returns {Array}
   */
  removeDuplicates(arr, key = 'id') {
    const map = new Map();
    // eslint-disable-next-line array-callback-return
    arr.map((el) => {
      if (!map.has(el[key])) {
        map.set(el[key], el);
      }
    });
    return [...map.values()];
  },

  /**
   * Format date
   * @param  {string}
   * @return {String} value - formatted value
   */
  formatDate(value) {
    const date = new Date(value);
    const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
    const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
    const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
    return `${mo} ${da} ${ye}`;
  },

  /**
   * Converts a string as handle
   *
   * @param {*} str - String to check
   * @returns {*} - Returns the resolved string
   */
  handleize(str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  },

  /**
   * Converts a handle to readable friendly format
   *
   * @param {*} str - String to check
   * @returns {*} - Returns the resolved string
   */
  unhandleize(str) {
    const returnString = this._toCamelCase(str.replace(/-/g, ' '));
    return returnString;
  },

  /**
    * Serialize form data
    * @param {form} form - target form
  */
  serializeForm(form) {
    if (!(form instanceof HTMLFormElement)) {
        throw new TypeError('Expected a form element');
    }

    const obj = {};
    const formData = new FormData(form);
    const regex = /^properties\[(.*?)\]$/;

    for (const key of formData.keys()) {
        const match = regex.exec(key);
        if (match) {
            const propertyKey = match[1]; // Extract the property key
            obj.properties = obj.properties || {};
            obj.properties[propertyKey] = formData.get(key);
        } else {
            obj[key] = formData.get(key);
        }
    }
    return obj;
  },

  /**
    * Fetch call config
    *
    * @param {string} type - request Accept type
  */
  fetchConfig(type = 'json', config = {}) {
    /** @type {Headers} */
    const headers = { 'Content-Type': 'application/json', Accept: `application/${type}`, ...config.headers };

    if (type === 'javascript') {
      headers['X-Requested-With'] = 'XMLHttpRequest';
      delete headers['Content-Type'];
    }

    return {
      method: 'POST',
      headers: /** @type {HeadersInit} */ (headers),
      body: config.body,
    };
  },

  removeProtocol(path) {
    return path.replace(/http(s)?:/, '');
  },

  setCookie(cookieName, value, expdays) { // set cookies
    const expdate = new Date();
    expdate.setDate(expdate.getDate() + expdays);
    const expString = (expdate == null) ? "" : `; expires="${expdate.toUTCString()}; path=/`;
    const cookieValue = `${encodeURI(value)}${expString}`;
    document.cookie = `${cookieName}=${cookieValue}`;

    return document.cookie;
  },

  getCookie(cookieName) { // get cookies
    const name = `${cookieName}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(const element of ca) {
        let c = element;
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
    }
    return "";
  },

  removeCookie(cookieName) { // remove cookie
    document.cookie = `${cookieName}=;max-age=0`;
    return document.cookie;
  },

  /**
   * Build URL based on following parameters
   * @param {*} url 
   * @param {*} paramName 
   * @param {*} paramValue 
   */
  replaceUrlParam(url, paramName, paramValue){
    const pattern = new RegExp(`(\\?|\\&)(${paramName}=).*?(&|$)`);
    let newUrl = url;
    if(url.search(pattern) >= 0){
      newUrl = url.replace(pattern,`$1$2${paramValue}$3`);
    }else{
      newUrl = `${newUrl + (newUrl.indexOf('?')>0 ? '&' : '?')  }${paramName}=${paramValue}`;
    }

    return newUrl
  },

  /**
   * local storage handling code 
   * @param {*} key 
   * @param {*} value 
   * @returns 
   */
  setLocalStorage(key,value) {
    window.localStorage.setItem(key, value);
    return window.localStorage;
  },

  /**
   * Get Local Storage value based on key
   * @param {*} key 
   */
  getLocalStorage(key) {
    return window.localStorage.getItem(key);
  },

  /**
   * Remove Local Storage value based on key
   * @param {*} key 
   */
  removeFromLocalStorage(key) {
    window.localStorage.removeItem(key);
    return window.localStorage;
  },

  /**
   * session storage handling code
   * @param {*} key 
   * @param {*} value 
 */
  setSessionStorage(key,value) {
    window.sessionStorage.setItem(key, value);
    return window.sessionStorage;
  },

  /**
   * Get Session Storage value based on key
   * @param {*} key 
   */
  getSessionStorage(key) {
    return window.sessionStorage.getItem(key);
  },

  /**
   * Remove session storage based on key
   * @param {*} key 
   * @returns 
   */
  removeFromSessionStorage(key) {
    window.sessionStorage.removeItem(key);
    return window.sessionStorage;
  },

  /**
   * Get URL parameter
   */
  getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  },

  /**
   * Vibrate mobile device
   */
  vibrateDevice() {
    const vibrationEnabled = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
    if (vibrationEnabled) {
      navigator.vibrate(100);
    }
  },

  /**
   * XMLHTTPS request using javascript
  */
  _XMLHttpRequest(method, URL, data, callback) {
    const newDataRequest = new XMLHttpRequest();
    newDataRequest.open(method, URL, true);
    newDataRequest.setRequestHeader('Accept', 'application/json')
    newDataRequest.setRequestHeader('Content-Type', 'application/json')
    newDataRequest.onload = () => {
        callback(newDataRequest.status, this.response)
    }
    if(method == 'GET'){ newDataRequest.send();}
    else{ newDataRequest.send(JSON.stringify(data));}
  },

  /**
   * manage history
   */
  goBack() { // Previous page
    return window.history.back()
  },

  goForward() { // Forward page
    return window.history.forward()
  },

  /**
   * Push History State
   * @param {String} state 
   * @param {String} title 
   * @param {String} url 
   */
  pushHistoryState(state,title,url) {
    return window.history.pushState(state, title, url)
  },

  /**
   * Replace History State
   * @param {String} state 
   * @param {String} title 
   * @param {String} url 
   */
  replaceHistoryState(state,url) {
    return window.history.replaceState(state, '', url)
  },

  /**
   * Get swatch hex color code or image url
   *
   * @param {string} colorName
   * @returns {string} background style hex code
  */
  getSwatchStyle(colorName) {
    const swatchesColorList = JSON.parse(document.querySelector('[data-swatches-colorlist-json]').innerText);
    colorName = colorName.replace(/-|\s/g, '').toLowerCase();
    const swatch = swatchesColorList[colorName];
    let swatchStyle;
    if (typeof swatch !== 'undefined') {
      if (swatch.match(/\.(jpeg|jpg|png|gif)/g) != null) {
        swatchStyle = `background-image: url(${swatch})`;
      } else {
        swatchStyle = `background-color: ${swatch}`;
      }
      return swatchStyle;
    }
    return false;
  },

  /**
   * Truncates a given string
   *
   * @param {String} value - Value to check
   * @param {Number} count - Count number of words
   * @returns {*} - Returns the resolved value
   */
  truncate(value, count) {
    const strippedString = value.trim();
    const array = strippedString.split(' ');
    value = array.splice(0, count).join(' ');
    if (array.length > count) {
      value += '...';
    }
    return value;
  },

  /**
   * detect if the device is touch based
   */

  is_touch_enabled() {
    return ( 'ontouchstart' in window ) || ( navigator.maxTouchPoints > 0 ) ||  ( navigator.msMaxTouchPoints > 0 );
  },

  getAllSiblings(element, parent) {
    const children = [...parent.children];
    return children.filter(child => child !== element);
  },

  /**
   * Toggle animation for element
   * @param {Node} container - Parent node of toggled element
   * @param {String} activity - open/close
   */
  toggleElement(container, activity) {
    const contentBlock = container.querySelector('[data-type="content"]') || container.querySelector('.toggle-content');
    if(!contentBlock) return;

    if(activity == 'open'){
      [contentBlock,container].forEach(ele => ele.classList.add('open'));
      
      contentBlock.setAttribute('aria-hidden', false);
    }else{
      [contentBlock,container].forEach(ele => ele.classList.remove('open'));
      
      contentBlock.setAttribute('aria-hidden', true);
    }
  },

   /**
   * Fade Effect
   */
   fadeEffect(elem, action) {
    const FADE_STEP = 0.01; // Amount to change opacity by
    const FADE_INTERVAL = 10; // Interval in milliseconds

    if (action === 'fadeIn') {
      elem.style.display = 'block';
      elem.style.opacity = 0;
      const fadeIn = () => {
          let newValue = parseFloat(elem.style.opacity);
          if (newValue < 1) {
              newValue += FADE_STEP;
              elem.style.opacity = newValue;
              requestAnimationFrame(fadeIn);
          } else {
              elem.style.opacity = 1; // Ensure opacity is set to 1
          }
      };
      requestAnimationFrame(fadeIn);
    } else if (action === 'fadeOut') {
      elem.style.opacity = 1;
      const fadeOut = () => {
          let newValue = parseFloat(elem.style.opacity);
          if (newValue > 0) {
              newValue -= FADE_STEP;
              elem.style.opacity = newValue;
              requestAnimationFrame(fadeOut);
          } else {
              elem.style.opacity = 0; // Ensure opacity is set to 0
              elem.style.display = 'none';
          }
      };
      requestAnimationFrame(fadeOut);
    }
  },

  /**
   * Email Validation
   * @param {*} email 
   */
  validateEmail(email){
    return email.match(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
  },

  /**
   * Format money values based on your shop currency settings
   * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents or 3.00 dollars
   * @return {String} value - formatted value
   */
	formatMoney(cents, format) {
    if (format == null || format == undefined){
      format = window.globalSpace.money_format || "${{ amount }}";
    }
    if (typeof cents == 'string') { cents = cents.replace('.',''); }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = (format || this.money_format);
    function defaultOption(opt, def) {
      
      return (typeof opt == 'undefined' ? def : opt);
    }
    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal   = defaultOption(decimal, '.');
      if (isNaN(number) || number == null) { return 0; }
      number = (number/100.0).toFixed(precision);
      var parts   = number.split('.'),
          dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
          cents   = parts[1] ? (decimal + parts[1]) : '';
      return dollars + cents;
    }
    switch(formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }
    return formatString.replace(placeholderRegex, value);
  },

  arrayIncludes(arr, value) {
    for (let i = 0; i < arr.length; i+=1) {
      if (arr[i] == value) return true;
    }
    return false;
  },

  uniq(arr) {
    const result = [];
    for (let i = 0; i < arr.length; i+=1) {
      if (!this.arrayIncludes(result, arr[i])) {
        result.push(arr[i]);
      }
    }
    return result;
  },

  /**
     * Fade effect on response
     * @param {element} element 
     */
  manageResponseText(element) {
    this.fadeEffect(element, 'fadeIn');
    setTimeout(() => {
        this.fadeEffect(element, 'fadeOut');
    }, 3000);
  },

  /**
   * Update source from destination
   * @param {string} id 
   * @param {string} html 
   * @param {element} container 
   */
  updateSourceFromDestination(id, html, container = document) {
    const source = html.querySelector(id);
    const destination = container.querySelector(id);

    if (source && destination) {
      destination.innerHTML = source.innerHTML;
      destination.classList.remove('d-none');
    }else{
      destination?.classList.add('d-none')
    }
  },

  handleError(e, title = 'Error') {
    window.notificationEle.updateNotification(title, e, {
      type: 'error',
      timeout: 8000
    });
  },

  handleSuccess(e, title = 'Success') {
    window.notificationEle.updateNotification(title, e, {
      type: 'success',
      timeout: 8000
    });
  },

  setLoadingState(isLoading, element = null) {
    if(element == null) return;

    if (isLoading) {
      element.setAttribute('aria-disabled', true);
      element.classList.add('loading');
    } else {
      element.classList.remove('loading');
      element.removeAttribute('aria-disabled');
    }
  }
}