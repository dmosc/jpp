const { readFileSync } = require('fs');
const { createNewParser } = require('./compiler');

global.__basedir = __dirname;

const filePaths = process.argv.slice(2);
const files = filePaths.map((filePath) => [
  filePath,
  readFileSync(filePath, 'utf-8'),
]);

if (files?.length) {
  files.forEach(([filePath, file]) => createNewParser(filePath, file));
}
