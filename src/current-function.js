const { TYPES } = require('./constants');

class CurrentFunction {
  constructor(target) {
    this.target = target;
    this.target.args = [];
  }

  getType() {
    return this.target.type;
  }

  getAddress() {
    return this.target.address;
  }

  getStart() {
    return this.target.start;
  }

  getArgs() {
    return this.target.args;
  }

  addArg(arg) {
    this.target.args.push(arg);
  }

  isVoid() {
    return this.target.type === TYPES.VOID;
  }

  isType(type) {
    return this.target.type === type;
  }
}

module.exports = CurrentFunction;
