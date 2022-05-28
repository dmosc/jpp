const { Stack } = require('datastructures-js');

class JumpsManager {
  constructor() {
    this.jumps = new Stack();
  }

  getJumps() {
    return this.jumps;
  }

  pushJump(i) {
    this.jumps.push(i);
  }

  popJump(n = 0) {
    if (n > 0) {
      const tempJumps = new Stack();
      while (n--) tempJumps.push(this.getJumps().pop());
      const jump = this.getJumps().pop();
      while (!tempJumps.isEmpty()) this.pushJump(tempJumps.pop());
      return jump;
    }
    return this.getJumps().pop();
  }

  popAllJumps(ir, delimiter = true) {
    while (!this.isEmpty() && this.peek() !== -1) {
      ir.linkJump(this.popJump(0), ir.quadruplesManager.getQuadruplesSize());
    }
    if (this.popJump(0) !== -1 && delimiter) {
      throw new Error('Expecting delimiter!');
    }
  }

  isEmpty() {
    return this.jumps.isEmpty();
  }

  peek() {
    return this.jumps.peek();
  }

  pushDelimiter() {
    this.pushJump(-1);
  }
}

module.exports = JumpsManager;
