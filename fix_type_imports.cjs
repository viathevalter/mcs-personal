const fs = require('fs');

const files = [
  './src/features/operacoes/pages/Playbooks.tsx',
  './src/features/operacoes/pages/IncidenciaDetail.tsx',
  './src/features/operacoes/pages/admin/Funcionarios.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace "import type { SomeService" with "import { SomeService"
    // Also handle cases where there are multiple imports like "import type { SomeService, SomeModel }"
    content = content.replace(/import type\s*\{\s*([a-zA-Z0-9_]+Service)\s*\}/g, "import { $1 }");
    
    // For mixed imports like "import type { SomeService, Model }" -> This requires splitting, but since we know the specific cases, we can be robust:
    content = content.replace(/import type\s*\{\s*([a-zA-Z0-9_]+Service)\s*,\s*([a-zA-Z0-9_,\s]+)\s*\}/g, "import { $1 } from '$3';\nimport type { $2 }");
    // Actually the regex above is slightly flawed because it needs the file path. Let's just do a simpler targeted replace.
    
    // Targeted replace for known services:
    content = content.replace(/import type\s*\{\s*playbookStepService\s*\}/g, "import { playbookStepService }");
    content = content.replace(/import type\s*\{\s*playbookService\s*\}/g, "import { playbookService }");
    content = content.replace(/import type\s*\{\s*supabaseEmployeeService\s*,\s*Employee\s*\}/g, "import { supabaseEmployeeService } from '../services/db/SupabaseEmployeeService';\nimport type { Employee }");
    content = content.replace(/import type\s*\{\s*supabaseEmployeeService\s*\}/g, "import { supabaseEmployeeService }");
    content = content.replace(/import type\s*\{\s*departmentService\s*\}/g, "import { departmentService }");
    
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
