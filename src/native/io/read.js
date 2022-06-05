const NativeFunction = require('../native-function');
const prompt = require('prompt-sync')();

class ReadFunction extends NativeFunction {
  execute(params) {
    return prompt(params[0]);
  }
}

module.exports = ReadFunction;
