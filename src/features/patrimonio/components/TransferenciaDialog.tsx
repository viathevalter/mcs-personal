import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { realizarTransferencia } from '../api/patrimonioApi';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransferenciaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativo: AtivoPatrimonio | null;
    onSuccess: () => void;
}

export function TransferenciaDialog({ open, onOpenChange, ativo, onSuccess }: TransferenciaDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [novoProjeto, setNovoProjeto] = useState('');
    const [novaLocalizacao, setNovaLocalizacao] = useState('');
    const [coordenadorNome, setCoordenadorNome] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo) return;
        if (!novoProjeto.trim()) {
            toast.error('Indique el nuevo proyecto u obra.');
            return;
        }

        setSubmitting(true);
        try {
            await realizarTransferencia(ativo.id, {
                novoProjeto,
                novaLocalizacao: novaLocalizacao || novoProjeto,
                coordenadorNome,
                observacoes,
            });

            toast.success(`¡Activo ${ativo.codigo_patrimonial} transferido con éxito!`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro na transferência:', err);
            toast.error(err?.message || 'Error al transferir el activo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <RefreshCw className="h-5 w-5 text-blue-600" />
                        Transferir Activo
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Cambiar proyecto y ubicación física de <strong>{ativo?.codigo_patrimonial}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                            Nuevo Proyecto / Obra <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            placeholder="Ej: Proyecto Sagunto, Tarragona, Taller Barcelona..."
                            value={novoProjeto}
                            onChange={(e) => setNovoProjeto(e.target.value)}
                            className="h-9 text-xs"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nueva Ubicación Física</Label>
                        <Input
                            placeholder="Ej: Frente de Obra 02, Oficina Planta 3..."
                            value={novaLocalizacao}
                            onChange={(e) => setNovaLocalizacao(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nuevo Coordinador Responsable</Label>
                        <Input
                            placeholder="Dejar en blanco para mantener el actual"
                            value={coordenadorNome}
                            onChange={(e) => setCoordenadorNome(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Motivo / Observaciones del Traslado</Label>
                        <Textarea
                            placeholder="Motivo del cambio de centro de trabajo o proyecto..."
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            className="text-xs min-h-[60px]"
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
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Transfiriendo...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5" /> Confirmar Traslado
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
