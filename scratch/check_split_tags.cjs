const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dirPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

async function run() {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx'));
  
  for (const file of files) {
    console.log(`\n=========================================`);
    console.log(`CHECKING SPLITS IN: ${file}`);
    console.log(`=========================================`);
    
    const filePath = path.join(dirPath, file);
    const dataBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(dataBuffer);
    
    const docXml = await zip.file('word/document.xml').async('text');
    
    // Check if the strings exist exactly
    const checkTags = ['PERFIL', 'CANTIDAD', 'TARIFA_HORA', 'OBSERVACION_PERFIL', 'PERFIL_1', 'CANTIDAD_1', 'TARIFA_HORA_1', 'OBS_PERFIL_1'];
    
    for (const tag of checkTags) {
      if (docXml.includes(tag)) {
        console.log(`Tag text "${tag}" is found as a contiguous string.`);
        // Let's see if the surrounding curly braces are contiguous too
        const fullTag = `{{${tag}}}`;
        if (docXml.includes(fullTag)) {
          console.log(`  EXACT MATCH: "${fullTag}" is contiguous!`);
        } else {
          console.log(`  WARNING: "${fullTag}" is SPLIT by XML elements!`);
          // Let's print the match area
          const idx = docXml.indexOf(tag);
          console.log(`  Surroundings: "${docXml.substring(idx - 30, idx + tag.length + 30)}"`);
        }
      }
    }
  }
}

run().catch(err => console.error(err));
