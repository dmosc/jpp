const { CodeGraph } = require('./optimizer/ir-graph');

const optimize = (quadrulples) => {
  console.log('Optimizing code');
  const graph = new CodeGraph(quadrulples.quads);
  console.table(graph.toQuads());
};

module.exports = {
  optimize,
};
