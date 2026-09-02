import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  MapPin,
  ArrowUpDown,
  Upload,
  Home,
  Building,
  Building2,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  CreditCard,
  Check,
  Copy,
  X,
  AlertTriangle,
  ExternalLink,
  Bed,
  Users,
  User,
  Calendar,
  Sparkles,
  Wifi,
  Snowflake,
  Car,
  UtensilsCrossed,
  Flame,
  Tv,
  Shirt,
  ArrowUpCircle,
  Globe,
  Droplets,
  Zap,
  DollarSign,
  Download,
  Maximize2,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Info,
  LayoutGrid,
  List,
  Filter,
  Tag,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { logisticsService } from '../../services/logisticsService';
import { registrosService } from '../../services/registrosService';
import type { Alojamento, Provedor, Alocacao, Cama } from '../../services/logisticsService';
import { ImportModal } from '../../components/ImportModal';

export const AlojamentosList: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'alojamentos' | 'provedores'>(
    location.pathname.includes('provedores') ? 'provedores' : 'alojamentos'
  );

  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modo de Exibição: Cards Alinhados (Estilo Faturamento) vs Tabela vs Galeria
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'gallery'>('cards');

  // Controle de Cards Expandidos (Accordion)
  const [expandedAlojamentoIds, setExpandedAlojamentoIds] = useState<Set<string>>(new Set());

  // Filtros Avançados
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [ocupacaoFilter, setOcupacaoFilter] = useState<'todos' | 'ocupados' | 'libres'>('todos');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('todos');

  // Modais de Visualização e Exclusão
  const [viewingProvedor, setViewingProvedor] = useState<Provedor | null>(null);
  const [viewingAlojamento, setViewingAlojamento] = useState<Alojamento | null>(null);
  const [activeViewPhotoIndex, setActiveViewPhotoIndex] = useState<number>(0);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'alojamento' | 'provedor' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal de Asignación Rápida
  const [assigningAlojamento, setAssigningAlojamento] = useState<Alojamento | null>(null);
  const [assignWorkerQuery, setAssignWorkerQuery] = useState('');
  const [assignSearchResults, setAssignSearchResults] = useState<any[]>([]);
  const [isSearchingAssign, setIsSearchingAssign] = useState(false);
  const [selectedAssignWorker, setSelectedAssignWorker] = useState<any | null>(null);
  const [assignCamaId, setAssignCamaId] = useState('');
  const [assignDataInicio, setAssignDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [assignDataFim, setAssignDataFim] = useState('');
  const [assignObservacoes, setAssignObservacoes] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Modal de Check-out
  const [checkingOutWorker, setCheckingOutWorker] = useState<{
    alocacaoId: string;
    workerNome: string;
    alojamentoNome: string;
  } | null>(null);
  const [motivoCheckout, setMotivoCheckout] = useState('Fin de Pedido / Obra');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Ordenação
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtros por Data de Cadastro e Categorias Rápidas
  const [createdDateFilter, setCreatedDateFilter] = useState<'todos' | 'hoje' | 'ultimos_3_dias' | 'esta_semana' | 'este_mes' | 'custom'>('todos');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [alojamentoCategoryFilter, setAlojamentoCategoryFilter] = useState<'todos' | 'recentes' | 'booking_airbnb' | 'fijos' | 'com_vagas' | 'ocupados'>('todos');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [alojRes, provRes, alocRes, camasRes] = await Promise.allSettled([
        registrosService.fetchAlojamentos(),
        registrosService.fetchProvedores(),
        logisticsService.fetchAlocacoesAtivas(),
        logisticsService.fetchCamas()
      ]);

      if (alojRes.status === 'fulfilled' && Array.isArray(alojRes.value)) {
        setAlojamentos(alojRes.value);
      }
      if (provRes.status === 'fulfilled' && Array.isArray(provRes.value)) {
        setProvedores(provRes.value);
      }
      if (alocRes.status === 'fulfilled' && Array.isArray(alocRes.value)) {
        setAlocacoes(alocRes.value);
      }
      if (camasRes.status === 'fulfilled' && Array.isArray(camasRes.value)) {
        setCamas(camasRes.value);
      }
    } catch (error) {
      console.error('Error fetching data in list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname.includes('provedores')) {
      setActiveTab('provedores');
    } else {
      setActiveTab('alojamentos');
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
  }, []);

  // Busca rápida de colaboradores para o modal de designação
  useEffect(() => {
    if (!assigningAlojamento) return;
    const timer = setTimeout(async () => {
      setIsSearchingAssign(true);
      try {
        const results = await logisticsService.searchTrabalhadores(assignWorkerQuery);
        setAssignSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingAssign(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [assignWorkerQuery, assigningAlojamento]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === 'provedor') {
        await registrosService.deleteProvedor(itemToDelete.id);
        setProvedores(prev => prev.filter(p => p.id !== itemToDelete.id));
        if (viewingProvedor?.id === itemToDelete.id) setViewingProvedor(null);
      } else {
        await registrosService.deleteAlojamento(itemToDelete.id);
        setAlojamentos(prev => prev.filter(a => a.id !== itemToDelete.id));
        if (viewingAlojamento?.id === itemToDelete.id) setViewingAlojamento(null);
      }
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      alert(`Error al eliminar: ${error.message || 'Compruebe si existen dependencias vinculadas.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper para obter ocupantes de um alojamento
  const getOccupantsForAlojamento = (aloj: Alojamento): Alocacao[] => {
    return alocacoes.filter(a => {
      if (a.status === 'Checkout') return false;
      if (a.alojamento_id === aloj.id) return true;
      if (a.alojamento?.codigo && aloj.codigo && a.alojamento.codigo === aloj.codigo) return true;
      if (a.alojamento?.nome && aloj.nome && a.alojamento.nome.toLowerCase().trim() === aloj.nome.toLowerCase().trim()) return true;
      return false;
    });
  };

  // Toggle Accordion Expand
  const toggleExpandAlojamento = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedAlojamentoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedAlojamentoIds(new Set(sortedAlojamentos.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedAlojamentoIds(new Set());
  };

  // Toggle Accordion Expand para Provedores
  const [expandedProvedorIds, setExpandedProvedorIds] = useState<Set<string>>(new Set());

  const toggleExpandProvedor = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedProvedorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllProvedores = () => {
    setExpandedProvedorIds(new Set(filteredProvedores.map(p => p.id)));
  };

  const collapseAllProvedores = () => {
    setExpandedProvedorIds(new Set());
  };

  // Helper para obter alojamentos de um provedor
  const getAlojamentosForProvedor = (prov: Provedor): Alojamento[] => {
    return alojamentos.filter(a => {
      if (a.provedor_id && a.provedor_id === prov.id) return true;
      if (a.provedor?.id && a.provedor.id === prov.id) return true;
      if (a.provedor?.nome_razao_social && prov.nome_razao_social &&
          a.provedor.nome_razao_social.trim().toLowerCase() === prov.nome_razao_social.trim().toLowerCase()) return true;
      return false;
    });
  };

  // Confirmar Asignación Rápida
  const handleConfirmAssign = async () => {
    if (!assigningAlojamento || !selectedAssignWorker || !assignCamaId) {
      alert('Por favor, seleccione el colaborador y la cama.');
      return;
    }

    try {
      setIsSubmittingAssign(true);
      await logisticsService.alocarTrabalhador({
        cama_id: assignCamaId,
        alojamento_id: assigningAlojamento.id,
        worker_id: selectedAssignWorker.id,
        worker_nome: selectedAssignWorker.Nombre || selectedAssignWorker.nombre,
        codigo_colab: selectedAssignWorker.Cod_colab || selectedAssignWorker.cod_colab,
        cliente_nome: selectedAssignWorker.contratante || 'Cliente Principal',
        obra_nome: selectedAssignWorker.ubicacion || assigningAlojamento.municipio || 'Obra',
        data_inicio: assignDataInicio,
        data_fim: assignDataFim,
        observacoes: assignObservacoes || `Asignado en ${assigningAlojamento.nome}`
      });

      setAssigningAlojamento(null);
      setSelectedAssignWorker(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Confirmar Check-out
  const handleConfirmCheckout = async () => {
    if (!checkingOutWorker) return;
    try {
      setIsSubmittingCheckout(true);
      await logisticsService.checkoutTrabalhador(checkingOutWorker.alocacaoId, motivoCheckout);
      setCheckingOutWorker(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // Listas Únicas para Filtros
  const municipiosList = useMemo(() => {
    const list = new Set<string>();
    alojamentos.forEach(a => { if (a.municipio) list.add(a.municipio.trim()); });
    return Array.from(list).sort();
  }, [alojamentos]);

  // Contagem de Alojamientos por Provedor
  const alojamentosCountPorProvedor = useMemo(() => {
    const map = new Map<string, number>();
    alojamentos.forEach(a => {
      if (a.provedor_id) {
        map.set(a.provedor_id, (map.get(a.provedor_id) || 0) + 1);
      }
    });
    return map;
  }, [alojamentos]);

  // Filtros de Alojamentos
  const filteredAlojamentos = useMemo(() => {
    return alojamentos.filter(a => {
      const q = searchTerm.toLowerCase().trim();
      const occupants = getOccupantsForAlojamento(a);
      
      const matchesSearch = !q || (
        a.nome.toLowerCase().includes(q) ||
        (a.codigo && a.codigo.toLowerCase().includes(q)) ||
        (a.municipio && a.municipio.toLowerCase().includes(q)) ||
        (a.provincia && a.provincia.toLowerCase().includes(q)) ||
        (a.endereco && a.endereco.toLowerCase().includes(q)) ||
        (a.provedor?.nome_razao_social && a.provedor.nome_razao_social.toLowerCase().includes(q)) ||
        occupants.some(o => o.worker_nome.toLowerCase().includes(q) || o.codigo_colab?.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      // Status
      const isActivo = a.ativo !== false && a.status !== 'Inactivo';
      if (statusFilter === 'activos' && !isActivo) return false;
      if (statusFilter === 'inactivos' && isActivo) return false;

      // Modalidade
      if (tipoFilter !== 'todos') {
        const tipo = (a.tipo_alojamento || 'Fijo').toLowerCase();
        if (tipoFilter === 'fijo' && !tipo.includes('fijo')) return false;
        if (tipoFilter === 'temporal' && !tipo.includes('temporal') && !tipo.includes('airbnb') && !tipo.includes('hotel')) return false;
      }

      // Ocupação
      if (ocupacaoFilter === 'ocupados' && occupants.length === 0) return false;
      if (ocupacaoFilter === 'libres' && occupants.length > 0) return false;

      // Cidade
      if (selectedMunicipio !== 'todos' && a.municipio !== selectedMunicipio) return false;

      // Filtro por Data de Cadastro
      if (createdDateFilter !== 'todos') {
        const createdDate = a.created_at ? new Date(a.created_at) : null;
        if (!createdDate || isNaN(createdDate.getTime())) {
          return false;
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (createdDateFilter === 'hoje') {
          if (createdDate.getTime() < todayStart && (now.getTime() - createdDate.getTime() > 24 * 60 * 60 * 1000)) {
            return false;
          }
        } else if (createdDateFilter === 'ultimos_3_dias') {
          const threeDaysAgo = todayStart - (2 * 24 * 60 * 60 * 1000);
          if (createdDate.getTime() < threeDaysAgo) return false;
        } else if (createdDateFilter === 'esta_semana') {
          const sevenDaysAgo = todayStart - (6 * 24 * 60 * 60 * 1000);
          if (createdDate.getTime() < sevenDaysAgo) return false;
        } else if (createdDateFilter === 'este_mes') {
          if (createdDate.getMonth() !== now.getMonth() || createdDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (createdDateFilter === 'custom') {
          if (customDateStart) {
            const start = new Date(customDateStart).getTime();
            if (createdDate.getTime() < start) return false;
          }
          if (customDateEnd) {
            const end = new Date(customDateEnd + 'T23:59:59').getTime();
            if (createdDate.getTime() > end) return false;
          }
        }
      }

      // Filtro por Categoria Rápida
      if (alojamentoCategoryFilter === 'recentes') {
        const createdDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (createdDate < sevenDaysAgo) return false;
      } else if (alojamentoCategoryFilter === 'booking_airbnb') {
        const text = `${a.nome} ${a.tipo_alojamento} ${a.provedor?.nome_razao_social || ''}`.toLowerCase();
        if (!text.includes('booking') && !text.includes('airbnb') && a.tipo_alojamento !== 'Temporal') return false;
      } else if (alojamentoCategoryFilter === 'fijos') {
        const text = `${a.nome} ${a.tipo_alojamento} ${a.provedor?.nome_razao_social || ''}`.toLowerCase();
        if (text.includes('booking') || text.includes('airbnb') || a.tipo_alojamento === 'Temporal') return false;
      } else if (alojamentoCategoryFilter === 'com_vagas') {
        const totalVagas = a.capacidade_pessoas || a.total_camas || 0;
        if (occupants.length >= totalVagas) return false;
      } else if (alojamentoCategoryFilter === 'ocupados') {
        if (occupants.length === 0) return false;
      }

      return true;
    });
  }, [alojamentos, searchTerm, statusFilter, tipoFilter, ocupacaoFilter, selectedMunicipio, alocacoes, createdDateFilter, customDateStart, customDateEnd, alojamentoCategoryFilter]);

  // Ordenação de Alojamentos (Activos e com ocupantes primeiro)
  const sortedAlojamentos = useMemo(() => {
    return [...filteredAlojamentos].sort((a, b) => {
      const isActivoA = a.ativo !== false && a.status !== 'Inactivo';
      const isActivoB = b.ativo !== false && b.status !== 'Inactivo';
      if (isActivoA !== isActivoB) return isActivoA ? -1 : 1;

      if (sortField === 'created_at') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      let valA: any = a[sortField as keyof Alojamento];
      let valB: any = b[sortField as keyof Alojamento];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredAlojamentos, sortField, sortOrder]);

  // Filtros e Ordenação de Proveedores
  const filteredProvedores = useMemo(() => {
    return provedores.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        p.nome_razao_social.toLowerCase().includes(q) ||
        (p.cif_nif && p.cif_nif.toLowerCase().includes(q)) ||
        (p.municipio && p.municipio.toLowerCase().includes(q)) ||
        (p.provincia && p.provincia.toLowerCase().includes(q)) ||
        (p.iban && p.iban.toLowerCase().includes(q))
      );
      return matchesSearch;
    }).sort((a, b) => {
      let valA: any = a[sortField as keyof Provedor];
      let valB: any = b[sortField as keyof Provedor];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB, 'es', { sensitivity: 'base' }) 
          : valB.localeCompare(valA, 'es', { sensitivity: 'base' });
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [provedores, searchTerm, sortField, sortOrder]);

  // KPIs Dinâmicos de Topo (Atualizados em Tempo Real com base nos Filtros Ativos)
  const kpis = useMemo(() => {
    const currentList = filteredAlojamentos;
    const isFiltered = currentList.length !== alojamentos.length || 
                       searchTerm.trim() !== '' || 
                       statusFilter !== 'todos' || 
                       tipoFilter !== 'todos' || 
                       ocupacaoFilter !== 'todos' || 
                       selectedMunicipio !== 'todos' || 
                       createdDateFilter !== 'todos' || 
                       alojamentoCategoryFilter !== 'todos';

    const totalAlojamentos = currentList.length;
    const totalGeralAlojamentos = alojamentos.length;
    const activos = currentList.filter(a => a.ativo !== false && a.status !== 'Inactivo').length;
    
    // Plazas totais dos alojamentos exibidos
    const totalPlazas = currentList.reduce((acc, a) => acc + (a.capacidade_pessoas || a.total_camas || 0), 0);

    // Ocupantes alocados nos alojamentos exibidos no filtro
    const currentAlojIds = new Set(currentList.map(a => a.id));
    const currentAlojCodigos = new Set(currentList.map(a => a.codigo).filter(Boolean));
    const currentAlojNomes = new Set(currentList.map(a => a.nome?.trim().toLowerCase()).filter(Boolean));

    const ocupantesFiltrados = alocacoes.filter(a => {
      if (a.status === 'Checkout' || a.status === 'Alojamiento Propio') return false;
      if (a.alojamento_id && currentAlojIds.has(a.alojamento_id)) return true;
      if (a.alojamento_codigo && currentAlojCodigos.has(a.alojamento_codigo)) return true;
      if (a.alojamento_nome && currentAlojNomes.has(a.alojamento_nome.trim().toLowerCase())) return true;
      return false;
    });

    const totalOcupantes = ocupantesFiltrados.length;

    // Alquiler mensal dos alojamentos exibidos no filtro
    const totalAlquiler = currentList
      .reduce((acc, a) => acc + Math.max(0, Number(a.valor_mensal) || 0), 0);

    // Provedores associados aos alojamentos exibidos no filtro
    const provedoresIds = new Set(currentList.map(a => a.provedor_id || a.provedor?.id).filter(Boolean));
    const totalProveedores = isFiltered && activeTab === 'alojamentos'
      ? provedoresIds.size
      : (activeTab === 'provedores' ? filteredProvedores.length : provedores.length);

    return {
      totalAlojamentos,
      totalGeralAlojamentos,
      activos,
      totalPlazas,
      totalAlquiler,
      totalProveedores,
      totalOcupantes,
      isFiltered
    };
  }, [filteredAlojamentos, alojamentos, provedores, alocacoes, filteredProvedores, activeTab, searchTerm, statusFilter, tipoFilter, ocupacaoFilter, selectedMunicipio, createdDateFilter, alojamentoCategoryFilter]);

  return (
    <div className="w-full px-8 py-6 space-y-6">
      
      {/* Header Superior com Título e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="text-blue-600" size={26} />
            Registros de Alojamientos & Proveedores
          </h1>
          <p className="text-xs text-slate-500">
            Gestión completa de inmuebles, modalidades de alquiler, plazas, ocupación de trabajadores y proveedores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Upload size={15} />
            Importar Plantilla
          </button>

          <button
            onClick={() => navigate('/logistica/registros/alojamentos/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={15} />
            + Nuevo Alojamiento
          </button>

          <button
            onClick={() => navigate('/logistica/registros/provedores/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={15} />
            + Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Grid de KPIs de Topo (Atualizados Dinamicamente pelo Filtro) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Alojamientos */}
        <div 
          onClick={() => { setStatusFilter('todos'); setAlojamentoCategoryFilter('todos'); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 cursor-pointer hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              {kpis.isFiltered ? 'Alojamientos Filtrados' : 'Total Alojamientos'}
            </span>
            <Home size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {kpis.totalAlojamentos}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            {kpis.isFiltered ? `${kpis.activos} activos (${kpis.totalAlojamentos} de ${kpis.totalGeralAlojamentos} total)` : `${kpis.activos} activos en curso`}
          </span>
        </div>

        {/* Trabajadores Alojados */}
        <div 
          onClick={() => { setOcupacaoFilter('ocupados'); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 cursor-pointer hover:border-emerald-300 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
              Trabajadores Alojados
            </span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {kpis.totalOcupantes}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            {kpis.totalPlazas > 0 ? Math.round((kpis.totalOcupantes / kpis.totalPlazas) * 100) : 0}% de ocupación
          </span>
        </div>

        {/* Capacidad Total / Plazas */}
        <div 
          onClick={() => { setAlojamentoCategoryFilter('com_vagas'); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 cursor-pointer hover:border-indigo-300 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
              Capacidad / Plazas
            </span>
            <Bed size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {kpis.totalPlazas} <span className="text-xs font-semibold text-slate-400">plazas</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            {Math.max(0, kpis.totalPlazas - kpis.totalOcupantes)} plazas libres
          </span>
        </div>

        {/* Alquiler Mensual */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.isFiltered ? 'Alquiler Filtrado' : 'Alquiler Mensual'}
            </span>
            <DollarSign size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
            € {kpis.totalAlquiler.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            {kpis.isFiltered ? `${kpis.totalAlojamentos} alojamientos en el filtro` : 'Contratos activos'}
          </span>
        </div>

        {/* Proveedores */}
        <div 
          onClick={() => { setActiveTab('provedores'); }}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 cursor-pointer hover:border-purple-300 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-purple-600 transition-colors">
              Proveedores
            </span>
            <Building size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {kpis.totalProveedores}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            {kpis.isFiltered ? 'Vinculados al filtro' : 'Inmobiliarias & Propietarios'}
          </span>
        </div>

      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
        
        {/* Barra Superior: Tabs & Controles de Filtros */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-900/50">
          
          {/* Tabs Alojamientos vs Proveedores */}
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('alojamentos'); setSortField('nome'); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'alojamentos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Home size={15} />
              Alojamientos
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-black">
                {alojamentos.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('provedores'); setSortField('nome_razao_social'); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'provedores'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Building size={15} />
              Proveedores
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-black">
                {provedores.length}
              </span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'alojamentos' && (
              <>
                {/* Seletor de Ordenação */}
                <select
                  value={`${sortField}_${sortOrder}`}
                  onChange={e => {
                    const [field, order] = e.target.value.split('_');
                    setSortField(field);
                    setSortOrder(order as any);
                  }}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 shadow-2xs"
                  title="Ordenar alojamientos"
                >
                  <option value="created_at_desc">🕒 Más Recientes (Recién Creados)</option>
                  <option value="created_at_asc">🕒 Más Antiguos</option>
                  <option value="nome_asc">🔤 Nombre (A-Z)</option>
                  <option value="nome_desc">🔤 Nombre (Z-A)</option>
                  <option value="codigo_asc">🏷️ Código (AL-XXXX)</option>
                  <option value="municipio_asc">📍 Ciudad (A-Z)</option>
                  <option value="capacidade_pessoas_desc">🛏️ Mayor Capacidad</option>
                  <option value="valor_mensal_desc">💶 Mayor Alquiler</option>
                  <option value="valor_mensal_asc">💶 Menor Alquiler</option>
                </select>

                {/* Filtro por Data de Cadastro */}
                <select
                  value={createdDateFilter}
                  onChange={e => setCreatedDateFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 shadow-2xs"
                  title="Filtrar por fecha de alta"
                >
                  <option value="todos">📅 Fecha Alta: Todas</option>
                  <option value="hoje">⭐ Creados Hoy (Últimas 24h)</option>
                  <option value="ultimos_3_dias">📅 Últimos 3 días</option>
                  <option value="esta_semana">📅 Esta Semana (7 días)</option>
                  <option value="este_mes">📅 Este Mes</option>
                  <option value="custom">📅 Fecha Específica...</option>
                </select>

                {/* Filtro Status */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                >
                  <option value="todos">Estado: Todos</option>
                  <option value="activos">🟢 Activos / En curso</option>
                  <option value="inactivos">⚪ Inactivos</option>
                </select>

                {/* Filtro Ocupação */}
                <select
                  value={ocupacaoFilter}
                  onChange={e => setOcupacaoFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                >
                  <option value="todos">Ocupación: Todas</option>
                  <option value="ocupados">👥 Con Ocupantes</option>
                  <option value="libres">🚪 Plazas Libres</option>
                </select>

                {/* Filtro Modalidade */}
                <select
                  value={tipoFilter}
                  onChange={e => setTipoFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                >
                  <option value="todos">Modalidad: Todas</option>
                  <option value="fijo">Fijo (Larga duración)</option>
                  <option value="temporal">Temporal / Airbnb / Hotel</option>
                </select>

                {/* Filtro Cidade */}
                {municipiosList.length > 0 && (
                  <select
                    value={selectedMunicipio}
                    onChange={e => setSelectedMunicipio(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 max-w-[140px] truncate"
                  >
                    <option value="todos">Ciudad: Todas</option>
                    {municipiosList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}

                {/* Toggle Modos de Visualização (Cards Alinhados / Tabela / Galeria) */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Vista de Fichas Alinhadas (Accordion)"
                  >
                    <List size={15} />
                    <span className="hidden sm:inline">Fichas</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Vista de Tabla Compacta"
                  >
                    <Table2Icon />
                    <span className="hidden sm:inline">Tabla</span>
                  </button>
                  <button
                    onClick={() => setViewMode('gallery')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'gallery'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Vista de Galería de Fotos"
                  >
                    <LayoutGrid size={15} />
                    <span className="hidden sm:inline">Fotos</span>
                  </button>
                </div>
              </>
            )}

            {activeTab === 'provedores' && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Vista de Fichas Alinhadas (Accordion)"
                >
                  <List size={15} />
                  <span className="hidden sm:inline">Fichas</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Vista de Tabla Compacta"
                >
                  <Table2Icon />
                  <span className="hidden sm:inline">Tabla</span>
                </button>
              </div>
            )}

            {/* Input de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar nombre, trabajador, ciudad..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Barra de Chips Rápidos de Filtro */}
        {activeTab === 'alojamentos' && (
          <div className="border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 bg-slate-50/40 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtros Rápidos:</span>
              
              <button
                onClick={() => {
                  setAlojamentoCategoryFilter('todos');
                  setCreatedDateFilter('todos');
                  setStatusFilter('todos');
                  setOcupacaoFilter('todos');
                  setTipoFilter('todos');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  alojamentoCategoryFilter === 'todos' && createdDateFilter === 'todos' && tipoFilter === 'todos' && ocupacaoFilter === 'todos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todos ({alojamentos.length})
              </button>

              <button
                onClick={() => {
                  setAlojamentoCategoryFilter('recentes');
                  setCreatedDateFilter('esta_semana');
                  setSortField('created_at');
                  setSortOrder('desc');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  alojamentoCategoryFilter === 'recentes' || createdDateFilter === 'hoje' || createdDateFilter === 'esta_semana'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                ⭐ Recién Creados (Últimos 7 días)
              </button>

              <button
                onClick={() => {
                  setAlojamentoCategoryFilter(alojamentoCategoryFilter === 'booking_airbnb' ? 'todos' : 'booking_airbnb');
                  setTipoFilter('todos');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  alojamentoCategoryFilter === 'booking_airbnb'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}
              >
                🏨 Booking & Airbnb
              </button>

              <button
                onClick={() => {
                  setAlojamentoCategoryFilter(alojamentoCategoryFilter === 'fijos' ? 'todos' : 'fijos');
                  setTipoFilter(alojamentoCategoryFilter === 'fijos' ? 'todos' : 'fijo');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  alojamentoCategoryFilter === 'fijos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                🏠 Inmuebles Fijos
              </button>

              <button
                onClick={() => {
                  setAlojamentoCategoryFilter(alojamentoCategoryFilter === 'com_vagas' ? 'todos' : 'com_vagas');
                  setOcupacaoFilter(alojamentoCategoryFilter === 'com_vagas' ? 'todos' : 'libres');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  alojamentoCategoryFilter === 'com_vagas' || ocupacaoFilter === 'libres'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                🟢 Con Plazas Libres
              </button>
            </div>

            {createdDateFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
                <span className="text-[11px] font-semibold text-slate-500">Desde:</span>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={e => setCustomDateStart(e.target.value)}
                  className="text-xs bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300 font-medium focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-slate-500">Hasta:</span>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={e => setCustomDateEnd(e.target.value)}
                  className="text-xs bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300 font-medium focus:ring-0"
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CORPO: VISTA DE FICHAS ACCORDION (ESTILO FATURAMENTO) */}
        {/* ========================================================================= */}
        {activeTab === 'alojamentos' ? (
          isLoading ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs font-semibold">Cargando todos los alojamientos y ocupantes...</p>
            </div>
          ) : viewMode === 'cards' ? (
            
            /* VISTA DE FICHAS EXPANSÍVEIS (ESTILO FATURAMENTO) */
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] min-h-[480px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
              {/* Barra de Ações Rápidas Sticky */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 shadow-2xs">
                <span>Mostrando <strong>{sortedAlojamentos.length}</strong> alojamientos</span>
                <div className="flex items-center gap-2">
                  <button onClick={expandAll} className="hover:text-blue-600 font-semibold transition-colors">
                    Expandir Todos
                  </button>
                  <span>•</span>
                  <button onClick={collapseAll} className="hover:text-blue-600 font-semibold transition-colors">
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">

              {sortedAlojamentos.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Home size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ningún alojamiento coincide con los filtros</p>
                </div>
              ) : (
                sortedAlojamentos.map(a => {
                  const isActivo = a.ativo !== false && a.status !== 'Inactivo';
                  const occupants = getOccupantsForAlojamento(a);
                  const isExpanded = expandedAlojamentoIds.has(a.id);
                  const totalVagas = a.capacidade_pessoas || a.total_camas || 4;
                  const vagasLibres = Math.max(0, totalVagas - occupants.length);

                  return (
                    <div
                      key={a.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-xs overflow-hidden ${
                        isExpanded
                          ? 'border-blue-500/80 ring-2 ring-blue-500/10 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* CABEÇALHO DO CARD (CLICÁVEL PARA EXPANDIR) */}
                      <div
                        onClick={() => toggleExpandAlojamento(a.id)}
                        className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* LADO ESQUERDO: Ícone + Título + Badges + Localização */}
                        <div className="flex items-start gap-3.5 flex-1">
                          <div className={`p-3 rounded-2xl flex-shrink-0 transition-transform ${
                            occupants.length > 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <Home size={22} />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {a.codigo || 'AL-XXXX'}
                              </span>

                              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate max-w-lg" title={a.nome}>
                                {a.nome}
                              </h3>

                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isActivo
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {isActivo ? 'Activo' : 'Inactivo'}
                              </span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {a.tipo_alojamento || 'Fijo'}
                              </span>

                              {a.created_at && (() => {
                                const d = new Date(a.created_at);
                                if (isNaN(d.getTime())) return null;
                                const isCreatedToday = d.toDateString() === new Date().toDateString();
                                const dateFormatted = d.toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                });
                                const timeFormatted = d.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });

                                return (
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    isCreatedToday
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs animate-pulse'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                  }`} title={`Fecha de registro: ${dateFormatted} ${timeFormatted}`}>
                                    <Calendar size={10} className={isCreatedToday ? 'text-amber-600' : 'text-slate-400'} />
                                    {isCreatedToday ? `⭐ Creado Hoy (${timeFormatted})` : `Reg: ${dateFormatted}`}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Linha 2: Localização, GPS e Provedor */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1">
                                <MapPin size={13} className="text-rose-500 flex-shrink-0" />
                                <span className="truncate max-w-xs">{a.municipio || 'España'}{a.provincia ? `, ${a.provincia}` : ''}</span>
                              </div>

                              {a.latitude && a.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                  title="Ver en Google Maps"
                                >
                                  <Globe size={11} />
                                  Maps ({Number(a.latitude).toFixed(2)}, {Number(a.longitude).toFixed(2)})
                                </a>
                              )}

                              {a.provedor?.nome_razao_social && (
                                <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                                  <Building size={12} className="text-purple-500" />
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{a.provedor.nome_razao_social}</span>
                                  {a.provedor.telefone && (
                                    <a
                                      href={`https://wa.me/${a.provedor.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 ml-1 font-semibold"
                                    >
                                      <Phone size={10} />
                                      {a.provedor.telefone}
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CENTRO / DIREITA: KPIs DE CAPACIDADE, OCUPAÇÃO E ALUGUEL */}
                        <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-xs justify-between lg:justify-end">
                          
                          {/* Capacidad & Vagas */}
                          <div className="space-y-0.5 text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Capacidad</span>
                            <span className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                              <Users size={13} className="text-blue-600" />
                              {totalVagas} plazas • {a.total_camas || totalVagas} camas
                            </span>
                          </div>

                          {/* Ocupação Atual */}
                          <div className="space-y-0.5 text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ocupación Actual</span>
                            {occupants.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 size={12} />
                                {occupants.length} / {totalVagas} ocupadas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Totalmente libre
                              </span>
                            )}
                          </div>

                          {/* Custo / Aluguel Mensal */}
                          <div className="space-y-0.5 text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alquiler Mensual</span>
                            <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                              € {Number(a.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Ações & Chevron */}
                          <div className="flex items-center gap-2 pt-2 lg:pt-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setViewingAlojamento(a)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                              title="Ver Ficha Completa con fotos y contrato"
                            >
                              <Eye size={13} />
                              Ficha
                            </button>

                            <button
                              onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Editar Alojamiento"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              onClick={() => toggleExpandAlojamento(a.id)}
                              className={`p-1.5 rounded-xl transition-all ${
                                isExpanded
                                  ? 'bg-blue-600 text-white rotate-180 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                              title={isExpanded ? 'Recolher' : 'Expandir trabajadores alojados'}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>

                        </div>
                      </div>

                      {/* CORPO EXPANDIDO (ACCORDION DE TRABALHADORES) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          
                          {/* Barra de Título do Painel Interno */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-blue-600" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Trabajadores Alojados Actualmente ({occupants.length} personas)
                              </h4>
                              {vagasLibres > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {vagasLibres} camas disponibles
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setAssigningAlojamento(a);
                                const firstFreeBed = camas.find(c => c.alojamento_id === a.id && c.status === 'livre');
                                if (firstFreeBed) setAssignCamaId(firstFreeBed.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs w-fit"
                            >
                              <UserPlus size={13} />
                              + Asignar Trabajador a este Alojamiento
                            </button>
                          </div>

                          {/* TABELA DE TRABALHADORES HOSPEDADOS */}
                          {occupants.length === 0 ? (
                            <div className="p-8 bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                              <Bed size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                No hay trabajadores alojados actualmente en este inmueble.
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Este inmueble dispone de {totalVagas} plazas libres listas para ser asignadas.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                  <tr>
                                    <th className="px-4 py-2.5">Cód.</th>
                                    <th className="px-4 py-2.5">Trabajador</th>
                                    <th className="px-4 py-2.5">Empresa</th>
                                    <th className="px-4 py-2.5">Cliente & Pedido</th>
                                    <th className="px-4 py-2.5">Cama / Habitación</th>
                                    <th className="px-4 py-2.5">Período</th>
                                    <th className="px-4 py-2.5">Contacto Hospedaje</th>
                                    <th className="px-4 py-2.5 text-right">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                  {occupants.map(oc => (
                                    <tr key={oc.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors">
                                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {oc.codigo_colab || 'E-XXXX'}
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{oc.worker_nome}</p>
                                        {oc.worker_movil ? (
                                          <a
                                            href={`https://wa.me/${oc.worker_movil.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-semibold mt-0.5"
                                            title="Contactar al trabajador por WhatsApp"
                                          >
                                            <Phone size={11} />
                                            {oc.worker_movil}
                                          </a>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Sin teléfono móvil</span>
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                          {oc.empresa_contratante || 'STOCCO, LDA'}
                                        </span>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">{oc.cliente_nome}</p>
                                        {oc.pedido_codigo && (
                                          <span className="text-[10px] font-mono text-slate-400 block">{oc.pedido_codigo}</span>
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                          <Bed size={12} className="text-blue-500" />
                                          {oc.cama_identificador || (oc.cama_id?.includes('dup') ? 'Cama Doble' : 'Cama Individual')}
                                        </span>
                                      </td>

                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        <p className="font-medium">Desde: {oc.data_inicio}</p>
                                        {oc.data_fim && <p className="text-[10px] text-slate-400">Hasta: {oc.data_fim}</p>}
                                      </td>

                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        {oc.contacto_hospedaje ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-[11px]">{oc.contacto_hospedaje}</span>
                                            {oc.contacto_hospedaje.replace(/\D/g, '').length >= 9 && (
                                              <a
                                                href={`https://wa.me/${oc.contacto_hospedaje.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                title="WhatsApp"
                                              >
                                                <Phone size={11} />
                                              </a>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-[10px]">No registrado</span>
                                        )}
                                      </td>

                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => {
                                            setCheckingOutWorker({
                                              alocacaoId: oc.id,
                                              workerNome: oc.worker_nome,
                                              alojamentoNome: a.nome
                                            });
                                          }}
                                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors inline-flex items-center gap-1"
                                        >
                                          <LogOut size={12} />
                                          Check-out
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* CHIPS DE COMODIDADES E SERVIÇOS NO RODAPÉ DO CARD */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200/80 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Servicios:</span>
                              {a.comodidades?.wifi !== false && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">Wi-Fi</span>}
                              {a.comodidades?.cocina !== false && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">Cocina</span>}
                              {a.comodidades?.calefaccion !== false && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">Calefacción</span>}
                              {a.comodidades?.lavadora !== false && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">Lavadora</span>}
                              {a.comodidades?.aire_acondicionado && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">A/C</span>}
                              {a.comodidades?.parking && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">Parking</span>}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Fianza: € {Number(a.contrato?.fianza_valor || 0).toLocaleString('es-ES')}</span>
                              <span>•</span>
                              <span className="text-[10px] text-slate-400">Dormitorios: {a.dormitorios || 2}</span>
                              <span>•</span>
                              <span className="text-[10px] text-slate-400">Baños: {a.banheiros || 1}</span>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>
          ) : viewMode === 'gallery' ? (
            
            /* VISTA DE GALERIA (FOTOS EM GRID) */
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] min-h-[480px] p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
              {sortedAlojamentos.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Home size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ningún alojamiento coincide con los filtros</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {sortedAlojamentos.map(a => {
                    const rawFotos = a.fotos && a.fotos.length > 0 ? a.fotos : [];
                    const capaFoto = rawFotos[0];
                    const isActivo = a.ativo !== false && a.status !== 'Inactivo';
                    const occupants = getOccupantsForAlojamento(a);

                    return (
                      <div
                        key={a.id}
                        onClick={() => setViewingAlojamento(a)}
                        className="group bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                          {capaFoto ? (
                            <img
                              src={capaFoto}
                              alt={a.nome}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-center p-4 space-y-1 text-slate-500">
                              <ImageIcon size={28} className="mx-auto text-slate-600" />
                              <span className="text-[10px]">Sin foto</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActivo
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {isActivo ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/60 text-white backdrop-blur-md rounded">
                              {a.codigo || 'AL-XXXX'}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600/90 text-white rounded-md backdrop-blur-md">
                              {a.tipo_alojamento || 'Fijo'}
                            </span>
                          </div>

                          <div className="absolute bottom-3 left-3 text-white">
                            <p className="text-base font-black">
                              € {Number(a.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                              <span className="text-[11px] font-normal opacity-80"> / mes</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1" title={a.nome}>
                              {a.nome}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin size={12} className="text-rose-500 flex-shrink-0" />
                              <span className="truncate">{a.municipio || 'España'}{a.provincia ? `, ${a.provincia}` : ''}</span>
                            </p>
                            {a.latitude && a.longitude && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                              >
                                <Globe size={10} />
                                GPS: {Number(a.latitude).toFixed(3)}, {Number(a.longitude).toFixed(3)}
                              </a>
                            )}
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                <Users size={13} />
                                {occupants.length} / {a.capacidade_pessoas} ocupadas
                              </span>
                              <span className="text-slate-400 text-[11px] truncate max-w-[120px]" title={a.provedor?.nome_razao_social}>
                                {a.provedor?.nome_razao_social || 'Sin proveedor'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setViewingAlojamento(a)}
                              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye size={13} />
                              Ver Ficha
                            </button>

                            <div className="flex gap-1">
                              <button
                                onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ id: a.id, name: a.nome, type: 'alojamento' })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            
            /* VISTA DE TABELA COMPACTA */
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[480px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('nome')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Inmueble / Título
                        <ArrowUpDown size={12} className={sortField === 'nome' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('tipo_alojamento')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Modalidad
                        <ArrowUpDown size={12} className={sortField === 'tipo_alojamento' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('valor_mensal')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Alquiler / Coste
                        <ArrowUpDown size={12} className={sortField === 'valor_mensal' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('capacidade_pessoas')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Ocupación / Capacidad
                        <ArrowUpDown size={12} className={sortField === 'capacidade_pessoas' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('municipio')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Ubicación
                        <ArrowUpDown size={12} className={sortField === 'municipio' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Fecha Alta
                        <ArrowUpDown size={12} className={sortField === 'created_at' ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortedAlojamentos.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-500">Ningún alojamiento encontrado.</td></tr>
                  ) : (
                    sortedAlojamentos.map(a => {
                      const isActivo = a.ativo !== false && a.status !== 'Inactivo';
                      const occupants = getOccupantsForAlojamento(a);

                      return (
                        <tr
                          key={a.id}
                          onClick={() => toggleExpandAlojamento(a.id)}
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-105 transition-transform">
                                <Home size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800 dark:text-slate-100">{a.nome}</p>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isActivo
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {isActivo ? 'Activo' : 'Inactivo'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{a.codigo || 'AL-XXXX'}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{a.classificacao || 'Privado'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                              {a.tipo_alojamento || 'Fijo'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              € {Number(a.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${
                              occupants.length > 0
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <Users size={13} />
                              {occupants.length} / {a.capacidade_pessoas} pax
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                              <span>{a.municipio || 'N/A'}{a.provincia ? `, ${a.provincia}` : ''}</span>
                            </div>
                            {a.latitude && a.longitude && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                                title="Ver ubicación en Google Maps"
                              >
                                <Globe size={10} />
                                Maps ({Number(a.latitude).toFixed(2)}, {Number(a.longitude).toFixed(2)})
                              </a>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {a.created_at ? (() => {
                              const d = new Date(a.created_at);
                              if (isNaN(d.getTime())) return <span className="text-slate-400">—</span>;
                              const isToday = d.toDateString() === new Date().toDateString();
                              return (
                                <div>
                                  <span className={`text-[11px] font-semibold ${isToday ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })() : <span className="text-slate-400 text-[11px]">—</span>}
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-medium text-slate-700 dark:text-slate-300">{a.provedor?.nome_razao_social || '-'}</p>
                          </td>

                          <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingAlojamento(a)}
                                title="Ver Ficha"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)}
                                title="Editar"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ id: a.id, name: a.nome, type: 'alojamento' })}
                                title="Eliminar"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          
          /* ========================================================================= */
          /* TAB DE PROVEEDORES */
          /* ========================================================================= */
          isLoading ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-xs font-semibold">Cargando proveedores y sus alojamientos...</p>
            </div>
          ) : viewMode === 'cards' ? (
            
            /* VISTA DE FICHAS EXPANSÍVEIS DE PROVEEDORES (ESTILO FATURAMENTO) */
            <div className="overflow-y-auto max-h-[calc(100vh-340px)] min-h-[480px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
              {/* Barra de Ações Rápidas Sticky */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 shadow-2xs">
                <span>Mostrando <strong>{filteredProvedores.length}</strong> proveedores</span>
                <div className="flex items-center gap-2">
                  <button onClick={expandAllProvedores} className="hover:text-purple-600 font-semibold transition-colors">
                    Expandir Todos
                  </button>
                  <span>•</span>
                  <button onClick={collapseAllProvedores} className="hover:text-purple-600 font-semibold transition-colors">
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {filteredProvedores.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Building size={32} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ningún proveedor coincide con los filtros</p>
                  </div>
                ) : (
                  filteredProvedores.map(p => {
                    const provAlojamentos = getAlojamentosForProvedor(p);
                    const isExpanded = expandedProvedorIds.has(p.id);
                    const totalPlazasProv = provAlojamentos.reduce((acc, curr) => acc + (curr.capacidade_pessoas || curr.total_camas || 0), 0);
                    
                    const fijos = provAlojamentos.filter(a => a.tipo_alojamento !== 'Temporal');
                    const temporales = provAlojamentos.filter(a => a.tipo_alojamento === 'Temporal');
                    const totalCustoFijo = fijos.reduce((acc, curr) => acc + (Number(curr.valor_mensal) || 0), 0);
                    const isPlataforma = p.nome_razao_social?.toLowerCase().includes('airbnb') || 
                                         p.nome_razao_social?.toLowerCase().includes('booking') || 
                                         p.nome_razao_social?.toLowerCase().includes('idealista') ||
                                         (temporales.length > 0 && fijos.length === 0);

                    return (
                      <div
                        key={p.id}
                        className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-xs overflow-hidden ${
                          isExpanded
                            ? 'border-purple-500/80 ring-2 ring-purple-500/10 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* CABEÇALHO DO CARD DO PROVEDOR (CLICÁVEL PARA EXPANDIR) */}
                        <div
                          onClick={() => toggleExpandProvedor(p.id)}
                          className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none hover:bg-purple-50/20 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* LADO ESQUERDO: Ícone + Código/Nome + Badges + Contato/Localização/IBAN */}
                          <div className="flex items-start gap-3.5 flex-1">
                            <div className={`p-3 rounded-2xl flex-shrink-0 transition-transform ${
                              provAlojamentos.length > 0
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <Building size={22} />
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  {p.codigo || 'PROV-XXXX'}
                                </span>
                                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight truncate" title={p.nome_razao_social}>
                                  {p.nome_razao_social}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {isPlataforma ? 'Plataforma / Temporal' : (p.tipo_provedor || 'Inmobiliaria')}
                                </span>
                                {p.tipo_pessoa && p.tipo_pessoa !== p.tipo_provedor && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    {p.tipo_pessoa}
                                  </span>
                                )}
                              </div>

                              {/* Linha de Sub-informações: Localização, Contato WhatsApp, CIF, IBAN */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <MapPin size={13} className="text-rose-500 flex-shrink-0" />
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {p.municipio || 'España'}{p.provincia ? `, ${p.provincia}` : ''}
                                  </span>
                                </div>

                                {(p.contato_nome || p.telefone) && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <User size={12} className="text-purple-600" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{p.contato_nome || 'Contacto'}</span>
                                    {p.telefone && (
                                      <a
                                        href={`https://wa.me/${p.telefone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 font-bold ml-1"
                                        title="Contactar al proveedor por WhatsApp"
                                      >
                                        <Phone size={10} />
                                        {p.telefone}
                                      </a>
                                    )}
                                  </div>
                                )}

                                {p.cif_nif && (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    CIF: <strong className="text-slate-700 dark:text-slate-300">{p.cif_nif}</strong>
                                  </span>
                                )}

                                {p.iban && (
                                  <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]" title={p.iban}>
                                    IBAN: {p.iban}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* LADO DIREITO: KPIs & Ações */}
                          <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                            <div className="text-left lg:text-right">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                Inmuebles
                              </span>
                              <span className="text-sm font-black text-purple-600 dark:text-purple-400 flex items-center lg:justify-end gap-1">
                                <Home size={14} />
                                {provAlojamentos.length} vinculados
                              </span>
                            </div>

                            <div className="text-left lg:text-right">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                Capacidad Total
                              </span>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {totalPlazasProv} plazas
                              </span>
                            </div>

                            <div className="text-left lg:text-right">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                {isPlataforma || (fijos.length === 0 && temporales.length > 0) ? 'Modalidad' : 'Alquiler Fijo'}
                              </span>
                              {isPlataforma || (fijos.length === 0 && temporales.length > 0) ? (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-block mt-0.5">
                                  Reservas Temporales
                                </span>
                              ) : fijos.length > 0 && temporales.length > 0 ? (
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  € {totalCustoFijo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">/ mes (+{temporales.length} temp.)</span>
                                </span>
                              ) : fijos.length > 0 ? (
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  € {totalCustoFijo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} <span className="text-[11px] font-normal opacity-80">/ mes</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">
                                  Sin inmuebles
                                </span>
                              )}
                            </div>

                            {/* Ações & Chevron */}
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setViewingProvedor(p)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                                title="Ver Ficha del Proveedor"
                              >
                                <Eye size={13} />
                                Ficha
                              </button>

                              <button
                                onClick={() => navigate(`/logistica/registros/provedores/editar/${p.id}`)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Editar Proveedor"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                onClick={() => toggleExpandProvedor(p.id)}
                                className={`p-1.5 rounded-xl transition-all ${
                                  isExpanded
                                    ? 'bg-purple-600 text-white rotate-180 shadow-xs'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                                title={isExpanded ? 'Recolher' : 'Expandir alojamientos vinculados'}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* CORPO EXPANDIDO (ACCORDION DE ALOJAMIENTOS VINCULADOS) */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            
                            {/* Barra de Título do Painel Interno */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <Home size={16} className="text-purple-600" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                  Alojamientos Vinculados a este Proveedor ({provAlojamentos.length} inmuebles)
                                </h4>
                              </div>

                              <button
                                onClick={() => navigate(`/logistica/registros/alojamentos/novo?provedor_id=${p.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs w-fit"
                              >
                                <Plus size={13} />
                                + Vincular Nuevo Alojamiento
                              </button>
                            </div>

                            {/* TABELA DE ALOJAMIENTOS VINCULADOS */}
                            {provAlojamentos.length === 0 ? (
                              <div className="p-8 bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                                <Building size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Este proveedor no tiene alojamientos vinculados todavía.
                                </p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                      <th className="px-4 py-2.5">Cód.</th>
                                      <th className="px-4 py-2.5">Inmueble / Dirección Completa</th>
                                      <th className="px-4 py-2.5">Modalidad</th>
                                      <th className="px-4 py-2.5">Ocupación / Plazas</th>
                                      <th className="px-4 py-2.5">Alquiler / Contrato</th>
                                      <th className="px-4 py-2.5">Estado</th>
                                      <th className="px-4 py-2.5 text-right">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {provAlojamentos.map(a => {
                                      const isActivo = a.ativo !== false && a.status !== 'Inactivo';
                                      const occupants = getOccupantsForAlojamento(a);
                                      const totalVagas = a.capacidade_pessoas || a.total_camas || 4;
                                      const pct = Math.round((occupants.length / totalVagas) * 100);

                                      return (
                                        <tr key={a.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-700/30 transition-colors">
                                          <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                            {a.codigo || 'AL-XXXX'}
                                          </td>

                                          <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{a.nome}</p>
                                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                              <MapPin size={11} className="text-rose-500 flex-shrink-0" />
                                              <span>{a.endereco_completo || a.endereco || `${a.municipio || ''}, ${a.provincia || ''}`}</span>
                                            </p>
                                            {a.latitude && a.longitude && (
                                              <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono mt-0.5"
                                              >
                                                <Globe size={10} />
                                                Maps: ({Number(a.latitude).toFixed(2)}, {Number(a.longitude).toFixed(2)})
                                              </a>
                                            )}
                                          </td>

                                          <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                              a.tipo_alojamento === 'Temporal'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                            }`}>
                                              {a.tipo_alojamento || 'Fijo'}
                                            </span>
                                          </td>

                                          <td className="px-4 py-3">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <Users size={12} className="text-blue-600" />
                                                <span>{occupants.length} / {totalVagas} ocupadas</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                                  occupants.length >= totalVagas
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                    : occupants.length > 0
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                }`}>
                                                  {pct}%
                                                </span>
                                              </div>
                                            </div>
                                          </td>

                                          <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                              € {Number(a.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} / mes
                                            </p>
                                            {a.contrato?.fianza_valor && (
                                              <span className="text-[10px] text-slate-400 block">
                                                Fianza: € {Number(a.contrato.fianza_valor).toLocaleString('es-ES')}
                                              </span>
                                            )}
                                          </td>

                                          <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                              isActivo
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                              {isActivo ? 'Activo' : 'Inactivo'}
                                            </span>
                                          </td>

                                          <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() => setViewingAlojamento(a)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                                                title="Ver Ficha del Alojamiento"
                                              >
                                                <Eye size={13} />
                                              </button>
                                              <button
                                                onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)}
                                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                                                title="Editar Alojamiento"
                                              >
                                                <Pencil size={13} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* RODAPÉ DO CARD DO PROVEDOR */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200/80 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                {p.email && (
                                  <span className="text-[11px] text-slate-500">
                                    Email: <strong className="text-slate-700 dark:text-slate-300">{p.email}</strong>
                                  </span>
                                )}
                                {p.observacoes && (
                                  <span className="text-[11px] text-slate-400 italic truncate max-w-md">
                                    "{p.observacoes}"
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Total Plazas: {totalPlazasProv}</span>
                                {totalCustoFijo > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] text-slate-400">Alquiler Fijo: € {totalCustoFijo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} / mes</span>
                                  </>
                                )}
                                {temporales.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] text-slate-400">{temporales.length} reservas temporales</span>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            
            /* VISTA DE TABELA COMPACTA DE PROVEEDORES */
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[480px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('nome_razao_social')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Proveedor / Razón Social
                        <ArrowUpDown size={12} className={sortField === 'nome_razao_social' ? 'text-purple-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('cif_nif')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        CIF / NIF
                        <ArrowUpDown size={12} className={sortField === 'cif_nif' ? 'text-purple-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3">Contacto / Teléfono</th>
                    <th className="px-4 py-3">Alojamientos Vinculados</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('municipio')}>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        Ubicación
                        <ArrowUpDown size={12} className={sortField === 'municipio' ? 'text-purple-600' : 'text-slate-400'} />
                      </div>
                    </th>
                    <th className="px-4 py-3">IBAN</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProvedores.length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">Ningún proveedor encontrado.</td></tr>
                  ) : (
                    filteredProvedores.map(p => {
                      const provAlojamentos = getAlojamentosForProvedor(p);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setViewingProvedor(p)}
                          className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:scale-105 transition-transform">
                                <Building size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{p.nome_razao_social}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                                    {p.codigo || 'PROV-XXXX'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{p.tipo_provedor || 'Inmobiliaria'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                            {p.cif_nif || '-'}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <div className="space-y-0.5">
                              <p className="font-medium">{p.contato_nome || '-'}</p>
                              {p.telefone && (
                                <a
                                  href={`https://wa.me/${p.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                                >
                                  <Phone size={11} />
                                  {p.telefone}
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold text-xs ${
                                provAlojamentos.length > 0
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              }`}>
                                <Home size={13} />
                                {provAlojamentos.length} inmuebles
                              </span>
                              {provAlojamentos.length > 0 && (
                                provAlojamentos.every(a => a.tipo_alojamento === 'Temporal') || p.nome_razao_social?.toLowerCase().includes('airbnb') || p.nome_razao_social?.toLowerCase().includes('booking') ? (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                                    Reservas Temporales
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">
                                    € {provAlojamentos.filter(a => a.tipo_alojamento !== 'Temporal').reduce((acc, curr) => acc + (Number(curr.valor_mensal) || 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} / mes
                                  </span>
                                )
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-slate-400" />
                              <span>{p.municipio || 'N/A'}{p.provincia ? `, ${p.provincia}` : ''}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                            {p.iban ? (
                              <span className="truncate max-w-[150px] inline-block">{p.iban}</span>
                            ) : '-'}
                          </td>

                          <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingProvedor(p)}
                                title="Ver Ficha"
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => navigate(`/logistica/registros/provedores/editar/${p.id}`)}
                                title="Editar"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ id: p.id, name: p.nome_razao_social, type: 'provedor' })}
                                title="Eliminar"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ASIGNAR TRABAJADOR A ESTE ALOJAMIENTO */}
      {/* ========================================================================= */}
      {assigningAlojamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignar Trabajador al Alojamiento
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-sm">
                    {assigningAlojamento.nome} ({assigningAlojamento.municipio})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAssigningAlojamento(null);
                  setSelectedAssignWorker(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {!selectedAssignWorker ? (
                <div className="space-y-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    1. Seleccione el Trabajador a Hospedar:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar colaborador por nombre o código (ej: E1497)..."
                      value={assignWorkerQuery}
                      onChange={e => setAssignWorkerQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {isSearchingAssign ? (
                      <div className="p-8 text-center text-slate-400">Buscando en la base de datos...</div>
                    ) : assignSearchResults.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">Ningún colaborador encontrado.</div>
                    ) : (
                      assignSearchResults.map((w: any) => (
                        <div
                          key={w.id}
                          onClick={() => setSelectedAssignWorker(w)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer flex justify-between items-center transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{w.Nombre || w.nombre}</p>
                            <p className="text-[11px] text-slate-400">{w.contratante || 'Empresa'} • {w.ubicacion || 'Obra'}</p>
                          </div>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600">
                            {w.Cod_colab || w.cod_colab}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{selectedAssignWorker.Nombre || selectedAssignWorker.nombre}</p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">{selectedAssignWorker.Cod_colab || selectedAssignWorker.cod_colab} • {selectedAssignWorker.contratante}</p>
                    </div>
                    <button
                      onClick={() => setSelectedAssignWorker(null)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Cama / Habitación:</label>
                    <select
                      value={assignCamaId}
                      onChange={e => setAssignCamaId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Cama --</option>
                      {camas
                        .filter(c => c.alojamento_id === assigningAlojamento.id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.identificador} ({c.tipo === 'dupla' ? 'Cama Doble' : 'Cama Individual'}) - {c.status === 'ocupada' ? '⚠ Ocupada' : '✓ Libre'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Check-in:</label>
                      <input
                        type="date"
                        value={assignDataInicio}
                        onChange={e => setAssignDataInicio(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Fin Prevista:</label>
                      <input
                        type="date"
                        value={assignDataFim}
                        onChange={e => setAssignDataFim(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Observaciones:</label>
                    <input
                      type="text"
                      value={assignObservacoes}
                      onChange={e => setAssignObservacoes(e.target.value)}
                      placeholder="Detalles de llegada o notas..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedAssignWorker && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setAssigningAlojamento(null);
                    setSelectedAssignWorker(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  disabled={!assignCamaId || isSubmittingAssign}
                  onClick={handleConfirmAssign}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmittingAssign ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHECK-OUT DE TRABAJADOR */}
      {/* ========================================================================= */}
      {checkingOutWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Procesar Check-out</h3>
                <p className="text-xs text-slate-500">Liberación de plaza e inspección de salida.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              ¿Desea registrar la salida de <strong className="text-slate-900 dark:text-white">{checkingOutWorker.workerNome}</strong> del alojamiento <strong className="text-slate-900 dark:text-white">{checkingOutWorker.alojamentoNome}</strong>? La plaza quedará libre inmediatamente.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Motivo del Check-out:</label>
                <select
                  value={motivoCheckout}
                  onChange={e => setMotivoCheckout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                >
                  <option value="Fin de Pedido / Obra">Fin de Pedido / Obra</option>
                  <option value="Reemplazo por Baja">Reemplazo por Baja Médica / Renuncia</option>
                  <option value="Cambio de Alojamiento">Cambio de Alojamiento / Reubicación</option>
                  <option value="Cancelación de Pedido">Cancelación de Pedido</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isSubmittingCheckout}
                onClick={() => setCheckingOutWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isSubmittingCheckout}
                onClick={handleConfirmCheckout}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <LogOut size={13} />
                {isSubmittingCheckout ? 'Procesando...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => fetchData()}
      />

      {/* MODAL VIEW ALOJAMIENTO COMPLETO */}
      {viewingAlojamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-2xl">
                  <Home size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                      {viewingAlojamento.codigo || 'AL-XXXX'}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {viewingAlojamento.nome}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">{viewingAlojamento.endereco || 'Dirección registrada'}</p>
                </div>
              </div>

              <button
                onClick={() => setViewingAlojamento(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Galeria de Fotos */}
              {viewingAlojamento.fotos && viewingAlojamento.fotos.length > 0 && (
                <div className="space-y-2">
                  <div className="relative h-64 bg-slate-950 rounded-2xl overflow-hidden">
                    <img
                      src={viewingAlojamento.fotos[activeViewPhotoIndex] || viewingAlojamento.fotos[0]}
                      alt="Alojamiento"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {viewingAlojamento.fotos.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveViewPhotoIndex(idx)}
                        className={`w-16 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                          activeViewPhotoIndex === idx ? 'border-blue-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações Gerais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Capacidad Total</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{viewingAlojamento.capacidade_pessoas} personas</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Camas Individual / Doble</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{viewingAlojamento.camas_individuais || 0} ind. / {viewingAlojamento.camas_duplas || 0} dob.</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Alquiler Mensual</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">€ {Number(viewingAlojamento.valor_mensal || 0).toLocaleString('es-ES')}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Modalidad</span>
                  <span className="text-base font-black text-blue-600">{viewingAlojamento.tipo_alojamento || 'Fijo'}</span>
                </div>
              </div>

              {/* Localização & GPS */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-rose-500" />
                  Dirección & Ubicación GPS
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-100">{viewingAlojamento.endereco || 'Dirección registrada'}</p>
                <p className="text-slate-500">{viewingAlojamento.municipio}, {viewingAlojamento.provincia} • CP: {viewingAlojamento.codigo_postal || 'N/A'}</p>
                
                {viewingAlojamento.latitude && viewingAlojamento.longitude && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      Coordenadas: {viewingAlojamento.latitude}, {viewingAlojamento.longitude}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${viewingAlojamento.latitude},${viewingAlojamento.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <ExternalLink size={12} />
                      Abrir en Google Maps
                    </a>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  const id = viewingAlojamento.id;
                  const name = viewingAlojamento.nome;
                  setViewingAlojamento(null);
                  setItemToDelete({ id, name, type: 'alojamento' });
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                Eliminar Inmueble
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingAlojamento(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    const id = viewingAlojamento.id;
                    setViewingAlojamento(null);
                    navigate(`/logistica/registros/alojamentos/editar/${id}`);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Pencil size={13} />
                  Editar Alojamiento
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL VIEW PROVEDOR */}
      {viewingProvedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-2xl">
                  <Building size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{viewingProvedor.nome_razao_social}</h3>
                  <p className="text-xs text-slate-500">{viewingProvedor.tipo_provedor || 'Proveedor Inmobiliario'}</p>
                </div>
              </div>
              <button onClick={() => setViewingProvedor(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>CIF/NIF:</strong> {viewingProvedor.cif_nif || '-'}</p>
              <p><strong>Contacto:</strong> {viewingProvedor.contato_nome || '-'} ({viewingProvedor.telefone || 'Sin teléfono'})</p>
              <p><strong>IBAN:</strong> {viewingProvedor.iban || '-'}</p>
              <p><strong>Dirección:</strong> {viewingProvedor.endereco || '-'}, {viewingProvedor.municipio}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setViewingProvedor(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">
                Cerrar
              </button>
              <button
                onClick={() => {
                  const id = viewingProvedor.id;
                  setViewingProvedor(null);
                  navigate(`/logistica/registros/provedores/editar/${id}`);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs"
              >
                Editar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Eliminación</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              ¿Está seguro de que desea eliminar <strong>{itemToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const Table2Icon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
  </svg>
);
