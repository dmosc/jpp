class CurrentClass {
  constructor(id, target) {
    this.id = id;
    this.target = target;
    this.target.aliases = {};
  }

  addAlias(alias, value) {
    this.target.aliases[alias] = value;
  }

  getAlias(alias) {
    return this.target.aliases[alias];
  }

  getId() {
    return this.id;
  }
}

module.exports = CurrentClass;
