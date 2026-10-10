import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { RuntimeError } from "../src/RuntimeError.js";
import { evaluate } from "./helpers.js";

describe("Evaluation & Runtime Semantics", () => {
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

