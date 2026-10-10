import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Scanner } from "../src/Scanner.js";
import { TokenType } from "../src/TokenType.js";

describe("Scanning", () => {
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

