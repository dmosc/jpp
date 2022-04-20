const { TYPES, TTO_CUBE } = require('./constants');
const { Stack, Queue } = require('datastructures-js');

let i = 0;

class Quadruples {
  constructor() {
    this.quads = new Queue();
    this.jumps = new Stack();
    this.operands = new Stack();
  }

  processOperand(operand) {
    if (operand.data && TYPES[operand.type]) this.operands.push(operand);
    else throw new Error('Invalid operand format');
  }

  processOperator(operator, operatorLocation) {
    const id = `0temp${i++}`;
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      this.operands.pop(),
    ];
    const location = {
      first_line: leftOperand.location.first_line,
      last_line: rightOperand.location.last_line,
      first_column: leftOperand.location.first_column,
      last_column: rightOperand.location.last_column,
    };
    const type = TTO_CUBE.getType(
      rightOperand?.type,
      leftOperand?.type,
      operator,
      location
    );
    this.quads.enqueue([operator, leftOperand, rightOperand, { id, type }]);
    this.operands.push({ id, type, location });
  }
}

module.exports = Quadruples;
