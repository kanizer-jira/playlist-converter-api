/*
 * Manage individual socket connections and their respective groups of conversions
 */

const BaseModel = require('./basemodel');
const Logger    = require('../utils/logger-util');

class ConnectionModel extends BaseModel {

  constructor() {
    super(...arguments);
    this._classname = 'connectionmodel.js';
    this._type = 'connection';
    this._list = {}; // keyed list of connection instances
  }

  // `instance` here should be an object { socket, conversionModel }
  add(key, instance) {
    return super.add(...arguments);
  }

  remove(key, instance) {
    return super.remove(...arguments);
  }

  search(key) {
    return super.search(...arguments);
  }

  getKey(instance) {
    return super.getKey(...arguments);
  }

  // associate a conversion model with each socket
  getConversionModel(key) {
    return new Promise( (resolve, reject) => {
      this.search(key)
        .then( connection => resolve(connection.conversionModel))
        .catch(reject);
    });
  }

}

module.exports = ConnectionModel;
