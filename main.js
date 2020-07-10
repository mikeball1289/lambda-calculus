const { watchFile, readFileSync } = require('fs');
const { join } = require('path');

const sandboxFile = join(__dirname, 'sandbox');

watchFile(sandboxFile, () => {
    try {
        const today = new Date();
        console.clear();
        console.log(`\n-- SANDBOX (${today.toLocaleTimeString()}) --\n`);
        const source = readFileSync(sandboxFile, 'ascii');
        console.log(source.replace(/\r\n/g, '\n').split('\n').filter(l => l.startsWith('log')).join('\n'));
        console.log();
        eval('log = (...args) => console.log(" >>", ...args);\n' + source);
    } catch(err) {
        console.log(err.message);
    }
});