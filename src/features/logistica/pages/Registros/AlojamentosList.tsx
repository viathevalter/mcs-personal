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
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { logisticsService } from '../../services/logisticsService';
import { registrosService } from '../../services/registrosService';
import type { Alojamento, Provedor } from '../../services/logisticsService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modo de Exibição: Tabela vs Galeria
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');

  // Filtros Avançados
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
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

  // Ordenação
  const [sortField, setSortField] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [alojRes, provRes] = await Promise.allSettled([
        registrosService.fetchAlojamentos(),
        registrosService.fetchProvedores()
      ]);
      if (alojRes.status === 'fulfilled' && Array.isArray(alojRes.value)) {
        setAlojamentos(alojRes.value);
      }
      if (provRes.status === 'fulfilled' && Array.isArray(provRes.value)) {
        setProvedores(provRes.value);
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

  // Mapeamento de Contagem de Alojamentos por Provedor
  const alojamentosPorProvedorMap = useMemo(() => {
    const map = new Map<string, Alojamento[]>();
    alojamentos.forEach(a => {
      if (a.provedor_id) {
        const list = map.get(a.provedor_id) || [];
        list.push(a);
        map.set(a.provedor_id, list);
      }
    });
    return map;
  }, [alojamentos]);

  // Lista de Municípios Únicos para Filtro
  const municipiosList = useMemo(() => {
    const set = new Set<string>();
    alojamentos.forEach(a => {
      if (a.municipio && a.municipio.trim().length > 0) {
        set.add(a.municipio.trim());
      }
    });
    return Array.from(set).sort();
  }, [alojamentos]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAlojamentos = alojamentos.length;
    const activosAlojamentos = alojamentos.filter(a => a.ativo !== false && a.status !== 'Inactivo').length;
    const totalCapacidade = alojamentos.reduce((acc, a) => acc + (a.capacidade_pessoas || 0), 0);
    const totalCustoMensal = alojamentos.reduce((acc, a) => acc + (Number(a.valor_mensal) || 0), 0);
    const totalProveedores = provedores.length;

    return {
      totalAlojamentos,
      activosAlojamentos,
      totalCapacidade,
      totalCustoMensal,
      totalProveedores
    };
  }, [alojamentos, provedores]);

  // Filtragem e Ordenação com Activos primeiro
  const sortedAlojamentos = useMemo(() => {
    return [...alojamentos]
      .filter(a => {
        const search = (searchTerm || '').toLowerCase();
        const matchesSearch = !search || (
          (a.nome || a.titulo || '').toLowerCase().includes(search) ||
          (a.codigo || '').toLowerCase().includes(search) ||
          (a.endereco || '').toLowerCase().includes(search) ||
          (a.municipio || '').toLowerCase().includes(search) ||
          (a.provincia || '').toLowerCase().includes(search) ||
          (a.provedor?.nome_razao_social || '').toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        const isActivo = a.ativo !== false && a.status !== 'Inactivo';
        if (statusFilter === 'activos' && !isActivo) return false;
        if (statusFilter === 'inactivos' && isActivo) return false;

        if (tipoFilter !== 'todos') {
          const tAloj = (a.tipo_alojamento || 'Fijo').toLowerCase();
          if (tipoFilter === 'fijo' && !tAloj.includes('fij')) return false;
          if (tipoFilter === 'temporal' && !tAloj.includes('temp') && !tAloj.includes('air') && !tAloj.includes('hot')) return false;
        }

        if (selectedMunicipio !== 'todos' && a.municipio !== selectedMunicipio) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Regra: Activos primeiro
        const aActivo = a.ativo !== false && a.status !== 'Inactivo';
        const bActivo = b.ativo !== false && b.status !== 'Inactivo';
        if (aActivo && !bActivo) return -1;
        if (!aActivo && bActivo) return 1;

        let aVal = (a as any)[sortField] || '';
        let bVal = (b as any)[sortField] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [alojamentos, searchTerm, statusFilter, tipoFilter, selectedMunicipio, sortField, sortOrder]);

  const sortedProvedores = useMemo(() => {
    return [...provedores]
      .filter(p => {
        const search = (searchTerm || '').toLowerCase();
        if (!search) return true;
        return (
          (p.nome_razao_social || '').toLowerCase().includes(search) ||
          (p.nome_comercial || '').toLowerCase().includes(search) ||
          (p.contato_nome || '').toLowerCase().includes(search) ||
          (p.telefone || '').toLowerCase().includes(search) ||
          (p.iban || '').toLowerCase().includes(search) ||
          (p.municipio || '').toLowerCase().includes(search) ||
          (p.provincia || '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        let aVal = (a as any)[sortField] || '';
        let bVal = (b as any)[sortField] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [provedores, searchTerm, sortField, sortOrder]);

  return (
    <div className="w-full px-8 py-6 space-y-6">
      
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="text-blue-600" size={26} />
            Registros de Alojamientos & Proveedores
          </h1>
          <p className="text-sm text-slate-500">Gestión completa de inmuebles, modalidades de alquiler, plazas y proveedores</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800 shadow-2xs"
          >
            <Upload size={15} />
            Importar Plantilla
          </button>
          <button
            onClick={() => navigate('/logistica/registros/alojamentos/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus size={15} />
            Nuevo Alojamiento
          </button>
          <button
            onClick={() => navigate('/logistica/registros/provedores/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={15} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* KPIS NO TOPO */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: Total Alojamientos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Alojamientos</span>
            <Home size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.totalAlojamentos}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            {kpis.activosAlojamentos} activos en curso
          </span>
        </div>

        {/* KPI 2: Alojamientos Activos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Activos / En Curso</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {kpis.activosAlojamentos}
          </p>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium block">
            {kpis.totalAlojamentos > 0 ? Math.round((kpis.activosAlojamentos / kpis.totalAlojamentos) * 100) : 0}% de operatividad
          </span>
        </div>

        {/* KPI 3: Capacidad Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Capacidad Total</span>
            <Users size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.totalCapacidade} <span className="text-xs font-bold text-slate-400">plazas</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            Camas individuales & dobles
          </span>
        </div>

        {/* KPI 4: Coste Mensual Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alquiler Mensual Total</span>
            <DollarSign size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            € {kpis.totalCustoMensal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            Coste base de arrendamiento
          </span>
        </div>

        {/* KPI 5: Proveedores */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Proveedores</span>
            <Building size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {kpis.totalProveedores}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block">
            Inmobiliarias & Propietarios
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

                {/* Filtro Modalidad */}
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

                {/* Toggle Tabela / Galeria */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Vista de Tabla"
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('gallery')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'gallery'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Vista de Galería"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Input de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar nombre, ciudad, IBAN..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO DA LISTA DE ALOJAMIENTOS: TABELA OU GALERIA */}
        {/* ========================================================================= */}
        {activeTab === 'alojamentos' ? (
          isLoading ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs font-semibold">Cargando todos los alojamientos del sistema...</p>
            </div>
          ) : viewMode === 'gallery' ? (
            
            /* VISTA DE GALERIA (CARDS) */
            <div className="p-6">
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

                    return (
                      <div
                        key={a.id}
                        onClick={() => setViewingAlojamento(a)}
                        className="group bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                      >
                        {/* Imagem de Capa do Imóvel */}
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

                          {/* Badges Flutuantes */}
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

                          {/* Modalidade */}
                          <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600/90 text-white rounded-md backdrop-blur-md">
                              {a.tipo_alojamento || 'Fijo'}
                            </span>
                          </div>

                          {/* Preço Mensal no Canto Inferior */}
                          <div className="absolute bottom-3 left-3 text-white">
                            <p className="text-base font-black">
                              € {Number(a.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                              <span className="text-[11px] font-normal opacity-80"> / mes</span>
                            </p>
                          </div>
                        </div>

                        {/* Corpo do Card */}
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

                          {/* Informações de Vagas e Provedor */}
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                <Users size={13} />
                                {a.capacidade_pessoas} pax • {a.total_camas} camas
                              </span>
                              <span className="text-slate-400 text-[11px] truncate max-w-[120px]" title={a.provedor?.nome_razao_social}>
                                {a.provedor?.nome_razao_social || 'Sin proveedor'}
                              </span>
                            </div>
                          </div>

                          {/* Ações do Card */}
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
            
            /* VISTA DE TABELA DETALHADA */
            <div className="overflow-x-auto overflow-y-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('nome')}>
                      <div className="flex items-center gap-1">
                        Inmueble / Título
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('tipo_alojamento')}>
                      <div className="flex items-center gap-1">
                        Modalidad
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('valor_mensal')}>
                      <div className="flex items-center gap-1">
                        Alquiler / Coste
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('capacidade_pessoas')}>
                      <div className="flex items-center gap-1">
                        Capacidad
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('municipio')}>
                      <div className="flex items-center gap-1">
                        Ubicación
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortedAlojamentos.length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">Ningún alojamiento encontrado.</td></tr>
                  ) : (
                    sortedAlojamentos.map(a => {
                      const isActivo = a.ativo !== false && a.status !== 'Inactivo';

                      return (
                        <tr
                          key={a.id}
                          onClick={() => setViewingAlojamento(a)}
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold text-xs">
                              <Users size={13} />
                              {a.capacidade_pessoas} pax / {a.total_camas} camas
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
                                title="Editar Alojamiento"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ id: a.id, name: a.nome, type: 'alojamento' })}
                                title="Eliminar Alojamiento"
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
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
          /* ABA DE PROVEEDORES (COM CONTAGEM DE ALOJAMIENTOS VINCULADOS) */
          /* ========================================================================= */
          <div className="overflow-x-auto overflow-y-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('nome_razao_social')}>
                    <div className="flex items-center gap-1">
                      Proveedor / Razón Social
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Alojamientos Vinculados</th>
                  <th className="px-4 py-3">Responsable / Cargo</th>
                  <th className="px-4 py-3 text-emerald-600 font-bold">Teléfono / WhatsApp</th>
                  <th className="px-4 py-3">Datos Bancarios / IBAN</th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('municipio')}>
                    <div className="flex items-center gap-1">
                      Ubicación
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedProvedores.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-500">Ningún proveedor encontrado.</td></tr>
                ) : (
                  sortedProvedores.map(p => {
                    const principalContato = p.contatos?.[0];
                    const contatoNome = principalContato?.nome || p.contato_nome || '-';
                    const contatoCargo = principalContato?.cargo_tipo || 'Propietario';
                    const telefone = principalContato?.telefone || p.telefone;
                    const principalBanco = p.dados_bancarios?.[0];
                    const ibanPrincipal = principalBanco?.iban || p.iban;
                    const bancoNome = principalBanco?.banco || p.banco;
                    const qtdContas = p.dados_bancarios?.length || (p.iban ? 1 : 0);
                    const alojList = alojamentosPorProvedorMap.get(p.id) || [];

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
                                {p.cif_nif && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                                    {p.cif_nif}
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  p.tipo_pessoa === 'Persona Física'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                }`}>
                                  {p.tipo_pessoa || 'Persona Jurídica'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            alojList.length > 0
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          }`}>
                            <Home size={13} />
                            {alojList.length} {alojList.length === 1 ? 'inmueble' : 'inmuebles'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">{contatoNome}</p>
                          <p className="text-[11px] text-slate-400">{contatoCargo}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          {telefone ? (
                            <a
                              href={`https://wa.me/${telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs transition-colors shadow-2xs"
                              title="Abrir WhatsApp / Llamar"
                            >
                              <Phone size={13} className="text-emerald-600" />
                              <span>{telefone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal">Sin teléfono</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {ibanPrincipal ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{ibanPrincipal}</p>
                                <p className="text-[10px] text-slate-400">{bancoNome || 'Banco registrado'}</p>
                              </div>
                              <button
                                onClick={e => handleCopy(ibanPrincipal, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                                title="Copiar IBAN"
                              >
                                {copiedText === ibanPrincipal ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                              {qtdContas > 1 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  +{qtdContas - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Sin cuenta</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                            <span>{p.municipio || p.provincia || 'España'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingProvedor(p)}
                              title="Ver Proveedor"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/logistica/registros/provedores/editar/${p.id}`)}
                              title="Editar Proveedor"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ id: p.id, name: p.nome_razao_social, type: 'provedor' })}
                              title="Eliminar Proveedor"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
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
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO COMPLETA DE PROVEEDOR (COM SEUS ALOJAMIENTOS) */}
      {/* ========================================================================= */}
      {viewingProvedor && (() => {
        const provAlojamentos = alojamentosPorProvedorMap.get(viewingProvedor.id) || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header Modal */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-2xl">
                    <Building size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{viewingProvedor.nome_razao_social}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {viewingProvedor.cif_nif && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {viewingProvedor.cif_nif}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full font-semibold">
                        {viewingProvedor.tipo_pessoa || 'Persona Jurídica'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingProvedor(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                
                {/* 1. SEÇÃO DE ALOJAMIENTOS VINCULADOS A ESTE PROVEEDOR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Home size={14} className="text-blue-600" />
                      Inmuebles Vinculados a este Proveedor ({provAlojamentos.length})
                    </h3>
                  </div>

                  {provAlojamentos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {provAlojamentos.map(aloj => (
                        <div
                          key={aloj.id}
                          onClick={() => {
                            setViewingProvedor(null);
                            setViewingAlojamento(aloj);
                          }}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 cursor-pointer transition-all flex justify-between items-center group"
                        >
                          <div className="space-y-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-blue-600 transition-colors">
                              {aloj.nome}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin size={11} className="text-rose-500" />
                              {aloj.municipio || 'España'} • {aloj.capacidade_pessoas} plazas
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-emerald-600 block">
                              € {Number(aloj.valor_mensal || 0).toLocaleString('es-ES')}
                            </span>
                            <ChevronRight size={14} className="text-slate-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700">
                      No hay alojamientos asignados a este proveedor todavía.
                    </div>
                  )}
                </div>

                {/* 2. Contatos */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Phone size={14} className="text-blue-600" />
                    Contactos y Teléfonos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(viewingProvedor.contatos && viewingProvedor.contatos.length > 0 ? viewingProvedor.contatos : [
                      { nome: viewingProvedor.contato_nome || 'Responsable', cargo_tipo: 'Propietario', telefone: viewingProvedor.telefone, email: viewingProvedor.email }
                    ]).map((c, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{c.nome || 'Contacto'}</span>
                          <span className="text-xs text-slate-400">{c.cargo_tipo || 'Propietario'}</span>
                        </div>
                        {c.telefone && (
                          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                            <Phone size={13} />
                            <a href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                              {c.telefone}
                            </a>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mail size={13} />
                            <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Contas Bancárias */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard size={14} className="text-emerald-600" />
                    Cuentas Bancarias & Pagos ({viewingProvedor.dados_bancarios?.length || (viewingProvedor.iban ? 1 : 0)})
                  </h3>
                  <div className="space-y-3">
                    {(viewingProvedor.dados_bancarios && viewingProvedor.dados_bancarios.length > 0 ? viewingProvedor.dados_bancarios : [
                      { banco: viewingProvedor.banco, iban: viewingProvedor.iban, swift: viewingProvedor.swift, titular_conta: viewingProvedor.titular_conta, metodo_pago: viewingProvedor.metodo_pago, principal: true }
                    ]).map((b, i) => (
                      <div key={i} className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {b.banco || 'Banco Principal'}
                            {i === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Principal</span>}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded">
                            {b.metodo_pago || 'Transferir'}
                          </span>
                        </div>

                        {b.iban && (
                          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">IBAN / Cuenta</span>
                              <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{b.iban}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(b.iban!)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 rounded-md transition-colors"
                            >
                              {copiedText === b.iban ? <Check size={14} /> : <Copy size={14} />}
                              {copiedText === b.iban ? '¡Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Endereço */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <MapPin size={14} className="text-rose-600" />
                    Dirección & Ubicación Fiscal
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{viewingProvedor.endereco || 'Dirección no informada'}</p>
                    <p className="text-slate-500 text-xs">
                      {[
                        viewingProvedor.municipio,
                        viewingProvedor.provincia,
                        viewingProvedor.codigo_postal ? `CP: ${viewingProvedor.codigo_postal}` : null,
                        viewingProvedor.pais
                      ].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>

              </div>

              {/* Footer Modal Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <button
                  onClick={() => {
                    const id = viewingProvedor.id;
                    const name = viewingProvedor.nome_razao_social;
                    setViewingProvedor(null);
                    setItemToDelete({ id, name, type: 'provedor' });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar Proveedor
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingProvedor(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      const id = viewingProvedor.id;
                      setViewingProvedor(null);
                      navigate(`/logistica/registros/provedores/editar/${id}`);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Pencil size={13} />
                    Editar Proveedor
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO COMPLETA DE ALOJAMIENTO */}
      {/* ========================================================================= */}
      {viewingAlojamento && (() => {
        const comod = viewingAlojamento.comodidades || {};
        const sumin = viewingAlojamento.suministros || {};
        const cont = viewingAlojamento.contrato || (comod as any).__contrato || {};
        const rawFotos: string[] = viewingAlojamento.fotos && viewingAlojamento.fotos.length > 0
          ? viewingAlojamento.fotos
          : Array.isArray((comod as any).__fotos)
            ? (comod as any).__fotos
            : [];
        const currentPhoto = rawFotos[activeViewPhotoIndex] || rawFotos[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header Modal */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                    <Home size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {viewingAlojamento.nome}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        viewingAlojamento.ativo !== false && viewingAlojamento.status !== 'Inactivo'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {viewingAlojamento.status || (viewingAlojamento.ativo !== false ? 'Activo' : 'Inactivo')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {viewingAlojamento.codigo || 'AL-0001'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold">
                        {viewingAlojamento.tipo_alojamento || 'Fijo'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium">
                        {viewingAlojamento.classificacao || 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewingAlojamento(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                
                {/* 1. SEÇÃO DE FOTOS DO IMÓVEL */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-blue-600" />
                      Galería de Fotos del Inmueble ({rawFotos.length})
                    </span>
                    {rawFotos.length > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        Foto {activeViewPhotoIndex + 1} de {rawFotos.length}
                      </span>
                    )}
                  </div>

                  {rawFotos.length > 0 ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 group h-64 sm:h-80 flex items-center justify-center">
                        <img
                          src={currentPhoto}
                          alt="Foto del Alojamiento"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 cursor-pointer"
                          onClick={() => setZoomPhotoUrl(currentPhoto)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                        
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={() => setZoomPhotoUrl(currentPhoto)}
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-colors"
                            title="Ampliar Foto"
                          >
                            <Maximize2 size={16} />
                          </button>
                          <a
                            href={currentPhoto}
                            download={`alojamiento-foto-${activeViewPhotoIndex + 1}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-colors"
                            title="Descargar Imagen"
                          >
                            <Download size={16} />
                          </a>
                        </div>

                        <div className="absolute bottom-3 left-3 text-white text-xs font-semibold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg">
                          📸 {viewingAlojamento.nome}
                        </div>
                      </div>

                      {rawFotos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {rawFotos.map((f, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveViewPhotoIndex(idx)}
                              className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                activeViewPhotoIndex === idx
                                  ? 'border-blue-600 ring-2 ring-blue-600/30 scale-102'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={f} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-white dark:bg-slate-900/50">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
                        <ImageIcon size={24} />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Ninguna foto adjunta a este inmueble</p>
                      <p className="text-xs text-slate-400">
                        Puede hacer clic en <strong>Editar Alojamiento</strong> para cargar imágenes o pegar capturas con <strong>Ctrl + V</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. GRID PRINCIPAL: CAPACIDADE, LOCALIZAÇÃO & PROVEDOR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Capacidade e Camas */}
                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" />
                      Capacidad & Dormitorios
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Capacidad</span>
                        <span className="text-sm font-black text-blue-700 dark:text-blue-300">{viewingAlojamento.capacidade_pessoas} pax</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Dormitorios</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{viewingAlojamento.dormitorios || 0}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Total Camas</span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{viewingAlojamento.total_camas || 0}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Individuales</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.camas_individuais || 0}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Dobles</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.camas_duplas || 0}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Baños</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.banheiros || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Proveedor & Localização */}
                  <div className="space-y-3">
                    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Building size={13} />
                          Proveedor Vinculado
                        </span>
                        {viewingAlojamento.provedor?.codigo && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 rounded">
                            {viewingAlojamento.provedor.codigo}
                          </span>
                        )}
                      </div>
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">
                        {viewingAlojamento.provedor?.nome_razao_social || 'Proveedor no especificado'}
                      </p>
                      {viewingAlojamento.provedor?.telefone && (
                        <a
                          href={`https://wa.me/${viewingAlojamento.provedor.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline pt-0.5"
                        >
                          <Phone size={13} />
                          {viewingAlojamento.provedor.telefone}
                        </a>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} />
                        Ubicación Completa
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        {viewingAlojamento.endereco || 'Dirección no registrada'}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {[
                          viewingAlojamento.municipio,
                          viewingAlojamento.provincia,
                          viewingAlojamento.codigo_postal ? `CP: ${viewingAlojamento.codigo_postal}` : null,
                          viewingAlojamento.pais || 'España'
                        ].filter(Boolean).join(' • ')}
                      </p>

                      {/* Coordenadas GPS & Link Google Maps */}
                      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Globe size={13} className="text-blue-600" />
                          <span className="font-mono font-bold text-[11px]">
                            {viewingAlojamento.latitude && viewingAlojamento.longitude
                              ? `${Number(viewingAlojamento.latitude).toFixed(5)}, ${Number(viewingAlojamento.longitude).toFixed(5)}`
                              : 'Coordenadas disponibles'}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${viewingAlojamento.latitude || viewingAlojamento.endereco},${viewingAlojamento.longitude || viewingAlojamento.municipio}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                        >
                          <ExternalLink size={11} />
                          Abrir en Maps
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. COMODIDADES & SUPRIMENTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Comodidades del Inmueble
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'wifi', label: 'Wi-Fi', icon: Wifi },
                        { key: 'aire_acondicionado', label: 'Aire acondicionado', icon: Snowflake },
                        { key: 'parking', label: 'Parking', icon: Car },
                        { key: 'cocina', label: 'Cocina', icon: UtensilsCrossed },
                        { key: 'calefaccion', label: 'Calefacción', icon: Flame },
                        { key: 'lavadora', label: 'Lavadora', icon: Shirt },
                        { key: 'tv', label: 'TV', icon: Tv },
                        { key: 'ascensor', label: 'Ascensor', icon: ArrowUpCircle },
                      ].map(item => {
                        const active = !!comod[item.key];
                        const Icon = item.icon;
                        return (
                          <span
                            key={item.key}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                            }`}
                          >
                            <Icon size={13} />
                            {item.label}
                            {active ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets size={14} className="text-cyan-500" />
                      Suministros a Pagar / Incluidos
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'internet', label: 'Internet', icon: Globe },
                        { key: 'agua', label: 'Agua', icon: Droplets },
                        { key: 'luz', label: 'Luz', icon: Zap },
                        { key: 'gas', label: 'Gas', icon: Flame },
                        { key: 'limpieza', label: 'Limpieza', icon: Shirt },
                        { key: 'otros', label: 'Otros Gastos', icon: Info },
                      ].map(item => {
                        const active = !!sumin[item.key];
                        const Icon = item.icon;
                        return (
                          <span
                            key={item.key}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              active
                                ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                            }`}
                          >
                            <Icon size={13} />
                            {item.label}
                            {active ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. CONTRATO & CONDIÇÕES FINANCEIRAS */}
                <div className="p-5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/60 pb-3">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={15} />
                      Contrato & Condiciones Financieras
                    </span>
                    {cont.codigo && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-md">
                        {cont.codigo}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Modalidad</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cont.tipo_contrato || viewingAlojamento.tipo_alojamento || 'Fijo'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Alquiler / Coste Mensual</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        € {(viewingAlojamento.valor_mensal || cont.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fianza / Depósito</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cont.tem_fianza || Number(cont.fianza_valor) > 0
                          ? `€ ${Number(cont.fianza_valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${cont.fianza_meses || 1}m)`
                          : 'Sin Fianza (Airbnb/Hotel)'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vencimiento</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Día {cont.dia_vencimento || 5} del mes
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Modal Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
                <button
                  onClick={() => {
                    const id = viewingAlojamento.id;
                    const name = viewingAlojamento.nome;
                    setViewingAlojamento(null);
                    setItemToDelete({ id, name, type: 'alojamento' });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar Alojamiento
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingAlojamento(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      const alojId = viewingAlojamento.id;
                      setViewingAlojamento(null);
                      navigate(`/logistica/registros/alojamentos/editar/${alojId}`);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                  >
                    <Pencil size={14} />
                    Editar Alojamiento
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE ZOOM DE FOTO */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={zoomPhotoUrl} alt="Zoom Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <a
              href={zoomPhotoUrl}
              download="alojamento-foto.jpg"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-4 py-2 bg-black/70 hover:bg-black/90 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Download size={14} />
              Descargar Foto Original
            </a>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Eliminación</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              ¿Está seguro de que desea eliminar el {itemToDelete.type === 'provedor' ? 'proveedor' : 'alojamiento'}{' '}
              <strong className="text-slate-900 dark:text-white">{itemToDelete.name}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};
