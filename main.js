const { watchFile, readFileSync, promises } = require('fs');
const { join } = require('path');

const sandboxFile = join(__dirname, process.argv[2] || 'sandbox');
const log = (...args) => 
    args.length === 1 ?
        console.log(' >>', args[0]) :
        console.log(' >>', args[0](args[1]));

const INT = num => num(x => x + 1)(0);
const BOOL = bool => bool(true)(false);
const FUNC = fn => fn;
const __fst = a => b => a;
const __snd = a => b => b;
const PAIR = firstType => secondType => p =>
    `(${firstType(p(__fst))}, ${secondType(p(__snd))})`;
const INT_PAIR = PAIR(INT)(INT);
const BOOL_PAIR = PAIR(BOOL)(BOOL);
const __foldl = l => fold => acc =>
    BOOL(l(__fst)) ?
        acc :
        __foldl(l(__snd)(__snd))(fold)(fold(acc)(l(__snd)(__fst)));
const LIST = listType => l => __foldl(l)(acc => e => [...acc, listType(e)])([]);
const INT_LIST = LIST(INT);
const BOOL_LIST = LIST(BOOL);

const wordsRegex = /\([a-zA-Z0-9_$]+\)|[a-zA-Z0-9_$]+/g;
let MAX_EXPANSION_DEPTH = 1000;

const removeBrackets = id => {
    const match = id.match(/(?<=\()[a-zA-Z0-9_$]+(?=\))/);
    return match ? match[0] : id;
}

function _expand(expr, depth = 0, memmap = {}) {
    if (depth > MAX_EXPANSION_DEPTH) {
        throw new Error('Max expansion depth exceeded');
    }

    const exprString = expr.toString();
    if (exprString in memmap) {
        return `(${memmap[exprString]})`;
    }

    const ids = exprString.match(wordsRegex);
    const rest = exprString.split(wordsRegex);

    const replacements = ids.map(id =>
        eval(`typeof ${removeBrackets(id)}`) === 'function' ?
            `(${_expand(eval(id), depth + 1, memmap)})` :
            id
    );

    const replaced = rest.flatMap((e, i) => [...[e], ...replacements.slice(i, i + 1)]).join('');
    return memmap[exprString] = replaced;
}

function expand(name) {
    if (!(typeof name === 'string')) {
        throw new Error('Pass in identifier name, not the variable itself')
    }
    if (eval(`typeof ${name}`) !== 'function') {
        throw new Error(`Cannot evaluate non-lambda expression ${name}`);
    }
    console.log(`\n${name} = ${_expand(eval(name))}\n`);
}

function processSource(source) {
    // list log lines
    source = source.replace(/\r\n/g, '\n');
    console.log(source.split('\n').filter(l => l.startsWith('log')).join('\n'));
    console.log();
    // turn calls into functions
    const callsRegex = /^([a-zA-Z0-9_$]+ *= *)[a-zA-Z0-9_$]+\(/gm;
    let match;
    while(match = callsRegex.exec(source)) {
        const declIndex = match.index + match[1].length;
        let index = match.index + match[0].length;
        let brackets = 1;
        while ((brackets > 0 || source.slice(index).match(/^\s*\(/)) && index < source.length) {
            if (source.charAt(index) === '(') brackets ++;
            else if (source.charAt(index) === ')') brackets --;
            index ++;
        }
        source = source.slice(0, declIndex) + '__ => ' + source.slice(declIndex, index) + '(__)' + source.slice(index);
    }
    // turn assignments into vars
    const declarationRegex = /^([a-zA-Z0-9_$]+ *=[^>])/gm;
    return expand.toString() + '\n' + _expand.toString() + '\n' +
        source.replace(declarationRegex, 'const $1');
}

let scheduler = 0;
let promise;
let cleanup = [];

function _bootstrap(generator, consumer, fn, prevVal, schedule) {
    if (scheduler !== schedule) return;
    return generator().then(v => {
        if (scheduler !== schedule) return;
        const result = fn(prevVal)(v);
        const value = result(a => b => a);
        consumer(value);
        if (BOOL(result(a => b => b))) {
            return _bootstrap(generator, consumer, fn, value, scheduler);
        }
    });
}

function bootstrap(generator, consumer, fn, init) {
    promise = promise.then((s => () => _bootstrap(generator, consumer, fn, init, s))(scheduler));
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on('line', l => {
    const cb = linewaiters.shift();
    if (cb) cb(l);
});
let linewaiters = [];

function getLine() {
    process.stdout.write('(IN)>> ');
    return new Promise(resolve => {
        const callback = l => {
            cleanup = cleanup.filter(fn => fn !== cancel);
            resolve(l);
        }
        const cancel = () => linewaiters = linewaiters.filter(fn => fn !== callback);

        linewaiters.push(callback);
        cleanup.push(cancel);
    });
}

const STDIN = parser => async () => {
    const line = await getLine();
    return parser(line);
}

const STDOUT = transform => v => {
    log(transform, v);
}

const USERINT = v => {
    let n = Math.floor(Math.max(0, parseInt(v)));
    if (isNaN(n) || !isFinite(n)) {
        return f => x => x;
    }
    return f => x => {
        let i = 0;
        while (i < n) {
            i ++;
            x = f(x)
        }
        return x;
    }
}

watchFile(sandboxFile, () => {
    'use strict';
    try {
        const today = new Date();
        cleanup.forEach(fn => fn());
        cleanup = [];
        scheduler ++;
        promise = Promise.resolve();
        console.clear();
        console.log(`\n-- SANDBOX (${today.toLocaleTimeString()}) --\n`);
        const source = readFileSync(sandboxFile, 'ascii');
        eval(processSource(source));
    } catch(err) {
        console.log(err.message);
    }
});