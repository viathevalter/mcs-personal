const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const basePath = 'C:\\Projetos IA\\ContratosTrabalhador';

// Function to find placeholders in a docx file
async function inspectFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);
  
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Clean up XML tags to merge text
  // This strips all XML tags, leaving only the text.
  // We need to keep brackets.
  // If we strip all tags, `<w:t>abc</w:t><w:t>def</w:t>` becomes `abcdef`
  const textContent = docXml.replace(/<[^>]+>/g, '');
  
  // Find all matches for [something]
  // Match brackets containing letters, numbers, underscores, and spaces
  const matches = textContent.match(/\[[a-zA-Z0-9_\-\sà-úÀ-Ú\(\)]+\]/g) || [];
  return [...new Set(matches)];
}

async function run() {
  const files = [];
  
  function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.docx')) {
        files.push(fullPath);
      }
    });
  }
  
  walk(basePath);
  console.log(`Found ${files.length} docx files.`);
  
  const allPlaceholders = new Set();
  
  for (const f of files) {
    const relative = path.relative(basePath, f);
    try {
      const placeholders = await inspectFile(f);
      console.log(`- ${relative}:`, placeholders.join(', '));
      placeholders.forEach(p => allPlaceholders.add(p));
    } catch (e) {
      console.error(`Error reading ${relative}:`, e.message);
    }
  }
  
  console.log("\n=== ALL UNIQUE PLACEHOLDERS ===");
  console.log(Array.from(allPlaceholders).sort());
}

run();
