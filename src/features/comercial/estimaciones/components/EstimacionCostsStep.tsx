import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionCostsStep({ data, onChange }: Props) {
  const { t } = useTranslation();
  
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
    if (data.costs[index]?.is_auto) return;
    const newCosts = [...data.costs];
    newCosts.splice(index, 1);
    
    let cost = 0;
    let rev = 0;
    data.items.forEach((item: any) => {
      const cssh = item.ss_cost_hour || 0;
      cost += (Number(item.base_cost_hour) + cssh) * Number(item.total_hours);
      rev += Number(item.sell_rate_hour) * Number(item.total_hours);
    });
    
    newCosts.forEach((c: any) => {
      if (c.cost_category === 'social_security') return;
      cost += Number(c.amount);
      if (c.is_rechargeable) {
        rev += Number(c.amount) * (1 + (Number(c.markup_percent) / 100));
      }
    });
    
    const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
    
    onChange({ 
      costs: newCosts,
      total_estimated_cost: Number(cost.toFixed(2)),
      total_estimated_revenue: Number(rev.toFixed(2)),
      estimated_margin_percent: Number(margin.toFixed(2))
    });
  };

  const updateCost = (index: number, field: string, value: any) => {
    if (data.costs[index]?.is_auto) return;
    const newCosts = [...data.costs];
    newCosts[index] = { ...newCosts[index], [field]: value };
    
    let cost = 0;
    let rev = 0;
    data.items.forEach((item: any) => {
      const cssh = item.ss_cost_hour || 0;
      cost += (Number(item.base_cost_hour) + cssh) * Number(item.total_hours);
      rev += Number(item.sell_rate_hour) * Number(item.total_hours);
    });
    
    newCosts.forEach((c: any) => {
      if (c.cost_category === 'social_security') return;
      cost += Number(c.amount);
      if (c.is_rechargeable) {
        rev += Number(c.amount) * (1 + (Number(c.markup_percent) / 100));
      }
    });
    
    const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
    
    onChange({ 
      costs: newCosts,
      total_estimated_cost: Number(cost.toFixed(2)),
      total_estimated_revenue: Number(rev.toFixed(2)),
      estimated_margin_percent: Number(margin.toFixed(2))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-1">{t('comercial.stepCosts.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('comercial.stepCosts.subtitle')}</p>
        </div>
        <Button onClick={addCost} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          {t('comercial.stepCosts.btnAdd')}
        </Button>
      </div>

      {data.costs.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg border-slate-200 dark:border-slate-800 text-slate-500 bg-white dark:bg-slate-950/20">
          {t('comercial.stepCosts.noCosts')}
        </div>
      ) : (
        <div className="space-y-4">
          {data.costs.map((cost: any, idx: number) => (
            <div 
              key={cost.id} 
              className={`p-4 border rounded-lg relative flex flex-col md:flex-row gap-4 items-end transition-all ${
                cost.is_auto 
                  ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <Label className={cost.is_auto ? "text-slate-500 dark:text-slate-400 text-xs" : "text-xs text-slate-750 dark:text-slate-300"}>{t('comercial.stepCosts.categoryLabel')}</Label>
                  {cost.is_auto && (
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/50 font-mono">
                      {t('comercial.stepCosts.automaticLabel')}
                    </span>
                  )}
                </div>
                <Select 
                  value={cost.cost_category} 
                  onValueChange={(val) => updateCost(idx, 'cost_category', val)}
                  disabled={cost.is_auto}
                >
                  <SelectTrigger className={cost.is_auto ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <SelectItem value="housing">{t('comercial.costCategories.housing')}</SelectItem>
                    <SelectItem value="transport">{t('comercial.costCategories.transport')}</SelectItem>
                    <SelectItem value="epi">{t('comercial.costCategories.epi')}</SelectItem>
                    <SelectItem value="social_security">{t('comercial.costCategories.social_security')}</SelectItem>
                    <SelectItem value="documentation">{t('comercial.costCategories.documentation')}</SelectItem>
                    <SelectItem value="other">{t('comercial.costCategories.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-[2]">
                <Label className={cost.is_auto ? "text-slate-500 dark:text-slate-400 text-xs" : "text-xs text-slate-750 dark:text-slate-300"}>{t('comercial.stepCosts.descriptionLabel')}</Label>
                <Input 
                  placeholder={t('comercial.stepCosts.descPlaceholder')}
                  value={cost.description}
                  onChange={(e) => updateCost(idx, 'description', e.target.value)}
                  disabled={cost.is_auto}
                  className={cost.is_auto ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"}
                />
              </div>

              <div className="space-y-2 w-32">
                <Label className={cost.is_auto ? "text-slate-500 dark:text-slate-400 text-xs" : "text-xs text-slate-750 dark:text-slate-300"}>{t('comercial.stepCosts.amountLabel')}</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={cost.amount}
                  onChange={(e) => updateCost(idx, 'amount', e.target.value)}
                  disabled={cost.is_auto}
                  className={cost.is_auto ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"}
                />
              </div>

              <div className={`flex flex-col items-center justify-center h-10 px-4 rounded-md border ${
                cost.is_auto ? 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`rech-${idx}`} 
                    checked={cost.is_rechargeable}
                    onCheckedChange={(c) => updateCost(idx, 'is_rechargeable', c)}
                    disabled={cost.is_auto}
                    className={cost.is_auto ? "border-slate-300 dark:border-slate-800" : "border-slate-300 dark:border-slate-700"}
                  />
                  <label htmlFor={`rech-${idx}`} className={`text-xs font-semibold cursor-pointer ${
                    cost.is_auto ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {t('comercial.stepCosts.rechargeLabel')}
                  </label>
                </div>
              </div>

              {cost.is_rechargeable && (
                <div className="space-y-2 w-24">
                  <Label className={cost.is_auto ? "text-slate-500 dark:text-slate-400 text-xs" : "text-xs text-slate-750 dark:text-slate-300"}>{t('comercial.stepCosts.markupLabel')}</Label>
                  <Input 
                    type="number" 
                    value={cost.markup_percent}
                    onChange={(e) => updateCost(idx, 'markup_percent', e.target.value)}
                    disabled={cost.is_auto}
                    className={cost.is_auto ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"}
                  />
                </div>
              )}

              {!cost.is_auto ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-400 hover:text-red-500 mb-0.5"
                  onClick={() => removeCost(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-600 mb-0.5" title={t('comercial.stepCosts.autoCostHelp')}>
                  <HelpCircle className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
