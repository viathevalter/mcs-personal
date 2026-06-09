const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}
const files = walk('./src/features/operacoes');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const regex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*\/models)['"]/g;
  if (regex.test(content)) {
    content = content.replace(regex, 'import type { $1 } from \'$2\'');
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
