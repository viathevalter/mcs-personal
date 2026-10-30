import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Calculator, CheckCircle, Loader2, Sparkles, Building2, MapPin, RotateCcw, ExternalLink } from 'lucide-react';
import { useJobFunctions, useAllJobFunctionRates } from '@/features/comercial/estimaciones/hooks/useJobFunctions';
import { useCountries } from '@/features/master-data/locations/hooks/useLocations';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { supabase } from '@/shared/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';
import type { QuickPresupuestoItem } from '../types/dialerTypes';

interface QuickPresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSave: (payload: any) => Promise<void>;
}

const getEmptyItem = (): QuickPresupuestoItem => ({
  job_function_id: '',
  job_title: '',
  quantity: 1,
  hours_per_day: 8,
  days_per_week: 5,
  sell_rate_hour: 0,
  includes_accommodation: true,
  includes_transport: true,
});

export function QuickPresupuestoModal({ isOpen, onClose, lead, onSave }: QuickPresupuestoModalProps) {
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresa();
  const { data: jobFunctions = [] } = useJobFunctions();
  const { data: rateRefs = [] } = useAllJobFunctionRates();
  const { data: countries = [] } = useCountries();

  const leadCountryId = (() => {
    if ((lead as any)?.country_id) return (lead as any).country_id;
    const countryName = ((lead as any)?.country || '').trim().toLowerCase();
    if (countryName) {
      const match = countries.find(c => 
        c.name.toLowerCase() === countryName || 
        c.iso2.toLowerCase() === countryName || 
        c.iso3.toLowerCase() === countryName
      );
      if (match) return match.id;
    }
    return null;
  })();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [workCity, setWorkCity] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingEstimacion, setExistingEstimacion] = useState<{ id: string; codigo: string; status: string } | null>(null);

  const [items, setItems] = useState<QuickPresupuestoItem[]>([getEmptyItem()]);

  const resetToZeroForLead = (targetLead: Lead) => {
    setExistingEstimacion(null);
    setContactName(targetLead.name || '');
    setContactEmail(targetLead.email || '');
    setWorkCity(targetLead.city || targetLead.province || '');
    setLegalName(targetLead.legal_name || targetLead.company_name || '');
    setTaxId(targetLead.tax_id || '');
    setExpectedStartDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setNotes('');
    setItems([getEmptyItem()]);
  };

  // Sempre que abrir o modal ou trocar de Lead, sincroniza dados e verifica se este Lead já possui orçamento
  useEffect(() => {
    if (!isOpen || !lead?.id) return;

    let isCancelled = false;
    resetToZeroForLead(lead);

    const checkExistingBudgetForLead = async () => {
      setLoadingExisting(true);
      try {
        let query = supabase
          .schema('core_comercial')
          .from('estimaciones')
          .select('id, codigo, status, contact_name, contact_email, postal_code, expected_start_date, general_notes, current_version_id')
          .eq('lead_id', lead.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(1);

        if (selectedEmpresaId) {
          query = query.eq('empresa_id', selectedEmpresaId);
        }

        const { data: estList, error } = await query;
        if (error || isCancelled) return;

        const existing = estList?.[0];
        if (!existing) {
          // Não tem orçamento para este lead -> mantém tudo zerado
          return;
        }

        setExistingEstimacion({
          id: existing.id,
          codigo: existing.codigo,
          status: existing.status,
        });

        setContactName(existing.contact_name || lead.name || '');
        setContactEmail(existing.contact_email || lead.email || '');
        setWorkCity(existing.postal_code || lead.city || lead.province || '');
        if (existing.expected_start_date) {
          setExpectedStartDate(existing.expected_start_date.split('T')[0]);
        }
        setNotes(existing.general_notes || '');

        // Carregar os itens da versão atual desse orçamento
        if (existing.current_version_id) {
          const { data: verItems } = await supabase
            .schema('core_comercial')
            .from('estimacion_items')
            .select('*')
            .eq('estimacion_version_id', existing.current_version_id);

          if (!isCancelled && verItems && verItems.length > 0) {
            setItems(
              verItems.map((vi: any) => ({
                job_function_id: vi.job_function_id || '',
                job_title: vi.job_function_name_snapshot || vi.description || '',
                quantity: Number(vi.quantity) || 1,
                hours_per_day: Number(vi.planned_hours_per_day) || 8,
                days_per_week: Number(vi.planned_days_per_week) || 5,
                sell_rate_hour: Number(vi.sell_rate_hour) || 0,
                includes_accommodation: Boolean(vi.includes_housing),
                includes_transport: Boolean(vi.includes_transport),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Erro ao verificar orçamento existente do lead:', err);
      } finally {
        if (!isCancelled) setLoadingExisting(false);
      }
    };

    checkExistingBudgetForLead();

    return () => {
      isCancelled = true;
    };
  }, [lead?.id, isOpen, selectedEmpresaId]);

  const handleAddItem = () => {
    setItems(prev => [...prev, getEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Se só tem 1 item, zera o item ao invés de bloquear
      setItems([getEmptyItem()]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuickPresupuestoItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'job_function_id') {
        const found = jobFunctions.find(jf => jf.id === value);
        if (found) {
          updated[index].job_title = found.name;

          // Lookup country or global tariff
          const jfRates = rateRefs.filter((r: any) => r.job_function_id === value);
          const rateToUse = (leadCountryId && jfRates.find((r: any) => r.country_id === leadCountryId && r.empresa_id === selectedEmpresaId))
            || (leadCountryId && jfRates.find((r: any) => r.country_id === leadCountryId))
            || jfRates.find((r: any) => (!r.country_id || r.country_id === null) && r.empresa_id === selectedEmpresaId)
            || jfRates.find((r: any) => !r.country_id || r.country_id === null);

          if (rateToUse?.recommended_sell_rate_hour) {
            updated[index].sell_rate_hour = Number(rateToUse.recommended_sell_rate_hour);
          } else if (!updated[index].sell_rate_hour) {
            updated[index].sell_rate_hour = 28;
          }
        }
      }

      return updated;
    });
  };

  // Calculations: só contabiliza linhas que tenham cargo selecionado ou taxa definida > 0
  const validItems = items.filter(it => Boolean(it.job_function_id) && (it.sell_rate_hour || 0) > 0);
  const totalMonthlyHours = validItems.reduce((acc, it) => acc + (it.quantity * it.hours_per_day * it.days_per_week * 4), 0);
  const totalEstimatedRevenue = validItems.reduce((acc, it) => {
    const hours = it.quantity * it.hours_per_day * it.days_per_week * 4;
    return acc + (hours * (it.sell_rate_hour || 0));
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(it => !it.job_function_id)) {
      toast.error('Selecione o cargo/função para todos os itens');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        lead_id: lead.id,
        existing_estimacion_id: existingEstimacion?.id || null,
        contact_name: contactName,
        contact_email: contactEmail,
        work_city: workCity,
        expected_start_date: expectedStartDate,
        legal_name: legalName,
        tax_id: taxId,
        items,
        notes,
      });
      toast.success(existingEstimacion ? 'Orçamento atualizado com sucesso!' : 'Pré-Orçamento gerado e vinculado com sucesso!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar orçamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  {existingEstimacion ? `Orçamento ${existingEstimacion.codigo}` : 'Gerar Pré-Orçamento Rápido'}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    {existingEstimacion ? 'Orçamento Existente' : 'Novo Rascunho (Zerado)'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Preencha a demanda levantada na ligação para gerar o orçamento em modo rascunho. Nada é enviado ao cliente agora — você poderá revisar tarifas e margens com calma.
                </DialogDescription>
              </div>
            </div>

            {existingEstimacion && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => resetToZeroForLead(lead)}
                  className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Novo Zerado
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate(`/comercial/estimaciones/${existingEstimacion.id}`);
                  }}
                  className="h-8 text-xs gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Completo
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {loadingExisting ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Verificando histórico de orçamentos deste cliente...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Header Summary Card */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{lead.company_name || lead.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {lead.city || lead.province || lead.country_id || 'Espanha'} • {lead.sector || 'Industrial'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Horas Estimadas/Mês</p>
                  <p className="text-base font-bold text-foreground">{totalMonthlyHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-medium">Faturamento Estimado</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalEstimatedRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields: General */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-medium">Nome do Decisor / Contato</Label>
                <Input
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Ex: Carlos Gutierrez"
                  className="bg-background border-input text-foreground text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-medium">E-mail para Envio da Proposta</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="carlos@empresa.es"
                  className="bg-background border-input text-foreground text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-medium">Local da Obra / Cidade</Label>
                <Input
                  value={workCity}
                  onChange={e => setWorkCity(e.target.value)}
                  placeholder="Ex: Bilbao, País Vasco"
                  className="bg-background border-input text-foreground text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-medium">Data Prevista de Início</Label>
                <Input
                  type="date"
                  value={expectedStartDate}
                  onChange={e => setExpectedStartDate(e.target.value)}
                  className="bg-background border-input text-foreground text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs text-foreground font-medium">Observações da Negociação</Label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Cliente tem parada técnica de 45 dias no estaleiro..."
                  className="bg-background border-input text-foreground text-sm"
                />
              </div>
            </div>

            {/* Dados Fiscais da Empresa */}
            <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Dados Fiscais da Empresa (CIF / Razão Social)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Se coletado na ligação, já qualifica para contrato
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">Razão Social (Nome Registrado)</Label>
                  <Input
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    placeholder="Ex: Garcia & Hijos Construcciones SL"
                    className="bg-background border-input text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">CIF / NIF / Tax ID</Label>
                  <Input
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="Ex: B12345678"
                    className="bg-background border-input text-foreground text-sm uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Technical Team Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-500" />
                  Mão de Obra Solicitada (Perfis Técnicos)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 text-xs bg-background border-input hover:bg-muted text-emerald-600 dark:text-emerald-400 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Função
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-xl bg-muted/30 border border-border space-y-3 relative group"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      {/* Function Selector */}
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Cargo / Especialidade Técnica</Label>
                        <Select
                          value={item.job_function_id}
                          onValueChange={val => handleItemChange(index, 'job_function_id', val)}
                        >
                          <SelectTrigger className="bg-background border-input text-foreground text-xs h-9">
                            <SelectValue placeholder="Selecione o cargo..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-card-foreground border-border text-xs">
                            {jobFunctions.map(jf => (
                              <SelectItem key={jf.id} value={jf.id}>
                                {jf.name} ({jf.code || 'TEC'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Qtd Técnicos</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="bg-background border-input text-foreground text-xs h-9"
                        />
                      </div>

                      {/* Hours/Day */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Horas/Dia</Label>
                        <Input
                          type="number"
                          min={1}
                          max={16}
                          value={item.hours_per_day}
                          onChange={e => handleItemChange(index, 'hours_per_day', parseFloat(e.target.value) || 8)}
                          className="bg-background border-input text-foreground text-xs h-9"
                        />
                      </div>

                      {/* Sell Rate / Hour */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Taxa Venda (€/h)</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                          <Input
                            type="number"
                            step="0.5"
                            min={0}
                            value={item.sell_rate_hour || ''}
                            placeholder="0.00"
                            onChange={e => handleItemChange(index, 'sell_rate_hour', parseFloat(e.target.value) || 0)}
                            className="bg-background border-input text-foreground text-xs h-9 pl-7 font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      </div>

                      {/* Delete item */}
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-500 hover:bg-muted"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Inclusion checkboxes */}
                    <div className="flex items-center gap-6 pt-1 text-xs text-foreground">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={item.includes_accommodation}
                          onCheckedChange={c => handleItemChange(index, 'includes_accommodation', !!c)}
                        />
                        <span>Inclui Alojamento MCS</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={item.includes_transport}
                          onCheckedChange={c => handleItemChange(index, 'includes_transport', !!c)}
                        />
                        <span>Inclui Transporte / Viatura</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-0 pt-4 border-t border-border flex justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  🛡️ <strong>Rascunho Interno:</strong> Nada é enviado ao cliente agora. Você poderá revisar tarifas antes de enviar.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-input text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 gap-2 shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {existingEstimacion ? 'Atualizar Orçamento' : 'Salvar Rascunho & Criar Orçamento'}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
