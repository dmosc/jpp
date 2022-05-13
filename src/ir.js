const {
  TYPES,
  TTO_CUBE,
  OPCODES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
} = require('./constants');
const { Stack } = require('datastructures-js');
const { ControlFlowGraph } = require('./optimizer/cfg-graph');
const ScopeManager = require('./scope-manager');
const MemoryManager = require('./memory-manager');

class IntermediateRepresentation {
  constructor() {
    this.quads = [];
    this.scopeManager = new ScopeManager();
    this.jumps = new Stack();
    this.operands = new Stack();
    this.memoryManager = new MemoryManager();
    this.currentType = undefined;
    this.currentFunction = undefined;
  }

  // LOADERS
  processConstantOperand(operand) {
    if (operand.data !== undefined && TYPES[operand.type]) {
      const memory = this.memoryManager.getMemorySegment(
        MEMORY_TYPES.TEMP,
        operand.type
      );
      const address = memory.getAddress();
      this.operands.push(address);
      this.quads.push([OPCODES.SET, operand.data, null, address]);
    } else {
      throw new Error('Invalid operand format');
    }
  }

  processVariableOperand(alias, dimensions) {
    dimensions = dimensions.map(Number);
    let scope = this.scopeManager.getCurrentScope();
    while (scope) {
      if (scope[alias]?.dimensions.length === dimensions.length) {
        this.operands.push(scope[alias]?.address);
        return;
      }
      scope = this.scopeManager.getScope(scope._parent);
    }
    throw new Error(
      `Invalid variable as operand: ${alias}${
        dimensions.length ? `[${dimensions.join('][')}]` : ''
      }`
    );
  }

  processFunctionCallOperand(alias) {
    let scope = this.scopeManager.getCurrentScope();
    while (scope) {
      if (scope[alias]) {
        for (const argument of scope[alias].arguments) {
          const operand = this.operands.pop();
          this.quads.push([OPERATORS.ASSIGN, argument, operand, argument]);
        }
        this.quads.push([OPCODES.CALL, null, null, scope[alias].start]);
        return;
      }
      scope = this.scopeManager.getScope(scope._parent);
    }
    throw new Error(`Invalid function call as operand: ${alias}`);
  }

  processOperator(operator) {
    const popLeft = OPERANDS[operator] === 2;

    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      popLeft && this.operands.pop(),
    ];
    let type;

    try {
      type = TTO_CUBE.getType(
        this.memoryManager.getType(rightOperand),
        this.memoryManager.getType(leftOperand),
        operator
      );
    } catch (err) {
      console.table(this.quads);
      throw new Error(
        `Could not get types from ${this.memoryManager.getType(
          rightOperand
        )} ${operator} ${this.memoryManager.getType(leftOperand)}`
      );
    }

    const memory = this.memoryManager.getMemorySegment(MEMORY_TYPES.TEMP, type);
    let address = memory.getAddress();
    if (operator === OPERATORS.ASSIGN) address = leftOperand;
    this.quads.push([operator, leftOperand, rightOperand, address]);
    this.operands.push(address);
  }

  processVariable(alias, type, dimensions) {
    if (
      !alias ||
      !dimensions ||
      this.scopeManager.getCurrentScope()[alias] ||
      !TYPES[type]
    ) {
      throw new Error(`Can\'t instantiate variable ${alias}`);
    }
    const memory = this.memoryManager.getMemorySegment(
      MEMORY_TYPES.LOCAL,
      type
    );
    this.scopeManager.getCurrentScope()[alias] = {
      type,
      address: memory.getAddress(),
      dimensions: dimensions.map(Number),
      alias,
    };
    if (this.currentFunction) {
      this.currentFunction.arguments.push(
        this.scopeManager.getCurrentScope()[alias]
      );
    }
  }

  processFunction(alias, type) {
    type = String(type).toUpperCase();
    if (!alias || this.scopeManager.getCurrentScope()[alias] || !TYPES[type]) {
      throw new Error(`Can\'t instantiate function ${alias}`);
    }
    const memory = this.memoryManager.getMemorySegment(
      MEMORY_TYPES.LOCAL,
      type
    );
    this.scopeManager.getCurrentScope()[alias] = {
      type,
      address: memory.getAddress(),
      arguments: [],
      start: this.quads.length,
    };
    this.currentFunction = this.scopeManager.getCurrentScope()[alias];
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
      throw new Error('Called popAllJumps and there was no delimiter');
    }
  }

  popLoopJumpN(n) {
    const tempJumps = new Stack();
    while (n--) tempJumps.push(this.jumps.pop());
    const jump = this.jumps.pop();
    this.quads[this.quads.length - 1][3] = jump;
    while (!tempJumps.isEmpty()) this.jumps.push(tempJumps.pop());
  }

  pushDelimiter() {
    this.jumps.push(-1);
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
    if (this.memoryManager.getType(value) === this.currentFunction.type) {
      this.quads.push([OPCODES.RETURN, null, null, value]);
      this.currentFunction = undefined;
    } else {
      throw new Error(
        `Function must return type: ${this.currentFunction.type}`
      );
    }
  }

  optimizeIR() {
    const graph = new ControlFlowGraph(this.quads);
    this.quads = graph.toQuads();
  }
}

module.exports = IntermediateRepresentation;
