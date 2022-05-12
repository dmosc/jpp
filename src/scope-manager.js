class ScopeManager {
  constructor() {
    this.scopes = [{ _parent: -1 }];
    this.scope = this.scopes[0];
  }

  #parent() {
    return this.scopes[this.scope._parent];
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

  push() {
    this.scope = { _parent: this.scope._parent + 1 };
    this.scopes.push(this.scope);
  }

  pop() {
    this.scope = this.#parent();
  }
}

module.exports = ScopeManager;
