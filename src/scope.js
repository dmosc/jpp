/*
  The Scope class works as the ALL-table to register variables, functions, and classes.
  It is made to register and retrieve registered ids.
*/
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
    return this.aliases[alias];
  }

  isParent(scope) {
    return scope.getParent() - 1 === this._parent;
  }
}

module.exports = Scope;
