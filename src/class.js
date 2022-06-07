/*
  The ClassScope is a special Scope object type tailored to handle OOP related logic.

  Throughout the program it is treated as a Scope object but containing concrete strategies
  to handle class declarations with variable and function scoping for each class.

  It is constructed with a link to its wrapping scope, and the name of the class being registered.
*/
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
