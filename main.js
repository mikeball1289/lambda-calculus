const { watchFile, readFileSync } = require('fs');
const { join } = require('path');
const { type } = require('os');

const sandboxFile = join(__dirname, process.argv[2] || 'sandbox');
const log = (...args) => 
    args.length === 1 ?
        console.log(' >>', args[0]) :
        console.log(' >>', args[0](args[1]));

const INT = num => num(x => x + 1)(0);
const BOOL = bool => bool(true)(false);
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

watchFile(sandboxFile, () => {
    'use strict';
    try {
        const today = new Date();
        console.clear();
        console.log(`\n-- SANDBOX (${today.toLocaleTimeString()}) --\n`);
        const source = readFileSync(sandboxFile, 'ascii');
        eval(processSource(source));
    } catch(err) {
        console.log(err.message);
    }
});