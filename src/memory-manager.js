const { Stack } = require('datastructures-js');
const { MEMORY_TYPES, TYPES, MEMORY_FLAGS } = require('./constants');
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
 * The next bit represents if the address is a reference to
 * another address
 * 00000X00 00000000 00000000 0000000
 * 0 = Variable Reference
 * 1 = Address Reference
 * We can check if it's an address reference with
 * address >>> 26 & 0x1
 *
 * That leaves the rest of the bits available for addresses
 * 000000XX XXXXXXXX XXXXXXXX XXXXXXXX
 * That means we have a total of 2^26 addresses to use,
 * a total of 67,108,864 usable addresses
 * We can get the raw address with
 * address & 0x3FFFFFF
 */

class MemoryManager {
  constructor() {
    this.scopeTypes = [
      MEMORY_TYPES.GLOBAL,
      MEMORY_TYPES.LOCAL,
      MEMORY_TYPES.TEMP,
      MEMORY_TYPES.STACK,
    ];
    this.eraTypes = [MEMORY_TYPES.LOCAL, MEMORY_TYPES.TEMP];
    this.dataTypes = [TYPES.INT, TYPES.FLOAT, TYPES.STRING, TYPES.OBJECT];
    this.scopeLookup = this.getLookupTable(this.scopeTypes);
    this.typeLookup = this.getLookupTable(this.dataTypes);
    this.segments = this.scopeTypes.map((_, scopeIndex) => {
      const scopeBits = scopeIndex << 3;
      return this.dataTypes.map((type, typeIndex) => {
        return new Memory((scopeBits | typeIndex) << 27, type);
      });
    });

    this.memoryStack = new Stack();
  }

  era() {
    this.previousMemory = Object.assign(
      ...this.eraTypes.map((type) => {
        return { [type]: this.segments[this.scopeLookup[type]] };
      })
    );
    this.memoryStack.push(this.previousMemory);
    this.eraTypes.forEach((type) => {
      const scopeIndex = this.scopeLookup[type];
      const scopeBits = scopeIndex << 3;
      this.segments[scopeIndex] = this.dataTypes.map((type, typeIndex) => {
        return new Memory((scopeBits | typeIndex) << 27, type);
      });
    });
  }

  eraPop() {
    const mem = this.memoryStack.pop();

    this.eraTypes.forEach((type) => {
      this.segments[this.scopeLookup[type]] = mem[type];
    });

    this.previousMemory = this.memoryStack.peek();
  }

  malloc(size) {
    return this.getMemorySegment(
      MEMORY_TYPES.STACK,
      TYPES.OBJECT
    ).allocateAddress(size, MEMORY_FLAGS.ADDRESS_REFERENCE);
  }

  getValue(address) {
    return this.segments[address >>> 30][(address >>> 27) & 0x7].getValue(
      address & 0x3ffffff
    );
  }

  getValueForParam(address) {
    return this.previousMemory[this.getScope(address)][
      (address >>> 27) & 0x7
    ].getValue(address & 0x3ffffff);
  }

  setValue(address, value) {
    this.segments[address >>> 30][(address >>> 27) & 0x7].setValue(
      address & 0x3ffffff,
      value
    );
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
    return address & 0x3ffffff;
  }

  isAddressReference(address) {
    return address & MEMORY_FLAGS.ADDRESS_REFERENCE;
  }

  getBaseAddress(memoryType, dataType) {
    return this.segments[this.scopeLookup[memoryType]][
      this.typeLookup[dataType]
    ].start;
  }

  getAddressDebug(address) {
    if (!isNaN(address) && address !== null) {
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
