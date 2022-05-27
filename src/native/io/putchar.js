const NativeFunction = require('../native-function');

class PutCharFunction extends NativeFunction {
  execute([c]) {
    process.stdout.write(c);
  }
}

module.exports = PutCharFunction;
