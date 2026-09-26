import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { realizarDevolucao } from '../api/patrimonioApi';
import type { AtivoPatrimonio, PatrimonioStatus } from '../types/patrimonio';
import { RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DevolucaoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativo: AtivoPatrimonio | null;
    onSuccess: () => void;
}

export function DevolucaoDialog({ open, onOpenChange, ativo, onSuccess }: DevolucaoDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [localDevolucao, setLocalDevolucao] = useState('Armazém Central');
    const [estadoEquipamento, setEstadoEquipamento] = useState('Bom estado / Em perfeito funcionamento');
    const [statusFinal, setStatusFinal] = useState<PatrimonioStatus>('disponivel');
    const [observacoes, setObservacoes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo) return;

        setSubmitting(true);
        try {
            await realizarDevolucao(ativo.id, {
                localDevolucao,
                estadoEquipamento,
                statusNovo: statusFinal,
                observacoes,
            });

            toast.success(`Patrimônio ${ativo.codigo_patrimonial} devolvido com sucesso!`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro na devolução:', err);
            toast.error(err?.message || 'Falha ao registrar devolução.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <RotateCcw className="h-5 w-5 text-amber-600" />
                        Registrar Devolução de Patrimônio
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Recebimento de <strong>{ativo?.codigo_patrimonial}</strong> ({ativo?.descricao}) devolvido por{' '}
                        <strong>{ativo?.responsavel_nome || 'Colaborador'}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Local de Armazenamento / Recebimento</Label>
                        <Input
                            placeholder="Ex: Armazém Barcelona, Oficina Central..."
                            value={localDevolucao}
                            onChange={(e) => setLocalDevolucao(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Checklist de Estado do Equipamento</Label>
                        <Input
                            placeholder="Ex: Em bom estado, tela sem riscos, todos acessórios conferidos"
                            value={estadoEquipamento}
                            onChange={(e) => setEstadoEquipamento(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Status Pós-Devolução</Label>
                        <Select value={statusFinal} onValueChange={(val: any) => setStatusFinal(val)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="disponivel">Disponível no Armazém</SelectItem>
                                <SelectItem value="reservado">Reservado para outro projeto</SelectItem>
                                <SelectItem value="aguardando_manutencao">Aguardando Manutenção / Limpeza</SelectItem>
                                <SelectItem value="danificado">Danificado / Avariado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Observações da Devolução</Label>
                        <Textarea
                            placeholder="Acessórios faltantes, avarias ou notas do encarregado..."
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            className="text-xs min-h-[70px]"
                        />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={submitting}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Concluindo...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-3.5 w-3.5" /> Confirmar Devolução
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
