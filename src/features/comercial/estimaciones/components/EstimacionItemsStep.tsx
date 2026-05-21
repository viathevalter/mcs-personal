import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useJobFunctions } from '../hooks/useJobFunctions';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionItemsStep({ data, onChange }: Props) {
  const { data: jobFunctions = [] } = useJobFunctions();

  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(), // Temp ID for UI mapping
      job_function_id: '',
      quantity: 1,
      planned_hours_per_day: 8,
      planned_days_per_week: 5,
      total_hours: 160,
      includes_accommodation: false,
      includes_transport: false,
      includes_ppe: false,
      base_cost_hour: 0,
      recommended_sell_rate: 0,
      minimum_sell_rate: 0,
      sell_rate_hour: 0,
      margin_percent: 0,
      risk_level: 'medium',
      notes: ''
    };
    handleItemsChange([...data.items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    handleItemsChange(newItems);
  };

  const updateItem = (index: number, updates: Record<string, any>) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], ...updates };

    // Auto-calculate total hours if related fields changed
    if ('quantity' in updates || 'planned_hours_per_day' in updates || 'planned_days_per_week' in updates) {
      const q = newItems[index].quantity;
      const h = newItems[index].planned_hours_per_day;
      const d = newItems[index].planned_days_per_week;
      newItems[index].total_hours = q * h * d * 4; 
    }

    // Auto-calculate margin if costs/rates changed
    if ('base_cost_hour' in updates || 'sell_rate_hour' in updates) {
      const cost = Number(newItems[index].base_cost_hour);
      const sell = Number(newItems[index].sell_rate_hour);
      if (sell > 0) {
        newItems[index].margin_percent = Number((((sell - cost) / sell) * 100).toFixed(2));
      } else {
        newItems[index].margin_percent = 0;
      }
    }

    handleItemsChange(newItems);
  };

  // Recalculate global totals
  const handleItemsChange = (newItems: any[]) => {
    let cost = 0;
    let rev = 0;
    newItems.forEach(item => {
      cost += Number(item.base_cost_hour) * Number(item.total_hours);
      rev += Number(item.sell_rate_hour) * Number(item.total_hours);
    });
    
    // Add costs from data.costs
    data.costs?.forEach((c: any) => {
      cost += Number(c.amount);
      if (c.is_rechargeable) {
        rev += Number(c.amount) * (1 + (Number(c.markup_percent) / 100));
      }
    });

    const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;

    onChange({
      items: newItems,
      total_estimated_cost: cost,
      total_estimated_revenue: rev,
      estimated_margin_percent: Number(margin.toFixed(2))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-1">Perfis Profissionais e Serviços</h2>
          <p className="text-sm text-muted-foreground">Adicione os perfis, horas e calcule as tarifas.</p>
        </div>
        <Button onClick={addItem} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Perfil
        </Button>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50 text-slate-500">
          Nenhum perfil adicionado ainda. Clique em "Adicionar Perfil" para começar.
        </div>
      ) : (
        <div className="space-y-6">
          {data.items.map((item: any, idx: number) => (
            <div key={item.id} className="p-4 border rounded-lg bg-slate-50/50 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-10">
                <div className="space-y-2 md:col-span-2">
                  <Label>Função / Perfil</Label>
                  <Select 
                    value={item.job_function_id} 
                    onValueChange={(val) => {
                      const jf = jobFunctions.find((j: any) => j.id === val);
                      updateItem(idx, {
                        job_function_id: val,
                        ...(jf ? { risk_level: jf.risk_level || 'medium' } : {})
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Função" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobFunctions.map((jf: any) => (
                        <SelectItem key={jf.id} value={jf.id}>{jf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas Totais</Label>
                  <Input 
                    type="number" 
                    value={item.total_hours}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                {/* Linha 2 */}
                <div className="space-y-2">
                  <Label>Custo Base Hora (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.base_cost_hour}
                    onChange={(e) => updateItem(idx, { base_cost_hour: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tarifa Venda (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.sell_rate_hour}
                    onChange={(e) => updateItem(idx, { sell_rate_hour: e.target.value })}
                    className="border-primary/50 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Margem (%)</Label>
                  <Input 
                    type="text" 
                    value={item.margin_percent + '%'}
                    disabled
                    className={`font-medium ${
                      item.margin_percent >= 20 ? 'text-emerald-600 bg-emerald-50' : 
                      item.margin_percent >= 10 ? 'text-amber-600 bg-amber-50' : 
                      'text-red-600 bg-red-50'
                    }`}
                  />
                </div>

                <div className="flex flex-col space-y-3 pt-6 md:col-span-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`acc-${idx}`} 
                      checked={item.includes_accommodation}
                      onCheckedChange={(c) => updateItem(idx, { includes_accommodation: c })}
                    />
                    <label htmlFor={`acc-${idx}`} className="text-sm cursor-pointer">Alojamento</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`trans-${idx}`} 
                      checked={item.includes_transport}
                      onCheckedChange={(c) => updateItem(idx, { includes_transport: c })}
                    />
                    <label htmlFor={`trans-${idx}`} className="text-sm cursor-pointer">Transporte</label>
                  </div>
                </div>

              </div>
            </div>
          ))}
          
        </div>
      )}
    </div>
  );
}
