/*
 * Manage individual conversion instances
 */

const BaseModel = require('./basemodel');

class ConversionModel extends BaseModel {

  constructor() {
    super(...arguments);
    this._classname = 'conversionmodel.js';
    this._type = 'conversion';
    this._list = {}; // keyed list of instances
  }

  add(key, instance) {
    return super.add(...arguments);
  }

  remove(key, instance) {
    return super.remove(...arguments);
  }

  removeTest(key, instance) {
    return new Promise( (resolve, reject) => {
      return reject('testing');
    });
  }

  search(key) {
    return super.search(...arguments);
  }

  getKey(instance) {
    return super.getKey(...arguments);
  }

}

module.exports = ConversionModel;
