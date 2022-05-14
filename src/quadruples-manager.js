const {OPCODES, OPERATORS, OPERANDS} = require("./constants");

class QuadruplesManager {
  constructor() {
    this.quadruples = [];
  }

  getQuadrupleValue(from, to) {
    const quadruples = this.getQuadruples();
    return quadruples[from][to];
  }

  setQuadrupleValue(from, to, value) {
    const quadruples = this.getQuadruples();
    quadruples[from][to] = value;
  }

  getQuadruples() {
    return this.quadruples;
  }

  setQuadruples(quadruples) {
    this.quadruples = quadruples;
  }

  getQuadruplesSize() {
    return this.quadruples.length;
  }

  pushQuadruple(quadruple) {
    this.quadruples.push(quadruple);
  }

  pushLoad(data, address) {
    this.pushQuadruple([OPCODES.LOAD, data, null, address]);
  }

  pushAir() {
    this.pushQuadruple([OPCODES.AIR, null, null, null]);
  }

  pushAssign(left, right, target) {
    this.pushQuadruple([OPERATORS.ASSIGN, left, right, target])
  }

  pushCall(to) {
    this.pushQuadruple([OPCODES.CALL, null, null, to]);
  }

  pushReturn(value = null) {
    this.pushQuadruple([OPCODES.RETURN, null, null, value]);
  }

  pushInit() {
    this.pushQuadruple([OPCODES.INIT, null, null, null]);
  }

  pushGoTo() {
    this.pushQuadruple([OPCODES.GOTO, null, null, null]);
  }

  pushGoToF(value = null) {
    this.pushQuadruple([OPCODES.GOTO_F, value, null, null]);
  }
}

module.exports = QuadruplesManager;