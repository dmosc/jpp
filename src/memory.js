class Memory {
  constructor(start, type) {
    this.start = start;
    this.current = start;
    // our mask is 0x7FFFFFF, so one less is 0x7FFFFFE
    this.end = start + 0x7fffffe;
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

module.exports = Memory;
