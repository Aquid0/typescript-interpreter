import { Assign, Binary, Grouping, Literal, Logical, Unary, Variable, type Visitor as ExprVisitor } from "./Expr.js";
import { Expr } from "./Expr.js";
import { Token } from "./Token.js";
import { TokenType } from "./TokenType.js";
import { RuntimeError } from "./RuntimeError.js";
import { runtimeError } from "./main.js";
import { Var, Expression, Print, type Visitor as StmtVisitor, type Stmt, Block, If, While} from './Stmt.js';
import { Environment } from "./Environment.js";

export class Interpreter implements ExprVisitor<any>, StmtVisitor<void> {
    private environment: Environment = new Environment();

    interpret(statements: Stmt[]) { 
        try {
            for (const statement of statements) {
                this.execute(statement);
            }
        } catch (error) {
            if (error instanceof RuntimeError) {
                runtimeError(error);
            } else {
                throw error;
            }
        }
    }

    visitBlockStmt(stmt: Block): void {
        this.executeBlock(stmt.statements, new Environment(this.environment));
    }

    visitAssignExpr(expr: Assign): any {
        const value: any = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
    }

    visitVarStmt(stmt: Var): void { 
        let value: any = null;
        
        if (stmt.initializer != null) {
            value = this.evaluate(stmt.initializer);
        }

        this.environment.define(stmt.name.lexeme, value);
    }

    visitVariableExpr(expr: Variable): any {
        return this.environment.get(expr.name);
    }

    visitExpressionStmt(stmt: Expression): void {
        this.evaluate(stmt.expression);
    }

    visitIfStmt(stmt: If): void {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.thenBranch);
        } else if (stmt.elseBranch != null) { 
            this.execute(stmt.elseBranch);
        }
    }

    visitWhileStmt(stmt: While): void {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.body);
        }
    }

    visitLogicalExpr(expr: Logical): any {
        const left: any = this.evaluate(expr.left);

        // Short-circuit 
        if (expr.operator.type === TokenType.OR) { 
            if (this.isTruthy(left)) return left;
        } else { // AND
            if (!this.isTruthy(left)) return left;
        }

        return this.evaluate(expr.right);
    }

    visitPrintStmt(stmt: Print): void {
        const value: any = this.evaluate(stmt.expression);
        console.log(this.stringify(value));
    }

    visitLiteralExpr(expr: Literal): any {
        return expr.value;
    }

    visitGroupingExpr(expr: Grouping): any {
        return this.evaluate(expr.expression);
    }

    visitUnaryExpr(expr: Unary): any {
        const right: any = this.evaluate(expr.right);
       
        switch(expr.operator.type) {
            case TokenType.MINUS:
                this.checkNumberOperand(expr.operator, right);
                return -(right as number);
            case TokenType.BANG:
                return !this.isTruthy(right);
        }

        // Unreachable
        return null;
    }

    visitBinaryExpr(expr: Binary): any {
        const left: any = this.evaluate(expr.left);
        const right: any = this.evaluate(expr.right);

        switch (expr.operator.type) {
            case TokenType.MINUS: 
                this.checkNumberOperands(expr.operator, left, right);
                return left - right;
            case TokenType.SLASH: 
                this.checkNumberOperands(expr.operator, left, right);
                return left / right;
            case TokenType.STAR:
                this.checkNumberOperands(expr.operator, left, right); 
                return left * right;
            case TokenType.PLUS:
                if (typeof left === "number" && typeof right === "number") {
                    return left + right; 
                }

                if (typeof left === "string" && typeof right === "string") {
                    return left + right;
                }
            
                throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings");
            case TokenType.GREATER: 
                this.checkNumberOperands(expr.operator, left, right);       
                return left > right;
            case TokenType.GREATER_EQUAL: 
                this.checkNumberOperands(expr.operator, left, right);
                return left >= right;
            case TokenType.LESS: 
                this.checkNumberOperands(expr.operator, left, right);
                return left < right;
            case TokenType.LESS_EQUAL: 
                this.checkNumberOperands(expr.operator, left, right);
                return left <= right;
            case TokenType.BANG_EQUAL: 
                return !this.isEqual(left, right);
            case TokenType.EQUAL_EQUAL: 
                return this.isEqual(left, right);
        }

        // Unreachable
        return null;
    }

    executeBlock(statements: Stmt[], environment: Environment) {
        const previous: Environment = this.environment;

        try {
            this.environment = environment;

            for (const statement of statements) {
                this.execute(statement);
            }
        } finally {
            this.environment = previous;
        }
    }

    private execute (stmt: Stmt) {
        stmt.accept(this);
    }

    private isEqual(a: any, b: any): boolean {
        if (a === null && b === null) return true;
        if (a === null) return false;

        return a === b;
    }

    private checkNumberOperand(operator: Token, operand: any) {
        if (typeof operand === "number") return;
        throw new RuntimeError(operator, "Operand must be a number");
    }

    private checkNumberOperands(operator: Token, left: any, right: any) {
        if (typeof left === "number" && typeof right === "number") return;
        throw new RuntimeError(operator, "Operands must be numbers");        
    }

    private isTruthy(object: any): boolean { 
        if (object === null) return false;
        if (typeof object === "boolean") return object;
        return true;
    }

    private stringify(object: any): string {
        if (object === null) return "nil";

        if (typeof object === "number") {
            let text = String(object);
            if (text.endsWith(".0")) {
                text = text.substring(0, text.length - 2);
            }
            return text;
        }
        
        return String(object)
    }
    
    evaluate(expr: Expr): any { 
        return expr.accept(this);
    }
}