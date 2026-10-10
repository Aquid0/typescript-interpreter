import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Scanner } from "../src/Scanner.js";
import { Parser } from "../src/Parser.js";
import { RuntimeError } from "../src/RuntimeError.js";
import { Block, Expression, Print, Var } from "../src/Stmt.js";
import { evaluate, execute, executeWithErrors } from "./helpers.js";

describe("Statements, Variables, and Scoping", () => {
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
                "inner a",
                "outer b",
                "global c",
                "outer a",
                "outer b",
                "global c",
                "global a",
                "global b",
                "global c",
            ]);
        });
    });
});

