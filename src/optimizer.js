const { ControlFlowGraph } = require('./optimizer/cfg-graph');

const optimize = (quadrulples) => {
  console.log('Optimizing code');
  const graph = new ControlFlowGraph(quadrulples.quads);
  console.table(graph.toQuads());
};

module.exports = {
  optimize,
};
