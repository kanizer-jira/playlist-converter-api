const EventEmitter = require('events');

const emitters = {};

// getter for emitter collection by key
class ConverterEmitter {

  static get(key) {
    if(!emitters[key]) {
      emitters[key] = new EventEmitter();
    }
    return emitters[key];
  }

}

module.exports = ConverterEmitter;
