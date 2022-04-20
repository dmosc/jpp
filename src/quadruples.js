const {TYPES, OPERANDS, TTO_CUBE} = require("./constants");
const {Stack, Queue} = require("datastructures-js");
const {nanoid} = require("nanoid");

class Quadruples {
  constructor() {
    this.quads = new Queue();
    this.jumps = new Stack();
    this.operands = new Stack();
    this.unaryOperators = new Stack();
  }

  processOperand(operand) {
    if (operand.data && TYPES[operand.type]) this.operands.push(operand);
    else throw new Error('Invalid operand format');
  }

  processOperator(operator) {
    if (OPERANDS[operator] === 1) {
      this.unaryOperators.push(operator);
    } else {
      const id = nanoid(5);
      const [rightOperand, leftOperand] = [this.operands.pop(), this.operands.pop()];
      const type = TTO_CUBE.getType(rightOperand?.type, leftOperand?.type, operator);
      this.quads.enqueue([operator, leftOperand, rightOperand, {id, type}]);
      this.operands.push({id, type});
    }
  }

  processUnaryOperators() {
    while (!this.unaryOperators.isEmpty()) {
      const id = nanoid(5);
      const operator = this.unaryOperators.pop();
      const [rightOperand, leftOperand] = [this.operands.pop(), undefined];
      const type = TTO_CUBE.getType(rightOperand?.type, leftOperand, operator);
      this.quads.enqueue([operator, leftOperand, rightOperand, {id, type}]);
      this.operands.push({id, type});
    }
  }
}

module.exports = Quadruples;