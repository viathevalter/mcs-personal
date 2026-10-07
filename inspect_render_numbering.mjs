import fs from 'fs';

const docxPreviewCode = fs.readFileSync('node_modules/docx-preview/dist/docx-preview.mjs', 'utf8');
const lines = docxPreviewCode.split('\n');
console.log(lines.slice(3235, 3290).join('\n'));
