const { Stack } = require('datastructures-js');
const {
  OPCODES,
  OPERATOR_FUNCTIONS,
  OPERANDS,
  NATIVE_FUNCTIONS,
  OPERATORS,
} = require('../constants');
const MemoryManager = require('../memory-manager');

class VirtualMachine {
  constructor(ir) {
    this.quads = ir.getQuadruplesManager().quadruples;
    this.ip = 0; // instruction pointer
    this.memory = new MemoryManager();
    this.done = false;
    this.callStack = new Stack();

    const operators = Object.entries(OPERATOR_FUNCTIONS).map(([op, opFunc]) => {
      if (OPERANDS[op] === 2) {
        return {
          [op]: (lop, rop, resOp) => {
            this.memory.setValue(
              resOp,
              opFunc(this.memory.getValue(lop), this.memory.getValue(rop))
            );
          },
        };
      }

      return {
        [op]: (_lop, rop, resOp) => {
          this.memory.setValue(
            resOp,
            opFunc(undefined, this.memory.getValue(rop))
          );
        },
      };
    });

    this.opcodeHandles = {
      [OPCODES.EXIT]: this.handleExit.bind(this),

      [OPCODES.LOAD]: this.handleLoad.bind(this),
      [OPCODES.ALOAD]: this.handleALoad.bind(this),
      [OPCODES.STORE]: this.handleStore.bind(this),
      [OPCODES.PARAM]: this.handleParam.bind(this),
      [OPCODES.NPARAM]: this.handleNativeParam.bind(this),
      [OPCODES.ASTORE]: this.handleAStore.bind(this),

      [OPCODES.GOTO]: this.handleGoto.bind(this),
      [OPCODES.GOTO_T]: this.handleGotoT.bind(this),
      [OPCODES.GOTO_F]: this.handleGotoF.bind(this),

      [OPCODES.AIR]: this.handleEra.bind(this),
      [OPCODES.RETURN]: this.handleReturn.bind(this),
      [OPCODES.CALL]: this.handleCall.bind(this),
      [OPCODES.NCALL]: this.handleNative.bind(this),
      [OPCODES.INIT]: () => {},
      ...Object.assign(...operators),
      [OPCODES.IDIVIDE]: (lop, rop, resOp) => {
        this.memory.setValue(
          resOp,
          Math.trunc(
            OPERATOR_FUNCTIONS[OPERATORS.DIVISION](
              this.memory.getValue(lop),
              this.memory.getValue(rop)
            )
          )
        );
      },
      [OPCODES.FDIVIDE]: (lop, rop, resOp) => {
        this.memory.setValue(
          resOp,
          OPERATOR_FUNCTIONS[OPERATORS.DIVISION](
            this.memory.getValue(lop),
            this.memory.getValue(rop)
          )
        );
      },
    };

    this.nativeParams = [];
  }

  run() {
    while (!this.done) {
      const [opcode, leftOp, rightOp, resultOp] = this.quads[this.ip];
      this.opcodeHandles[opcode](leftOp, rightOp, resultOp);

      this.ip = this.ip + 1;
    }
  }

  handleExit() {
    this.done = true;
  }

  handleLoad(constantValue, _rightOp, resultAddress) {
    this.memory.setValue(resultAddress, constantValue);
  }

  handleALoad(pointer, offset, resultAddress) {
    this.memory.setValue(
      resultAddress,
      this.memory.getValue(pointer + this.memory.getValue(offset))
    );
  }

  handleStore(referenceAddress, _rightOp, resultAddress) {
    this.memory.setValue(resultAddress, this.memory.getValue(referenceAddress));
  }

  handleParam(referenceAddress, _rightOp, resultAddress) {
    this.memory.setValue(
      resultAddress,
      this.memory.getValueForParam(referenceAddress)
    );
  }

  handleNativeParam(referenceAddress, _rightOp, _res) {
    this.nativeParams.push(this.memory.getValue(referenceAddress));
  }

  handleAStore(pointer, offset, resultAddress) {
    this.memory.setValue(
      pointer + this.memory.getValue(offset),
      this.memory.getValue(resultAddress)
    );
  }

  handleGoto(_lop, _rop, quad) {
    this.ip = quad - 1;
  }

  handleGotoT(address, _rop, quad) {
    if (this.memory.getValue(address)) {
      this.ip = quad - 1;
    }
  }

  handleGotoF(address, _rop, quad) {
    if (!this.memory.getValue(address)) {
      this.ip = quad - 1;
    }
  }

  handleEra() {
    this.memory.era();
  }

  handleCall(_l, _r, quad) {
    this.callStack.push(this.ip);
    this.ip = quad - 1;
  }

  handleNative(nativeCallName, _r, returnAddress) {
    const func = NATIVE_FUNCTIONS[nativeCallName];
    const res = func.execute(this.nativeParams);
    if (returnAddress !== undefined) {
      this.memory.setValue(returnAddress, res);
    }
    this.nativeParams = [];
  }

  handleReturn() {
    this.memory.eraPop();
    this.ip = this.callStack.pop();
  }
}

module.exports = VirtualMachine;
