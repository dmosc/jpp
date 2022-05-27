const NativeFunction = require('../native-function');

class CosFunction extends NativeFunction {
  execute([x]) {
    return Math.cos(x);
  }
}

module.exports = CosFunction;
