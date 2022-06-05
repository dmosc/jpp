const NativeFunction = require('../native-function');

class StrToIntFunction extends NativeFunction {
  execute([string]) {
    const parsedResult = parseInt(string);
    if (isNaN(parsedResult)) {
      throw new Error(`Can't parse ${string} to an integer`);
    }
    return parsedResult;
  }
}

module.exports = StrToIntFunction;
