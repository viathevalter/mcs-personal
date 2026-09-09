import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  PhoneForwarded, 
  Clock, 
  Calendar, 
  Check, 
  RotateCcw, 
  UserCheck 
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface GatekeeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onConfirm: (gatekeeperNotes: string, actionType: 'requeue_end' | 'schedule_tomorrow', scheduledIso?: string) => void;
  isSubmitting?: boolean;
}

export function GatekeeperModal({
  isOpen,
  onClose,
  lead,
  onConfirm,
  isSubmitting = false,
}: GatekeeperModalProps) {
  const [gatekeeperName, setGatekeeperName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [bestTimeToCall, setBestTimeToCall] = useState('A partir das 10h da manhã');
  const [actionType, setActionType] = useState<'requeue_end' | 'schedule_tomorrow'>('schedule_tomorrow');

  const handleSave = () => {
    let notes = `Atendido por recepção/secretária: ${gatekeeperName || 'Não informou nome'}. Melhores horários: ${bestTimeToCall}`;
    if (directPhone) {
      notes += ` • Ramal/Celular Direto: ${directPhone}`;
    }

    let scheduledIso: string | undefined = undefined;
    if (actionType === 'schedule_tomorrow') {
      const tomorrow = addDays(new Date(), 1);
      const dateStr = format(tomorrow, 'yyyy-MM-dd');
      scheduledIso = new Date(`${dateStr}T10:00:00`).toISOString();
    }

    onConfirm(notes, actionType, scheduledIso);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PhoneForwarded className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Recepção / Sem Decisor no Momento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registre os dados da recepção e programe a melhor forma de falar com o tomador de decisão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome da Recepcionista / Secretária</Label>
            <Input
              value={gatekeeperName}
              onChange={e => setGatekeeperName(e.target.value)}
              placeholder="Ex: Sra. Maria (Secretária de Compras)"
              className="bg-background border-input text-foreground text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Ramal ou Celular Direto Informado (Opcional)</Label>
            <Input
              value={directPhone}
              onChange={e => setDirectPhone(e.target.value)}
              placeholder="Ex: Ramal 204 ou +34 600 000 000"
              className="bg-background border-input text-foreground text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Quando o decisor estará na empresa?</Label>
            <Input
              value={bestTimeToCall}
              onChange={e => setBestTimeToCall(e.target.value)}
              placeholder="Ex: Após às 15:00 ou amanhã de manhã"
              className="bg-background border-input text-foreground text-xs h-9"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Próximo Passo:</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('schedule_tomorrow')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                  actionType === 'schedule_tomorrow'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Agendar Amanhã (10:00)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('requeue_end')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                  actionType === 'requeue_end'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-indigo-500" />
                <span>Mover p/ Fim da Fila</span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-input text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 gap-1.5"
          >
            <Check className="w-4 h-4" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
