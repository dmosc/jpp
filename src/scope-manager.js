const {TYPES} = require("./constants");

class Scope {
  constructor(_parent, _index) {
    this._index = _index;
    this._parent = _parent;
    this.aliases = {};
  }

  getIndex() {
    return this._index;
  }

  getParent() {
    return this._parent;
  }

  getAliases() {
    return this.aliases;
  }

  getAlias(alias) {
    return this.aliases[alias];
  }

  setAlias(alias, value) {
    this.aliases[alias] = value;
  }

  isParent(scope) {
    return scope.getParent() - 1 === this._parent;
  }
}

class ScopeManager {
  constructor() {
    this.scopes = [new Scope(-1, 0)];
    this.scope = this.scopes[0];
    this.currentFunction = undefined;
  }

  getScope(i) {
    if (i < this.scopes.length) {
      return this.scopes[i];
    }
    return undefined;
  }

  getCurrentScope() {
    return this.scope;
  }

  getParentScope(scope) {
    for (let i = scope.getIndex() - 1; i >= 0; --i) {
      if (this.getScope(i).isParent(scope)) {
        return this.getScope(i);
      }
    }
    return undefined;
  }

  getCurrentFunction() {
    return this.currentFunction;
  }

  switchCurrentFunction(alias = undefined) {
    if (!alias) this.currentFunction = undefined;
    else this.currentFunction = this.findAlias(alias);
  }

  addVariableAlias(alias, type, dimensions, address) {
    const scope = this.getCurrentScope();
    if (scope.getAlias(alias)) {
      throw new Error(`Can\'t declare variable ${alias}:${type}`);
    }
    scope.setAlias(alias, {
      type,
      address,
      dimensions: dimensions.map(Number),
      alias,
      isArgument: !!this.getCurrentFunction()
    });
  }

  addFunctionAlias(alias, type, start, address) {
    const scope = this.getCurrentScope();
    if (scope.getAlias(alias)) {
      throw new Error(`Can\'t declare function ${alias}:${type}`);
    }
    scope.setAlias(alias, {
      type,
      address,
      arguments: [],
      start,
    });
  }

  findAlias(alias, dimensions = undefined) {
    let scope = this.getCurrentScope();
    let aliases;
    while (scope) {
      aliases = scope.getAliases();
      if (aliases[alias]) {
        if (dimensions && aliases[alias]?.dimensions.length !== dimensions.length) {
          throw new Error(
            `Invalid variable as operand: ${alias}${
              dimensions.length ? `[${dimensions.join('][')}]` : ''
            }`
          );
        }
        return aliases[alias];
      }
      scope = this.getParentScope(scope);
    }
  }

  push() {
    this.scope = new Scope(this.getCurrentScope().getParent() + 1, this.scopes.length);
    this.scopes.push(this.scope);
  }

  pop() {
    this.scope = this.getParentScope(this.scope) ?? this.scope;
  }
}

module.exports = ScopeManager;
