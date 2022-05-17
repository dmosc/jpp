class Memory {
  constructor(start, type) {
    this.start = start;
    this.current = start;
    // our mask is 0x3FFFFFF, so one less is 0x3FFFFFE
    this.end = start + 0x3fffffe;
    this.type = type;
  }

  allocateAddress(size = 1, flags) {
    // flags will only apply to first address
    // *should not be an issue*
    if (this.current < this.end) {
      const address = this.current;
      this.current += size;
      return address | flags;
    }
    throw new Error('No more memory available');
  }

  reset() {
    this.current = this.start;
  }
}

module.exports = Memory;
