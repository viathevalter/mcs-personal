import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PhoneCall, Users, BookOpen, Loader2, Sparkles, Zap, CheckCircle } from 'lucide-react';
import { useSalespeople } from '../hooks/useLeads';
import { useSalesScripts, useMutateDialer } from '../hooks/useDialer';
import { toast } from 'sonner';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  selectedCount: number;
}

export function CreateCampaignModal({ isOpen, onClose, selectedLeadIds, selectedCount }: CreateCampaignModalProps) {
  const navigate = useNavigate();
  const { data: salespeople = [] } = useSalespeople();
  const { data: scripts = [] } = useSalesScripts();
  const { createCampaign, isCreatingCampaign } = useMutateDialer();

  const [title, setTitle] = useState(`Fila de Prospecção - ${new Date().toLocaleDateString('pt-BR')}`);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [scriptId, setScriptId] = useState<string>(scripts[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeadIds.length === 0) {
      toast.error('Nenhum lead selecionado para a fila de discagem');
      return;
    }

    try {
      const newCampaign = await createCampaign({
        title,
        description,
        assigned_to: assignedTo !== 'unassigned' ? assignedTo : null,
        script_id: scriptId || (scripts[0]?.id || null),
        lead_ids: selectedLeadIds,
      });

      toast.success(`Fila com ${selectedLeadIds.length} leads criada com sucesso!`);
      onClose();
      navigate(`/comercial/discador?campaignId=${newCampaign.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao criar fila de discagem');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Criar Fila de Discagem (Power Dialer)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Gere um trabalho sequencial de prospecção para ligar para as empresas selecionadas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selected Leads Alert */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-slate-300">Empresas selecionadas no mailing:</span>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {selectedCount} Empresas
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Nome do Trabalho / Campanha</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Campanha Calderería & Estruturas - Omar"
              required
              className="bg-slate-900 border-slate-800 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Vendedor Responsável (SDR)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione o operador..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="unassigned" className="text-xs">
                    Qualquer operador disponível
                  </SelectItem>
                  {salespeople.map(sp => (
                    <SelectItem key={sp.id} value={sp.id} className="text-xs">
                      {sp.display_name || sp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Roteiro de Vendas (Script)</Label>
              <Select 
                value={scriptId || (scripts[0]?.id || '')} 
                onValueChange={setScriptId}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione o script..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {scripts.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Observações / Meta da Campanha (Opcional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Focar na identificação de paradas de manutenção previstas para o próximo trimestre..."
              rows={2}
              className="bg-slate-900 border-slate-800 text-white text-xs resize-none"
            />
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
              disabled={isCreatingCampaign}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold gap-2 shadow-lg shadow-blue-950/50"
            >
              {isCreatingCampaign ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando Fila...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Iniciar Fila no Cockpit
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
