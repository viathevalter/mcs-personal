const fs = require('fs');
const content = fs.readFileSync('import_log.txt', 'utf16le');
console.log(content.substring(0, 1000));
console.log("...");
console.log(content.substring(content.length - 1000));
