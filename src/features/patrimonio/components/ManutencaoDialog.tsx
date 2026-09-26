import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarManutencao } from '../api/patrimonioApi';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManutencaoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativo: AtivoPatrimonio | null;
    onSuccess: () => void;
}

export function ManutencaoDialog({ open, onOpenChange, ativo, onSuccess }: ManutencaoDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [tipo, setTipo] = useState<'corretiva' | 'preventiva' | 'calibracao' | 'revisao'>('corretiva');
    const [motivo, setMotivo] = useState('');
    const [descricaoProblema, setDescricaoProblema] = useState('');
    const [fornecedorOficina, setFornecedorOficina] = useState('');
    const [custo, setCusto] = useState<number>(0);
    const [previsaoRetorno, setPrevisaoRetorno] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo) return;
        if (!motivo.trim()) {
            toast.error('Informe o motivo ou defeito do equipamento.');
            return;
        }

        setSubmitting(true);
        try {
            await registrarManutencao({
                ativo_id: ativo.id,
                tipo,
                motivo,
                descricao_problema: descricaoProblema,
                fornecedor_oficina: fornecedorOficina,
                custo: Number(custo) || 0,
                data_envio: new Date().toISOString().slice(0, 10),
                previsao_retorno: previsaoRetorno || undefined,
                status: 'em_andamento',
            });

            toast.success(`Patrimônio ${ativo.codigo_patrimonial} enviado para manutenção!`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro na manutenção:', err);
            toast.error(err?.message || 'Falha ao registrar manutenção.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <Wrench className="h-5 w-5 text-rose-600" />
                        Enviar para Manutenção
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Registrar abertura de ordem de serviço para <strong>{ativo?.codigo_patrimonial}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Tipo de Manutenção</Label>
                            <Select value={tipo} onValueChange={(val: any) => setTipo(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="corretiva">Corretiva (Defeito/Avaria)</SelectItem>
                                    <SelectItem value="preventiva">Preventiva (Revisão periódica)</SelectItem>
                                    <SelectItem value="calibracao">Calibração Técnica</SelectItem>
                                    <SelectItem value="revisao">Revisão Geral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Previsão de Retorno</Label>
                            <Input
                                type="date"
                                value={previsaoRetorno}
                                onChange={(e) => setPrevisaoRetorno(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                            Motivo / Falha Apresentada <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            placeholder="Ex: Motor não liga, tela trincada, bateria viciada..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Oficina / Fornecedor do Reparo</Label>
                            <Input
                                placeholder="Ex: Assistência Autorizada Samsung, Oficina Bosch..."
                                value={fornecedorOficina}
                                onChange={(e) => setFornecedorOficina(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Orçamento Estimado (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={custo || ''}
                                onChange={(e) => setCusto(parseFloat(e.target.value) || 0)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Detalhes Técnicos do Problema</Label>
                        <Textarea
                            placeholder="Descreva o que aconteceu, condições do envio ou orientações..."
                            value={descricaoProblema}
                            onChange={(e) => setDescricaoProblema(e.target.value)}
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
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...
                                </>
                            ) : (
                                <>
                                    <Wrench className="h-3.5 w-3.5" /> Enviar para Reparo
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
