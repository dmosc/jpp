const { MEMORY_TYPES, TYPES } = require('./constants');

/**
 * Memory management
 * JavaScript has weird integer limits, the "safe" limit
 * utilizes 54 bits, so we can safely underutilize them
 * and just use 32 bits.
 *
 * Each address is represented by a 32-bit number
 * 00000000 00000000 00000000 0000000
 *
 * The address is divided into parts
 * The last (left) two bits represent the memory scope
 * (Bit 31 and 32)
 * XX000000 00000000 00000000 0000000
 * 00 = GLOBAL
 * 01 = LOCAL
 * 10 = TEMP
 * 11 = STACK
 * We can access the memory scope just by simply executing
 * address >>> 30
 *
 * The three next bits represent the memory type
 * 00XXX000 00000000 00000000 0000000
 * 000 = INT
 * 001 = FLOAT
 * 010 = STRING
 * 011 = OTHER (objects)
 * (Last bit is reserved for future types)
 * We can access the memory scope just by shifting and masking
 * address >>> 27 & 0x7
 *
 * That leaves the rest of the bits available for addresses
 * 00000XXX XXXXXXXX XXXXXXXX XXXXXXXX
 * That means we have a total of 2^27 addresses to use,
 * a total of 134,217,728 usable addresses
 * We can get the raw address with
 * address & 0x7FFFFFF
 */

class Memory {
  constructor(start, scope, type) {
    this.start = start;
    this.current = start;
    // our mask is 0x7FFFFFF, so one less is 0x7FFFFFE
    this.end = start + 0x7fffffe;

    this.scope = scope;
    this.type = type;
  }

  getAddress() {
    if (this.current < this.end) {
      return this.current++;
    }
    throw new Error('No more memory available');
  }

  reset() {
    this.current = this.start;
  }
}

class MemoryManager {
  constructor() {
    this.supportedScopes = [
      MEMORY_TYPES.GLOBAL,
      MEMORY_TYPES.LOCAL,
      MEMORY_TYPES.TEMP,
      MEMORY_TYPES.STACK,
    ];
    this.scopeLookup = this.supportedScopes.reduce(
      (prev, curr, i) => Object.assign(prev, { [curr]: i }),
      {}
    );

    this.supportedTypes = [TYPES.INT, TYPES.FLOAT, TYPES.STRING];
    this.typeLookup = this.supportedTypes.reduce(
      (prev, curr, i) => Object.assign(prev, { [curr]: i }),
      {}
    );

    this.segments = this.supportedScopes.map((scope, scopeIndex) => {
      const scopeBits = scopeIndex << 3;
      return this.supportedTypes.map((type, typeIndex) => {
        return new Memory((scopeBits | typeIndex) << 27, scope, type);
      });
    });

    console.log(this.segments);
  }

  getMemorySegment(memoryType, dataType) {
    return this.segments[this.scopeLookup[memoryType]][
      this.typeLookup[dataType]
    ];
  }

  getScope(address) {
    return this.supportedScopes[address >>> 30];
  }

  getType(address) {
    return this.supportedTypes[(address >>> 27) & 0x7];
  }

  getRealAddress(address) {
    return address & 0x7ffffff;
  }

  clearLocals() {
    const toClear = [MEMORY_TYPES.LOCAL, MEMORY_TYPES.TEMP];
    toClear.forEach((memType) =>
      this.segments[this.scopeLookup[memType]].forEach((mem) => mem.reset())
    );
  }

  getPrettyName(address) {
    if (typeof address !== 'number') {
      throw new Error(
        `getPrettyName: Expected number, got ${typeof address} (${address})`
      );
    }

    return `${this.getScope(address)} ${this.getType(
      address
    )} ${this.getRealAddress(address)}`;
  }
}

module.exports = MemoryManager;
