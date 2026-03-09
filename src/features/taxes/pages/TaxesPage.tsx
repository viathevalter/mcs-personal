import { useState } from 'react';
import { useTaxRules, useCreateTaxRule, useUpdateTaxRule, useDeleteTaxRule } from '../hooks';
import type { TaxRule, TaxCategory } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TAX_CATEGORIES: { value: TaxCategory; label: string }[] = [
    { value: 'SS_TRABALHADOR', label: 'Segurança Social (Trabalhador)' },
    { value: 'SS_EMPRESA', label: 'Segurança Social (Empresa)' },
    { value: 'IRS_DEFAULT', label: 'IRS (Taxa Default)' },
    { value: 'SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO', label: 'Limite Isenção Subs. Alim. (Dinheiro)' },
    { value: 'SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO', label: 'Limite Isenção Subs. Alim. (Cartão)' },
    { value: 'FCT', label: 'Fundo de Compensação (FCT)' },
    { value: 'AJUDAS_CUSTO_LIMITE', label: 'Limite Isenção Ajudas de Custo' },
    { value: 'KMS_LIMITE', label: 'Limite Isenção Kms' },
    { value: 'OUTROS', label: 'Outros' },
];

export function TaxesPage() {
    const { data: taxRules, isLoading } = useTaxRules();
    const createMutation = useCreateTaxRule();
    const updateMutation = useUpdateTaxRule();
    const deleteMutation = useDeleteTaxRule();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<TaxRule | null>(null);

    // Form state
    const [taxType, setTaxType] = useState<TaxCategory>('SS_TRABALHADOR');
    const [ratePercentage, setRatePercentage] = useState<string>('');
    const [fixedAmount, setFixedAmount] = useState<string>('');
    const [description, setDescription] = useState('');
    const [validFrom, setValidFrom] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleOpenDialog = (rule?: TaxRule) => {
        if (rule) {
            setEditingRule(rule);
            setTaxType(rule.tax_type);
            setRatePercentage(rule.rate_percentage ? rule.rate_percentage.toString() : '');
            setFixedAmount(rule.fixed_amount ? rule.fixed_amount.toString() : '');
            setDescription(rule.description || '');
            setValidFrom(rule.valid_from ? format(new Date(rule.valid_from), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        } else {
            setEditingRule(null);
            setTaxType('SS_TRABALHADOR');
            setRatePercentage('');
            setFixedAmount('');
            setDescription('');
            setValidFrom(format(new Date(), 'yyyy-MM-dd'));
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            tax_type: taxType,
            rate_percentage: ratePercentage ? parseFloat(ratePercentage) : null,
            fixed_amount: fixedAmount ? parseFloat(fixedAmount) : null,
            description,
            valid_from: validFrom,
        };

        if (editingRule) {
            await updateMutation.mutateAsync({ id: editingRule.id, payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
        setIsDialogOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja apagar esta regra?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const getCategoryLabel = (value: string) => {
        return TAX_CATEGORIES.find((c) => c.value === value)?.label || value;
    };

    if (isLoading) return <div className="p-8">A carregar regras de impostos...</div>;

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Regras de Impostos</h1>
                    <p className="text-muted-foreground">Configuração global das taxas e limites de isenção da folha de pagamento.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Regra
                </Button>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo de Imposto/Limite</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Taxa (%)</TableHead>
                            <TableHead className="text-right">Valor Fixo (€)</TableHead>
                            <TableHead>Válido Desde</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!taxRules || taxRules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                    Nenhuma regra configurada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            taxRules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {getCategoryLabel(rule.tax_type)}
                                    </TableCell>
                                    <TableCell>{rule.description}</TableCell>
                                    <TableCell className="text-right">
                                        {rule.rate_percentage !== null ? `${rule.rate_percentage}%` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {rule.fixed_amount !== null && rule.fixed_amount !== undefined ? `€ ${rule.fixed_amount.toFixed(2)}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {rule.valid_from ? format(new Date(rule.valid_from), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Imposto'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Categoria / Tipo</Label>
                            <Select value={taxType} onValueChange={(val) => setTaxType(val as TaxCategory)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {TAX_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Taxa (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 11.00"
                                    value={ratePercentage}
                                    onChange={(e) => setRatePercentage(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Valor Fixo (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 6.00"
                                    value={fixedAmount}
                                    onChange={(e) => setFixedAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Descrição</Label>
                            <Input
                                placeholder="Descreva esta regra..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Válido a partir de</Label>
                            <Input
                                type="date"
                                value={validFrom}
                                onChange={(e) => setValidFrom(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                            {editingRule ? 'Guardar' : 'Adicionar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
