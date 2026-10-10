import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Scanner } from "../src/Scanner.js";
import { Parser } from "../src/Parser.js";
import { evaluate } from "./helpers.js";

describe("Parsing and Operator Precedence", () => {
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

