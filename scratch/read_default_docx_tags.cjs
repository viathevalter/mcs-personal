const fs = require('fs');
const JSZip = require('jszip');

async function run() {
    console.log("Reading root default.docx...");
    const dataBuffer = fs.readFileSync('default.docx');
    const zip = await JSZip.loadAsync(dataBuffer);
    const docXml = await zip.file('word/document.xml').async('text');
    
    // Print all curly brace tags or loop markers
    const tags = docXml.match(/\{\{[^}]+\}\}/g) || [];
    console.log("Tags found in default.docx:", Array.from(new Set(tags)));
}

run().catch(err => console.error(err));
