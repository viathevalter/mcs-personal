const fs = require('fs');
const path = require('path');

function searchInDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        searchInDir(full, query);
      } else if (stat.isFile() && (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.cjs') || f.endsWith('.json') || f.endsWith('.env'))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes(query)) {
          console.log(`Found "${query}" in: ${full}`);
        }
      }
    } catch (e) {}
  }
}

console.log("Searching for 'gpt-5.6'...");
searchInDir('c:\\Projetos IA\\Kotrik\\mcs-personal', 'gpt-5.6');
searchInDir('c:\\Projetos IA\\Kotrik\\mcs-personal', 'sol');
console.log("Search finished.");
