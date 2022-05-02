const { OPCODES } = require('../constants');

class Node {
  constructor([operator, leftOperand, rightOperand, resultOperand], nodeIndex) {
    this.operator = operator;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
    this.resultOperand = resultOperand;

    this.nodeId = `node${nodeIndex}`;

    if (this.operator === OPCODES.INIT) {
      this.rootNode = true;
    }

    if (this.operator === OPCODES.GOTO_F || this.operator === OPCODES.CALL) {
      this.goto = `node${resultOperand}`;
      this.connections = [this.goto, `node${nodeIndex + 1}`];
    } else if (this.operator === OPCODES.GOTO_T) {
      this.goto = `node${resultOperand}`;
      this.connections = [`node${nodeIndex + 1}`, this.goto];
    } else if (this.operator === OPCODES.GOTO) {
      this.goto = `node${resultOperand}`;
      this.connections = [this.goto];
    } else if (this.operator !== OPCODES.RETURN) {
      this.connections = [`node${nodeIndex + 1}`];
    }
  }
}

module.exports = { Node };
