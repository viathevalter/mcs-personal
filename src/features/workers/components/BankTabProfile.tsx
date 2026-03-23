import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Plus, FileSignature, CheckCircle2, History, UploadCloud } from 'lucide-react';
import { useWorkerIbans } from '../hooks/useWorkerIbans';
import { useWorkerById } from '../hooks/useWorkerById';
import { useWorkerAlocacoes } from '../hooks/useWorkerAlocacoes';
import { useManageWorkerIban } from '../hooks/useManageWorkerIban';
import { AddIbanDialog } from './AddIbanDialog';
import { generateIbanAuthDoc } from '../utils/printIbanAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface BankTabProfileProps {
    workerId: string;
    empresaId: string | null;
}

export function BankTabProfile({ workerId, empresaId }: BankTabProfileProps) {
    // @ts-ignore
    const _empresa = empresaId; // Keeping it for future use.
    
    const { data: ibans, isLoading, isError } = useWorkerIbans(workerId);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { attachDocument, isAttaching } = useManageWorkerIban();

    const { data: worker } = useWorkerById(workerId);
    const { data: alocacoes } = useWorkerAlocacoes(worker?.cod_colab || '');

    if (isLoading) {
        return (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando contas bancárias...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-32 items-center justify-center text-destructive">
                <p>Erro ao carregar o histórico de IBANs.</p>
            </div>
        );
    }

    const activeIban = ibans?.find(i => i.status === 'ATIVO');
    const inactiveIbans = ibans?.filter(i => i.status !== 'ATIVO') || [];

    const handleGeneratePdf = () => {
        if (!worker || !activeIban) {
            alert("Não há IBAN ativo para gerar a carta.");
            return;
        }

        const contratante = alocacoes && alocacoes.length > 0 ? alocacoes[0].contratante : "Mastercorp";

        generateIbanAuthDoc({
            workerNome: worker.nome,
            workerNif: worker.nif || worker.dni || worker.niss || null,
            workerPasaporte: worker.pasaporte || null,
            empresaContratante: contratante,
            banco: activeIban.banco || "Banco Não Informado",
            iban: activeIban.iban || ""
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, ibanId: string) => {
        const file = event.target.files?.[0];
        if (!file || !worker) return;

        // Use the worker's parent company for the storage path
        const empresaIdToUse = worker.empresa_id;

        try {
            await attachDocument({
                id: ibanId,
                worker_id: workerId,
                empresa_id: empresaIdToUse,
                file
            });
            toast.success('Documento anexado com sucesso e classificado como Autorização de IBAN!');
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Erro ao anexar o documento. Tente novamente.');
        } finally {
            event.target.value = ''; // Reset input
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-medium">Contas Bancárias (IBAN)</h3>
                    <p className="text-sm text-muted-foreground">
                        Histórico de contas correntes e documentos de autorização
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Nova Conta
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Conta Ativa */}
                    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <CardTitle className="text-emerald-900 dark:text-emerald-100">Conta Ativa</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activeIban ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800/70 dark:text-emerald-300">Banco</p>
                                        <p className="text-lg font-semibold">{activeIban.banco || '-'}</p>
                                    </div>
                                    <div className="col-span-1">
                                        <p className="text-sm font-medium text-emerald-800/70 dark:text-emerald-300">IBAN</p>
                                        <p className="text-lg font-mono font-semibold">{activeIban.iban}</p>
                                    </div>
                                    {activeIban.observacoes && (
                                        <div className="col-span-2 mt-2">
                                            <p className="text-sm font-medium text-emerald-800/70 dark:text-emerald-300">Observações</p>
                                            <p className="text-sm">{activeIban.observacoes}</p>
                                        </div>
                                    )}
                                    <div className="col-span-2 flex justify-start sm:justify-end mt-4 pt-4 border-t border-emerald-200/50">
                                        {activeIban.documento_url ? (
                                            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                                <a href={activeIban.documento_url} target="_blank" rel="noreferrer">
                                                    <Download className="w-4 h-4 mr-2" /> Ver Autorização
                                                </a>
                                            </Button>
                                        ) : (
                                            <div>
                                                <input 
                                                    type="file" 
                                                    id={`upload-${activeIban.id}`} 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(e, activeIban.id)} 
                                                    accept=".pdf,image/*"
                                                    disabled={isAttaching}
                                                />
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full sm:w-auto text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50" 
                                                    onClick={() => document.getElementById(`upload-${activeIban.id}`)?.click()}
                                                    disabled={isAttaching}
                                                >
                                                    {isAttaching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                                    Anexar Termo Assinado
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-emerald-700/60 dark:text-emerald-400/60">
                                    O trabalhador não possui conta ativa registrada.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Histórico Anterior */}
                    {inactiveIbans.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-muted-foreground" />
                                    <CardTitle>Histórico de Contas (Inativas)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {inactiveIbans.map(ibanItem => (
                                    <div key={ibanItem.id} className="p-4 rounded-md border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-semibold">{ibanItem.banco || 'Banco Não Informado'}</span>
                                                <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground font-medium">
                                                    {ibanItem.status}
                                                </span>
                                            </div>
                                            <p className="font-mono text-sm text-muted-foreground mb-1">{ibanItem.iban}</p>
                                            <p className="text-xs text-muted-foreground flex items-center">
                                                Registrada em {format(new Date(ibanItem.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </p>
                                        </div>
                                        {ibanItem.documento_url ? (
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={ibanItem.documento_url} target="_blank" rel="noreferrer">
                                                    <Download className="w-4 h-4 mr-2" /> Autorização
                                                </a>
                                            </Button>
                                        ) : (
                                            <div className="flex-shrink-0">
                                                <input 
                                                    type="file" 
                                                    id={`upload-${ibanItem.id}`} 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(e, ibanItem.id)} 
                                                    accept=".pdf,image/*"
                                                    disabled={isAttaching}
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                                    onClick={() => document.getElementById(`upload-${ibanItem.id}`)?.click()}
                                                    disabled={isAttaching}
                                                >
                                                    {isAttaching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                                    Anexar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Coluna de Ações */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Documentos</CardTitle>
                            <CardDescription>Gere o termo de autorização para o trabalhador assinar após cadastrar um IBAN ativo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button variant="secondary" className="w-full justify-start" onClick={handleGeneratePdf} disabled={!activeIban}>
                                <FileSignature className="w-4 h-4 mr-2 text-indigo-500" />
                                <div className="flex flex-col items-start text-left">
                                    <span>Gerar Carta PDF</span>
                                    <span className="text-xs font-normal text-muted-foreground">Termo de mudança de IBAN</span>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddIbanDialog 
                open={isAddOpen} 
                onOpenChange={setIsAddOpen} 
                workerId={workerId} 
            />
        </div>
    );
}
