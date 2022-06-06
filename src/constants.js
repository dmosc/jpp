const WriteFunction = require('./native/io/write');
const ClearConsoleFunction = require('./native/io/clear_console');
const CursorHomeFunction = require('./native/io/cursor_home');
const PutCharFunction = require('./native/io/putchar');
const StrLengthFunction = require('./native/string/str_len');
const CosFunction = require('./native/math/cos');
const SinFunction = require('./native/math/sin');
const PowFunction = require('./native/math/pow');
const SqrtFunction = require('./native/math/sqrt');
const F2iFunction = require('./native/math/f2i');
const ReadFunction = require('./native/io/read');
const StrToIntFunction = require('./native/string/str_to_int');
const StrToFloatFunction = require('./native/string/str_to_float');

const TYPES = Object.freeze({
  INT: 'INT',
  FLOAT: 'FLOAT',
  STRING: 'STRING',
  VOID: 'VOID',
  ADDRESS: 'ADDRESS',
  OBJECT: 'OBJECT',
});

const OPCODES = Object.freeze({
  LOAD: 'LOAD',
  AIR: 'AIR',
  CALL: 'CALL',
  GOTO: 'GOTO',
  GOTO_T: 'GOTO_T',
  GOTO_F: 'GOTO_F',
  RETURN: 'RETURN',
  INIT: 'INIT',
  STORE: 'STORE',
  ASTORE: 'ASTORE',
  ALOAD: 'ALOAD',
  EXIT: 'EXIT',
  PARAM: 'PARAM',
  NCALL: 'NCALL',
  MALLOC: 'MALLOC',
  NPARAM: 'NPARAM',
  IDIVIDE: 'IDIVIDE',
  FDIVIDE: 'FDIVIDE',
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

const OPERATOR_FUNCTIONS = Object.freeze({
  [OPERATORS.BOOLEAN_OR]: (op1, op2) => op1 || op2,
  [OPERATORS.BOOLEAN_AND]: (op1, op2) => op1 && op2,
  [OPERATORS.BITWISE_OR]: (op1, op2) => op1 | op2,
  [OPERATORS.BITWISE_XOR]: (op1, op2) => op1 ^ op2,
  [OPERATORS.BITWISE_AND]: (op1, op2) => op1 & op2,
  [OPERATORS.EQUALS]: (op1, op2) => op1 === op2,
  [OPERATORS.NOT_EQUALS]: (op1, op2) => op1 !== op2,
  [OPERATORS.GT]: (op1, op2) => op1 > op2,
  [OPERATORS.GTE]: (op1, op2) => op1 >= op2,
  [OPERATORS.LT]: (op1, op2) => op1 < op2,
  [OPERATORS.LTE]: (op1, op2) => op1 <= op2,
  [OPERATORS.BITWISE_LEFT_SHIFT]: (op1, op2) => op1 << op2,
  [OPERATORS.BITWISE_RIGHT_SHIFT]: (op1, op2) => op1 >> op2,
  [OPERATORS.PLUS]: (op1, op2) => op1 + op2,
  [OPERATORS.MINUS]: (op1, op2) => op1 - op2,
  [OPERATORS.MULTIPLICATION]: (op1, op2) => op1 * op2,
  [OPERATORS.DIVISION]: (op1, op2) => op1 / op2,
  [OPERATORS.MODULO]: (op1, op2) => op1 % op2,
  [OPERATORS.BOOLEAN_NOT]: (_op1, op2) => !op2,
  [OPERATORS.BITWISE_NOT]: (_op1, op2) => ~op2,
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
      [OPERATORS.BOOLEAN_OR]: TYPES.INT,
      [OPERATORS.BOOLEAN_AND]: TYPES.INT,
      [OPERATORS.EQUALS]: TYPES.INT,
      [OPERATORS.NOT_EQUALS]: TYPES.INT,
      [OPERATORS.GT]: TYPES.INT,
      [OPERATORS.GTE]: TYPES.INT,
      [OPERATORS.LT]: TYPES.INT,
      [OPERATORS.LTE]: TYPES.INT,
      [OPERATORS.ASSIGN]: TYPES.INT,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.INT,
      [OPERATORS.BOOLEAN_AND]: TYPES.INT,
      [OPERATORS.EQUALS]: TYPES.INT,
      [OPERATORS.NOT_EQUALS]: TYPES.INT,
      [OPERATORS.GT]: TYPES.INT,
      [OPERATORS.GTE]: TYPES.INT,
      [OPERATORS.LT]: TYPES.INT,
      [OPERATORS.LTE]: TYPES.INT,
    },
    [TYPES.STRING]: {
      [OPERATORS.PLUS]: TYPES.STRING,
    },
    [OPERATORS.BITWISE_NOT]: TYPES.INT,
    [OPERATORS.BOOLEAN_NOT]: TYPES.INT,
  },
  [TYPES.FLOAT]: {
    [TYPES.INT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.INT,
      [OPERATORS.BOOLEAN_AND]: TYPES.INT,
      [OPERATORS.EQUALS]: TYPES.INT,
      [OPERATORS.NOT_EQUALS]: TYPES.INT,
      [OPERATORS.GT]: TYPES.INT,
      [OPERATORS.GTE]: TYPES.INT,
      [OPERATORS.LT]: TYPES.INT,
      [OPERATORS.LTE]: TYPES.INT,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.PLUS]: TYPES.FLOAT,
      [OPERATORS.MINUS]: TYPES.FLOAT,
      [OPERATORS.MULTIPLICATION]: TYPES.FLOAT,
      [OPERATORS.DIVISION]: TYPES.FLOAT,
      [OPERATORS.MODULO]: TYPES.FLOAT,
      [OPERATORS.BOOLEAN_OR]: TYPES.INT,
      [OPERATORS.BOOLEAN_AND]: TYPES.INT,
      [OPERATORS.EQUALS]: TYPES.INT,
      [OPERATORS.NOT_EQUALS]: TYPES.INT,
      [OPERATORS.GT]: TYPES.INT,
      [OPERATORS.GTE]: TYPES.INT,
      [OPERATORS.LT]: TYPES.INT,
      [OPERATORS.LTE]: TYPES.INT,
      [OPERATORS.ASSIGN]: TYPES.FLOAT,
    },
    [TYPES.STRING]: {
      [OPERATORS.PLUS]: TYPES.STRING,
    },
    [OPERATORS.BITWISE_NOT]: TYPES.FLOAT,
    [OPERATORS.BOOLEAN_NOT]: TYPES.INT,
  },
  [TYPES.STRING]: {
    [TYPES.STRING]: {
      [OPERATORS.PLUS]: TYPES.STRING,
      [OPERATORS.EQUALS]: TYPES.INT,
      [OPERATORS.NOT_EQUALS]: TYPES.INT,
      [OPERATORS.ASSIGN]: TYPES.STRING,
    },
    [TYPES.INT]: {
      [OPERATORS.PLUS]: TYPES.STRING,
    },
    [TYPES.FLOAT]: {
      [OPERATORS.PLUS]: TYPES.STRING,
    },
  },
  getType: function (typeA, typeB, operator) {
    try {
      if (this[typeA][operator]) return this[typeA][operator];
      if (this[typeA][typeB][operator]) return this[typeA][typeB][operator];
    } catch {
      throw new Error(
        `Invalid operands {${typeA}, ${typeB}} to operator "${operator}"`
      );
    }
  },
});

const MEMORY_TYPES = Object.freeze({
  GLOBAL: 'GLOBAL',
  LOCAL: 'LOCAL',
  TEMP: 'TEMP',
  STACK: 'STACK',
});

const MEMORY_FLAGS = Object.freeze({
  ADDRESS_REFERENCE: 1 << 26,
});

const NATIVE_FUNCTIONS = Object.freeze({
  write: new WriteFunction(),
  read: new ReadFunction(),
  str_to_int: new StrToIntFunction(),
  str_to_float: new StrToFloatFunction(),
  clear_console: new ClearConsoleFunction(),
  cursor_home: new CursorHomeFunction(),
  putchar: new PutCharFunction(),
  str_len: new StrLengthFunction(),
  cos: new CosFunction(),
  sin: new SinFunction(),
  pow: new PowFunction(),
  sqrt: new SqrtFunction(),
  f2i: new F2iFunction(),
});

module.exports = {
  TYPES,
  OPCODES,
  OPERATORS,
  OPERANDS,
  TTO_CUBE,
  OPERATOR_FUNCTIONS,
  MEMORY_TYPES,
  MEMORY_FLAGS,
  NATIVE_FUNCTIONS,
};
