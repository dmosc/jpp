const NativeFunction = require('../native-function');

class PowFunction extends NativeFunction {
  execute([x, y]) {
    return Math.pow(x, y);
  }
}

module.exports = PowFunction;
