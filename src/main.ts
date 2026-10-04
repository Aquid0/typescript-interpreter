import fs from "fs";
import readline from "readline";
import { Scanner } from "./Scanner.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let hadError = false;  

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

    for (const token of tokens) { 
        console.log(token);
    }
} 

export function error(line: number, message: string) { 
    report(line, "", message);
}

// TODO: Implement more specific error reporting for 'where'
function report(line: number, where: string, message: string) {
    console.log(`[line ${line}] Error${where}: ${message}`);
    hadError = true;
}

main();