/**
 * Event Bus utility cho Vue 3
 * Thay thế cho $root.$on/$off/$emit trong Vue 2
 */

class EventBus {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  off(event, callback) {
    if (!this.events[event]) return
    
    if (callback) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback)
    } else {
      delete this.events[event]
    }
  }

  emit(event, ...args) {
    if (!this.events[event]) return
    
    this.events[event].forEach((callback) => {
      callback(...args)
    })
  }

  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }
}

// Export singleton instance
export default new EventBus()


















