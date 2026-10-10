import { Scanner } from "../src/Scanner.js";
import { Parser } from "../src/Parser.js";
import { Interpreter } from "../src/Interpreter.js";
import { Expression } from "../src/Stmt.js";
import { type Expr } from "../src/Expr.js";

// Helper to parse a single expression (wrapped in an Expression statement if needed)
export function parseExpression(source: string): Expr {
    const trimmed = source.trim();
    const src = trimmed.endsWith(";") ? trimmed : `${trimmed};`;
    const scanner = new Scanner(src);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (!statements || statements.length === 0) {
        throw new Error(`Parse failed for source: ${source}`);
    }

    const stmt = statements[0];
    if (stmt instanceof Expression) {
        return stmt.expression;
    }

    throw new Error(`Expected expression statement for source: ${source}`);
}

// Helper to evaluate a Lox expression string directly
export function evaluate(source: string): any {
    const expr = parseExpression(source);
    const interpreter = new Interpreter();
    return interpreter.evaluate(expr);
}

// Helper to execute statements through the Interpreter and capture stdout
export function execute(source: string): string[] {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();
    const interpreter = new Interpreter();

    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
        output.push(args.map((a) => String(a)).join(" "));
    };

    try {
        interpreter.interpret(statements);
    } finally {
        console.log = originalLog;
    }

    return output;
}

// Helper to execute statements and capture both stdout and stderr (for runtime errors)
export function executeWithErrors(source: string): { output: string[]; errors: string[] } {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();
    const interpreter = new Interpreter();

    const output: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => output.push(args.map((a) => String(a)).join(" "));
    console.error = (...args: any[]) => errors.push(args.map((a) => String(a)).join(" "));

    try {
        interpreter.interpret(statements);
    } finally {
        console.log = originalLog;
        console.error = originalError;
    }

    return { output, errors };
}

