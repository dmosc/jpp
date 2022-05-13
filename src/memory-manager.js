const { MEMORY_TYPES, TYPES } = require('./constants');

class Memory {
  constructor(start, end) {
    this.start = start;
    this.current = start;
    this.end = end;
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
    this.firstAddress = 10e3;
    this.lastAddress = 50e3 - 1;
    this.segments = {
      [MEMORY_TYPES.GLOBAL]: {
        [TYPES.INT]: new Memory(this.firstAddress, 14e3 - 1),
        [TYPES.FLOAT]: new Memory(14e3, 17e3 - 1),
        [TYPES.STRING]: new Memory(17e3, 20e3 - 1),
      },
      [MEMORY_TYPES.LOCAL]: {
        [TYPES.INT]: new Memory(20e3, 24e3 - 1),
        [TYPES.FLOAT]: new Memory(24e3, 27e3 - 1),
        [TYPES.STRING]: new Memory(27e3, 30e3 - 1),
      },
      [MEMORY_TYPES.TEMP]: {
        [TYPES.INT]: new Memory(30e3, 34e3 - 1),
        [TYPES.FLOAT]: new Memory(34e3, 37e3 - 1),
        [TYPES.STRING]: new Memory(37e3, 40e3 - 1),
      },
      [MEMORY_TYPES.STACK]: {
        [TYPES.INT]: new Memory(40e3, 44e3 - 1),
        [TYPES.FLOAT]: new Memory(44e3, 47e3 - 1),
        [TYPES.STRING]: new Memory(47e3, this.lastAddress),
      },
    };
  }

  getMemorySegment(memoryType, dataType) {
    return this.segments[memoryType][dataType];
  }

  getType(address) {
    const remainder = address % this.firstAddress;
    if (remainder >= 7e3) return TYPES.STRING;
    if (remainder >= 4e3) return TYPES.FLOAT;
    return TYPES.INT;
  }
}

module.exports = MemoryManager;
