import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateDiscount } from '../hooks/useDiscountMutations';
import type { DiscountCategory, DiscountStatus } from '../types';
import { useDiscountCategories } from '@/features/settings/hooks/useCategories';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { Plus, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CreateDiscountDialogProps {
    trigger?: React.ReactNode;
}

export function CreateDiscountDialog({ trigger }: CreateDiscountDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { selectedEmpresaId } = useEmpresa();
    const { data: discountCategories = [] } = useDiscountCategories(selectedEmpresaId || undefined);

    // Form fields
    const [workerId, setWorkerId] = useState<string>('');
    const [workerSearch, setWorkerSearch] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<DiscountCategory>('');
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
    const [description, setDescription] = useState<string>('');
    const [status, setStatus] = useState<DiscountStatus>('Ativo');
    const [isRecurring, setIsRecurring] = useState<boolean>(false);

    // Fetch workers for select
    const { data: workers = [], isLoading: isLoadingWorkers } = useQuery({
        queryKey: ['workers-for-discount-create', selectedEmpresaId],
        enabled: isOpen,
        queryFn: async () => {
            let query = supabase
                .schema('core_personal')
                .from('workers')
                .select('id, cod_colab, nome, empresa_id, status_trabajador')
                .order('nome', { ascending: true });

            if (selectedEmpresaId) {
                query = query.eq('empresa_id', selectedEmpresaId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });

    const filteredWorkers = workers.filter(w => {
        const term = workerSearch.toLowerCase();
        return (
            w.nome.toLowerCase().includes(term) ||
            w.cod_colab.toLowerCase().includes(term)
        );
    });

    const selectedWorkerObj = workers.find(w => w.id === workerId);

    const { mutate: createDiscount, isPending } = useCreateDiscount();

    const resetForm = () => {
        setWorkerId('');
        setWorkerSearch('');
        setAmount('');
        setCategory('');
        setDate(format(new Date(), 'yyyy-MM-01'));
        setDescription('');
        setStatus('Ativo');
        setIsRecurring(false);
    };

    const handleSave = () => {
        if (!workerId || !amount || !category || !date) return;

        const matchedEmpresaId = selectedWorkerObj?.empresa_id || selectedEmpresaId || '00000000-0000-0000-0000-000000000000';

        createDiscount(
            {
                worker_id: workerId,
                empresa_id: matchedEmpresaId,
                amount: Number(amount),
                category,
                reference_date: date,
                description: description.trim() || null,
                is_recurring: isRecurring,
                status
            },
            {
                onSuccess: () => {
                    setIsOpen(false);
                    resetForm();
                }
            }
        );
    };

    const defaultCategoryOptions = [
        'Adiantamento',
        'Seguro',
        'Faltas',
        'Telefone',
        'Multa',
        'Uniforme',
        'Empréstimo',
        'Outros'
    ];

    const categoryList = discountCategories.length > 0 
        ? discountCategories.map(c => c.name)
        : defaultCategoryOptions;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Desconto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Cadastrar Novo Desconto
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Worker Selection */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Trabalhador *</Label>
                        {isLoadingWorkers ? (
                            <div className="flex items-center text-xs text-muted-foreground py-2">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando trabalhadores...
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Filtrar por nome ou código..."
                                        value={workerSearch}
                                        onChange={(e) => setWorkerSearch(e.target.value)}
                                        className="pl-9 text-xs"
                                    />
                                </div>
                                <Select value={workerId} onValueChange={setWorkerId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione o trabalhador..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[220px]">
                                        {filteredWorkers.length === 0 ? (
                                            <div className="p-3 text-xs text-center text-muted-foreground">Nenhum trabalhador encontrado</div>
                                        ) : (
                                            filteredWorkers.map((w) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    <span className="font-semibold">[{w.cod_colab}]</span> {w.nome}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Category & Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Categoria *</Label>
                            <Select value={category} onValueChange={(v: DiscountCategory) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryList.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Valor (€) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Competência / Date & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Competência / Data *</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Status</Label>
                            <Select value={status} onValueChange={(v: DiscountStatus) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ativo">Ativo</SelectItem>
                                    <SelectItem value="Pausado">Pausado</SelectItem>
                                    <SelectItem value="Concluído">Concluído</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Recorrente Checkbox */}
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                            id="is_recurring_discount"
                            checked={isRecurring}
                            onCheckedChange={(c) => setIsRecurring(!!c)}
                        />
                        <Label htmlFor="is_recurring_discount" className="text-xs text-gray-700 cursor-pointer">
                            Desconto recorrente (aplicar nos próximos meses)
                        </Label>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Descrição / Observações</Label>
                        <Input
                            placeholder="Motivo ou observações adicionais..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleSave}
                        disabled={isPending || !workerId || !amount || !category || !date}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                            </>
                        ) : (
                            'Salvar Desconto'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
