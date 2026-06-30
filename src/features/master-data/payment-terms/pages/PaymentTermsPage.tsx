import { useState } from 'react';
import { usePaymentTerms, useMutatePaymentTerm } from '../../clients/hooks/usePaymentTerms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Calendar, AlertCircle, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentTerm } from '../../clients/types';

export function PaymentTermsPage() {
  const { data: paymentTerms = [], isLoading, error } = usePaymentTerms();
  const { createPaymentTerm, updatePaymentTerm, deletePaymentTerm, isCreating, isUpdating, isDeleting } = useMutatePaymentTerm();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentTerm | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'days' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    days: 0,
  });

  const handleOpenCreate = () => {
    setSelectedTerm(null);
    setFormData({
      name: '',
      days: 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (term: PaymentTerm) => {
    setSelectedTerm(term);
    setFormData({
      name: term.name,
      days: term.days,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (term: PaymentTerm) => {
    setSelectedTerm(term);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nome do prazo é obrigatório');
      return;
    }

    try {
      if (selectedTerm) {
        await updatePaymentTerm({
          id: selectedTerm.id,
          payload: formData,
        });
        toast.success('Prazo de pagamento atualizado com sucesso!');
      } else {
        await createPaymentTerm(formData);
        toast.success('Prazo de pagamento criado com sucesso!');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar prazo de pagamento');
    }
  };

  const handleDelete = async () => {
    if (!selectedTerm) return;
    try {
      await deletePaymentTerm(selectedTerm.id);
      toast.success('Prazo de pagamento excluído com sucesso!');
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir prazo de pagamento');
    }
  };

  const handleSort = (field: 'name' | 'days') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredTerms = paymentTerms.filter((term) =>
    term.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedTerms = [...filteredTerms].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase().trim();
      bVal = (bVal || '').toString().toLowerCase().trim();
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col space-y-6 px-8 py-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8 text-orange-500" />
            Prazos de Pagamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os prazos de faturamento e condições de pagamento acordados com os clientes.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Prazo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do prazo..."
            className="pl-10 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-8 border border-red-950 bg-red-950/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Erro ao carregar dados</h3>
            <p className="text-sm">{(error as any).message || 'Por favor, verifique sua conexão.'}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : sortedTerms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum Prazo Encontrado</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm
              ? 'Nenhum prazo corresponde aos filtros de busca informados.'
              : 'Cadastre seu primeiro prazo de pagamento clicando no botão acima.'}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
            <Table className="relative">
              <TableHeader className="bg-slate-50 border-b sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]">
                <TableRow>
                  <TableHead className="py-4 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Nome do Prazo
                      <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('days')}>
                    <div className="flex items-center gap-1">
                      Dias para Vencimento
                      <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'days' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {sortedTerms.map((term) => (
                  <TableRow 
                    key={term.id} 
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 active:bg-slate-100" 
                    onClick={() => handleOpenEdit(term)}
                  >
                    <TableCell className="font-medium text-foreground py-4">{term.name}</TableCell>
                    <TableCell className="text-foreground/90 py-4">
                      {term.days === 0 ? 'Pronto Pagamento' : `${term.days} dias`}
                    </TableCell>
                    <TableCell className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(term)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar Prazo"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(term)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir Prazo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              {selectedTerm ? 'Editar Prazo de Pagamento' : 'Novo Prazo de Pagamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações para registrar as condições de cobrança.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Prazo *</Label>
              <Input
                id="name"
                required
                placeholder="Ex: 30 dias após faturamento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Dias para Vencimento *</Label>
              <Input
                id="days"
                type="number"
                min={0}
                required
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                className="focus-visible:ring-orange-500"
              />
              <p className="text-xs text-muted-foreground">
                Informe 0 para faturamento de pronto pagamento / imediato.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6"
              >
                {isCreating || isUpdating ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Tem certeza de que deseja excluir o prazo de pagamento{' '}
              <strong className="text-foreground">"{selectedTerm?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
