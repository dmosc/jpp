const { createNewParser } = require('../src/compiler');
const { readFileSync } = require('fs');
const { join } = require('path');

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
  // OOP not yet implemented
  /*{
    name: 'test3',
    description: 'OOP - Clases',
    error: false,
  },*/
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
  {
    name: 'test9',
    description: 'For loop',
    error: false,
  },
];

test.each(testMap)('Compile $name ($description)', ({ name, error }) => {
  const filePath = join(__dirname, 'files', `${name}.jpp`);
  const fileContent = readFileSync(filePath, 'utf-8');

  const parse = () => {
    createNewParser(filePath, fileContent);
  };
  if (error) {
    expect(parse).toThrowError();
  } else {
    expect(parse).not.toThrowError();
  }
});
