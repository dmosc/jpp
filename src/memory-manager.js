const { MEMORY_TYPES, TYPES } = require('./constants');
const Memory = require('./memory');

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

class MemoryManager {
  constructor() {
    this.scopeTypes = [
      MEMORY_TYPES.GLOBAL,
      MEMORY_TYPES.LOCAL,
      MEMORY_TYPES.TEMP,
      MEMORY_TYPES.STACK,
    ];
    this.dataTypes = [TYPES.INT, TYPES.FLOAT, TYPES.STRING];
    this.scopeLookup = this.getLookupTable(this.scopeTypes);
    this.typeLookup = this.getLookupTable(this.dataTypes);
    this.segments = this.scopeTypes.map((_, scopeIndex) => {
      const scopeBits = scopeIndex << 3;
      return this.dataTypes.map((type, typeIndex) => {
        return new Memory((scopeBits | typeIndex) << 27, type);
      });
    });
  }

  getLookupTable(list) {
    return list.reduce((obj, scope, i) => {
      obj[scope] = i;
      return obj;
    }, {});
  }

  getMemorySegment(memoryType, dataType) {
    return this.segments[this.scopeLookup[memoryType]][
      this.typeLookup[dataType]
    ];
  }

  getScope(address) {
    return this.scopeTypes[address >>> 30];
  }

  getType(address) {
    return this.dataTypes[(address >>> 27) & 0x7];
  }

  getAddress(address) {
    return address & 0x7ffffff;
  }

  getAddressDebug(address) {
    if (!isNaN(address)) {
      return `${this.getScope(address)}.${this.getType(
        address
      )}.${this.getAddress(address)}`;
    } else {
      return address;
    }
  }

  clearLocals() {
    this.segments[this.scopeLookup[MEMORY_TYPES.LOCAL]].forEach((memory) =>
      memory.reset()
    );
    this.segments[this.scopeLookup[MEMORY_TYPES.TEMP]].forEach((memory) =>
      memory.reset()
    );
  }
}

module.exports = MemoryManager;
