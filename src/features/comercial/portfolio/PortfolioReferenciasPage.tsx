import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Award, 
  Search, 
  MapPin, 
  Building2, 
  Copy, 
  Download, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  RefreshCw,
  SlidersHorizontal,
  Share2,
  PhoneCall,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

interface ClientReference {
  id: string;
  codigo?: string;
  trade_name?: string;
  legal_name?: string;
  tax_id?: string;
  province?: string;
  city?: string;
  address_line?: string;
  postal_code?: string;
  notes?: string;
  financial_status?: string;
  functions_json?: any;
  zone: string;
  sectorDisplay: string;
  isRecommended: boolean;
  statusText: string;
}

const REGION_PRESETS = [
  { id: 'all', label: 'Todas as Regiões' },
  { id: 'norte', label: 'Zona Norte (Asturias, Cantabria, País Vasco, Cast. y León)' },
  { id: 'vizcaya', label: 'Bilbao / Bizkaia' },
  { id: 'alava', label: 'Vitoria-Gasteiz / Álava' },
  { id: 'cantabria', label: 'Cantabria (Santander / Torrelavega)' },
  { id: 'asturias', label: 'Asturias (Oviedo / Gijón / Avilés)' },
  { id: 'burgos', label: 'Burgos' },
  { id: 'leon', label: 'León' },
  { id: 'madrid_centro', label: 'Madrid & Centro' },
  { id: 'sur_andalucia', label: 'Andalucía & Sul' },
  { id: 'cataluna_levante', label: 'Cataluña & Levante' }
];

export function PortfolioReferenciasPage() {
  const [clients, setClients] = useState<ClientReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [onlyRecommended, setOnlyRecommended] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Blacklist/Custom excluded clients (in case some company had issues)
  const [customExcludedIds, setCustomExcludedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mcs_portfolio_excluded_clients');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleClientExclusion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Empresa reativada como apta para referência!');
      } else {
        next.add(id);
        // Also remove from selected if excluded
        setSelectedClientIds(s => {
          const sNext = new Set(s);
          sNext.delete(id);
          return sNext;
        });
        toast.warning('Empresa desmarcada como referência recomendada.');
      }
      localStorage.setItem('mcs_portfolio_excluded_clients', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('core_common')
        .from('clients')
        .select('*')
        .order('trade_name', { ascending: true });

      if (error) throw error;

      const list: ClientReference[] = (data || []).map((c: any) => {
        const combined = `${c.trade_name || ''} ${c.legal_name || ''} ${c.province || ''} ${c.city || ''} ${c.address_line || ''} ${c.postal_code || ''}`.toLowerCase();
        const pc = (c.postal_code || '').trim();

        // Zone detection
        let zone = 'Espanha / Outras Regiões';
        if (combined.includes('vitoria') || combined.includes('alava') || combined.includes('álava') || combined.includes('araba') || pc.startsWith('01')) {
          zone = 'VITORIA-GASTEIZ / ÁLAVA';
        } else if (combined.includes('bilbao') || combined.includes('vizcaya') || combined.includes('bizkaia') || pc.startsWith('48')) {
          zone = 'BILBAO / VIZCAYA (BIZKAIA)';
        } else if (combined.includes('cantabria') || combined.includes('santander') || combined.includes('torrelavega') || pc.startsWith('39')) {
          zone = 'CANTABRIA (SANTANDER / TORRELAVEGA)';
        } else if (combined.includes('burgos') || pc.startsWith('09')) {
          zone = 'BURGOS';
        } else if (combined.includes('leon') || combined.includes('león') || combined.includes('ponferrada') || pc.startsWith('24')) {
          zone = 'LEÓN';
        } else if (combined.includes('asturias') || combined.includes('gijon') || combined.includes('gijón') || combined.includes('oviedo') || combined.includes('aviles') || pc.startsWith('33')) {
          zone = 'ASTURIAS (OVIEDO / GIJÓN / AVILÉS)';
        } else if (combined.includes('madrid') || pc.startsWith('28')) {
          zone = 'MADRID & CENTRO';
        } else if (combined.includes('barcelona') || combined.includes('catalunya') || combined.includes('tarragona') || combined.includes('valencia') || pc.startsWith('08') || pc.startsWith('46')) {
          zone = 'CATALUÑA & LEVANTE';
        } else if (combined.includes('sevilla') || combined.includes('cordoba') || combined.includes('huelva') || combined.includes('cadiz') || pc.startsWith('41') || pc.startsWith('14')) {
          zone = 'ANDALUCÍA';
        }

        // Sector classification
        let sectorDisplay = 'Montaje Industrial & Mantenimiento';
        if (combined.includes('caldereria') || combined.includes('calderería')) {
          sectorDisplay = 'Calderería & Fabricación Pesada';
        } else if (combined.includes('tuberia') || combined.includes('tubería') || combined.includes('piping') || combined.includes('tubos')) {
          sectorDisplay = 'Piping & Montajes de Tubería Industrial';
        } else if (combined.includes('electric') || combined.includes('eléctric')) {
          sectorDisplay = 'Instalaciones & Cuadros Eléctricos';
        } else if (combined.includes('mecanic') || combined.includes('mecánic') || combined.includes('mecanizado')) {
          sectorDisplay = 'Mecanizado & Montajes de Precisión';
        } else if (combined.includes('clima') || combined.includes('calorifug') || combined.includes('ventil')) {
          sectorDisplay = 'Climatización & Calorifugado Industrial';
        } else if (combined.includes('naval') || combined.includes('maritim')) {
          sectorDisplay = 'Sector Naval & Estructuras Offshore';
        }

        // Healthy / Recommended detection
        const isBlocked = c.financial_status === 'blocked' || c.financial_status === 'inadimplente';
        const isExcluded = customExcludedIds.has(c.id);
        const isRecommended = !isBlocked && !isExcluded;

        return {
          id: c.id,
          codigo: c.codigo,
          trade_name: c.trade_name || c.legal_name || 'Cliente Industrial',
          legal_name: c.legal_name || c.trade_name,
          tax_id: c.tax_id,
          province: c.province,
          city: c.city,
          address_line: c.address_line,
          postal_code: c.postal_code,
          notes: c.notes,
          financial_status: c.financial_status,
          functions_json: c.functions_json,
          zone,
          sectorDisplay,
          isRecommended,
          statusText: isRecommended ? 'Apto / Referência Oficial' : 'Inativo / Não Recomendado'
        };
      });

      setClients(list);

      // Preselect recommended northern clients by default
      const defaultSelected = new Set<string>();
      list.forEach(c => {
        if (c.isRecommended && (c.zone.includes('BIZCAYA') || c.zone.includes('ÁLAVA') || c.zone.includes('CANTABRIA') || c.zone.includes('ASTURIAS') || c.zone.includes('BURGOS') || c.zone.includes('LEÓN'))) {
          defaultSelected.add(c.id);
        }
      });
      setSelectedClientIds(defaultSelected);
    } catch (err: any) {
      toast.error('Erro ao carregar lista de clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // 1. Recommended filter
      if (onlyRecommended && (!c.isRecommended || customExcludedIds.has(c.id))) {
        return false;
      }

      // 2. Region filter
      if (selectedRegion === 'norte') {
        const isNorth = c.zone.includes('BIZCAYA') || c.zone.includes('ÁLAVA') || c.zone.includes('CANTABRIA') || c.zone.includes('ASTURIAS') || c.zone.includes('BURGOS') || c.zone.includes('LEÓN');
        if (!isNorth) return false;
      } else if (selectedRegion === 'vizcaya') {
        if (!c.zone.includes('BIZCAYA')) return false;
      } else if (selectedRegion === 'alava') {
        if (!c.zone.includes('ÁLAVA')) return false;
      } else if (selectedRegion === 'cantabria') {
        if (!c.zone.includes('CANTABRIA')) return false;
      } else if (selectedRegion === 'asturias') {
        if (!c.zone.includes('ASTURIAS')) return false;
      } else if (selectedRegion === 'burgos') {
        if (!c.zone.includes('BURGOS')) return false;
      } else if (selectedRegion === 'leon') {
        if (!c.zone.includes('LEÓN')) return false;
      } else if (selectedRegion === 'madrid_centro') {
        if (!c.zone.includes('MADRID')) return false;
      } else if (selectedRegion === 'sur_andalucia') {
        if (!c.zone.includes('ANDALUCÍA')) return false;
      } else if (selectedRegion === 'cataluna_levante') {
        if (!c.zone.includes('CATALUÑA')) return false;
      }

      // 3. Search query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const searchTarget = `${c.trade_name} ${c.legal_name} ${c.city} ${c.province} ${c.address_line} ${c.zone} ${c.sectorDisplay}`.toLowerCase();
        if (!searchTarget.includes(q)) return false;
      }

      return true;
    });
  }, [clients, selectedRegion, onlyRecommended, searchTerm, customExcludedIds]);

  // Selected client objects
  const selectedClients = useMemo(() => {
    return clients.filter(c => selectedClientIds.has(c.id) && !customExcludedIds.has(c.id));
  }, [clients, selectedClientIds, customExcludedIds]);

  // Handle Multi-selection
  const handleSelectAll = () => {
    const next = new Set(selectedClientIds);
    filteredClients.forEach(c => {
      if (c.isRecommended) next.add(c.id);
    });
    setSelectedClientIds(next);
    toast.success(`${filteredClients.length} empresas selecionadas.`);
  };

  const handleDeselectAll = () => {
    setSelectedClientIds(new Set());
    toast.info('Seleção limpa.');
  };

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 1. Action: Copy Spanish text for WhatsApp / Teams / Email
  const handleCopySpanishText = () => {
    if (selectedClients.length === 0) {
      toast.warning('Selecione ao menos 1 empresa da lista para copiar.');
      return;
    }

    // Group selected clients by zone
    const byZone: Record<string, ClientReference[]> = {};
    selectedClients.forEach(c => {
      if (!byZone[c.zone]) byZone[c.zone] = [];
      byZone[c.zone].push(c);
    });

    let text = `*REFERENCIAS DE CLIENTES Y PROYECTOS INDUSTRIALES*\n`;
    text += `*LUMINOUS ALLEY, UNIPESSOAL LDA*\n\n`;
    text += `Estimado/a cliente,\n\n`;
    text += `Con el fin de acreditar nuestra solvencia técnica y experiencia operativa, a continuación le facilitamos una selección de empresas y clientes industriales con los que hemos colaborado y desarrollado proyectos en su zona:\n\n`;

    Object.keys(byZone).forEach(zone => {
      text += `📍 *${zone}*\n`;
      byZone[zone].forEach((c, idx) => {
        const cityPart = c.city ? ` (${c.city})` : (c.province ? ` (${c.province})` : '');
        text += `${idx + 1}. *${c.trade_name}*${cityPart} — _${c.sectorDisplay}_\n`;
      });
      text += `\n`;
    });

    text += `🛡️ *Garantía de Calidad & Solvencia:* Todas nuestras brigadas y operarios cuentan con homologaciones vigentes (ASME/ISO 9606), PRL y gestión integral de alojamiento y movilidad.\n\n`;
    text += `Quedamos a su disposición para coordinar cualquier detalle técnico.\n`;
    text += `📞 *Contacto Comercial:* +34 937 37 41 80 | comercial1@luminousalley.com`;

    navigator.clipboard.writeText(text);
    toast.success(`Texto com ${selectedClients.length} empresas copiado para a área de transferência!`);
  };

  // 2. Action: Generate Executive PDF Dossier
  const handleGeneratePdf = () => {
    if (selectedClients.length === 0) {
      toast.warning('Selecione ao menos 1 empresa para gerar o dossiê.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Background
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Accent line
    doc.setFillColor(245, 158, 11); // Amber-500
    doc.rect(0, 42, pageWidth, 2.5, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('LUMINOUS ALLEY · DOSSIER DE REFERENCIAS', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text('Acreditación de Solvencia Técnica & Proyectos Industriales en España', 15, 26);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')} | Ref: REF-LUM-${new Date().getFullYear()}`, 15, 34);

    let currentY = 56;

    // Intro statement
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Relación de Empresas y Proyectos Ejecutados:', 15, currentY);
    currentY += 8;

    // Group by zone
    const byZone: Record<string, ClientReference[]> = {};
    selectedClients.forEach(c => {
      if (!byZone[c.zone]) byZone[c.zone] = [];
      byZone[c.zone].push(c);
    });

    Object.keys(byZone).forEach(zone => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      // Zone Header
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(15, currentY - 4, pageWidth - 30, 8, 2, 2, 'F');
      
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`ZONA: ${zone}`, 18, currentY + 1.5);
      currentY += 9;

      byZone[zone].forEach((c, idx) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`${idx + 1}. ${c.trade_name}`, 20, currentY);

        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const loc = c.city || c.province || 'Nacional';
        doc.text(`Ubicación: ${loc}  |  Especialidad: ${c.sectorDisplay}`, 20, currentY + 4);

        currentY += 9;
      });

      currentY += 4;
    });

    // Quality Footer Box
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, pageWidth - 30, 32, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('🛡️ Compliance, Seguridad y Disponibilidad Operativa:', 20, currentY + 7);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('• Personal técnico homologado en soldadura (TIG, MIG-MAG, 6G), piping y montaje mecánico.', 20, currentY + 14);
    doc.text('• Gestión 100% integral de alojamientos, dietas, PRL, EPIs certificados y vehículos de obra.', 20, currentY + 20);
    doc.text('• Contacto Comercial: +34 937 37 41 80 | comercial1@luminousalley.com | www.luminousalley.com', 20, currentY + 26);

    doc.save(`LUMINOUS_Dossier_Referencias_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('Dossiê Executivo em PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Portfólio & Referências de Clientes
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Prova de Autoridade B2B
                </span>
              </h1>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Consulte empresas atendidas por região, filtre referências ativas e gere dossiês executivos para apoiar o Alex nas negociações.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <Button 
            onClick={fetchClients} 
            variant="outline" 
            size="sm" 
            disabled={loading}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button 
            onClick={handleCopySpanishText} 
            variant="outline"
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            Copiar Texto ({selectedClients.length})
          </Button>

          <Button 
            onClick={handleGeneratePdf} 
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Gerar Dossiê PDF ({selectedClients.length})
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa, cidade, província ou setor..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Region Selector */}
          <div className="md:col-span-4">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              {REGION_PRESETS.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Only Recommended Toggle */}
          <div className="md:col-span-3 flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border rounded-lg">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Apenas Aptos / Recomendados
            </label>
            <input 
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Selection Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <span>Mostrando: <strong className="text-slate-900 dark:text-slate-100">{filteredClients.length}</strong> empresas</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {selectedClients.length} selecionadas para dossiê
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleSelectAll} className="h-7 text-xs font-medium">
              <CheckSquare className="mr-1 h-3.5 w-3.5" /> Selecionar Todos Filtrados
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDeselectAll} className="h-7 text-xs font-medium text-slate-500">
              <Square className="mr-1 h-3.5 w-3.5" /> Limpar Seleção
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Client References */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border rounded-2xl">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Carregando portfólio de clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl space-y-2">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Nenhum cliente encontrado com os filtros aplicados</h3>
          <p className="text-xs text-slate-500">Tente buscar por outro termo ou alterar a região selecionada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isSelected = selectedClientIds.has(client.id);
            const isExcluded = customExcludedIds.has(client.id);

            return (
              <div 
                key={client.id}
                onClick={() => toggleSelectClient(client.id)}
                className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'border-amber-500 dark:border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-500/[0.02]' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className="bg-slate-100 dark:bg-slate-800 border text-slate-600 dark:text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {client.codigo || 'REF'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => toggleClientExclusion(client.id, e)}
                        title={isExcluded ? 'Empresa desmarcada como referência recomendada. Clique para reativar.' : 'Clique para marcar como não recomendada.'}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors flex items-center gap-1 ${
                          isExcluded 
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isExcluded ? '⚠️ Não Recomendado' : '⭐ Apto para Referência'}
                      </button>

                      <div className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-slate-500'
                      }`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-snug mb-1 group-hover:text-amber-500 transition-colors line-clamp-1">
                    {client.trade_name}
                  </h3>
                  
                  {client.legal_name && client.legal_name !== client.trade_name && (
                    <p className="text-xs text-slate-450 dark:text-slate-400 truncate mb-2.5">
                      {client.legal_name}
                    </p>
                  )}

                  {/* Badges / Location info */}
                  <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin size={13} className="text-amber-500 shrink-0" />
                      <span className="font-bold text-amber-700 dark:text-amber-400">{client.zone}</span>
                    </div>

                    {(client.city || client.province || client.address_line) && (
                      <div className="text-[11.5px] text-slate-550 dark:text-slate-400 pl-5 truncate">
                        {client.city ? `${client.city}` : ''}
                        {client.province && client.province !== client.city ? ` (${client.province})` : ''}
                        {client.address_line ? ` • ${client.address_line}` : ''}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 pl-0.5 pt-1">
                      <Briefcase size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{client.sectorDisplay}</span>
                    </div>
                  </div>
                </div>

                {/* Footer action snippet */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-mono">{client.tax_id || 'NIF España'}</span>
                  <span className="text-amber-500 font-bold group-hover:underline flex items-center gap-1">
                    {isSelected ? '✓ Incluído no Dossiê' : '+ Clique para Incluir'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
