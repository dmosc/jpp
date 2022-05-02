const { OPERANDS, OPERATOR_FUNCTIONS } = require('../constants');

const optimize = (graph) => {
  const resolvedOperations = {};

  graph.optimizePart((currentNodeId, node) => {
    if (
      node.rightOperand?.address !== undefined &&
      resolvedOperations[`${node.rightOperand.address}`]
    ) {
      node.rightOperand = resolvedOperations[`${node.rightOperand.address}`];
    } else if (
      node.leftOperand?.address !== undefined &&
      resolvedOperations[`${node.leftOperand.address}`]
    ) {
      node.leftOperand = resolvedOperations[`${node.leftOperand.address}`];
    }

    const opFunc = OPERATOR_FUNCTIONS[node.operator];
    if (!opFunc) {
      return;
    }

    const rightOperand = node.rightOperand;
    if (!rightOperand?.data) {
      return;
    }

    const leftOperand = node.leftOperand;
    if (OPERANDS[node.operator] === 2 && !leftOperand?.data) {
      return;
    }

    const res = {
      type: node.resultOperand.type,
      data: opFunc(leftOperand?.data, rightOperand.data),
    };
    const resAddress = node.resultOperand.address;
    resolvedOperations[resAddress] = res;

    graph.removeNode(currentNodeId);
  });
};

module.exports = { optimize };
