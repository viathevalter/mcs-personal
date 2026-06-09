const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dirPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

function cleanXmlText(xml) {
  // strip XML tags to get raw text
  return xml.replace(/<[^>]+>/g, '');
}

async function run() {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx'));
  
  for (const file of files) {
    console.log(`\n=========================================`);
    console.log(`ANALYZING: ${file}`);
    console.log(`=========================================`);
    
    const filePath = path.join(dirPath, file);
    const dataBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(dataBuffer);
    
    const docXml = await zip.file('word/document.xml').async('text');
    const rawText = cleanXmlText(docXml);
    
    // Find all patterns of placeholders:
    // 1. Double curly braces: {{...}}
    // 2. Single curly braces: {...}
    // 3. Square brackets: [...]
    // 4. Greater/less than: <...>
    
    const curlyDouble = rawText.match(/\{\{[^}]+\}\}/g) || [];
    const squareBrackets = rawText.match(/\[[^\]\r\n]{3,60}\]/g) || [];
    const angleBrackets = rawText.match(/<[^>\r\n]{3,60}>/g) || [];
    
    console.log(`Double Curly Braces {{...}} found (${curlyDouble.length}):`);
    if (curlyDouble.length > 0) {
      console.log(Array.from(new Set(curlyDouble)).join(', '));
    } else {
      console.log("None");
    }

    console.log(`\nSquare Brackets [...] found (${squareBrackets.length}):`);
    if (squareBrackets.length > 0) {
      console.log(Array.from(new Set(squareBrackets)).join(', '));
    } else {
      console.log("None");
    }

    console.log(`\nAngle Brackets <...> found (${angleBrackets.length}):`);
    if (angleBrackets.length > 0) {
      console.log(Array.from(new Set(angleBrackets)).join(', '));
    } else {
      console.log("None");
    }
  }
}

run().catch(err => console.error(err));
