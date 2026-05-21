import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import type { Estimacion } from '../types';

interface Props {
  estimacion: Estimacion;
}

export function ApproveEstimacionButton({ estimacion }: Props) {
  const [open, setOpen] = useState(false);
  const { aprovarEstimacion } = useEstimacionMutations();

  // Apenas rascunho ou enviada podem ser aprovadas
  if (!['draft', 'sent'].includes(estimacion.status)) {
    return null;
  }

  const handleApprove = () => {
    aprovarEstimacion.mutate(estimacion.id, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <>
      <Button 
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => setOpen(true)}
      >
        <PlayCircle className="mr-2 h-4 w-4" />
        Aprovar e Gerar Pedido
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar a estimación <strong>{estimacion.codigo}</strong>?
              Isso irá gerar automaticamente um Pedido de Venda e iniciará o playbook operacional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Esta ação não pode ser desfeita.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={aprovarEstimacion.isPending}>
              Cancelar
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleApprove}
              disabled={aprovarEstimacion.isPending}
            >
              {aprovarEstimacion.isPending ? 'Aprovando...' : 'Sim, Aprovar Estimación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
