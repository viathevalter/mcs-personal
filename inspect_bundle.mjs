import fs from 'fs';

const docxPreviewCode = fs.readFileSync('node_modules/docx-preview/dist/docx-preview.mjs', 'utf8');
console.log("Searching for counter in docx-preview:");
const lines = docxPreviewCode.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('counter') || lines[i].includes('num-') || lines[i].includes('numbering')) {
        console.log(`Line ${i}: ${lines[i].substring(0, 200)}`);
    }
}
