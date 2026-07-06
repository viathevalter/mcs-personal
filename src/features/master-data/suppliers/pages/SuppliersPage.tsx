import { useTranslation } from 'react-i18next';
import { SuppliersDataTable } from '../components/SuppliersDataTable';

export function SuppliersPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('masterData.suppliers.title', { defaultValue: 'Gestão de Fornecedores' })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('masterData.suppliers.subtitle', { defaultValue: 'Cadastre os parceiros de negócio e fornecedores do grupo.' })}
        </p>
      </div>

      <SuppliersDataTable />
    </div>
  );
}
