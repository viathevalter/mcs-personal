import { useState } from 'react';
import { useWorkerDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from '../../../discounts/hooks';
import type { WorkerDiscount, DiscountCategory, DiscountStatus } from '../../../discounts/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, CheckCircle2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const DISCOUNT_CATEGORIES: DiscountCategory[] = [
    'Imposto ss', 'Adiantamento', 'Desconto Carro',
    'MULTA TRANSITO', 'COMBUSTIBLE', 'PEAJES',
    'SUMINISTROS', 'MULTA ALOJAMIENTO', 'LIMPIEZA O DAÑOS',
    'EPIS', 'OUTROS', 'Taxa bancária'
];

interface DiscountsTabProps {
    workerId: string;
    empresaId: string;
    isEmbedded?: boolean;
}

export function DiscountsTab({ workerId, empresaId, isEmbedded = false }: DiscountsTabProps) {
    const { data: discounts, isLoading } = useWorkerDiscounts(workerId);
    const { mutate: createDiscount } = useCreateDiscount();
    const { mutate: updateDiscount } = useUpdateDiscount();
    const { mutate: deleteDiscount } = useDeleteDiscount(workerId);

    const [isEditing, setIsEditing] = useState(false);
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

    // Form State
    const [category, setCategory] = useState<DiscountCategory>('OUTROS');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [referenceDate, setReferenceDate] = useState<Date>(new Date());
    const [isRecurring, setIsRecurring] = useState(false);
    const [status, setStatus] = useState<DiscountStatus>('Ativo');

    const handleEdit = (discount: WorkerDiscount) => {
        setCategory(discount.category);
        setAmount(discount.amount.toString());
        setDescription(discount.description || '');
        setReferenceDate(new Date(discount.reference_date));
        setIsRecurring(discount.is_recurring);
        setStatus(discount.status);
        setEditingDiscountId(discount.id);
        setIsEditing(true);
    };

    const resetForm = () => {
        setCategory('OUTROS');
        setAmount('');
        setDescription('');
        setReferenceDate(new Date());
        setIsRecurring(false);
        setStatus('Ativo');
        setEditingDiscountId(null);
        setIsEditing(false);
    };

    const handleSave = () => {
        if (!amount || isNaN(Number(amount))) {
            toast.error('O valor do desconto é inválido.');
            return;
        }

        if (editingDiscountId) {
            updateDiscount({
                id: editingDiscountId,
                category,
                amount: Number(amount),
                description,
                reference_date: format(referenceDate, 'yyyy-MM-dd'),
                is_recurring: isRecurring,
                status,
            }, {
                onSuccess: () => {
                    toast.success('Desconto atualizado com sucesso!');
                    resetForm();
                },
                onError: (error: any) => {
                    console.error("Erro no updateDiscount:", error);
                    toast.error(`Falha ao gravar: ${error?.message || 'Erro desconhecido'}`);
                }
            });
        } else {
            createDiscount({
                worker_id: workerId,
                empresa_id: empresaId,
                category,
                amount: Number(amount),
                description,
                reference_date: format(referenceDate, 'yyyy-MM-dd'),
                is_recurring: isRecurring,
                status,
            }, {
                onSuccess: () => {
                    toast.success('Desconto adicionado com sucesso!');
                    resetForm();
                },
                onError: (error: any) => {
                    console.error("Erro no createDiscount:", error);
                    toast.error(`Falha ao gravar: ${error?.message || 'Erro desconhecido. Verifique a consola (F12).'}`);
                }
            });
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center text-sm text-gray-500">Carregando descontos...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Gestão de Descontos</h3>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} size="sm" type="button">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Desconto
                    </Button>
                )}
            </div>

            {isEditing && (
                <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as DiscountCategory)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                {DISCOUNT_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Valor (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Data de Referência</Label>
                            <Input
                                type="date"
                                value={referenceDate ? format(referenceDate, 'yyyy-MM-dd') : ''}
                                onChange={(e) => setReferenceDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : new Date())}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as DiscountStatus)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="Ativo">Apenas este mês (Ativo)</option>
                                <option value="Pausado">Pausado</option>
                                <option value="Concluído">Concluído</option>
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label>Descrição / Observações</Label>
                            <Textarea
                                placeholder="Detalhes sobre o desconto..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex items-center space-x-2">
                            <Checkbox
                                id="isRecurring"
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                            />
                            <Label htmlFor="isRecurring" className="text-sm font-normal">
                                Desconto Recorrente (Aplica todo mês automaticamente)
                            </Label>
                        </div>
                    </div>

                    {!isEmbedded && (
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button variant="outline" onClick={resetForm} type="button">
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={!amount} type="button">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Salvar Desconto
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* List of Discounts */}
            {!isEditing && discounts && discounts.length > 0 ? (
                <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categoria
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valor
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Recorrente
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {discounts.map((discount) => (
                                <tr key={discount.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(new Date(discount.reference_date), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {discount.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        € {discount.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {discount.is_recurring ? 'Sim' : 'Não'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                            discount.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                                                discount.status === 'Concluído' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                                        )}>
                                            {discount.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(discount)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Tem certeza que deseja remover este desconto?')) {
                                                        deleteDiscount(discount.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !isEditing && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">Sem Descontos</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Este trabalhador não possui histórico de descontos cadastrados.
                        </p>
                    </div>
                )
            )}
        </div>
    );
}
