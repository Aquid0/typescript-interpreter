import fs from "fs";
import readline from "readline";
import { Scanner } from "./Scanner.js";
import { Token } from "./Token.js";
import { TokenType } from "./TokenType.js";
import { Parser } from "./Parser.js";
import { Expr } from "./Expr.js";
import { AstPrinter } from "./AstPrinter.js";
import { RuntimeError } from "./RuntimeError.js";
import { Interpreter } from "./Interpreter.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let hadError = false;  
let hadRuntimeError = false;
const interpreter: Interpreter = new Interpreter();

export function main(args = process.argv.slice(2)) {
    if (args.length > 1) {
        console.log("Usage: jlox [script]");
        process.exit(64);
    } else if (args.length === 1) {
        runFile(args[0]);
    } else {
        runPrompt();
    }
}

function runFile(path: string | undefined) { 
    if (path === undefined) {
        console.log("No file path provided.");
        process.exit(65);
    }

    const file = fs.readFileSync(path, "utf8");
    run(file);

    if (hadError) process.exit(65);
    if (hadRuntimeError) process.exit(70);
}

function runPrompt() {
    while (true) { 
        rl.question("> ", (line) => {
            if (line === null) {
                return;
            }
            run(line);
            hadError = false;
        })
    }
}

function run(source: string) { 
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();

    const parser: Parser = new Parser(tokens);
    const expression: Expr | null = parser.parse();

    if (hadError || expression === null) return;

    interpreter.interpret(expression);
} 

export function error(target: number | Token, message: string) { 
    if (typeof target === "number") {
        report(target, "", message);
    } else {
        if (target.type === TokenType.EOF) {
            report(target.line, " at end", message);
        } else {
            report(target.line, ` at '${target.lexeme}'`, message);
        }
    }
}

export function runtimeError(err: RuntimeError) {
    console.error(`${err.message}\n[line ${err.token.line}]`);
    hadRuntimeError = true;
}

// TODO: Implement more specific error reporting for 'where'
function report(line: number, where: string, message: string) {
    console.log(`[line ${line}] Error${where}: ${message}`);
    hadError = true;
}

main();