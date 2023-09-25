/*!
 * netaddress.js - network address object for hsd
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * https://github.com/handshake-org/hsd
 */

'use strict';

const assert = require('bsert');
const bio = require('bufio');
const IP = require('binet');

/** @typedef {bio.BufferReader} BufferReader */
/** @typedef {bio.BufferWriter} BufferWriter */
/** @typedef {import('net').Socket} Socket */

/*
 * Constants
 */

const ZERO_KEY = Buffer.alloc(33, 0x00);

/**
 * @typedef {Object} NetAddressOptions
 * @property {String} host
 * @property {Number} port
 * @property {Number?} time
 * @property {Number?} services
 * @property {Buffer?} key
 */

/**
 * Net Address
 * Represents a network address.
 * @alias module:net.NetAddress
 * @property {Host} host
 * @property {Number} port
 * @property {Number} services
 * @property {Number} time
 */

class NetAddress extends bio.Struct {
  /** @type {String} */
  host;

  /** @type {Number} */
  port;

  /** @type {Number} */
  services;

  /** @type {Number} */
  time;

  /** @type {String} */
  hostname;

  /** @type {Buffer} */
  raw;

  /** @type {Buffer} */
  key;

  /**
   * Create a network address.
   * @param {NetAddressOptions} [options]
   */

  constructor(options) {
    super();

    this.host = '0.0.0.0';
    this.port = 0;
    this.services = 0;
    this.time = 0;
    this.hostname = '0.0.0.0:0';
    this.raw = IP.ZERO_IPV4;
    this.key = ZERO_KEY;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options object.
   * @param {NetAddressOptions} options
   */

  fromOptions(options) {
    assert(typeof options.host === 'string',
      'NetAddress requires host string.');
    assert(typeof options.port === 'number',
      'NetAddress requires port number.');
    assert(options.port >= 0 && options.port <= 0xffff,
      'port number is incorrect.');

    this.raw = IP.toBuffer(options.host);
    this.host = IP.toString(this.raw);
    this.port = options.port;

    if (options.services) {
      assert(typeof options.services === 'number',
        'services must be a number.');
      this.services = options.services;
    }

    if (options.time) {
      assert(typeof options.time === 'number',
        'time must be a number.');
      this.time = options.time;
    }

    if (options.key) {
      assert(Buffer.isBuffer(options.key), 'key must be a buffer.');
      assert(options.key.length === 33, 'key length must be 33.');
      this.key = options.key;
    }

    this.hostname = IP.toHostname(this.host, this.port, this.key);

    return this;
  }

  /**
   * Test whether required services are available.
   * @param {Number} services
   * @returns {Boolean}
   */

  hasServices(services) {
    return (this.services & services) === services;
  }

  /**
   * Test whether the address is IPv4.
   * @returns {Boolean}
   */

  isIPv4() {
    return IP.isIPv4(this.raw);
  }

  /**
   * Test whether the address is IPv6.
   * @returns {Boolean}
   */

  isIPv6() {
    return IP.isIPv6(this.raw);
  }

  /**
   * Test whether the address is RFC3964.
   * @returns {Boolean}
   */

  isRFC3964() {
    return IP.isRFC3964(this.raw);
  }

  /**
   * Test whether the address is RFC4380.
   * @returns {Boolean}
   */

  isRFC4380() {
    return IP.isRFC4380(this.raw);
  }

  /**
   * Test whether the address is RFC6052.
   * @returns {Boolean}
   */

  isRFC6052() {
    return IP.isRFC6052(this.raw);
  }

  /**
   * Test whether the address is RFC6145.
   * @returns {Boolean}
   */

  isRFC6145() {
    return IP.isRFC6145(this.raw);
  }

  /**
   * Test whether the host is null.
   * @returns {Boolean}
   */

  isNull() {
    return IP.isNull(this.raw);
  }

  /**
   * Test whether the host is a local address.
   * @returns {Boolean}
   */

  isLocal() {
    return IP.isLocal(this.raw);
  }

  /**
   * Test whether the host is valid.
   * @returns {Boolean}
   */

  isValid() {
    return IP.isValid(this.raw);
  }

  /**
   * Test whether the host is routable.
   * @returns {Boolean}
   */

  isRoutable() {
    return IP.isRoutable(this.raw);
  }

  /**
   * Test whether the host is an onion address.
   * @returns {Boolean}
   */

  isOnion() {
    return IP.isOnion(this.raw);
  }

  /**
   * Test whether the peer has a key.
   * @returns {Boolean}
   */

  hasKey() {
    return !this.key.equals(ZERO_KEY);
  }

  /**
   * Compare against another network address.
   * @param {NetAddress} addr
   * @returns {Boolean}
   */

  equal(addr) {
    return this.compare(addr) === 0;
  }

  /**
   * Compare against another network address.
   * @param {NetAddress} addr
   * @returns {Number}
   */

  compare(addr) {
    const cmp = this.raw.compare(addr.raw);

    if (cmp !== 0)
      return cmp;

    return this.port - addr.port;
  }

  /**
   * Get reachable score to destination.
   * @param {NetAddress} dest
   * @returns {Number}
   */

  getReachability(dest) {
    return IP.getReachability(this.raw, dest.raw);
  }

  /**
   * Get the canonical identifier of our network group
   * @returns {Buffer}
   */

  getGroup() {
    return groupKey(this);
  }

  /**
   * Set null host.
   */

  setNull() {
    this.raw = IP.ZERO_IPV4;
    this.host = '0.0.0.0';
    this.key = ZERO_KEY;
    this.hostname = IP.toHostname(this.host, this.port, this.key);
  }

  /**
   * Set host.
   * @param {String} host
   */

  setHost(host) {
    this.raw = IP.toBuffer(host);
    this.host = IP.toString(this.raw);
    this.hostname = IP.toHostname(this.host, this.port, this.key);
  }

  /**
   * Set port.
   * @param {Number} port
   */

  setPort(port) {
    assert(port >= 0 && port <= 0xffff);
    this.port = port;
    this.hostname = IP.toHostname(this.host, this.port, this.key);
  }

  /**
   * Set key.
   * @param {Buffer} key
   */

  setKey(key) {
    if (key == null)
      key = ZERO_KEY;

    assert(Buffer.isBuffer(key) && key.length === 33);

    this.key = key;
    this.hostname = IP.toHostname(this.host, this.port, this.key);
  }

  /**
   * Get key.
   * @param {String} enc
   * @returns {String|Buffer}
   */

  getKey(enc) {
    if (!this.hasKey())
      return null;

    if (enc === 'hex')
      return this.key.toString('hex');

    return this.key;
  }

  /**
   * Inject properties from host, port, and network.
   * @private
   * @param {String} host
   * @param {Number} port
   * @param {Buffer} [key]
   * @returns {this}
   */

  fromHost(host, port, key) {
    assert(port >= 0 && port <= 0xffff);
    assert(!key || Buffer.isBuffer(key));
    assert(!key || key.length === 33);

    this.raw = IP.toBuffer(host);
    this.host = IP.toString(this.raw);
    this.port = port;
    this.services = NetAddress.DEFAULT_SERVICES;
    this.time = Date.now();
    this.key = key || ZERO_KEY;
    this.hostname = IP.toHostname(this.host, this.port, this.key);

    return this;
  }

  /**
   * Instantiate a network address
   * from a host and port.
   * @param {String} host
   * @param {Number} port
   * @param {Buffer} [key]
   * @returns {NetAddress}
   */

  static fromHost(host, port, key) {
    return new this().fromHost(host, port, key);
  }

  /**
   * Inject properties from hostname and network.
   * @param {String} hostname
   */

  fromHostname(hostname, network) {
    const addr = IP.fromHostname(hostname);

    if (addr.port === 0)
      addr.port = addr.key ? network.brontidePort : network.port;

    return this.fromHost(addr.host, addr.port, addr.key);
  }

  /**
   * Instantiate a network address
   * from a hostname (i.e. 127.0.0.1:8333).
   * @param {String} hostname
   * @returns {NetAddress}
   */

  static fromHostname(hostname) {
    return new this().fromHostname(hostname);
  }

  /**
   * Inject properties from socket.
   * @private
   * @param {Socket} socket
   */

  fromSocket(socket) {
    const host = socket.remoteAddress;
    const port = socket.remotePort;
    assert(typeof host === 'string');
    assert(typeof port === 'number');
    return this.fromHost(IP.normalize(host), port, null);
  }

  /**
   * Instantiate a network address
   * from a socket.
   * @param {Socket} socket
   * @returns {NetAddress}
   */

  static fromSocket(socket) {
    return new this().fromSocket(socket);
  }

  /**
   * Calculate serialization size of address.
   * @returns {Number}
   */

  getSize() {
    return 88;
  }

  /**
   * Write network address to a buffer writer.
   * @param {BufferWriter} bw
   * @returns {BufferWriter}
   */

  write(bw) {
    bw.writeU64(this.time);
    bw.writeU32(this.services);
    bw.writeU32(0);
    bw.writeU8(0);
    bw.writeBytes(this.raw);
    bw.fill(0, 20); // reserved
    bw.writeU16(this.port);
    bw.writeBytes(this.key);
    return bw;
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br
   * @returns {this}
   */

  read(br) {
    this.time = br.readU64();
    this.services = br.readU32();

    // Note: hi service bits
    // are currently unused.
    br.readU32();

    if (br.readU8() === 0) {
      this.raw = br.readBytes(16);
      br.seek(20);
    } else {
      this.raw = Buffer.alloc(16, 0x00);
      br.seek(36);
    }

    this.port = br.readU16();
    this.key = br.readBytes(33);

    this.host = IP.toString(this.raw);
    this.hostname = IP.toHostname(this.host, this.port, this.key);

    return this;
  }

  /**
   * Convert net address to json-friendly object.
   * @returns {Object}
   */

  getJSON() {
    return {
      host: this.host,
      port: this.port,
      services: this.services,
      time: this.time,
      key: this.key.toString('hex')
    };
  }

  /**
   * Inject properties from json object.
   * @param {Object} json
   * @returns {this}
   */

  fromJSON(json) {
    assert((json.port & 0xffff) === json.port);
    assert((json.services >>> 0) === json.services);
    assert((json.time >>> 0) === json.time);
    assert(typeof json.key === 'string');
    this.raw = IP.toBuffer(json.host);
    this.host = json.host;
    this.port = json.port;
    this.services = json.services;
    this.time = json.time;
    this.key = Buffer.from(json.key, 'hex');
    this.hostname = IP.toHostname(this.host, this.port, this.key);
    return this;
  }

  /**
   * Inspect the network address.
   * @returns {Object}
   */

  format() {
    return '<NetAddress:'
      + ` hostname=${this.hostname}`
      + ` services=${this.services.toString(2)}`
      + ` date=${this.time}`
      + '>';
  }

  /**
   * @param {BufferReader} br
   * @returns {NetAddress}
   */

  static read(br) {
    return new this().read(br);
  }
}

/**
 * Default services for
 * unknown outbound peers.
 * @const {Number}
 * @default
 */

NetAddress.DEFAULT_SERVICES = 0;

/*
 * Helpers
 */

/**
 * @param {NetAddress} addr
 * @returns {Buffer}
 */

function groupKey(addr) {
  const raw = addr.raw;

  // See: https://github.com/bitcoin/bitcoin/blob/e258ce7/src/netaddress.cpp#L413
  // Todo: Use IP->ASN mapping, see:
  // https://github.com/bitcoin/bitcoin/blob/adea5e1/src/addrman.h#L274
  let type = IP.networks.INET6; // NET_IPV6
  let start = 0;
  let bits = 16;
  let i = 0;

  if (addr.isLocal()) {
    type = 255; // NET_LOCAL
    bits = 0;
  } else if (!addr.isRoutable()) {
    type = IP.networks.NONE; // NET_UNROUTABLE
    bits = 0;
  } else if (addr.isIPv4() || addr.isRFC6145() || addr.isRFC6052()) {
    type = IP.networks.INET4; // NET_IPV4
    start = 12;
  } else if (addr.isRFC3964()) {
    type = IP.networks.INET4; // NET_IPV4
    start = 2;
  } else if (addr.isRFC4380()) {
    const buf = Buffer.alloc(3);
    buf[0] = IP.networks.INET4; // NET_IPV4
    buf[1] = raw[12] ^ 0xff;
    buf[2] = raw[13] ^ 0xff;
    return buf;
  } else if (addr.isOnion()) {
    type = IP.networks.ONION; // NET_ONION
    start = 6;
    bits = 4;
  } else if (raw[0] === 0x20
          && raw[1] === 0x01
          && raw[2] === 0x04
          && raw[3] === 0x70) {
    bits = 36;
  } else {
    bits = 32;
  }

  const out = Buffer.alloc(1 + ((bits + 7) >>> 3));

  out[i++] = type;

  while (bits >= 8) {
    out[i++] = raw[start++];
    bits -= 8;
  }

  if (bits > 0)
    out[i++] = raw[start] | ((1 << (8 - bits)) - 1);

  assert(i === out.length);

  return out;
}

/*
 * Expose
 */

module.exports = NetAddress;

