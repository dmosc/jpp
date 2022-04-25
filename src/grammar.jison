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
/* RELATIONAL_OP */
/* L1 */
"=="                   { return "EQUALS"; }
"!="                   { return "NOT_EQUALS"; }
/* L2 */
"<"                    { return "LT"; }
"<="                   { return "LTE"; }
">"                    { return "GT"; }
">="                   { return "GTE"; }

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
    INT {
        yy.quadruples.currentType = yy.constants.TYPES.INT;
    } |
    FLOAT {
        yy.quadruples.currentType = yy.constants.TYPES.FLOAT;
    } |
    STRING {
        yy.quadruples.currentType = yy.constants.TYPES.STRING;
    } |
    BOOL {
        yy.quadruples.currentType = yy.constants.TYPES.BOOL;
    };

type_c:
    ID;

/* CONST */
const_type:
    CONST_INT {
        yy.quadruples.processConstantOperand({ data: $1, type: yy.constants.TYPES.INT });
    } |
    CONST_FLOAT {
        yy.quadruples.processConstantOperand({ data: $1, type: yy.constants.TYPES.FLOAT });
    } |
    CONST_STRING |
    CONST_BOOLEAN;

/* DECORATORS */
@push_jump: {
    yy.quadruples.pushJump();
};

@pop_jump: {
    yy.quadruples.popJumpN(0);
};

@pop_jump_n1: {
    yy.quadruples.popJumpN(1);
};

@pop_all_jumps: {
    yy.quadruples.popAllJumps();
};

@push_scope: {
    yy.quadruples.pushScope();
};

@pop_scope: {
    yy.quadruples.popScope();
};

@goto_f: {
    yy.quadruples.insertGoToF();
};

@goto: {
    yy.quadruples.insertGoTo();
};

@pop_loop_jump: {
    yy.quadruples.popLoopJump();
};

program:
    program_1 program_init @push_scope block @pop_scope {
        console.log(`-- Successfully compiled ${$3} with ${this._$.last_line} lines --`);
        console.log(yy.quadruples.scopes);
        for (const quad of yy.quadruples.quads) {
            console.log(quad);
        }
    };

program_init:
    PROGRAM ID {
        yy.quadruples.insertProgramInit();
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
    type_s ID params_2 {
        yy.quadruples.processVariable($2, yy.quadruples.currentType, []);
    };

params_2: /* empty */
    |
    COMMA type_s ID params_2 {
        yy.quadruples.processVariable($3, yy.quadruples.currentType, []);
    };

function:
    FUNC function_1 @push_scope params block @pop_scope;

function_1:
    function_2 ID {
        yy.quadruples.processFunction($2, $1);
    };

function_2:
    type_s |
    VOID;

variable_declare:
    ID {
        yy.quadruples.processVariable($1, yy.quadruples.currentType, []);
    } |
    ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET {
        yy.quadruples.processVariable($1, yy.quadruples.currentType, [$3]);
    } |
    ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET {
        yy.quadruples.processVariable($1, yy.quadruples.currentType, [$3, $6]);
    };

variable:
    ID {
        yy.quadruples.processVariableOperand($1, []);
    } |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.quadruples.processVariableOperand($1, [$3]);
    } |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.quadruples.processVariableOperand($1, [$3, $6]);
    };

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
    variable assignment_op_l1 expression {
        yy.quadruples.processOperator($2);
    };

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
    IF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_jump @goto_f @push_scope block @pop_scope @push_jump @goto @pop_jump_n1 condition_1 @pop_all_jumps;

condition_1: /* empty */
    |
    ELIF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_jump @goto_f @push_scope block @pop_scope @push_jump @goto @pop_jump_n1 condition_1 |
    ELSE @push_scope block @pop_scope;

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
    WHILE @push_jump OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_jump @goto_f @push_scope block @pop_scope @goto @pop_jump @pop_loop_jump;

function_call:
    ID function_call_1 OPEN_PARENTHESIS CLOSE_PARENTHESIS {
        yy.quadruples.processFunctionCallOperand($1);
    } |
    ID function_call_1 OPEN_PARENTHESIS expression function_call_2 CLOSE_PARENTHESIS {
        yy.quadruples.processFunctionCallOperand($1);
    };

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
    RETURN expression SEMICOLON {
        yy.quadruples.insertReturn();
    };

expression:
    expression_l1 |
    expression boolean_op_l1 expression_l1 {
        yy.quadruples.processOperator($2);
    };

expression_l1:
    expression_l2 |
    expression_l1 boolean_op_l2 expression_l2 {
        yy.quadruples.processOperator($2);
    };

expression_l2:
    expression_l3 |
    expression_l2 bitwise_op_l1 expression_l3 {
        yy.quadruples.processOperator($2);
    };

expression_l3:
    expression_l4 |
    expression_l3 bitwise_op_l2 expression_l4 {
        yy.quadruples.processOperator($2);
    };

expression_l4:
    expression_l5 |
    expression_l4 bitwise_op_l3 expression_l5 {
        yy.quadruples.processOperator($2);
    };

expression_l5:
    expression_l6 |
    expression_l5 relational_op_l1 expression_l6 {
        yy.quadruples.processOperator($2);
    };

expression_l6:
    expression_l7 |
    expression_l6 relational_op_l2 expression_l7 {
        yy.quadruples.processOperator($2);
    };

expression_l7:
    expression_l8 |
    expression_l7 bitwise_op_l4 expression_l8 {
        yy.quadruples.processOperator($2);
    };

expression_l8:
    expression_l9 |
    expression_l8 arithmetic_op_l1 expression_l9 {
        yy.quadruples.processOperator($2);
    };

expression_l9:
    expression_l10 |
    expression_l9 arithmetic_op_l2 expression_l10 {
        yy.quadruples.processOperator($2);
    };

expression_l10:
    expression_l11 |
    boolean_op_l3 expression_l11 {
        yy.quadruples.processOperator($1);
    } |
    bitwise_op_l5 expression_l11 {
        yy.quadruples.processOperator($1);
    };

expression_l11:
    OPEN_PARENTHESIS expression CLOSE_PARENTHESIS |
    function_call |
    const_type |
    variable;