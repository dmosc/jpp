/*
  The ScopeManager manages Scope objects. It's primary purpose is to create, destroy, retrieve,
  and switch between scopes to search for the right variables at the right place.

  It handles a tree-like structure of scopes that is traversable.
*/
const ClassScope = require('./class');
const { TYPES, MEMORY_TYPES, TTO_CUBE, MEMORY_FLAGS } = require('./constants');
const CurrentFunction = require('./current-function');
const Scope = require('./scope');

class ScopeManager {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.scopes = [new Scope(-1, 0)];
    this.scope = this.scopes[0];

    // the current function that it's processing
    this.currentFunction = undefined;

    // the current class that it's processing
    this.currentClass = undefined;

    // store the class in a dictionary
    // {
    //   'MyClass': Scope,
    // }
    this.classScopes = {};

    // context means where am I relative to the alias class-wise
    // class.function, context would be class
    // this.function, context would be the class where this resides
    this.context = undefined;
  }

  getScope(i) {
    if (i < this.scopes.length) {
      return this.scopes[i];
    }
    return undefined;
  }

  getCurrentScope() {
    if (this.context !== undefined) {
      return this.context;
    }

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

  addObjectArgumentAlias(className, alias) {
    this.addClassVariableAlias(className, alias);
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

  /**
   * Adds an alias in the current scope pointing to an object
   *
   * @param {String} className The name of the object class
   * @param {String} alias the alias of the variable
   */
  addClassVariableAlias(className, alias) {
    const scope = this.getCurrentScope();
    if (scope.getAlias(alias)) {
      throw new Error(`Can\'t declare variable ${alias}:Object (${className})`);
    }
    const memoryType = this.getCurrentFunction()
      ? MEMORY_TYPES.LOCAL
      : MEMORY_TYPES.GLOBAL;
    scope.setAlias(alias, {
      type: TYPES.OBJECT,
      address: this.malloc(
        memoryType,
        TYPES.OBJECT,
        1,
        MEMORY_FLAGS.ADDRESS_REFERENCE
      ),
      dimensions: [],
      alias,
      className,
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

    // Add implicit "this" parameter
    if (this.currentClass !== undefined) {
      scope.setAlias(alias, {
        type,
        // TODO(dmosc): Verify if malloc(...) should be conditional.
        address:
          type !== TYPES.VOID ? this.malloc(memoryType, type) : undefined,
        start,
        args: [],
        // set the parent class
        parentClass: this.currentClass.name,
      });
    } else {
      scope.setAlias(alias, {
        type,
        // TODO(dmosc): Verify if malloc(...) should be conditional.
        address:
          type !== TYPES.VOID ? this.malloc(memoryType, type) : undefined,
        start,
        args: [],
      });
    }

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

  findClass(className) {
    const classObject = this.classScopes[className];

    if (!classObject) {
      throw new Error(`Class "${className}": does not exist!`);
    }

    return classObject;
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

  dummyThisParam() {
    const currFunc = this.getCurrentFunction();
    if (currFunc !== undefined && this.currentClass !== undefined) {
      this.addObjectArgumentAlias(this.currentClass.name, 'this');
    }
  }

  pop() {
    this.scope = this.getParentScope(this.scope) ?? this.scope;
  }

  pushClass(className) {
    if (this.classScopes[className]) {
      throw new Error(`Class ${className} is already defined!`);
    }

    this.scope = new ClassScope(
      this.getCurrentScope().getParent() + 1,
      this.scopes.length,
      className
    );
    this.scopes.push(this.scope);

    this.classScopes[className] = this.scope;
    this.currentClass = this.scope;
  }

  closeClass() {
    if (!this.currentClass) {
      throw new Error(
        'Tried to call closeClass() without being inside a class'
      );
    }

    this.scope = this.getParentScope(this.scope) ?? this.scope;
    this.currentClass = undefined;
  }

  setContext(contextOperand) {
    const alias = this.findAlias(contextOperand);
    this.context = this.classScopes[alias.className];

    if (!this.context) {
      throw new Error(`${contextOperand} is not an object!`);
    }
  }

  setContextObject(context) {
    this.context = context;
  }

  getCurrentContext() {
    return this.context;
  }

  clearContext() {
    this.context = undefined;
  }

  malloc(memoryType, dataType, size, flags) {
    const memory = this.getMemoryManager().getMemorySegment(
      memoryType,
      dataType
    );
    return memory.allocateAddress(size, flags);
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
