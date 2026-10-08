# TypeScript Lox Interpreter

A TypeScript implementation of **Lox**, a dynamically-typed scripting language designed by Robert Nystrom in [*Crafting Interpreters*](https://craftinginterpreters.com/).

## What is Lox?

Lox is a high-level scripting language featuring:
- **Dynamic Typing:** Numbers, strings, booleans, and `nil`.
- **Expressions & Operators:** Arithmetic, comparisons, equality, and short-circuiting logical operators (`and`, `or`).
- **Statements & State:** Variable declarations (`var`), assignments, and block-level lexical scoping with shadowing.
- **Control Flow:** Conditional branching (`if`/`else`) and loops (`while`).
- **Functions:** First-class callables and native functions (e.g., `clock()`).

## Architecture & Approach

This project implements a classic **tree-walk interpreter** (following the architecture of `jlox`) using TypeScript:

1. **Scanning (Lexical Analysis):** `src/Scanner.ts` converts raw source characters into a stream of tokens (`Token`).
2. **AST Metaprogramming:** `tool/Expr.ts` generates strongly-typed AST node classes and visitor interfaces for expressions (`src/Expr.ts`) and statements (`src/Stmt.ts`).
3. **Parsing:** `src/Parser.ts` uses recursive descent to transform tokens into an Abstract Syntax Tree, handling operator precedence and syntax error recovery via synchronization.
4. **Interpretation:** `src/Interpreter.ts` uses the **Visitor Pattern** to walk AST nodes and evaluate runtime semantics.
5. **Environment & Scoping:** `src/Environment.ts` manages lexical scopes through an enclosing parent-pointer environment chain for variable binding and resolution.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Running the Interpreter

Start the interactive REPL:
```bash
npx tsx src/main.ts
```

Execute a Lox script file:
```bash
npx tsx src/main.ts path/to/script.lox
```

### Running Tests
Run the test suite:
```bash
npx tsx --test test/interpreter.test.ts
```

