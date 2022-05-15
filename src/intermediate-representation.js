const {
  TYPES,
  TTO_CUBE,
  OPCODES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
} = require('./constants');
const {Stack} = require('datastructures-js');

class IntermediateRepresentation {
  constructor(scopeManager, memoryManager, quadruplesManager, jumpsManager) {
    this.scopeManager = scopeManager;
    this.memoryManager = memoryManager;
    this.quadruplesManager = quadruplesManager;
    this.jumpsManager = jumpsManager;
    this.operands = new Stack();
    this.currentType = undefined;
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
    const variableOperand = this.scopeManager.findAlias(alias, dimensions);
    this.operands.push(variableOperand.address);
  }

  processFunctionCallOperand(alias) {
    const callable = this.scopeManager.findAlias(alias);
    this.quadruplesManager.pushAir();
    for (const {address} of callable.args) {
      const operand = this.operands.pop();
      this.quadruplesManager.pushAssign(address, operand, address);
    }
    this.quadruplesManager.pushCall(callable.start);
    if (callable.type !== TYPES.VOID) {
      const memory = this.memoryManager.getMemorySegment(
        MEMORY_TYPES.TEMP,
        callable.type
      );
      const address = memory.getAddress();
      this.operands.push(address);
      this.quadruplesManager.pushAssign(address, callable.address, address);
    }
  }

  processOperator(operator) {
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      OPERANDS[operator] === 2 && this.operands.pop(),
    ];
    try {
      let type = TTO_CUBE.getType(
        this.memoryManager.getType(rightOperand),
        this.memoryManager.getType(leftOperand),
        operator
      );
      const memory = this.memoryManager.getMemorySegment(MEMORY_TYPES.TEMP, type);
      let address = memory.getAddress();
      if (operator === OPERATORS.ASSIGN) address = leftOperand;
      this.quadruplesManager.pushQuadruple([operator, leftOperand, rightOperand, address]);
      this.operands.push(address);
    } catch (err) {
      console.table(this.prettyQuads());
      throw new Error(
        `Could not get types from ${this.memoryManager.getType(
          rightOperand
        )} ${operator} ${this.memoryManager.getType(leftOperand)}`
      );
    }
  }

  processArgument(alias, type, dimensions) {
    const memory = this.memoryManager.getMemorySegment(
      this.scopeManager.getCurrentFunction()
        ? MEMORY_TYPES.LOCAL
        : MEMORY_TYPES.GLOBAL,
      type
    );
    this.scopeManager.addArgumentAlias(alias, type, dimensions, memory.getAddress());
  }

  processVariable(alias, type, dimensions) {
    const memory = this.memoryManager.getMemorySegment(
      this.scopeManager.getCurrentFunction()
        ? MEMORY_TYPES.LOCAL
        : MEMORY_TYPES.GLOBAL,
      type
    );
    this.scopeManager.addVariableAlias(alias, type, dimensions, memory.getAddress());
  }

  processFunction(alias, type) {
    type = String(type).toUpperCase();
    const memory = this.memoryManager.getMemorySegment(
      MEMORY_TYPES.GLOBAL,
      type
    );
    this.scopeManager.addFunctionAlias(
      alias,
      type,
      this.quadruplesManager.getQuadruplesSize(),
      type !== TYPES.VOID ? memory.getAddress() : undefined
    );
    this.scopeManager.switchCurrentFunction(alias);
  }

  closeFunction() {
    if (this.scopeManager.getCurrentFunction().isVoid()) {
      this.quadruplesManager.pushReturn();
    }
    this.scopeManager.switchCurrentFunction();
    this.memoryManager.clearLocals();
  }

  linkJump(from, to) {
    this.quadruplesManager.setQuadrupleValue(from, 3, to);
  }

  insertReturn() {
    const returnValue = !this.operands.isEmpty() ? this.operands.pop() : undefined;
    const currentFunction = this.scopeManager.getCurrentFunction();
    if (currentFunction.isVoid() && !returnValue) {
      this.quadruplesManager.pushReturn();
    } else if (currentFunction.isType(this.memoryManager.getType(returnValue))) {
      this.quadruplesManager.pushReturn(returnValue);
    } else {
      throw new Error(`Return type doesn't match: ${currentFunction.getType()} != ${this.memoryManager.getType(returnValue)}`);
    }
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
