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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Desconto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="empresa" className="text-right">
                            Empresa
                        </Label>
                        <Select value={empresaId} onValueChange={(v: string) => setEmpresaId(v)}>
                            <SelectTrigger className="col-span-3">
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

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Categoria
                        </Label>
                        <Select value={category} onValueChange={(v: DiscountCategory) => setCategory(v)}>
                            <SelectTrigger className="col-span-3">
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

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Valor (€)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Data
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            Status
                        </Label>
                        <Select value={status} onValueChange={(v: DiscountStatus) => setStatus(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Pausado">Pausado</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">
                            Descrição
                        </Label>
                        <Input
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending || !amount || !date}>
                        {isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
