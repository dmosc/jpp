const NativeFunction = require('../native-function');

class StrToFloatFunction extends NativeFunction {
  execute([string]) {
    const parsedResult = parseFloat(string);
    if (isNaN(parsedResult)) {
      throw new Error(`Can't parse ${string} to a float`);
    }
    return parsedResult;
  }
}

module.exports = StrToFloatFunction;
