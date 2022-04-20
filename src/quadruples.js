const { TYPES, TTO_CUBE } = require('./constants');
const { Stack, Queue } = require('datastructures-js');

let i = 0;

/**
 * Quadruple class
 *
 * Structure of a quad
 * | operator | leftoperand | rightoperand | resultOperand |
 *
 * Example:
 *  1 + 5 + 7
 *  would translate roughly to:
 * | operator | left operand | right operand | result operand |
 * | -------- | ------------ | ------------- | -------------- |
 * |    +     |      1       |       5       |      0temp1    |
 * |    +     |    0temp1    |       7       |      0temp2    |
 *
 * Where the operands can be
 *
 * Var reference
 * {
 *  id: string;
 *  type: Constants.TYPES;
 *  location: {
 *    first_line: number;
 *    last_line: number;
 *    first_column: number;
 *    last_column: number;
 *  }
 * }
 *
 * Constant
 * {
 *  data: number | string;
 *  type: Constants.TYPES;
 *  location: {
 *    first_line: number;
 *    last_line: number;
 *    first_column: number;
 *    last_column: number;
 *  }
 * }
 *
 */
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
    const resultOperand = { id, type, location };
    this.quads.enqueue([operator, leftOperand, rightOperand, resultOperand]);
    this.operands.push(resultOperand);
  }
}

module.exports = Quadruples;
