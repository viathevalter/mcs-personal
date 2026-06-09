const fs = require('fs');

try {
    const buffer = fs.readFileSync('default.docx');
    console.log("File size:", buffer.length);
    console.log("First 4 bytes:", buffer.slice(0, 4).toString('hex').toUpperCase());
    console.log("First 20 bytes as ASCII:", buffer.slice(0, 20).toString('ascii'));
} catch (e) {
    console.error("Error:", e);
}
