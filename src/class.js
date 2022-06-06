const { TYPES } = require('./constants');
const Scope = require('./scope');

class ClassScope extends Scope {
  constructor(_parent, _index, className) {
    super(_parent, _index);
    this.name = className;
    this.isClass = true;

    this.variables = [
      {
        name: '_vtable', // currently not in use
      },
    ];
    this.constructor = undefined;
    this.functions = [];
  }

  // override
  setAlias(alias, value) {
    if (alias === 'construct') {
      this.constructor = value;
    }

    if (value.dimensions) {
      value.variableIndex = this.variables.length;
      this.variables.push(value);
    } else {
      this.functions.push(value);
    }

    this.aliases[alias] = value;
    return this.aliases[alias];
  }

  getMemorySize() {
    return this.variables.length;
  }
}

module.exports = ClassScope;
