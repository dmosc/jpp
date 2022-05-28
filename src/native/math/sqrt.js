const NativeFunction = require('../native-function');

class SqrtFunction extends NativeFunction {
  execute([x]) {
    return Math.sqrt(x);
  }
}

module.exports = SqrtFunction;
