import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('masterData.paymentTerms.nameRequired', { defaultValue: 'Nome do prazo é obrigatório' }));
      return;
    }

    try {
      if (selectedTerm) {
        await updatePaymentTerm({
          id: selectedTerm.id,
          payload: formData,
        });
        toast.success(t('masterData.paymentTerms.updateSuccess', { defaultValue: 'Prazo de pagamento atualizado com sucesso!' }));
      } else {
        await createPaymentTerm(formData);
        toast.success(t('masterData.paymentTerms.createSuccess', { defaultValue: 'Prazo de pagamento criado com sucesso!' }));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('masterData.paymentTerms.saveError', { defaultValue: 'Erro ao salvar prazo de pagamento' }));
    }
  };

  const handleDelete = async () => {
    if (!selectedTerm) return;
    try {
      await deletePaymentTerm(selectedTerm.id);
      toast.success(t('masterData.paymentTerms.deleteSuccess', { defaultValue: 'Prazo de pagamento excluído com sucesso!' }));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('masterData.paymentTerms.deleteError', { defaultValue: 'Erro ao excluir prazo de pagamento' }));
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
            {t('masterData.paymentTerms.title', { defaultValue: 'Prazos de Pagamento' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('masterData.paymentTerms.subtitle', { defaultValue: 'Gerencie os prazos de faturamento e condições de pagamento acordados com os clientes.' })}
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('masterData.paymentTerms.btnNew', { defaultValue: 'Novo Prazo' })}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card dark:bg-slate-900/50 border dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('masterData.paymentTerms.searchPlaceholder', { defaultValue: 'Buscar por nome do prazo...' })}
            className="pl-10 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
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
            <h3 className="font-semibold text-lg">{t('masterData.jobFunctions.load_error', { defaultValue: 'Erro ao carregar dados' })}</h3>
            <p className="text-sm">{(error as any).message || 'Por favor, verifique sua conexão.'}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border dark:border-slate-800" />
          ))}
        </div>
      ) : sortedTerms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed dark:border-slate-800 rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 border dark:border-slate-800">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('masterData.paymentTerms.emptyTitle', { defaultValue: 'Nenhum Prazo Encontrado' })}</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm
              ? t('masterData.paymentTerms.emptyDescFilter', { defaultValue: 'Nenhum prazo corresponde aos filtros de busca informados.' })
              : t('masterData.paymentTerms.emptyDesc', { defaultValue: 'Cadastre seu primeiro prazo de pagamento clicando no botão acima.' })}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              {t('masterData.paymentTerms.clearFilters', { defaultValue: 'Limpar Filtros' })}
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card dark:bg-slate-900/50 border dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
            <Table className="relative">
              <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b dark:border-slate-800">
                  <TableHead className="py-4 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      {t('masterData.paymentTerms.termName', { defaultValue: 'Nome do Prazo' })}
                      <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('days')}>
                    <div className="flex items-center gap-1">
                      {t('masterData.paymentTerms.daysToDue', { defaultValue: 'Dias para Vencimento' })}
                      <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'days' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 text-right text-slate-500 dark:text-slate-400">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y dark:divide-slate-800/50">
                {sortedTerms.map((term) => (
                  <TableRow 
                    key={term.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800/70 border-b dark:border-slate-800/50" 
                    onClick={() => handleOpenEdit(term)}
                  >
                    <TableCell className="font-medium text-foreground dark:text-slate-200 py-4">{term.name}</TableCell>
                    <TableCell className="text-foreground/90 dark:text-slate-300 py-4">
                      {term.days === 0 ? t('masterData.paymentTerms.cashPayment', { defaultValue: 'Pronto Pagamento' }) : t('masterData.paymentTerms.days', { count: term.days, defaultValue: '{{count}} dias' })}
                    </TableCell>
                    <TableCell className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(term)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground dark:hover:text-slate-200"
                          title={t('masterData.paymentTerms.editTermTooltip', { defaultValue: 'Editar Prazo' })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(term)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('masterData.paymentTerms.deleteTermTooltip', { defaultValue: 'Excluir Prazo' })}
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
              {selectedTerm ? t('masterData.paymentTerms.modalEditTitle', { defaultValue: 'Editar Prazo de Pagamento' }) : t('masterData.paymentTerms.modalNewTitle', { defaultValue: 'Novo Prazo de Pagamento' })}
            </DialogTitle>
            <DialogDescription>
              {t('masterData.paymentTerms.modalDesc', { defaultValue: 'Preencha as informações para registrar as condições de cobrança.' })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('masterData.paymentTerms.labelName', { defaultValue: 'Nome do Prazo *' })}</Label>
              <Input
                id="name"
                required
                placeholder={t('masterData.paymentTerms.placeholderName', { defaultValue: 'Ex: 30 dias após faturamento' })}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">{t('masterData.paymentTerms.labelDays', { defaultValue: 'Dias para Vencimento *' })}</Label>
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
                {t('masterData.paymentTerms.helpDays', { defaultValue: 'Informe 0 para faturamento de pronto pagamento / imediato.' })}
              </p>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t('common.cancel', { defaultValue: 'Cancelar' })}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6"
              >
                {isCreating || isUpdating ? t('masterData.paymentTerms.saving', { defaultValue: 'Salvando...' }) : t('common.save', { defaultValue: 'Salvar' })}
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
              {t('masterData.paymentTerms.modalDeleteTitle', { defaultValue: 'Confirmar Exclusão' })}
            </DialogTitle>
            <DialogDescription>
              {t('masterData.paymentTerms.modalDeleteDesc', { name: selectedTerm?.name, defaultValue: `Esta ação é permanente. Tem certeza de que deseja excluir o prazo de pagamento "${selectedTerm?.name}"?` })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isDeleting ? t('masterData.paymentTerms.deleting', { defaultValue: 'Excluindo...' }) : t('masterData.paymentTerms.delete', { defaultValue: 'Excluir' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
