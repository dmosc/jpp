const { parser } = require('../src/compiler');
const { readFileSync } = require('fs');
const path = require('path');

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
];

test.each(testMap)('Compile $name ($description)', ({ name, error }) => {
  const fileContent = readFileSync(
    path.join(__dirname, 'files', `${name}.jpp`),
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
