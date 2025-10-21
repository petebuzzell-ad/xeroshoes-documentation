/**
   * Manage Custom Countdown Timer
   *
   */
  class Countdown extends HTMLElement {
    constructor() {
      super();
  
      this.endDate = this.getAttribute("data-section_timer");
      if(this.endDate){
        this.manageCountdown(this.endDate);
      }
    }
  
    /**
     * 
     * @param endDate fetching from customization
     */
    manageCountdown(endDate){
      const countDownTimer = setInterval(() => { 
        const currentDate = Date.now();
        const startDateMilliseconds = new Date().getTime();
        const endDateMilliseconds = new Date(endDate).getTime();

        const difference = endDateMilliseconds-currentDate
        const expired = difference < 0 ? 1 : 0;
        
        if (expired === 1 || ((startDateMilliseconds-currentDate) > 0 )){
          this.classList.add('d-none');
          this.removeAttribute("data-start_date");
          clearInterval(countDownTimer);
        }else{
          let day = Math.floor(difference / 86400000);
          let hour = Math.floor((difference % 86400000) / 3600000);
          let min = Math.floor((difference % 3600000) / 60000);
          let sec = Math.floor((difference % 60000) / 1000);

          let dStr = "0" + day;
          let hStr = "0" + hour;
          let mStr = "0" + min;
          let sStr = "0" + sec;

          dStr =  dStr.slice(-2).split(''),
          hStr = hStr.slice(-2).split(''),
          mStr = mStr.slice(-2).split(''),
          sStr = sStr.slice(-2).split('');

          if(this.querySelector('[data-day_1]')) this.querySelector('[data-day_1]').textContent = dStr[0];
          if(this.querySelector('[data-hour_1]')) this.querySelector('[data-hour_1]').textContent = hStr[0];
          if(this.querySelector('[data-min_1]')) this.querySelector('[data-min_1]').textContent = mStr[0];
          if(this.querySelector('[data-sec_1]')) this.querySelector('[data-sec_1]').textContent = sStr[0];

          if(this.querySelector('[data-day_2]')) this.querySelector('[data-day_2]').textContent = dStr[1];
          if(this.querySelector('[data-hour_2]')) this.querySelector('[data-hour_2]').textContent = hStr[1];
          if(this.querySelector('[data-min_2]')) this.querySelector('[data-min_2]').textContent = mStr[1];
          if(this.querySelector('[data-sec_2]')) this.querySelector('[data-sec_2]').textContent = sStr[1];
        }
      }, 1000);
    }
}
customElements.define("custom-countdown", Countdown);