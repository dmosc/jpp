const { Stack } = require('datastructures-js');
const { OPCODES, OPERANDS, OPERATOR_FUNCTIONS } = require('../constants');

class Node {
  constructor([operator, leftOperand, rightOperand, resultOperand], nodeIndex) {
    this.operator = operator;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
    this.resultOperand = resultOperand;

    this.nodeId = `node${nodeIndex}`;

    if (this.operator === OPCODES.INIT) {
      this.rootNode = true;
    }

    if (this.operator === OPCODES.GOTO_F || this.operator === OPCODES.CALL) {
      this.goto = `node${resultOperand}`;
      this.connections = [this.goto, `node${nodeIndex + 1}`];
    } else if (this.operator === OPCODES.GOTO_T) {
      this.goto = `node${resultOperand}`;
      this.connections = [`node${nodeIndex + 1}`, this.goto];
    } else if (this.operator === OPCODES.GOTO) {
      this.goto = `node${resultOperand}`;
      this.connections = [this.goto];
    } else if (this.operator !== OPCODES.RETURN) {
      this.connections = [`node${nodeIndex + 1}`];
    }
  }
}

class CodeGraph {
  constructor(quads) {
    this.nodes = {};
    this.inConnections = {};

    for (let i = 0; i < quads.length; i++) {
      const nodeId = `node${i}`;
      const node = new Node(quads[i], i);
      this.nodes[nodeId] = node;

      if (node.rootNode) {
        this.rootNode = node;
      }

      node.connections?.forEach((connection) => {
        if (this.inConnections[connection]) {
          this.inConnections[connection].push(nodeId);
        } else {
          this.inConnections[connection] = [nodeId];
        }
      });
    }

    this.optimizeJumps();
    this.optimizeConstants();
  }

  removeNode(nodeId) {
    const outConnections = this.nodes[nodeId].connections;
    if (outConnections?.length > 1) {
      throw new Error('Cannot remove node with two outgoing connections');
    }

    const dest = outConnections && outConnections[0];

    this.inConnections[nodeId].forEach((inNodeId) => {
      const inNodes = this.nodes[inNodeId].connections;
      for (let i = 0; i < inNodes.length; i++) {
        if (inNodes[i] === nodeId) {
          inNodes[i] = dest;
        }
      }

      if (this.nodes[inNodeId].goto === nodeId) {
        this.nodes[inNodeId].goto = dest;
      }
    });

    this.inConnections[dest] =
      this.inConnections[dest]?.filter((node) => node !== nodeId) || [];
    this.inConnections[dest].push(...this.inConnections[nodeId]);

    delete this.inConnections[nodeId];
    delete this.nodes[nodeId];
  }

  optimizeJumps() {
    this.optimizePart((currentNodeId, node) => {
      if (node.operator === OPCODES.GOTO) {
        const dest = node.connections[0];

        const destInNodes = this.inConnections[dest];
        let destInNodeCount = 0;
        for (let i = 0; i < destInNodes.length; i++) {
          if (!this.nodes[destInNodes[i]].goto) {
            destInNodeCount++;
          }
        }

        if (destInNodeCount === 0) {
          this.removeNode(currentNodeId);
        }
      }
    });
  }

  optimizeConstants() {
    const resolvedOperations = {};

    this.optimizePart((currentNodeId, node) => {
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

      this.removeNode(currentNodeId);
    });
  }

  optimizePart(optimizeNode) {
    const nodeSize = Object.keys(this.nodes).length;
    const visited = new Set([this.rootNode.nodeId]);
    const toVisit = new Stack([this.rootNode.nodeId]);

    while (!toVisit.isEmpty()) {
      const currentNodeId = toVisit.pop();
      const node = this.nodes[currentNodeId];

      if (!node) {
        continue;
      }

      optimizeNode(currentNodeId, node);

      node.connections?.forEach((connection) => {
        if (!visited.has(connection)) {
          visited.add(connection);
          toVisit.push(connection);
        }
      });
    }

    if (Object.keys(this.nodes).length !== nodeSize) {
      this.optimizePart(optimizeNode);
    }
  }

  toQuads() {
    const quads = [];
    const idMap = {};

    const visited = new Set([this.rootNode.nodeId]);
    const toVisit = new Stack([this.rootNode.nodeId]);
    const gotos = [];

    while (!toVisit.isEmpty()) {
      const currentNodeId = toVisit.pop();
      const node = this.nodes[currentNodeId];
      const currentIndex = quads.length;
      idMap[currentNodeId] = currentIndex;

      if (!node) {
        quads.push(['EXIT', undefined, undefined, undefined]);
        continue;
      }

      quads.push([
        node.operator,
        node.leftOperand,
        node.rightOperand,
        node.goto || node.resultOperand,
      ]);

      if (node.goto) {
        gotos.push(currentIndex);
      }

      node.connections?.forEach((connection) => {
        if (!visited.has(connection)) {
          visited.add(connection);
          toVisit.push(connection);
        }
      });
    }

    gotos.forEach((nodeIndex) => {
      const gotoNodeId = quads[nodeIndex][3];
      quads[nodeIndex][3] = idMap[gotoNodeId];
    });
    return quads;
  }
}

module.exports = { CodeGraph };
