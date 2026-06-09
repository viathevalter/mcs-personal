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
  let changed = false;

  const regexIncidencia = /import\s+\{([^}]*IncidenciaTarefaExpandida[^}]*)\}\s+from\s+['"]([^'"]*)['"]/g;
  if (regexIncidencia.test(content)) {
    content = content.replace(regexIncidencia, (match, p1, p2) => {
      if (!match.includes('import type')) {
         return `import type { ${p1} } from '${p2}'`;
      }
      return match;
    });
    changed = true;
  }

  const regexEmployee = /import\s+\{([^}]*Employee[^}]*)\}\s+from\s+['"]([^'"]*)['"]/g;
  if (regexEmployee.test(content)) {
    content = content.replace(regexEmployee, (match, p1, p2) => {
      if (!match.includes('import type')) {
         return `import type { ${p1} } from '${p2}'`;
      }
      return match;
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
