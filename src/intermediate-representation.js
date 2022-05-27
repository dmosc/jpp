const {
  TYPES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
  OPCODES,
  MEMORY_FLAGS,
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

    if (dimensions.length === 0) {
      this.operands.push(variableOperand.address);
      return;
    }

    let address = this.popAddress();
    for (let i = variableOperand.dimensions.length - 1; i > 0; --i) {
      const arrLengthAddress = this.pushInteger(variableOperand.dimensions[i]);

      const multResult = scopeManager.malloc(MEMORY_TYPES.TEMP, TYPES.INT);
      quadruplesManager.pushOperator(
        OPERATORS.MULTIPLICATION,
        arrLengthAddress,
        address,
        multResult
      );

      address = scopeManager.malloc(MEMORY_TYPES.TEMP, TYPES.INT);
      const poppedAddress = this.popAddress();
      quadruplesManager.pushOperator(
        OPERATORS.PLUS,
        multResult,
        poppedAddress,
        address
      );
    }

    this.operands.push(variableOperand.address);
    this.operands.push(address | MEMORY_FLAGS.ADDRESS_REFERENCE);
  }

  pushInteger(integer) {
    const address = this.getScopeManager().malloc(MEMORY_TYPES.TEMP, TYPES.INT);
    this.getQuadruplesManager().pushLoad(integer, address);
    return address;
  }

  processFunctionCallOperand(alias) {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const callable = scopeManager.findAlias(alias);
    if (!callable.native) {
      quadruplesManager.pushAir();
    }
    for (const { address } of callable.args) {
      const operand = this.popAddress();
      if (callable.native) {
        quadruplesManager.pushNativeParam(operand, address);
      } else {
        quadruplesManager.pushParam(operand, address);
      }
    }
    if (callable.native) {
      quadruplesManager.pushNativeCall(alias, callable.address || null);
    } else {
      quadruplesManager.pushCall(callable.start);
    }
    if (callable.type !== TYPES.VOID) {
      const address = scopeManager.malloc(MEMORY_TYPES.TEMP, callable.type);
      this.operands.push(address);
      quadruplesManager.pushStore(callable.address, address);
    }
  }

  popAddress() {
    const operand = this.operands.pop();
    if (operand & MEMORY_FLAGS.ADDRESS_REFERENCE) {
      const arrAddress = this.operands.pop();
      const address = this.getScopeManager().malloc(
        MEMORY_TYPES.TEMP,
        this.getScopeManager().getMemoryManager().getType(operand)
      );
      this.getQuadruplesManager().pushALoad(arrAddress, operand, address);
      return address;
    }

    return operand;
  }

  processAssignment(operator) {
    const quadruplesManager = this.getQuadruplesManager();
    const [rightOperand, leftOperand] = [
      this.popAddress(),
      this.operands.pop(),
    ];
    let address = leftOperand;

    if (address & MEMORY_FLAGS.ADDRESS_REFERENCE) {
      quadruplesManager.pushQuadruple([
        OPCODES.ASTORE,
        this.operands.pop(),
        address,
        rightOperand,
      ]);
    } else {
      operator = OPCODES.STORE;
      quadruplesManager.pushQuadruple([operator, rightOperand, null, address]);
    }
  }

  processOperator(operator) {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const [rightOperand, leftOperand] = [
      this.popAddress(),
      OPERANDS[operator] === 2 && this.popAddress(),
    ];

    const type = scopeManager.getTTO(leftOperand, rightOperand, operator);
    let address = scopeManager.malloc(MEMORY_TYPES.TEMP, type);
    quadruplesManager.pushQuadruple([
      operator,
      leftOperand,
      rightOperand,
      address,
    ]);
    this.operands.push(address);
    return;
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

  processNativeFunction(alias, type) {
    this.processFunction(alias, type);
    this.getScopeManager().findAlias(alias).native = true;
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
      ? this.popAddress()
      : undefined;
    const addressDetails = scopeManager.addressDetails(returnAddress);
    if (currentFunction.isVoid() && !returnAddress) {
      quadruplesManager.pushReturn();
    } else if (currentFunction.isType(addressDetails.type)) {
      quadruplesManager.pushQuadruple([
        OPCODES.STORE,
        returnAddress,
        null,
        currentFunction.getAddress(),
      ]);
      quadruplesManager.pushReturn();
    } else {
      throw new Error(
        `Return type doesn't match: ${currentFunction.getType()} != ${
          addressDetails.type
        }`
      );
    }
  }

  insertExit() {
    this.getQuadruplesManager().pushExit();
  }

  prettyQuads() {
    const quadruples = this.getQuadruplesManager().getQuadruples();
    const memoryManager = this.getScopeManager().getMemoryManager();
    return quadruples.map(([op, lop, rop, rrop]) => {
      if (OPERANDS[op] || op === OPCODES.ASTORE || op === OPCODES.ALOAD) {
        return [
          op,
          memoryManager.getAddressDebug(lop),
          memoryManager.getAddressDebug(rop),
          memoryManager.getAddressDebug(rrop),
        ];
      }
      if (
        op === OPCODES.LOAD ||
        op === OPCODES.RETURN ||
        op === OPCODES.NCALL
      ) {
        return [op, lop, rop, memoryManager.getAddressDebug(rrop)];
      }
      if (op === OPCODES.GOTO_F || op === OPCODES.GOTO_T) {
        return [op, memoryManager.getAddressDebug(lop), rop, rrop];
      }
      if (
        op === OPCODES.STORE ||
        op === OPCODES.PARAM ||
        op === OPCODES.NPARAM
      ) {
        return [
          op,
          memoryManager.getAddressDebug(lop),
          rop,
          memoryManager.getAddressDebug(rrop),
        ];
      }
      return [op, lop, rop, rrop];
    });
  }
}

module.exports = IntermediateRepresentation;
