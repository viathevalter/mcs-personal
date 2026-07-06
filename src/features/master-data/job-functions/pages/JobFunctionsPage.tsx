import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useJobFunctions } from '../hooks/useJobFunctions';
import { useMutateJobFunction } from '../hooks/useMutateJobFunction';
import { JobFunctionsDataTable } from '../components/JobFunctionsDataTable';
import { JobFunctionsKPIs } from '../components/JobFunctionsKPIs';
import { CreateJobFunctionSheet } from '../components/CreateJobFunctionSheet';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function JobFunctionsPage() {
  const { t } = useTranslation();
  const { data: jobFunctions = [], isLoading, error } = useJobFunctions();
  const { archiveJobFunction } = useMutateJobFunction();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = jobFunctions.filter(job => 
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {t('masterData.jobFunctions.load_error', { defaultValue: 'Erro ao carregar as funções:' })} {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('masterData.jobFunctions.title', { defaultValue: 'Perfis Profissionais' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('masterData.jobFunctions.subtitle', { defaultValue: 'Gerencie as funções, riscos, EPIs obrigatórios e tarifas de referência.' })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateJobFunctionSheet />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <JobFunctionsKPIs data={jobFunctions} />
      )}

      <div className="flex items-center space-x-2 bg-white p-4 rounded-md border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('masterData.jobFunctions.searchPlaceholder', { defaultValue: 'Buscar por código ou nome...' })}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <JobFunctionsDataTable data={filteredData} onArchive={archiveJobFunction} />
      )}
    </div>
  );
}
