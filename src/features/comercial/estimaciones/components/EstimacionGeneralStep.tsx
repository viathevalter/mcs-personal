import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useLeads } from '@/features/comercial/leads/hooks/useLeads';
import { CountrySelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Utility functions for date calculations
function countWeekdays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;
  
  let count = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function countTotalDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return diffDays;
}

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionGeneralStep({ data, onChange }: Props) {
  const { t } = useTranslation();
  const [targetType, setTargetType] = useState<'client' | 'lead'>(data.lead_id ? 'lead' : 'client');
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads();
  const { data: sites = [], isLoading: isLoadingSites } = useClientSites(data.client_id || undefined);

  const totalDays = countTotalDays(data.expected_start_date, data.expected_end_date);
  const weekdays = countWeekdays(data.expected_start_date, data.expected_end_date);
  const weeksVal = totalDays / 7;
  const formattedWeeks = Number.isInteger(weeksVal) ? weeksVal.toString() : weeksVal.toFixed(1);
  const monthsVal = totalDays / 30;
  const formattedMonths = Number.isInteger(monthsVal) ? monthsVal.toString() : monthsVal.toFixed(1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">{t('comercial.stepGeneral.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('comercial.stepGeneral.subtitle')}</p>
      </div>

      <div className="max-w-md">
        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">{t('comercial.stepGeneral.targetType')}</Label>
        <Tabs 
          value={targetType} 
          onValueChange={(val) => {
            const type = val as 'client' | 'lead';
            setTargetType(type);
            if (type === 'client') {
              onChange({ lead_id: null, client_id: '', contact_name: '', contact_email: '' });
            } else {
              onChange({ client_id: null, client_site_id: null, lead_id: '', contact_name: '', contact_email: '' });
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
            <TabsTrigger 
              value="client" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 rounded-md py-1.5 transition-all text-xs"
            >
              {t('comercial.stepGeneral.existingClient')}
            </TabsTrigger>
            <TabsTrigger 
              value="lead" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 rounded-md py-1.5 transition-all text-xs"
            >
              {t('comercial.stepGeneral.marketingLead')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {targetType === 'client' ? (
          <div className="space-y-2">
            <Label htmlFor="client_id">{t('comercial.stepGeneral.client')} <span className="text-red-500">*</span></Label>
            <Select 
              value={data.client_id || ''} 
              onValueChange={(val) => {
                const selectedClient = clients.find(c => c.id === val);
                onChange({ 
                  client_id: val, 
                  client_site_id: '',
                  contact_name: selectedClient?.trade_name || selectedClient?.legal_name || '',
                  contact_email: selectedClient?.email || '',
                  ...(selectedClient?.country_id ? { country_id: selectedClient.country_id } : {})
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingClients ? t('comercial.stepGeneral.loading') : t('comercial.stepGeneral.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-medium text-sm">{client.trade_name || client.legal_name}</span>
                      {client.tax_id && (
                        <span className="text-[11px] text-muted-foreground mt-0.5">NIF: {client.tax_id}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="lead_id">{t('comercial.stepGeneral.marketingLead')} <span className="text-red-500">*</span></Label>
            <Select 
              value={data.lead_id || ''} 
              onValueChange={(val) => {
                const selectedLead = leads.find(l => l.id === val);
                onChange({ 
                  lead_id: val, 
                  contact_name: selectedLead?.name || '',
                  contact_email: selectedLead?.email || ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLeads ? t('comercial.stepGeneral.loading') : t('comercial.stepGeneral.selectLead')} />
              </SelectTrigger>
              <SelectContent>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-medium text-sm">{lead.company_name || t('comercial.stepGeneral.noCompany')}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{lead.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="estimation_type">{t('comercial.stepGeneral.orderType')}</Label>
          <Select 
            value={data.estimation_type} 
            onValueChange={(val) => onChange({ estimation_type: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('comercial.stepGeneral.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_allocation">{t('comercial.requestTypes.new_allocation')}</SelectItem>
              <SelectItem value="expansion">{t('comercial.requestTypes.expansion')}</SelectItem>
              <SelectItem value="other">{t('comercial.requestTypes.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country_id">{t('comercial.proposalCard.country')} <span className="text-red-500">*</span></Label>
          <CountrySelector
            value={data.country_id || null}
            onChange={(val) => onChange({ country_id: val })}
          />
        </div>

        {targetType === 'client' ? (
          <div className="space-y-2">
            <Label htmlFor="client_site_id">{t('comercial.stepGeneral.site')}</Label>
            <Select 
              value={data.client_site_id || ''} 
              onValueChange={(val) => {
                const selectedSite = sites.find(s => s.id === val);
                onChange({ 
                  client_site_id: val,
                  ...(selectedSite?.country_id ? { country_id: selectedSite.country_id } : {})
                });
              }}
              disabled={!data.client_id || isLoadingSites}
            >
              <SelectTrigger>
                <SelectValue placeholder={!data.client_id ? t('comercial.stepGeneral.selectClientFirst') : t('comercial.stepGeneral.selectSite')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('comercial.stepGeneral.noSpecificSite')}</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="postal_code">{t('comercial.stepGeneral.postalCode')} <span className="text-red-500">*</span></Label>
            <Input 
              id="postal_code"
              placeholder="Ex: 28001"
              maxLength={5}
              value={data.postal_code || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                onChange({ postal_code: val });
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="payment_terms">{t('comercial.stepGeneral.paymentTerms')}</Label>
          <Select 
            value={data.payment_terms} 
            onValueChange={(val) => onChange({ payment_terms: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('comercial.stepGeneral.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15 dias">15 Dias</SelectItem>
              <SelectItem value="30 dias">30 Dias</SelectItem>
              <SelectItem value="45 dias">45 Dias</SelectItem>
              <SelectItem value="60 dias">60 Dias</SelectItem>
              <SelectItem value="Pronto Pagamento">Pronto Pagamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">{t('comercial.stepGeneral.contactName')}</Label>
          <Input 
            id="contact_name"
            placeholder="Ex: Carlos Silva"
            value={data.contact_name || ''}
            onChange={(e) => onChange({ contact_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">{t('comercial.stepGeneral.contactEmail')}</Label>
          <Input 
            id="contact_email"
            type="email"
            placeholder="Ex: carlos@empresa.com"
            value={data.contact_email || ''}
            onChange={(e) => onChange({ contact_email: e.target.value })}
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="validity_date">{t('comercial.stepGeneral.validityDate')}</Label>
          <Input 
            id="validity_date"
            type="date"
            value={data.validity_date || ''}
            onChange={(e) => onChange({ validity_date: e.target.value })}
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document_language">{t('comercial.stepGeneral.documentLanguage', { defaultValue: 'Idioma do Documento' })}</Label>
          <Select 
            value={data.document_language || 'pt'} 
            onValueChange={(val) => onChange({ document_language: val })}
          >
            <SelectTrigger id="document_language" className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português (PT)</SelectItem>
              <SelectItem value="es">Espanhol (ES)</SelectItem>
              <SelectItem value="en">Inglês (EN)</SelectItem>
              <SelectItem value="it">Italiano (IT)</SelectItem>
              <SelectItem value="fr">Francês (FR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datas de Início/Fim e Duração do Projeto */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-slate-200 dark:border-slate-850 py-3 my-1">
          <div className="space-y-2">
            <Label htmlFor="expected_start_date">{t('comercial.stepGeneral.startDate')}</Label>
            <Input 
              id="expected_start_date"
              type="date"
              value={data.expected_start_date || ''}
              onChange={(e) => onChange({ expected_start_date: e.target.value })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_end_date">{t('comercial.stepGeneral.endDate')}</Label>
            <Input 
              id="expected_end_date"
              type="date"
              value={data.expected_end_date || ''}
              onChange={(e) => onChange({ expected_end_date: e.target.value })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {data.expected_start_date && data.expected_end_date && (
            <div className="md:col-span-2 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm font-medium">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span>{t('comercial.stepGeneral.calculatedDuration')}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-right">
                <span className="bg-blue-105/60 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400">
                  {totalDays} {t('comercial.stepGeneral.calendarDays')} (~{formattedMonths} {Number(formattedMonths) === 1 ? t('comercial.stepGeneral.month') : t('comercial.stepGeneral.months')})
                </span>
                <span className="bg-blue-105/60 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400">
                  {weekdays} {t('comercial.stepGeneral.weekdays')}
                </span>
                <span className="bg-blue-105/60 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 font-bold">
                  {formattedWeeks} {t('comercial.stepGeneral.weeks')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="general_notes">{t('comercial.stepGeneral.generalNotes')}</Label>
        <Textarea 
          id="general_notes"
          placeholder={t('comercial.stepGeneral.generalNotesPlaceholder')}
          className="min-h-[100px]"
          value={data.general_notes || ''}
          onChange={(e) => onChange({ general_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
