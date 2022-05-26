const { readFileSync } = require('fs');
const { Parser } = require('jison');
const { join } = require('path');
const ScopeManager = require('../scope-manager.js');
const MemoryManager = require('../memory-manager.js');
const QuadruplesManager = require('../quadruples-manager.js');
const JumpsManager = require('../jumps-manager.js');
const constants = require('../constants.js');
const IntermediateRepresentation = require('../intermediate-representation.js');
const path = require('path');

const grammar = readFileSync(join(__dirname, 'grammar.jison'), 'utf-8');

const createSubParser = (currDirectory, subFilePath, ir) => {
  const fullSubFilePath = path.join(currDirectory, subFilePath);
  const file = readFileSync(fullSubFilePath, 'utf-8');
  const parser = new Parser(grammar, { debug: false });
  parser.yy.data = {
    ir,
    constants,
    currDirectory: path.dirname(fullSubFilePath),
    createSubParser,
  };
  return parser.parse(file);
};

const createNewParser = (filePath, file) => {
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
    currDirectory: path.dirname(filePath),
    createSubParser,
  };
  return {
    ir,
    result: parser.parse(file),
  };
};

module.exports = {
  createNewParser,
};
