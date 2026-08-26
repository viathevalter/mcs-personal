import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function LogisticaTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tareas de Logística" 
        departmentCodes={['LOGISTICA']} 
      />
    </Layout>
  );
}
