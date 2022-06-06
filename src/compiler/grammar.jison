%lex
%{
    if (!yy.isReady) {
        yy.isReady = true;

        const { ir, constants } = yy.data;
        yy.ir = ir;
        yy.constants = constants;
    }
%}
%%

/*
    STRINGS
    Strings must be evaluated before comments to avoid double slashes
    in strings being detected as comments.
*/
\".*?\"                { return "CONST_STRING"; }

/* COMMENTS */
[/]{2}(.|\n|\r)+?[/]{2} {}

/* Lexical grammar */

/* BITWISE_OP */
/* It needs to be processed before comparisons */
/* L4 */
"<<"                   { return "BITWISE_LEFT_SHIFT"; }
">>"                   { return "BITWISE_RIGHT_SHIFT"; }


/* RELATIONAL_OP */
/* L1 */
"=="                   { return "EQUALS"; }
"!="                   { return "NOT_EQUALS"; }

/* L2 */
"<="                   { return "LTE"; }
">="                   { return "GTE"; }
"<"                    { return "LT"; }
">"                    { return "GT"; }

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
/* L4 Above */
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
"native"               { return "NATIVE"; }
"import"               { return "IMPORT"; }
"this"                 { return "THIS"; }
"new"                  { return "NEW"; }
("int"|"bool")         { return "INT"; }
"float"                { return "FLOAT"; }
"string"               { return "STRING"; }
("true"|"false")       { return "CONST_BOOLEAN"; }

/* EXPRESSIONS */
[0-9]+\.[0-9]+         { return "CONST_FLOAT"; }
[0-9]+                 { return "CONST_INT"; }
[A-Za-z_][A-Za-z0-9_]* { return "ID"; }
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
        yy.ir.currentType = yy.constants.TYPES.INT;
    } |
    FLOAT {
        yy.ir.currentType = yy.constants.TYPES.FLOAT;
    } |
    STRING {
        yy.ir.currentType = yy.constants.TYPES.STRING;
    } |
    BOOL {
        yy.ir.currentType = yy.constants.TYPES.INT;
    };

type_c:
    ID {
        yy.ir.currentType = yy.constants.TYPES.OBJECT;
        yy.ir.currentObjectType = $1;
    };

/* CONST */
const_type:
    CONST_INT {
        yy.ir.processConstantOperand({ data: parseInt($1, 10), type: yy.constants.TYPES.INT });
    } |
    CONST_FLOAT {
        yy.ir.processConstantOperand({ data: parseFloat($1, 10), type: yy.constants.TYPES.FLOAT });
    } |
    CONST_STRING {
        yy.ir.processConstantOperand({ data: $1.substring(1, $1.length - 1), type: yy.constants.TYPES.STRING });
    } |
    CONST_BOOLEAN {
        const data = $1 === "true" ? 1 : 0;
        yy.ir.processConstantOperand({ data, type: yy.constants.TYPES.INT });
    };

/* DECORATORS */
@push_jump: {
    yy.ir.jumpsManager.pushJump(yy.ir.quadruplesManager.getQuadruplesSize());
};

@link_jump_down: {
    yy.ir.linkJump(yy.ir.jumpsManager.popJump(0), yy.ir.quadruplesManager.getQuadruplesSize());
};

@link_jump_down_n1: {
    yy.ir.linkJump(yy.ir.jumpsManager.popJump(1), yy.ir.quadruplesManager.getQuadruplesSize());
};

@link_jump_down_n2: {
    yy.ir.linkJump(yy.ir.jumpsManager.popJump(2), yy.ir.quadruplesManager.getQuadruplesSize());
};

@link_jump_down_n3: {
    yy.ir.linkJump(yy.ir.jumpsManager.popJump(3), yy.ir.quadruplesManager.getQuadruplesSize());
};

@push_delimiter: {
    yy.ir.jumpsManager.pushDelimiter();
};

@pop_all_jumps: {
    yy.ir.popDelimitedJumps();
};

@push_scope: {
    yy.ir.scopeManager.push();
};

@pop_scope: {
    yy.ir.scopeManager.pop();
};

@goto_f: {
    yy.ir.quadruplesManager.pushGoToF(yy.ir.operands.pop());
};

@goto: {
    yy.ir.quadruplesManager.pushGoTo();
};

@link_jump_up: {
    yy.ir.linkJump(yy.ir.quadruplesManager.getQuadruplesSize() - 1, yy.ir.jumpsManager.popJump(0));
};

@link_jump_up_n1: {
    yy.ir.linkJump(yy.ir.quadruplesManager.getQuadruplesSize() - 1, yy.ir.jumpsManager.popJump(1));
};

@link_jump_up_n2: {
    yy.ir.linkJump(yy.ir.quadruplesManager.getQuadruplesSize() - 1, yy.ir.jumpsManager.popJump(2));
};

@link_jump_up_n3: {
    yy.ir.linkJump(yy.ir.quadruplesManager.getQuadruplesSize() - 1, yy.ir.jumpsManager.popJump(3));
};

@close_function: {
    yy.ir.closeFunction();
};

@process_constructor: {
    yy.ir.processFunction("construct", 'VOID');
};

program:
    program_imports program_1 program_init @push_scope block @pop_scope {
        yy.ir.insertExit();
        console.log(`-- Successfully compiled ${$3} with ${this._$.last_line} lines --`);
    } |
    native_functions;

program_imports: /* empty */
    |
    IMPORT OPEN_PARENTHESIS imports CLOSE_PARENTHESIS;

imports:
    CONST_STRING {
        yy.data.createSubParser(yy.data.currDirectory, $1.substring(1, $1.length - 1), yy.ir);
    } |
    CONST_STRING COMMA imports {
        yy.data.createSubParser(yy.data.currDirectory, $1.substring(1, $1.length - 1), yy.ir);
    };

program_init:
    PROGRAM ID {
        yy.ir.quadruplesManager.pushInit();
        yy.ir.processFunction($2, 'VOID');
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
        yy.ir.processArgument($2, yy.ir.currentType, []);
    };

params_2: /* empty */
    |
    COMMA type_s ID params_2 {
        yy.ir.processArgument($3, yy.ir.currentType, []);
    };

function:
    FUNC function_1 @push_scope params block @close_function @pop_scope;

function_1:
    function_2 ID {
        yy.ir.processFunction($2, $1);
    };

function_2:
    type_s |
    VOID;

native_functions:
    native_function |
    native_function native_functions;

native_function:
    NATIVE native_function_1 @push_scope params @close_function @pop_scope SEMICOLON;

native_function_1:
    native_function_2 ID {
        yy.ir.processNativeFunction($2, $1);
    };

native_function_2:
    type_s |
    VOID;

variable_declare:
    ID {
        yy.ir.processVariable($1, yy.ir.currentType, []);
    } |
    ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET {
        yy.ir.processVariable($1, yy.ir.currentType, [$3]);
    } |
    ID OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET CONST_INT CLOSE_SQUARE_BRACKET {
        yy.ir.processVariable($1, yy.ir.currentType, [$3, $6]);
    };

variable:
    /* EMPTY */ {
        yy.ir.processVariableOperand([]);
    } |
    OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.ir.processVariableOperand([$3]);
    } |
    OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.ir.processVariableOperand([$3, $6]);
    };

vars:
    VAR type_s variable_declare vars_1 SEMICOLON |
    VAR type_c ID vars_2 SEMICOLON {
        yy.ir.processClassVariable($3);
    };

vars_1: /* empty */
    |
    COMMA variable_declare vars_1;

vars_2: /* empty */
    |
    COMMA ID vars_2;

class:
    CLASS class_name class_1 class_block @pop_scope;

class_name: 
    ID  {
        yy.ir.processClass($1);
    };

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
    CONSTRUCT @process_constructor @push_scope params block @close_function @pop_scope;

destruct:
    DESTRUCT OPEN_PARENTHESIS CLOSE_PARENTHESIS block;

assign:
    alias_l1 variable assignment_op_l1 expression {
        yy.ir.processAssignment($2);
    };

condition:
    IF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_delimiter @push_jump @goto_f @push_scope block @pop_scope @push_jump @goto @link_jump_down_n1 condition_1 @pop_all_jumps;

condition_1: /* empty */
    |
    ELIF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_jump @goto_f @push_scope block @pop_scope @push_jump @goto @link_jump_down_n1 condition_1 |
    ELSE @push_scope block @pop_scope;

for_loop:
    FOR OPEN_PARENTHESIS @push_scope for_loop_1 @push_jump for_loop_2 @push_jump @goto_f @push_jump @goto @push_jump for_loop_3 CLOSE_PARENTHESIS @goto @link_jump_up_n3 @link_jump_down_n1 block @goto @link_jump_up @link_jump_down @pop_scope;

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
    WHILE @push_jump OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_jump @goto_f @push_scope block @pop_scope @goto @link_jump_down @link_jump_up;

function_call:
    OPEN_PARENTHESIS CLOSE_PARENTHESIS {
        yy.ir.processFunctionCallOperand();
    } |
    OPEN_PARENTHESIS expression function_call_2 CLOSE_PARENTHESIS {
        yy.ir.processFunctionCallOperand();
    };


alias_l1: 
    ID {
        yy.ir.processId($1);
    } |
    alias_l2 ID {
        yy.ir.processId($2);
    };

alias_l2: 
    alias_l2 ID DOT {
        yy.ir.processContext($2);
    } |
    ID DOT {
        yy.ir.processContext($1);
    } |
    alias_l3;

alias_l3:
    THIS DOT {
        yy.ir.processThisContext();
    };

function_call_2: /* empty */
    |
    COMMA expression function_call_2;

object_creation:
    NEW alias_l1 OPEN_PARENTHESIS CLOSE_PARENTHESIS {
        yy.ir.processObjectCreationOperand();
    } |
    NEW alias_l1 OPEN_PARENTHESIS expression object_creation_param CLOSE_PARENTHESIS {
        yy.ir.processObjectCreationOperand();
    };

object_creation_param: /* empty */
    |
    COMMA expression object_creation_param;

statement:
    vars |
    assign SEMICOLON |
    condition |
    while_loop |
    for_loop |
    alias_l1 function_call SEMICOLON |
    RETURN expression SEMICOLON {
        yy.ir.insertReturn();
    } |
    RETURN SEMICOLON {
        yy.ir.insertReturn();
    };

expression:
    expression_l1 |
    expression boolean_op_l1 expression_l1 {
        yy.ir.processOperator($2);
    };

expression_l1:
    expression_l2 |
    expression_l1 boolean_op_l2 expression_l2 {
        yy.ir.processOperator($2);
    };

expression_l2:
    expression_l3 |
    expression_l2 bitwise_op_l1 expression_l3 {
        yy.ir.processOperator($2);
    };

expression_l3:
    expression_l4 |
    expression_l3 bitwise_op_l2 expression_l4 {
        yy.ir.processOperator($2);
    };

expression_l4:
    expression_l5 |
    expression_l4 bitwise_op_l3 expression_l5 {
        yy.ir.processOperator($2);
    };

expression_l5:
    expression_l6 |
    expression_l5 relational_op_l1 expression_l6 {
        yy.ir.processOperator($2);
    };

expression_l6:
    expression_l7 |
    expression_l6 relational_op_l2 expression_l7 {
        yy.ir.processOperator($2);
    };

expression_l7:
    expression_l8 |
    expression_l7 bitwise_op_l4 expression_l8 {
        yy.ir.processOperator($2);
    };

expression_l8:
    expression_l9 |
    expression_l8 arithmetic_op_l1 expression_l9 {
        yy.ir.processOperator($2);
    };

expression_l9:
    expression_l10 |
    expression_l9 arithmetic_op_l2 expression_l10 {
        yy.ir.processOperator($2);
    };

expression_l10:
    expression_l11 |
    boolean_op_l3 expression_l11 {
        yy.ir.processOperator($1);
    } |
    bitwise_op_l5 expression_l11 {
        yy.ir.processOperator($1);
    };

expression_l11:
    OPEN_PARENTHESIS expression CLOSE_PARENTHESIS |
    object_creation |
    const_type |
    alias_l1 function_call |
    alias_l1 variable;