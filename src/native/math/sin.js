const NativeFunction = require('../native-function');

class SinFunction extends NativeFunction {
  execute([x]) {
    return Math.sin(x);
  }
}

module.exports = SinFunction;
