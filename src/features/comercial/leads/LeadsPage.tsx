import { useState } from 'react';
import { useLeads, useMutateLead } from './hooks/useLeads';
import { useMutateClient } from '@/features/master-data/clients/hooks/useClients';
import { usePaymentTerms } from '@/features/master-data/clients/hooks/usePaymentTerms';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle,
  UserCheck,
  Link,
  Share2
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Lead } from '../estimaciones/types';
import { useTranslation } from 'react-i18next';

export function LeadsPage() {
  const { t, i18n } = useTranslation();
  const { data: leads = [], isLoading, error } = useLeads();
  const { empresas, selectedEmpresaId } = useEmpresa();
  const { createLead, updateLead, deleteLead, isCreating, isUpdating, isDeleting } = useMutateLead();
  const { createClient } = useMutateClient();
  const { data: paymentTerms = [] } = usePaymentTerms();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Conversion Form State
  const [conversionData, setConversionData] = useState({
    trade_name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    billing_email: '',
    phone: '',
    country_id: '',
    region_id: '',
    province: '',
    city: '',
    postal_code: '',
    address_line: '',
    payment_term_id: '',
  });
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
    empresa_id: '',
  });

  const handleOpenCreate = () => {
    setSelectedLead(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      notes: '',
      empresa_id: selectedEmpresaId || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company_name: lead.company_name || '',
      notes: lead.notes || '',
      empresa_id: lead.empresa_id || selectedEmpresaId || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.name || !formData.email || !formData.phone || !formData.empresa_id) {
      toast.error(t('comercial.leads.form.validationRequired'));
      return;
    }

    try {
      if (selectedLead) {
        await updateLead({
          id: selectedLead.id,
          payload: formData,
        });
        toast.success(t('comercial.leads.form.toastUpdateSuccess'));
      } else {
        await createLead(formData);
        toast.success(t('comercial.leads.form.toastCreateSuccess'));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('comercial.leads.form.toastSaveError'));
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    try {
      await deleteLead(selectedLead.id);
      toast.success(t('comercial.leads.delete.toastSuccess'));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('comercial.leads.delete.toastError'));
    }
  };

  const handleOpenConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setConversionData({
      trade_name: lead.company_name || '',
      legal_name: lead.legal_name || lead.company_name || '',
      tax_id: lead.tax_id || '',
      email: lead.email || '',
      billing_email: lead.billing_email || lead.email || '',
      phone: lead.phone || '',
      country_id: lead.country_id || '',
      region_id: lead.region_id || '',
      province: lead.province || '',
      city: lead.city || '',
      postal_code: lead.postal_code || '',
      address_line: lead.address_line || '',
      payment_term_id: lead.payment_term_id || '',
    });
    setIsConvertOpen(true);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!conversionData.tax_id || !conversionData.legal_name || !conversionData.trade_name) {
      toast.error('Nome Fantasia, Razão Social e NIF são obrigatórios');
      return;
    }

    try {
      // 1. Criar o cliente no banco de dados (o código CXXXX será gerado automaticamente pela trigger)
      const newClient = await createClient({
        trade_name: conversionData.trade_name,
        legal_name: conversionData.legal_name,
        tax_id: conversionData.tax_id,
        email: conversionData.email || null,
        billing_email: conversionData.billing_email || null,
        phone: conversionData.phone || null,
        country_id: conversionData.country_id || null,
        region_id: conversionData.region_id || null,
        province: conversionData.province || null,
        city: conversionData.city || null,
        postal_code: conversionData.postal_code || null,
        address_line: conversionData.address_line || null,
        payment_term_id: conversionData.payment_term_id === 'none' || conversionData.payment_term_id === '' ? null : conversionData.payment_term_id,
        status: 'active',
        codigo: null,
      } as any);

      // 2. Vincular o lead ao cliente criado
      await updateLead({
        id: selectedLead.id,
        payload: {
          client_id: newClient.id,
          tax_id: conversionData.tax_id,
          legal_name: conversionData.legal_name,
          billing_email: conversionData.billing_email || null,
          country_id: conversionData.country_id || null,
          region_id: conversionData.region_id || null,
          province: conversionData.province || null,
          city: conversionData.city || null,
          postal_code: conversionData.postal_code || null,
          address_line: conversionData.address_line || null,
          payment_term_id: conversionData.payment_term_id === 'none' || conversionData.payment_term_id === '' ? null : conversionData.payment_term_id,
        } as any,
      });

      toast.success('Lead convertido em cliente com sucesso!');
      setIsConvertOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao converter lead em cliente');
    }
  };

  const handleCopyCollectionLink = (lead: Lead) => {
    const url = `${window.location.origin}/public/coleta-dados/${lead.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de coleta copiado para a área de transferência!');
  };

  const handleCopyNewLeadLink = () => {
    if (!selectedEmpresaId) {
      toast.error('Selecione uma empresa do grupo primeiro');
      return;
    }
    const url = `${window.location.origin}/public/novo-lead?empresa_id=${selectedEmpresaId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de novo lead copiado para a área de transferência!');
  };

  const filteredLeads = leads.filter(lead => {
    const search = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
      (lead.phone && lead.phone.includes(search))
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-yellow-500" />
            {t('comercial.leads.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('comercial.leads.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <EmpresaSelector />
          <Button onClick={handleCopyNewLeadLink} variant="outline" className="border-slate-300 dark:border-slate-800">
            <Share2 className="mr-2 h-4 w-4 text-yellow-500" />
            Link de Cadastro
          </Button>
          <Button onClick={handleOpenCreate} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
            <Plus className="mr-2 h-4 w-4" />
            {t('comercial.leads.btnNew')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('comercial.leads.searchPlaceholder')}
            className="pl-10 focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-8 border border-red-900 bg-red-950/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">{t('comercial.leads.errorLoad')}</h3>
            <p className="text-sm">{(error as any).message || t('comercial.leads.errorLoadDesc')}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border">
            <UserPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('comercial.leads.emptyTitle')}</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm ? t('comercial.leads.emptySearchDesc') : t('comercial.leads.emptyDesc')}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              {t('comercial.leads.btnClearFilters')}
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="py-4">{t('comercial.leads.table.company')}</TableHead>
                  <TableHead className="py-4">{t('comercial.leads.table.name')}</TableHead>
                  <TableHead className="py-4">{t('comercial.leads.table.contact')}</TableHead>
                  <TableHead className="py-4">{t('comercial.leads.table.notes')}</TableHead>
                  <TableHead className="py-4">{t('comercial.leads.table.date')}</TableHead>
                  <TableHead className="py-4 text-right">{t('comercial.leads.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-foreground py-4">
                      {lead.company_name ? (
                        <span className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                          {lead.company_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-sm font-normal">{t('comercial.leads.table.noCompany')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/90 py-4">
                      {lead.name}
                    </TableCell>
                    <TableCell className="py-4 space-y-1">
                      <div className="flex items-center gap-2 text-foreground/90 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                        <span className="hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground max-w-xs truncate text-sm">
                      {lead.notes || <span className="text-muted-foreground/50 italic">{t('comercial.leads.table.noNotes')}</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.client_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 mr-2">
                            Convertido
                          </span>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenConvert(lead)}
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              title="Converter em Cliente"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyCollectionLink(lead)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              title="Copiar Link de Coleta"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(lead)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={t('comercial.leads.tooltips.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(lead)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('comercial.leads.tooltips.delete')}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-yellow-500" />
              {selectedLead ? t('comercial.leads.form.titleEdit') : t('comercial.leads.form.titleCreate')}
            </DialogTitle>
            <DialogDescription>
              {t('comercial.leads.form.desc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">{t('comercial.leads.form.companyName')}</Label>
              <Input
                id="company_name"
                required
                placeholder={t('comercial.leads.form.companyNamePlaceholder')}
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa_id">{t('comercial.leads.form.groupCompany')}</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(val) => setFormData({ ...formData, empresa_id: val })}
              >
                <SelectTrigger id="empresa_id" className="focus-visible:ring-yellow-500">
                  <SelectValue placeholder={t('comercial.leads.form.groupCompanyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.trade_name || emp.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('comercial.leads.form.contactName')}</Label>
              <Input
                id="name"
                required
                placeholder={t('comercial.leads.form.contactNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('comercial.leads.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder={t('comercial.leads.form.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('comercial.leads.form.phone')}</Label>
                <Input
                  id="phone"
                  required
                  placeholder={t('comercial.leads.form.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('comercial.leads.form.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('comercial.leads.form.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px] focus-visible:ring-yellow-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t('comercial.leads.form.btnCancel')}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold px-6">
                {(isCreating || isUpdating) ? t('comercial.leads.form.btnSaving') : t('comercial.leads.form.btnSave')}
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
              {t('comercial.leads.delete.title')}
            </DialogTitle>
            <DialogDescription>
              {t('comercial.leads.delete.desc', { name: selectedLead?.name })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t('comercial.leads.form.btnCancel')}
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              {isDeleting ? t('comercial.leads.delete.btnConfirming') : t('comercial.leads.delete.btnConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Lead to Client Modal */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
              Converter Lead em Cliente
            </DialogTitle>
            <DialogDescription>
              Verifique e complete as informações do cliente para contratos e faturamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConvert} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_trade_name">Nome Fantasia *</Label>
                <Input
                  id="conv_trade_name"
                  required
                  placeholder="Ex: Mastercorp Portugal"
                  value={conversionData.trade_name}
                  onChange={(e) => setFormData ? setConversionData({ ...conversionData, trade_name: e.target.value }) : null}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_legal_name">Razão Social *</Label>
                <Input
                  id="conv_legal_name"
                  required
                  placeholder="Ex: Mastercorp S.A."
                  value={conversionData.legal_name}
                  onChange={(e) => setConversionData({ ...conversionData, legal_name: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_tax_id">NIF / CIF / CPF *</Label>
                <Input
                  id="conv_tax_id"
                  required
                  placeholder="Ex: 500123456"
                  value={conversionData.tax_id}
                  onChange={(e) => setConversionData({ ...conversionData, tax_id: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_payment_term">Prazo de Pagamento</Label>
                <Select
                  value={conversionData.payment_term_id}
                  onValueChange={(val) => setConversionData({ ...conversionData, payment_term_id: val })}
                >
                  <SelectTrigger id="conv_payment_term" className="focus-visible:ring-emerald-500">
                    <SelectValue placeholder="Selecione o prazo de pagamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / A combinar</SelectItem>
                    {paymentTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_email">E-mail de Contato</Label>
                <Input
                  id="conv_email"
                  type="email"
                  placeholder="Ex: contato@empresa.com"
                  value={conversionData.email}
                  onChange={(e) => setConversionData({ ...conversionData, email: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_billing_email">E-mail Financeiro</Label>
                <Input
                  id="conv_billing_email"
                  type="email"
                  placeholder="Ex: financeiro@empresa.com"
                  value={conversionData.billing_email}
                  onChange={(e) => setConversionData({ ...conversionData, billing_email: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv_phone">Telefone</Label>
              <Input
                id="conv_phone"
                placeholder="Ex: +351 912 345 678"
                value={conversionData.phone}
                onChange={(e) => setConversionData({ ...conversionData, phone: e.target.value })}
                className="focus-visible:ring-emerald-500"
              />
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Endereço</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>País</Label>
                  <CountrySelector
                    value={conversionData.country_id || null}
                    onChange={(val) => setConversionData({ ...conversionData, country_id: val || '', region_id: '' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Região</Label>
                  <RegionSelector
                    countryId={conversionData.country_id || null}
                    value={conversionData.region_id || null}
                    onChange={(val) => setConversionData({ ...conversionData, region_id: val || '' })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conv_province">Província</Label>
                  <Input
                    id="conv_province"
                    placeholder="Ex: Madrid"
                    value={conversionData.province}
                    onChange={(e) => setConversionData({ ...conversionData, province: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conv_city">Cidade</Label>
                  <Input
                    id="conv_city"
                    placeholder="Ex: Lisboa"
                    value={conversionData.city}
                    onChange={(e) => setConversionData({ ...conversionData, city: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conv_postal_code">Código Postal</Label>
                  <Input
                    id="conv_postal_code"
                    placeholder="Ex: 1000-001"
                    value={conversionData.postal_code}
                    onChange={(e) => setConversionData({ ...conversionData, postal_code: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_address_line">Logradouro completo</Label>
                <Input
                  id="conv_address_line"
                  placeholder="Ex: Av. da Liberdade, 123"
                  value={conversionData.address_line}
                  onChange={(e) => setConversionData({ ...conversionData, address_line: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background pb-2">
              <Button type="button" variant="outline" onClick={() => setIsConvertOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6">
                Confirmar e Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
