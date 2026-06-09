const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dirPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

async function run() {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx'));
  
  for (const file of files) {
    console.log(`\n=========================================`);
    console.log(`INSPECTING SURROUNDINGS IN: ${file}`);
    console.log(`=========================================`);
    
    const filePath = path.join(dirPath, file);
    const dataBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(dataBuffer);
    
    const docXml = await zip.file('word/document.xml').async('text');
    
    // Find index of "PERFIL" or "PERFIL_1"
    let index = docXml.indexOf('PERFIL');
    if (index === -1) index = docXml.indexOf('perfil');
    
    if (index !== -1) {
      const start = Math.max(0, index - 200);
      const end = Math.min(docXml.length, index + 300);
      console.log("Found surrounding XML:");
      console.log(docXml.substring(start, end));
    } else {
      console.log("PERFIL tag not found in XML.");
    }
  }
}

run().catch(err => console.error(err));
