%lex
%%

/* Lexical grammar */
/* ARITHMETIC_OP */
/* L1 */
"+"             { return "PLUS"; }
"-"             { return "MINUS"; }
/* L2 */
"*"             { return "MULTIPLICATION"; }
"/"             { return "DIVISION"; }
"%"             { return "MODULO"; }

/* RELATIONAL_OP */
/* L1 */
"=="            { return "EQUALS"; }
"!="            { return "NOT_EQUALS"; }
/* L2 */
"<"             { return "LT"; }
"<="            { return "LTE"; }
">"             { return "GT"; }
">="            { return "GTE"; }

/* BOOLEAN_OP */
/* L1 */
"||"            { return "BOOLEAN_OR"; }
/* L2 */
"&&"            { return "BOOLEAN_AND"; }
/* L3 */
"!"             { return "BOOLEAN_NOT"; }

/* BITWISE_OP */
/* L1 */
"|"             { return "BITWISE_OR"; }
/* L2 */
"^"             { return "BITWISE_XOR"; }
/* L3 */
"&"             { return "BITWISE_AND"; }
/* L4 */
"<<"            { return "BITWISE_LEFT_SHIFT"; }
">>"            { return "BITWISE_RIGHT_SHIFT"; }
/* L5 */
"~"             { return "BITWISE_NOT"; }

/* ASSIGNMENT_OP */
/* L1 */
"="             { return "ASSIGN"; }

/* CONTEXT TOKENS */
"("             { return "OPEN_PARENTHESIS"; }
")"             { return "CLOSE_PARENTHESIS"; }
"{"             { return "OPEN_CURLY_BRACKET"; }
"}"             { return "CLOSE_CURLY_BRACKET"; }
"["             { return "OPEN_SQUARE_BRACKET"; }
"]"             { return "CLOSE_SQUARE_BRACKET"; }
","             { return "COMMA"; }
";"             { return "SEMICOLON"; }
":"             { return "COLON"; }
"."             { return "DOT"; }

/* RESERVED KEYWORDS */
"if"            { return "IF"; }
"else"          { return "ELSE"; }
"const"         { return "CONST"; }
"return"        { return "RETURN"; }
"for"           { return "FOR"; }
"while"         { return "WHILE"; }
"class"         { return "CLASS"; }
"extends"       { return "EXTENDS"; }
"construct"     { return "CONSTRUCTOR"; }
"destruct"      { return "DESTRUCTOR"; }
"void"          { return "VOID"; }

/* TYPES */
"int"           { return "INT"; }
"float"         { return "FLOAT"; }
"string"        { return "STRING"; }
"bool"          { return "BOOL"; }
[A-z_][A-z0-9_]* { return "ID"; }

/* CONST */
[0-9]+\.[0-9]+  { return "CONST_FLOAT"; }
[0-9]+          { return "CONST_INT"; }
(true|false)    { return "CONST_BOOLEAN"; }
\".*\"          { return "CONST_STRING"; }

[\s\t\n\r]      {}
.               { throw new Error("Unsupported symbols"); }

/lex

/* Grammar instructions */
%start file

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
type:
    INT |
    FLOAT |
    STRING |
    BOOL |
    ID;

/* CONST */
const_type:
    CONST_INT |
    CONST_FLOAT |
    CONST_STRING |
    CONST_BOOLEAN;

file: /* empty */
    |
    vars file |
    class file |
    block file;

vars:
    type vars_1 SEMICOLON |
    CONST type vars_1 SEMICOLON;

vars_1:
    ID array_declare ASSIGN array_assign vars_2 |
    ID array_declare vars_2 |
    ID ASSIGN expression vars_2 |
    ID vars_2;

vars_2: /* empty */
    |
    COMMA vars_1;

array_declare:
    OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET array_declare_1;

array_declare_1: /* empty */
    |
    array_declare;

array_assign:
    OPEN_SQUARE_BRACKET array_assign_1 CLOSE_SQUARE_BRACKET;

// handle [1, 2, 3, 4] and [[1, 2, 3, 4]] and [[1, 2], [1, 2]]
array_assign_1:
    array_assign_2 |
    array_assign |
    array_assign COMMA array_assign;

// handle 1, 2, 3, 4, 5, etc
array_assign_2: /* empty */
    expression |
    expression COMMA array_assign_2;

class:
    CLASS ID EXTENDS ID OPEN_CURLY_BRACKET class_2 CLOSE_CURLY_BRACKET |
    CLASS ID OPEN_CURLY_BRACKET class_2 CLOSE_CURLY_BRACKET;

class_2:
    vars class_3 |
    function class_3 |
    construct class_3 |
    destruct class_3;

class_3: /* empty */
    |
    class_2;

construct:
    CONSTRUCTOR function_params block;

destruct:
    DESTRUCTOR block;

block:
    OPEN_CURLY_BRACKET block_1 CLOSE_CURLY_BRACKET;

block_1: /* empty */
    |
    statement |
    while_loop |
    for_loop;

statement:
    statement_1 SEMICOLON;

statement_1:
    vars |
    function |
    expression |
    RETURN expression;

while_loop:
    WHILE OPEN_PARENTHESIS expression CLOSE_PARENTHESIS block;

for_loop:
    FOR OPEN_PARENTHESIS vars SEMICOLON expression SEMICOLON expression CLOSE_PARENTHESIS block;

function:
    type ID function_params block |
    VOID ID function_params block;

function_params:
    OPEN_PARENTHESIS CLOSE_PARENTHESIS |
    OPEN_PARENTHESIS function_params_1 CLOSE_PARENTHESIS;

function_params_1:
    CONST type ID function_params_2 |
    type ID function_params_2;

function_params_2: /* empty */
    |
    COMMA function_params_1;

function_call:
    ID DOT function_call |
    ID OPEN_PARENTHESIS function_call_1 CLOSE_PARENTHESIS;

function_call_1: /* empty */
    |
    expression function_call_2;

function_call_2: /* empty */
    |
    COMMA function_call_1;

expression:
    expression_1 expression_l1;

expression_1: /* empty */
    |
    assignment_op_l1 expression;

expression_l1:
    expression_l2 |
    expression_l2 boolean_op_l1 expression_l2;

expression_l2:
    expression_l3 |
    expression_l3 boolean_op_l2 expression_l3;

expression_l3:
    expression_l4 |
    expression_l4 bitwise_op_l1 expression_l4;

expression_l4:
    expression_l5 |
    expression_l5 bitwise_op_l2 expression_l5;

expression_l5:
    expression_l6 |
    expression_l6 bitwise_op_l3 expression_l6;

expression_l6:
    expression_l7 |
    expression_l7 relational_op_l1 expression_l7;

expression_l7:
    expression_l8 |
    expression_l8 relational_op_l2 expression_l8;

expression_l8:
    expression_l9 |
    expression_l9 bitwise_op_l4 expression_l9;

expression_l9:
    expression_l10 |
    expression_l10 arithmetic_op_l1 expression_l10;

expression_l10:
    expression_l11 |
    expression_l11 arithmetic_op_l2 expression_l11;

expression_l11:
    expression_l11_1 expression_l12;

expression_l11_1: /* empty */
    |
    boolean_op_l3 expression_l11_1 |
    bitwise_op_l5 expression_l11_1;

expression_l12:
    OPEN_PARENTHESIS expression CLOSE_PARENTHESIS |
    function_call |
    const_type |
    ID;