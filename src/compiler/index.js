const { readFileSync } = require('fs');
const { Parser } = require('jison');
const path = require('path');

const grammar = readFileSync(path.join(__dirname, 'grammar.jison'), 'utf-8');

module.exports = {
  parser: new Parser(grammar, { debug: false }),
};
