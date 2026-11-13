import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';

export function OperacoesTasksPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <DepartmentTaskBoard 
        title={t('torre_controle.department_tasks.title_ops')} 
        departmentCodes={['OPERACOES']} 
      />
    </Layout>
  );
}
