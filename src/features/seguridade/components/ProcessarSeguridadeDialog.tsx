import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { updateSeguridadeStatus } from '../api/seguridadeApi';
import { uploadWorkerDocument } from '../../workers/api/documentsApi';
import type { SeguridadeStatusWithWorker, StatusWorkflowSeguridade } from '@/shared/types/corePersonal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsTab } from '../../workers/components/DocumentsTab';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

interface ProcessarSeguridadeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    item: SeguridadeStatusWithWorker | null;
}

const CopyableField = ({ label, value }: { label: string, value?: string | null }) => {
    const displayValue = value || 'Não informada';
    return (
        <div className="flex items-start gap-1.5 text-xs">
            <span className="font-medium text-foreground whitespace-nowrap mt-0.5">{label}:</span>
            <span className={`flex-1 break-words mt-0.5 ${!value ? 'text-muted-foreground/50 italic' : 'text-muted-foreground'}`} title={displayValue}>{displayValue}</span>
            {value && (
                <button 
                    type="button" 
                    onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(value);
                        toast.success(`${label} copiado!`);
                    }}
                    className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0 p-0.5 focus:outline-none"
                    title="Copiar"
                >
                    <Copy className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

export function ProcessarSeguridadeDialog({ isOpen, onClose, item }: ProcessarSeguridadeDialogProps) {
    const queryClient = useQueryClient();
    const { selectedEmpresaId } = useEmpresa();
    const [status, setStatus] = useState<StatusWorkflowSeguridade | ''>('');
    const [dataEfetiva, setDataEfetiva] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (item) {
            setStatus(item.status === 'pendente' ? 'confirmado' : item.status);
            setDataEfetiva(item.data_efetiva ? item.data_efetiva.substring(0, 10) : new Date().toISOString().substring(0, 10));
            setObservacoes(item.observacoes || '');
            setFile(null);
        }
    }, [item]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!item || !status) throw new Error('Dados inválidos');
            
            await updateSeguridadeStatus(item.id, status as StatusWorkflowSeguridade, dataEfetiva || undefined, observacoes || undefined);
            
            if (file) {
                await uploadWorkerDocument({
                    empresaId: selectedEmpresaId || item.empresa_id,
                    workerId: item.worker.id,
                    docType: item.tipo_evento === 'alta' ? 'doc_alta_seguridade' : 'doc_baixa_seguridade',
                    file: file
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seguridade-status', selectedEmpresaId] });
            queryClient.invalidateQueries({ queryKey: ['worker_documents', item?.worker.id] });
            toast.success('Processo atualizado com sucesso!');
            onClose();
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao atualizar o processo.');
        }
    });

    if (!item) return null;

    const isAlta = item.tipo_evento === 'alta';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tratar Processo de Seguridade</DialogTitle>
                    <DialogDescription>
                        Atualize a pendência do trabalhador junto à Segurança Social ou Mutua.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="detalhes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="detalhes">Detalhes do Processo</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos do Trabalhador</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="grid gap-3 py-2">
                        {/* Worker Info */}
                        <div className="rounded-md bg-muted p-3 text-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Badge variant={isAlta ? 'default' : 'destructive'} className="uppercase">
                                {item.tipo_evento}
                            </Badge>
                            <span className="font-semibold">{item.worker.nome}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 bg-background/50 p-2.5 rounded border border-border/50">
                            <CopyableField label="Cód" value={item.worker.cod_colab} />
                            <CopyableField label="NISS" value={item.worker.niss} />
                            <CopyableField label="DNI/NIE" value={item.worker.dni || item.worker.nie} />
                            <CopyableField 
                                label="Nascimento" 
                                value={item.worker.fecha_nacimiento ? new Date(item.worker.fecha_nacimiento).toLocaleDateString('pt-BR') : null} 
                            />
                            <CopyableField label="Função" value={item.worker.funcion} />
                            <CopyableField 
                                label="Contratação" 
                                value={item.worker.data_ingresso ? new Date(item.worker.data_ingresso).toLocaleDateString('pt-BR') : null} 
                            />
                            <CopyableField 
                                label="Data Baixa" 
                                value={item.worker.data_baixa ? new Date(item.worker.data_baixa).toLocaleDateString('pt-BR') : null} 
                            />
                            <CopyableField label="Contratante" value={item.origem_contratante || item.worker.contratante} />
                            <div className="sm:col-span-2">
                                <CopyableField label="Cliente" value={item.origem_cliente_nome} />
                            </div>
                        </div>

                        {/* Histórico da Inativação / Alta */}
                        {(item.hist_data_efetiva || item.hist_observacoes) && (
                            <div className="border border-border/50 bg-background/50 rounded p-2.5 mt-2 space-y-2">
                                <p className="text-xs font-semibold text-foreground/80 border-b border-border/50 pb-1">
                                    Histórico de {isAlta ? 'Alta' : 'Baixa'} (Trabalhador)
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    <CopyableField 
                                        label="Data do Evento" 
                                        value={item.hist_data_efetiva ? new Date(item.hist_data_efetiva).toLocaleDateString('pt-BR') : null} 
                                    />
                                    <CopyableField label="Motivo/Obs" value={item.hist_observacoes} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Novo Status *</label>
                            <Select value={status} onValueChange={(val) => setStatus(val as StatusWorkflowSeguridade)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente (Reverter)</SelectItem>
                                    <SelectItem value="confirmado">Confirmado (Concluído)</SelectItem>
                                    <SelectItem value="erro">Em Erro / Requer Atenção</SelectItem>
                                    <SelectItem value="cancelado">Encerrado / Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data Efetiva Resolvida</label>
                            <Input 
                                type="date" 
                                value={dataEfetiva} 
                                onChange={(e) => setDataEfetiva(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-medium">Observações / Anotações</label>
                            <Textarea 
                                placeholder="Insira detalhes sobre a resolução ou erro do trâmite contábil..." 
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                className="resize-none"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-medium">Anexar Comprovante (Opcional)</label>
                            <Input 
                                type="file" 
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.png,.jpg,.jpeg"
                            />
                        </div>
                    </div>
                    </TabsContent>
                    
                    <TabsContent value="documentos" className="py-2">
                        <DocumentsTab workerId={item.worker.id} empresaId={selectedEmpresaId || item.empresa_id} />
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={() => mutation.mutate()} 
                        disabled={mutation.isPending || status === ''}
                    >
                        {mutation.isPending ? 'Salvando...' : 'Salvar Alteração'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
