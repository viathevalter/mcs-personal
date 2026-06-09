import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';
import { useTranslation } from 'react-i18next';

export function ComercialTasksPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <DepartmentTaskBoard 
        title={t('comercial.tasks.title')} 
        departmentCodes={['COMERCIAL']} 
      />
    </Layout>
  );
}
