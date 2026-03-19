import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSeguridadeStatus } from '../api/seguridadeApi';
import { uploadWorkerDocument } from '../../workers/api/documentsApi';
import type { SeguridadeStatusWithWorker, StatusWorkflowSeguridade } from '@/shared/types/corePersonal';
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
                    docType: item.tipo_evento === 'alta' ? 'Comprovante_Alta' : 'Comprovante_Baixa',
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tratar Processo de Seguridade</DialogTitle>
                    <DialogDescription>
                        Atualize a pendência do trabalhador junto à Segurança Social ou Mutua.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Worker Info */}
                    <div className="rounded-md bg-muted p-3 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant={isAlta ? 'default' : 'destructive'} className="uppercase">
                                {item.tipo_evento}
                            </Badge>
                            <span className="font-semibold">{item.worker.nome}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground mt-2">
                            <div><span className="font-medium mr-1 text-foreground">Cód:</span>{item.worker.cod_colab}</div>
                            {item.worker.niss && <div><span className="font-medium mr-1 text-foreground">NISS:</span>{item.worker.niss}</div>}
                            {item.worker.dni && <div><span className="font-medium mr-1 text-foreground">DNI:</span>{item.worker.dni}</div>}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
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
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Observações / Anotações</label>
                            <Textarea 
                                placeholder="Insira detalhes sobre a resolução ou erro do trâmite contábil..." 
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Anexar Comprovante (Opcional)</label>
                            <Input 
                                type="file" 
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.png,.jpg,.jpeg"
                            />
                        </div>
                    </div>
                </div>

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
