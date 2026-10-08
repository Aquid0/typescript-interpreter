import { Interpreter } from "./Interpreter.js";

export abstract class LoxCallable {
    abstract call(interpreter: Interpreter, args: any[]): any;
    abstract arity(): number;
}