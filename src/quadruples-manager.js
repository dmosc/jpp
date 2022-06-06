const { OPCODES, OPERATORS } = require('./constants');
const { ControlFlowGraph } = require('./optimizer/cfg-graph');

class QuadruplesManager {
  constructor() {
    this.quadruples = [];
    this.pushGoTo();
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

  pushALoad(baseAddress, offset, address) {
    this.pushQuadruple([OPCODES.ALOAD, baseAddress, offset, address]);
  }

  pushExit() {
    this.pushQuadruple([OPCODES.EXIT, null, null, null]);
  }

  pushLoad(data, address) {
    this.pushQuadruple([OPCODES.LOAD, data, null, address]);
  }

  pushAir() {
    this.pushQuadruple([OPCODES.AIR, null, null, null]);
  }

  pushStore(value, address) {
    this.pushQuadruple([OPCODES.STORE, value, null, address]);
  }

  pushMalloc(size, address) {
    this.pushQuadruple([OPCODES.MALLOC, size, null, address]);
  }

  pushParam(value, address) {
    this.pushQuadruple([OPCODES.PARAM, value, null, address]);
  }

  pushNativeParam(value, address) {
    this.pushQuadruple([OPCODES.NPARAM, value, null, address]);
  }

  pushOperator(operator, left, right, target) {
    this.pushQuadruple([operator, left, right, target]);
  }

  pushCall(to) {
    this.pushQuadruple([OPCODES.CALL, null, null, to]);
  }

  pushNativeCall(nativeCallName, returnAddress) {
    this.pushQuadruple([OPCODES.NCALL, nativeCallName, null, returnAddress]);
  }

  pushReturn(value = null) {
    this.pushQuadruple([OPCODES.RETURN, null, null, value]);
  }

  pushInit() {
    // set goto main to INIT
    this.setQuadrupleValue(0, 3, this.quadruples.length);
    this.pushQuadruple([OPCODES.INIT, null, null, null]);
  }

  pushGoTo() {
    this.pushQuadruple([OPCODES.GOTO, null, null, null]);
  }

  pushGoToF(value = null) {
    this.pushQuadruple([OPCODES.GOTO_F, value, null, null]);
  }

  optimizeIR() {
    const graph = new ControlFlowGraph(this.getQuadruples());
    this.setQuadruples(graph.toQuads());
  }
}

module.exports = QuadruplesManager;
