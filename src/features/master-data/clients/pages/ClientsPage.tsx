import { useTranslation } from 'react-i18next';
import { ClientsDataTable } from '../components/ClientsDataTable';

export function ClientsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('masterData.clientes.title', { defaultValue: 'Gestão de Clientes' })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('masterData.clientes.subtitle', { defaultValue: 'Cadastre e gerencie as empresas clientes do grupo.' })}
        </p>
      </div>

      <ClientsDataTable />
    </div>
  );
}
