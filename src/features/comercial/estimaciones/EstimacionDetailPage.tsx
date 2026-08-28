import { useParams, useNavigate } from 'react-router-dom';
import { useEstimacionDetail } from './hooks/useEstimacionDetail';
import { EstimacionStatusBadge } from './components/EstimacionStatusBadge';
import { ApproveEstimacionButton } from './components/ApproveEstimacionButton';
import { ProposalSignatureStatusCard } from './components/ProposalSignatureStatusCard';
import { CustomContractCard } from './components/CustomContractCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { 
  ArrowLeft, FileText, CheckCircle2, AlertCircle, 
  MapPin, Clock, Calendar, Users, DollarSign, ExternalLink,
  Pencil, Copy, Eye, Coins, TrendingUp, TrendingDown, Home, Truck, ShieldCheck, Sparkles, Building, Briefcase, Link2
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useEstimacionMutations } from './hooks/useEstimacionMutations';
import { supabase } from '@/shared/supabase/client';
import { calculateViability } from './utils/viabilityEngine';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';



export function EstimacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: estimacion, isLoading, error } = useEstimacionDetail(id);
  const { role } = useEmpresa();
  const { decidirAprovacaoGerente, criarNovaVersao } = useEstimacionMutations();
  const [comercialSettings, setComercialSettings] = useState<any>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [selectedHistoricalVersion, setSelectedHistoricalVersion] = useState<any>(null);
  const [isHistoricalDialogOpen, setIsHistoricalDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      if (!estimacion?.empresa_id) return;
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .select('*')
          .eq('empresa_id', estimacion.empresa_id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setComercialSettings({
            min_margin_percent: Number(data.min_margin_percent),
            block_debtor_estimations: !!data.block_debtor_estimations,
            ivp_min_threshold: Number(data.ivp_min_threshold),
          });
        } else {
          setComercialSettings({
            min_margin_percent: 15.0,
            block_debtor_estimations: true,
            ivp_min_threshold: 5.0
          });
        }
      } catch (err) {
        console.error('Error fetching comercial settings:', err);
      }
    }
    fetchSettings();
  }, [estimacion?.empresa_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">{t('comercial.detail.loading')}</div>
    );
  }

  if (!estimacion) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div className="text-xl text-muted-foreground">{t('comercial.detail.notFound')}</div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md max-w-2xl text-sm break-all">
            <strong>{t('comercial.detail.error')}:</strong> {error instanceof Error ? error.message : JSON.stringify(error)}
          </div>
        )}
        <Button variant="outline" onClick={() => navigate('/comercial/estimaciones')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('comercial.detail.btnBack')}
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getSolicitudTypeLabel = (type: string) => {
    return t(`comercial.requestTypes.${type}`, type);
  };

  // Map database structures to fit what the viability engine expects
  const viabilityPayload = {
    expected_start_date: estimacion.expected_start_date,
    expected_end_date: estimacion.expected_end_date,
    postal_code: estimacion.client_site?.postal_code || estimacion.client?.postal_code || '',
    total_estimated_revenue: estimacion.current_version?.total_estimated_revenue || estimacion.current_version?.total_revenue || 0,
    total_estimated_cost: estimacion.current_version?.total_estimated_cost || estimacion.current_version?.total_cost || 0,
    estimated_margin_percent: estimacion.current_version?.estimated_margin_percent || estimacion.current_version?.margin_percent || 0,
    items: estimacion.current_version?.items?.map((item: any) => ({
      quantity: item.quantity,
      includes_accommodation: !!item.includes_housing || !!item.includes_accommodation,
    })) || [],
    costs: estimacion.current_version?.costs || [],
  };

  const viability = calculateViability(viabilityPayload, estimacion.client, comercialSettings, t);

  const currentVersion = estimacion?.current_version;
  const items = currentVersion?.items || [];
  const costs = currentVersion?.costs || [];
  const additionalRevenues = estimacion?.additional_revenues || [];

  const totalBaseRevenue = items.reduce((sum: number, item: any) => sum + (Number(item.sell_rate_hour || 0) * Number(item.planned_total_hours ?? item.total_hours ?? 0)), 0);
  
  const totalRechargeableRevenue = costs.reduce((sum: number, c: any) => { 
    if (c.is_rechargeable) { 
      return sum + (Number(c.amount || 0) * (1 + (Number(c.markup_percent || 0) / 100))); 
    } 
    return sum; 
  }, 0);

  const additionalRevenuesSum = additionalRevenues.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

  const totalSalaries = items.reduce((sum: number, item: any) => sum + (Number(item.base_cost_hour || 0) * Number(item.planned_total_hours ?? item.total_hours ?? 0)), 0);
  const totalSocialSecurity = costs.filter((c: any) => c.cost_category === 'social_security').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalHousing = costs.filter((c: any) => c.cost_category === 'housing').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalEpi = costs.filter((c: any) => c.cost_category === 'epi').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalTransport = costs.filter((c: any) => c.cost_category === 'transport').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
  const totalOthers = costs.filter((c: any) => c.cost_category !== 'social_security' && c.cost_category !== 'housing' && c.cost_category !== 'epi' && c.cost_category !== 'transport').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  return (
    <div className="flex flex-col space-y-6 p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comercial/estimaciones')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{estimacion.codigo}</h1>
                <EstimacionStatusBadge status={estimacion.status} />
              </div>
              <p className="text-muted-foreground flex items-center mt-1">
                <span className="font-medium mr-2">{getSolicitudTypeLabel(estimacion.estimation_type)}</span>
                | {t('comercial.detail.versionLabel', { version: estimacion.current_version?.version_number || 1 })}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {estimacion.status === 'approved' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (estimacion.pedido?.id) {
                    navigate(`/operacoes/pedidos/${estimacion.pedido.id}`);
                  } else {
                    navigate('/operacoes/pedidos');
                  }
                }}
              >
                {t('comercial.detail.viewOrder')}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
            {estimacion.status === 'draft' && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/comercial/estimaciones/${estimacion.id}/editar`)}
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t('comercial.detail.btnEdit')}
              </Button>
            )}
            {estimacion.status === 'review' && role === 'admin' && (
              <>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => decidirAprovacaoGerente.mutate({ id: estimacion.id, aprovado: true })}
                  disabled={decidirAprovacaoGerente.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('comercial.detail.btnApprove')}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => decidirAprovacaoGerente.mutate({ id: estimacion.id, aprovado: false })}
                  disabled={decidirAprovacaoGerente.isPending}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t('comercial.detail.btnReject')}
                </Button>
              </>
            )}
            {estimacion.status !== 'draft' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setVersionNotes('');
                  setIsVersionDialogOpen(true);
                }}
                className="border-blue-300 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold"
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('comercial.detail.btnNewVersion')}
              </Button>
            )}
             <Button
               variant="outline"
               onClick={() => {
                 const url = `${window.location.origin}/public/formulario-tecnico/${estimacion.id}`;
                 navigator.clipboard.writeText(url);
                 toast.success('Link do formulário técnico copiado com sucesso!');
               }}
               className="border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-semibold"
             >
               <Link2 className="mr-2 h-4 w-4" />
               Enviar Formulário Técnico
             </Button>
             <ApproveEstimacionButton estimacion={estimacion} />
          </div>
        </div>

        {estimacion.status === 'review' && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-lg text-amber-800 dark:text-amber-400 flex flex-col space-y-2 text-sm">
            <div className="flex items-start">
              <Clock className="h-5 w-5 mr-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-base">{t('comercial.detail.awaitingApprovalTitle')}</p>
                <p className="mt-1">
                  {role === 'admin' 
                    ? t('comercial.detail.awaitingApprovalDescAdmin') 
                    : t('comercial.detail.awaitingApprovalDescUser')}
                </p>
              </div>
            </div>
            
            {viability.reasons.length > 0 && (
              <div className="mt-2 pl-8 border-l-2 border-amber-400 dark:border-amber-600 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">{t('comercial.detail.viabilityReasonsTitle')}</p>
                <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  {viability.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="overview">{t('comercial.detail.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="items">{t('comercial.detail.tabs.items')}</TabsTrigger>
            <TabsTrigger value="costs">{t('comercial.detail.tabs.costs')}</TabsTrigger>
            <TabsTrigger value="financial">{t('comercial.detail.tabs.financial')}</TabsTrigger>
            <TabsTrigger value="versions">{t('comercial.detail.tabs.versions')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('comercial.detail.tabs.timeline')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('comercial.detail.clientCard.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t('comercial.detail.clientCard.company')}</p>
                        <p className="text-base">{estimacion.client?.legal_name}</p>
                        {estimacion.client?.trade_name && (
                          <p className="text-sm text-muted-foreground">{estimacion.client.trade_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t('comercial.detail.clientCard.site')}</p>
                        <p className="text-base">{estimacion.client_site?.name || t('comercial.detail.clientCard.notSpecified')}</p>
                        {estimacion.client_site?.address && (
                          <p className="text-sm text-muted-foreground">{estimacion.client_site.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start border-t pt-4">
                      <FileText className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t('comercial.detail.clientCard.proposalContact')}</p>
                        <p className="text-base">{estimacion.contact_name || t('comercial.detail.clientCard.notSpecified')}</p>
                        {estimacion.contact_email && (
                          <p className="text-sm text-muted-foreground">{estimacion.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ProposalSignatureStatusCard estimacion={estimacion} />
                <CustomContractCard estimacion={estimacion} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('comercial.detail.proposalCard.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {estimacion.general_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('comercial.detail.proposalCard.generalNotes')}</p>
                      <p className="text-sm">{estimacion.general_notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('comercial.detail.proposalCard.country')}</p>
                        <p className="text-sm font-medium">
                          {estimacion.country?.name || t('comercial.detail.proposalCard.defaultCountry')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('comercial.detail.proposalCard.paymentTerms')}</p>
                        <p className="text-sm font-medium">{estimacion.payment_terms || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('comercial.detail.proposalCard.startDate')}</p>
                        <p className="text-sm font-medium">
                          {estimacion.expected_start_date ? format(new Date(estimacion.expected_start_date), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('comercial.detail.proposalCard.validityDate')}</p>
                        <p className="text-sm font-medium">
                          {estimacion.validity_date ? format(new Date(estimacion.validity_date), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('comercial.detail.itemsCard.title')}</CardTitle>
                <CardDescription>{t('comercial.detail.itemsCard.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {estimacion.current_version?.items && estimacion.current_version.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium">{t('comercial.detail.itemsCard.thFunction')}</th>
                          <th className="pb-3 font-medium text-center">{t('comercial.detail.itemsCard.thQty')}</th>
                          <th className="pb-3 font-medium text-center">{t('comercial.detail.itemsCard.thHours')}</th>
                          <th className="pb-3 font-medium text-right">{t('comercial.detail.itemsCard.thBaseRate')}</th>
                          <th className="pb-3 font-medium text-right">{t('comercial.detail.itemsCard.thSellRate')}</th>
                          <th className="pb-3 font-medium text-right">{t('comercial.detail.itemsCard.thMargin')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {estimacion.current_version.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-3">
                              <div className="font-medium">{item.job_function?.name}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                {item.includes_accommodation && (
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                                    {t('comercial.detail.itemsCard.accommodation')}{item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? `: €${Number(item.custom_lodging_rate).toFixed(2)}/dia` : ''}
                                  </span>
                                )}
                                {item.includes_transport && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">{t('comercial.detail.itemsCard.transport')}</span>}
                                {item.includes_ppe && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">{t('comercial.detail.itemsCard.ppe')}</span>}
                                {item.ss_regime && item.ss_regime !== 'none' && (
                                  <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                    {t('comercial.detail.itemsCard.socialSecurity')}: {item.ss_regime === 'destacado' ? t('comercial.detail.itemsCard.destacado') : t('comercial.detail.itemsCard.local')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-center">{item.total_hours}h</td>
                            <td className="py-3 text-right">{formatCurrency(item.base_cost_hour)}/h</td>
                            <td className="py-3 text-right font-medium text-blue-600">{formatCurrency(item.sell_rate_hour)}/h</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' :
                                item.margin_percent >= 10 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.margin_percent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">{t('comercial.detail.itemsCard.empty')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('comercial.detail.costsCard.title')}</CardTitle>
                <CardDescription>{t('comercial.detail.costsCard.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {estimacion.current_version?.costs && estimacion.current_version.costs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium">{t('comercial.detail.costsCard.thCategory')}</th>
                          <th className="pb-3 font-medium">{t('comercial.detail.costsCard.thDescription')}</th>
                          <th className="pb-3 font-medium text-center">{t('comercial.detail.costsCard.thRechargeable')}</th>
                          <th className="pb-3 font-medium text-right">{t('comercial.detail.costsCard.thValue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {estimacion.current_version.costs.map((cost: any) => (
                          <tr key={cost.id}>
                            <td className="py-3 font-medium capitalize">{cost.cost_category.replace('_', ' ')}</td>
                            <td className="py-3 text-muted-foreground">{cost.description || '-'}</td>
                            <td className="py-3 text-center">
                              {cost.is_rechargeable ? (
                                <span className="text-emerald-600 text-xs font-medium bg-emerald-100 px-2 py-1 rounded-full">
                                  {t('comercial.detail.costsCard.yes', { markup: cost.markup_percent })}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-full">
                                  {t('comercial.detail.costsCard.no')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right font-medium">{formatCurrency(cost.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">{t('comercial.detail.costsCard.empty')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-6 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="pb-4 bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold flex items-center text-slate-800 dark:text-white">
                  <Coins className="h-5 w-5 mr-2.5 text-blue-600 dark:text-blue-400" />
                  {t('comercial.detail.financialCard.title')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{t('comercial.detail.financialCard.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Cost Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400 dark:bg-slate-650" />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {t('comercial.detail.financialCard.cost')}
                        </p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(currentVersion?.total_cost || 0)}
                        </p>
                      </div>
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-400 group-hover:scale-110 transition-transform">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Revenue Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-blue-100 dark:border-blue-950/40 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                          {t('comercial.detail.financialCard.revenue')}
                        </p>
                        <p className="text-3xl font-black text-blue-900 dark:text-blue-400">
                          {formatCurrency(currentVersion?.total_revenue || 0)}
                        </p>
                      </div>
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-450 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Margin Card */}
                  {(() => {
                    const marginPercent = currentVersion?.margin_percent || 0;
                    const marginAmount = (currentVersion?.total_revenue || 0) - (currentVersion?.total_cost || 0);
                    const isGood = marginPercent >= 20;
                    const isAvg = marginPercent >= 10;
                    const colorClass = isGood 
                      ? 'border-emerald-100 dark:border-emerald-950/40' 
                      : isAvg 
                        ? 'border-amber-100 dark:border-amber-950/40' 
                        : 'border-red-100 dark:border-red-950/40';
                    const stripeClass = isGood 
                      ? 'bg-emerald-500' 
                      : isAvg 
                        ? 'bg-amber-500' 
                        : 'bg-red-500';
                    const badgeBg = isGood 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' 
                      : isAvg 
                        ? 'bg-amber-55 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' 
                        : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400';
                    
                    return (
                      <div className={`bg-white dark:bg-slate-900 rounded-xl p-6 border ${colorClass} shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${stripeClass}`} />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              {t('comercial.detail.financialCard.margin')}
                            </p>
                            <div className="flex items-baseline space-x-2">
                              <p className={`text-3xl font-black ${isGood ? 'text-emerald-600 dark:text-emerald-400' : isAvg ? 'text-amber-600 dark:text-amber-500' : 'text-red-650 dark:text-red-500'}`}>
                                {marginPercent}%
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                              ({formatCurrency(marginAmount)})
                            </p>
                          </div>
                          <div className={`p-2.5 ${badgeBg} rounded-lg group-hover:scale-110 transition-transform`}>
                            <Coins className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Detailed Grid comparison */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  {/* Columns for Revenues */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">
                          {t('comercial.stepReview.financialBreakdown')} - {t('comercial.stepReview.revenueLabel')}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t('comercial.detail.financialCard.desc')}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {/* Base Profile Revenue */}
                      <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.baseProfileRevenue')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('comercial.stepReview.totalHoursLabel', 'Volume de horas')}: {items.reduce((acc: number, item: any) => acc + Number(item.planned_total_hours ?? item.total_hours ?? 0), 0)}h
                          </p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalBaseRevenue)}</span>
                      </div>

                      {/* Rechargeable Cost Revenue */}
                      {totalRechargeableRevenue > 0 && (
                        <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.rechargeableCostsRevenue')}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {t('comercial.detail.costsCard.yes', 'Reembolsável com markup')}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalRechargeableRevenue)}</span>
                        </div>
                      )}

                      {/* Additional Revenues */}
                      {additionalRevenuesSum > 0 && (
                        <div className="flex flex-col pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.additionalRevenuesGroup')}</p>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(additionalRevenuesSum)}</span>
                          </div>
                          <div className="mt-2 pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-1.5">
                            {additionalRevenues.map((rev: any) => (
                              <div key={rev.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>• {rev.description || t('comercial.stepReview.revenueLabel')}</span>
                                <span className="font-mono">{formatCurrency(rev.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50/20 dark:bg-blue-950/10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-black">
                      <span className="text-slate-800 dark:text-slate-200">{t('comercial.stepReview.totalRevenuesSummary')}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-450 text-base">{formatCurrency(currentVersion?.total_revenue || 0)}</span>
                    </div>
                  </div>

                  {/* Columns for Costs */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center space-x-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-400">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">
                          {t('comercial.stepReview.financialBreakdown')} - {t('comercial.stepReview.costLabel')}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t('comercial.stepReview.financialBreakdownDesc')}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {/* Salaries */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.baseSalariesCost')}</p>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalSalaries)}</span>
                      </div>

                      {/* Social Security */}
                      {totalSocialSecurity > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.socialSecurityCost')}</p>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalSocialSecurity)}</span>
                        </div>
                      )}

                      {/* Lodging / Alojamento */}
                      {totalHousing > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.housingCost')}</p>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalHousing)}</span>
                        </div>
                      )}

                      {/* EPIs */}
                      {totalEpi > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.epiCost')}</p>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalEpi)}</span>
                        </div>
                      )}

                      {/* Transport */}
                      {totalTransport > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.transportCost')}</p>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalTransport)}</span>
                        </div>
                      )}

                      {/* Others */}
                      {totalOthers > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-sm">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('comercial.stepReview.brokerOtherCosts')}</p>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalOthers)}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-black">
                      <span className="text-slate-800 dark:text-slate-200">{t('comercial.stepReview.totalCostsSummary')}</span>
                      <span className="font-mono text-slate-950 dark:text-white text-base">{formatCurrency(currentVersion?.total_cost || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logistics & Accommodation Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">
                      {t('comercial.detail.logisticsCard.title', i18n.resolvedLanguage === 'es' ? 'Logística y Alojamiento' : i18n.resolvedLanguage === 'en' ? 'Logistics & Accommodation' : 'Logística e Alojamento')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t('comercial.detail.logisticsCard.desc', i18n.resolvedLanguage === 'es' ? 'Resumen detallado de alojamiento, transporte y EPIs configurados para los trabajadores.' : i18n.resolvedLanguage === 'en' ? 'Detailed summary of accommodation, transport, and PPEs configured for workers.' : 'Resumo detalhado de alojamento, transporte e EPIs configurados para os trabalhadores.')}
                    </p>
                  </div>
                </div>
                
                {totalHousing > 0 && (
                  <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-full">
                    <span>{t('comercial.stepReview.housingCost')}: {formatCurrency(totalHousing)}</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Accommodation Details */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                      <Home className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                      {t('comercial.costCategories.housing', i18n.resolvedLanguage === 'es' ? 'Alojamiento / Vivienda' : i18n.resolvedLanguage === 'en' ? 'Housing / Lodging' : 'Alojamento / Moradia')}
                    </h4>

                    {items.some((item: any) => !!item.includes_accommodation) ? (
                      <div className="space-y-3">
                        {items.filter((item: any) => !!item.includes_accommodation).map((item: any) => (
                          <div key={item.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center text-sm">
                            <div>
                              <p className="font-semibold text-slate-850 dark:text-slate-200">{item.job_function?.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.quantity} {item.quantity === 1 
                                  ? t('comercial.detail.logisticsCard.worker', i18n.resolvedLanguage === 'es' ? 'trabajador' : i18n.resolvedLanguage === 'en' ? 'worker' : 'trabalhador') 
                                  : t('comercial.detail.logisticsCard.workers', i18n.resolvedLanguage === 'es' ? 'trabajadores' : i18n.resolvedLanguage === 'en' ? 'workers' : 'trabalhadores')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 font-medium">
                                {item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null 
                                  ? `€${Number(item.custom_lodging_rate).toFixed(2)}/dia` 
                                  : t('comercial.detail.logisticsCard.standardLodging', i18n.resolvedLanguage === 'es' ? 'Tarifa Estándar' : i18n.resolvedLanguage === 'en' ? 'Standard Rate' : 'Tarifa Padrão')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850 rounded-lg text-xs italic text-slate-500 text-center">
                        {t('comercial.detail.logisticsCard.noAccommodation', i18n.resolvedLanguage === 'es' ? 'No se prevé alojamiento para los perfiles de esta estimación.' : i18n.resolvedLanguage === 'en' ? 'No accommodation planned for the profiles in this estimate.' : 'Não há previsão de alojamento para os perfis desta estimativa.')}
                      </div>
                    )}
                  </div>

                  {/* Logistics and other benefits details */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                      <Truck className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                      {t('comercial.detail.logisticsCard.otherBenefits', i18n.resolvedLanguage === 'es' ? 'Transporte, EPIs y Seguridad Social' : i18n.resolvedLanguage === 'en' ? 'Transport, PPEs & Social Security' : 'Transporte, EPIs e Segurança Social')}
                    </h4>

                    <div className="space-y-3">
                      {/* Transport summary */}
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-slate-850 dark:text-slate-200">
                            {t('comercial.costCategories.transport', 'Transporte')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {items.filter((i: any) => i.includes_transport).length} {t('comercial.detail.logisticsCard.profileWithBenefits', i18n.resolvedLanguage === 'es' ? 'perfiles con transporte incluido' : i18n.resolvedLanguage === 'en' ? 'profiles with transport included' : 'perfis com transporte incluso')}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-350">
                          {totalTransport > 0 ? formatCurrency(totalTransport) : t('comercial.detail.logisticsCard.noTransport', i18n.resolvedLanguage === 'es' ? 'No se prevé transporte' : i18n.resolvedLanguage === 'en' ? 'No transport planned' : 'Sem previsão de transporte')}
                        </span>
                      </div>

                      {/* PPE summary */}
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-slate-850 dark:text-slate-200">
                            {t('comercial.costCategories.epi', 'EPIs')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {items.filter((i: any) => i.includes_ppe).length} {t('comercial.detail.logisticsCard.profileWithBenefitsPPE', i18n.resolvedLanguage === 'es' ? 'perfiles con EPIs incluidos' : i18n.resolvedLanguage === 'en' ? 'profiles with PPEs included' : 'perfis com EPIs inclusos')}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-350">
                          {totalEpi > 0 ? formatCurrency(totalEpi) : t('comercial.detail.logisticsCard.noPPE', i18n.resolvedLanguage === 'es' ? 'No se prevén EPIs' : i18n.resolvedLanguage === 'en' ? 'No PPE planned' : 'Sem previsão de EPIs')}
                        </span>
                      </div>

                      {/* Social Security regime summary */}
                      {items.some((i: any) => i.ss_regime && i.ss_regime !== 'none') && (
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg text-sm">
                          <p className="font-semibold text-slate-850 dark:text-slate-200 mb-2">
                            {t('comercial.detail.itemsCard.socialSecurity', 'Segurança Social')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.filter((i: any) => i.ss_regime && i.ss_regime !== 'none').map((item: any) => (
                              <span key={item.id} className="text-[11px] font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/35">
                                {item.job_function?.name}: {item.ss_regime === 'destacado' ? t('comercial.detail.itemsCard.destacado', 'Destacado') : t('comercial.detail.itemsCard.local', 'Local')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('comercial.detail.versionsCard.title')}</CardTitle>
                <CardDescription>{t('comercial.detail.versionsCard.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {estimacion.versions?.map((version: any) => (
                    <div 
                      key={version.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${version.id === estimacion.current_version_id ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          V{version.version_number}
                        </div>
                        <div>
                          <p className="font-medium">
                            {version.id === estimacion.current_version_id && (
                              <span className="text-primary text-xs font-bold uppercase mr-2 tracking-wider">
                                {t('comercial.detail.versionsCard.current')}
                              </span>
                            )}
                            {(() => {
                              const date = new Date(version.created_at);
                              if (i18n.resolvedLanguage === 'en') {
                                return format(date, "MMMM dd, yyyy 'at' HH:mm");
                              } else if (i18n.resolvedLanguage === 'es') {
                                return format(date, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm");
                              } else {
                                return format(date, "dd 'de' MMMM, yyyy 'às' HH:mm");
                              }
                            })()}
                          </p>
                          <p className="text-sm text-muted-foreground">{version.notes || t('comercial.detail.versionsCard.noNotes')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(version.total_revenue)}</p>
                          <p className="text-xs text-muted-foreground">{t('comercial.detail.itemsCard.thMargin')}: {version.margin_percent}%</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedHistoricalVersion(version);
                            setIsHistoricalDialogOpen(true);
                          }}
                          title={t('comercial.detail.versionsCard.viewDetails')}
                        >
                          <Eye className="h-4 w-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('comercial.detail.timelineCard.title')}</CardTitle>
                <CardDescription>{t('comercial.detail.timelineCard.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="p-8 text-center text-muted-foreground">
                   {t('comercial.detail.timelineCard.empty')}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t('comercial.detail.newVersionDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {t('comercial.detail.newVersionDialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="version-notes" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('comercial.detail.newVersionDialog.labelNotes')}
                </Label>
                <Textarea
                  id="version-notes"
                  placeholder={t('comercial.detail.newVersionDialog.placeholderNotes')}
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="min-h-[100px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsVersionDialogOpen(false)}
                disabled={criarNovaVersao.isPending}
                className="w-full sm:w-auto"
              >
                {t('comercial.detail.newVersionDialog.btnCancel')}
              </Button>
              <Button
                onClick={() => {
                  criarNovaVersao.mutate(
                    { estimacionId: estimacion.id, notes: versionNotes },
                    {
                      onSuccess: () => {
                        setIsVersionDialogOpen(false);
                        navigate(`/comercial/estimaciones/${estimacion.id}/editar`);
                      }
                    }
                  );
                }}
                disabled={criarNovaVersao.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                {criarNovaVersao.isPending ? t('comercial.detail.loading') : t('comercial.detail.newVersionDialog.btnConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes da Versão Histórica */}
        <Dialog open={isHistoricalDialogOpen} onOpenChange={setIsHistoricalDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t('comercial.detail.historicalDialog.title', { version: selectedHistoricalVersion?.version_number || '' })}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {t('comercial.detail.historicalDialog.description')}
              </DialogDescription>
            </DialogHeader>

            {selectedHistoricalVersion && (
              <div className="space-y-6 py-4">
                {/* Resumo Financeiro */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('comercial.detail.financialCard.cost')}</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedHistoricalVersion.total_cost || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('comercial.detail.financialCard.revenue')}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedHistoricalVersion.total_revenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('comercial.detail.financialCard.margin')}</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedHistoricalVersion.margin_percent || 0}% 
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        ({formatCurrency((selectedHistoricalVersion.total_revenue || 0) - (selectedHistoricalVersion.total_cost || 0))})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Justificativa */}
                {selectedHistoricalVersion.notes && (
                  <div className="p-3 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">{t('comercial.detail.newVersionDialog.labelNotes')}:</span>
                    <span className="text-slate-650 dark:text-slate-400">{selectedHistoricalVersion.notes}</span>
                  </div>
                )}

                {/* Itens */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('comercial.detail.itemsCard.title')}</h4>
                  {selectedHistoricalVersion.items && selectedHistoricalVersion.items.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                            <th className="p-2.5">{t('comercial.detail.itemsCard.thFunction')}</th>
                            <th className="p-2.5 text-center">{t('comercial.detail.itemsCard.thQty')}</th>
                            <th className="p-2.5 text-center">{t('comercial.detail.itemsCard.thHours')}</th>
                            <th className="p-2.5 text-right">{t('comercial.detail.itemsCard.thSellRate')}</th>
                            <th className="p-2.5 text-right">{t('comercial.detail.itemsCard.thMargin')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedHistoricalVersion.items.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-2.5 font-medium">{item.job_function?.name}</td>
                              <td className="p-2.5 text-center">{item.quantity}</td>
                              <td className="p-2.5 text-center">{(item.planned_total_hours !== undefined && item.planned_total_hours !== null) ? item.planned_total_hours : item.total_hours}h</td>
                              <td className="p-2.5 text-right font-medium text-blue-600">{formatCurrency(item.sell_rate_hour)}/h</td>
                              <td className="p-2.5 text-right font-semibold text-emerald-600">{item.margin_percent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">{t('comercial.detail.itemsCard.empty')}</p>
                  )}
                </div>

                {/* Custos Adicionais */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('comercial.detail.costsCard.title')}</h4>
                  {selectedHistoricalVersion.costs && selectedHistoricalVersion.costs.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                            <th className="p-2.5">{t('comercial.detail.costsCard.thCategory')}</th>
                            <th className="p-2.5">{t('comercial.detail.costsCard.thDescription')}</th>
                            <th className="p-2.5 text-right">{t('comercial.detail.costsCard.thValue')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedHistoricalVersion.costs.map((cost: any) => (
                            <tr key={cost.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-2.5 font-medium capitalize">{cost.cost_category.replace('_', ' ')}</td>
                              <td className="p-2.5 text-muted-foreground">{cost.description || '-'}</td>
                              <td className="p-2.5 text-right font-medium">{formatCurrency(cost.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">{t('comercial.detail.costsCard.empty')}</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setIsHistoricalDialogOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white w-full sm:w-auto">
                {t('comercial.detail.btnBack')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
