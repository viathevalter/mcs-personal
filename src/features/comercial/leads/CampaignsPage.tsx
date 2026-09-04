import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { cn } from '@/lib/utils';
import { useMarketingTemplates, useMarketingCampaigns, useMutateMarketing } from './hooks/useMarketing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Plus, 
  Mail, 
  Trash2,
  Calendar,
  Send,
  Users,
  Code,
  FileText,
  Play,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Info,
  Eye,
  Loader2,
  ChevronDown,
  X,
  Building2,
  Building,
  MapPin,
  Layers,
  Globe,
  Filter,
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Badge } from '@/components/ui/badge';

const countryLabels: Record<string, { name: string; flag: string }> = {
  ES: { name: 'Espanha', flag: '🇪🇸' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  FR: { name: 'França', flag: '🇫🇷' },
  DE: { name: 'Alemanha', flag: '🇩🇪' },
  IT: { name: 'Itália', flag: '🇮🇹' },
  NL: { name: 'Holanda', flag: '🇳🇱' },
  BE: { name: 'Bélgica', flag: '🇧🇪' },
  GB: { name: 'Reino Unido', flag: '🇬🇧' },
  OTHER: { name: 'Outros', flag: '🌍' },
};

const detectLeadCountry = (lead: any): string => {
  if (lead.country_id) {
    const c = String(lead.country_id).toUpperCase();
    if (['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'BE', 'GB'].includes(c)) return c;
  }
  if (lead.phone) {
    const p = String(lead.phone).trim();
    if (p.startsWith('+34') || p.startsWith('34')) return 'ES';
    if (p.startsWith('+351') || p.startsWith('351')) return 'PT';
    if (p.startsWith('+33') || p.startsWith('33')) return 'FR';
    if (p.startsWith('+49') || p.startsWith('49')) return 'DE';
    if (p.startsWith('+39') || p.startsWith('39')) return 'IT';
    if (p.startsWith('+31') || p.startsWith('31')) return 'NL';
    if (p.startsWith('+32') || p.startsWith('32')) return 'BE';
    if (p.startsWith('+44') || p.startsWith('44')) return 'GB';
  }
  if (lead.email) {
    const em = String(lead.email).toLowerCase().trim();
    if (em.endsWith('.es')) return 'ES';
    if (em.endsWith('.pt')) return 'PT';
    if (em.endsWith('.fr')) return 'FR';
    if (em.endsWith('.de')) return 'DE';
    if (em.endsWith('.it')) return 'IT';
    if (em.endsWith('.nl')) return 'NL';
    if (em.endsWith('.be')) return 'BE';
    if (em.endsWith('.uk') || em.endsWith('.co.uk')) return 'GB';
  }
  if (Array.isArray(lead.tags)) {
    for (const t of lead.tags) {
      if (typeof t === 'string') {
        const lower = t.toLowerCase();
        if (lower.includes('espanha') || lower.includes('españa')) return 'ES';
        if (lower.includes('portugal')) return 'PT';
        if (lower.includes('frança') || lower.includes('francia')) return 'FR';
        if (lower.includes('itália') || lower.includes('italia')) return 'IT';
        if (lower.includes('alemanha') || lower.includes('alemania')) return 'DE';
      }
    }
  }
  return 'ES';
};

const sectorOptions = [
  { label: 'Caldeiraria & Estruturas', value: 'caldereria' },
  { label: 'Construção & Obras', value: 'construcc' },
  { label: 'Estruturas Metálicas', value: 'estructuras' },
  { label: 'Indústria & Fábricas', value: 'industria' },
  { label: 'Mecânica & Usinagem', value: 'mecanica' },
  { label: 'Metalurgia & Metalomecânica', value: 'metal' },
  { label: 'Montagens Industriais', value: 'montajes' },
  { label: 'Soldadura & Solda', value: 'soldadura' },
  { label: 'Talleres & Oficinas', value: 'talleres' },
];

const serviceOptions = [
  { label: 'Soldadores (TIG, MIG, MAG)', value: 'soldador' },
  { label: 'Tubistas & Encanadores', value: 'tubista' },
  { label: 'Caldeireiros Industriais', value: 'caldeireiro' },
  { label: 'Montadores Industriais', value: 'montador' },
  { label: 'Mão de Obra para Obras', value: 'obra' },
  { label: 'Mecanizados & Tornearia', value: 'mecanizado' },
  { label: 'Engenharia & Projetos', value: 'ingenieria' },
];

interface MultiSelectComboboxProps {
  label: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function MultiSelectCombobox({
  label,
  options,
  selectedValues = [],
  onChange,
  placeholder = "Selecione opções..."
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== val));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredVals = filteredOptions.map(o => o.value);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredVals]));
    onChange(combined);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-semibold">{label}</Label>
        {selectedValues.length > 0 && (
          <button 
            type="button" 
            onClick={handleClearAll}
            className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold cursor-pointer"
          >
            Limpar ({selectedValues.length})
          </button>
        )}
      </div>
      
      {/* Trigger Area */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[40px] max-h-[90px] overflow-y-auto border border-slate-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs cursor-pointer flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-2xs hover:border-amber-500/50 transition-colors scrollbar-thin"
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400 text-xs py-0.5">{placeholder}</span>
        ) : (
          selectedValues.map(val => {
            const match = options.find(o => o.value === val);
            const labelText = match ? match.label : val;
            return (
              <span 
                key={val} 
                className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/30 rounded-md text-[11px] px-2 py-0.5 flex items-center gap-1 font-bold shrink-0"
              >
                <span className="truncate max-w-[200px]">{labelText}</span>
                <X 
                  className="h-3 w-3 hover:text-red-600 cursor-pointer shrink-0" 
                  onClick={(e) => removeValue(val, e)} 
                />
              </span>
            );
          })
        )}
        <ChevronDown className="h-4 w-4 text-slate-400 ml-auto shrink-0" />
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-2.5 space-y-2 max-h-72 overflow-y-auto w-full min-w-[340px]">
            <div className="flex gap-1.5">
              <Input
                placeholder="Pesquisar..."
                className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 flex-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                className="h-8 text-[11px] px-2"
              >
                Todos
              </Button>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="text-[11px] text-slate-400 p-3 text-center">Nenhuma opção encontrada</div>
              ) : (
                filteredOptions.map(opt => {
                  const isChecked = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 h-4 w-4 cursor-pointer shrink-0"
                      />
                      <span className="truncate">{opt.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Parse config from HTML comment
const parseTemplateConfig = (html: string) => {
  if (!html) return null;
  const match = html.match(/<!-- TEMPLATE_CONFIG: (\{.*?\}) -->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse template config JSON:", e);
    }
  }
  return null;
};

// Update HTML content from old and new config
const updateHtmlContent = (html: string, oldConfig: any, newConfig: any) => {
  let updatedHtml = html;
  
  const replaceValue = (oldVal: string, newVal: string) => {
    if (oldVal && newVal && oldVal !== newVal) {
      const escapedOld = oldVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      updatedHtml = updatedHtml.replace(new RegExp(escapedOld, 'g'), newVal);
    }
  };

  replaceValue(oldConfig.primaryColor, newConfig.primaryColor);
  replaceValue(oldConfig.accentColor, newConfig.accentColor);
  replaceValue(oldConfig.bannerUrl, newConfig.bannerUrl);
  replaceValue(oldConfig.sellerName, newConfig.sellerName);
  replaceValue(oldConfig.sellerTitle, newConfig.sellerTitle);
  replaceValue(oldConfig.sellerPhone, newConfig.sellerPhone);
  
  const oldConfigJson = JSON.stringify(oldConfig);
  const newConfigJson = JSON.stringify(newConfig);
  updatedHtml = updatedHtml.replace(
    `<!-- TEMPLATE_CONFIG: ${oldConfigJson} -->`,
    `<!-- TEMPLATE_CONFIG: ${newConfigJson} -->`
  );
  
  return updatedHtml;
};

export function CampaignsPage() {
  const { t, i18n } = useTranslation();
  const { selectedEmpresaId, empresas } = useEmpresa();
  const currentEmpresa = empresas.find(e => e.id === selectedEmpresaId);
  const activeSenderEmail = currentEmpresa?.marketing_sender_email || 'comercial1@luminousalley.com';
  const activeSenderName = currentEmpresa?.trade_name || currentEmpresa?.nome || 'Equipe Comercial';
  const { data: templates = [], isLoading: loadingTemplates } = useMarketingTemplates();
  const { data: campaigns = [], isLoading: loadingCampaigns } = useMarketingCampaigns();
  
  const { 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    createCampaign, 
    startCampaign, 
    deleteCampaign 
  } = useMutateMarketing();

  const [activeTab, setActiveTab] = useState('campaigns');
  const queryClient = useQueryClient();

  // Query: Estatísticas agregadas da fila para cada campanha (total, sent, pending, failed)
  const { data: campaignStats = {}, refetch: refetchCampaignStats } = useQuery<Record<string, { total: number; sent: number; pending: number; failed: number }>>({
    queryKey: ['campaign_queue_stats', selectedEmpresaId, campaigns],
    queryFn: async () => {
      const validEmpresaId = (selectedEmpresaId && selectedEmpresaId !== 'all' && selectedEmpresaId.length === 36) ? selectedEmpresaId : null;
      const { data, error } = await supabase.rpc('fn_get_campaigns_stats', {
        p_empresa_id: validEmpresaId,
      });

      if (error) {
        console.error('Error fetching campaign stats:', error);
        return {};
      }

      const statsMap: Record<string, { total: number; sent: number; pending: number; failed: number }> = {};
      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          statsMap[row.campaign_id] = {
            total: Number(row.total || 0),
            sent: Number(row.sent || 0),
            pending: Number(row.pending || 0),
            failed: Number(row.failed || 0),
          };
        });
      }
      return statsMap;
    },
    enabled: campaigns.length > 0,
  });

  // Auto queue processor for active sending/scheduled campaigns
  useEffect(() => {
    const hasActiveCampaign = campaigns.some((c: any) => c.status === 'sending' || c.status === 'scheduled');
    if (!hasActiveCampaign) return;

    // Immediately trigger processing on load
    supabase.functions.invoke('process-marketing-queue').then(() => {
      refetchCampaignStats();
    }).catch(() => {});

    const interval = setInterval(async () => {
      try {
        await supabase.functions.invoke('process-marketing-queue');
        refetchCampaignStats();
      } catch (e) {
        console.warn('Auto queue invoke:', e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [campaigns, refetchCampaignStats]);

  // Query: Estágios do Kanban da empresa (para filtro)
  const { data: kanbanStages = [] } = useQuery({
    queryKey: ['kanban_stages', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmpresaId,
  });

  // State: Seleção de Destinatários / Público-Alvo
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [selectedCampaignIdForAudience, setSelectedCampaignIdForAudience] = useState<string | null>(null);
  const [audienceFilters, setAudienceFilters] = useState<{
    stageId: string;
    origin: string;
    intelligence: string;
    selectedCountries: string[];
    selectedCompanySizes: string[];
    selectedRegions: string[];
    selectedProvinces: string[];
    selectedSectors: string[];
    selectedServices: string[];
    sectorKeyword: string;
    cargoKeyword: string;
    provinceKeyword: string;
    tagKeyword: string;
    excludeTagKeyword?: string;
    excludeProposals?: boolean;
    limit: string;
    offset: string;
  }>({
    stageId: '',
    origin: '',
    intelligence: 'all',
    selectedCountries: [],
    selectedCompanySizes: [],
    selectedRegions: [],
    selectedProvinces: [],
    selectedSectors: [],
    selectedServices: [],
    sectorKeyword: '',
    cargoKeyword: '',
    provinceKeyword: '',
    tagKeyword: '',
    excludeTagKeyword: '',
    excludeProposals: false,
    limit: '',
    offset: '',
  });
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [allQueuedLeads, setAllQueuedLeads] = useState<any[]>([]);
  const [loadingAudienceLeads, setLoadingAudienceLeads] = useState(false);
  const [isSavingAudience, setIsSavingAudience] = useState(false);

  // Saved Audiences feature
  const [savedAudiences, setSavedAudiences] = useState<any[]>([]);
  const [audienceSaveName, setAudienceSaveName] = useState('');
  const [shouldSaveAsPreset, setShouldSaveAsPreset] = useState(false);
  const [isNewAudienceDialogOpen, setIsNewAudienceDialogOpen] = useState(false); // To build and save an audience directly in the audiences tab
  const [viewLeadsAudience, setViewLeadsAudience] = useState<any | null>(null); // For viewing leads inside a saved audience

  // Grid Selection & Search & Pagination
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadGridSearch, setLeadGridSearch] = useState('');
  const [gridPage, setGridPage] = useState(1);

  // Dynamic Options derived from database leads
  const dynamicCountryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      const c = detectLeadCountry(l);
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(countryLabels)
      .filter(([code]) => (counts[code] || 0) > 0)
      .map(([code, info]) => ({
        label: `${info.flag} ${info.name} (${counts[code] || 0})`,
        value: code,
      }));
  }, [allLeads]);

  const dynamicCompanySizeOptions = useMemo(() => {
    const sizes = [
      { label: '🏢 Gran Empresa (Tier 1)', value: 'Gran Empresa (Tier 1)' },
      { label: '🏭 Mediana Empresa (Tier 2)', value: 'Mediana Empresa (Tier 2)' },
      { label: '⚙️ Taller / Pequeña (Tier 3)', value: 'Pequeña Empresa / Taller (Tier 3)' },
    ];
    return sizes.map(s => {
      const count = allLeads.filter(l => l.company_size === s.value || (Array.isArray(l.tags) && l.tags.includes(s.value))).length;
      return {
        label: `${s.label} (${count})`,
        value: s.value,
      };
    });
  }, [allLeads]);

  const dynamicRegionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      if (l.region) counts[l.region] = (counts[l.region] || 0) + 1;
    });
    return Object.keys(counts).sort().map(reg => ({
      label: `🗺️ ${reg} (${counts[reg]})`,
      value: reg,
    }));
  }, [allLeads]);

  const dynamicProvinceOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      if (l.province) counts[l.province] = (counts[l.province] || 0) + 1;
    });
    return Object.keys(counts).sort().map(prov => ({
      label: `📍 ${prov} (${counts[prov]})`,
      value: prov,
    }));
  }, [allLeads]);

  const dynamicSectorOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      if (l.sector) {
        const sec = l.sector.trim();
        counts[sec] = (counts[sec] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(sec => ({
      label: `${sec} (${counts[sec]})`,
      value: sec,
    }));
  }, [allLeads]);

  const dynamicServiceOptions = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach(l => {
      if (l.servicio_producto && !l.servicio_producto.includes('@') && !l.servicio_producto.includes(',,,')) {
        set.add(l.servicio_producto.trim());
      }
    });
    ['Soldadores TIG / MIG / MAG', 'Caldeiraria Industrial', 'Montagem de Estruturas', 'Tubagem / Tubadores', 'Manutenção Industrial'].forEach(s => set.add(s));

    return Array.from(set).sort().map(srv => ({
      label: srv,
      value: srv
    }));
  }, [allLeads]);

  const defaultStrategicAudiences = useMemo(() => [
    {
      id: 'aud_tier1_vip',
      name: '👑 Público VIP - Grandes Empresas (Tier 1 & EPC)',
      leadCount: 437,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: ['Gran Empresa (Tier 1)', 'Tier 1 (Gran Empresa / EPC)'],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Público VIP',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_lote_manha',
      name: '☀️ Lote Manhã - Indústria & Montagens',
      leadCount: 1525,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Lote Manhã',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_lote_tarde',
      name: '🌅 Lote Tarde - Tubería & Calderería',
      leadCount: 2446,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Lote Tarde',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_tier2_medias',
      name: '🏭 Médias Empresas Industriais (Tier 2)',
      leadCount: 785,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: ['Mediana Empresa (Tier 2)', 'Tier 2 (Mediana Empresa Industrial)'],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: '',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_es_geral',
      name: '🎯 Triângulo (Michelle) - Geral Espanha Sem Alex (6.546 leads)',
      leadCount: 6546,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_caldereria',
      name: '🎯 Triângulo (Michelle) - Calderería, Tubería & Piping (1.200 leads)',
      leadCount: 1200,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: ['Calderería & Tubería Industrial', 'Tuyauterie & Chaudronnerie Industrielle'],
        selectedServices: [],
        sectorKeyword: 'calderer',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_estructuras',
      name: '🎯 Triângulo (Michelle) - Estructuras Metálicas & Montajes (1.100 leads)',
      leadCount: 1100,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: ['Estructuras Metálicas & Cerrajería', 'Metalmecânica & Industrial'],
        selectedServices: [],
        sectorKeyword: 'estructura',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_mecanizado',
      name: '🎯 Triângulo (Michelle) - Mecanizado CNC & Tornería (850 leads)',
      leadCount: 850,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: ['Mecanizado & Matricería', 'Talleres & Mecanizado'],
        selectedServices: [],
        sectorKeyword: 'mecaniz',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_catalunha',
      name: '🎯 Triângulo (Michelle) - Catalunha & Barcelona (1.350 leads)',
      leadCount: 1350,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: ['Catalunha', 'Cataluña', 'Catalunya'],
        selectedProvinces: ['Barcelona', 'Tarragona', 'Girona', 'Lleida'],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: 'barcelona',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_triangulo_michelle_madrid',
      name: '🎯 Triângulo (Michelle) - Madrid & Zona Centro (1.100 leads)',
      leadCount: 1100,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: ['Comunidad de Madrid', 'Madrid'],
        selectedProvinces: ['Madrid', 'Toledo', 'Guadalajara'],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: 'madrid',
        tagKeyword: '',
        excludeTagKeyword: 'Alex',
        excludeProposals: true,
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_alex_asturias_alicante',
      name: '🎯 Mailing Alex - Asturias & Alicante (621 leads)',
      leadCount: 621,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Mailing Alex Asturias-Alicante',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_alex_0209',
      name: '🎯 Mailing Alex - Base Álava & Euskadi (613 leads)',
      leadCount: 613,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Mailing Alex 02-09',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_alex',
      name: '🎯 Mailing Alex - Geral Espanha (3.890 leads)',
      leadCount: 3890,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Mailing Alex',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_comercial_3',
      name: '💼 Mailing Comercial 3 - Prospecção Equipe',
      leadCount: 1987,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Comercial 3',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_alex_stocco',
      name: '💼 Mailing Alex Stocco (2.197 leads)',
      leadCount: 2197,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Alex Stocco',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    },
    {
      id: 'aud_mailing_kr_captacion',
      name: '🎯 Mailing Kr-Captación / Rosa (2.937 leads)',
      leadCount: 2937,
      filters: {
        stageId: '',
        origin: '',
        intelligence: 'all',
        selectedCountries: ['ES'],
        selectedCompanySizes: [],
        selectedRegions: [],
        selectedProvinces: [],
        selectedSectors: [],
        selectedServices: [],
        sectorKeyword: '',
        cargoKeyword: '',
        provinceKeyword: '',
        tagKeyword: 'Kr-Captacion',
        limit: '',
        offset: '',
      },
      created_at: new Date().toISOString()
    }
  ], []);

  useEffect(() => {
    if (selectedEmpresaId) {
      const stored = localStorage.getItem(`mcs_marketing_audiences_${selectedEmpresaId}`);
      if (stored) {
        try {
          const userPresets = JSON.parse(stored);
          const defaultIds = new Set(defaultStrategicAudiences.map(d => d.id));
          const customOnly = userPresets.filter((up: any) => !defaultIds.has(up.id));
          setSavedAudiences([...defaultStrategicAudiences, ...customOnly]);
        } catch (e) {
          console.error("Failed to parse saved audiences:", e);
          setSavedAudiences(defaultStrategicAudiences);
        }
      } else {
        setSavedAudiences(defaultStrategicAudiences);
      }
    }
  }, [selectedEmpresaId, defaultStrategicAudiences]);

  const saveAudiencesToLocalStorage = (newAudiences: any[]) => {
    setSavedAudiences(newAudiences);
    if (selectedEmpresaId) {
      localStorage.setItem(`mcs_marketing_audiences_${selectedEmpresaId}`, JSON.stringify(newAudiences));
    }
  };

  // Form states - Templates
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    subject: '',
    html_content: '',
  });

  // Preview state - Templates
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Customizer state - Templates
  const [templateVisualFields, setTemplateVisualFields] = useState({
    primaryColor: '#061f3d',
    accentColor: '#f97316',
    bannerUrl: '',
    sellerName: 'Alex Archiles',
    sellerTitle: 'Comercial',
    sellerPhone: '645 56 74 01',
  });
  const [hasVisualConfig, setHasVisualConfig] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('visual');

  // Form states - Campaigns
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    template_id: '',
  });

  // Scheduling state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Handle Templates
  const handleOpenCreateTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateForm({ title: '', subject: '', html_content: '' });
    setHasVisualConfig(false);
    setActiveEditorTab('code');
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: any) => {
    setSelectedTemplateId(tmpl.id);
    let html = tmpl.html_content || '';
    
    // Parse config comment
    let config = parseTemplateConfig(html);
    
    // If no config found but it's our LoginPro template, initialize default config
    if (!config && html.includes("OFRECEMOS MANO DE OBRA CUALIFICADA")) {
      config = {
        primaryColor: '#061f3d',
        accentColor: '#f97316',
        bannerUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
        sellerName: 'Alex Archiles',
        sellerTitle: 'Comercial',
        sellerPhone: '645 56 74 01'
      };
      // Append config to HTML so it's tracked
      html = html + `\n<!-- TEMPLATE_CONFIG: ${JSON.stringify(config)} -->`;
    }
    
    setTemplateForm({
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: html,
    });
    
    if (config) {
      setTemplateVisualFields(config);
      setHasVisualConfig(true);
      setActiveEditorTab('visual');
    } else {
      setHasVisualConfig(false);
      setActiveEditorTab('code');
    }
    
    setIsTemplateModalOpen(true);
  };

  const handleOpenPreviewTemplate = (tmpl: any) => {
    setPreviewTemplate(tmpl);
    setPreviewMode('desktop');
    setIsPreviewOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title || !templateForm.subject || !templateForm.html_content) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    let finalHtml = templateForm.html_content;
    if (hasVisualConfig) {
      const oldConfig = parseTemplateConfig(finalHtml);
      if (oldConfig) {
        finalHtml = updateHtmlContent(finalHtml, oldConfig, templateVisualFields);
      }
    }

    try {
      if (selectedTemplateId) {
        await updateTemplate({ id: selectedTemplateId, payload: { ...templateForm, html_content: finalHtml } });
        toast.success('Template atualizado com sucesso!');
      } else {
        await createTemplate({ ...templateForm, html_content: finalHtml });
        toast.success('Novo template criado com sucesso!');
      }
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Deseja mesmo excluir este template?')) {
      try {
        await deleteTemplate(id);
        toast.success('Template excluído com sucesso.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir template');
      }
    }
  };

  // Handle Campaigns
  const handleOpenCreateCampaign = () => {
    setCampaignForm({ title: '', template_id: '' });
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.template_id) {
      toast.error('Defina o título da campanha e o template associado.');
      return;
    }

    try {
      await createCampaign(campaignForm);
      toast.success('Campanha em rascunho criada com sucesso!');
      setIsCampaignModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar campanha');
    }
  };

  const handleStartCampaignImmediate = async (campaignId: string) => {
    if (confirm('Deseja iniciar o disparo dessa campanha agora? Os e-mails serão agendados em fila de forma pausada.')) {
      try {
        await startCampaign({ campaignId });
        toast.success('Campanha iniciada! A fila de disparos começou a ser processada.');
        
        // Auto-invoke Edge Function to process queue immediately
        try {
          await supabase.functions.invoke('process-marketing-queue');
          queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
        } catch (e) {
          console.warn("Auto queue invoke warning:", e);
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro ao iniciar campanha');
      }
    }
  };

  // State: Tracking Queue & Errors Modal
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedCampaignForTracking, setSelectedCampaignForTracking] = useState<any | null>(null);
  const [trackingQueueItems, setTrackingQueueItems] = useState<any[]>([]);
  const [loadingTrackingQueue, setLoadingTrackingQueue] = useState(false);
  const [isRefreshingTracking, setIsRefreshingTracking] = useState(false);
  const [isTriggeringQueue, setIsTriggeringQueue] = useState(false);

  const fetchTrackingQueue = async (campaignId: string, isSilent = false) => {
    if (!isSilent) {
      setLoadingTrackingQueue(true);
    } else {
      setIsRefreshingTracking(true);
    }
    try {
      let allItems: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('marketing_campaign_queue')
          .select(`
            id,
            status,
            sent_at,
            error_message,
            created_at,
            leads:lead_id (
              id,
              name,
              email,
              company_name
            )
          `)
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allItems = [...allItems, ...data];
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      setTrackingQueueItems(allItems);
      refetchCampaignStats();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar o relatório de envios.');
    } finally {
      setLoadingTrackingQueue(false);
      setIsRefreshingTracking(false);
    }
  };

  const handleOpenTrackingModal = (camp: any) => {
    setSelectedCampaignForTracking(camp);
    setIsTrackModalOpen(true);
    fetchTrackingQueue(camp.id, false);
  };

  const handleTriggerQueueManually = async () => {
    setIsTriggeringQueue(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-marketing-queue');
      if (error) throw error;
      toast.success(data?.message || 'Fila de e-mails processada com sucesso!');
      if (selectedCampaignForTracking) {
        await fetchTrackingQueue(selectedCampaignForTracking.id, true);
        queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao processar fila de e-mails.');
    } finally {
      setIsTriggeringQueue(false);
    }
  };

  const handleOpenScheduleCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setScheduleDateTime('');
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !scheduleDateTime) return;

    try {
      await startCampaign({
        campaignId: selectedCampaignId,
        scheduledAt: new Date(scheduleDateTime).toISOString(),
      });
      toast.success('Campanha agendada com sucesso!');
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar campanha');
    }
  };

  const fetchAudienceLeads = async () => {
    setLoadingAudienceLeads(true);
    try {
      let allFetchedLeads: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .range(from, from + step - 1)
          .order('name', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          allFetchedLeads = [...allFetchedLeads, ...data];
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      setAllLeads(allFetchedLeads);

      const { data: queue, error: queueErr } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .select('lead_id, status');

      if (queueErr) throw queueErr;
      setAllQueuedLeads(queue || []);
    } catch (err: any) {
      toast.error('Erro ao carregar leads da empresa: ' + err.message);
    } finally {
      setLoadingAudienceLeads(false);
    }
  };

  // Handle Audience / Target Selector
  const handleOpenAudienceModal = async (campaignId: string) => {
    setSelectedCampaignIdForAudience(campaignId);
    setAudienceFilters({
      stageId: '',
      origin: '',
      intelligence: 'all',
      selectedCountries: [],
      selectedCompanySizes: [],
      selectedRegions: [],
      selectedProvinces: [],
      selectedSectors: [],
      selectedServices: [],
      sectorKeyword: '',
      cargoKeyword: '',
      provinceKeyword: '',
      tagKeyword: '',
      limit: '',
      offset: '',
    });
    setIsAudienceModalOpen(true);
    await fetchAudienceLeads();
  };

  const getFilteredLeads = () => {
    let filtered = allLeads.filter(l => {
      // 1. Filter by stage
      if (audienceFilters.stageId && l.stage_id !== audienceFilters.stageId) {
        return false;
      }

      // 2. Filter by origin
      if (audienceFilters.origin && l.origen_lead !== audienceFilters.origin) {
        return false;
      }

      // 3. Filter by Country (Multi-select)
      if (audienceFilters.selectedCountries && audienceFilters.selectedCountries.length > 0) {
        const leadCountry = detectLeadCountry(l);
        if (!audienceFilters.selectedCountries.includes(leadCountry)) {
          return false;
        }
      }

      // 4. Filter by Company Size Tier (Multi-select)
      if (audienceFilters.selectedCompanySizes && audienceFilters.selectedCompanySizes.length > 0) {
        const size = l.company_size || '';
        const inTags = Array.isArray(l.tags) && audienceFilters.selectedCompanySizes.some(s => l.tags.includes(s));
        const matchesSize = audienceFilters.selectedCompanySizes.includes(size) || inTags;
        if (!matchesSize) return false;
      }

      // 5. Filter by Region / Autonomous Community (Multi-select)
      if (audienceFilters.selectedRegions && audienceFilters.selectedRegions.length > 0) {
        const reg = l.region || '';
        const inTags = Array.isArray(l.tags) && audienceFilters.selectedRegions.some(r => l.tags.includes(r));
        const matchesReg = audienceFilters.selectedRegions.includes(reg) || inTags;
        if (!matchesReg) return false;
      }

      // 6. Filter by Province (Multi-select)
      if (audienceFilters.selectedProvinces && audienceFilters.selectedProvinces.length > 0) {
        const prov = l.province || '';
        if (!audienceFilters.selectedProvinces.includes(prov)) {
          return false;
        }
      }

      // 7. Filter by Selected Sectors (Multi-select)
      if (audienceFilters.selectedSectors && audienceFilters.selectedSectors.length > 0) {
        const hasSectorMatch = audienceFilters.selectedSectors.some(sec => {
          const sLower = sec.toLowerCase();
          const lSector = (l.sector || '').toLowerCase();
          const lCompany = (l.company_name || '').toLowerCase();
          const lNotes = (l.notes || '').toLowerCase();
          return lSector.includes(sLower) || lCompany.includes(sLower) || lNotes.includes(sLower);
        });
        if (!hasSectorMatch) return false;
      }

      // 8. Filter by Selected Services (Multi-select)
      if (audienceFilters.selectedServices && audienceFilters.selectedServices.length > 0) {
        const hasServiceMatch = audienceFilters.selectedServices.some(srv => {
          const sLower = srv.toLowerCase();
          const lService = (l.servicio_producto || '').toLowerCase();
          const lNotes = (l.notes || '').toLowerCase();
          const lCompany = (l.company_name || '').toLowerCase();
          return lService.includes(sLower) || lNotes.includes(sLower) || lCompany.includes(sLower);
        });
        if (!hasServiceMatch) return false;
      }

      // 9. Filter by Sector Keyword
      if (audienceFilters.sectorKeyword) {
        const keyword = audienceFilters.sectorKeyword.toLowerCase();
        const sectorText = (l.sector || '').toLowerCase();
        const serviceText = (l.servicio_producto || '').toLowerCase();
        const companyText = (l.company_name || '').toLowerCase();
        const notesText = (l.notes || '').toLowerCase();
        if (!sectorText.includes(keyword) && !serviceText.includes(keyword) && !companyText.includes(keyword) && !notesText.includes(keyword)) {
          return false;
        }
      }

      // 10. Filter by Cargo Keyword
      if (audienceFilters.cargoKeyword) {
        const keyword = audienceFilters.cargoKeyword.toLowerCase();
        const cargoText = (l.cargo || '').toLowerCase();
        const nameText = (l.name || '').toLowerCase();
        if (!cargoText.includes(keyword) && !nameText.includes(keyword)) {
          return false;
        }
      }

      // 11. Filter by Province/Location Keyword
      if (audienceFilters.provinceKeyword) {
        const keyword = audienceFilters.provinceKeyword.toLowerCase();
        const provinceText = (l.province || '').toLowerCase();
        const regionText = (l.region_id || '').toLowerCase();
        const cityText = (l.city || '').toLowerCase();
        if (!provinceText.includes(keyword) && !regionText.includes(keyword) && !cityText.includes(keyword)) {
          return false;
        }
      }

      // 12. Filter by Tag Keyword / Strategic Audience Tag
      if (audienceFilters.tagKeyword) {
        const keyword = audienceFilters.tagKeyword.toLowerCase();
        const hasTag = Array.isArray(l.tags) && l.tags.some(t => String(t).toLowerCase().includes(keyword));
        const inSector = (l.sector || '').toLowerCase().includes(keyword);
        const inNotes = (l.notes || '').toLowerCase().includes(keyword);
        const inSize = (l.company_size || '').toLowerCase().includes(keyword);
        if (!hasTag && !inSector && !inNotes && !inSize) {
          return false;
        }
      }

      // 13. Exclude Tag Keyword (e.g. Exclude 'Alex' for Michelle / Triangulo)
      if (audienceFilters.excludeTagKeyword) {
        const excludeKw = audienceFilters.excludeTagKeyword.toLowerCase();
        const hasTag = Array.isArray(l.tags) && l.tags.some(t => String(t).toLowerCase().includes(excludeKw));
        const inOrigin = (l.origen_lead || '').toLowerCase().includes(excludeKw);
        const inAssigned = l.assigned_to === 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
        if (hasTag || inOrigin || inAssigned) {
          return false;
        }
      }

      // 14. Exclude leads with proposal/budget sent or active negotiation
      if (audienceFilters.excludeProposals) {
        const stageName = (l.kanban_stages?.name || l.stage_name || '').toLowerCase();
        if (
          stageName.includes('orçamento') ||
          stageName.includes('presupuesto') ||
          stageName.includes('proposta') ||
          stageName.includes('negociação') ||
          stageName.includes('negociacion') ||
          stageName.includes('convertido') ||
          stageName.includes('ganho')
        ) {
          return false;
        }
      }

      // 15. Filter by intelligence rule
      if (audienceFilters.intelligence === 'never_sent') {
        const hasBeenSent = allQueuedLeads.some(q => q.lead_id === l.id);
        if (hasBeenSent) return false;
      }

      if (audienceFilters.intelligence === 'no_active') {
        const hasActiveCampaign = allQueuedLeads.some(q => 
          q.lead_id === l.id && (q.status === 'pending' || q.status === 'sending')
        );
        if (hasActiveCampaign) return false;
      }

      // Must have valid email address and not be opted out
      if (!l.email || !l.email.includes('@')) return false;
      const isOptedOut = (l.name || '').startsWith('[DESCADASTRADO]') || (l.notes || '').includes('[Opt-out]');
      return !isOptedOut;
    });

    // 13. Apply limit and offset (Division of audience for batching)
    const offsetVal = parseInt(audienceFilters.offset) || 0;
    const limitVal = parseInt(audienceFilters.limit);
    
    if (offsetVal > 0) {
      filtered = filtered.slice(offsetVal);
    }
    
    if (!isNaN(limitVal) && limitVal > 0) {
      filtered = filtered.slice(0, limitVal);
    }

    return filtered;
  };

  const getFilteredAndSearchedLeads = () => {
    const filtered = getFilteredLeads();
    if (!leadGridSearch) return filtered;
    const term = leadGridSearch.toLowerCase();
    return filtered.filter(l => 
      (l.name || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.company_name || '').toLowerCase().includes(term)
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const visibleFiltered = getFilteredAndSearchedLeads();
    const newSelected = new Set(selectedLeadIds);
    visibleFiltered.forEach(l => {
      if (checked) {
        newSelected.add(l.id);
      } else {
        newSelected.delete(l.id);
      }
    });
    setSelectedLeadIds(newSelected);
  };

  const handleToggleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeadIds);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  useEffect(() => {
    if ((isAudienceModalOpen || isNewAudienceDialogOpen) && allLeads.length > 0) {
      const filtered = getFilteredLeads();
      setSelectedLeadIds(new Set(filtered.map(l => l.id)));
      setGridPage(1);
      setLeadGridSearch('');
    }
  }, [
    isAudienceModalOpen,
    isNewAudienceDialogOpen,
    audienceFilters.stageId,
    audienceFilters.origin,
    audienceFilters.selectedSectors,
    audienceFilters.selectedServices,
    audienceFilters.sectorKeyword,
    audienceFilters.cargoKeyword,
    audienceFilters.provinceKeyword,
    audienceFilters.limit,
    audienceFilters.offset,
    audienceFilters.intelligence,
    allLeads
  ]);

  const handleSaveAudience = async () => {
    if (!selectedCampaignIdForAudience) return;
    setIsSavingAudience(true);

    try {
      const filteredLeads = allLeads.filter(l => selectedLeadIds.has(l.id));

      // If saving as a reusable audience preset
      if (shouldSaveAsPreset && audienceSaveName) {
        const newPreset = {
          id: crypto.randomUUID(),
          name: audienceSaveName,
          filters: { ...audienceFilters },
          created_at: new Date().toISOString()
        };
        const updated = [newPreset, ...savedAudiences];
        saveAudiencesToLocalStorage(updated);
        toast.success(`Público Salvo "${audienceSaveName}" criado com sucesso!`);
      }

      // Delete existing queue for this campaign
      const { error: deleteErr } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .delete()
        .eq('campaign_id', selectedCampaignIdForAudience);

      if (deleteErr) throw deleteErr;

      // Insert new queue items
      if (filteredLeads.length > 0) {
        const queueItems = filteredLeads.map(l => ({
          campaign_id: selectedCampaignIdForAudience,
          lead_id: l.id,
          status: 'pending',
        }));

        const { error: insertErr } = await supabase
          .schema('core_comercial')
          .from('marketing_campaign_queue')
          .insert(queueItems);

        if (insertErr) throw insertErr;
      }

      toast.success(`Público-alvo definido! ${filteredLeads.length} leads inseridos na fila.`);
      setIsAudienceModalOpen(false);
      setShouldSaveAsPreset(false);
      setAudienceSaveName('');
      refetchCampaignStats();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao definir público-alvo');
    } finally {
      setIsSavingAudience(false);
    }
  };

  const handleLoadAudiencePreset = (preset: any) => {
    setAudienceFilters({ ...preset.filters });
    toast.success(`Filtros do público "${preset.name}" carregados.`);
  };

  const handleDeleteAudiencePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja mesmo excluir este público salvo?')) {
      const updated = savedAudiences.filter(a => a.id !== id);
      saveAudiencesToLocalStorage(updated);
      toast.success('Público salvo excluído.');
    }
  };

  const handleCreateNewAudiencePreset = () => {
    if (!audienceSaveName) {
      toast.error('Preencha o nome do público.');
      return;
    }
    const filtered = getFilteredLeads();
    const count = selectedLeadIds.size > 0 ? selectedLeadIds.size : filtered.length;
    const leadIdsArray = selectedLeadIds.size > 0 
      ? Array.from(selectedLeadIds) 
      : filtered.map(l => l.id);

    const newPreset = {
      id: crypto.randomUUID(),
      name: audienceSaveName,
      filters: { ...audienceFilters },
      leadCount: count,
      leadIds: leadIdsArray,
      created_at: new Date().toISOString()
    };
    const updated = [newPreset, ...savedAudiences];
    saveAudiencesToLocalStorage(updated);
    toast.success(`Público Salvo "${audienceSaveName}" criado com sucesso (${count} leads)!`);
    setIsNewAudienceDialogOpen(false);
    setAudienceSaveName('');
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Deseja mesmo excluir esta campanha e sua fila associada?')) {
      try {
        await deleteCampaign(id);
        toast.success('Campanha excluída com sucesso.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir campanha');
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Rascunho</span>;
      case 'scheduled':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"><Clock size={12}/> Agendado</span>;
      case 'sending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit animate-pulse"><Play size={12}/> Enviando</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"><CheckCircle size={12}/> Concluído</span>;
      case 'paused':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Pausado</span>;
      default:
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{status}</span>;
    }
  };

  const visibleLeadsForGrid = getFilteredAndSearchedLeads();
  const leadsPerPage = 50;
  const totalPages = Math.ceil(visibleLeadsForGrid.length / leadsPerPage);
  const paginatedLeads = visibleLeadsForGrid.slice((gridPage - 1) * leadsPerPage, gridPage * leadsPerPage);

  return (
    <div className="flex flex-col space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8 text-yellow-500" />
            Campanhas de Marketing
          </h1>
          <p className="text-muted-foreground">
            Dispare e-mails HTML customizados e acompanhe o funil de e-mails em lote
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <EmpresaSelector />
          {activeTab === 'campaigns' && (
            <Button onClick={handleOpenCreateCampaign} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          )}
          {activeTab === 'templates' && (
            <Button onClick={handleOpenCreateTemplate} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
              <Plus className="mr-2 h-4 w-4" />
              Criar Template HTML
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-950 border p-1 rounded-xl w-fit">
          <TabsTrigger value="campaigns" className="rounded-lg">Campanhas</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg">Templates de E-mail</TabsTrigger>
          <TabsTrigger value="audiences" className="rounded-lg font-medium">Públicos / Segmentos</TabsTrigger>
        </TabsList>

        {/* Tab CAMPANHAS */}
        <TabsContent value="campaigns" className="mt-4">
          {loadingCampaigns ? (
            <div className="text-center py-20 text-muted-foreground">Carregando campanhas...</div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <Send className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold">Nenhuma campanha criada</p>
              <p className="text-sm">Clique em "Nova Campanha" para preparar o primeiro disparo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between min-h-[255px]">
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      {getStatusBadge(camp.status)}
                      <div className="flex gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteCampaign(camp.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate mb-1">{camp.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                      <FileText size={12} />
                      Template: <span className="font-medium truncate max-w-[150px]">{camp.marketing_templates?.title || 'Sem template'}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Calendar size={11} />
                      Criado em: {formatDate(camp.created_at)}
                    </p>
                    {camp.scheduled_at && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 mt-1 mb-2">
                        <Clock size={11} />
                        Agendado para: {formatDate(camp.scheduled_at)}
                      </p>
                    )}
                    
                    {/* Target Audience & Metrics status info */}
                    {(() => {
                      const stats = campaignStats[camp.id] || { total: 0, sent: 0, pending: 0, failed: 0 };
                      const percent = stats.total > 0 ? Math.min(100, Math.round((stats.sent / stats.total) * 100)) : 0;

                      return (
                        <div className="mt-3 border-t pt-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-medium">Público / Destinatários:</span>
                            {camp.status === 'draft' && stats.total === 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAudienceModal(camp.id)}
                                className="text-xs py-1 h-7 border-dashed border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                              >
                                Configurar público...
                              </Button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => camp.status === 'draft' ? handleOpenAudienceModal(camp.id) : handleOpenTrackingModal(camp)}
                                className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline flex items-center gap-1"
                              >
                                {stats.total} leads
                              </button>
                            )}
                          </div>

                          {/* Stats Chips */}
                          {stats.total > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex flex-wrap gap-1.5 text-[11px]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium">
                                  <CheckCircle2 size={11} className="text-emerald-500" />
                                  {stats.sent} enviados
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
                                  <Clock size={11} className="text-amber-500" />
                                  {stats.pending} na fila
                                </span>
                                {stats.failed > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-medium">
                                    <XCircle size={11} className="text-red-500" />
                                    {stats.failed} erros
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {(stats.sent > 0 || camp.status === 'sending' || camp.status === 'completed') && (
                                <div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
                                      style={{ width: `${percent}%` }} 
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                    <span>Progresso do Envio</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{percent}% ({stats.sent}/{stats.total})</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Campaign Actions */}
                  {camp.status === 'draft' ? (
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button 
                        size="sm" 
                        onClick={() => handleStartCampaignImmediate(camp.id)}
                        disabled={!campaignStats[camp.id]?.total}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                      >
                        <Play size={12} className="mr-1.5" />
                        Disparar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenScheduleCampaign(camp.id)}
                        disabled={!campaignStats[camp.id]?.total}
                        className="flex-1 border-slate-300 dark:border-slate-800"
                      >
                        <Clock size={12} className="mr-1.5" />
                        Agendar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenTrackingModal(camp)}
                        className="w-full border-slate-300 dark:border-slate-800 font-semibold text-xs"
                      >
                        <Eye size={13} className="mr-1.5 text-blue-500" />
                        Acompanhar Envios & Relatório
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab TEMPLATES */}
        <TabsContent value="templates" className="mt-4">
          {loadingTemplates ? (
            <div className="text-center py-20 text-muted-foreground">Carregando templates...</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <FileCode className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold">Nenhum template HTML cadastrado</p>
              <p className="text-sm">Clique em "Criar Template HTML" para colar códigos desenvolvidos no Canva.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between h-[180px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-slate-100 dark:bg-slate-950 border text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Code size={10} /> HTML
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <h3 
                      className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate mb-1 cursor-pointer hover:text-yellow-500 transition-colors"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                    >
                      {tmpl.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-2 truncate">
                      Assunto: <span className="font-medium text-slate-700 dark:text-slate-300">{tmpl.subject}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar size={11} />
                      Atualizado em: {formatDate(tmpl.updated_at || tmpl.created_at)}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t flex justify-between items-center">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenPreviewTemplate(tmpl)}
                      className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-350 font-semibold flex items-center gap-1.5"
                    >
                      <Eye size={13} /> Visualizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="text-yellow-500 hover:text-yellow-600 font-semibold"
                    >
                      Editar HTML
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab PÚBLICOS / SEGMENTOS */}
        <TabsContent value="audiences" className="mt-4">
          <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900 border rounded-xl p-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Segmentos e Públicos Reutilizáveis</h2>
              <p className="text-xs text-muted-foreground">Crie e gerencie públicos filtrados para disparos rápidos e organizados em lotes.</p>
            </div>
            <Button 
              onClick={async () => {
                // Fetch leads to preview
                setLoadingAudienceLeads(true);
                setIsNewAudienceDialogOpen(true);
                setAudienceFilters({
                  stageId: '',
                  origin: '',
                  intelligence: 'all',
                  sectorKeyword: '',
                  cargoKeyword: '',
                  provinceKeyword: '',
                  limit: '',
                  offset: '',
                });
                try {
                  let allFetchedLeads: any[] = [];
                  let from = 0;
                  const step = 1000;
                  let hasMore = true;

                  while (hasMore) {
                    const { data, error } = await supabase
                      .schema('core_comercial')
                      .from('leads')
                      .select('*')
                      .range(from, from + step - 1)
                      .order('name', { ascending: true });

                    if (error) throw error;

                    if (data && data.length > 0) {
                      allFetchedLeads = [...allFetchedLeads, ...data];
                      from += step;
                      if (data.length < step) hasMore = false;
                    } else {
                      hasMore = false;
                    }
                  }

                  setAllLeads(allFetchedLeads);
                } catch(e) {}
                setLoadingAudienceLeads(false);
              }} 
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Público Salvo
            </Button>
          </div>

          {savedAudiences.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <Users className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold text-slate-900 dark:text-slate-100">Nenhum público salvo</p>
              <p className="text-xs text-slate-550 max-w-[320px] text-center mt-1">Crie públicos reutilizáveis filtrando setores (ex: Caldeirarias), cidades (ex: Sevilha), ou limitando a quantidade para disparos fracionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedAudiences.map((aud) => {
                return (
                  <div key={aud.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between min-h-[200px]">
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                            SEGMENTO
                          </span>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                            {aud.leadCount !== undefined ? `${aud.leadCount} leads` : (aud.leadIds ? `${aud.leadIds.length} leads` : 'Leads Ativos')}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={(e) => handleDeleteAudiencePreset(aud.id, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate mb-1">
                        {aud.name}
                      </h3>
                      
                      <div className="text-[11px] text-slate-500 space-y-1 mt-2.5 border-t pt-2">
                        {aud.filters?.selectedSectors && aud.filters.selectedSectors.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-semibold text-slate-600">Setores:</span>
                            {aud.filters.selectedSectors.map((s: string) => (
                              <span key={s} className="bg-amber-500/10 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-bold border border-amber-500/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {aud.filters?.selectedServices && aud.filters.selectedServices.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-semibold text-slate-600">Serviços:</span>
                            {aud.filters.selectedServices.map((s: string) => (
                              <span key={s} className="bg-blue-500/10 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-500/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {aud.filters?.sectorKeyword && (
                          <div>Busca Livre: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.sectorKeyword}"</strong></div>
                        )}
                        {aud.filters?.stageId && (
                          <div>Estágio Kanban: <strong className="text-slate-700 dark:text-slate-350">Filtrado por Etapa</strong></div>
                        )}
                        {aud.filters?.provinceKeyword && (
                          <div>Cidade/Província: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.provinceKeyword}"</strong></div>
                        )}
                        {aud.filters?.origin && (
                          <div>Origem: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.origin}"</strong></div>
                        )}
                        {(aud.filters?.limit || aud.filters?.offset) && (
                          <div>Loteamento: <strong className="text-slate-700 dark:text-slate-350">Qtd: {aud.filters.limit || 'Sem Limite'} / Pular: {aud.filters.offset || '0'}</strong></div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex justify-between items-center">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          if (aud.filters) {
                            setAudienceFilters({ ...aud.filters });
                          }
                          setViewLeadsAudience(aud);
                          await fetchAudienceLeads();
                        }}
                        className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Eye size={14} /> Ver Leads
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setCampaignForm({ title: `Campanha - ${aud.name}`, template_id: '' });
                          if (aud.filters) {
                            setAudienceFilters({ ...aud.filters });
                          }
                          setIsCampaignModalOpen(true);
                          toast.success(`Defina o template. O público "${aud.name}" foi pré-carregado!`);
                        }}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 text-xs font-bold"
                      >
                        Nova Campanha
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col justify-between">
          <DialogHeader>
            <DialogTitle>{selectedTemplateId ? 'Editar Template de E-mail' : 'Criar Template HTML'}</DialogTitle>
            <DialogDescription>
              Cole o HTML bruto do Canva, Stripo ou editor próprio. Use as tags dinâmicas para personalizar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 overflow-y-auto pr-1 flex-1 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tmplTitle">Título Interno</Label>
                <Input
                  id="tmplTitle"
                  placeholder="Ex: Apresentação Mastercorp 2026"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmplSubject">Assunto do E-mail</Label>
                <Input
                  id="tmplSubject"
                  placeholder="Ex: Oportunidade comercial para a {{company_name}}"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>
            </div>

            {/* Caixa Informativa sobre Placeholders */}
            <div className="bg-slate-50 dark:bg-slate-900 border p-3 rounded-lg flex gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Info size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Tags de Personalização Disponíveis:</p>
                <p>Use `{"{{name}}"}` para o contato, `{"{{company_name}}"}` para a empresa, e `{"{{email}}"}` ou `{"{{phone}}"}` para os dados cadastrais. Elas serão trocadas automaticamente antes de disparar.</p>
              </div>
            </div>

            {hasVisualConfig ? (
              <Tabs value={activeEditorTab} onValueChange={setActiveEditorTab} className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-0.5 rounded-lg w-fit mb-3">
                  <TabsTrigger value="visual" className="rounded-md text-xs py-1">Customizador Visual (Fácil)</TabsTrigger>
                  <TabsTrigger value="code" className="rounded-md text-xs py-1">Código HTML</TabsTrigger>
                </TabsList>
                
                <TabsContent value="visual" className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="visBanner">URL da Imagem do Banner (Soldador)</Label>
                      <Input
                        id="visBanner"
                        placeholder="Cole a URL da imagem pública..."
                        value={templateVisualFields.bannerUrl}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, bannerUrl: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="visPrimaryColor">Cor Header/Footer</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="visPrimaryColor"
                            type="color"
                            className="w-10 h-9 p-0.5 border cursor-pointer shrink-0"
                            value={templateVisualFields.primaryColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, primaryColor: e.target.value })}
                          />
                          <Input
                            type="text"
                            className="flex-1 text-xs h-9"
                            value={templateVisualFields.primaryColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, primaryColor: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="visAccentColor">Cor de Destaque</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="visAccentColor"
                            type="color"
                            className="w-10 h-9 p-0.5 border cursor-pointer shrink-0"
                            value={templateVisualFields.accentColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, accentColor: e.target.value })}
                          />
                          <Input
                            type="text"
                            className="flex-1 text-xs h-9"
                            value={templateVisualFields.accentColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, accentColor: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="visSellerName">Nome do Vendedor</Label>
                      <Input
                        id="visSellerName"
                        value={templateVisualFields.sellerName}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="visSellerTitle">Cargo / Título</Label>
                      <Input
                        id="visSellerTitle"
                        value={templateVisualFields.sellerTitle}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <Label htmlFor="visSellerPhone">Telefone de Contato</Label>
                      <Input
                        id="visSellerPhone"
                        value={templateVisualFields.sellerPhone}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-1.5 flex flex-col h-[280px]">
                  <Label htmlFor="tmplHtml">Código HTML do Template</Label>
                  <Textarea
                    id="tmplHtml"
                    className="font-mono text-xs flex-1 resize-none"
                    placeholder="<html>...</html>"
                    value={templateForm.html_content}
                    onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-1.5 flex flex-col h-[280px]">
                <Label htmlFor="tmplHtml">Código HTML do Template</Label>
                <Textarea
                  id="tmplHtml"
                  placeholder="<html><body><h1>Olá {{name}}...</h1></body></html>"
                  className="font-mono text-xs flex-1 resize-none"
                  value={templateForm.html_content}
                  onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Salvar Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha de E-mail</DialogTitle>
            <DialogDescription>
              Selecione o template de marketing cadastrado para criar um rascunho de campanha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campTitle">Título da Campanha</Label>
              <Input
                id="campTitle"
                placeholder="Ex: Campanha Junho / Lojas de Varejo"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campTemplate">Template HTML Associado</Label>
              <select
                id="campTemplate"
                className="w-full border rounded-md p-2 text-sm bg-card"
                value={campaignForm.template_id}
                onChange={(e) => setCampaignForm({ ...campaignForm, template_id: e.target.value })}
              >
                <option value="">Selecione um template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Criar Rascunho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agendar Disparo de Campanha</DialogTitle>
            <DialogDescription>
              Defina a data e hora em que a campanha será ativada para iniciar o envio pausado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduleDate">Data e Hora de Disparo</Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex justify-between items-center mr-6">
              <div>
                <DialogTitle>Visualização do Template</DialogTitle>
                <DialogDescription>
                  Visualização em tempo real de como o e-mail será recebido pelo cliente.
                </DialogDescription>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 border rounded-lg p-0.5">
                <Button
                  type="button"
                  variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="text-xs py-1 h-7 rounded-md px-3 font-semibold"
                >
                  Desktop
                </Button>
                <Button
                  type="button"
                  variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="text-xs py-1 h-7 rounded-md px-3 font-semibold"
                >
                  Mobile
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 py-4 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border p-2 overflow-hidden">
            {previewTemplate ? (
              <div 
                className="transition-all duration-300 border rounded-xl shadow-lg bg-white dark:bg-white overflow-hidden flex flex-col"
                style={{ width: previewMode === 'mobile' ? '375px' : '100%', height: '55vh' }}
              >
                {/* Simulated email header */}
                <div className="bg-slate-50 border-b p-3 text-xs text-slate-500 space-y-1">
                  <div><strong>Assunto:</strong> <span className="text-slate-800">{previewTemplate.subject}</span></div>
                  <div><strong>De:</strong> <span className="text-slate-800">{activeSenderName} &lt;{activeSenderEmail}&gt;</span></div>
                </div>
                <iframe 
                  srcDoc={(() => {
                    let html = previewTemplate.html_content;
                    const testFormUrl = `${window.location.origin}/public/novo-lead?empresa_id=${selectedEmpresaId || ''}`;
                    const testPresupuestoUrl = `${window.location.origin}/public/solicitar-presupuesto?empresa_id=${selectedEmpresaId || ''}`;
                    const testOptOutUrl = `${window.location.origin}/public/coleta-dados/exemplo?opt_out=1`;
                    html = html
                      .replace(/\{\{\s*name\s*\}\}/g, "Cliente Exemplo")
                      .replace(/\{\{\s*company_name\s*\}\}/g, "Empresa Exemplo Ltda")
                      .replace(/\{\{\s*email\s*\}\}/g, "cliente@exemplo.com")
                      .replace(/\{\{\s*phone\s*\}\}/g, "+351 912 345 678")
                      .replace(/\{\{\s*form_url\s*\}\}/g, testFormUrl)
                      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, testPresupuestoUrl)
                      .replace(/\{\{\s*opt_out_url\s*\}\}/g, testOptOutUrl)
                      .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, testOptOutUrl)
                      .replace(/\*\|UNSUB\|\*/gi, testOptOutUrl)
                      .replace(/\*\|UNSUBSCRIBE\|\*/gi, testOptOutUrl)
                      .replace(/%UNSUBSCRIBE_URL%/gi, testOptOutUrl)
                      .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${window.location.origin}/public/whatsapp`);
                    return html;
                  })()} 
                  title="Preview" 
                  className="w-full flex-1 border-0"
                />
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">Nenhum template selecionado</div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Audience Dialog */}
      <Dialog open={isAudienceModalOpen} onOpenChange={setIsAudienceModalOpen}>
        <DialogContent className="w-[96vw] max-w-[1480px] h-[92vh] max-h-[92vh] flex flex-col justify-between p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b pb-2">
            <DialogTitle>Configurar Público-Alvo da Campanha</DialogTitle>
            <DialogDescription>
              Filtre e selecione exatamente quais leads receberão os e-mails desta campanha.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-20 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Carregando leads da empresa...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden flex-1 py-3 text-sm min-h-0">
              
              {/* Left Column: Filtros de Segmentação (col-span-5) */}
              <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-4 lg:border-r h-full scrollbar-thin">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Filtros Gerais</h3>
                </div>

                {/* Carregamento de Presets */}
                {savedAudiences.length > 0 && (
                  <div className="space-y-1.5 border-b pb-3">
                    <Label className="font-semibold text-slate-700 dark:text-slate-350 text-xs">Carregar Público Salvo (Preset)</Label>
                    <select
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                      onChange={(e) => {
                        const preset = savedAudiences.find(a => a.id === e.target.value);
                        if (preset) handleLoadAudiencePreset(preset);
                      }}
                      defaultValue=""
                    >
                      <option value="">Selecione um público salvo...</option>
                      {savedAudiences.map((aud: any) => (
                        <option key={aud.id} value={aud.id}>{aud.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live Stats Summary Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between text-xs mb-3 shadow-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total da Base</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{allLeads.length} leads</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">No Filtro Atual</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{visibleLeadsForGrid.length} elegíveis</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Selecionados</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{selectedLeadIds.size} destinatários</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audStage" className="text-xs">Estágio (Kanban)</Label>
                    <select
                      id="audStage"
                      value={audienceFilters.stageId}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, stageId: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todos os Estágios</option>
                      {kanbanStages.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audOrigin" className="text-xs">Origem</Label>
                    <select
                      id="audOrigin"
                      value={audienceFilters.origin}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, origin: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todas as Origens</option>
                      {Array.from(new Set(allLeads.map(l => l.origen_lead).filter(Boolean))).map((origin: any) => (
                        <option key={origin} value={origin}>
                          {origin}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filtros Geográficos e Porte */}
                <div className="space-y-3 border-t pt-3">
                  <MultiSelectCombobox
                    label="País (Multiseleção)"
                    options={dynamicCountryOptions}
                    selectedValues={audienceFilters.selectedCountries}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCountries: vals })}
                    placeholder="Selecione países (ex: Espanha, Portugal)..."
                  />

                  <MultiSelectCombobox
                    label="Porte da Empresa (Multiseleção)"
                    options={dynamicCompanySizeOptions}
                    selectedValues={audienceFilters.selectedCompanySizes}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCompanySizes: vals })}
                    placeholder="Selecione portes (ex: Tier 1, Tier 2, Tier 3)..."
                  />

                  <MultiSelectCombobox
                    label="Região / Comunidade Autônoma (Multiseleção)"
                    options={dynamicRegionOptions}
                    selectedValues={audienceFilters.selectedRegions}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedRegions: vals })}
                    placeholder="Selecione regiões (ex: Cataluña, Madrid, País Vasco)..."
                  />

                  <MultiSelectCombobox
                    label="Província (Multiseleção)"
                    options={dynamicProvinceOptions}
                    selectedValues={audienceFilters.selectedProvinces}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedProvinces: vals })}
                    placeholder="Selecione províncias (ex: Barcelona, Madrid, Valencia)..."
                  />
                </div>

                {/* Multi-Select Comboboxes para Setor e Serviço */}
                <div className="space-y-3 border-t pt-3">
                  <MultiSelectCombobox
                    label="Setores da Empresa (Multiseleção)"
                    options={dynamicSectorOptions}
                    selectedValues={audienceFilters.selectedSectors}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedSectors: vals })}
                    placeholder="Selecione um ou mais setores (ex: CALDEREREIA, TALLERES)..."
                  />

                  <MultiSelectCombobox
                    label="Serviços / Produtos de Interesse (Multiseleção)"
                    options={dynamicServiceOptions}
                    selectedValues={audienceFilters.selectedServices}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedServices: vals })}
                    placeholder="Selecione um ou mais serviços..."
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="audSectorKeyword" className="text-xs">Palavra-Chave (Busca Livre em Textos/Notas)</Label>
                    <Input
                      id="audSectorKeyword"
                      placeholder="Ex: caldeiraria, soldador..."
                      className="h-9 text-xs"
                      value={audienceFilters.sectorKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, sectorKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audCargo" className="text-xs">Cargo / Contato</Label>
                    <Input
                      id="audCargo"
                      placeholder="Ex: diretor, compras..."
                      className="h-9 text-xs"
                      value={audienceFilters.cargoKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, cargoKeyword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audProvince" className="text-xs">Cidade / Termo Livre</Label>
                    <Input
                      id="audProvince"
                      placeholder="Ex: Sevilha, Madrid..."
                      className="h-9 text-xs"
                      value={audienceFilters.provinceKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, provinceKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audLimit" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Limite Máximo</Label>
                    <Input
                      id="audLimit"
                      type="number"
                      placeholder="Ex: 500"
                      className="h-9 text-xs"
                      value={audienceFilters.limit}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, limit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audOffset" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Pular (Offset)</Label>
                    <Input
                      id="audOffset"
                      type="number"
                      placeholder="Ex: 0"
                      className="h-9 text-xs"
                      value={audienceFilters.offset}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, offset: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 border-t pt-3">
                  <Label htmlFor="audIntel" className="text-xs">Filtro Antispam / Frequência</Label>
                  <select
                    id="audIntel"
                    value={audienceFilters.intelligence}
                    onChange={(e) => setAudienceFilters({ ...audienceFilters, intelligence: e.target.value })}
                    className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                  >
                    <option value="all">Enviar para todos que atendem aos filtros</option>
                    <option value="never_sent">Apenas quem NUNCA recebeu campanha</option>
                    <option value="no_active">Apenas quem não tem campanhas ativas</option>
                  </select>
                </div>

                {/* Salvar como preset */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveAsPreset"
                      checked={shouldSaveAsPreset}
                      onChange={(e) => setShouldSaveAsPreset(e.target.checked)}
                      className="rounded border-slate-350 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4"
                    />
                    <Label htmlFor="saveAsPreset" className="cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-300">Salvar como Público Reutilizável</Label>
                  </div>
                  {shouldSaveAsPreset && (
                    <div className="space-y-1.5 pl-6">
                      <Label htmlFor="saveName" className="text-[10px]">Nome do Público Salvo</Label>
                      <Input
                        id="saveName"
                        placeholder="Ex: Caldeirarias - Lote 1"
                        className="h-8 text-xs"
                        value={audienceSaveName}
                        onChange={(e) => setAudienceSaveName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Galeria e Seleção de Leads (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden h-full pl-2">
                <div className="mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Destinatários Selecionados</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pesquisar por nome, empresa ou e-mail na lista..."
                      className="h-9 text-xs"
                      value={leadGridSearch}
                      onChange={(e) => {
                        setLeadGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="selAllLeads"
                      checked={visibleLeadsForGrid.length > 0 && visibleLeadsForGrid.every(l => selectedLeadIds.has(l.id))}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="selAllLeads" className="font-semibold cursor-pointer text-slate-700 dark:text-slate-300">Selecionar Todos do Filtro</Label>
                  </div>
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {selectedLeadIds.size} selecionados
                  </span>
                </div>

                {/* Lista de Leads */}
                <div className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 bg-slate-50/40 dark:bg-slate-950/20 scrollbar-thin">
                  {paginatedLeads.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-xs">Nenhum lead encontrado com estes filtros.</div>
                  ) : (
                    paginatedLeads.map((l: any) => {
                      const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                      const cCode = detectLeadCountry(l);
                      const cInfo = countryLabels[cCode] || countryLabels.ES;
                      const cleanName = l.company_name || l.name || 'Empresa Industrial';
                      const isTier1 = (l.company_size || '').includes('Tier 1');
                      const isTier2 = (l.company_size || '').includes('Tier 2');

                      return (
                        <div key={l.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs hover:border-amber-500/40 hover:bg-amber-500/[0.02] transition-colors gap-2">
                          <div className="flex items-center gap-3 truncate max-w-[340px]">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(l.id)}
                              onChange={(e) => handleToggleSelectLead(l.id, e.target.checked)}
                              className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer shrink-0"
                            />
                            <div className="truncate space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold truncate text-slate-900 dark:text-slate-100">{cleanName}</span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <span>{cInfo.flag}</span>
                                  <span>{cCode}</span>
                                </span>
                                {l.company_size && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    isTier1 ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300' :
                                    isTier2 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                                  }`}>
                                    {isTier1 ? '🏢 Tier 1' : isTier2 ? '🏭 Tier 2' : '⚙️ Tier 3'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{l.email}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 border font-medium">
                              {stageName}
                            </span>
                            {(l.city || l.province || l.region) && (
                              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span>{[l.city, l.province].filter(Boolean).join(' • ') || l.region}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-3 border-t pt-2.5 bg-background">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === 1}
                      onClick={() => setGridPage(p => Math.max(1, p - 1))}
                      className="h-8 text-xs py-1"
                    >
                      Anterior
                    </Button>
                    <span className="text-[11px] text-slate-500 font-medium">Página {gridPage} de {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === totalPages}
                      onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs py-1"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAudienceModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveAudience} 
              disabled={loadingAudienceLeads || isSavingAudience || selectedLeadIds.size === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              {isSavingAudience ? 'Salvando...' : 'Salvar Público'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Público Reutilizável (Sem Campanha Associada) */}
      <Dialog open={isNewAudienceDialogOpen} onOpenChange={setIsNewAudienceDialogOpen}>
        <DialogContent className="w-[96vw] max-w-[1480px] h-[92vh] max-h-[92vh] flex flex-col justify-between p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b pb-2">
            <DialogTitle>Criar Novo Público Salvo</DialogTitle>
            <DialogDescription>
              Filtre e selecione os leads que farão parte deste segmento reutilizável.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-20 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Carregando leads da empresa...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden flex-1 py-3 text-sm min-h-0">
              
              {/* Left Column: Filtros de Segmentação (col-span-5) */}
              <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-4 lg:border-r h-full scrollbar-thin">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Filtros Gerais</h3>
                </div>

                {/* Live Stats Summary Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between text-xs mb-3 shadow-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total da Base</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{allLeads.length} leads</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">No Filtro Atual</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{visibleLeadsForGrid.length} elegíveis</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Selecionados</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{selectedLeadIds.size} membros</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newAudSaveName" className="text-xs font-semibold">Nome do Público Salvo</Label>
                  <Input
                    id="newAudSaveName"
                    placeholder="Ex: Caldeirarias da Espanha - Lote 1"
                    className="h-9 text-xs"
                    value={audienceSaveName}
                    onChange={(e) => setAudienceSaveName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudStage" className="text-xs">Estágio (Kanban)</Label>
                    <select
                      id="newAudStage"
                      value={audienceFilters.stageId}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, stageId: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todos os Estágios</option>
                      {kanbanStages.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudOrigin" className="text-xs">Origem</Label>
                    <select
                      id="newAudOrigin"
                      value={audienceFilters.origin}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, origin: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todas as Origens</option>
                      {Array.from(new Set(allLeads.map(l => l.origen_lead).filter(Boolean))).map((origin: any) => (
                        <option key={origin} value={origin}>
                          {origin}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filtros Geográficos e Porte */}
                <div className="space-y-3 border-t pt-3">
                  <MultiSelectCombobox
                    label="País (Multiseleção)"
                    options={dynamicCountryOptions}
                    selectedValues={audienceFilters.selectedCountries}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCountries: vals })}
                    placeholder="Selecione países (ex: Espanha, Portugal)..."
                  />

                  <MultiSelectCombobox
                    label="Porte da Empresa (Multiseleção)"
                    options={dynamicCompanySizeOptions}
                    selectedValues={audienceFilters.selectedCompanySizes}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCompanySizes: vals })}
                    placeholder="Selecione portes (ex: Tier 1, Tier 2, Tier 3)..."
                  />

                  <MultiSelectCombobox
                    label="Região / Comunidade Autônoma (Multiseleção)"
                    options={dynamicRegionOptions}
                    selectedValues={audienceFilters.selectedRegions}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedRegions: vals })}
                    placeholder="Selecione regiões (ex: Cataluña, Madrid, País Vasco)..."
                  />

                  <MultiSelectCombobox
                    label="Província (Multiseleção)"
                    options={dynamicProvinceOptions}
                    selectedValues={audienceFilters.selectedProvinces}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedProvinces: vals })}
                    placeholder="Selecione províncias (ex: Barcelona, Madrid, Valencia)..."
                  />
                </div>

                {/* Multi-Select Comboboxes para Setor e Serviço em Novo Público Salvo */}
                <div className="space-y-3 border-t pt-3">
                  <MultiSelectCombobox
                    label="Setores da Empresa (Multiseleção)"
                    options={dynamicSectorOptions}
                    selectedValues={audienceFilters.selectedSectors}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedSectors: vals })}
                    placeholder="Selecione um ou mais setores (ex: CALDEREREIA, TALLERES)..."
                  />

                  <MultiSelectCombobox
                    label="Serviços / Produtos de Interesse (Multiseleção)"
                    options={dynamicServiceOptions}
                    selectedValues={audienceFilters.selectedServices}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedServices: vals })}
                    placeholder="Selecione um ou mais serviços..."
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudSector" className="text-xs">Palavra-Chave (Busca Livre em Textos/Notas)</Label>
                    <Input
                      id="newAudSector"
                      placeholder="Ex: caldeiraria, soldador, metal..."
                      className="h-9 text-xs"
                      value={audienceFilters.sectorKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, sectorKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudCargo" className="text-xs">Cargo / Contato</Label>
                    <Input
                      id="newAudCargo"
                      placeholder="Ex: diretor, compras..."
                      className="h-9 text-xs"
                      value={audienceFilters.cargoKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, cargoKeyword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudProvince" className="text-xs">Cidade / Termo Livre</Label>
                    <Input
                      id="newAudProvince"
                      placeholder="Ex: Sevilha, Madrid..."
                      className="h-9 text-xs"
                      value={audienceFilters.provinceKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, provinceKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudLimit" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Limite Máximo</Label>
                    <Input
                      id="newAudLimit"
                      type="number"
                      placeholder="Ex: 500"
                      className="h-9 text-xs"
                      value={audienceFilters.limit}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, limit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudOffset" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Pular (Offset)</Label>
                    <Input
                      id="newAudOffset"
                      type="number"
                      placeholder="Ex: 0"
                      className="h-9 text-xs"
                      value={audienceFilters.offset}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, offset: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Galeria e Seleção de Leads (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden h-full pl-2">
                <div className="mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Membros do Segmento</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pesquisar por nome, empresa ou e-mail na lista..."
                      className="h-9 text-xs"
                      value={leadGridSearch}
                      onChange={(e) => {
                        setLeadGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newSelAllLeads"
                      checked={visibleLeadsForGrid.length > 0 && visibleLeadsForGrid.every(l => selectedLeadIds.has(l.id))}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="newSelAllLeads" className="font-semibold cursor-pointer text-slate-700 dark:text-slate-300">Selecionar Todos do Filtro</Label>
                  </div>
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {selectedLeadIds.size} selecionados
                  </span>
                </div>

                {/* Lista de Leads */}
                <div className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 bg-slate-50/40 dark:bg-slate-950/20 scrollbar-thin">
                  {paginatedLeads.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-xs">Nenhum lead encontrado com estes filtros.</div>
                  ) : (
                    paginatedLeads.map((l: any) => {
                      const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                      const cCode = detectLeadCountry(l);
                      const cInfo = countryLabels[cCode] || countryLabels.ES;
                      const cleanName = l.company_name || l.name || 'Empresa Industrial';
                      const isTier1 = (l.company_size || '').includes('Tier 1');
                      const isTier2 = (l.company_size || '').includes('Tier 2');

                      return (
                        <div key={l.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs hover:border-amber-500/40 hover:bg-amber-500/[0.02] transition-colors gap-2">
                          <div className="flex items-center gap-3 truncate max-w-[340px]">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(l.id)}
                              onChange={(e) => handleToggleSelectLead(l.id, e.target.checked)}
                              className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer shrink-0"
                            />
                            <div className="truncate space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold truncate text-slate-900 dark:text-slate-100">{cleanName}</span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <span>{cInfo.flag}</span>
                                  <span>{cCode}</span>
                                </span>
                                {l.company_size && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    isTier1 ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300' :
                                    isTier2 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                                  }`}>
                                    {isTier1 ? '🏢 Tier 1' : isTier2 ? '🏭 Tier 2' : '⚙️ Tier 3'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{l.email}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 border font-medium">
                              {stageName}
                            </span>
                            {(l.city || l.province || l.region) && (
                              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span>{[l.city, l.province].filter(Boolean).join(' • ') || l.region}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-3 border-t pt-2.5 bg-background">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === 1}
                      onClick={() => setGridPage(p => Math.max(1, p - 1))}
                      className="h-8 text-xs py-1"
                    >
                      Anterior
                    </Button>
                    <span className="text-[11px] text-slate-500 font-medium">Página {gridPage} de {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === totalPages}
                      onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs py-1"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsNewAudienceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateNewAudiencePreset} 
              disabled={loadingAudienceLeads || selectedLeadIds.size === 0 || !audienceSaveName}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              Criar Público Salvo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Visualizar Leads do Público */}
      <Dialog open={!!viewLeadsAudience} onOpenChange={(open) => !open && setViewLeadsAudience(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col justify-between p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>Membros do Público: {viewLeadsAudience?.name}</DialogTitle>
            <DialogDescription>
              Lista de todos os leads cadastrados no CRM que correspondem a este segmento.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-10 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Processando lista...
            </div>
          ) : (
            <div className="flex-1 py-4 overflow-y-auto space-y-2 max-h-[55vh] pr-1">
              <div className="flex justify-between items-center mb-3 bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 text-xs">
                <span>Total de membros:</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-500">{viewLeadsAudience ? getFilteredLeads().length : 0} leads</span>
              </div>
              
              {viewLeadsAudience && getFilteredLeads().length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">Nenhum lead correspondente no banco.</div>
              ) : (
                <div className="space-y-2">
                  {viewLeadsAudience && getFilteredLeads().map((l: any) => {
                    const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                    const cCode = detectLeadCountry(l);
                    const cInfo = countryLabels[cCode] || countryLabels.ES;
                    const cleanName = l.company_name || l.name || 'Empresa Industrial';
                    const isTier1 = (l.company_size || '').includes('Tier 1');
                    const isTier2 = (l.company_size || '').includes('Tier 2');

                    return (
                      <div key={l.id} className="p-3 border rounded-xl bg-white dark:bg-slate-900 text-xs flex justify-between items-center hover:border-amber-500/40 transition-colors gap-2">
                        <div className="truncate space-y-0.5 max-w-[380px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold truncate text-slate-900 dark:text-slate-100">{cleanName}</span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span>{cInfo.flag}</span>
                              <span>{cCode}</span>
                            </span>
                            {l.company_size && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                isTier1 ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300' :
                                isTier2 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                              }`}>
                                {isTier1 ? '🏢 Tier 1' : isTier2 ? '🏭 Tier 2' : '⚙️ Tier 3'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{l.email}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 border font-medium">
                            {stageName}
                          </span>
                          {(l.city || l.province || l.region) && (
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span>{[l.city, l.province].filter(Boolean).join(' • ') || l.region}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" onClick={() => setViewLeadsAudience(null)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Acompanhamento da Fila e Erros de Disparo */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Send className="h-5 w-5 text-yellow-500" />
                Relatório da Campanha: {selectedCampaignForTracking?.title}
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectedCampaignForTracking && fetchTrackingQueue(selectedCampaignForTracking.id, true)}
                disabled={loadingTrackingQueue || isRefreshingTracking}
                className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingTracking && "animate-spin text-yellow-500")} />
                {isRefreshingTracking ? "Atualizando..." : "Atualizar Relatório"}
              </Button>
            </div>
            <DialogDescription className="text-xs">
              Acompanhe em tempo real quais e-mails foram enviados, quais estão na fila e quais apresentaram erros no servidor.
            </DialogDescription>
          </DialogHeader>

          {loadingTrackingQueue ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Carregando relatório da fila...
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Summary KPIs */}
              {(() => {
                const sentCount = trackingQueueItems.filter(i => i.status === 'sent').length;
                const pendingCount = trackingQueueItems.filter(i => i.status === 'pending').length;
                const failedCount = trackingQueueItems.filter(i => i.status === 'failed').length;
                const total = trackingQueueItems.length;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Enviados com Sucesso</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{sentCount} <span className="text-xs font-normal text-emerald-500">/ {total}</span></p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Aguardando Envio (Fila)</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{pendingCount}</p>
                        </div>
                        <Clock className="h-8 w-8 text-amber-500 opacity-60" />
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Falhas / Erros de Envio</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">{failedCount}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-500 opacity-60" />
                      </div>
                    </div>

                    {/* Alert for failed items */}
                    {failedCount > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-0.5">Diagnóstico de Erros no Disparo:</p>
                          <p className="leading-relaxed">
                            Alguns e-mails falharam ao serem processados. Verifique a coluna "Detalhe do Erro" na tabela abaixo. Se a mensagem indicar <span className="font-mono bg-red-950/40 px-1 py-0.5 rounded text-[11px] text-red-300">domain not verified</span>, cadastre e verifique o domínio do remetente na sua conta da Resend.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action button to reprocess */}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Lista de Destinatários e Status dos Envios
                      </span>
                      <Button
                        size="sm"
                        onClick={handleTriggerQueueManually}
                        disabled={isTriggeringQueue}
                        className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold text-xs h-8"
                      >
                        {isTriggeringQueue ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Processando Fila...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Disparar / Reprocessar Fila Agora
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Table of Queue Items */}
                    <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b sticky top-0">
                          <tr>
                            <th className="p-3">Destinatário / Lead</th>
                            <th className="p-3">E-mail</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Detalhes / Data / Motivo do Erro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {trackingQueueItems.map((item: any) => {
                            const lead = item.leads;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                  {lead?.name || 'Lead s/ nome'}
                                  {lead?.company_name && (
                                    <span className="block text-[10px] text-slate-500">{lead.company_name}</span>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  {lead?.email || 'Sem e-mail'}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {item.status === 'sent' && (
                                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                      <CheckCircle2 size={11} /> Enviado
                                    </span>
                                  )}
                                  {item.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                      <Clock size={11} /> Na Fila
                                    </span>
                                  )}
                                  {item.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                      <XCircle size={11} /> Erro / Falha
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-[11px]">
                                  {item.status === 'sent' && (
                                    <span className="text-slate-500">
                                      Disparado em {formatDate(item.sent_at)}
                                    </span>
                                  )}
                                  {item.status === 'pending' && (
                                    <span className="text-slate-400 italic">
                                      Aguardando próximo lote de disparo...
                                    </span>
                                  )}
                                  {item.status === 'failed' && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-red-600 dark:text-red-400 font-mono text-[10px] break-all leading-tight">
                                      {item.error_message || 'Erro não detalhado pelo servidor.'}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" onClick={() => setIsTrackModalOpen(false)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
