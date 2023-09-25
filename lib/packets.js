/*!
 * packets.js - 
 * Copyright (c) 2023, Nodari Chkuaselidze (MIT License)
 */

'use strict';

const bio = require('bufio');
const {NetAddress} = require('./netaddress');

const common = {
  PROTOCOL_VERSION: 70015,
  LOCAL_SERVICES: 0,
};

/** @typedef {bio.BufferReader} BufferReader */
/** @typedef {bio.BufferWriter} BufferWriter */

/**
 * Packet types.
 * @enum {Number}
 * @default
 */

exports.types = {
  VERSION: 0,
  VERACK: 1,
  PING: 2,
  PONG: 3,
  GETADDR: 4,
  ADDR: 5,
  INV: 6,
  GETDATA: 7,
  NOTFOUND: 8,
  GETBLOCKS: 9,
  GETHEADERS: 10,
  HEADERS: 11,
  SENDHEADERS: 12,
  BLOCK: 13,
  TX: 14,
  REJECT: 15,
  MEMPOOL: 16,
  FILTERLOAD: 17,
  FILTERADD: 18,
  FILTERCLEAR: 19,
  MERKLEBLOCK: 20,
  FEEFILTER: 21,
  SENDCMPCT: 22,
  CMPCTBLOCK: 23,
  GETBLOCKTXN: 24,
  BLOCKTXN: 25,
  GETPROOF: 26,
  PROOF: 27,
  CLAIM: 28,
  AIRDROP: 29,
  UNKNOWN: 30,
  // Internal
  INTERNAL: 31,
  DATA: 32
};

const types = exports.types;

/**
 * Packet types by value.
 * @const {Object}
 * @default
 */

exports.typesByVal = [
  'VERSION',
  'VERACK',
  'PING',
  'PONG',
  'GETADDR',
  'ADDR',
  'INV',
  'GETDATA',
  'NOTFOUND',
  'GETBLOCKS',
  'GETHEADERS',
  'HEADERS',
  'SENDHEADERS',
  'BLOCK',
  'TX',
  'REJECT',
  'MEMPOOL',
  'FILTERLOAD',
  'FILTERADD',
  'FILTERCLEAR',
  'MERKLEBLOCK',
  'FEEFILTER',
  'SENDCMPCT',
  'CMPCTBLOCK',
  'GETBLOCKTXN',
  'BLOCKTXN',
  'GETPROOF',
  'PROOF',
  'CLAIM',
  'AIRDROP',
  'UNKNOWN',
  // Internal
  'INTERNAL',
  'DATA'
];

/**
 * Base Packet
 */

class Packet extends bio.Struct {
  /** @type {types} */
  type;

  /**
   * Create a base packet.
   * @constructor
   */

  constructor() {
    super();

    this.type = types.UNKNOWN;
  }

  get rawType() {
    return this.type;
  }
}

/**
 * Version Packet Options
 * @typedef {Object} VersionPacketOptions
 * @param {Number?} version - Protocol version.
 * @param {Number?} services - Service bits.
 * @param {Number?} time - Timestamp of discovery.
 * @param {NetAddress?} remote - Their address.
 * @param {Buffer?} nonce
 * @param {String?} agent - User agent string.
 * @param {Number?} height - Chain height.
 * @param {Boolean} noRelay - Whether transactions
 * should be relayed immediately.
 */

/**
 * Version Packet
 * @extends Packet
 * @property {Number} version - Protocol version.
 * @property {Number} services - Service bits.
 * @property {Number} time - Timestamp of discovery.
 * @property {NetAddress} remote - Their address.
 * @property {Buffer} nonce
 * @property {String} agent - User agent string.
 * @property {Number} height - Chain height.
 * @property {Boolean} noRelay - Whether transactions
 * should be relayed immediately.
 */

class VersionPacket extends Packet {
  /** @type {Number} */
  version;

  /** @type {number} */
  services;

  /** @type {Number} */
  time;

  /** @type {NetAddress} */
  remote;

  /** @type {Buffer} */
  nonce;

  /** @type {String} */
  agent;

  /** @type {Number} */
  height;

  /** @type {Boolean} */
  noRelay;

  /**
   * Create a version packet.
   * @constructor
   * @param {VersionPacketOptions} [options]
   */

  constructor(options) {
    super();

    this.type = exports.types.VERSION;

    this.version = common.PROTOCOL_VERSION;
    this.services = common.LOCAL_SERVICES;
    this.time = Date.now();
    const tmp = new NetAddress();
    this.remote = tmp;
    this.nonce = common.ZERO_NONCE;
    this.agent = common.USER_AGENT;
    this.height = 0;
    this.noRelay = false;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options.
   * @param {VersionPacketOptions} options
   * @returns {this}
   */

  fromOptions(options) {
    if (options.version != null)
      this.version = options.version;

    if (options.services != null)
      this.services = options.services;

    if (options.time != null)
      this.time = options.time;

    if (options.remote)
      this.remote.fromOptions(options.remote);

    if (options.nonce)
      this.nonce = options.nonce;

    if (options.agent)
      this.agent = options.agent;

    if (options.height != null)
      this.height = options.height;

    if (options.noRelay != null)
      this.noRelay = options.noRelay;

    return this;
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    let size = 0;
    size += 20;
    size += this.remote.getSize();
    size += 8;
    size += 1;
    size += this.agent.length;
    size += 5;

    return size;
  }

  /**
   * Write version packet to buffer writer.
   * @param {BufferWriter} bw
   * @returns {BufferWriter}
   */

  write(bw) {
    bw.writeU32(this.version);
    bw.writeU32(this.services);
    bw.writeU32(0);
    bw.writeU64(this.time);
    this.remote.write(bw);
    bw.writeBytes(this.nonce);
    bw.writeU8(this.agent.length);
    bw.writeString(this.agent, 'ascii');
    bw.writeU32(this.height);
    bw.writeU8(this.noRelay ? 1 : 0);
    return bw;
  }

  /**
   * Inject properties from buffer reader.
   * @param {BufferReader} br
   * @returns {this}
   */

  read(br) {
    this.version = br.readU32();
    this.services = br.readU32();

    // Note: hi service bits
    // are currently unused.
    br.readU32();

    this.time = br.readU64();
    this.remote.read(br);
    this.nonce = br.readBytes(8);
    this.agent = br.readString(br.readU8(), 'ascii');
    this.height = br.readU32();
    this.noRelay = br.readU8() === 1;

    return this;
  }
}

exports.VersionPacket = VersionPacket;
