const { TYPES } = require('./constants');

class ClassManager {
  constructor(props) {
    this.currentClass = undefined;
    this.classess = {};
  }

  getCurrentClass() {
    return this.classess[this.currentClass];
  }

  pushClass(alias, address) {
    this.currentClass = alias;
    this.classess[alias] = {
      baseAddress: address,
    };
  }

  addAttribute() {}

  addMethod(alias, method) {
    const currentClass = this.getCurrentClass();
    currentClass[alias] = method;
  }
}
