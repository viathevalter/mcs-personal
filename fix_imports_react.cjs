const fs = require('fs');

const pages = [
  './src/features/operacoes/pages/Estimaciones.tsx',
  './src/features/operacoes/pages/Pedidos.tsx',
  './src/features/operacoes/pages/Operacao.tsx'
];

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the broken import
  const regexBroken = /import React from 'react';\nimport \{ useOutletContext \} from 'react-router-dom';\n\/\/, \{ ([^}]+) \} from 'react';/;
  if (regexBroken.test(content)) {
    content = content.replace(regexBroken, "import React, { $1 } from 'react';\nimport { useOutletContext } from 'react-router-dom';");
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
