const NativeFunction = require('../native-function');

class StrLenFunction extends NativeFunction {
  execute([string]) {
    return string.length;
  }
}

module.exports = StrLenFunction;
