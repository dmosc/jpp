const { parser } = require('../src/compiler');
const { readFileSync } = require('fs');
const { join } = require('path');

global.__basedir = join(__dirname, "..", "src");

const testMap = [
  {
    name: 'test1',
    description: 'Variable and function declaration',
    error: false,
  },
  {
    name: 'test2',
    description: 'Read, writes and if/elif/else',
    error: false,
  },
  {
    name: 'test3',
    description: 'OOP - Clases',
    error: false,
  },
  {
    name: 'test4',
    description: 'For loop and 2d array testing',
    error: false,
  },
  {
    name: 'test5',
    description: 'Arithmetic tests',
    error: false,
  },
  {
    name: 'test6',
    description: 'Arithmetic and bitwise operations',
    error: false,
  },
  {
    name: 'test7',
    description: 'Variables in expression',
    error: false,
  },
];

test.each(testMap)('Compile $name ($description)', ({ name, error }) => {
  const fileContent = readFileSync(
    join(__dirname, 'files', `${name}.jpp`),
    'utf-8'
  );

  const parse = () => {
    parser.parse(fileContent);
  };
  if (error) {
    expect(parse).toThrowError();
  } else {
    expect(parse).not.toThrowError();
  }
});
