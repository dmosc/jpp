const { readFileSync } = require('fs');
const { Parser } = require('jison');
const { join } = require('path');

const grammar = readFileSync(join(__dirname, 'grammar.jison'), 'utf-8');

const createNewParser = () => {
  const IntermediateRepresentation = require(join(
    __basedir,
    'intermediate-representation.js'
  ));
  const ScopeManager = require(join(__basedir, 'scope-manager.js'));
  const MemoryManager = require(join(__basedir, 'memory-manager.js'));
  const QuadruplesManager = require(join(__basedir, 'quadruples-manager.js'));
  const JumpsManager = require(join(__basedir, 'jumps-manager.js'));
  const constants = require(join(__basedir, 'constants.js'));

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
  };
  return parser;
};

module.exports = {
  createNewParser,
};
