import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function OperacoesTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tarefas Operacionais" 
        departmentCodes={['OPERACOES']} 
      />
    </Layout>
  );
}
