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
    const functionOperand = this.scopeManager.findAlias(alias);
    const aliases = this.scopeManager.getCurrentScope().getAliases();
    this.quadruplesManager.pushAir();
    Object.keys(aliases).forEach((alias) => {
      if (aliases[alias].isArgument) {
        const operand = this.operands.pop();
        this.quadruplesManager.pushAssign(aliases[alias].address, operand, aliases[alias].address);
      }
    });
    this.quadruplesManager.pushCall(functionOperand.start);
    if (functionOperand.type !== TYPES.VOID) {
      const memory = this.memoryManager.getMemorySegment(
        MEMORY_TYPES.TEMP,
        functionOperand.type
      );
      const address = memory.getAddress();
      this.operands.push(address);
      this.quadruplesManager.pushAssign(address, functionOperand.address, address);
    }
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
    if (this.scopeManager.getCurrentFunction().type === TYPES.VOID) {
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
    const currentFunctionType = this.scopeManager.getCurrentFunction().type;
    if (!returnValue && currentFunctionType === TYPES.VOID) {
      this.quadruplesManager.pushReturn();
    } else if (this.memoryManager.getType(returnValue) === currentFunctionType) {
      this.quadruplesManager.pushReturn(returnValue);
    } else {
      throw new Error(`Types don't match: ${currentFunctionType} != ${this.memoryManager.getType(returnValue)}`);
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
