const { Stack } = require('datastructures-js');
const { Node } = require('./node');
const { optimize: jumpThreadingOptimizer } = require('./jump-threading');
const { optimize: constantFolding } = require('./constant-folding');

const optimizers = [jumpThreadingOptimizer, constantFolding];

class ControlFlowGraph {
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

    optimizers.forEach((optimize) => {
      optimize(this);
    });
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

  optimizePart(optimizeNodeFunc) {
    const nodeSize = Object.keys(this.nodes).length;
    const visited = new Set([this.rootNode.nodeId]);
    const toVisit = new Stack([this.rootNode.nodeId]);

    while (!toVisit.isEmpty()) {
      const currentNodeId = toVisit.pop();
      const node = this.nodes[currentNodeId];

      if (!node) {
        continue;
      }

      optimizeNodeFunc(currentNodeId, node);

      node.connections?.forEach((connection) => {
        if (!visited.has(connection)) {
          visited.add(connection);
          toVisit.push(connection);
        }
      });
    }

    if (Object.keys(this.nodes).length !== nodeSize) {
      this.optimizePart(optimizeNodeFunc);
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

module.exports = { ControlFlowGraph };
