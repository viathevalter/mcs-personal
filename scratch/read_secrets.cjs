const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'secrets.txt');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log(content);
} else {
    console.log("File not found");
}
