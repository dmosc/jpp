const NativeFunction = require('../native-function');

class ClearConsoleFunction extends NativeFunction {
  execute() {
    process.stdout.write('\x1B[2J');
  }
}

module.exports = ClearConsoleFunction;
