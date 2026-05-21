import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function ComercialTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tarefas Comerciais" 
        departmentCodes={['COMERCIAL']} 
      />
    </Layout>
  );
}
