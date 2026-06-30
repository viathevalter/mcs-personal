import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  History,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building,
  MapPin,
  RefreshCw,
  Info
} from 'lucide-react';
import { useCheckVies } from '../../hooks/useClientVies';
import { useMutateClient } from '../../hooks/useClients';
import { CountrySelector } from '../../../locations/components/LocationSelectors';
import { ClientViesHistoryDialog } from './ClientViesHistoryDialog';
import type { Client } from '../../types';

interface ClientViesTabProps {
  client: Client;
}

// Simple text similarity calculator for auditing names/addresses
function calculateSimilarity(str1?: string | null, str2?: string | null) {
  if (!str1 || !str2) return 0;
  
  const clean = (s: string) => s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')     // remove symbols
    .replace(/\b(s\s?l|s\s?a|ltd|limited|gmbh|srl|sl|sa)\b/g, '') // remove common company suffixes
    .trim();

  const s1 = clean(str1);
  const s2 = clean(str2);

  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  const w1 = s1.split(/\s+/).filter(Boolean);
  const w2 = s2.split(/\s+/).filter(Boolean);
  
  if (w1.length === 0 || w2.length === 0) return 0;

  const w1Set = new Set(w1);
  const w2Set = new Set(w2);
  const intersection = new Set(w1.filter(x => w2Set.has(x)));
  const union = new Set([...w1, ...w2]);

  return Math.round((intersection.size / union.size) * 100);
}

export function ClientViesTab({ client }: ClientViesTabProps) {
  const { updateClient, isUpdating } = useMutateClient();
  const checkViesMutation = useCheckVies();

  // Local State representing fields in Block A
  const [taxId, setTaxId] = useState(client.tax_id || '');
  const [countryId, setCountryId] = useState(client.country_id || '');
  const [viesApplicable, setViesApplicable] = useState(client.vies_applicable || false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Sync state if client prop changes
  useEffect(() => {
    setTaxId(client.tax_id || '');
    setCountryId(client.country_id || '');
    setViesApplicable(client.vies_applicable || false);
  }, [client]);

  const hasUnsavedChanges = 
    taxId !== (client.tax_id || '') || 
    countryId !== (client.country_id || '') || 
    viesApplicable !== (client.vies_applicable || false);

  // Normalization logic: detect country prefix, remove spaces/dots/hyphens
  const getVatDetails = () => {
    // Basic prefix matching: We can lookup or simple fallback to a 2 letter code
    // Ideally we can extract the first 2 characters if they are letters, or use a hardcoded map
    // For simplicity, we just use a default placeholder or country prefix if we know it.
    // In this app, the countries list has iso2. We will look up country metadata.
    // Let's assume standard country prefix.
    const rawTaxId = taxId.trim().toUpperCase();
    const cleanTax = rawTaxId.replace(/[\s\.\-\,]+/g, '');
    
    return {
      cleanTax,
      rawTaxId
    };
  };

  const { cleanTax } = getVatDetails();

  const handleSaveChanges = async () => {
    try {
      await updateClient({
        id: client.id!,
        payload: {
          tax_id: taxId,
          country_id: countryId || null,
          vies_applicable: viesApplicable,
          // If VAT or Country changes, invalidate current check status to 'stale'
          ...( (taxId !== client.tax_id || countryId !== client.country_id) ? {
            vies_status: 'stale',
            vies_valid: false,
            vies_returned_name: null,
            vies_returned_address: null,
            vies_requires_review: false
          } : {})
        }
      });
      toast.success('Alterações salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alterações');
    }
  };

  const handleCheckVies = async () => {
    if (hasUnsavedChanges) {
      toast.warning('Por favor, salve as alterações cadastrais antes de realizar a consulta.');
      return;
    }

    if (!countryId) {
      toast.error('É necessário selecionar um país fiscal para consultar o VIES.');
      return;
    }

    // Temporary guess of country prefix: usually the system has countries table.
    // We can fetch country code from the window/state. Let's query countries if needed,
    // or we can extract the ISO code. In this project, the country has an ID.
    // Let's look up the ISO2 code from the database using our auth client.
    // Wait, the easiest way is to let the Edge Function resolve the country_id to ISO2 code,
    // but the Edge Function accepts `country_code` (e.g. 'ES', 'IT').
    // Let's fetch the country object first to get its ISO2 code!
    // Let's fetch the country ISO2. In our types, the client country is a uuid.
    // Let's read `LocationSelectors.tsx` or run a quick fetch to see what is returned.
    // In `LocationSelectors.tsx`, Country has `iso2`.
    // Let's fetch the country record from Supabase for this countryId.
    try {
      toast.info('Verificando base de dados do país...');
      const { data: country, error: countryErr } = await checkViesMutation.mutateAsync({
        clientId: client.id!,
        countryCode: '', // the Edge Function can resolve it if we pass it, or we resolve it here.
        vatNumber: cleanTax,
        triggerSource: 'manual'
      });
      
      // Wait, we need to pass a valid countryCode. How do we get the ISO2 of countryId?
      // Let's fetch it here!
    } catch (err) {}
  };

  // Improved check VIES wrapper that resolves country ISO code
  const runLiveCheck = async () => {
    if (hasUnsavedChanges) {
      toast.warning('Por favor, salve as alterações cadastrais antes de realizar a consulta.');
      return;
    }
    if (!countryId) {
      toast.error('É necessário selecionar um país fiscal.');
      return;
    }
    
    try {
      toast.loading('Consultando registro VIES da Comissão Europeia...', { id: 'vies-loading' });

      // Fetch country ISO code from country_id directly
      const { data: countryData, error: countryErr } = await supabaseClientQueryCountry(countryId);
      if (countryErr || !countryData || !countryData.iso2) {
        throw new Error('Código ISO do país fiscal não encontrado no sistema.');
      }

      const result = await checkViesMutation.mutateAsync({
        clientId: client.id!,
        countryCode: countryData.iso2,
        vatNumber: cleanTax,
        triggerSource: 'manual'
      });

      toast.dismiss('vies-loading');
      
      if (result.status === 'valid') {
        toast.success('VIES validado com sucesso! Número de IVA ativo.');
      } else if (result.status === 'invalid') {
        toast.error('Número de IVA inválido ou inativo para operações intracomunitárias.');
      } else {
        toast.warning(`Consulta concluída: ${getViesStatusLabel(result.status)}`);
      }
    } catch (err: any) {
      toast.dismiss('vies-loading');
      toast.error(err.message || 'Falha técnica ao efetuar consulta.');
    }
  };

  // Standard query using import supabase from shared
  const supabaseClientQueryCountry = async (id: string) => {
    // We can import supabase client directly inside or query it
    const { supabase } = await import('@/shared/supabase/client');
    const { data, error } = await supabase
      .schema('core_common')
      .from('countries')
      .select('iso2')
      .eq('id', id)
      .single();
    return { data, error };
  };

  const getViesStatusLabel = (statusStr?: string) => {
    const s = statusStr || client.vies_status || 'not_checked';
    switch (s) {
      case 'not_checked': return 'Nunca consultado';
      case 'valid': return 'VIES Válido';
      case 'invalid': return 'Não validado no VIES';
      case 'service_unavailable': return 'Serviço temporariamente indisponível';
      case 'member_state_unavailable': return 'Base nacional indisponível';
      case 'timeout': return 'Tempo de consulta excedido';
      case 'rate_limited': return 'Limite de consultas excedido';
      case 'technical_error': return 'Erro técnico na consulta';
      case 'stale': return 'Consulta desatualizada';
      case 'manual_review': return 'Necessita revisão manual';
      case 'not_applicable': return 'VIES não aplicável';
      default: return s;
    }
  };

  const getViesStatusTheme = () => {
    const s = client.vies_status || 'not_checked';
    switch (s) {
      case 'valid':
        return {
          icon: <ShieldCheck className="h-10 w-10 text-emerald-500" />,
          titleClass: 'text-emerald-700 dark:text-emerald-400',
          bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900',
          dotClass: 'bg-emerald-500',
          desc: 'Este cliente possui um registro IVA ativo e válido para operações intracomunitárias.'
        };
      case 'invalid':
        return {
          icon: <ShieldAlert className="h-10 w-10 text-rose-500" />,
          titleClass: 'text-rose-700 dark:text-rose-400',
          bgClass: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900',
          dotClass: 'bg-rose-500',
          desc: 'O número de IVA informado foi rejeitado pelo VIES ou não está autorizado para comércio intracomunitário.'
        };
      case 'service_unavailable':
      case 'member_state_unavailable':
      case 'timeout':
      case 'rate_limited':
        return {
          icon: <AlertTriangle className="h-10 w-10 text-amber-500" />,
          titleClass: 'text-amber-700 dark:text-amber-400',
          bgClass: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900',
          dotClass: 'bg-amber-500',
          desc: 'A consulta falhou devido a indisponibilidade ou lentidão temporária no serviço europeu. O status anterior foi preservado.'
        };
      case 'stale':
        return {
          icon: <RefreshCw className="h-10 w-10 text-orange-500 animate-spin-slow" />,
          titleClass: 'text-orange-700 dark:text-orange-400',
          bgClass: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/60 dark:border-orange-900',
          dotClass: 'bg-orange-500',
          desc: 'Os dados fiscais do cliente foram alterados. Uma nova consulta ao VIES é recomendada para validar o novo número.'
        };
      case 'not_applicable':
        return {
          icon: <Info className="h-10 w-10 text-slate-500" />,
          titleClass: 'text-slate-700 dark:text-slate-400',
          bgClass: 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/60 dark:border-slate-800',
          dotClass: 'bg-slate-400',
          desc: 'Operações intracomunitárias de VIES não são aplicáveis a este cliente (ex: fora da União Europeia).'
        };
      default:
        return {
          icon: <HelpCircle className="h-10 w-10 text-slate-400" />,
          titleClass: 'text-slate-700 dark:text-slate-400',
          bgClass: 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/60 dark:border-slate-800',
          dotClass: 'bg-slate-350',
          desc: 'Este número fiscal ainda não foi consultado no VIES europeu.'
        };
    }
  };

  const theme = getViesStatusTheme();

  // Block C: Audit discrepancy calculator
  const nameSimilarity = calculateSimilarity(client.legal_name, client.vies_returned_name);
  const addressSimilarity = calculateSimilarity(client.address_line, client.vies_returned_address);

  const getDiscrepancyBadge = (similarity: number, returnedVal?: string | null) => {
    if (!client.vies_returned_name && !client.vies_returned_address) {
      return <Badge variant="secondary">Informação não fornecida pelo país</Badge>;
    }
    if (!returnedVal) {
      return <Badge variant="secondary">Sem retorno</Badge>;
    }
    if (similarity >= 80) {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Correspondência Alta ({similarity}%)</Badge>;
    }
    if (similarity >= 30) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Correspondência Parcial ({similarity}%)</Badge>;
    }
    return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Divergência ({similarity}%)</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Controle Fiscal e Validação VIES</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verifique e certifique a validade fiscal do cliente para operações comerciais intracomunitárias na União Europeia.
          </p>
        </div>
        <Button
          onClick={() => setHistoryOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2 border-slate-200 shadow-sm"
        >
          <History className="h-4 w-4 text-slate-500" />
          Ver Histórico de Consultas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BLOCO A: Identificação Fiscal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-850">
              <Shield className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Identificação Fiscal</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">País Fiscal</label>
                <CountrySelector
                  value={countryId || null}
                  onChange={(val) => setCountryId(val || '')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Número de Identificação Fiscal (NIF)</label>
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Ex: B63272603"
                  className="bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-100/60 dark:bg-slate-900/60 border font-mono text-xs">
                <p className="text-slate-400 text-[10px] font-sans font-semibold uppercase">Número Completo de IVA Europeu</p>
                <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                  {client.eu_vat_number || 'Aguardando validação...'}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-950">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">VIES Aplicável</span>
                  <p className="text-[10px] text-slate-400">Habilita monitoramento e faturamento intracomunitário.</p>
                </div>
                <Switch
                  checked={viesApplicable}
                  onCheckedChange={setViesApplicable}
                />
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-xs"
                >
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações Fiscais'}
                </Button>
              </div>
            )}
          </div>

          {/* BLOCO C: Conferência Cadastral */}
          {client.vies_status === 'valid' && (
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-850">
                <Building className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Conferência Cadastral (VIES vs. MCS)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Comparação de Razão Social */}
                <div className="space-y-2 p-3 rounded-xl border bg-white dark:bg-slate-950 relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-400">Razão Social / Nome</span>
                    {getDiscrepancyBadge(nameSimilarity, client.vies_returned_name)}
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div>
                      <p className="text-[9px] uppercase font-semibold text-slate-400">No Sistema MCS:</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">{client.legal_name}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[9px] uppercase font-semibold text-slate-400">Retornado do VIES:</p>
                      <p className="font-bold text-orange-600 dark:text-orange-400">
                        {client.vies_returned_name || <span className="text-slate-400 font-normal italic">Informação omitida</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparação de Endereço */}
                <div className="space-y-2 p-3 rounded-xl border bg-white dark:bg-slate-950 relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-400">Endereço Fiscal</span>
                    {getDiscrepancyBadge(addressSimilarity, client.vies_returned_address)}
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div>
                      <p className="text-[9px] uppercase font-semibold text-slate-400">No Sistema MCS:</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{client.address_line || 'Não preenchido'}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[9px] uppercase font-semibold text-slate-400">Retornado do VIES:</p>
                      <p className="font-bold text-orange-600 dark:text-orange-400 truncate">
                        {client.vies_returned_address || <span className="text-slate-400 font-normal italic">Informação omitida</span>}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {client.vies_requires_review && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Atenção:</strong> Há divergências textuais consideráveis entre a razão social ou endereço cadastrados no sistema e os dados oficiais registrados na Comissão Europeia. Revise as informações cadastrais.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BLOCO B: Situação VIES */}
        <div className="space-y-6">
          <Card className={`border rounded-2xl ${theme.bgClass} overflow-hidden shadow-sm`}>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border shadow-xs">
                  {theme.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Situação VIES</span>
                  <h4 className={`text-base font-bold ${theme.titleClass}`}>
                    {getViesStatusLabel()}
                  </h4>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {theme.desc}
              </div>

              <div className="space-y-2.5 pt-3 border-t text-xs font-mono">
                {client.vies_last_checked_at && (
                  <div>
                    <span className="text-[10px] font-sans font-semibold text-slate-400">ÚLTIMA CONSULTA:</span>
                    <p className="text-slate-700 dark:text-slate-350">
                      {new Date(client.vies_last_checked_at).toLocaleString('pt-PT')}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-sans font-semibold text-slate-400">FONTE:</span>
                  <p className="text-slate-700 dark:text-slate-350 font-sans">Comissão Europeia — VIES</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={runLiveCheck}
                  disabled={checkViesMutation.isPending || hasUnsavedChanges}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg gap-2 text-xs py-5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checkViesMutation.isPending ? 'animate-spin' : ''}`} />
                  {checkViesMutation.isPending ? 'Consultando VIES...' : 
                   client.vies_status && client.vies_status !== 'not_checked' ? 'Consultar Novamente' : 'Consultar VIES'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <ClientViesHistoryDialog
        clientId={client.id!}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
