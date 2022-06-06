const {
  TYPES,
  OPERATORS,
  OPERANDS,
  MEMORY_TYPES,
  OPCODES,
  MEMORY_FLAGS,
  TTO_CUBE,
} = require('./constants');
const { Stack } = require('datastructures-js');

class IntermediateRepresentation {
  constructor(scopeManager, quadruplesManager, jumpsManager) {
    this.scopeManager = scopeManager;
    this.quadruplesManager = quadruplesManager;
    this.jumpsManager = jumpsManager;
    this.operands = new Stack();
    this.aliasStack = new Stack();
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

  processId(id) {
    this.aliasStack.push(id);
  }

  processContext(contextName) {
    this.getScopeManager().setContext(contextName);
  }

  processThisContext() {}

  processVariableOperand(dimensions) {
    dimensions = dimensions.map(Number);
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const variableOperand = scopeManager.findAlias(
      this.aliasStack.pop(), // pop variable name
      dimensions
    );
    scopeManager.clearContext();

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

  processFunctionCallOperand() {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const alias = this.aliasStack.pop(); // pop alias
    const callable = scopeManager.findAlias(alias);
    scopeManager.clearContext();
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
      quadruplesManager.pushNativeCall(
        alias,
        callable.address !== undefined ? callable.address : null
      );
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
    // ignore object pointers
    // only dereference non object pointer
    if (
      operand & MEMORY_FLAGS.ADDRESS_REFERENCE &&
      this.getScopeManager().addressDetails(operand).type !== TYPES.OBJECT
    ) {
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
    const scopeManager = this.getScopeManager();
    const [rightOperand, leftOperand] = [
      this.popAddress(),
      this.operands.pop(),
    ];
    let address = leftOperand;
    TTO_CUBE.getType(
      scopeManager.addressDetails(leftOperand).type,
      scopeManager.addressDetails(rightOperand).type,
      operator
    );

    // dont use ASTORE for objects
    if (
      address & MEMORY_FLAGS.ADDRESS_REFERENCE &&
      scopeManager.addressDetails(leftOperand).type != TYPES.OBJECT
    ) {
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

    if (operator === OPERATORS.DIVISION) {
      operator = type === TYPES.FLOAT ? OPCODES.FDIVIDE : OPCODES.IDIVIDE;
    }

    let address = scopeManager.malloc(MEMORY_TYPES.TEMP, type);
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

  processClassVariable(alias) {
    this.getScopeManager().addClassVariableAlias(this.currentObjectType, alias);
  }

  processObjectCreationOperand() {
    // [MALLOC, (# class variables), null, variablePointer]
    // call constructor

    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const objectClass = scopeManager.findClass(this.aliasStack.pop());
    scopeManager.clearContext();

    // temp address pointer
    const address = scopeManager.malloc(
      MEMORY_TYPES.TEMP,
      TYPES.OBJECT,
      1,
      MEMORY_FLAGS.ADDRESS_REFERENCE
    );
    quadruplesManager.pushMalloc(objectClass.getMemorySize(), address);

    const classConstructor = objectClass.constructor;

    if (classConstructor) {
      // ERA
      quadruplesManager.pushAir();

      // pop constructor params
      for (const { address } of classConstructor.args) {
        const operand = this.popAddress();
        quadruplesManager.pushParam(operand, address);
      }

      // call constructor
      quadruplesManager.pushCall(classConstructor.start);
    }

    // push pointer
    this.operands.push(address);
  }

  processClass(className) {
    this.getScopeManager().pushClass(className);
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
    if (
      scopeManager.getCurrentFunction().isVoid() &&
      !scopeManager.getCurrentFunction().target.native
    ) {
      this.getQuadruplesManager().pushReturn();
    }
    scopeManager.switchCurrentFunction(); // Unset current function.
    scopeManager.resetLocalMemory();
  }

  linkJump(from, to) {
    this.getQuadruplesManager().setQuadrupleValue(from, 3, to);
  }

  popDelimitedJumps() {
    this.jumpsManager.popAllJumps(this);
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
