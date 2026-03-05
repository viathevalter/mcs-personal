import { useParams, useNavigate } from 'react-router-dom';
import { useWorkerById } from './hooks/useWorkerById';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';

// Components for tabs
import { OverviewTab } from './components/OverviewTab';
import { BenefitsTab } from './components/BenefitsTab';
import { LedgerTab } from './components/LedgerTab';
import { DocumentsTab } from './components/DocumentsTab';
import { VidaLaboralTab } from './components/VidaLaboralTab';
import { AlocacoesTab } from './components/AlocacoesTab';
import { EditWorkerDialog } from './components/EditWorkerDialog';

export function WorkerDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: worker, isLoading, isError, error } = useWorkerById(id);

    if (id === 'new') {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/workers')} className="mb-4 -ml-3">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
                </Button>
                <div className="rounded-md bg-muted p-8 text-center border">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Novo Trabalhador</h2>
                    <p className="text-muted-foreground">
                        A funcionalidade de criação de trabalhadores está em desenvolvimento.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Carregando perfil do trabalhador...</p>
            </div>
        );
    }

    if (isError || !worker) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
                    <h2 className="text-lg font-semibold">Erro ao carregar o trabalhador</h2>
                    <p>{error?.message || 'Trabalhador não encontrado.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/workers')} className="mb-6 -ml-3">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
            </Button>

            <header className="mb-8 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {worker.foto ? (
                        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                            <img src={worker.foto} alt={worker.nome} className="h-full w-full object-cover" />
                        </div>
                    ) : (
                        <div className="h-16 w-16 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {worker.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{worker.nome}</h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Cód: <span className="font-semibold">{worker.cod_colab}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <EditWorkerDialog worker={worker} />
                    {worker.status_seguridad && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Legal</span>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${worker.status_seguridad.toLowerCase().includes('alta') ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                                {worker.status_seguridad}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 border overflow-x-auto flex w-full justify-start h-12">
                    <TabsTrigger value="overview" className="flex-1 whitespace-nowrap">Visão Geral</TabsTrigger>
                    <TabsTrigger value="vida_laboral" className="flex-1 whitespace-nowrap">Vida Laboral</TabsTrigger>
                    <TabsTrigger value="alocacoes" className="flex-1 whitespace-nowrap">Alocações</TabsTrigger>
                    <TabsTrigger value="benefits" className="flex-1 whitespace-nowrap">Benefícios</TabsTrigger>
                    <TabsTrigger value="ledger" className="flex-1 whitespace-nowrap">Conta Corrente</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 whitespace-nowrap">Documentos</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <OverviewTab worker={worker} />
                </TabsContent>

                <TabsContent value="vida_laboral">
                    <VidaLaboralTab workerId={worker.id} />
                </TabsContent>

                <TabsContent value="alocacoes">
                    <AlocacoesTab workerCodColab={worker.cod_colab} />
                </TabsContent>

                <TabsContent value="benefits">
                    <BenefitsTab workerId={worker.id} empresaId={worker.empresa_id} />
                </TabsContent>

                <TabsContent value="ledger">
                    <LedgerTab workerId={worker.id} empresaId={worker.empresa_id} />
                </TabsContent>

                <TabsContent value="documents">
                    <DocumentsTab workerId={worker.id} empresaId={worker.empresa_id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
