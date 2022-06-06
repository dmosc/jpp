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
    this.contextStack = new Stack();
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
    this.contextStack.push(id);
  }

  processContext(contextName) {
    const object = this.getScopeManager().findAlias(contextName, 0);

    if (
      this.contextStack.isEmpty() ||
      typeof this.contextStack.peek() === 'string'
    ) {
      this.contextStack.push(object.address);
    } else {
      const tempAddress = this.contextStack.pop();
      const varIndexAddr = this.pushInteger(object.variableIndex);

      const pointerAddress = this.getScopeManager().malloc(
        MEMORY_TYPES.TEMP,
        object.type,
        1,
        MEMORY_FLAGS.ADDRESS_REFERENCE
      );

      this.getQuadruplesManager().pushOperator(
        OPERATORS.PLUS,
        tempAddress,
        varIndexAddr,
        pointerAddress
      );

      this.contextStack.push(pointerAddress);
    }

    this.getScopeManager().setContext(contextName);
  }

  processThisContext() {}

  popContextStack(dimensions) {
    dimensions = dimensions?.map(Number);
    const alias = this.contextStack.pop();

    if (
      !this.contextStack.isEmpty() &&
      typeof this.contextStack.peek() !== 'string'
    ) {
      const {
        address: aliasAddress,
        type,
        variableIndex,
        args,
        ...rest
      } = this.getScopeManager().findAlias(alias, dimensions);
      const tempAddress = this.contextStack.pop();

      // function check
      if (args === undefined) {
        const varIndexAddr = this.pushInteger(variableIndex);

        const pointerAddress = this.getScopeManager().malloc(
          MEMORY_TYPES.TEMP,
          type,
          1,
          MEMORY_FLAGS.ADDRESS_REFERENCE
        );

        this.getQuadruplesManager().pushOperator(
          OPERATORS.PLUS,
          tempAddress,
          varIndexAddr,
          pointerAddress
        );

        this.getScopeManager().clearContext();
        return {
          address: pointerAddress,
          variableIndex,
          type,
          args,
          ...rest,
        };
      } else {
        this.getScopeManager().clearContext();
        return {
          address: aliasAddress,
          contextAddress: tempAddress,
          variableIndex,
          type,
          args,
          ...rest,
        };
      }
    } else {
      /*
        If we get to here it means that an identifier was pushed into the stack
        and below the stack is another identifier with a context
        Example:
        root.addNode(root, 1);

        stack will have the context address for root.addNote then it will reach
        to (root, 1) and root must be in a cleared context. So what we need to
        do is temporarily clear the the context, find alias and then set the
        context back to the original one.
      */

      const tempContext = this.getScopeManager().getCurrentContext();
      this.getScopeManager().clearContext();

      const variable = this.getScopeManager().findAlias(alias, dimensions);
      this.getScopeManager().setContextObject(tempContext);
      return {
        alias,
        ...variable,
      };
    }
  }

  processVariableOperand(dimensions) {
    const scopeManager = this.getScopeManager();
    const quadruplesManager = this.getQuadruplesManager();
    const variableOperand = this.popContextStack(dimensions);

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

    const callable = this.popContextStack();

    if (!callable.native) {
      quadruplesManager.pushAir();
    }

    const argumentOperands = new Stack();
    const argLength = callable.args.length - (callable.parentClass ? 1 : 0);
    for (let i = 0; i < argLength; i++) {
      const operand = this.popAddress();
      argumentOperands.push(operand);
    }

    for (const { alias, address } of callable.args) {
      if (alias === 'this') {
        quadruplesManager.pushParam(callable.contextAddress, address);
      } else {
        const operand = argumentOperands.pop();
        if (callable.native) {
          quadruplesManager.pushNativeParam(operand, address);
        } else {
          quadruplesManager.pushParam(operand, address);
        }
      }
    }
    if (callable.native) {
      quadruplesManager.pushNativeCall(
        callable.alias,
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
    const leftOperandDetails = scopeManager.addressDetails(leftOperand);
    const rightOperandDetails = scopeManager.addressDetails(rightOperand);

    if (
      address & MEMORY_FLAGS.ADDRESS_REFERENCE &&
      leftOperandDetails.type !== TYPES.OBJECT
    ) {
      quadruplesManager.pushQuadruple([
        OPCODES.ASTORE,
        this.operands.pop(),
        address,
        rightOperand,
      ]);
    } else {
      let castAddress = rightOperand;
      const resultType = TTO_CUBE.getType(
        leftOperandDetails.type,
        rightOperandDetails.type,
        operator
      );
      if (
        resultType === TYPES.INT &&
        rightOperandDetails.type === TYPES.FLOAT
      ) {
        castAddress = scopeManager.malloc(MEMORY_TYPES.TEMP, resultType);
        quadruplesManager.pushQuadruple([
          OPCODES.F2I,
          rightOperand,
          null,
          castAddress,
        ]);
      }
      quadruplesManager.pushQuadruple([
        OPCODES.STORE,
        castAddress,
        null,
        address,
      ]);
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
    if (type === TYPES.OBJECT) {
      this.getScopeManager().addObjectArgumentAlias(
        this.currentObjectType,
        alias
      );
    } else {
      this.getScopeManager().addArgumentAlias(alias, type, dimensions);
    }
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
    const objectClass = scopeManager.findClass(this.contextStack.pop());
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

      const argumentOperands = new Stack();
      const argLength = classConstructor.args.length - 1;
      for (let i = 0; i < argLength; i++) {
        const operand = this.popAddress();
        argumentOperands.push(operand);
      }

      // pass params to constructor
      for (const { alias, address: argAddress } of classConstructor.args) {
        if (alias === 'this') {
          quadruplesManager.pushParam(address, argAddress);
        } else {
          const operand = argumentOperands.pop();
          quadruplesManager.pushParam(operand, argAddress);
        }
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
      if (OPERANDS[op]) {
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
      if (op === OPCODES.ASTORE || op === OPCODES.ALOAD) {
        return [
          op,
          lop,
          memoryManager.getAddressDebug(rop),
          memoryManager.getAddressDebug(rrop),
        ];
      }
      if (
        op === OPCODES.STORE ||
        op === OPCODES.PARAM ||
        op === OPCODES.NPARAM ||
        op === OPCODES.F2I
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
