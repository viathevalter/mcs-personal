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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUpdateDiscount } from '../hooks/useDiscountMutations';
import type { WorkerDiscount, DiscountCategory, DiscountStatus } from '../types';
import { useDiscountCategories } from '@/features/settings/hooks/useCategories';
import { normalizeDiscountCategoryName, STANDARD_DISCOUNT_CATEGORIES } from '../utils/categoryUtils';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { normalizeEmpresaName } from '@/shared/utils/empresaNormalizer';

interface EditDiscountDialogProps {
    discount: WorkerDiscount;
    trigger: React.ReactNode;
}

export function EditDiscountDialog({ discount, trigger }: EditDiscountDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { empresas = [] } = useEmpresa();
    const [empresaId, setEmpresaId] = useState<string>(discount.empresa_id);
    const { data: discountCategories = [] } = useDiscountCategories(empresaId || discount.empresa_id);

    const [amount, setAmount] = useState<string>(discount.amount.toString());
    const [category, setCategory] = useState<DiscountCategory>(() => 
        normalizeDiscountCategoryName(discount.category, discountCategories) || discount.category
    );
    const [date, setDate] = useState<string>(discount.reference_date.split('T')[0] || '');
    const [description, setDescription] = useState<string>(discount.description || '');
    const [status, setStatus] = useState<DiscountStatus>(discount.status);

    const { mutate: updateDiscount, isPending } = useUpdateDiscount();

    useEffect(() => {
        if (isOpen) {
            setEmpresaId(discount.empresa_id);
            setAmount(discount.amount.toString());
            const resolved = normalizeDiscountCategoryName(discount.category, discountCategories) || discount.category;
            setCategory(resolved);
            setDate(discount.reference_date.split('T')[0] || '');
            setDescription(discount.description || '');
            setStatus(discount.status);
        }
    }, [isOpen, discount, discountCategories]);

    const handleSave = () => {
        updateDiscount(
            {
                id: discount.id,
                empresa_id: empresaId,
                amount: Number(amount),
                category,
                reference_date: date,
                description: description || null,
                status
            },
            {
                onSuccess: () => setIsOpen(false)
            }
        );
    };

    // Lista consolidada de categorias disponíveis
    const availableCategoryList = discountCategories.length > 0
        ? discountCategories.map(c => c.name)
        : STANDARD_DISCOUNT_CATEGORIES;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Editar Desconto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="empresa" className="text-xs font-semibold text-gray-700">
                                Empresa (Contratante)
                            </Label>
                            <Select value={empresaId} onValueChange={(v: string) => setEmpresaId(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresas.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {normalizeEmpresaName(emp.trade_name || emp.nome)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="category" className="text-xs font-semibold text-gray-700">
                                Categoria
                            </Label>
                            <Select value={category} onValueChange={(v: DiscountCategory) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCategoryList.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                    {category && !availableCategoryList.includes(category) && (
                                        <SelectItem value={category}>{category}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">
                                Valor (€)
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="date" className="text-xs font-semibold text-gray-700">
                                Data
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="status" className="text-xs font-semibold text-gray-700">
                                Status
                            </Label>
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

                    {/* Rich Description Area */}
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                Observações & Justificativas do Desconto
                            </Label>
                            <span className="text-[10px] font-medium text-muted-foreground bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                Rich Text / Detalhes
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            className="flex w-full rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-slate-900 px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                            placeholder="Motivo ou observações adicionais sobre este lançamento..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending || !amount || !date} className="bg-indigo-600 hover:bg-indigo-700">
                        {isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
