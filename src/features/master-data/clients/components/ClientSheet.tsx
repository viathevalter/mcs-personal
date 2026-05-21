import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Client } from '../types';
import { ClientForm } from './ClientForm';

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientSheet({ open, onOpenChange, client }: ClientSheetProps) {
  const isEditing = !!client;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Edite as informações completas deste cliente.' 
              : 'Cadastre os dados completos do novo cliente para contratos e faturamento.'}
          </SheetDescription>
        </SheetHeader>

        <ClientForm 
          client={client} 
          onSuccess={() => onOpenChange(false)} 
          onCancel={() => onOpenChange(false)}
          isSheet={true}
        />
      </SheetContent>
    </Sheet>
  );
}
