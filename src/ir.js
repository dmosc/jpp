const {
  TYPES,
  TTO_CUBE,
  OPCODES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
} = require('./constants');
const {Stack} = require('datastructures-js');
const {ControlFlowGraph} = require('./optimizer/cfg-graph');
const ScopeManager = require('./scope-manager');
const MemoryManager = require('./memory-manager');
const QuadruplesManager = require("./quadruples-manager");
const JumpsManager = require("./jumps-manager");

class IntermediateRepresentation {
  constructor() {
    this.scopeManager = new ScopeManager();
    this.memoryManager = new MemoryManager();
    this.quadruplesManager = new QuadruplesManager();
    this.jumpsManager = new JumpsManager();
    this.operands = new Stack();
    this.currentType = undefined;
    this.currentFunction = undefined;
  }

  // LOADERS
  processConstantOperand(operand) {
    if (operand.data !== undefined && TYPES[operand.type]) {
      const memory = this.memoryManager.getMemorySegment(MEMORY_TYPES.TEMP, operand.type);
      const address = memory.getAddress();
      this.operands.push(address);
      this.quadruplesManager.pushLoad(operand.data, address);
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
        const func = scope[alias];
        this.quadruplesManager.pushAir();
        for (const {address} of func.arguments) {
          const operand = this.operands.pop();
          this.quadruplesManager.pushAssign(address, operand, address);
        }
        this.quadruplesManager.pushCall(func.start);
        if (func.type !== TYPES.VOID) {
          const memory = this.memoryManager.getMemorySegment(
            MEMORY_TYPES.TEMP,
            func.type
          );
          const address = memory.getAddress();
          this.operands.push(address);
          this.quadruplesManager.pushAssign(address, func.address, address);
        }
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
      console.table(this.prettyQuads());
      throw new Error(
        `Could not get types from ${this.memoryManager.getType(
          rightOperand
        )} ${operator} ${this.memoryManager.getType(leftOperand)}`
      );
    }

    const memory = this.memoryManager.getMemorySegment(MEMORY_TYPES.TEMP, type);
    let address = memory.getAddress();
    if (operator === OPERATORS.ASSIGN) address = leftOperand;
    this.quadruplesManager.pushQuadruple([operator, leftOperand, rightOperand, address]);
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
      this.currentFunction !== undefined
        ? MEMORY_TYPES.LOCAL
        : MEMORY_TYPES.GLOBAL,
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

    if (type !== TYPES.VOID) {
      const memory = this.memoryManager.getMemorySegment(
        MEMORY_TYPES.GLOBAL,
        type
      );
      this.scopeManager.getCurrentScope()[alias] = {
        type,
        address: memory.getAddress(),
        arguments: [],
        start: this.quadruplesManager.getQuadruplesSize(),
      };
    } else {
      this.scopeManager.getCurrentScope()[alias] = {
        type,
        arguments: [],
        start: this.quadruplesManager.getQuadruplesSize(),
      };
    }
    this.currentFunction = this.scopeManager.getCurrentScope()[alias];
  }

  closeFunction() {
    if (this.currentFunction.type === TYPES.VOID) {
      this.quadruplesManager.pushReturn();
    }
    delete this.currentFunction;
    this.memoryManager.clearLocals();
  }

  linkJump(from, to) {
    this.quadruplesManager.setQuadrupleValue(from, 3, to);
  }

  insertReturn() {
    const returnValue = !this.operands.isEmpty() ? this.operands.pop() : undefined;
    if (!returnValue && this.currentFunction.type === TYPES.VOID) {
      this.quadruplesManager.pushReturn();
    } else if (this.memoryManager.getType(returnValue) === this.currentFunction.type) {
      this.quadruplesManager.pushReturn(returnValue);
    } else {
      throw new Error(`Types don't match: ${this.currentFunction.type} != ${this.memoryManager.getType(returnValue)}`);
    }
  }

  optimizeIR() {
    const graph = new ControlFlowGraph(this.quadruplesManager.getQuadruples());
    this.quadruplesManager.setQuadruples(graph.toQuads());
  }

  prettyQuads() {
    return this.quadruplesManager.getQuadruples().map(([op, lop, rop, rrop]) => {
      const ops = OPERANDS[op];
      if (ops) {
        if (ops === 1) {
          return [
            op,
            null,
            this.memoryManager.getAddressDebug(rop),
            this.memoryManager.getAddressDebug(rrop),
          ];
        } else {
          return [
            op,
            this.memoryManager.getAddressDebug(lop),
            this.memoryManager.getAddressDebug(rop),
            this.memoryManager.getAddressDebug(rrop),
          ];
        }
      }

      if (op === OPCODES.LOAD || op === OPCODES.RETURN) {
        return [
          op,
          lop,
          rop,
          rrop !== null ? this.memoryManager.getAddressDebug(rrop) : null,
        ];
      }

      if (op === OPCODES.GOTO_F || op === OPCODES.GOTO_T) {
        return [op, this.memoryManager.getAddressDebug(lop), rop, rrop];
      }

      return [op, lop, rop, rrop];
    });
  }
}

module.exports = IntermediateRepresentation;
