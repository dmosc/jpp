const NativeFunction = require('./native-function');

class WriteFunction extends NativeFunction {
  execute(params) {
    console.log(params.join(''));
  }
}

module.exports = WriteFunction;
