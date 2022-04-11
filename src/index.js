const { readFileSync } = require("fs");
const { Parser } = require("jison");
const path = require("path");

const filePaths = process.argv.slice(2);
const files = filePaths.map((filePath) => readFileSync(filePath, "utf-8"));

if (files?.length) {
  const grammar = readFileSync(path.join(__dirname, "grammar.jison"), "utf-8");
  const parser = new Parser(grammar, { debug: true });
  files.forEach((file) => parser.parse(file));
}