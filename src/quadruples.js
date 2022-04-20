const { TYPES, TTO_CUBE, OPCODES } = require('./constants');
const { Stack, Queue } = require('datastructures-js');
const { nanoid } = require('nanoid');

class Quadruples {
  constructor() {
    this.quads = [];
    this.jumps = new Stack();
    this.operands = new Stack();
  }

  processOperand(operand) {
    if (operand.data && TYPES[operand.type]) this.operands.push(operand);
    else throw new Error('Invalid operand format');
  }

  processOperator(operator) {
    const id = nanoid(5);
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

  startJump() {
    this.jumps.push(this.quads.length);
    this.quads.push([OPCODES.GOTO_F, undefined, undefined, undefined]);
  }

  endJump() {
    const jump = this.jumps.pop();
    this.quads[jump][3] = this.quads.length;
  }
}

module.exports = Quadruples;
