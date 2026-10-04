import { TokenType } from "./TokenType.js";

export type LiteralValue = string | number | boolean | null;

export class Token {
    constructor(readonly type: TokenType, readonly lexeme: string, readonly literal: LiteralValue, readonly line: number) {}

    toString(): string {
        return `${this.type} ${this.lexeme} ${this.literal}`;
    }   
}
