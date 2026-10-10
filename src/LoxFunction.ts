import { Environment } from "./Environment.js";
import type { Interpreter } from "./Interpreter.js";
import type { LoxCallable } from "./LoxCallable.js";
import { ReturnException } from "./Return.js";
import type { Function } from "./Stmt.js";

export class LoxFunction implements LoxCallable{
    private declaration: Function;
    private closure: Environment;
    
    constructor(declaration: Function, closure: Environment) {
        this.declaration = declaration;
        this.closure = closure;
    }

    call(interpreter: Interpreter, args: any[]): any {
        const environment: Environment = new Environment(this.closure);

        // Dynamically define parameters as variables in our new environment at the time of call
        for (const [i, param] of this.declaration.params.entries()) {
            environment.define(param.lexeme, args[i]);
        }

        try { 
            interpreter.executeBlock(this.declaration.body, environment);
        } catch (err) {
            if (err instanceof ReturnException) {
                return err.value;
            } 
            throw err; 
        }
        
        return null;
    }

    arity(): number {
        return this.declaration.params.length;
    }

    toString(): string {
        return `<fn ${this.declaration.name.lexeme}>`;
    }
}