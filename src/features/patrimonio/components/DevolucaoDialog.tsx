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
    const [localDevolucao, setLocalDevolucao] = useState('Almacén Central');
    const [estadoEquipamento, setEstadoEquipamento] = useState('Buen estado / En perfecto funcionamiento');
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

            toast.success(`¡Activo ${ativo.codigo_patrimonial} devuelto con éxito!`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro na devolução:', err);
            toast.error(err?.message || 'Error al registrar la devolución.');
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
                        Registrar Devolución de Activo
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Recepción de <strong>{ativo?.codigo_patrimonial}</strong> ({ativo?.descricao}) devuelto por{' '}
                        <strong>{ativo?.responsavel_nome || 'Empleado'}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Lugar de Almacenamiento / Recepción</Label>
                        <Input
                            placeholder="Ej: Almacén Barcelona, Taller Central..."
                            value={localDevolucao}
                            onChange={(e) => setLocalDevolucao(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Checklist del Estado del Equipo</Label>
                        <Input
                            placeholder="Ej: En buen estado, pantalla sin rasguños, todos los accesorios verificados"
                            value={estadoEquipamento}
                            onChange={(e) => setEstadoEquipamento(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Estado Posterior a la Devolución</Label>
                        <Select value={statusFinal} onValueChange={(val: any) => setStatusFinal(val)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="disponivel">Disponible en Almacén</SelectItem>
                                <SelectItem value="reservado">Reservado para otro proyecto</SelectItem>
                                <SelectItem value="aguardando_manutencao">Pendiente de Mantenimiento / Limpieza</SelectItem>
                                <SelectItem value="danificado">Dañado / Avariado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Observaciones de la Devolución</Label>
                        <Textarea
                            placeholder="Accesorios faltantes, desperfectos o notas del encargado..."
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
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finalizando...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-3.5 w-3.5" /> Confirmar Devolución
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
