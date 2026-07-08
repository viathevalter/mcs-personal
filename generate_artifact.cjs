const fs = require('fs');
const sql = fs.readFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps_full.sql', 'utf8');

const markdown = `
# Script de Importação de Categorias

Copie e cole o código abaixo no SQL Editor do seu Supabase para criar as tabelas com os novos campos da planilha e importar todas as 61 categorias originais.

\`\`\`sql
${sql}
\`\`\`
`;

const artifactData = {
    Summary: "SQL script for importing categories from the Excel spreadsheet",
    UserFacing: true,
    RequestFeedback: false
};

const artifactPath = 'C:/Users/User03/.gemini/antigravity/brain/14f38d78-79c9-4a47-b370-957b361cc776/import_categorias_spreadsheet.md';
// Normally we write the artifact content directly via write_to_file, but since the SQL content is in a file, I'm doing it via script. Wait, I can just use write_to_file directly!
