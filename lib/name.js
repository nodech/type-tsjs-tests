'use strict';

/**
 * Options for the netaddress.
 * @typedef {Object} NameOptions
 * @property {String} name
 */

/**
 * Net Address
 * Represents a network address.
 */

class Name {
  /** @type {String} */
  name;

  /**
   * Create a network address.
   * @param {Object} [options]
   */

  constructor(options) {
    this.name = options.name || 'test';
  }

  /**
   * Inject properties from host, port, and network.
   * @param {String} name
   * @returns {this}
   */

  fromName(name) {
    this.name = name;
    return this;
  }

  /**
   * @param {String} name
   * @returns {Name}
   */

  static fromName(name) {
    return new this().fromName(name);
  }
}

/*
 * Expose
 */

module.exports = Name;
