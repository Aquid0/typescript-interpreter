import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Scanner } from "../src/Scanner.js";
import { Parser } from "../src/Parser.js";
import { Interpreter } from "../src/Interpreter.js";
import { AstPrinter } from "../src/AstPrinter.js";
import { TokenType } from "../src/TokenType.js";
import { RuntimeError } from "../src/RuntimeError.js";
import { Expression, Print, type Stmt } from "../src/Stmt.js";
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

// Helper to get AST string representation for an expression
function printAst(source: string): string {
    const expr = parseExpression(source);
    return new AstPrinter().print(expr);
}

// Helper to execute statements through the Interpreter and capture console output
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
        const scanner = new Scanner("var foo = nil; if while true false");
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
        assert.equal(printAst("1 + 2 * 3"), "(+ 1 (* 2 3))");
    });

    it("respects left-associativity for subtraction and division", () => {
        assert.equal(printAst("1 - 2 - 3"), "(- (- 1 2) 3)");
        assert.equal(printAst("10 / 2 / 5"), "(/ (/ 10 2) 5)");
    });

    it("handles grouped expressions with parentheses", () => {
        assert.equal(printAst("(1 + 2) * 3"), "(* (group (+ 1 2)) 3)");
    });

    it("handles comparison and equality precedence", () => {
        assert.equal(printAst("1 + 2 == 3 * 1"), "(== (+ 1 2) (* 3 1))");
        assert.equal(printAst("1 < 2 == 3 > 4"), "(== (< 1 2) (> 3 4))");
    });

    it("handles unary operators", () => {
        assert.equal(printAst("-123"), "(- 123)");
        assert.equal(printAst("!true"), "(! true)");
    });

    it("throws syntax error on unclosed parentheses", () => {
        const scanner = new Scanner("(1 + ");
        const tokens = scanner.scanTokens();
        const parser = new Parser(tokens);
        assert.throws(() => parser.parse());
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
            // In Lox: ONLY false and nil are falsy!
            assert.equal(evaluate("!false"), true);
            assert.equal(evaluate("!nil"), true);

            // Everything else is truthy, including 0 and empty string!
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

describe("Chapter 8: Statements and State", () => {
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

        it("parses multiple statements in sequence", () => {
            const scanner = new Scanner('print 1; 2 + 3; print "done";');
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            const stmts = parser.parse();

            assert.equal(stmts.length, 3);
            assert.ok(stmts[0] instanceof Print);
            assert.ok(stmts[1] instanceof Expression);
            assert.ok(stmts[2] instanceof Print);
        });

        it("requires semicolon after expression statement", () => {
            const scanner = new Scanner("1 + 2");
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            assert.throws(() => parser.parse());
        });

        it("requires semicolon after print statement", () => {
            const scanner = new Scanner('print "missing semi"');
            const tokens = scanner.scanTokens();
            const parser = new Parser(tokens);
            assert.throws(() => parser.parse());
        });
    });

    describe("Statement execution", () => {
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
});
