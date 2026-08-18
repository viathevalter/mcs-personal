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
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useBenefitCategories } from '@/features/settings/hooks/useCategories';
import { useUpsertHousing } from '../hooks/useUpsertHousing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { Plus, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CreateBenefitDialogProps {
    trigger?: React.ReactNode;
}

export function CreateBenefitDialog({ trigger }: CreateBenefitDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { selectedEmpresaId } = useEmpresa();
    const { data: benefitCategories = [] } = useBenefitCategories(selectedEmpresaId || undefined);

    const [workerId, setWorkerId] = useState<string>('');
    const [workerSearch, setWorkerSearch] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<string>('Auxílio Moradia');
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
    const [description, setDescription] = useState<string>('');
    const [status, setStatus] = useState<string>('Ativo');

    // Fetch workers for select
    const { data: workers = [], isLoading: isLoadingWorkers } = useQuery({
        queryKey: ['workers-for-benefit-create', selectedEmpresaId],
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
    const { mutate: upsertBenefit, isPending } = useUpsertHousing();

    const resetForm = () => {
        setWorkerId('');
        setWorkerSearch('');
        setAmount('');
        setCategory('Auxílio Moradia');
        setStartDate(format(new Date(), 'yyyy-MM-01'));
        setDescription('');
        setStatus('Ativo');
    };

    const handleSave = () => {
        if (!workerId || !amount || !startDate || !category) return;

        const matchedEmpresaId = selectedWorkerObj?.empresa_id || selectedEmpresaId || '00000000-0000-0000-0000-000000000000';

        upsertBenefit(
            {
                worker_id: workerId,
                empresa_id: matchedEmpresaId,
                monthly_amount: Number(amount),
                start_date: startDate,
                category,
                description: description.trim() || null,
                status,
                proration_method: 'daily_actual'
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
        'AUXILIO MORADIA',
        'HORAS EXTRAS',
        'TRABALHO NOTURNO',
        'SUBSÍDIO ALIMENTAÇÃO',
        'REEMBOLSO DE DESPESAS',
        'HORAS PENDENTES',
        'SUBSÍDIO TRANSPORTE',
        'AJUDA DE CUSTO',
        'FÉRIAS',
        'OUTROS'
    ];

    const categoryList = Array.from(new Set([
        ...defaultCategoryOptions,
        ...benefitCategories.map(c => c.name)
    ]));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Provento / Benefício
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Cadastrar Provento ou Benefício
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
                                        placeholder="Buscar por nome ou código..."
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
                            <Label className="text-xs font-semibold text-gray-700">Tipo de Provento *</Label>
                            <Select value={category} onValueChange={setCategory}>
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

                    {/* Start Date / Competência & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Competência / Data Início *</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ativo">Ativo</SelectItem>
                                    <SelectItem value="Inativo">Inativo</SelectItem>
                                    <SelectItem value="Pausado">Pausado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Descrição / Notas</Label>
                        <Input
                            placeholder="Observações ou justificativa do benefício..."
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleSave}
                        disabled={isPending || !workerId || !amount || !startDate || !category}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                            </>
                        ) : (
                            'Salvar Provento'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
