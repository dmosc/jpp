%options ranges

%lex
%{
    const { join } = require("path");
    if (!yy.isReady) {
        yy.isReady = true;
        const Quadruples = require(join(__basedir, 'quadruples.js'));
        const constants = require(join(__basedir, 'constants.js'));

        yy.quadruples = new Quadruples();
        yy.constants = constants;
    }
%}
%%

/*
    STRINGS
    Strings must be evaluated before comments to avoid double slashes
    in strings being detected as comments.
*/
\".*?\"                 { return "CONST_STRING"; }

/* COMMENTS */
[/]{2}(.|\n|\r)+?[/]{2} {}

/* Lexical grammar */
/* BOOLEAN_OP */
/* L1 */
"||"                   { return "BOOLEAN_OR"; }
/* L2 */
"&&"                   { return "BOOLEAN_AND"; }
/* L3 */
"!"                    { return "BOOLEAN_NOT"; }

/* BITWISE_OP */
/* L1 */
"|"                    { return "BITWISE_OR"; }
/* L2 */
"^"                    { return "BITWISE_XOR"; }
/* L3 */
"&"                    { return "BITWISE_AND"; }
/* L4 */
"<<"                   { return "BITWISE_LEFT_SHIFT"; }
">>"                   { return "BITWISE_RIGHT_SHIFT"; }
/* L5 */
"~"                    { return "BITWISE_NOT"; }

/* ARITHMETIC_OP */
/* L1 */
"+"                    { return "PLUS"; }
"-"                    { return "MINUS"; }
/* L2 */
"*"                    { return "MULTIPLICATION"; }
"/"                    { return "DIVISION"; }
"%"                    { return "MODULO"; }

/* RELATIONAL_OP */
/* L1 */
"=="                   { return "EQUALS"; }
"!="                   { return "NOT_EQUALS"; }
/* L2 */
"<"                    { return "LT"; }
"<="                   { return "LTE"; }
">"                    { return "GT"; }
">="                   { return "GTE"; }

/* ASSIGNMENT_OP */
/* L1 */
"="                    { return "ASSIGN"; }

/* CONTEXT TOKENS */
"("                    { return "OPEN_PARENTHESIS"; }
")"                    { return "CLOSE_PARENTHESIS"; }
"{"                    { return "OPEN_CURLY_BRACKET"; }
"}"                    { return "CLOSE_CURLY_BRACKET"; }
"["                    { return "OPEN_SQUARE_BRACKET"; }
"]"                    { return "CLOSE_SQUARE_BRACKET"; }
","                    { return "COMMA"; }
";"                    { return "SEMICOLON"; }
":"                    { return "COLON"; }
"."                    { return "DOT"; }

/* RESERVED KEYWORDS */
"if"                   { return "IF"; }
"elif"                 { return "ELIF"; }
"else"                 { return "ELSE"; }
"return"               { return "RETURN"; }
"for"                  { return "FOR"; }
"while"                { return "WHILE"; }
"class"                { return "CLASS"; }
"extends"              { return "EXTENDS"; }
"construct"            { return "CONSTRUCT"; }
"destruct"             { return "DESTRUCT"; }
"void"                 { return "VOID"; }
"program"              { return "PROGRAM"; }
"func"                 { return "FUNC"; }
"var"                  { return "VAR"; }
"read"                 { return "READ"; }
"write"                { return "WRITE"; }

/* TYPES */
"int"                  { return "INT"; }
"float"                { return "FLOAT"; }
"string"               { return "STRING"; }
"bool"                 { return "BOOL"; }
[A-Za-z_][A-Za-z0-9_]* { return "ID"; }

/* CONST */
[0-9]+\.[0-9]+         { return "CONST_FLOAT"; }
[0-9]+                 { return "CONST_INT"; }
(true|false)           { return "CONST_BOOLEAN"; }

/* WHITESPACES */
[\s\t\n\r]+            {}

/* UNDEFINED SYMBOLS */
.                      { throw new Error("Unsupported symbols"); }

/lex

/* Grammar instructions */
%start program

%%
/* Language grammar */
/* ARITHMETIC_OP */
arithmetic_op_l1:
    PLUS |
    MINUS;

arithmetic_op_l2:
    MULTIPLICATION |
    DIVISION |
    MODULO;

/* RELATIONAL_OP */
relational_op_l1:
    EQUALS |
    NOT_EQUALS;

relational_op_l2:
    LT |
    LTE |
    GT |
    GTE;

/* BITWISE_OP */
bitwise_op_l1:
    BITWISE_OR;

bitwise_op_l2:
    BITWISE_XOR;

bitwise_op_l3:
    BITWISE_AND;

bitwise_op_l4:
    BITWISE_LEFT_SHIFT |
    BITWISE_RIGHT_SHIFT;

bitwise_op_l5:
    BITWISE_NOT;

/* BOOLEAN_OP */
boolean_op_l1:
    BOOLEAN_OR;

boolean_op_l2:
    BOOLEAN_AND;

boolean_op_l3:
    BOOLEAN_NOT;

/* ASSIGNMENT_OP */
assignment_op_l1:
    ASSIGN;

/* TYPE */
type_s:
    INT |
    FLOAT |
    STRING |
    BOOL;

type_c:
    ID;

/* CONST */
const_type:
    CONST_INT {
        yy.quadruples.processOperand({ data: $1, type: yy.constants.TYPES.INT, location: @1 });
    } |
    CONST_FLOAT {
        yy.quadruples.processOperand({ data: $1, type: yy.constants.TYPES.FLOAT, location: @1 });
    } |
    CONST_STRING |
    CONST_BOOLEAN;

program:
    program_1 PROGRAM ID block {
        console.log(`-- Successfully compiled ${$3} with ${this._$.last_line} lines --`);

        const quads = yy.quadruples.quads.toArray().map(([op, leftOperand, rightOperand, resOperand]) => {
            const { first_line, first_column, last_line, last_column } = resOperand.location;
            const loc = `${first_line}.${first_column + 1}-${last_line}.${last_column + 1}`;
            return {
                operator: op,
                leftOperand: leftOperand.id || leftOperand.data,
                rightOperand: rightOperand.id || rightOperand.data,
                resOperand: resOperand.id || resOperand.data,
                loc,
            }
        });

        console.table(quads);
    };

program_1: /* empty */
    |
    function program_1 |
    vars program_1 |
    class program_1;

block:
    OPEN_CURLY_BRACKET block_1 CLOSE_CURLY_BRACKET;

block_1: /* empty */
    |
    statement block_1;

params:
    OPEN_PARENTHESIS params_1 CLOSE_PARENTHESIS;

params_1: /* empty */
    |
    type_s ID params_2;

params_2: /* empty */
    |
    COMMA type_s ID params_2;

function:
    FUNC function_1 ID params block;

function_1:
    type_s |
    VOID;

variable_declare:
    ID |
        ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET |
        ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET;

variable:
    ID |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET;

vars:
    VAR type_s variable_declare vars_1 SEMICOLON |
    VAR type_c ID vars_2 SEMICOLON;

vars_1: /* empty */
    |
    COMMA variable_declare vars_1;

vars_2: /* empty */
    |
    COMMA ID vars_2;

class:
    CLASS ID class_1 class_block;

class_1: /* empty */
    |
    EXTENDS ID;

class_block:
    OPEN_CURLY_BRACKET class_block_1 CLOSE_CURLY_BRACKET;

class_block_1: /* empty */
    |
    vars class_block_1 |
    function class_block_1 |
    construct class_block_1 |
    destruct class_block_1;

construct:
    CONSTRUCT params block;

destruct:
    DESTRUCT OPEN_PARENTHESIS CLOSE_PARENTHESIS block;

assign:
    variable assignment_op_l1 expression;

read:
    READ OPEN_PARENTHESIS variable read_1 CLOSE_PARENTHESIS SEMICOLON;

read_1: /* empty */
    |
    COMMA variable read_1;

write:
    WRITE OPEN_PARENTHESIS expression write_1 CLOSE_PARENTHESIS SEMICOLON;

write_1: /* empty */
    |
    COMMA variable write_1;

condition:
    IF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS block condition_1;

condition_1: /* empty */
    |
    ELIF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS block condition_1 |
    ELSE block;

for_loop:
    FOR OPEN_PARENTHESIS for_loop_1 for_loop_2 for_loop_3 CLOSE_PARENTHESIS block;

for_loop_1:
    SEMICOLON |
    assign SEMICOLON;

for_loop_2:
    SEMICOLON |
    expression SEMICOLON;

for_loop_3:
    /* EMPTY */ |
    assign;


while_loop:
    WHILE OPEN_PARENTHESIS expression CLOSE_PARENTHESIS block;

function_call:
    ID function_call_1 OPEN_PARENTHESIS CLOSE_PARENTHESIS |
    ID function_call_1 OPEN_PARENTHESIS expression function_call_2 CLOSE_PARENTHESIS;

function_call_1: /* empty */
    |
    DOT ID;

function_call_2: /* empty */
    |
    COMMA expression function_call_2;

statement:
    vars |
    assign SEMICOLON |
    read |
    write |
    condition |
    while_loop |
    for_loop |
    function_call SEMICOLON |
    RETURN expression SEMICOLON;

expression:
    expression_l1 |
    expression_l1 boolean_op_l1 expression {
        yy.quadruples.processOperator($2, @2);
    };

expression_l1:
    expression_l2 |
    expression_l2 boolean_op_l2 expression_l1 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l2:
    expression_l3 |
    expression_l3 bitwise_op_l1 expression_l2 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l3:
    expression_l4 |
    expression_l4 bitwise_op_l2 expression_l3 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l4:
    expression_l5 |
    expression_l5 bitwise_op_l3 expression_l4 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l5:
    expression_l6 |
    expression_l6 relational_op_l1 expression_l5 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l6:
    expression_l7 |
    expression_l7 relational_op_l2 expression_l6 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l7:
    expression_l8 |
    expression_l8 bitwise_op_l4 expression_l7 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l8:
    expression_l9 |
    expression_l9 arithmetic_op_l1 expression_l8 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l9:
    expression_l10 |
    expression_l10 arithmetic_op_l2 expression_l9 {
        yy.quadruples.processOperator($2, @2);
    };

expression_l10:
    expression_l11 |
    boolean_op_l3 expression_l11 {
        yy.quadruples.processOperator($1, @1);
    } |
    bitwise_op_l5 expression_l11 {
        yy.quadruples.processOperator($1, @1);
    };

expression_l11:
    OPEN_PARENTHESIS expression CLOSE_PARENTHESIS |
    function_call |
    const_type |
    variable;