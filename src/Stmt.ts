import { Token } from "./Token.js";
import { Expr } from "./Expr.js";

export abstract class Stmt {
    abstract accept<R>(visitor: Visitor<R>): R;
}

export interface Visitor<R> {
    visitBlockStmt(stmt: Block): R;
    visitExpressionStmt(stmt: Expression): R;
    visitPrintStmt(stmt: Print): R;
    visitVarStmt(stmt: Var): R;
}

export class Block extends Stmt {
    constructor(readonly statements: Stmt[]) {
        super();
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitBlockStmt(this);
    }
}

export class Expression extends Stmt {
    constructor(readonly expression: Expr) {
        super();
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitExpressionStmt(this);
    }
}

export class Print extends Stmt {
    constructor(readonly expression: Expr) {
        super();
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitPrintStmt(this);
    }
}

export class Var extends Stmt {
    constructor(readonly name: Token, readonly initializer: Expr) {
        super();
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitVarStmt(this);
    }
}
