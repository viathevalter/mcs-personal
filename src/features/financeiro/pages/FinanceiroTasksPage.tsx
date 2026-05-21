import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function FinanceiroTasksPage() {
  return (
    <Layout>
      <DepartmentTaskBoard 
        title="Tarefas Financeiras" 
        departmentCodes={['FINANCEIRO']} 
      />
    </Layout>
  );
}
