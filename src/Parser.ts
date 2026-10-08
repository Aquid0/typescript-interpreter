import { Token } from './Token.js'; 
import { Logical, Variable, Grouping, Literal, Unary, Binary, Expr, Assign, Call } from './Expr.js';
import { TokenType } from './TokenType.js';
import { error } from './main.js';
import { While, If, Block, Stmt, Print, Expression, Var } from './Stmt.js';

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
            const decl: Stmt | null = this.declaration();
            if (decl) statements.push(decl);
        } 

        return statements;
    }

    private declaration() {
        try {
            if (this.match(TokenType.FUN)) return this.function("function");
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
        if (this.match(TokenType.FOR)) return this.forStatement();
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.PRINT)) return this.printStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.LEFT_BRACE)) return new Block(this.block());

        return this.expressionStatement();
    }

    private forStatement(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

        
        /*

        forStmt         -> "for" "(" ( varDecl | exprStmt | ";" )
                           expression? ";"
                           expression? ")" statement ;
        
        Clause 1: Initializer - usually an expression/variable declaration scoped to the rest of the for loop
        
        Clause 2: Condition - Controls when to exit the loop

        Clause 3: Increment - Arbitrary expression that does work at the end of each loop iteration

        */

        // Clause 1
        let initializer;
        if (this.match(TokenType.SEMICOLON)) {
            initializer = null;
        } else if (this.match(TokenType.VAR)) {
            initializer = this.varDeclaration();
        } else {
            initializer = this.expressionStatement();
        }
        
        // Clause 2
        let condition = null; 
        if (!this.check(TokenType.SEMICOLON)) {
            condition = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

        // Clause 3
        let increment = null;
        if (!this.check(TokenType.RIGHT_PAREN)) {
            increment = this.expression();
        }
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after clauses.");        

        let body: Stmt = this.statement();

        // DESUGAR TO WHILE LOOP
        // Append the increment to run at the end of every iteration
        if (increment != null) {
            body = new Block([body, new Expression(increment)]);
        }

        // Wrap it in a While loop
        if (condition == null) condition = new Literal(true);
        body = new While(condition, body);

        // Place the initializer before the loop inside a new scope
        if (initializer != null) {
            body = new Block([initializer, body]);
        }

        return body;    
    }

    private whileStatement(): Stmt { 
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
        const condition: Expr = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
        const body: Stmt = this.statement();

        return new While(condition, body);
    }

    private ifStatement(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'");
        const condition: Expr = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'if'");

        const thenBranch: Stmt = this.statement(); 
        let elseBranch: Stmt | null = null;
        if (this.match(TokenType.ELSE)) {
            elseBranch = this.statement();
        }

        return new If(condition, thenBranch, elseBranch);
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

    private function(kind: string): Function {
        const name: Token = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
        this.consume()
    }

    private expression(): Expr {
        return this.assignment();
    }

    private assignment(): Expr {
        const expr: Expr = this.or();

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

    private or(): Expr {
        let expr: Expr = this.and();

        while (this.match(TokenType.OR)) { 
            const operator: Token = this.previous();
            const right: Expr = this.and();
            expr = new Logical(expr, operator, right);            
        }

        return expr;
    }

    private and(): Expr { 
        let expr: Expr = this.equality();

        while (this.match(TokenType.AND)) { 
            const operator: Token = this.previous();
            const right: Expr = this.equality();
            expr = new Logical(expr, operator, right);
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

        return this.call();
    }

    private call(): Expr {
        let expr: Expr = this.primary();

        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                expr = this.finishCall(expr);
            } else {
                break;
            }
        }

        return expr;
    }

    private finishCall(callee: Expr): Expr {
        const args: Expr[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (arguments.length >= 255) {
                    error(this.peek(), "Can't have more than 255 arguments.");
                }
                args.push(this.expression());
            } while (this.match(TokenType.COMMA));
        } 

        const paren: Token = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");
    
        return new Call(callee, paren, args);
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

