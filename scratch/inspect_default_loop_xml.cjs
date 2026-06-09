const fs = require('fs');
const JSZip = require('jszip');

async function run() {
    const dataBuffer = fs.readFileSync('scratch/default.docx');
    const zip = await JSZip.loadAsync(dataBuffer);
    const docXml = await zip.file('word/document.xml').async('text');
    
    const index = docXml.indexOf('itens');
    if (index !== -1) {
        console.log("Found 'itens' in scratch/default.docx at index", index);
        console.log(docXml.substring(index - 500, index + 1500));
    } else {
        console.log("'itens' not found in scratch/default.docx XML");
    }
}

run().catch(err => console.error(err));
