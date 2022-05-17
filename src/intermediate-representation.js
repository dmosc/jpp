const {
  TYPES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
  OPCODES,
} = require('./constants');
const { Stack } = require('datastructures-js');

class IntermediateRepresentation {
  constructor(scopeManager, quadruplesManager, jumpsManager) {
    this.scopeManager = scopeManager;
    this.quadruplesManager = quadruplesManager;
    this.jumpsManager = jumpsManager;
    this.operands = new Stack();
    this.currentType = undefined;
  }

  getScopeManager() {
    return this.scopeManager;
  }

  getQuadruplesManager() {
    return this.quadruplesManager;
  }

  processConstantOperand(operand) {
    if (operand.data !== undefined && TYPES[operand.type]) {
      const address = this.getScopeManager().malloc(
        MEMORY_TYPES.TEMP,
        operand.type
      );
      this.operands.push(address);
      this.getQuadruplesManager().pushLoad(operand.data, address);
    } else {
      throw new Error('Invalid operand format');
    }
  }

  processVariableOperand(alias, dimensions) {
    dimensions = dimensions.map(Number);
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const variableOperand = scopeManager.findAlias(alias, dimensions);
    let address = variableOperand.address;
    for (let i = variableOperand.dimensions.length - 1; i >= 0; --i) {
      const offsetAddress = this.operands.pop();
      const addressDetails = scopeManager.addressDetails(offsetAddress);
      const tempAddress = scopeManager.malloc(MEMORY_TYPES.TEMP, addressDetails.type);
      if (i === 0) {
        quadruplesManager.pushAddressOffsetAdd(address, offsetAddress, tempAddress);
      } else {
        quadruplesManager.pushAddressOffsetMultiply(address, offsetAddress, tempAddress);
      }
      address = tempAddress;
    }
    this.operands.push(address);
  }

  processFunctionCallOperand(alias) {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const callable = scopeManager.findAlias(alias);
    quadruplesManager.pushAir();
    for (const { address } of callable.args) {
      const operand = this.operands.pop();
      quadruplesManager.pushAssign(address, operand, address);
    }
    quadruplesManager.pushCall(callable.start);
    if (callable.type !== TYPES.VOID) {
      const address = scopeManager.malloc(MEMORY_TYPES.TEMP, callable.type);
      this.operands.push(address);
      quadruplesManager.pushAssign(address, callable.address, address);
    }
  }

  processOperator(operator) {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const [rightOperand, leftOperand] = [
      this.operands.pop(),
      OPERANDS[operator] === 2 && this.operands.pop(),
    ];
    const type = scopeManager.getTTO(leftOperand, rightOperand, operator);
    let address =
      operator === OPERATORS.ASSIGN
        ? leftOperand
        : scopeManager.malloc(MEMORY_TYPES.TEMP, type);
    quadruplesManager.pushQuadruple([
      operator,
      leftOperand,
      rightOperand,
      address,
    ]);
    this.operands.push(address);
  }

  processArgument(alias, type, dimensions) {
    this.getScopeManager().addArgumentAlias(alias, type, dimensions);
  }

  processVariable(alias, type, dimensions) {
    this.getScopeManager().addVariableAlias(alias, type, dimensions);
  }

  processFunction(alias, type) {
    type = String(type).toUpperCase();
    const scopeManager = this.getScopeManager();
    scopeManager.addFunctionAlias(
      alias,
      type,
      this.getQuadruplesManager().getQuadruplesSize()
    );
    scopeManager.switchCurrentFunction(alias);
  }

  closeFunction() {
    const scopeManager = this.getScopeManager();
    if (scopeManager.getCurrentFunction().isVoid()) {
      this.getQuadruplesManager().pushReturn();
    }
    scopeManager.switchCurrentFunction(); // Unset current function.
    scopeManager.resetLocalMemory();
  }

  linkJump(from, to) {
    this.getQuadruplesManager().setQuadrupleValue(from, 3, to);
  }

  insertReturn() {
    const quadruplesManager = this.getQuadruplesManager();
    const scopeManager = this.getScopeManager();
    const currentFunction = scopeManager.getCurrentFunction();
    const returnAddress = !this.operands.isEmpty()
      ? this.operands.pop()
      : undefined;
    const addressDetails = scopeManager.addressDetails(returnAddress);
    if (currentFunction.isVoid() && !returnAddress) {
      quadruplesManager.pushReturn();
    } else if (currentFunction.isType(addressDetails.type)) {
      quadruplesManager.pushReturn(returnAddress);
    } else {
      throw new Error(
        `Return type doesn't match: ${currentFunction.getType()} != ${
          addressDetails.type
        }`
      );
    }
  }

  prettyQuads() {
    const quadruples = this.getQuadruplesManager().getQuadruples();
    const memoryManager = this.getScopeManager().getMemoryManager();
    return quadruples.map(([op, lop, rop, rrop]) => {
      if (OPERANDS[op] || op === OPCODES.ADDROFF_ADD || op === OPCODES.ADDROFF_MULTIPLY) {
        return [
          op,
          memoryManager.getAddressDebug(lop),
          memoryManager.getAddressDebug(rop),
          memoryManager.getAddressDebug(rrop),
        ];
      }
      if (op === OPCODES.LOAD || op === OPCODES.RETURN) {
        return [op, lop, rop, memoryManager.getAddressDebug(rrop)];
      }
      if (op === OPCODES.GOTO_F || op === OPCODES.GOTO_T) {
        return [op, memoryManager.getAddressDebug(lop), rop, rrop];
      }
      return [op, lop, rop, rrop];
    });
  }
}

module.exports = IntermediateRepresentation;
