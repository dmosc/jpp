const { TYPES, TTO_CUBE, OPCODES } = require('./constants');
const { Stack } = require('datastructures-js');

class Quadruples {
  constructor() {
    this.quads = [];
    this.jumps = new Stack();
    this.operands = new Stack();
    this.assignableAddress = 0;
  }

  #getAddress() {
    return this.assignableAddress++;
  }

  processOperand(operand) {
    if (operand.data && TYPES[operand.type]) this.operands.push(operand);
    else throw new Error('Invalid operand format');
  }

  processOperator(operator) {
    const id = this.#getAddress();
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      this.operands.pop(),
    ];
    const type = TTO_CUBE.getType(
      rightOperand?.type,
      leftOperand?.type,
      operator
    );
    this.quads.push([operator, leftOperand, rightOperand, { id, type }]);
    this.operands.push({ id, type });
  }

  pushJump() {
    this.jumps.push(this.quads.length);
  }

  popJump() {
    const jump = this.jumps.pop();
    this.quads[jump][3] = this.quads.length;
  }

  insertGoToT() {
    this.quads.push([
      OPCODES.GOTO_T,
      this.quads[this.quads.length - 1][3],
      null,
      null,
    ]);
  }

  insertGoToF() {
    this.quads.push([
      OPCODES.GOTO_F,
      this.quads[this.quads.length - 1][3],
      null,
      null,
    ]);
  }

  insertGoTo() {
    const jump = this.jumps.pop();
    this.quads.push([OPCODES.GOTO, null, null, this.jumps.pop()]);
    this.quads[jump][3] = this.quads.length;
  }
}

module.exports = Quadruples;
