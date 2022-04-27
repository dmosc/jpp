const { TYPES, TTO_CUBE, OPCODES, OPERATORS } = require('./constants');
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
    this.currentFunction = undefined;
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

  processFunctionCallOperand(alias) {
    let scope = this.scope;
    while (scope) {
      if (scope[alias]) {
        for (const argument of scope[alias].arguments) {
          const operand = this.operands.pop();
          this.quads.push([OPERATORS.ASSIGN, argument, operand, argument]);
        }
        this.quads.push([OPCODES.GOTO, null, null, scope[alias].start]);
        return;
      }
      scope = this.scopes[scope._parent];
    }
    throw new Error(`Invalid function call as operand: ${alias}`);
  }

  processOperator(operator) {
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      this.operands.pop(),
    ];
    const memSlot = {
      address: this.#getAddress(),
      type: TTO_CUBE.getType(rightOperand?.type, leftOperand?.type, operator),
    };
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
      alias,
    };
    if (this.currentFunction) {
      this.currentFunction.arguments.push(this.scope[alias]);
    }
  }

  processFunction(alias, type) {
    type = String(type).toUpperCase();
    if (!alias || this.scope[alias] || !TYPES[type]) {
      throw new Error(`Can\'t instantiate function ${alias}`);
    }
    this.scope[alias] = {
      type,
      address: this.#getAddress(),
      arguments: [],
      start: this.quads.length,
    };
    this.currentFunction = this.scope[alias];
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
    while (!this.jumps.isEmpty() && this.jumps.peek() !== -1) this.popJumpN(0);
    if (this.jumps.pop() !== -1) {
      throw new Error('Called popAllJumps and there was no delimitter');
    }
  }

  popLoopJumpN(n) {
    const tempJumps = new Stack();
    while (n--) tempJumps.push(this.jumps.pop());
    const jump = this.jumps.pop();
    this.quads[this.quads.length - 1][3] = jump;
    while (!tempJumps.isEmpty()) this.jumps.push(tempJumps.pop());
  }

  pushDelimitter() {
    this.jumps.push(-1);
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
  insertProgramInit() {
    this.quads.push([OPCODES.INIT, null, null, null]);
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
    this.quads.push([OPCODES.GOTO, null, null, null]);
  }

  insertReturn() {
    const value = this.operands.pop();
    if (value.type === this.currentFunction.type) {
      this.quads.push([OPCODES.RETURN, null, null, value]);
      this.currentFunction = undefined;
    } else {
      throw new Error(
        `Function must return type: ${this.currentFunction.type}`
      );
    }
  }
}

module.exports = Quadruples;
