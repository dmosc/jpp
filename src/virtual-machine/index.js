const { OPCODES, OPERATOR_FUNCTIONS, OPERANDS } = require('../constants');
const MemoryManager = require('../memory-manager');

class VirtualMachine {
  constructor(ir) {
    this.quads = ir.getQuadruplesManager().quadruples;
    this.ip = 0; // instruction pointer
    this.memory = new MemoryManager();
    this.done = false;

    const operators = Object.entries(OPERATOR_FUNCTIONS).map(([op, opFunc]) => {
      if (OPERANDS[op] == 2) {
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
      [OPCODES.ASTORE]: this.handleAStore.bind(this),

      [OPCODES.GOTO]: this.handleGoto.bind(this),
      [OPCODES.GOTO_T]: this.handleGotoT.bind(this),
      [OPCODES.GOTO_F]: this.handleGotoF.bind(this),

      [OPCODES.AIR]: undefined,
      [OPCODES.CALL]: undefined,
      [OPCODES.RETURN]: undefined,
      [OPCODES.INIT]: () => {},

      ...Object.assign(...operators),
    };
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
      this.memory.getValue(this.memory.getValue(pointer) + offset)
    );
  }

  handleStore(referenceAddress, _rightOp, resultAddress) {
    this.memory.setValue(resultAddress, this.memory.getValue(referenceAddress));
  }

  handleAStore(pointer, offset, resultAddress) {
    this.memory.setValue(
      this.memory.getValue(pointer) + offset,
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
}

module.exports = VirtualMachine;
