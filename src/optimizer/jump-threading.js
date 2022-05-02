const { OPCODES } = require('../constants');

const optimize = (graph) => {
  graph.optimizePart((currentNodeId, node) => {
    if (node.operator === OPCODES.GOTO) {
      const dest = node.connections[0];

      const destInNodes = graph.inConnections[dest];
      let destInNodeCount = 0;
      for (let i = 0; i < destInNodes.length; i++) {
        if (!graph.nodes[destInNodes[i]].goto) {
          destInNodeCount++;
        }
      }

      if (destInNodeCount === 0) {
        graph.removeNode(currentNodeId);
      }
    }
  });
};

module.exports = { optimize };
