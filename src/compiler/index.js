const { readFileSync } = require('fs');
const { Parser } = require('jison');
const { join } = require('path');
const ScopeManager = require('../scope-manager.js');
const MemoryManager = require('../memory-manager.js');
const QuadruplesManager = require('../quadruples-manager.js');
const JumpsManager = require('../jumps-manager.js');
const constants = require('../constants.js');
const IntermediateRepresentation = require('../intermediate-representation.js');

const grammar = readFileSync(join(__dirname, 'grammar.jison'), 'utf-8');

const createSubParser = (ir) => {
  const parser = new Parser(grammar, { debug: false });
  parser.yy.data = {
    ir,
    constants,
  };
  return parser;
};

const createNewParser = () => {
  const memoryManager = new MemoryManager();
  const scopeManager = new ScopeManager(memoryManager);
  const quadruplesManager = new QuadruplesManager();
  const jumpsManager = new JumpsManager();
  const ir = new IntermediateRepresentation(
    scopeManager,
    quadruplesManager,
    jumpsManager
  );

  const parser = new Parser(grammar, { debug: false });
  parser.yy.data = {
    ir,
    constants,
    createSubParser: (file) => createSubParser(ir).parse(file),
  };
  return parser;
};

module.exports = {
  createNewParser,
};
