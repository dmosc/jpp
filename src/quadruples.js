const { TYPES, TTO_CUBE, OPCODES } = require('./constants');
const { Stack } = require('datastructures-js');

class Quadruples {
  constructor() {
    this.quads = [];
    this.scopes = [{}]; // 0th scope is the global scope.
    this.jumps = new Stack();
    this.operands = new Stack();
    this.assignableAddress = 0;
    this.currentType = undefined;
  }

  #getAddress() {
    return this.assignableAddress++;
  }

  // LOADERS
  processConstantOperand(operand) {
    if (operand.data && TYPES[operand.type]) this.operands.push(operand);
    else throw new Error('Invalid operand format');
  }

  processVariableOperand(alias, dimensions) {
    dimensions = dimensions.map(Number);
    for (let i = this.scopes.length - 1; i >= 0; --i) {
      const scope = this.scopes[i];
      if (scope[alias]?.dimensions.length === dimensions.length) {
        this.operands.push(scope[alias]);
        return;
      }
    }
    throw new Error(`Invalid variable as operand: ${alias}${dimensions.length ? `[${dimensions.join('][')}]` : ''}`);
  }

  processOperator(operator) {
    const address = this.#getAddress();
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      this.operands.pop(),
    ];
    const type = TTO_CUBE.getType(
      rightOperand?.type,
      leftOperand?.type,
      operator
    );
    this.quads.push([operator, leftOperand, rightOperand, { address, type }]);
    this.operands.push({ address, type });
  }

  processVariable(alias, type, dimensions) {
    const scope = this.scopes[this.scopes.length - 1];
    if (!alias || !dimensions || scope[alias] || !TYPES[type]) {
      throw new Error(`Can\'t instantiate variable ${alias}`);
    }
    scope[alias] = {
      type,
      address: this.#getAddress(),
      dimensions: dimensions.map(Number),
    };
  }

  // JUMP STACK OPERATIONS
  pushJump() {
    this.jumps.push(this.quads.length);
  }

  popJumpN(n) {
    const tempJumps = new Stack();
    while (n--) tempJumps.push(this.jumps.pop());
    const jump = this.jumps.pop();
    this.quads[jump][3] = this.quads.length;
    while (!tempJumps.isEmpty()) this.jumps.push(tempJumps.pop());
  }

  popAllJumps() {
    while (!this.jumps.isEmpty()) this.popJumpN(0);
  }

  popLoopJump() {
    this.quads[this.quads.length - 1][3] = this.jumps.pop();
  }

  // SCOPE STACK OPERATIONS
  pushScope() {
    this.scopes.push({});
  }

  popScope() {
    console.log(this.scopes.pop());
  }

  // OPCODE QUADRUPLE OPERATIONS
  insertGoToF() {
    this.quads.push([
      OPCODES.GOTO_F,
      this.quads[this.quads.length - 1][3],
      null,
      null,
    ]);
  }

  insertGoTo() {
    this.quads.push([
      OPCODES.GOTO,
      null,
      null,
      null,
    ]);
  }
}

module.exports = Quadruples;
