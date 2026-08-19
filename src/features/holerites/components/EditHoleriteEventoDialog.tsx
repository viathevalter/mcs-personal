import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateHoleriteEvento } from '../hooks/useUpdateHoleriteEvento';
import type { HoleriteEvento } from '@/shared/types/holerites';

interface EditHoleriteEventoDialogProps {
    evento: HoleriteEvento;
    trigger: React.ReactNode;
}

export function EditHoleriteEventoDialog({ evento, trigger }: EditHoleriteEventoDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [valor, setValor] = useState<string>(String(evento.valor || '0'));
    const [descricao, setDescricao] = useState<string>(evento.descricao || '');
    const [categoria, setCategoria] = useState<string>(evento.categoria || '');

    const { mutate: updateEvento, isPending } = useUpdateHoleriteEvento();

    useEffect(() => {
        if (isOpen) {
            setValor(String(evento.valor || '0'));
            setDescricao(evento.descricao || '');
            setCategoria(evento.categoria || '');
        }
    }, [isOpen, evento]);

    const handleSave = () => {
        const numVal = parseFloat(valor.replace(',', '.'));
        if (isNaN(numVal) || numVal < 0) return;

        updateEvento(
            {
                id: evento.id,
                valor: numVal,
                descricao: descricao.trim() || null,
                categoria: categoria.trim() || evento.categoria
            },
            {
                onSuccess: () => setIsOpen(false)
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Lançamento ({evento.tipo === 'provento' ? 'Provento' : 'Desconto'})</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cat" className="text-right">
                            Categoria
                        </Label>
                        <Input
                            id="cat"
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="col-span-3 font-semibold uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="valor" className="text-right">
                            Valor (€)
                        </Label>
                        <Input
                            id="valor"
                            type="number"
                            step="0.01"
                            min="0"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            className="col-span-3 font-bold"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">
                            Descrição
                        </Label>
                        <Input
                            id="desc"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Descrição ou observação..."
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending || !valor}>
                        {isPending ? 'Salvando...' : 'Salvar Alteração'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
