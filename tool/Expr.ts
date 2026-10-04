import fs from "fs";

function main(args = process.argv.slice(2)) {
    if (args.length != 1) {
        console.log("Usage: generate_ast <output directory>");
        process.exit(64);
    }
    const outputDir: string = args[0]!;
    defineAst(outputDir, "Expr", [
        "Binary   : Expr left, Token operator, Expr right",
        "Grouping : Expr expression",
        "Literal  : Object value",
        "Unary    : Token operator, Expr right",
    ]);
}

function defineAst(outputDir: string, baseName: string, types: string[]) {
    const path: string = `${outputDir}/${baseName}.ts`;
    const lines: string[] = [];

    lines.push(`import { Token } from "./Token.js";`);
    lines.push(``);

    lines.push(`export abstract class ${baseName} {`);
    lines.push(`    abstract accept<R>(visitor: Visitor<R>): R;`);
    lines.push(`}`);
    lines.push(``);

    lines.push(`export interface Visitor<R> {`);
    for (const type of types) {
        const typeName = type.split(":")[0]!.trim();
        lines.push(`    visit${typeName}${baseName}(${baseName.toLowerCase()}: ${typeName}): R;`);
    }
    lines.push(`}`);
    lines.push(``);

    for (const type of types) {
        const [rawName, rawFields] = type.split(":");
        const className = rawName!.trim();
        const fields = rawFields!.trim();
        defineType(lines, baseName, className, fields);
    }

    fs.writeFileSync(path, lines.join("\n"));
}

function defineType(
    lines: string[],
    baseName: string,
    className: string,
    fieldList: string
): void {
    lines.push(`export class ${className} extends ${baseName} {`);

    const fields = fieldList.split(", ").map((field) => {
        const [type, name] = field.trim().split(" ");
        return { type: type!, name: name! };
    });

    const params = fields
        .map((f) => `readonly ${f.name}: ${f.type}`)
        .join(", ");

    lines.push(`    constructor(${params}) {`);
    lines.push(`        super();`);
    lines.push(`    }`);
    lines.push(``);

    lines.push(`    accept<R>(visitor: Visitor<R>): R {`);
    lines.push(`        return visitor.visit${className}${baseName}(this);`);
    lines.push(`    }`);

    lines.push(`}`);
    lines.push(``);
}

main();