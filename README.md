# Lambda Calculus REPL

A basic repl for doing lambda calculus. Requires no installations, just run main and pass it the file to evaluate. By default it will look for a file named `sandbox` in the same folder as the main program. The evaluating file will be watched and the repl will run the file and print the result whenever it's saved.

Run with `node main [sourcefile]`, then edit and save the source file to get output.

The basic syntax is a slightly modified Javascript.

 - Define a lambda: `identity = x => x`
 - Log a value: `log(identity)`
 - Inspect a lambda expansion `expand('identity')`

`log` takes an optional first parameter in plain Javascript which acts as a converter, so while `log(identity)` in the example above would output `[Function: identity]`, we can provide a converter and call `log(f => f.toString(), identity)` to get `x => x` as output instead. The built-in converters are:

 - `INT` - convert a Church numeral to a native number
 - `BOOL` - convert a standard lambda boolean to a native boolean
 - `PAIR(T)(V)` - convert a standard lambda pair to a string `(t, v)` where `t` an `v` are the paired values converted with `T` and `V` respectively
 - `INT_PAIR` - an alias of `PAIR(INT)(INT)`
 - `BOOL_PAIR` - an alias of `PAIR(BOOL)(BOOL)`
 - `LIST(T)` - convert a lambda list of shape `(BOOL, (t, LIST))` to a native array, converting the values `t` with `T`
 - `INT_LIST` - an alias of `LIST(INT)`
 - `BOOL_LIST` - an alias of `LIST(BOOL)`