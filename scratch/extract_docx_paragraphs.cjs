const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dirPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

function cleanXmlText(xml) {
  return xml.replace(/<[^>]+>/g, '');
}

async function run() {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx'));
  
  for (const file of files) {
    console.log(`\n=========================================`);
    console.log(`PARAGRAPHS WITH TAGS IN: ${file}`);
    console.log(`=========================================`);
    
    const filePath = path.join(dirPath, file);
    const dataBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(dataBuffer);
    
    const docXml = await zip.file('word/document.xml').async('text');
    
    // We can extract all <w:p> tags
    const pRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let match;
    let count = 0;
    while ((match = pRegex.exec(docXml)) !== null) {
      const pContent = match[1];
      if (pContent.includes('{{') || pContent.includes('}}')) {
        const text = cleanXmlText(pContent).trim();
        if (text) {
          console.log(`P[${count++}]: "${text}"`);
        }
      }
    }
  }
}

run().catch(err => console.error(err));
