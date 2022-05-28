const NativeFunction = require('../native-function');

class CursorHomeFunction extends NativeFunction {
  execute() {
    process.stdout.write('\x1B[H');
  }
}

module.exports = CursorHomeFunction;
