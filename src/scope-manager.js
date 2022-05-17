const { TYPES, MEMORY_TYPES, TTO_CUBE } = require('./constants');
const CurrentFunction = require('./current-function');
const Scope = require('./scope');

class ScopeManager {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
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

  getMemoryManager() {
    return this.memoryManager;
  }

  switchCurrentFunction(alias = undefined) {
    if (!alias) {
      this.currentFunction = undefined;
    } else {
      this.currentFunction = new CurrentFunction(this.findAlias(alias));
    }
  }

  addArgumentAlias(alias, type, dimensions) {
    this.addVariableAlias(alias, type, dimensions);
    const arg = this.findAlias(alias);
    this.getCurrentFunction()?.addArg(arg);
  }

  addVariableAlias(alias, type, dimensions) {
    const scope = this.getCurrentScope();
    if (scope.getAlias(alias)) {
      throw new Error(`Can\'t declare variable ${alias}:${type}`);
    }
    dimensions = dimensions.map(Number);
    const size = dimensions.reduce((size, dimension) => size * dimension, 1);
    const memoryType = this.getCurrentFunction()
      ? MEMORY_TYPES.LOCAL
      : MEMORY_TYPES.GLOBAL;
    scope.setAlias(alias, {
      type,
      address: this.malloc(memoryType, type, size),
      dimensions,
      alias,
    });
  }

  addFunctionAlias(alias, type, start) {
    const scope = this.getCurrentScope();
    if (scope.getAlias(alias)) {
      throw new Error(`Can\'t declare function ${alias}:${type}`);
    }
    const memoryType = this.getCurrentFunction()
      ? MEMORY_TYPES.LOCAL
      : MEMORY_TYPES.GLOBAL;
    scope.setAlias(alias, {
      type,
      // TODO(dmosc): Verify if malloc(...) should be conditional.
      address: type !== TYPES.VOID ? this.malloc(memoryType, type) : undefined,
      start,
      args: [],
    });
    this.switchCurrentFunction(alias);
  }

  findAlias(alias, dimensions = undefined) {
    let scope = this.getCurrentScope();
    let aliases;
    while (scope) {
      aliases = scope.getAliases();
      if (aliases[alias]) {
        if (
          dimensions &&
          aliases[alias]?.dimensions.length !== dimensions.length
        ) {
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
    throw new Error(`Alias "${alias}": does not exists`);
  }

  addressDetails(address) {
    const memoryManager = this.getMemoryManager();
    return {
      scope: memoryManager.getScope(address),
      type: memoryManager.getType(address),
      address: memoryManager.getAddress(address),
    };
  }

  push() {
    this.scope = new Scope(
      this.getCurrentScope().getParent() + 1,
      this.scopes.length
    );
    this.scopes.push(this.scope);
  }

  pop() {
    this.scope = this.getParentScope(this.scope) ?? this.scope;
  }

  malloc(memoryType, dataType, size) {
    const memory = this.getMemoryManager().getMemorySegment(
      memoryType,
      dataType
    );
    return memory.getAddress(size);
  }

  getTTO(leftAddress, rightAddress, operator) {
    const memoryManager = this.getMemoryManager();
    return TTO_CUBE.getType(
      memoryManager.getType(leftAddress),
      memoryManager.getType(rightAddress),
      operator
    );
  }

  resetLocalMemory() {
    this.getMemoryManager().clearLocals();
  }
}

module.exports = ScopeManager;
