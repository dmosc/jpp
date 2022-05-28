const NativeFunction = require('../native-function');

class F2iFunction extends NativeFunction {
  execute([x]) {
    return parseInt(x);
  }
}

module.exports = F2iFunction;
