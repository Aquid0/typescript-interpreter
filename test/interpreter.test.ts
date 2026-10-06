import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Scanner } from "../src/Scanner.js";
import { Parser } from "../src/Parser.js";
import { Interpreter } from "../src/Interpreter.js";
import { TokenType } from "../src/TokenType.js";
import { RuntimeError } from "../src/RuntimeError.js";
import { Block, Expression, Print, Var, type Stmt } from "../src/Stmt.js";
import { type Expr } from "../src/Expr.js";

// Helper to parse a single expression (wrapped in an Expression statement if needed)
function parseExpression(source: string): Expr {
    const trimmed = source.trim();
    const src = trimmed.endsWith(";") ? trimmed : `${trimmed};`;
    const scanner = new Scanner(src);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (!statements || statements.length === 0) {
        throw new Error(`Parse failed for source: ${source}`);
    }

    const stmt = statements[0];
    if (stmt instanceof Expression) {
        return stmt.expression;
    }

    throw new Error(`Expected expression statement for source: ${source}`);
}

// Helper to evaluate a Lox expression string directly
function evaluate(source: string): any {
    const expr = parseExpression(source);
    const interpreter = new Interpreter();
    return interpreter.evaluate(expr);
}

// Helper to execute statements through the Interpreter and capture stdout
function execute(source: string): string[] {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();
    const interpreter = new Interpreter();

    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
        output.push(args.map((a) => String(a)).join(" "));
    };

    try {
        interpreter.interpret(statements);
    } finally {
        console.log = originalLog;
    }

    return output;
}

// Helper to execute statements and capture both stdout and stderr (for runtime errors)
function executeWithErrors(source: string): { output: string[]; errors: string[] } {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();
    const interpreter = new Interpreter();

    const output: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => output.push(args.map((a) => String(a)).join(" "));
    console.error = (...args: any[]) => errors.push(args.map((a) => String(a)).join(" "));

    try {
        interpreter.interpret(statements);
    } finally {
        console.log = originalLog;
        console.error = originalError;
    }

    return { output, errors };
}

describe("Chapter 4: Scanning", () => {
    it("scans single-character and two-character tokens", () => {
        const scanner = new Scanner("! != = == < <= > >=");
        const tokens = scanner.scanTokens();
        const types = tokens.map((t) => t.type);

        assert.deepEqual(types, [
            TokenType.BANG,
            TokenType.BANG_EQUAL,
            TokenType.EQUAL,
            TokenType.EQUAL_EQUAL,
            TokenType.LESS,
            TokenType.LESS_EQUAL,
            TokenType.GREATER,
            TokenType.GREATER_EQUAL,
            TokenType.EOF,
        ]);
    });

    it("scans numbers and strings", () => {
        const scanner = new Scanner('123 45.67 "hello world"');
        const tokens = scanner.scanTokens();

        assert.equal(tokens[0]?.type, TokenType.NUMBER);
        assert.equal(tokens[0]?.literal, 123);

        assert.equal(tokens[1]?.type, TokenType.NUMBER);
        assert.equal(tokens[1]?.literal, 45.67);

        assert.equal(tokens[2]?.type, TokenType.STRING);
        assert.equal(tokens[2]?.literal, "hello world");
    });

    it("scans keywords and identifiers", () => {
        const scanner = new Scanner("var foo = nil; if while true false print");
        const tokens = scanner.scanTokens();
        const types = tokens.map((t) => t.type);

        assert.deepEqual(types, [
            TokenType.VAR,
            TokenType.IDENTIFIER,
            TokenType.EQUAL,
            TokenType.NIL,
            TokenType.SEMICOLON,
            TokenType.IF,
            TokenType.WHILE,
            TokenType.TRUE,
            TokenType.FALSE,
            TokenType.PRINT,
            TokenType.EOF,
        ]);
    });

    it("ignores comments and whitespace", () => {
        const scanner = new Scanner("// entire line comment\n   42   // trailing comment");
        const tokens = scanner.scanTokens();

        assert.equal(tokens.length, 2); // 42 and EOF
        assert.equal(tokens[0]?.type, TokenType.NUMBER);
        assert.equal(tokens[0]?.literal, 42);
        assert.equal(tokens[1]?.type, TokenType.EOF);
    });
});

describe("Chapter 5 & 6: Parsing and Operator Precedence", () => {
    it("respects operator precedence: multiplication before addition", () => {
        assert.equal(evaluate("1 + 2 * 3"), 7);
    });

    it("respects left-associativity for subtraction and division", () => {
        assert.equal(evaluate("1 - 2 - 3"), -4);
        assert.equal(evaluate("10 / 2 / 5"), 1);
    });

    it("handles grouped expressions with parentheses", () => {
        assert.equal(evaluate("(1 + 2) * 3"), 9);
    });

    it("handles comparison and equality precedence", () => {
        assert.equal(evaluate("1 + 2 == 3 * 1"), true);
        assert.equal(evaluate("1 < 2 == 3 > 4"), false);
    });

    it("handles unary operators", () => {
        assert.equal(evaluate("-123"), -123);
        assert.equal(evaluate("!true"), false);
    });

    it("handles syntax error on unclosed parentheses gracefully", () => {
        const scanner = new Scanner("(1 + ");
        const tokens = scanner.scanTokens();
        const parser = new Parser(tokens);
        const stmts = parser.parse();
        assert.equal(stmts.length, 0);
    });
});

describe("Chapter 7: Evaluation & Runtime Semantics", () => {
    describe("Arithmetic operations", () => {
        it("evaluates binary addition, subtraction, multiplication, and division", () => {
            assert.equal(evaluate("1 + 2"), 3);
            assert.equal(evaluate("10 - 4"), 6);
            assert.equal(evaluate("3 * 4"), 12);
            assert.equal(evaluate("12 / 3"), 4);
        });

        it("evaluates complex expressions with correct precedence", () => {
            assert.equal(evaluate("2 + 3 * 4"), 14);
            assert.equal(evaluate("(2 + 3) * 4"), 20);
            assert.equal(evaluate("10 - 2 - 1"), 7);
        });

        it("evaluates unary minus", () => {
            assert.equal(evaluate("-5"), -5);
            assert.equal(evaluate("-(-5)"), 5);
        });
    });

    describe("String concatenation", () => {
        it("concatenates two strings", () => {
            assert.equal(evaluate('"hello " + "world"'), "hello world");
        });
    });

    describe("Comparisons", () => {
        it("evaluates relational operators (<, <=, >, >=)", () => {
            assert.equal(evaluate("3 < 5"), true);
            assert.equal(evaluate("5 < 3"), false);
            assert.equal(evaluate("5 <= 5"), true);
            assert.equal(evaluate("6 <= 5"), false);
            assert.equal(evaluate("5 > 3"), true);
            assert.equal(evaluate("3 > 5"), false);
            assert.equal(evaluate("5 >= 5"), true);
            assert.equal(evaluate("4 >= 5"), false);
        });
    });

    describe("Equality and Truthiness", () => {
        it("evaluates equality (== and !=)", () => {
            assert.equal(evaluate("5 == 5"), true);
            assert.equal(evaluate("5 != 5"), false);
            assert.equal(evaluate('"a" == "a"'), true);
            assert.equal(evaluate('"a" == "b"'), false);
            assert.equal(evaluate("nil == nil"), true);
            assert.equal(evaluate("nil == false"), false);
            assert.equal(evaluate("nil == 0"), false);
        });

        it("evaluates Lox truthiness rules", () => {
            assert.equal(evaluate("!false"), true);
            assert.equal(evaluate("!nil"), true);
            assert.equal(evaluate("!true"), false);
            assert.equal(evaluate("!0"), false);
            assert.equal(evaluate('!""'), false);
        });
    });

    describe("Runtime type errors", () => {
        it("throws RuntimeError for unary minus on non-number", () => {
            assert.throws(() => evaluate('-"muffin"'), RuntimeError);
        });

        it("throws RuntimeError for arithmetic on non-numbers", () => {
            assert.throws(() => evaluate('"apple" - 3'), RuntimeError);
            assert.throws(() => evaluate('true * 4'), RuntimeError);
            assert.throws(() => evaluate('5 / "banana"'), RuntimeError);
        });

        it("throws RuntimeError for mixed string and number addition", () => {
            assert.throws(() => evaluate('"foo" + 123'), RuntimeError);
            assert.throws(() => evaluate('123 + "foo"'), RuntimeError);
        });

        it("throws RuntimeError for comparisons on non-numbers", () => {
            assert.throws(() => evaluate('"apple" < 3'), RuntimeError);
            assert.throws(() => evaluate('true > false'), RuntimeError);
        });
    });
});

describe("Chapter 8: Statements, Variables, and Scoping", () => {
    describe("Statement parsing", () => {
        it("parses expression statements", () => {
            const scanner = new Scanner("1 + 2;");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();

            assert.equal(stmts.length, 1);
            assert.ok(stmts[0] instanceof Expression);
        });

        it("parses print statements", () => {
            const scanner = new Scanner('print "hello";');
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();

            assert.equal(stmts.length, 1);
            assert.ok(stmts[0] instanceof Print);
        });

        it("parses variable declarations", () => {
            const scanner = new Scanner("var a = 10; var b;");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();

            assert.equal(stmts.length, 2);
            assert.ok(stmts[0] instanceof Var);
            assert.ok(stmts[1] instanceof Var);
        });

        it("parses block statements", () => {
            const scanner = new Scanner("{ var a = 1; print a; }");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();

            assert.equal(stmts.length, 1);
            assert.ok(stmts[0] instanceof Block);
            assert.equal((stmts[0] as Block).statements.length, 2);
        });

        it("requires semicolon after expression statement", () => {
            const scanner = new Scanner("1 + 2");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();
            assert.equal(stmts.length, 0);
        });

        it("requires semicolon after print statement", () => {
            const scanner = new Scanner('print "missing semi"');
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();
            assert.equal(stmts.length, 0);
        });

        it("requires closing brace for blocks", () => {
            const scanner = new Scanner("{ var a = 1;");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();
            assert.equal(stmts.length, 0);
        });
    });

    describe("Print and expression execution", () => {
        it("executes print statements and outputs to stdout", () => {
            const output = execute('print "hello world";');
            assert.deepEqual(output, ["hello world"]);
        });

        it("evaluates expressions in print statements before printing", () => {
            const output = execute("print 2 + 3 * 4;");
            assert.deepEqual(output, ["14"]);
        });

        it("prints booleans and nil correctly", () => {
            const output = execute("print true; print false; print nil;");
            assert.deepEqual(output, ["true", "false", "nil"]);
        });

        it("executes expression statements without producing output", () => {
            const output = execute("1 + 2; true == false;");
            assert.deepEqual(output, []);
        });

        it("executes sequential statements in order", () => {
            const output = execute(`
                print "line 1";
                print "line 2";
                print 10 / 2;
            `);
            assert.deepEqual(output, ["line 1", "line 2", "5"]);
        });
    });

    describe("Variables (Declaration, Access & Mutation)", () => {
        it("declares and accesses variables", () => {
            const output = execute(`
                var a = 42;
                print a;
            `);
            assert.deepEqual(output, ["42"]);
        });

        it("defaults uninitialized variables to nil", () => {
            const output = execute(`
                var unassigned;
                print unassigned;
            `);
            assert.deepEqual(output, ["nil"]);
        });

        it("evaluates variables in binary expressions", () => {
            const output = execute(`
                var a = 10;
                var b = 20;
                print a + b;
            `);
            assert.deepEqual(output, ["30"]);
        });

        it("allows variable initialization to reference previous variables", () => {
            const output = execute(`
                var first = "hello";
                var second = first + " world";
                print second;
            `);
            assert.deepEqual(output, ["hello world"]);
        });

        it("reassigns existing variables", () => {
            const output = execute(`
                var a = 1;
                print a;
                a = 2;
                print a;
            `);
            assert.deepEqual(output, ["1", "2"]);
        });

        it("evaluates assignment as an expression", () => {
            const output = execute(`
                var a;
                print a = 99;
            `);
            assert.deepEqual(output, ["99"]);
        });

        it("supports chained assignment (right-associative)", () => {
            const output = execute(`
                var a;
                var b;
                a = b = 50;
                print a;
                print b;
            `);
            assert.deepEqual(output, ["50", "50"]);
        });

        it("throws RuntimeError when accessing an undefined variable", () => {
            assert.throws(() => evaluate("undefinedVar"), RuntimeError);
        });

        it("throws RuntimeError when assigning to an undeclared variable", () => {
            assert.throws(() => evaluate("neverDeclared = 10"), RuntimeError);
        });
    });

    describe("Block Scopes and Lexical Scoping", () => {
        it("executes statements inside a block", () => {
            const output = execute(`
                {
                    var message = "inside block";
                    print message;
                }
            `);
            assert.deepEqual(output, ["inside block"]);
        });

        it("allows inner block to read variables from outer scope", () => {
            const output = execute(`
                var outer = "outer value";
                {
                    print outer;
                }
            `);
            assert.deepEqual(output, ["outer value"]);
        });

        it("supports variable shadowing in nested scopes", () => {
            const output = execute(`
                var a = "global";
                {
                    var a = "inner";
                    print a;
                }
                print a;
            `);
            assert.deepEqual(output, ["inner", "global"]);
        });

        it("mutates outer variable from inner scope if not shadowed", () => {
            const output = execute(`
                var count = 0;
                {
                    count = 5;
                }
                print count;
            `);
            assert.deepEqual(output, ["5"]);
        });

        it("does not leak inner variables to outer scope", () => {
            const { errors } = executeWithErrors(`
                {
                    var inside = "hidden";
                }
                print inside;
            `);
            assert.ok(errors.some((e) => e.includes("Undefined variable 'inside'")));
        });

        it("handles deeply nested scopes (3 levels)", () => {
            const output = execute(`
                var a = "global a";
                var b = "global b";
                var c = "global c";
                {
                    var a = "outer a";
                    var b = "outer b";
                    {
                        var a = "inner a";
                        print a;
                        print b;
                        print c;
                    }
                    print a;
                    print b;
                    print c;
                }
                print a;
                print b;
                print c;
            `);

            assert.deepEqual(output, [
                // Inner block
                "inner a",
                "outer b",
                "global c",
                // Outer block
                "outer a",
                "outer b",
                "global c",
                // Global scope
                "global a",
                "global b",
                "global c",
            ]);
        });
    });
});
