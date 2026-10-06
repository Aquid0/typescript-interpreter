import { Token } from './Token.js'; 
import { Variable, Grouping, Literal, Unary, Binary, Expr, Assign } from './Expr.js';
import { TokenType } from './TokenType.js';
import { error } from './main.js';
import { Block, Stmt, Print, Expression, Var } from './Stmt.js';

class ParseError extends Error {};

export class Parser { 
    private tokens: Token[] = [];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): Stmt[] {
        const statements: Stmt[] = [];

        while(!this.isAtEnd()) {
            const decl = this.declaration();
            if (decl) statements.push(decl);
        } 

        return statements;
    }

    private declaration() {
        try {
            if (this.match(TokenType.VAR)) return this.varDeclaration();

            return this.statement();
        } catch (err) {
            if (err instanceof ParseError) {
                this.synchronize();
                return null;
            } 
            throw err;
        }
    }

    private varDeclaration(): Stmt {
        const name: Token = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

        let initializer: Expr;

        if (this.match(TokenType.EQUAL)) { 
            initializer = this.expression();
        }

        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
        return new Var(name, initializer!);
    }

    private statement(): Stmt {
        if (this.match(TokenType.PRINT)) return this.printStatement();
        if (this.match(TokenType.LEFT_BRACE)) return new Block(this.block());

        return this.expressionStatement();
    }

    private block(): Stmt[] { 
        const statements: Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            const decl = this.declaration();
            if (decl) statements.push(decl);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
        return statements;
    }

    private printStatement(): Stmt {
        const value: Expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after value.'");
        return new Print(value);
    }

    private expressionStatement(): Stmt {
        const expr: Expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
        return new Expression(expr);
    }

    private expression(): Expr {
        return this.assignment();
    }

    private assignment(): Expr {
        const expr: Expr = this.equality();

        if (this.match(TokenType.EQUAL)) {
            const equals: Token = this.previous();
            const value: Expr = this.assignment();

            if (expr instanceof Variable) { 
                const name: Token = expr.name;
                return new Assign(name, value);
            }

            error(equals, "Invalid asignment targe.");
        }

        return expr;
    }

    private equality(): Expr {
        let expr: Expr = this.comparison();

        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) { 
            const operator: Token = this.previous();
            const right: Expr = this.comparison();
            expr = new Binary(expr, operator, right);
        }

        return expr;
    }

    private comparison(): Expr {
        let expr: Expr = this.term();

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator: Token = this.previous();
            const right: Expr = this.term();
            expr = new Binary(expr, operator, right);
        }

        return expr;
    }

    private term(): Expr {
        let expr: Expr = this.factor();

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator: Token = this.previous();
            const right: Expr = this.factor();
            expr = new Binary(expr, operator, right);
        }

        return expr; 
    }

    private factor(): Expr {
        let expr: Expr = this.unary();

        while (this.match(TokenType.SLASH, TokenType.STAR)) {
            const operator: Token = this.previous();
            const right: Expr = this.unary();
            expr = new Binary(expr, operator, right);
        }

        return expr;
    }

    private unary(): Expr {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator: Token = this.previous();
            const right: Expr = this.unary();
            return new Unary(operator, right);
        }

        return this.primary();
    }

    private primary(): Expr {
        if (this.match(TokenType.FALSE)) return new Literal(false);
        if (this.match(TokenType.TRUE)) return new Literal(true);
        if (this.match(TokenType.NIL)) return new Literal(null);

        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new Literal(this.previous().literal);
        }

        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new Grouping(expr);
        }

        if (this.match(TokenType.IDENTIFIER)) {
            return new Variable(this.previous());
        }

        throw this.error(this.peek(), "Expect expression.");
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) { 
            if (this.check(type)) {
                this.advance();
                return true;
            } 
        }
        
        return false;
    }

    private consume(type: TokenType, message: string) { 
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type == type;
    }

    private isAtEnd() {
        return this.peek().type == TokenType.EOF;
    }

    private previous(): Token {
        return this.tokens[this.current - 1]!;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private peek(): Token {
       return this.tokens[this.current]!;
    }

    private error(token: Token, message: string): ParseError {
        error(token, message);
        return new ParseError();
    }

    private synchronize() { 
        this.advance();

        while (!this.isAtEnd()) { 
            if (this.previous().type == TokenType.SEMICOLON) return;

            switch (this.peek().type) {
                case TokenType.CLASS:
                case TokenType.FUN: 
                case TokenType.VAR: 
                case TokenType.FOR: 
                case TokenType.IF: 
                case TokenType.WHILE: 
                case TokenType.PRINT: 
                case TokenType.RETURN:
                    return;
            }

            this.advance();
        }
    }
}

