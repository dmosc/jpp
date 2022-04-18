const { readFileSync } = require('fs');
const { parser } = require('./compiler');

const filePaths = process.argv.slice(2);
const files = filePaths.map((filePath) => readFileSync(filePath, 'utf-8'));

if (files?.length) {
  files.forEach((file) => parser.parse(file));
}
