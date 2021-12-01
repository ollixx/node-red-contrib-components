const EventEmitter = require('events');

class ComponentsEmitter extends EventEmitter { }
const componentsEmitter = new ComponentsEmitter()
componentsEmitter.setMaxListeners(0) // remove "MaxListenersExceededWarning"
module.exports = componentsEmitter;