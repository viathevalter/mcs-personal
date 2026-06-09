const fs = require('fs');
const JSZip = require('jszip');

async function run() {
    console.log("Reading scratch/default.docx...");
    const dataBuffer = fs.readFileSync('scratch/default.docx');
    const zip = await JSZip.loadAsync(dataBuffer);
    const docXml = await zip.file('word/document.xml').async('text');
    
    // Print all curly brace tags or loop markers
    const tags = docXml.match(/\{\{[^}]+\}\}/g) || [];
    console.log("Tags found in scratch/default.docx:", Array.from(new Set(tags)));

    console.log("\nReading scratch/default_contrato.docx...");
    const dataBuffer2 = fs.readFileSync('scratch/default_contrato.docx');
    const zip2 = await JSZip.loadAsync(dataBuffer2);
    const docXml2 = zip2.file('word/document.xml') ? await zip2.file('word/document.xml').async('text') : null;
    if (docXml2) {
        const tags2 = docXml2.match(/\{\{[^}]+\}\}/g) || [];
        console.log("Tags found in scratch/default_contrato.docx:", Array.from(new Set(tags2)));
    } else {
        console.log("word/document.xml not found in default_contrato.docx");
    }
}

run().catch(err => console.error(err));
