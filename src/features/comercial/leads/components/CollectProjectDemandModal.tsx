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
import { 
  Wrench, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  FileText, 
  Loader2, 
  Calculator,
  Check
} from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface CollectProjectDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onOpenQuickPresupuesto?: () => void;
}

const AVAILABLE_PROFILES = [
  { key: 'soldadores', label: 'Soldadores (TIG / MIG / Eletrodo)', icon: '🔥' },
  { key: 'tuberos', label: 'Tubistas Industriais', icon: '🔧' },
  { key: 'caldereros', label: 'Caldeireiros', icon: '⚙️' },
  { key: 'electricistas', label: 'Eletricistas Industriais', icon: '⚡' },
  { key: 'montadores', label: 'Montadores de Estrutura', icon: '🏗️' },
  { key: 'electromecanicos', label: 'Eletromecânicos', icon: '🔩' },
  { key: 'obra_civil', label: 'Construção Civil / Obra', icon: '🧱' },
  { key: 'otros', label: 'Outros Perfis Técnicos', icon: '📋' },
];

export function CollectProjectDemandModal({
  isOpen,
  onClose,
  lead,
  onOpenQuickPresupuesto,
}: CollectProjectDemandModalProps) {
  const queryClient = useQueryClient();

  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [workersCount, setWorkersCount] = useState('2');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('');
  const [workAddress, setWorkAddress] = useState(lead.city || lead.province || '');
  const [daysHours, setDaysHours] = useState('Seg a Sex, 8h às 17h (40h/sem)');
  const [entryTime, setEntryTime] = useState('08:00');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleProfile = (key: string) => {
    setSelectedProfiles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSaveDemand = async (proceedToBudget: boolean = false) => {
    if (selectedProfiles.length === 0 && !additionalNotes.trim()) {
      toast.error('Selecione pelo menos um perfil profissional ou descreva a demanda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedLabels = selectedProfiles.map(k => {
        const item = AVAILABLE_PROFILES.find(p => p.key === k);
        return item ? item.label : k;
      });

      const formattedDemand = `--- SOLICITAÇÃO DE ORÇAMENTO (COLETA TELEMARKETING) ---
• Perfis Profissionais Requeridos: ${selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Não especificado'}
• Quantidade de Operários: ${workersCount || 'A definir'}
• Início Previsto: ${startDate || 'A definir'}
• Duração Estimada / Fim: ${duration || 'A definir'}
• Local da Obra: ${workAddress || lead.city || 'Não especificado'}
• Horário / Jornada: ${daysHours || 'Padrão'}
• Hora de Entrada: ${entryTime || '08:00'}
${additionalNotes ? `• Detalhes / Observações: ${additionalNotes}` : ''}
• Coletado em: ${new Date().toLocaleString('pt-BR')}
-------------------------------------------------------`;

      const updatedNotes = lead.notes 
        ? `${lead.notes}\n\n${formattedDemand}`
        : formattedDemand;

      // 1. Atualiza Lead no Supabase
      const { error: updateLeadError } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          notes: updatedNotes,
          sector: selectedLabels.length > 0 ? selectedLabels[0] : lead.sector,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (updateLeadError) throw updateLeadError;

      // 2. Invalida cache de queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['lead_call_logs', lead.id] });

      toast.success('Demanda do projeto e perfis salvos no lead com sucesso!');
      onClose();

      if (proceedToBudget && onOpenQuickPresupuesto) {
        onOpenQuickPresupuesto();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar demanda do projeto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Coleta de Demanda de Obra & Perfis Técnicos
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Preencha os operários e requisitos de obra informados pelo cliente ({lead.company_name || lead.name}) durante a chamada.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Seção 1: Perfis Profissionais Requeridos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Perfis Profissionais Requeridos pelo Cliente:
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedProfiles.length} selecionado(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {AVAILABLE_PROFILES.map(prof => {
                const isSelected = selectedProfiles.includes(prof.key);
                return (
                  <button
                    key={prof.key}
                    type="button"
                    onClick={() => toggleProfile(prof.key)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{prof.icon}</span>
                      <span className="truncate">{prof.label}</span>
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Quantidade & Prazos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                Qtd. de Operários
              </Label>
              <Input
                type="number"
                min="1"
                value={workersCount}
                onChange={e => setWorkersCount(e.target.value)}
                placeholder="Ex: 4"
                className="h-8 text-xs bg-background border-input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                Previsão de Início
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-8 text-xs bg-background border-input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Duração Estimada
              </Label>
              <Input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="Ex: 3 meses / Parada"
                className="h-8 text-xs bg-background border-input"
              />
            </div>
          </div>

          {/* Seção 3: Local da Obra & Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                Endereço / Cidade da Obra
              </Label>
              <Input
                type="text"
                value={workAddress}
                onChange={e => setWorkAddress(e.target.value)}
                placeholder="Ex: Refinaria Repsol, Cartagena (Murcia)"
                className="h-8 text-xs bg-background border-input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Jornada & Dias Previstos
              </Label>
              <Input
                type="text"
                value={daysHours}
                onChange={e => setDaysHours(e.target.value)}
                placeholder="Ex: Seg a Sex, 40h/sem"
                className="h-8 text-xs bg-background border-input"
              />
            </div>
          </div>

          {/* Seção 4: Requisitos e Anotações Técnicas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <FileText className="w-3 h-3 text-muted-foreground" />
              Observações Técnicas / Exigências do Cliente
            </Label>
            <Textarea
              rows={3}
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              placeholder="Ex: Cliente exige teste de solda 6G raio-X no local. Necessita alojamento por nossa conta..."
              className="text-xs bg-background border-input resize-none"
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-input w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSaveDemand(false)}
              className="text-xs border-input gap-1.5 w-full sm:w-auto text-foreground"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
              Salvar Demanda no Lead
            </Button>

            {onOpenQuickPresupuesto && (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleSaveDemand(true)}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm w-full sm:w-auto"
              >
                <Calculator className="w-3.5 h-3.5" />
                Salvar & Gerar Orçamento
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
