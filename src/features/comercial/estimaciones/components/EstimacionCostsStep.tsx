import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionCostsStep({ data, onChange }: Props) {
  
  const addCost = () => {
    const newCost = {
      id: crypto.randomUUID(),
      cost_category: 'other',
      description: '',
      amount: 0,
      is_rechargeable: false,
      markup_percent: 0,
    };
    onChange({ costs: [...data.costs, newCost] });
  };

  const removeCost = (index: number) => {
    const newCosts = [...data.costs];
    newCosts.splice(index, 1);
    onChange({ costs: newCosts });
  };

  const updateCost = (index: number, field: string, value: any) => {
    const newCosts = [...data.costs];
    newCosts[index] = { ...newCosts[index], [field]: value };
    
    // Auto trigger recalculation of global totals (same as items step)
    // We defer to the parent payload state but need a trigger.
    onChange({ costs: newCosts });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-1">Custos Adicionais e Reembolsos</h2>
          <p className="text-sm text-muted-foreground">Registre custos logísticos, administrativos ou materiais adicionais.</p>
        </div>
        <Button onClick={addCost} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Custo
        </Button>
      </div>

      {data.costs.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg text-slate-500">
          Nenhum custo adicional previsto (Opcional).
        </div>
      ) : (
        <div className="space-y-4">
          {data.costs.map((cost: any, idx: number) => (
            <div key={cost.id} className="p-4 border rounded-lg bg-white relative flex flex-col md:flex-row gap-4 items-end">
              
              <div className="space-y-2 flex-1">
                <Label>Categoria</Label>
                <Select 
                  value={cost.cost_category} 
                  onValueChange={(val) => updateCost(idx, 'cost_category', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="housing">Alojamento</SelectItem>
                    <SelectItem value="transport">Transporte / Voos</SelectItem>
                    <SelectItem value="epi">EPIs</SelectItem>
                    <SelectItem value="documentation">Documentação</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-[2]">
                <Label>Descrição</Label>
                <Input 
                  placeholder="Ex: Voo Lisboa - Madrid"
                  value={cost.description}
                  onChange={(e) => updateCost(idx, 'description', e.target.value)}
                />
              </div>

              <div className="space-y-2 w-32">
                <Label>Valor Total (€)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={cost.amount}
                  onChange={(e) => updateCost(idx, 'amount', e.target.value)}
                />
              </div>

              <div className="flex flex-col items-center justify-center h-10 px-4 bg-slate-50 rounded-md border">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`rech-${idx}`} 
                    checked={cost.is_rechargeable}
                    onCheckedChange={(c) => updateCost(idx, 'is_rechargeable', c)}
                  />
                  <label htmlFor={`rech-${idx}`} className="text-xs font-medium cursor-pointer">
                    Repassar ao Cliente
                  </label>
                </div>
              </div>

              {cost.is_rechargeable && (
                <div className="space-y-2 w-24">
                  <Label>Markup (%)</Label>
                  <Input 
                    type="number" 
                    value={cost.markup_percent}
                    onChange={(e) => updateCost(idx, 'markup_percent', e.target.value)}
                  />
                </div>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-500 mb-0.5"
                onClick={() => removeCost(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
