import { Binary, Unary, Expr, Grouping, Literal, type Visitor } from "./Expr.js";
import { Token } from "./Token.js"
import { TokenType } from "./TokenType.js"

export class AstPrinter implements Visitor<string> {
    print(expr: Expr): string {
        return expr.accept(this);
    }
    
    visitBinaryExpr(expr: Binary): string {
        return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
    }

    visitGroupingExpr(expr: Grouping): string {
        return this.parenthesize("group", expr.expression);
    }

    visitLiteralExpr(expr: Literal): string { 
        if (expr.value === null) return "nil";
        return expr.value.toString();
    }

    visitUnaryExpr(expr: Unary): string { 
        return this.parenthesize(expr.operator.lexeme, expr.right);
    }

    parenthesize(name: string, ...exprs: Expr[]) {
        let out = "";

        out += `(${name}`
        for (const expr of exprs) {
            out += ` ${expr.accept(this)}`;
        }

        out += ")"; 

        return out;
    }
}

function main() {
    const expression: Expr = new Binary(
        new Unary(
            new Token(TokenType.MINUS, "-", null, 1),
            new Literal(123)), 
        new Token(TokenType.STAR, "*", null, 1),
        new Grouping(new Literal(45.67)));
    
    console.log(new AstPrinter().print(expression));
};

main();