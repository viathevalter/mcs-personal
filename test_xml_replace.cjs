const fs = require('fs');
const JSZip = require('jszip');

const docxPath = 'C:\\Projetos IA\\ContratosTrabalhador\\Stocco\\CONTRATO TERMO INCERTO - STOCCO.docx';
const outputPath = 'c:\\Projetos IA\\Kotrik\\mcs-personal\\test_replaced.docx';

const dict = {
  'Nombre': 'DARWIN FABIAN DELGADILLO GOMEZ',
  'fecha_nascimento': '04/01/1971',
  'Passaporte': '0cxfffsfss',
  'Domicilio': 'Rua da Alegria, 456, Porto',
  'funcion': 'Eletricista de Primeira',
  'Cliente': 'Mestre e Eletro SA',
  'endereco': 'Vila Nova de Gaia',
  'fecha_inicio': '13/06/2026',
  'Fecha_Assinatura_PT': '13 de Junho de 2026',
  'Fecha_Assinatura_ESP': '13 de Junio de 2026'
};

async function run() {
  if (!fs.existsSync(docxPath)) {
    console.error("File not found:", docxPath);
    return;
  }
  const fileBuffer = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(fileBuffer);
  let docXml = await zip.file('word/document.xml').async('string');
  
  // Regex to match bracket placeholders (possibly split by XML tags)
  const regex = /\[(?:<[^>]+>|[^\]])*\]/g;
  
  let replacedCount = 0;
  
  docXml = docXml.replace(regex, (match) => {
    // Extract the plain text placeholder name
    const plainText = match.replace(/<[^>]+>/g, '');
    const cleanKey = plainText.replace(/[\[\]]/g, '').trim();
    
    if (dict.hasOwnProperty(cleanKey)) {
      console.log(`Replacing key "${cleanKey}" -> "${dict[cleanKey]}"`);
      replacedCount++;
      // Return the clean replacement wrapped in XML run and text tags
      return `</w:t></w:r><w:r><w:t>${dict[cleanKey]}</w:t></w:r><w:r><w:t>`;
    }
    
    // If it's not in the dictionary, return the original XML match untouched
    return match;
  });
  
  console.log(`Total replacements: ${replacedCount}`);
  
  zip.file('word/document.xml', docXml);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved replaced file to: ${outputPath}`);
}

run();
