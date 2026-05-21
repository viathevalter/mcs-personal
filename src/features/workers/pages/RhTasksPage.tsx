import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function RhTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tarefas de RH e Recrutamento" 
        departmentCodes={['RH']} 
      />
    </Layout>
  );
}
