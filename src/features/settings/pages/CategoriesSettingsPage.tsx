import { useState } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
    useDiscountCategories,
    useCreateDiscountCategory,
    useUpdateDiscountCategory,
    useDeleteDiscountCategory,
    useBenefitCategories,
    useCreateBenefitCategory,
    useUpdateBenefitCategory,
    useDeleteBenefitCategory
} from '../hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type CategoryType = 'discount' | 'benefit';

export function CategoriesSettingsPage() {
    const { selectedEmpresaId: empresaId } = useEmpresa();

    const { data: discountCategories, isLoading: isLoadingDiscounts } = useDiscountCategories(empresaId || undefined);
    const { data: benefitCategories, isLoading: isLoadingBenefits } = useBenefitCategories(empresaId || undefined);

    const { mutate: createDiscount, isPending: isCreatingDiscount } = useCreateDiscountCategory();
    const { mutate: updateDiscount, isPending: isUpdatingDiscount } = useUpdateDiscountCategory();
    const { mutate: deleteDiscount, isPending: isDeletingDiscount } = useDeleteDiscountCategory();

    const { mutate: createBenefit, isPending: isCreatingBenefit } = useCreateBenefitCategory();
    const { mutate: updateBenefit, isPending: isUpdatingBenefit } = useUpdateBenefitCategory();
    const { mutate: deleteBenefit, isPending: isDeletingBenefit } = useDeleteBenefitCategory();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [activeTab, setActiveTab] = useState<CategoryType>('discount');

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setCategoryName('');
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (category: { id: string, name: string }) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!empresaId || !categoryName.trim()) return;

        if (editingCategory) {
            if (activeTab === 'discount') {
                updateDiscount({ id: editingCategory.id, name: categoryName.trim() }, { onSuccess: () => setIsDialogOpen(false) });
            } else {
                updateBenefit({ id: editingCategory.id, name: categoryName.trim() }, { onSuccess: () => setIsDialogOpen(false) });
            }
        } else {
            if (activeTab === 'discount') {
                createDiscount({ empresaId, name: categoryName.trim() }, { onSuccess: () => setIsDialogOpen(false) });
            } else {
                createBenefit({ empresaId, name: categoryName.trim() }, { onSuccess: () => setIsDialogOpen(false) });
            }
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a categoria "${name}"? Esta ação não pode ser desfeita.`)) {
            if (activeTab === 'discount') {
                deleteDiscount(id);
            } else {
                deleteBenefit(id);
            }
        }
    };

    const renderTable = (categories: any[] | undefined, isLoading: boolean) => {
        if (isLoading) {
            return (
                <div className="flex p-8 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            );
        }

        return (
            <div className="border rounded-md bg-card mt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome da Categoria</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!categories || categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    Nenhuma categoria encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(c.id, c.name)}
                                            disabled={isDeletingDiscount || isDeletingBenefit}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorias de Lançamentos</h1>
                    <p className="text-muted-foreground">Gerencie as categorias dinâmicas para Descontos e Benefícios.</p>
                </div>
                <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Categoria
                </Button>
            </div>

            <Tabs defaultValue="discount" onValueChange={(v) => setActiveTab(v as CategoryType)}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="discount">Descontos</TabsTrigger>
                    <TabsTrigger value="benefit">Benefícios</TabsTrigger>
                </TabsList>
                <TabsContent value="discount">
                    {renderTable(discountCategories, isLoadingDiscounts)}
                </TabsContent>
                <TabsContent value="benefit">
                    {renderTable(benefitCategories, isLoadingBenefits)}
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'} ({activeTab === 'discount' ? 'Desconto' : 'Benefício'})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-1 block">Nome da Categoria</label>
                        <Input
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                            placeholder="Ex: Transporte, Alimentação, Multa..."
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={!categoryName.trim() || isCreatingDiscount || isUpdatingDiscount || isCreatingBenefit || isUpdatingBenefit}
                        >
                            {(isCreatingDiscount || isUpdatingDiscount || isCreatingBenefit || isUpdatingBenefit) ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
