import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function LogisticaTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tarefas de Logística" 
        departmentCodes={['LOGISTICA']} 
      />
    </Layout>
  );
}
