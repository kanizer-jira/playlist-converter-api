/*
 * Manage individual instances
 */

const Logger = require('../utils/logger-util');

class BaseModel {

  constructor() {
    this._classname = 'model.js';
    this._type = 'default';
    this._list = {}; // keyed list of instances
  }

  add(key, instance) {
    return new Promise( (resolve, reject) => {
      if(this._list[key]) {
        Logger.error(`${this._classname}: add(): ERROR -> Duplicate ${this._type} key.`);
        return reject(new Error(`Duplicate ${this._type} key.`));
      }

      this._list[key] = instance;
      return resolve(instance);
    });
  }

  remove(key, instance) {
    return new Promise( (resolve, reject) => {
      if(!this._list[key]) {
        Logger.error(`${this._classname}: remove(): ERROR -> Invalid ${this._type} key.`);
        return reject(new Error(`Invalid ${this._type} key.`));
      }

      delete this._list[key];
      return resolve({ key, list: this._list });
    });
  }

  search(key) {
    return new Promise( (resolve, reject) => {
      if(!this._list[key]) {
        Logger.error(`${this._classname}: search(): ERROR -> Invalid ${this._type} key.`);
        return reject(new Error(`Invalid ${this._type} key.`));
      }

      return resolve(this._list[key]);
    });
  }

  getKey(instance) {
    return new Promise( (resolve, reject) => {
      for(let key in this._list) {
        if(this._list[key] === instance) {
          return resolve(key);
        }
      }
      return reject(new Error(`Invalid ${this._type} instance.`));
    });
  }

}

module.exports = BaseModel;
