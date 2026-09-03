import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useLeads } from '@/features/comercial/leads/hooks/useLeads';
import { usePaymentTerms } from '@/features/master-data/clients/hooks/usePaymentTerms';
import { CountrySelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Calendar, Trash2, Search, X, Check, Building2, User, Globe, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { detectLeadCountry, COUNTRY_UUIDS, COUNTRY_LABELS } from '@/features/comercial/leads/utils/leadCountryUtils';

const countryLanguageMap: Record<string, string> = {
  '8caaddaf-88cd-4a50-aff6-127b8979b1c3': 'es', // Espanha
  'd918a3b2-292e-474e-96ce-147f4ba756db': 'pt', // Portugal
  '86a91f2d-6e94-4085-8cce-4e17197979e2': 'it', // Itália
  '690649b9-6bab-4605-8b3e-cbe4c4af73a3': 'fr', // França
};

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

function getWeekdayCountBreakdown(startDateStr: string, endDateStr: string) {
  const breakdown = {
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
    sabado: 0,
    domingo: 0,
  };
  if (!startDateStr || !endDateStr) return breakdown;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return breakdown;
  if (start > end) return breakdown;

  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 1) breakdown.lunes++;
    else if (day === 2) breakdown.martes++;
    else if (day === 3) breakdown.miercoles++;
    else if (day === 4) breakdown.jueves++;
    else if (day === 5) breakdown.viernes++;
    else if (day === 6) breakdown.sabado++;
    else if (day === 0) breakdown.domingo++;
    cur.setDate(cur.getDate() + 1);
  }
  return breakdown;
}

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionGeneralStep({ data, onChange }: Props) {
  const { t } = useTranslation();
  const [targetType, setTargetType] = useState<'client' | 'lead'>(data.lead_id ? 'lead' : 'client');
  const [isCustomWeekdays, setIsCustomWeekdays] = useState(() => {
    const wl = data.hours_lunes ?? data.hours_weekday ?? 8.0;
    const wt = data.hours_martes ?? data.hours_weekday ?? 8.0;
    const wq = data.hours_miercoles ?? data.hours_weekday ?? 8.0;
    const wqi = data.hours_jueves ?? data.hours_weekday ?? 8.0;
    const wv = data.hours_viernes ?? data.hours_weekday ?? 8.0;
    const dw = data.hours_weekday ?? 8.0;
    return wl !== dw || wt !== dw || wq !== dw || wqi !== dw || wv !== dw;
  });
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads({ global: true });
  const { data: sites = [], isLoading: isLoadingSites } = useClientSites(data.client_id || undefined);
  const { data: paymentTerms = [] } = usePaymentTerms();

  // Fast Search & Country Filter State for Leads
  const [leadCountryFilter, setLeadCountryFilter] = useState<string>('ES');
  const [leadSearchTerm, setLeadSearchTerm] = useState<string>('');
  const [isLeadSearchOpen, setIsLeadSearchOpen] = useState<boolean>(false);

  const selectedLeadObj = useMemo(() => {
    if (!data.lead_id) return null;
    return leads.find(l => l.id === data.lead_id) || null;
  }, [leads, data.lead_id]);

  const { matchingLeads, totalMatching } = useMemo(() => {
    let list = leads;
    if (leadCountryFilter !== 'all') {
      list = list.filter(l => detectLeadCountry(l) === leadCountryFilter);
    }
    if (leadSearchTerm.trim()) {
      const term = leadSearchTerm.toLowerCase().trim();
      list = list.filter(l =>
        (l.company_name && l.company_name.toLowerCase().includes(term)) ||
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.tax_id && l.tax_id.toLowerCase().includes(term)) ||
        (l.city && l.city.toLowerCase().includes(term)) ||
        (l.province && l.province.toLowerCase().includes(term)) ||
        (l.sector && l.sector.toLowerCase().includes(term))
      );
    }
    return {
      matchingLeads: list.slice(0, 40),
      totalMatching: list.length
    };
  }, [leads, leadCountryFilter, leadSearchTerm]);

  const handleSelectLead = (lead: any) => {
    const cCode = detectLeadCountry(lead);
    const countryUuid = COUNTRY_UUIDS[cCode] || data.country_id;
    const docLang = COUNTRY_LABELS[cCode]?.lang || 'es';
    const defaultTerm = paymentTerms.find(pt => pt.id === lead?.payment_term_id);

    onChange({
      lead_id: lead.id,
      contact_name: lead.name || lead.company_name || '',
      contact_email: lead.email || '',
      country_id: countryUuid,
      document_language: docLang,
      payment_term_id: defaultTerm ? defaultTerm.id : '',
      payment_terms: defaultTerm ? defaultTerm.name : ''
    });
    setIsLeadSearchOpen(false);
    setLeadSearchTerm('');
  };

  // Auto-select site if client has exactly one site
  useEffect(() => {
    if (targetType === 'client' && data.client_id && !isLoadingSites && sites.length === 1) {
      if (data.client_site_id !== sites[0].id) {
        onChange({ client_site_id: sites[0].id });
      }
    }
  }, [sites, isLoadingSites, data.client_id, targetType, data.client_site_id, onChange]);

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
                const defaultTerm = selectedClient?.payment_term || paymentTerms.find(pt => pt.id === selectedClient?.payment_term_id);
                const mappedLanguage = selectedClient?.country_id ? countryLanguageMap[selectedClient.country_id] : undefined;
                onChange({ 
                  client_id: val, 
                  client_site_id: '',
                  contact_name: selectedClient?.trade_name || selectedClient?.legal_name || '',
                  contact_email: selectedClient?.email || '',
                  ...(selectedClient?.country_id ? { country_id: selectedClient.country_id } : {}),
                  ...(mappedLanguage ? { document_language: mappedLanguage } : {}),
                  payment_term_id: defaultTerm ? defaultTerm.id : '',
                  payment_terms: defaultTerm ? defaultTerm.name : ''
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
            <div className="flex items-center justify-between">
              <Label htmlFor="lead_id" className="flex items-center gap-1.5">
                <span>{t('comercial.stepGeneral.marketingLead')}</span>
                <span className="text-red-500">*</span>
              </Label>
              {selectedLeadObj && (
                <button
                  type="button"
                  onClick={() => setIsLeadSearchOpen(prev => !prev)}
                  className="text-xs text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 font-medium underline"
                >
                  {isLeadSearchOpen ? 'Fechar busca' : 'Trocar Lead'}
                </button>
              )}
            </div>

            {/* If lead is selected and search is closed, show selected lead card */}
            {selectedLeadObj && !isLeadSearchOpen ? (
              <div className="p-3 bg-card border rounded-lg shadow-sm flex items-start justify-between gap-2 border-yellow-500/30 bg-yellow-500/5">
                <div className="space-y-1 text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate max-w-xs">
                      {selectedLeadObj.company_name || selectedLeadObj.name || t('comercial.stepGeneral.noCompany')}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {COUNTRY_LABELS[detectLeadCountry(selectedLeadObj)]?.flag} {COUNTRY_LABELS[detectLeadCountry(selectedLeadObj)]?.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    {selectedLeadObj.name && <span>{selectedLeadObj.name}</span>}
                    {selectedLeadObj.email && <span>• {selectedLeadObj.email}</span>}
                    {selectedLeadObj.phone && <span>• {selectedLeadObj.phone}</span>}
                  </div>
                  {selectedLeadObj.sector && (
                    <div className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                      Setor: {selectedLeadObj.sector}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange({
                      lead_id: null,
                      contact_name: '',
                      contact_email: '',
                      payment_term_id: '',
                      payment_terms: ''
                    });
                    setIsLeadSearchOpen(true);
                  }}
                  className="h-7 px-2 text-muted-foreground hover:text-red-500 shrink-0"
                  title="Remover seleção"
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                {/* Country Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setLeadCountryFilter('ES')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      leadCountryFilter === 'ES'
                        ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🇪🇸 Espanha
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadCountryFilter('FR')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      leadCountryFilter === 'FR'
                        ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🇫🇷 França
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadCountryFilter('PT')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      leadCountryFilter === 'PT'
                        ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🇵🇹 Portugal
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadCountryFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      leadCountryFilter === 'all'
                        ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🌐 Todos
                  </button>
                </div>

                {/* Instant Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por empresa, contato, e-mail, NIF ou cidade..."
                    className="pl-8 pr-8 h-8 text-xs bg-background"
                    value={leadSearchTerm}
                    onChange={(e) => setLeadSearchTerm(e.target.value)}
                    autoFocus={isLeadSearchOpen}
                  />
                  {leadSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setLeadSearchTerm('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Fast Results List (Capped at 40 results for instant rendering without DOM freeze) */}
                <div className="max-h-48 overflow-y-auto divide-y border rounded bg-background">
                  {isLoadingLeads ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">Carregando base de leads...</div>
                  ) : matchingLeads.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum lead encontrado com os filtros atuais.
                    </div>
                  ) : (
                    matchingLeads.map(lead => {
                      const c = detectLeadCountry(lead);
                      const isSelected = data.lead_id === lead.id;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectLead(lead)}
                          className={`p-2 hover:bg-muted/60 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors ${
                            isSelected ? 'bg-yellow-500/10 font-medium' : ''
                          }`}
                        >
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5 truncate font-medium">
                              <span>{COUNTRY_LABELS[c]?.flag || '🌐'}</span>
                              <span className="text-foreground">{lead.company_name || lead.name || 'Sem Nome'}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                              {lead.name && lead.company_name && <span>{lead.name}</span>}
                              {lead.city && <span>({lead.city})</span>}
                              {lead.email && <span>• {lead.email}</span>}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {totalMatching > 40 && (
                  <div className="text-[10px] text-muted-foreground text-right px-1">
                    Mostrando 40 de {totalMatching} leads. Digite na busca para refinar.
                  </div>
                )}
              </div>
            )}
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
          <Label htmlFor="country_id">{t('comercial.detail.proposalCard.country')} <span className="text-red-500">*</span></Label>
          <CountrySelector
            value={data.country_id || null}
            onChange={(val) => {
              const mappedLanguage = val ? countryLanguageMap[val] : undefined;
              onChange({ 
                country_id: val,
                ...(mappedLanguage ? { document_language: mappedLanguage } : {})
              });
            }}
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
            value={data.payment_term_id || ''} 
            onValueChange={(val) => {
              const selectedTerm = paymentTerms.find(pt => pt.id === val);
              onChange({ 
                payment_term_id: val === 'none' || val === '' ? '' : val,
                payment_terms: selectedTerm ? selectedTerm.name : ''
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('comercial.stepGeneral.select')} />
            </SelectTrigger>
            <SelectContent>
              {paymentTerms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
              {paymentTerms.length === 0 && (
                <>
                  <SelectItem value="none">Carregando prazos de pagamento...</SelectItem>
                </>
              )}
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
              <SelectValue placeholder={t('comercial.stepGeneral.selectLanguage', { defaultValue: 'Selecione o idioma' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">{t('comercial.stepGeneral.languages.pt', { defaultValue: 'Português (PT)' })}</SelectItem>
              <SelectItem value="es">{t('comercial.stepGeneral.languages.es', { defaultValue: 'Espanhol (ES)' })}</SelectItem>
              <SelectItem value="en">{t('comercial.stepGeneral.languages.en', { defaultValue: 'Inglês (EN)' })}</SelectItem>
              <SelectItem value="it">{t('comercial.stepGeneral.languages.it', { defaultValue: 'Italiano (IT)' })}</SelectItem>
              <SelectItem value="fr">{t('comercial.stepGeneral.languages.fr', { defaultValue: 'Francês (FR)' })}</SelectItem>
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
 
      {/* 1. Working Schedule Configurator */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            {t('comercial.stepGeneral.scheduleTitle', { defaultValue: 'Jornada de Trabalho Personalizada' })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('comercial.stepGeneral.scheduleSubtitle', { defaultValue: 'Configure os dias de trabalho e as horas diárias para esta proposta/estimativa.' })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Weekdays (Mon-Fri) Card */}
          <div className="lg:col-span-6 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-slate-500">{t('comercial.stepGeneral.weekdaysLabel', { defaultValue: 'Segunda a Sexta' })}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isCustomWeekdays;
                    setIsCustomWeekdays(nextVal);
                    if (!nextVal) {
                      // reset individual weekday hours to the unified hours_weekday
                      const hw = data.hours_weekday ?? 8;
                      onChange({
                        hours_lunes: hw,
                        hours_martes: hw,
                        hours_miercoles: hw,
                        hours_jueves: hw,
                        hours_viernes: hw,
                      });
                    }
                  }}
                  className="text-[11px] text-left text-indigo-605 hover:text-indigo-700 dark:text-indigo-400 font-semibold mt-1"
                >
                  {isCustomWeekdays 
                    ? t('comercial.stepGeneral.unifiedWeekdays', { defaultValue: '← Usar jornada unificada' }) 
                    : t('comercial.stepGeneral.customizeWeekdays', { defaultValue: '⚙ Customizar dias individuais' })}
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  id="work_weekdays"
                  checked={data.work_lunes !== false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    onChange({
                      work_lunes: val,
                      work_martes: val,
                      work_miercoles: val,
                      work_jueves: val,
                      work_viernes: val,
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-350 text-indigo-605 focus:ring-indigo-500"
                />
                <Label htmlFor="work_weekdays" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel', { defaultValue: 'Ativo' })}</Label>
              </div>
            </div>

            {!isCustomWeekdays ? (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="hours_weekday" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel', { defaultValue: 'Horas Diárias' })}</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={data.work_lunes === false}
                    onClick={() => {
                      const val = Math.max(1, (data.hours_weekday ?? 8) - 1);
                      onChange({
                        hours_weekday: val,
                        hours_lunes: val,
                        hours_martes: val,
                        hours_miercoles: val,
                        hours_jueves: val,
                        hours_viernes: val,
                      });
                    }}
                  >
                    -
                  </Button>
                  <Input
                    id="hours_weekday"
                    type="number"
                    min="1"
                    max="24"
                    disabled={data.work_lunes === false}
                    value={data.hours_weekday ?? 8}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 8;
                      onChange({
                        hours_weekday: val,
                        hours_lunes: val,
                        hours_martes: val,
                        hours_miercoles: val,
                        hours_jueves: val,
                        hours_viernes: val,
                      });
                    }}
                    className="h-8 text-center text-xs font-semibold w-16"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={data.work_lunes === false}
                    onClick={() => {
                      const val = Math.min(24, (data.hours_weekday ?? 8) + 1);
                      onChange({
                        hours_weekday: val,
                        hours_lunes: val,
                        hours_martes: val,
                        hours_miercoles: val,
                        hours_jueves: val,
                        hours_viernes: val,
                      });
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                {[
                  { key: 'lunes', label: t('comercial.stepGeneral.monday', { defaultValue: 'Segunda-feira' }), activeKey: 'work_lunes', hoursKey: 'hours_lunes' },
                  { key: 'martes', label: t('comercial.stepGeneral.tuesday', { defaultValue: 'Terça-feira' }), activeKey: 'work_martes', hoursKey: 'hours_martes' },
                  { key: 'miercoles', label: t('comercial.stepGeneral.wednesday', { defaultValue: 'Quarta-feira' }), activeKey: 'work_miercoles', hoursKey: 'hours_miercoles' },
                  { key: 'jueves', label: t('comercial.stepGeneral.thursday', { defaultValue: 'Quinta-feira' }), activeKey: 'work_jueves', hoursKey: 'hours_jueves' },
                  { key: 'viernes', label: t('comercial.stepGeneral.friday', { defaultValue: 'Sexta-feira' }), activeKey: 'work_viernes', hoursKey: 'hours_viernes' },
                ].map(day => {
                  const isActive = data[day.activeKey] !== false;
                  const hours = data[day.hoursKey] ?? data.hours_weekday ?? 8;
                  return (
                    <div key={day.key} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100/30 dark:border-slate-800/30 last:border-0">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`check_${day.key}`}
                          checked={isActive}
                          onChange={(e) => onChange({ [day.activeKey]: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-gray-305 text-indigo-605 focus:ring-indigo-500"
                        />
                        <Label htmlFor={`check_${day.key}`} className="text-xs font-semibold">{day.label}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!isActive}
                          onClick={() => onChange({ [day.hoursKey]: Math.max(1, hours - 1) })}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          disabled={!isActive}
                          value={hours}
                          onChange={(e) => onChange({ [day.hoursKey]: parseFloat(e.target.value) || 8 })}
                          className="h-7 text-center text-xs font-semibold w-12 p-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!isActive}
                          onClick={() => onChange({ [day.hoursKey]: Math.min(24, hours + 1) })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saturday Card */}
          <div className={`lg:col-span-3 border rounded-xl p-4 transition-colors space-y-3 ${data.work_sabado ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/60' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('comercial.stepGeneral.saturdayLabel', { defaultValue: 'Sábado' })}</span>
              <div className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  id="work_sabado"
                  checked={!!data.work_sabado}
                  onChange={(e) => onChange({ work_sabado: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-350 text-indigo-605 focus:ring-indigo-500"
                />
                <Label htmlFor="work_sabado" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel', { defaultValue: 'Ativo' })}</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours_sabado" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel', { defaultValue: 'Horas Diárias' })}</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!data.work_sabado}
                  onClick={() => onChange({ hours_sabado: Math.max(0, (data.hours_sabado ?? 0) - 1) })}
                >
                  -
                </Button>
                <Input
                  id="hours_sabado"
                  type="number"
                  min="0"
                  max="24"
                  disabled={!data.work_sabado}
                  value={data.hours_sabado ?? 0}
                  onChange={(e) => onChange({ hours_sabado: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-center text-xs font-semibold w-16"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!data.work_sabado}
                  onClick={() => onChange({ hours_sabado: Math.min(24, (data.hours_sabado ?? 0) + 1) })}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          {/* Sunday Card */}
          <div className={`lg:col-span-3 border rounded-xl p-4 transition-colors space-y-3 ${data.work_domingo ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/60' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">{t('comercial.stepGeneral.sundayLabel', { defaultValue: 'Domingo' })}</span>
              <div className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  id="work_domingo"
                  checked={!!data.work_domingo}
                  onChange={(e) => onChange({ work_domingo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-350 text-indigo-605 focus:ring-indigo-500"
                />
                <Label htmlFor="work_domingo" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel', { defaultValue: 'Ativo' })}</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours_domingo" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel', { defaultValue: 'Horas Diárias' })}</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!data.work_domingo}
                  onClick={() => onChange({ hours_domingo: Math.max(0, (data.hours_domingo ?? 0) - 1) })}
                >
                  -
                </Button>
                <Input
                  id="hours_domingo"
                  type="number"
                  min="0"
                  max="24"
                  disabled={!data.work_domingo}
                  value={data.hours_domingo ?? 0}
                  onChange={(e) => onChange({ hours_domingo: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-center text-xs font-semibold w-16"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!data.work_domingo}
                  onClick={() => onChange({ hours_domingo: Math.min(24, (data.hours_domingo ?? 0) + 1) })}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly sum summary indicator */}
        <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 px-3 py-2 rounded-lg">
          <span dangerouslySetInnerHTML={{
            __html: t('comercial.stepGeneral.weeklySummary', {
              hours: ((data.work_lunes !== false ? (data.hours_lunes ?? data.hours_weekday ?? 8) : 0) +
                      (data.work_martes !== false ? (data.hours_martes ?? data.hours_weekday ?? 8) : 0) +
                      (data.work_miercoles !== false ? (data.hours_miercoles ?? data.hours_weekday ?? 8) : 0) +
                      (data.work_jueves !== false ? (data.hours_jueves ?? data.hours_weekday ?? 8) : 0) +
                      (data.work_viernes !== false ? (data.hours_viernes ?? data.hours_weekday ?? 8) : 0) +
                      (data.work_sabado ? (data.hours_sabado ?? 0) : 0) +
                      (data.work_domingo ? (data.hours_domingo ?? 0) : 0)),
              defaultValue: 'Jornada horária semanal por trabalhador: <span class="font-extrabold">{{hours}} horas semanais</span>'
            })
          }} />
        </div>
      </div>

      {/* 2. Calendar Breakdown (Visual Panel) */}
      {data.expected_start_date && data.expected_end_date && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-900/20 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{t('comercial.stepGeneral.breakdownTitle', { defaultValue: 'Demonstração de Horas Individuais no Período' })}</span>
          </div>
          
          {(() => {
            const breakdown = getWeekdayCountBreakdown(data.expected_start_date, data.expected_end_date);
            const hl = data.work_lunes !== false ? (data.hours_lunes ?? data.hours_weekday ?? 8) : 0;
            const ht = data.work_martes !== false ? (data.hours_martes ?? data.hours_weekday ?? 8) : 0;
            const hq = data.work_miercoles !== false ? (data.hours_miercoles ?? data.hours_weekday ?? 8) : 0;
            const hqi = data.work_jueves !== false ? (data.hours_jueves ?? data.hours_weekday ?? 8) : 0;
            const hv = data.work_viernes !== false ? (data.hours_viernes ?? data.hours_weekday ?? 8) : 0;
            const satHours = (data.work_sabado ? (data.hours_sabado ?? 0) : 0);
            const sunHours = (data.work_domingo ? (data.hours_domingo ?? 0) : 0);

            const monFriDaysCount = breakdown.lunes + breakdown.martes + breakdown.miercoles + breakdown.jueves + breakdown.viernes;
            const monFriTotalHours = (breakdown.lunes * hl) + (breakdown.martes * ht) + (breakdown.miercoles * hq) + (breakdown.jueves * hqi) + (breakdown.viernes * hv);
            const satTotalHours = breakdown.sabado * satHours;
            const sunTotalHours = breakdown.domingo * sunHours;
            const periodGrandTotalHours = monFriTotalHours + satTotalHours + sunTotalHours;

            return (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* weekdays count */}
                  <div className="flex justify-between items-center border-b pb-1.5 dark:border-slate-800">
                    <span className="text-muted-foreground">{t('comercial.stepGeneral.breakdownWeekdays', { defaultValue: 'Dias de Semana (Seg-Sex):' })}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {monFriDaysCount} {t('comercial.stepGeneral.dias', { defaultValue: 'dias' })} = <strong className="text-primary">{monFriTotalHours}h</strong>
                    </span>
                  </div>
                  {/* Saturday count */}
                  <div className="flex justify-between items-center border-b pb-1.5 dark:border-slate-800">
                    <span className="text-muted-foreground">{t('comercial.stepGeneral.breakdownSaturdays', { defaultValue: 'Sábados:' })}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {breakdown.sabado} {t('comercial.stepGeneral.sab', { defaultValue: 'sáb' })} × {satHours}h = <strong className="text-primary">{satTotalHours}h</strong>
                    </span>
                  </div>
                  {/* Sunday count */}
                  <div className="flex justify-between items-center border-b pb-1.5 dark:border-slate-800">
                    <span className="text-muted-foreground">{t('comercial.stepGeneral.breakdownSundays', { defaultValue: 'Domingos:' })}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {breakdown.domingo} {t('comercial.stepGeneral.dom', { defaultValue: 'dom' })} × {sunHours}h = <strong className="text-primary">{sunTotalHours}h</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs font-bold text-slate-800 dark:text-slate-200 pt-1">
                  <span dangerouslySetInnerHTML={{
                    __html: t('comercial.stepGeneral.breakdownTotal', {
                      hours: periodGrandTotalHours,
                      defaultValue: 'Total Individual Estimado no Período: <span class="text-sm text-indigo-600 dark:text-indigo-400 font-extrabold">{{hours}} horas</span>'
                    })
                  }} />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. Additional Revenues List */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {t('comercial.stepGeneral.revenuesTitle', { defaultValue: 'Outras Receitas e Serviços (Ingresos Varios)' })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('comercial.stepGeneral.revenuesSubtitle', { defaultValue: 'Adicione receitas extras globais ao orçamento (Ex: taxas de mobilização, cursos, etc.).' })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const currentRevenues = data.additional_revenues || [];
              onChange({
                additional_revenues: [...currentRevenues, { id: crypto.randomUUID(), description: '', amount: 0 }]
              });
            }}
            className="text-xs border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50"
          >
            {t('comercial.stepGeneral.btnAddRevenue', { defaultValue: '+ Adicionar Receita' })}
          </Button>
        </div>

        {data.additional_revenues && data.additional_revenues.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {data.additional_revenues.map((item: any, idx: number) => (
              <div key={item.id || idx} className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                  <Input
                    placeholder={t('comercial.stepGeneral.revenueDescPlaceholder', { defaultValue: 'Descrição da Receita (Ex: Mobilização de Equipamento)' })}
                    value={item.description || ''}
                    onChange={(e) => {
                      const updated = data.additional_revenues.map((r: any, i: number) => i === idx ? { ...r, description: e.target.value } : r);
                      onChange({ additional_revenues: updated });
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="w-32 flex items-center space-x-1.5">
                  <Input
                    type="number"
                    min="0"
                    placeholder={t('comercial.stepGeneral.amountLabel', { defaultValue: 'Valor' })}
                    value={item.amount || ''}
                    onChange={(e) => {
                      const updated = data.additional_revenues.map((r: any, i: number) => i === idx ? { ...r, amount: parseFloat(e.target.value) || 0 } : r);
                      onChange({ additional_revenues: updated });
                    }}
                    className="h-9 text-xs font-semibold text-right"
                  />
                  <span className="text-xs text-muted-foreground font-bold">€</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const updated = data.additional_revenues.filter((_: any, i: number) => i !== idx);
                    onChange({ additional_revenues: updated });
                  }}
                  className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground bg-slate-50/20 dark:bg-slate-950/10">
            {t('comercial.stepGeneral.noRevenues', { defaultValue: 'Nenhuma receita adicional adicionada.' })}
          </div>
        )}
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
