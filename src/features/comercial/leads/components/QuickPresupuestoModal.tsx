import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Calculator, CheckCircle, FileText, Loader2, Sparkles, Building2, MapPin } from 'lucide-react';
import { useJobFunctions } from '@/features/comercial/estimaciones/hooks/useJobFunctions';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';
import type { QuickPresupuestoItem } from '../types/dialerTypes';

interface QuickPresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSave: (payload: any) => Promise<void>;
}

export function QuickPresupuestoModal({ isOpen, onClose, lead, onSave }: QuickPresupuestoModalProps) {
  const { selectedEmpresaId } = useEmpresa();
  const { data: jobFunctions = [], isLoading: loadingFunctions } = useJobFunctions();

  const [contactName, setContactName] = useState(lead.name || lead.company_name || '');
  const [contactEmail, setContactEmail] = useState(lead.email || '');
  const [workCity, setWorkCity] = useState(lead.city || lead.province || '');
  const [expectedStartDate, setExpectedStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<QuickPresupuestoItem[]>([
    {
      job_function_id: '',
      job_title: '',
      quantity: 2,
      hours_per_day: 8,
      days_per_week: 5,
      sell_rate_hour: 28,
      includes_accommodation: true,
      includes_transport: true,
    }
  ]);

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        job_function_id: '',
        job_title: '',
        quantity: 1,
        hours_per_day: 8,
        days_per_week: 5,
        sell_rate_hour: 28,
        includes_accommodation: true,
        includes_transport: true,
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('O orçamento precisa de pelo menos uma função técnica');
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
        }
      }

      return updated;
    });
  };

  // Calculations
  const totalMonthlyHours = items.reduce((acc, it) => acc + (it.quantity * it.hours_per_day * it.days_per_week * 4), 0);
  const totalEstimatedRevenue = items.reduce((acc, it) => {
    const hours = it.quantity * it.hours_per_day * it.days_per_week * 4;
    return acc + (hours * (it.sell_rate_hour || 28));
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items[0].job_function_id && jobFunctions.length > 0) {
      // Pick first available job function if left blank
      items[0].job_function_id = jobFunctions[0].id;
      items[0].job_title = jobFunctions[0].name;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        empresa_id: selectedEmpresaId,
        lead_id: lead.id,
        title: `Pré-Orçamento: ${lead.company_name || lead.name} (${workCity || 'Espanha'})`,
        contact_name: contactName,
        contact_email: contactEmail,
        work_city: workCity,
        expected_start_date: expectedStartDate,
        items,
        notes,
      });
      toast.success('Pré-Orçamento gerado e vinculado com sucesso!');
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 text-slate-100 p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Gerar Pré-Orçamento Rápido
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Inside Sales
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Preencha os perfis técnicos solicitados pelo cliente durante a ligação para gerar a estimativa comercial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-white">{lead.company_name || lead.name}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {lead.city || lead.province || lead.country_id || 'Espanha'} • {lead.sector || 'Industrial'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-xs text-slate-400 uppercase font-medium">Horas Estimadas/Mês</p>
                <p className="text-base font-bold text-slate-200">{totalMonthlyHours}h</p>
              </div>
              <div>
                <p className="text-xs text-emerald-400 uppercase font-medium">Faturamento Estimado</p>
                <p className="text-lg font-bold text-emerald-400">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalEstimatedRevenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields: General */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Nome do Decisor / Contato</Label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Ex: Carlos Gutierrez"
                className="bg-slate-900 border-slate-800 text-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">E-mail para Envio da Proposta</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="carlos@empresa.es"
                className="bg-slate-900 border-slate-800 text-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Local da Obra / Cidade</Label>
              <Input
                value={workCity}
                onChange={e => setWorkCity(e.target.value)}
                placeholder="Ex: Bilbao, País Vasco"
                className="bg-slate-900 border-slate-800 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Data Prevista de Início</Label>
              <Input
                type="date"
                value={expectedStartDate}
                onChange={e => setExpectedStartDate(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Observações da Negociação</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Cliente tem parada técnica de 45 dias no estaleiro..."
                className="bg-slate-900 border-slate-800 text-white text-sm"
              />
            </div>
          </div>

          {/* Technical Team Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Mão de Obra Solicitada (Perfis Técnicos)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-xs bg-slate-900 border-slate-700 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Função
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3 relative group"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Function Selector */}
                    <div className="sm:col-span-4 space-y-1">
                      <Label className="text-xs text-slate-400">Função / Categoria</Label>
                      <Select
                        value={item.job_function_id}
                        onValueChange={val => handleItemChange(index, 'job_function_id', val)}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                          <SelectValue placeholder="Selecione a função..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {jobFunctions.map(jf => (
                            <SelectItem key={jf.id} value={jf.id} className="text-xs">
                              {jf.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-slate-400">Qtd Técnicos</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Rate/Hour */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-slate-400">Tarifa Venda (€/h)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="10"
                        value={item.sell_rate_hour}
                        onChange={e => handleItemChange(index, 'sell_rate_hour', parseFloat(e.target.value) || 28)}
                        className="bg-slate-950 border-slate-800 text-emerald-400 font-semibold text-xs h-9"
                      />
                    </div>

                    {/* Hours/Day */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-slate-400">Horas/Dia</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={item.hours_per_day}
                        onChange={e => handleItemChange(index, 'hours_per_day', parseInt(e.target.value) || 8)}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Delete button */}
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="h-9 w-9 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Included benefits checkboxes */}
                  <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={item.includes_accommodation}
                        onCheckedChange={c => handleItemChange(index, 'includes_accommodation', !!c)}
                      />
                      <span>Inclui Alojamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={item.includes_transport}
                        onCheckedChange={c => handleItemChange(index, 'includes_transport', !!c)}
                      />
                      <span>Inclui Deslocamento/Transporte</span>
                    </label>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">
                      Subtotal mensal: <strong className="text-emerald-400">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                          item.quantity * item.hours_per_day * item.days_per_week * 4 * item.sell_rate_hour
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-0 pt-4 border-t border-slate-800 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold gap-2 shadow-lg shadow-emerald-950/50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando Orçamento...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Confirmar & Gerar Estimativa
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
