%lex
%{
    const { join } = require("path");
    if (!yy.isReady) {
        yy.isReady = true;
        const IntermediateRepresentation = require(join(__basedir, 'intermediate-representation.js'));
        const ScopeManager = require(join(__basedir, 'scope-manager.js'));
        const MemoryManager = require(join(__basedir, 'memory-manager.js'));
        const QuadruplesManager = require(join(__basedir, 'quadruples-manager.js'));
        const JumpsManager = require(join(__basedir, 'jumps-manager.js'));
        const constants = require(join(__basedir, 'constants.js'));

        const memoryManager = new MemoryManager();
        const scopeManager = new ScopeManager(memoryManager);
        const quadruplesManager = new QuadruplesManager();
        const jumpsManager = new JumpsManager();
        yy.ir = new IntermediateRepresentation(scopeManager, quadruplesManager, jumpsManager);
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
"read"                 { return "READ"; }
"write"                { return "WRITE"; }

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
    ID;

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
    yy.ir.jumpsManager.popAllJumps();
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


program:
    program_1 program_init @push_scope block @pop_scope {
        console.log(`-- Successfully compiled ${$3} with ${this._$.last_line} lines --`);
        console.table(yy.ir.prettyQuads());
        //yy.ir.quadruplesManager.optimizeIR();
        //console.log('Optimized code');
        //console.table(yy.ir.quads);
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
    ID {
        yy.ir.processVariableOperand($1, []);
    } |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.ir.processVariableOperand($1, [$3]);
    } |
    ID OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET OPEN_SQUARE_BRACKET expression CLOSE_SQUARE_BRACKET {
        yy.ir.processVariableOperand($1, [$3, $6]);
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
        yy.ir.processAssignment($2);
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
    IF OPEN_PARENTHESIS expression CLOSE_PARENTHESIS @push_delimiter @push_jump @goto_f @push_scope block @pop_scope @push_jump @goto @link_jump_down_n1 condition_1 @link_jump_down;

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
    ID function_call_1 OPEN_PARENTHESIS CLOSE_PARENTHESIS {
        yy.ir.processFunctionCallOperand($1);
    } |
    ID function_call_1 OPEN_PARENTHESIS expression function_call_2 CLOSE_PARENTHESIS {
        yy.ir.processFunctionCallOperand($1);
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
    function_call |
    const_type |
    variable;