
import { useParams, useNavigate } from 'react-router-dom';
import { useJobFunction } from '../hooks/useJobFunction';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GeneralDataForm } from '../components/GeneralDataForm';
import { QuestionsTab } from '../components/QuestionsTab';
import { EpisTab } from '../components/EpisTab';
import { RatesTab } from '../components/RatesTab';
import { HistoryTab } from '../components/HistoryTab';

export function JobFunctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobFunction, isLoading, error } = useJobFunction(id);

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => navigate('/master-data/job-functions')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Erro ao carregar a função: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!jobFunction) {
    return <div className="p-6">Função não encontrada.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/master-data/job-functions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {jobFunction.name}
            {jobFunction.status === 'archived' && (
              <Badge variant="destructive">Arquivada</Badge>
            )}
            {jobFunction.status === 'inactive' && (
              <Badge variant="secondary">Inativa</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Código: {jobFunction.code}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md border p-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="general" className="py-2">Dados Gerais</TabsTrigger>
            <TabsTrigger value="questions" className="py-2">Perguntas Técnicas</TabsTrigger>
            <TabsTrigger value="epis" className="py-2">EPIs Obrigatórios</TabsTrigger>
            <TabsTrigger value="rates" className="py-2">Tarifas e Custos</TabsTrigger>
            <TabsTrigger value="history" className="py-2">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <GeneralDataForm jobFunction={jobFunction} />
          </TabsContent>

          <TabsContent value="questions" className="mt-0">
            {jobFunction.id && <QuestionsTab jobFunctionId={jobFunction.id} />}
          </TabsContent>

          <TabsContent value="epis" className="mt-0">
            {jobFunction.id && <EpisTab jobFunctionId={jobFunction.id} />}
          </TabsContent>

          <TabsContent value="rates" className="mt-0">
            {jobFunction.id && <RatesTab jobFunctionId={jobFunction.id} />}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {jobFunction.id && <HistoryTab jobFunctionId={jobFunction.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
