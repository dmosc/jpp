const { TYPES, TTO_CUBE, OPCODES, OPERATORS} = require('./constants');
const { Stack } = require('datastructures-js');

class Quadruples {
  constructor() {
    this.quads = [];
    this.scopes = [{ _parent: -1 }];
    this.scope = this.scopes[0]; // 0th scope is the global scope.
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
    let scope = this.scope;
    while (scope) {
      if (scope[alias]?.dimensions.length === dimensions.length) {
        this.operands.push(scope[alias]);
        return;
      }
      scope = this.scopes[scope._parent];
    }
    throw new Error(
      `Invalid variable as operand: ${alias}${
        dimensions.length ? `[${dimensions.join('][')}]` : ''
      }`
    );
  }

  processOperator(operator) {
    const address = this.#getAddress();
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      this.operands.pop(),
    ];
    console.log(rightOperand?.type, leftOperand?.type, operator);
    const type = TTO_CUBE.getType(
      rightOperand?.type,
      leftOperand?.type,
      operator
    );

    let memSlot = { address, type };
    if (operator === OPERATORS.ASSIGN) memSlot.address = leftOperand?.address;
    this.quads.push([operator, leftOperand, rightOperand, memSlot]);
    this.operands.push(memSlot);
  }

  processVariable(alias, type, dimensions) {
    if (!alias || !dimensions || this.scope[alias] || !TYPES[type]) {
      throw new Error(`Can\'t instantiate variable ${alias}`);
    }
    this.scope[alias] = {
      type,
      address: this.#getAddress(),
      dimensions: dimensions.map(Number),
      isCallable: false,
    };
  }

  processFunction(alias, type) {
    type = String(type).toUpperCase();
    if (!alias || this.scope[alias] || !TYPES[type]) {
      throw new Error(`Can\'t instantiate function ${alias}`);
    }
    this.scope[alias] = {
      type,
      address: this.#getAddress(),
      isCallable: true,
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
    this.scope = { _parent: this.scope._parent + 1 };
    this.scopes.push(this.scope);
  }

  popScope() {
    this.scope = this.scopes[this.scope._parent];
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
    this.quads.push([OPCODES.GOTO, null, null, null]);
  }
}

module.exports = Quadruples;
