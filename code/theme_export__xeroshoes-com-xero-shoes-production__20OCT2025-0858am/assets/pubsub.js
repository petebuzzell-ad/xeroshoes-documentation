/* eslint-disable no-unused-vars */
const ON_CHANGE_DEBOUNCE_TIMER = 300;
const subscribers = {};
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  variantChange: 'variant-change',
  productATC: 'product-atc',
  optionChange: 'option-change'
};

class EventBus {
  constructor() {
      this.subscribers = {}; // Object to hold event subscribers
  }

  // Subscribe to an event
  subscribe(eventName, callback) {
      if (this.subscribers[eventName] === undefined) {
          this.subscribers[eventName] = [];
      }

      // Add the callback to the list of subscribers for the event
       if (!this.subscribers[eventName].includes(callback)) {
        this.subscribers[eventName].push(callback);
      }

      // Return an unsubscribe function
      return () => {
          this.subscribers[eventName] = this.subscribers[eventName].filter((cb) => cb !== callback);
      };
  }

  // Publish an event
  publish(eventName, data) {
      if (this.subscribers[eventName]) {
          this.subscribers[eventName].forEach((callback) => {
              callback(data);
          });
      }
  }
}

const eventBus = new EventBus();

/*
Initiate particular public event through eventBus
    eventBus.publish(PUB_SUB_EVENTS.${event_name}, {
        data: {
            data object
        }
    });
*/

/*
Subscribe to particular public event through eventBus
    1. Subscribe to variant change event 
    eventBus.subscribe(PUB_SUB_EVENTS.variantChange, (eventData) => {
        const { container, variant } = eventData.data;
    });
    
    2. Subscribe to option change event 
    eventBus.subscribe(PUB_SUB_EVENTS.optionChange, (eventData) => {
        const { target, selectedOptionValues } = eventData.data;
    });

    3. Subscribe to add to cart event 
    eventBus.subscribe(PUB_SUB_EVENTS.productATC, (eventData) => {
        const { item } = eventData.data;
    });

    4. Subscribe to cart update event
    eventBus.subscribe(PUB_SUB_EVENTS.cartUpdate, (eventData) => {
        const { action, item } = eventData.data;
    });
*/