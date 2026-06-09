const fs = require('fs');

const pages = [
  './src/features/operacoes/pages/Estimaciones.tsx',
  './src/features/operacoes/pages/Pedidos.tsx',
  './src/features/operacoes/pages/Operacao.tsx'
];

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Add import if not present
  if (!content.includes('useOutletContext')) {
    content = content.replace(/import React/, "import React from 'react';\nimport { useOutletContext } from 'react-router-dom';\n//");
    content = content.replace(/import React(?! from)/g, "import React");
  }

  // Remove Props from signature and replace with OutletContext
  // e.g. export const Estimaciones: React.FC<EstimacionesProps> = ({ filters, setFilters }) => {
  const compRegex = /export const (\w+):\s*React\.FC<[^>]+>\s*=\s*\(\{\s*filters,\s*setFilters\s*\}\)\s*=>\s*\{/g;
  
  content = content.replace(compRegex, (match, compName) => {
    return `export const ${compName}: React.FC = () => {\n  const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();`;
  });

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
