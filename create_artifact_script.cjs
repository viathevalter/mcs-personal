const fs = require('fs');

const sql = fs.readFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps_full.sql', 'utf8');

const mdContent = `---
summary: "Script SQL para importar as categorias da planilha"
user_facing: true
request_feedback: false
---

# Importar Categorias da Planilha

Execute o código abaixo no SQL Editor do Supabase do seu ambiente atual para criar as tabelas com a nova estrutura (incluindo Códigos SNC) e inserir as 61 categorias.

\`\`\`sql
${sql}
\`\`\`
`;

fs.writeFileSync('C:/Users/User03/.gemini/antigravity/brain/14f38d78-79c9-4a47-b370-957b361cc776/import_categorias_spreadsheet.md', mdContent, 'utf8');
console.log('Artifact created successfully.');
