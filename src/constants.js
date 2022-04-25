const TYPES = Object.freeze({
  INT: 'INT',
  FLOAT: 'FLOAT',
  STRING: 'STRING',
  BOOL: 'BOOL',
});

const OPCODES = Object.freeze({
  GOTO: 'GOTO',
  GOTO_T: 'GOTO_T',
  GOTO_F: 'GOTO_F',
  RETURN: 'RETURN',
  INIT: 'INIT',
});

const OPERATORS = Object.freeze({
  BOOLEAN_OR: '||',
  BOOLEAN_AND: '&&',
  BITWISE_OR: '|',
  BITWISE_XOR: '^',
  BITWISE_AND: '&',
  EQUALS: '==',
  NOT_EQUALS: '!=',
  GT: '>',
  GTE: '>=',
  LT: '<',
  LTE: '<=',
  BITWISE_LEFT_SHIFT: '<<',
  BITWISE_RIGHT_SHIFT: '>>',
  PLUS: '+',
  MINUS: '-',
  MULTIPLICATION: '*',
  DIVISION: '/',
  MODULO: '%',
  ASSIGN: '=',
  BOOLEAN_NOT: '!',
  BITWISE_NOT: '~',
});

const OPERANDS = Object.freeze({
  [OPERATORS.BOOLEAN_OR]: 2,
  [OPERATORS.BOOLEAN_AND]: 2,
  [OPERATORS.BITWISE_OR]: 2,
  [OPERATORS.BITWISE_XOR]: 2,
  [OPERATORS.BITWISE_AND]: 2,
  [OPERATORS.EQUALS]: 2,
  [OPERATORS.NOT_EQUALS]: 2,
  [OPERATORS.GT]: 2,
  [OPERATORS.GTE]: 2,
  [OPERATORS.LT]: 2,
  [OPERATORS.LTE]: 2,
  [OPERATORS.BITWISE_LEFT_SHIFT]: 2,
  [OPERATORS.BITWISE_RIGHT_SHIFT]: 2,
  [OPERATORS.PLUS]: 2,
  [OPERATORS.MINUS]: 2,
  [OPERATORS.MULTIPLICATION]: 2,
  [OPERATORS.DIVISION]: 2,
  [OPERATORS.MODULO]: 2,
  [OPERATORS.ASSIGN]: 2,
  [OPERATORS.BOOLEAN_NOT]: 1,
  [OPERATORS.BITWISE_NOT]: 1,
});

const TTO_CUBE = Object.freeze({
  [TYPES.INT]: {
    [TYPES.INT]: {
      [OPERATORS.PLUS]: TYPES.INT,
      [OPERATORS.MINUS]: TYPES.INT,
      [OPERATORS.MULTIPLICATION]: TYPES.INT,
      [OPERATORS.DIVISION]: TYPES.INT,
      [OPERATORS.MODULO]: TYPES.INT,
      [OPERATORS.BITWISE_OR]: TYPES.INT,
      [OPERATORS.BITWISE_XOR]: TYPES.INT,
      [OPERATORS.BITWISE_AND]: TYPES.INT,
      [OPERATORS.BITWISE_LEFT_SHIFT]: TYPES.INT,
      [OPERATORS.BITWISE_RIGHT_SHIFT]: TYPES.INT,
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
      [OPERATORS.GT]: TYPES.BOOL,
      [OPERATORS.GTE]: TYPES.BOOL,
      [OPERATORS.LT]: TYPES.BOOL,
      [OPERATORS.LTE]: TYPES.BOOL,
      [OPERATORS.ASSIGN]: TYPES.INT,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
      [OPERATORS.GT]: TYPES.BOOL,
      [OPERATORS.GTE]: TYPES.BOOL,
      [OPERATORS.LT]: TYPES.BOOL,
      [OPERATORS.LTE]: TYPES.BOOL,
    },
    [OPERATORS.BITWISE_NOT]: TYPES.INT,
    [OPERATORS.BOOLEAN_NOT]: TYPES.BOOL,
  },
  [TYPES.FLOAT]: {
    [TYPES.INT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
      [OPERATORS.GT]: TYPES.BOOL,
      [OPERATORS.GTE]: TYPES.BOOL,
      [OPERATORS.LT]: TYPES.BOOL,
      [OPERATORS.LTE]: TYPES.BOOL,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
      [OPERATORS.GT]: TYPES.BOOL,
      [OPERATORS.GTE]: TYPES.BOOL,
      [OPERATORS.LT]: TYPES.BOOL,
      [OPERATORS.LTE]: TYPES.BOOL,
      [OPERATORS.ASSIGN]: TYPES.FLOAT,
    },
    [OPERATORS.BITWISE_NOT]: TYPES.FLOAT,
    [OPERATORS.BOOLEAN_NOT]: TYPES.BOOL,
  },
  [TYPES.BOOL]: {
    [TYPES.BOOL]: {
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
    },
    [TYPES.INT]: {
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.BOOLEAN_OR]: TYPES.BOOL,
      [OPERATORS.BOOLEAN_AND]: TYPES.BOOL,
      [OPERATORS.EQUALS]: TYPES.BOOL,
      [OPERATORS.NOT_EQUALS]: TYPES.BOOL,
    },
    [OPERATORS.BOOLEAN_NOT]: TYPES.BOOL,
  },
  getType: function (typeA, typeB, operator) {
    if (this[typeA][operator]) return this[typeA][operator];
    if (this[typeA][typeB][operator]) return this[typeA][typeB][operator];
    throw new Error(
      `Invalid operands {${typeA}, ${typeB}} to operator "${operator}"`
    );
  },
});

module.exports = {
  TYPES,
  OPCODES,
  OPERATORS,
  OPERANDS,
  TTO_CUBE,
};
