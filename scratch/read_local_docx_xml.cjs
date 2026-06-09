const fs = require('fs');
const JSZip = require('jszip');

async function run() {
    console.log("Reading local default.docx...");
    const dataBuffer = fs.readFileSync('default.docx');
    const zip = await JSZip.loadAsync(dataBuffer);
    const docXml = await zip.file('word/document.xml').async('text');
    console.log("word/document.xml content:");
    console.log(docXml);
}

run().catch(err => console.error(err));
