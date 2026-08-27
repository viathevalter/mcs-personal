import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  Home,
  Building,
  Building2,
  UserPlus,
  RefreshCw,
  LogOut,
  Sparkles,
  AlertTriangle,
  Calendar,
  Bed,
  Check,
  UserCheck,
  Phone,
  Briefcase,
  X,
  Plus,
  Trash2,
  Layers,
  Lock,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  SlidersHorizontal,
  Mail,
  User,
  Download,
  FileSpreadsheet,
  Globe,
  Tag,
  DollarSign,
  CalendarDays,
  Hotel
} from 'lucide-react';
import { logisticsService } from '../services/logisticsService';
import type {
  Alojamento,
  Cama,
  PedidoDemandaLogistica,
  TrabalhadorDemandaItem,
  TrabalhadorAlojado
} from '../services/logisticsService';
import { ExportLogisticaDialog, ExportColumnDef } from '../components/ExportLogisticaDialog';

const MESES_NOMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DemandasAlocacaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandas' | 'alojados' | 'propio' | 'cliente'>('demandas');
  const [pedidos, setPedidos] = useState<PedidoDemandaLogistica[]>([]);
  const [alojados, setAlojados] = useState<TrabalhadorAlojado[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [camasDisponiveis, setCamasDisponiveis] = useState<Cama[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros de Pedidos (Aba 1)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'alojados'>('todos');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);

  // Filtros de Alojamientos de la Empresa (Aba 2)
  const [alojadosSearch, setAlojadosSearch] = useState('');
  const [alojadosEmpresaFilter, setAlojadosEmpresaFilter] = useState('todas');

  // Filtros e Mês de Referência para Alojamiento Propio (Aba 3)
  const [propioYear, setPropioYear] = useState<number>(2026);
  const [propioMonth, setPropioMonth] = useState<number>(8); // Agosto (1-12)
  const [propioSearch, setPropioSearch] = useState('');
  const [propioEmpresaFilter, setPropioEmpresaFilter] = useState('todas');
  const [propioStatusFilter, setPropioStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Filtros para Alojamiento por Cliente (Aba 4)
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteEmpresaFilter, setClienteEmpresaFilter] = useState('todas');

  // Seleção Múltipla para Alocação em Lote
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchAlojamentoId, setBatchAlojamentoId] = useState('');
  const [isAllocatingBatch, setIsAllocatingBatch] = useState(false);

  // Modal Alocação Individual
  const [allocatingWorker, setAllocatingWorker] = useState<{
    worker: TrabalhadorDemandaItem;
    pedido: PedidoDemandaLogistica;
  } | null>(null);
  const [singleAlojamentoId, setSingleAlojamentoId] = useState('');
  const [singleCamaId, setSingleCamaId] = useState('');
  const [singleDataInicio, setSingleDataInicio] = useState('');
  const [singleDataFim, setSingleDataFim] = useState('');
  const [singleObservacoes, setSingleObservacoes] = useState('');
  const [isAllocatingSingle, setIsAllocatingSingle] = useState(false);

  // Modal Registro de Alojamiento Propio
  const [isPropioModalOpen, setIsPropioModalOpen] = useState(false);
  const [propioWorkerQuery, setPropioWorkerQuery] = useState('');
  const [propioSearchResults, setPropioSearchResults] = useState<any[]>([]);
  const [isSearchingPropio, setIsSearchingPropio] = useState(false);
  const [selectedPropioWorker, setSelectedPropioWorker] = useState<any | null>(null);
  const [propioClienteNome, setPropioClienteNome] = useState('');
  const [propioObraNome, setPropioObraNome] = useState('');
  const [propioEmpresa, setPropioEmpresa] = useState('LUMINOUS');
  const [propioDataInicio, setPropioDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [propioDataFim, setPropioDataFim] = useState('');
  const [propioObservacoes, setPropioObservacoes] = useState('Alojamiento Propio / Por cuenta propia');

  // Modal Asignación Directa de Trabalhador Avulso (Busca no Banco)
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingWorkers, setIsSearchingWorkers] = useState(false);
  const [selectedRealWorker, setSelectedRealWorker] = useState<any | null>(null);
  const [directAlojamentoId, setDirectAlojamentoId] = useState('');
  const [directCamaId, setDirectCamaId] = useState('');
  const [directDataInicio, setDirectDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [directDataFim, setDirectDataFim] = useState('');
  const [directObservacoes, setDirectObservacoes] = useState('');

  // Check-out Modal
  const [checkingOutWorker, setCheckingOutWorker] = useState<{
    alocacaoId: string;
    workerNome: string;
    alojamentoNome: string;
  } | null>(null);
  const [motivoCheckout, setMotivoCheckout] = useState<string>('Fin de Pedido / Obra');
  const [dataSaidaEfetiva, setDataSaidaEfetiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pedidosData, alojadosData, alojData, camasData] = await Promise.all([
        logisticsService.fetchDemandasPorPedido(),
        logisticsService.fetchTrabalhadoresAlojados(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchCamas()
      ]);

      setPedidos(pedidosData);
      setAlojados(alojadosData);
      setAlojamentos(alojData);
      setCamasDisponiveis(camasData.filter(c => c.status === 'livre'));

      // Se nenhum selecionado e houver pedidos, seleciona o primeiro
      if (pedidosData.length > 0 && !selectedPedidoId) {
        setSelectedPedidoId(pedidosData[0].pedido_id);
      }
    } catch (err) {
      console.error('Error al cargar datos de logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Busca rápida de colaboradores no banco para modal direto
  useEffect(() => {
    if (!isDirectModalOpen) return;
    const timer = setTimeout(async () => {
      setIsSearchingWorkers(true);
      try {
        const results = await logisticsService.searchTrabalhadores(workerSearchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingWorkers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [workerSearchQuery, isDirectModalOpen]);

  // Busca rápida de colaboradores no banco para Alojamento Próprio
  useEffect(() => {
    if (!isPropioModalOpen) return;
    const timer = setTimeout(async () => {
      setIsSearchingPropio(true);
      try {
        const results = await logisticsService.searchTrabalhadores(propioWorkerQuery);
        setPropioSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingPropio(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [propioWorkerQuery, isPropioModalOpen]);

  // Navegação de Mês para Alojamento Próprio
  const handlePrevMonth = () => {
    if (propioMonth === 1) {
      setPropioMonth(12);
      setPropioYear(prev => prev - 1);
    } else {
      setPropioMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (propioMonth === 12) {
      setPropioMonth(1);
      setPropioYear(prev => prev + 1);
    } else {
      setPropioMonth(prev => prev + 1);
    }
  };

  // Pedido atualmente selecionado
  const selectedPedido = useMemo(() => {
    if (!selectedPedidoId) return pedidos[0] || null;
    return pedidos.find(p => p.pedido_id === selectedPedidoId) || pedidos[0] || null;
  }, [pedidos, selectedPedidoId]);

  // Pedidos Filtrados na Coluna Esquerda
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        p.cliente_nome.toLowerCase().includes(q) ||
        p.pedido_codigo.toLowerCase().includes(q) ||
        p.empresa_contratante.toLowerCase().includes(q) ||
        p.obra_nome.toLowerCase().includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.trabalhadores.some(t => t.worker_nome.toLowerCase().includes(q) || t.codigo_colab.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (filterStatus === 'pendentes') return p.total_pendentes_alojamento > 0;
      if (filterStatus === 'alojados') return p.total_pendentes_alojamento === 0 && p.total_alojados > 0;
      return true;
    });
  }, [pedidos, searchTerm, filterStatus]);

  // Categorias de Trabalhadores Alojados
  const empresaAlojadosRaw = useMemo(() => {
    return alojados.filter(a => a.tipo_alojamento !== 'Propio' && a.tipo_alojamento !== 'Cliente');
  }, [alojados]);

  const propioAlojadosRaw = useMemo(() => {
    return alojados.filter(a => a.tipo_alojamento === 'Propio' || a.status === 'Alojamiento Propio');
  }, [alojados]);

  const clienteAlojadosRaw = useMemo(() => {
    return alojados.filter(a => a.tipo_alojamento === 'Cliente' || a.status === 'Alojamiento Cliente');
  }, [alojados]);

  // Trabalhadores Alojados em Imóveis da Empresa Filtrados (Aba 2)
  const filteredAlojadosEmpresa = useMemo(() => {
    return empresaAlojadosRaw.filter(a => {
      const q = alojadosSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        a.worker_nome.toLowerCase().includes(q) ||
        a.codigo_colab.toLowerCase().includes(q) ||
        a.cliente_nome.toLowerCase().includes(q) ||
        a.obra_nome.toLowerCase().includes(q) ||
        a.alojamento_nome.toLowerCase().includes(q) ||
        a.municipio.toLowerCase().includes(q) ||
        (a.empresa_contratante && a.empresa_contratante.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (alojadosEmpresaFilter !== 'todas' && a.empresa_contratante?.toLowerCase() !== alojadosEmpresaFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [empresaAlojadosRaw, alojadosSearch, alojadosEmpresaFilter]);

  // Função para Cálculo Proporcional Mensal de Alojamento Próprio (€ 300 base)
  const calculateProporcionalPropio = (checkinStr?: string, checkoutStr?: string, year: number = 2026, month: number = 8) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const mStart = new Date(year, month - 1, 1);
    const mEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59);

    const wStart = checkinStr ? new Date(checkinStr + 'T00:00:00') : new Date('2026-01-01T00:00:00');
    const wEnd = checkoutStr ? new Date(checkoutStr + 'T23:59:59') : null;

    // Se trabalhador começou depois do fim do mês ou terminou antes do início do mês
    if (wStart > mEnd || (wEnd && wEnd < mStart)) {
      return {
        diasAtivos: 0,
        totalDiasMes: daysInMonth,
        valorBase: 300,
        valorProporcional: 0,
        isAtivoNoMes: false,
        periodoTexto: 'Inactivo en el mes'
      };
    }

    const effStart = wStart < mStart ? mStart : wStart;
    const effEnd = (!wEnd || wEnd > mEnd) ? mEnd : wEnd;

    const diffMs = effEnd.getTime() - effStart.getTime();
    const diasAtivos = Math.min(daysInMonth, Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1));

    let valorProporcional = 300;
    if (diasAtivos < daysInMonth) {
      valorProporcional = Math.round((diasAtivos / daysInMonth) * 300 * 100) / 100;
    }

    return {
      diasAtivos,
      totalDiasMes: daysInMonth,
      valorBase: 300,
      valorProporcional,
      isAtivoNoMes: true,
      periodoTexto: diasAtivos === daysInMonth ? `Mes Completo (${daysInMonth} d)` : `${diasAtivos} / ${daysInMonth} días`
    };
  };

  // Trabalhadores com Alojamento Próprio com Cálculo Mensal (Aba 3)
  const filteredPropriosCalculated = useMemo(() => {
    return propioAlojadosRaw.map(a => {
      const calc = calculateProporcionalPropio(a.data_checkin, a.data_checkout_prevista, propioYear, propioMonth);
      return { ...a, calc };
    }).filter(a => {
      const q = propioSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        a.worker_nome.toLowerCase().includes(q) ||
        a.codigo_colab.toLowerCase().includes(q) ||
        a.cliente_nome.toLowerCase().includes(q) ||
        a.obra_nome.toLowerCase().includes(q) ||
        a.municipio.toLowerCase().includes(q) ||
        (a.empresa_contratante && a.empresa_contratante.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (propioEmpresaFilter !== 'todas' && a.empresa_contratante?.toLowerCase() !== propioEmpresaFilter.toLowerCase()) {
        return false;
      }

      if (propioStatusFilter === 'activos' && !a.calc.isAtivoNoMes) return false;
      if (propioStatusFilter === 'inactivos' && a.calc.isAtivoNoMes) return false;

      return true;
    });
  }, [propioAlojadosRaw, propioYear, propioMonth, propioSearch, propioEmpresaFilter, propioStatusFilter]);

  // Totais do Mês para Alojamento Próprio
  const propiosMonthTotals = useMemo(() => {
    const totalRegistrados = propioAlojadosRaw.length;
    const activosNoMes = filteredPropriosCalculated.filter(p => p.calc.isAtivoNoMes).length;
    const totalAPagar = filteredPropriosCalculated.reduce((acc, p) => acc + p.calc.valorProporcional, 0);
    return { totalRegistrados, activosNoMes, totalAPagar };
  }, [propioAlojadosRaw, filteredPropriosCalculated]);

  // Trabalhadores em Alojamento por Cliente Filtrados (Aba 4)
  const filteredClienteAlojados = useMemo(() => {
    return clienteAlojadosRaw.filter(a => {
      const q = clienteSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        a.worker_nome.toLowerCase().includes(q) ||
        a.codigo_colab.toLowerCase().includes(q) ||
        a.cliente_nome.toLowerCase().includes(q) ||
        a.obra_nome.toLowerCase().includes(q) ||
        a.alojamento_nome.toLowerCase().includes(q) ||
        a.municipio.toLowerCase().includes(q) ||
        (a.empresa_contratante && a.empresa_contratante.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (clienteEmpresaFilter !== 'todas' && a.empresa_contratante?.toLowerCase() !== clienteEmpresaFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [clienteAlojadosRaw, clienteSearch, clienteEmpresaFilter]);

  // Contadores globais
  const totalPedidosPendentes = useMemo(() => {
    return pedidos.filter(p => p.total_pendentes_alojamento > 0).length;
  }, [pedidos]);

  const totalTrabalhadoresPendentes = useMemo(() => {
    return pedidos.reduce((acc, p) => acc + p.total_pendentes_alojamento, 0);
  }, [pedidos]);

  // Empresas Únicas para Filtro
  const empresasList = useMemo(() => {
    const set = new Set<string>();
    alojados.forEach(a => {
      if (a.empresa_contratante) set.add(a.empresa_contratante);
    });
    return Array.from(set).sort();
  }, [alojados]);

  // Colunas de Exportação para Excel (.xlsx)
  const exportColumnsPropio: ExportColumnDef[] = [
    { id: 'codigo_colab', label: 'Cód. Colaborador' },
    { id: 'worker_nome', label: 'Nombre Trabajador' },
    { id: 'worker_movil', label: 'Teléfono / Móvil' },
    { id: 'empresa_contratante', label: 'Empresa Contratante' },
    { id: 'cliente_nome', label: 'Cliente' },
    { id: 'obra_nome', label: 'Obra / Ubicación' },
    { id: 'municipio', label: 'Localidad' },
    { id: 'mes_referencia', label: 'Mes Referencia' },
    { id: 'data_checkin', label: 'Fecha Inicio' },
    { id: 'data_checkout_prevista', label: 'Fecha Fin / Salida' },
    { id: 'dias_activos', label: 'Días Activos en Mes' },
    { id: 'total_dias_mes', label: 'Días del Mes' },
    { id: 'valor_base', label: 'Base Mensual (€)' },
    { id: 'valor_proporcional', label: 'Importe a Pagar (€)' },
    { id: 'status', label: 'Estado' }
  ];

  const exportColumnsEmpresa: ExportColumnDef[] = [
    { id: 'codigo_colab', label: 'Cód. Colaborador' },
    { id: 'worker_nome', label: 'Nombre Trabajador' },
    { id: 'worker_movil', label: 'Teléfono / Móvil' },
    { id: 'empresa_contratante', label: 'Empresa Contratante' },
    { id: 'cliente_nome', label: 'Cliente' },
    { id: 'obra_nome', label: 'Obra / Proyecto' },
    { id: 'pedido_codigo', label: 'Pedido Comercial' },
    { id: 'alojamento_codigo', label: 'Cód. Alojamiento' },
    { id: 'alojamento_nome', label: 'Nombre Alojamiento' },
    { id: 'cama_identificador', label: 'Habitación / Cama' },
    { id: 'municipio', label: 'Municipio' },
    { id: 'provincia', label: 'Provincia' },
    { id: 'tipo_alojamento', label: 'Modalidad' },
    { id: 'data_checkin', label: 'Fecha Entrada' },
    { id: 'data_checkout_prevista', label: 'Fecha Fin Prevista' },
    { id: 'status', label: 'Estado' }
  ];

  const exportColumnsCliente: ExportColumnDef[] = [
    { id: 'codigo_colab', label: 'Cód. Colaborador' },
    { id: 'worker_nome', label: 'Nombre Trabajador' },
    { id: 'worker_movil', label: 'Teléfono / Móvil' },
    { id: 'empresa_contratante', label: 'Empresa Contratante' },
    { id: 'cliente_nome', label: 'Cliente' },
    { id: 'obra_nome', label: 'Obra / Ubicación' },
    { id: 'alojamento_nome', label: 'Alojamiento / Hotel del Cliente' },
    { id: 'municipio', label: 'Localidad' },
    { id: 'data_checkin', label: 'Fecha Inicio' },
    { id: 'data_checkout_prevista', label: 'Fecha Fin Prevista' },
    { id: 'status', label: 'Estado' }
  ];

  // Exportar Listagem para Planilha Excel (CSV com BOM)
  const exportToExcel = (dataToExport: TrabalhadorAlojado[], filename: string) => {
    const headers = [
      'Código Colaborador',
      'Nombre Trabajador',
      'Empresa Contratante',
      'Cliente',
      'Obra / Ubicación',
      'Pedido',
      'Alojamiento',
      'Habitación / Cama',
      'Municipio',
      'Provincia',
      'Tipo Alojamiento',
      'Estado',
      'Fecha Inicio (Check-in)',
      'Fecha Fin Prevista'
    ];

    const rows = dataToExport.map(a => [
      a.codigo_colab,
      `"${a.worker_nome.replace(/"/g, '""')}"`,
      `"${(a.empresa_contratante || 'LUMINOUS').replace(/"/g, '""')}"`,
      `"${(a.cliente_nome || '').replace(/"/g, '""')}"`,
      `"${(a.obra_nome || '').replace(/"/g, '""')}"`,
      `"${(a.pedido_codigo || '').replace(/"/g, '""')}"`,
      `"${(a.alojamento_nome || '').replace(/"/g, '""')}"`,
      `"${(a.cama_identificador || '').replace(/"/g, '""')}"`,
      `"${(a.municipio || '').replace(/"/g, '""')}"`,
      `"${(a.provincia || '').replace(/"/g, '""')}"`,
      `"${(a.tipo_alojamento || 'Fijo').replace(/"/g, '""')}"`,
      `"${(a.status || 'Activo').replace(/"/g, '""')}"`,
      a.data_checkin || '',
      a.data_checkout_prevista || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Abrir modal de alocação individual
  const handleOpenSingleAlloc = (worker: TrabalhadorDemandaItem, pedido: PedidoDemandaLogistica) => {
    setAllocatingWorker({ worker, pedido });
    setSingleDataInicio(worker.data_inicio || pedido.data_inicio || new Date().toISOString().split('T')[0]);
    setSingleDataFim(worker.data_fim || pedido.data_fim || '');
    setSingleObservacoes(`Alocación Pedido ${pedido.pedido_codigo} - ${pedido.cliente_nome}`);
    
    // Tenta pré-selecionar alojamento da mesma cidade se existir
    const matchingAloj = alojamentos.find(a => 
      a.municipio?.toLowerCase().includes(pedido.cidade.toLowerCase()) ||
      pedido.cidade.toLowerCase().includes(a.municipio?.toLowerCase() || '')
    );
    if (matchingAloj) {
      setSingleAlojamentoId(matchingAloj.id);
      const firstBed = camasDisponiveis.find(c => c.alojamento_id === matchingAloj.id);
      if (firstBed) setSingleCamaId(firstBed.id);
    } else {
      setSingleAlojamentoId(alojamentos[0]?.id || '');
      const firstBed = camasDisponiveis.find(c => c.alojamento_id === alojamentos[0]?.id);
      if (firstBed) setSingleCamaId(firstBed.id);
    }
  };

  // Confirmar Alocação Individual
  const handleConfirmSingleAlloc = async () => {
    if (!allocatingWorker) return;

    // Opção: Alocar como Alojamento Próprio
    if (singleAlojamentoId === 'propio') {
      try {
        setIsAllocatingSingle(true);
        await logisticsService.registrarAlojamentoPropio({
          worker_id: allocatingWorker.worker.worker_id,
          worker_nome: allocatingWorker.worker.worker_nome,
          codigo_colab: allocatingWorker.worker.codigo_colab,
          cliente_nome: allocatingWorker.pedido.cliente_nome,
          obra_nome: allocatingWorker.pedido.obra_nome,
          pedido_id: allocatingWorker.pedido.pedido_id,
          pedido_codigo: allocatingWorker.pedido.pedido_codigo,
          data_inicio: singleDataInicio,
          data_fim: singleDataFim,
          empresa_contratante: allocatingWorker.pedido.empresa_contratante,
          observacoes: singleObservacoes || 'Alojamiento Propio'
        });
        setAllocatingWorker(null);
        await loadData();
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setIsAllocatingSingle(false);
      }
      return;
    }

    if (!singleAlojamentoId || !singleCamaId) {
      alert('Por favor, seleccione un alojamiento y una cama disponible.');
      return;
    }

    try {
      setIsAllocatingSingle(true);
      await logisticsService.alocarTrabalhador({
        cama_id: singleCamaId,
        alojamento_id: singleAlojamentoId,
        worker_id: allocatingWorker.worker.worker_id,
        worker_nome: allocatingWorker.worker.worker_nome,
        codigo_colab: allocatingWorker.worker.codigo_colab,
        cliente_nome: allocatingWorker.pedido.cliente_nome,
        obra_nome: allocatingWorker.pedido.obra_nome,
        pedido_id: allocatingWorker.pedido.pedido_id,
        pedido_codigo: allocatingWorker.pedido.pedido_codigo,
        data_inicio: singleDataInicio,
        data_fim: singleDataFim,
        observacoes: singleObservacoes
      });

      setAllocatingWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al asignar el alojamiento: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsAllocatingSingle(false);
    }
  };

  // Abrir Modal de Alocação em Lote
  const handleOpenBatchAlloc = () => {
    if (selectedWorkerIds.length === 0) {
      alert('Seleccione al menos un trabajador para asignar en lote.');
      return;
    }
    if (selectedPedido) {
      const matchCity = alojamentos.find(a => 
        a.municipio?.toLowerCase().includes(selectedPedido.cidade.toLowerCase())
      );
      setBatchAlojamentoId(matchCity?.id || alojamentos[0]?.id || '');
    }
    setIsBatchModalOpen(true);
  };

  // Confirmar Alocação em Lote
  const handleConfirmBatchAlloc = async () => {
    if (!selectedPedido || !batchAlojamentoId) return;

    const camasLivresDoAloj = camasDisponiveis.filter(c => c.alojamento_id === batchAlojamentoId);
    if (camasLivresDoAloj.length < selectedWorkerIds.length) {
      alert(`El alojamiento seleccionado solo tiene ${camasLivresDoAloj.length} camas libres, pero ha seleccionado ${selectedWorkerIds.length} trabajadores.`);
      return;
    }

    try {
      setIsAllocatingBatch(true);
      const itemsToAlloc = selectedWorkerIds.map((wId, idx) => {
        const w = selectedPedido.trabalhadores.find(t => t.worker_id === wId)!;
        return {
          worker_id: w.worker_id,
          worker_nome: w.worker_nome,
          codigo_colab: w.codigo_colab,
          cama_id: camasLivresDoAloj[idx].id
        };
      });

      await logisticsService.alocarGrupoEmAlojamento(itemsToAlloc, batchAlojamentoId, {
        pedido_id: selectedPedido.pedido_id,
        pedido_codigo: selectedPedido.pedido_codigo,
        cliente_nome: selectedPedido.cliente_nome,
        obra_nome: selectedPedido.obra_nome,
        data_inicio: selectedPedido.data_inicio,
        data_fim: selectedPedido.data_fim,
        observacoes: `Asignación en Lote - Pedido ${selectedPedido.pedido_codigo}`
      });

      setSelectedWorkerIds([]);
      setIsBatchModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error en la asignación en lote: ' + err.message);
    } finally {
      setIsAllocatingBatch(false);
    }
  };

  // Confirmar Alocação Direta Avulsa (Modal Azul)
  const handleConfirmDirectAlloc = async () => {
    if (!selectedRealWorker || !directAlojamentoId || !directCamaId) {
      alert('Por favor, seleccione el colaborador, el alojamiento y la cama.');
      return;
    }

    try {
      await logisticsService.alocarTrabalhador({
        cama_id: directCamaId,
        alojamento_id: directAlojamentoId,
        worker_id: selectedRealWorker.id,
        worker_nome: selectedRealWorker.Nombre || selectedRealWorker.nombre,
        codigo_colab: selectedRealWorker.Cod_colab || selectedRealWorker.cod_colab,
        cliente_nome: selectedRealWorker.contratante || 'Cliente Principal',
        obra_nome: selectedRealWorker.ubicacion || 'Obra',
        data_inicio: directDataInicio,
        data_fim: directDataFim,
        observacoes: directObservacoes
      });

      setIsDirectModalOpen(false);
      setSelectedRealWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al asignar el trabajador: ' + err.message);
    }
  };

  // Confirmar Registro de Alojamiento Propio
  const handleConfirmPropio = async () => {
    if (!selectedPropioWorker) {
      alert('Por favor, seleccione un colaborador.');
      return;
    }

    try {
      await logisticsService.registrarAlojamentoPropio({
        worker_id: selectedPropioWorker.id,
        worker_nome: selectedPropioWorker.Nombre || selectedPropioWorker.nombre,
        codigo_colab: selectedPropioWorker.Cod_colab || selectedPropioWorker.cod_colab,
        cliente_nome: propioClienteNome || selectedPropioWorker.contratante || 'Cliente Obra',
        obra_nome: propioObraNome || selectedPropioWorker.ubicacion || 'Obra',
        empresa_contratante: propioEmpresa,
        data_inicio: propioDataInicio,
        data_fim: propioDataFim,
        observacoes: propioObservacoes
      });

      setIsPropioModalOpen(false);
      setSelectedPropioWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar alojamiento propio: ' + err.message);
    }
  };

  // Confirmar Check-out
  const handleConfirmCheckout = async () => {
    if (!checkingOutWorker) return;
    try {
      setIsProcessingCheckout(true);
      await logisticsService.checkoutTrabalhador(checkingOutWorker.alocacaoId, motivoCheckout);
      setCheckingOutWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al procesar check-out: ' + err.message);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Alternar seleção de trabalhador para lote
  const toggleSelectWorker = (workerId: string) => {
    setSelectedWorkerIds(prev => 
      prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
    );
  };

  const selectAllPendingInPedido = () => {
    if (!selectedPedido) return;
    const pendingIds = selectedPedido.trabalhadores
      .filter(t => t.status_alocacao === 'pendente')
      .map(t => t.worker_id);

    if (selectedWorkerIds.length === pendingIds.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(pendingIds);
    }
  };

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header Superior com Estatísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="text-blue-600" size={26} />
            Central de Demandas por Pedido & Alojamientos
          </h1>
          <p className="text-sm text-slate-500">
            Control de movilizaciones, asignación de plazas por pedido comercial, seguimiento de check-outs y control de alojamiento propio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsPropioModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors border border-purple-200 dark:border-purple-800 shadow-2xs"
          >
            <Home size={15} />
            + Registrar Alojamiento Propio
          </button>

          <button
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus size={15} />
            Asignar Cama Directa
          </button>
        </div>
      </div>

      {/* Abas Principais */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('demandas')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'demandas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Building size={15} />
            Demandas por Pedido
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'demandas'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {totalTrabalhadoresPendentes} pendientes
            </span>
          </button>

          <button
            onClick={() => setActiveTab('alojados')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'alojados'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck size={15} />
            Alojamientos Empresa
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'alojados'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
            }`}>
              {empresaAlojadosRaw.length} en inmuebles
            </span>
          </button>

          <button
            onClick={() => setActiveTab('propio')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'propio'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Home size={15} />
            Alojamiento Propio (€ 300)
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'propio'
                ? 'bg-white/20 text-white'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
            }`}>
              {propioAlojadosRaw.length} por cuenta propia
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cliente')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'cliente'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Hotel size={15} />
            Alojamiento por Cliente
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'cliente'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {clienteAlojadosRaw.length} en cliente
            </span>
          </button>
        </div>

        {/* Modal de Exportação Excel (.xlsx) com Seleção de Colunas */}
        {activeTab === 'propio' ? (
          <ExportLogisticaDialog
            trigger={
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs">
                <FileSpreadsheet size={14} />
                Exportar Alojamiento Propio (.xlsx)
              </button>
            }
            title={`Exportar Alojamiento Propio — ${MESES_NOMES[propioMonth - 1]} / ${propioYear}`}
            filenamePrefix={`MCS_Alojamiento_Propio_${MESES_NOMES[propioMonth - 1]}_${propioYear}`}
            availableColumns={exportColumnsPropio}
            totalRecordsCount={filteredPropriosCalculated.length}
            getData={() => filteredPropriosCalculated.map(p => ({
              codigo_colab: p.codigo_colab,
              worker_nome: p.worker_nome,
              worker_movil: p.worker_movil || '',
              empresa_contratante: p.empresa_contratante || 'LUMINOUS',
              cliente_nome: p.cliente_nome || '',
              obra_nome: p.obra_nome || '',
              municipio: p.municipio || '',
              mes_referencia: `${MESES_NOMES[propioMonth - 1]} / ${propioYear}`,
              data_checkin: p.data_checkin || '',
              data_checkout_prevista: p.data_checkout_prevista || '',
              dias_activos: p.calc.diasAtivos,
              total_dias_mes: p.calc.totalDiasMes,
              valor_base: 300,
              valor_proporcional: p.calc.valorProporcional,
              status: p.calc.isAtivoNoMes ? 'Activo en el mes' : 'Inactivo en el mes'
            }))}
          />
        ) : activeTab === 'cliente' ? (
          <ExportLogisticaDialog
            trigger={
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs">
                <FileSpreadsheet size={14} />
                Exportar Alojamiento Cliente (.xlsx)
              </button>
            }
            title="Exportar Alojamiento Cedido por Cliente"
            filenamePrefix="MCS_Alojamiento_Cliente"
            availableColumns={exportColumnsCliente}
            totalRecordsCount={filteredClienteAlojados.length}
            getData={() => filteredClienteAlojados.map(a => ({
              codigo_colab: a.codigo_colab,
              worker_nome: a.worker_nome,
              worker_movil: a.worker_movil || '',
              empresa_contratante: a.empresa_contratante || 'LUMINOUS',
              cliente_nome: a.cliente_nome || '',
              obra_nome: a.obra_nome || '',
              alojamento_nome: a.alojamento_nome || 'Alojamiento Cedido por Cliente',
              municipio: a.municipio || '',
              data_checkin: a.data_checkin || '',
              data_checkout_prevista: a.data_checkout_prevista || '',
              status: a.status || 'Activo'
            }))}
          />
        ) : (
          <ExportLogisticaDialog
            trigger={
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs">
                <FileSpreadsheet size={14} />
                Exportar a Excel (.xlsx)
              </button>
            }
            title="Exportar Alojamientos de la Empresa"
            filenamePrefix="MCS_Alojamientos_Empresa"
            availableColumns={exportColumnsEmpresa}
            totalRecordsCount={filteredAlojadosEmpresa.length}
            getData={() => filteredAlojadosEmpresa.map(a => ({
              codigo_colab: a.codigo_colab,
              worker_nome: a.worker_nome,
              worker_movil: a.worker_movil || '',
              empresa_contratante: a.empresa_contratante || 'LUMINOUS',
              cliente_nome: a.cliente_nome || '',
              obra_nome: a.obra_nome || '',
              pedido_codigo: a.pedido_codigo || '',
              alojamento_codigo: a.alojamento_codigo || '',
              alojamento_nome: a.alojamento_nome || '',
              cama_identificador: a.cama_identificador || '',
              municipio: a.municipio || '',
              provincia: a.provincia || '',
              tipo_alojamento: a.tipo_alojamento || 'Fijo',
              data_checkin: a.data_checkin || '',
              data_checkout_prevista: a.data_checkout_prevista || '',
              status: a.status || 'Activo'
            }))}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DEMANDAS POR PEDIDO COMERCIAL (VISÃO PRINCIPAL) */}
      {/* ========================================================================= */}
      {activeTab === 'demandas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA (5 COLUNAS): LISTA DE PEDIDOS */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Barra de Busca e Filtros de Pedidos */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, pedido, empresa, ciudad, obra..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'pendentes', label: `Pendientes (${totalPedidosPendentes})` },
                  { key: 'alojados', label: 'Completos' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key as any)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filterStatus === tab.key
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Cards de Pedidos */}
            <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs font-semibold">Cargando pedidos de la operación...</p>
                </div>
              ) : filteredPedidos.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
                  <Building size={28} className="mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Ningún pedido encontrado</p>
                  <p className="text-xs text-slate-400">Pruebe ajustando los filtros de búsqueda.</p>
                </div>
              ) : (
                filteredPedidos.map(pedido => {
                  const isSelected = selectedPedido?.pedido_id === pedido.pedido_id;
                  const isComplete = pedido.total_pendentes_alojamento === 0 && pedido.total_alojados > 0;

                  return (
                    <div
                      key={pedido.pedido_id}
                      onClick={() => {
                        setSelectedPedidoId(pedido.pedido_id);
                        setSelectedWorkerIds([]);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar do Card com Código e Empresa */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pedido.pedido_codigo}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                            {pedido.empresa_contratante}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {isComplete ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                          {isComplete ? '100% Alojado' : `${pedido.total_pendentes_alojamento} sin alojar`}
                        </span>
                      </div>

                      {/* Cliente & Obra */}
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm">
                          {pedido.cliente_nome}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-rose-500 flex-shrink-0" />
                          <span className="truncate">{pedido.obra_nome} • {pedido.cidade}</span>
                        </p>
                      </div>

                      {/* Data de Início e Dias Restantes */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar size={13} className="text-blue-500" />
                          <span>Inicio: <strong>{pedido.data_inicio}</strong></span>
                        </div>

                        <span className={`text-[11px] font-bold ${
                          pedido.dias_restantes <= 5 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {pedido.dias_restantes > 0 ? `Faltan ${pedido.dias_restantes}d` : 'Iniciado'}
                        </span>
                      </div>

                      {/* Barra de Progresso de Alojamento */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Plazas asignadas</span>
                          <span>{pedido.total_alojados} de {pedido.total_contratados} trabajadores</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${pedido.total_contratados > 0 ? (pedido.total_alojados / pedido.total_contratados) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (7 COLUNAS): DETALHES DO PEDIDO SELECIONADO & GESTÃO DE VAGAS */}
          <div className="lg:col-span-7 space-y-5">
            {selectedPedido ? (
              <div className="space-y-5">
                
                {/* 1. BANNER UNIFICADO DO PEDIDO (PASTEL / CLARO / DARK ADAPTATIVO COM TIMELINE) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                  
                  {/* Linha Superior: Código, Empresa, Cliente e Localização */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/60">
                          {selectedPedido.pedido_codigo}
                        </span>

                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                          Empresa: {selectedPedido.empresa_contratante}
                        </span>

                        {selectedPedido.dias_restantes > 0 ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 flex items-center gap-1">
                            <Clock size={12} />
                            Faltan {selectedPedido.dias_restantes} días
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            En ejecución
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {selectedPedido.cliente_nome}
                      </h2>

                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin size={14} className="text-rose-500 flex-shrink-0" />
                        <strong className="text-slate-800 dark:text-slate-200">{selectedPedido.obra_nome}</strong>
                        <span>•</span>
                        <span>{selectedPedido.endereco_completo} ({selectedPedido.cidade}{selectedPedido.codigo_postal ? `, ${selectedPedido.codigo_postal}` : ''})</span>
                      </p>
                    </div>

                    {/* Contatos do Encarregado e Cliente */}
                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs">
                      {selectedPedido.encarregado_nome && (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <User size={13} className="text-blue-600" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Encarregado de Obra</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPedido.encarregado_nome}</span>
                          </div>
                          {selectedPedido.encarregado_telefone && (
                            <a
                              href={`https://wa.me/${selectedPedido.encarregado_telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                              title="WhatsApp do Encarregado"
                            >
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      )}

                      {selectedPedido.cliente_telefone && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <span>Tel. Cliente:</span>
                          <a
                            href={`tel:${selectedPedido.cliente_telefone}`}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone size={11} />
                            {selectedPedido.cliente_telefone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linha Inferior: Banner Timeline Pastel (Início Previsto, Duração e Fim Previsto) */}
                  <div className="bg-slate-50/90 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Início Previsto */}
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-2xl shadow-2xs">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Inicio Previsto
                        </span>
                        <p className="text-base font-black text-slate-900 dark:text-white">
                          {selectedPedido.data_inicio}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {selectedPedido.data_inicio_diasemana || 'Fecha de inicio'}
                        </p>
                      </div>
                    </div>

                    {/* Duração Central */}
                    <div className="flex-1 flex flex-col items-center justify-center px-4">
                      <span className="px-3.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                        ⏱️ Duración: {selectedPedido.duracao_texto}
                      </span>
                      <div className="w-full flex items-center mt-2 max-w-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></div>
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700 mx-1"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></div>
                      </div>
                    </div>

                    {/* Fim Previsto */}
                    <div className="flex items-center gap-3 justify-end text-right">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Fin Previsto
                        </span>
                        <p className="text-base font-black text-slate-900 dark:text-white">
                          {selectedPedido.data_fim || 'No definido'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {selectedPedido.data_fim_diasemana || 'Sin fecha de cierre'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-2xl shadow-2xs">
                        <Calendar size={22} />
                      </div>
                    </div>

                  </div>

                </div>

                {/* 2. TABELA DOS TRABALHADORES DO PEDIDO */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
                  
                  {/* Header da Tabela com Ações em Lote */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedPedido.trabalhadores.filter(t => t.status_alocacao === 'pendente').length > 0 &&
                          selectedWorkerIds.length === selectedPedido.trabalhadores.filter(t => t.status_alocacao === 'pendente').length
                        }
                        onChange={selectAllPendingInPedido}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        title="Seleccionar todos los pendientes"
                      />
                      <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Trabajadores Vinculados al Pedido ({selectedPedido.trabalhadores.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          {selectedPedido.total_pendentes_alojamento} pendientes de alojamiento • {selectedPedido.total_alojados} asignados
                        </p>
                      </div>
                    </div>

                    {selectedWorkerIds.length > 0 && (
                      <button
                        onClick={handleOpenBatchAlloc}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs animate-in fade-in"
                      >
                        <Bed size={14} />
                        Asignar Grupo al Mismo Alojamiento ({selectedWorkerIds.length})
                      </button>
                    )}
                  </div>

                  {/* Tabela de Trabalhadores */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="w-8 px-4 py-3"></th>
                          <th className="px-4 py-3">Trabajador</th>
                          <th className="px-4 py-3">Función / Cargo</th>
                          <th className="px-4 py-3">Alojamiento & Cama</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {selectedPedido.trabalhadores.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Aún no hay trabajadores asignados a este pedido en la Contratación.
                            </td>
                          </tr>
                        ) : (
                          selectedPedido.trabalhadores.map(worker => {
                            const isSelected = selectedWorkerIds.includes(worker.worker_id);
                            const isAllocated = worker.status_alocacao === 'alocado';

                            return (
                              <tr
                                key={worker.worker_id}
                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                  isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3.5">
                                  {!isAllocated && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectWorker(worker.worker_id)}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                    />
                                  )}
                                </td>

                                <td className="px-4 py-3.5">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">
                                      {worker.worker_nome}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                        {worker.codigo_colab}
                                      </span>
                                      {worker.movil && (
                                        <a
                                          href={`https://wa.me/${worker.movil.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                                        >
                                          <Phone size={10} />
                                          {worker.movil}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5">
                                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                    {worker.funcao}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5">
                                  {isAllocated ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 size={11} />
                                        {worker.alocacao_detalhe?.alojamento_nome}
                                      </span>
                                      <p className="text-[10px] text-slate-400">
                                        {worker.alocacao_detalhe?.cama_identificador}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                      <AlertTriangle size={11} />
                                      Sin Alojamiento
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  {isAllocated ? (
                                    <button
                                      onClick={() => {
                                        setCheckingOutWorker({
                                          alocacaoId: worker.alocacao_detalhe!.alocacao_id,
                                          workerNome: worker.worker_nome,
                                          alojamentoNome: worker.alocacao_detalhe!.alojamento_nome
                                        });
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors inline-flex items-center gap-1"
                                    >
                                      <LogOut size={12} />
                                      Check-out
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenSingleAlloc(worker, selectedPedido)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs inline-flex items-center gap-1"
                                    >
                                      <Bed size={13} />
                                      Asignar Cama
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3 shadow-xs">
                <Building2 size={36} className="mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Seleccione un Pedido Comercial</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Haga clic en uno de los pedidos de la columna izquierda para ver la ubicación, fechas y asignar los alojamientos a sus trabajadores.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ALOJAMIENTOS DE LA EMPRESA (INMUEBLES PROPIOS/ALQUILADOS) */}
      {/* ========================================================================= */}
      {activeTab === 'alojados' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
          
          {/* Header & Filtros da Aba de Alojados da Empresa */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/70">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Building size={16} className="text-blue-600" />
                Alojamientos Gestionados por la Empresa ({filteredAlojadosEmpresa.length} de {empresaAlojadosRaw.length})
              </h2>
              <p className="text-xs text-slate-500">Colaboradores asignados a plazas e inmuebles contratados por la empresa.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro Empresa */}
              {empresasList.length > 0 && (
                <select
                  value={alojadosEmpresaFilter}
                  onChange={e => setAlojadosEmpresaFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todas">Empresa: Todas</option>
                  {empresasList.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              )}

              {/* Busca */}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar trabajador, pedido, obra, ciudad..."
                  value={alojadosSearch}
                  onChange={e => setAlojadosSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Empresa & Pedido</th>
                  <th className="px-4 py-3">Cliente & Obra</th>
                  <th className="px-4 py-3">Alojamiento & Cama</th>
                  <th className="px-4 py-3">Ubicación / GPS</th>
                  <th className="px-4 py-3">Check-in / Previsto</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAlojadosEmpresa.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      Ningún trabajador encontrado con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredAlojadosEmpresa.map(aloc => (
                    <tr key={aloc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{aloc.worker_nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">{aloc.codigo_colab}</span>
                          {aloc.worker_movil && (
                            <a
                              href={`https://wa.me/${aloc.worker_movil.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                              title="WhatsApp del Trabajador"
                            >
                              <Phone size={10} />
                              {aloc.worker_movil}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 block w-fit">
                          {aloc.empresa_contratante || 'LUMINOUS'}
                        </span>
                        {aloc.pedido_codigo && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {aloc.pedido_codigo}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{aloc.cliente_nome}</p>
                        <p className="text-[10px] text-slate-400">{aloc.obra_nome}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                            <Home size={13} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{aloc.alojamento_nome}</p>
                            <p className="text-[10px] text-slate-400">{aloc.cama_identificador}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{aloc.municipio}</span>
                        </div>
                        {aloc.latitude && aloc.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${aloc.latitude},${aloc.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-mono"
                          >
                            <Globe size={9} />
                            Maps
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <p className="font-medium">Desde: {aloc.data_checkin}</p>
                        {aloc.data_checkout_prevista && (
                          <p className="text-[10px] text-slate-400">Hasta: {aloc.data_checkout_prevista}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setCheckingOutWorker({
                              alocacaoId: aloc.alocacao_id,
                              workerNome: aloc.worker_nome,
                              alojamentoNome: aloc.alojamento_nome
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <LogOut size={13} />
                          Check-out
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CONTROL DE ALOJAMIENTO PROPIO (€ 300 / MES - PROPORCIONAL DIARIO) */}
      {/* ========================================================================= */}
      {activeTab === 'propio' && (
        <div className="space-y-4">
          
          {/* BANNER DE CONTROLE DO MÊS DE REFERÊNCIA & KPIS DE CUSTO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-200 dark:border-purple-900/60 p-5 shadow-xs space-y-4">
            
            {/* Topo do Banner: Título + Seletor de Mês/Ano + Botão Novo Registro */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    <Home size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Control de Alojamiento Propio & Ayuda de Coste (€ 300 / mes)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Regla base de 300 €/mes con cálculo proporcional diario según fechas efectivas de entrada y salida en el mes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Seletor de Mês/Ano de Referência com Navegação */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"
                    title="Mes Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
                    <CalendarDays size={14} className="text-purple-600" />
                    <select
                      value={propioMonth}
                      onChange={e => setPropioMonth(Number(e.target.value))}
                      className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                    >
                      {MESES_NOMES.map((nome, idx) => (
                        <option key={idx + 1} value={idx + 1} className="dark:bg-slate-900">{nome}</option>
                      ))}
                    </select>

                    <select
                      value={propioYear}
                      onChange={e => setPropioYear(Number(e.target.value))}
                      className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                    >
                      <option value={2025} className="dark:bg-slate-900">2025</option>
                      <option value={2026} className="dark:bg-slate-900">2026</option>
                      <option value={2027} className="dark:bg-slate-900">2027</option>
                    </select>
                  </div>

                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"
                    title="Mes Siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  onClick={() => setIsPropioModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Plus size={14} />
                  + Registrar Alojamiento Propio
                </button>
              </div>
            </div>

            {/* Grid de KPIs do Mês de Referência */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Colaboradores Registrados
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {propiosMonthTotals.totalRegistrados}
                </p>
                <span className="text-[10px] text-purple-600 font-semibold block">
                  Base total por cuenta propia
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Activos en {MESES_NOMES[propioMonth - 1]}
                </span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {propiosMonthTotals.activosNoMes}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Con derecho a ayuda este mes
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Regla de Ayuda Base
                </span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                  € 300,00 <span className="text-xs font-normal text-slate-400">/ mes</span>
                </p>
                <span className="text-[10px] text-amber-600 font-semibold block">
                  Día = € {(300 / new Date(propioYear, propioMonth, 0).getDate()).toFixed(2)}/día ({new Date(propioYear, propioMonth, 0).getDate()} d)
                </span>
              </div>

              <div className="p-3.5 bg-purple-600 text-white rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-100 block">
                  Total a Pagar en {MESES_NOMES[propioMonth - 1]}
                </span>
                <p className="text-2xl font-black tracking-tight">
                  € {propiosMonthTotals.totalAPagar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-purple-100 font-medium block">
                  Cálculo proporcional mensual
                </span>
              </div>
            </div>

            {/* Barra de Filtros Internos da Tabela */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {empresasList.length > 0 && (
                  <select
                    value={propioEmpresaFilter}
                    onChange={e => setPropioEmpresaFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="todas">Empresa: Todas</option>
                    {empresasList.map(emp => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                )}

                <select
                  value={propioStatusFilter}
                  onChange={e => setPropioStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todos">Estado Mes: Todos ({filteredPropriosCalculated.length})</option>
                  <option value="activos">Solo Activos en {MESES_NOMES[propioMonth - 1]} ({propiosMonthTotals.activosNoMes})</option>
                  <option value="inactivos">Inactivos / Fuera de este Mes</option>
                </select>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar colaborador, cliente, ciudad..."
                  value={propioSearch}
                  onChange={e => setPropioSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* TABELA DETALHADA COM CÁLCULO PROPORCIONAL */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3">Trabajador</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Cliente & Pedido</th>
                    <th className="px-4 py-3">Localidad / Obra</th>
                    <th className="px-4 py-3">Período Activo</th>
                    <th className="px-4 py-3">Días en {MESES_NOMES[propioMonth - 1]}</th>
                    <th className="px-4 py-3">Base</th>
                    <th className="px-4 py-3">A Pagar ({MESES_NOMES[propioMonth - 1]})</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPropriosCalculated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        No hay colaboradores con alojamiento propio que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredPropriosCalculated.map(a => {
                      const isFullMonth = a.calc.diasAtivos === a.calc.totalDiasMes;
                      const isZero = a.calc.diasAtivos === 0;

                      return (
                        <tr key={a.id} className="hover:bg-purple-50/20 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{a.worker_nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-500">{a.codigo_colab}</span>
                              {a.worker_movil && (
                                <a
                                  href={`https://wa.me/${a.worker_movil.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                                  title="WhatsApp del Trabajador"
                                >
                                  <Phone size={10} />
                                  {a.worker_movil}
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {a.empresa_contratante || 'LUMINOUS'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{a.cliente_nome}</p>
                            {a.pedido_codigo && <p className="text-[10px] font-mono text-slate-400">{a.pedido_codigo}</p>}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{a.obra_nome || a.municipio}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            <p className="font-medium">Desde: {a.data_checkin || '2026-01-01'}</p>
                            {a.data_checkout_prevista && <p className="text-[10px] text-slate-400">Hasta: {a.data_checkout_prevista}</p>}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isZero
                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : isFullMonth
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {a.calc.periodoTexto}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">
                            € 300,00
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl inline-block ${
                              isZero
                                ? 'text-slate-400 bg-slate-50 dark:bg-slate-800'
                                : isFullMonth
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            }`}>
                              € {a.calc.valorProporcional.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setCheckingOutWorker({
                                  alocacaoId: a.alocacao_id,
                                  workerNome: a.worker_nome,
                                  alojamentoNome: 'Alojamiento Propio'
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors inline-flex items-center gap-1"
                            >
                              <LogOut size={13} />
                              Finalizar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: ALOJAMIENTOS CEDIDOS POR CLIENTE (SIN COSTE PARA MCS) */}
      {/* ========================================================================= */}
      {activeTab === 'cliente' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
          
          {/* Header & Filtros da Aba de Alojamento por Cliente */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50/50 dark:bg-amber-950/20">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Hotel size={16} className="text-amber-600" />
                Alojamientos Cedidos por el Cliente ({filteredClienteAlojados.length} de {clienteAlojadosRaw.length})
              </h2>
              <p className="text-xs text-slate-500">Colaboradores hospedados en instalaciones provistas directamente por el cliente de la obra.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro Empresa */}
              {empresasList.length > 0 && (
                <select
                  value={clienteEmpresaFilter}
                  onChange={e => setClienteEmpresaFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todas">Empresa: Todas</option>
                  {empresasList.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              )}

              {/* Busca */}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar colaborador, cliente, hotel, ciudad..."
                  value={clienteSearch}
                  onChange={e => setClienteSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Empresa Contratante</th>
                  <th className="px-4 py-3">Cliente & Obra</th>
                  <th className="px-4 py-3">Alojamiento / Hotel del Cliente</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClienteAlojados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      Ningún trabajador en alojamiento cedido por cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredClienteAlojados.map(aloc => (
                    <tr key={aloc.id} className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{aloc.worker_nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">{aloc.codigo_colab}</span>
                          {aloc.worker_movil && (
                            <a
                              href={`https://wa.me/${aloc.worker_movil.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                              title="WhatsApp del Trabajador"
                            >
                              <Phone size={10} />
                              {aloc.worker_movil}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 block w-fit">
                          {aloc.empresa_contratante || 'LUMINOUS'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{aloc.cliente_nome}</p>
                        <p className="text-[10px] text-slate-400">{aloc.obra_nome}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                            <Hotel size={13} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{aloc.alojamento_nome}</p>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                              Cedido por el Cliente (Sin coste MCS)
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{aloc.municipio}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        <p className="font-medium">Desde: {aloc.data_checkin}</p>
                        {aloc.data_checkout_prevista && (
                          <p className="text-[10px] text-slate-400">Hasta: {aloc.data_checkout_prevista}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setCheckingOutWorker({
                              alocacaoId: aloc.alocacao_id,
                              workerNome: aloc.worker_nome,
                              alojamentoNome: aloc.alojamento_nome
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <LogOut size={13} />
                          Check-out
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ALOCAÇÃO INDIVIDUAL */}
      {/* ========================================================================= */}
      {allocatingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <Bed size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignar Alojamiento a Trabajador
                  </h3>
                  <p className="text-xs text-slate-500">
                    {allocatingWorker.worker.worker_nome} • {allocatingWorker.pedido.pedido_codigo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocatingWorker(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
                  📍 Destino de la Obra
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {allocatingWorker.pedido.cliente_nome} — {allocatingWorker.pedido.obra_nome}
                </p>
                <p className="text-slate-500 text-[11px]">{allocatingWorker.pedido.endereco_completo}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  1. Modalidad / Alojamiento:
                </label>
                <select
                  value={singleAlojamentoId}
                  onChange={e => {
                    setSingleAlojamentoId(e.target.value);
                    if (e.target.value !== 'propio') {
                      const firstBed = camasDisponiveis.find(c => c.alojamento_id === e.target.value);
                      if (firstBed) setSingleCamaId(firstBed.id);
                    } else {
                      setSingleCamaId('propio');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Alojamiento --</option>
                  <option value="propio">🏠 Alojamiento Propio / Por Cuenta Propia (Sin plaza empresa)</option>
                  {alojamentos.map(aloj => {
                    const vagasLivres = camasDisponiveis.filter(c => c.alojamento_id === aloj.id).length;
                    const isSameCity = aloj.municipio?.toLowerCase().includes(allocatingWorker.pedido.cidade.toLowerCase());
                    return (
                      <option key={aloj.id} value={aloj.id}>
                        {aloj.nome} ({aloj.municipio || 'España'}) — {vagasLivres} camas libres {isSameCity ? '⭐ Ciudad Coincidente' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {singleAlojamentoId !== 'propio' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    2. Cama / Habitación Disponible:
                  </label>
                  <select
                    value={singleCamaId}
                    onChange={e => setSingleCamaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Cama --</option>
                    {camasDisponiveis
                      .filter(c => c.alojamento_id === singleAlojamentoId)
                      .map(cama => (
                        <option key={cama.id} value={cama.id}>
                          {cama.identificador} ({cama.tipo === 'dupla' ? 'Cama Doble' : 'Individual'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">Fecha Check-in:</label>
                  <input
                    type="date"
                    value={singleDataInicio}
                    onChange={e => setSingleDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">Fecha Prevista Fin:</label>
                  <input
                    type="date"
                    value={singleDataFim}
                    onChange={e => setSingleDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setAllocatingWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isAllocatingSingle || (!singleCamaId && singleAlojamentoId !== 'propio')}
                onClick={handleConfirmSingleAlloc}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isAllocatingSingle ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ALOCAÇÃO EM LOTE */}
      {/* ========================================================================= */}
      {isBatchModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignación en Lote ({selectedWorkerIds.length} Trabajadores)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido {selectedPedido.pedido_codigo} • {selectedPedido.cliente_nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Seleccione el inmueble donde se hospedarán los {selectedWorkerIds.length} trabajadores. El sistema distribuirá automáticamente las camas libres disponibles.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Trabajadores a hospedar:</span>
                {selectedWorkerIds.map(id => {
                  const w = selectedPedido.trabalhadores.find(t => t.worker_id === id);
                  return (
                    <div key={id} className="flex justify-between items-center text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      <span>• {w?.worker_nome}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{w?.codigo_colab}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Alojamiento Destino:
                </label>
                <select
                  value={batchAlojamentoId}
                  onChange={e => setBatchAlojamentoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Alojamiento --</option>
                  {alojamentos.map(aloj => {
                    const vagasLivres = camasDisponiveis.filter(c => c.alojamento_id === aloj.id).length;
                    const hasEnough = vagasLivres >= selectedWorkerIds.length;
                    const isSameCity = aloj.municipio?.toLowerCase().includes(selectedPedido.cidade.toLowerCase());

                    return (
                      <option key={aloj.id} value={aloj.id}>
                        {aloj.nome} ({aloj.municipio || 'España'}) — {vagasLivres} camas libres {hasEnough ? '✓ Capacidad OK' : '⚠ Insuficiente'} {isSameCity ? '⭐ Ciudad Obra' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>
                  Fechas automáticas del pedido: <strong>{selectedPedido.data_inicio}</strong> hasta <strong>{selectedPedido.data_fim || 'Fin previsto'}</strong>.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isAllocatingBatch || !batchAlojamentoId}
                onClick={handleConfirmBatchAlloc}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isAllocatingBatch ? 'Asignando Grupo...' : `Confirmar Asignación de los ${selectedWorkerIds.length} Trabajadores`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRO DE ALOJAMIENTO PROPIO (POR CUENTA PROPIA) */}
      {/* ========================================================================= */}
      {isPropioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-sm">
                  <Home size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Registrar Alojamiento Propio
                  </h3>
                  <p className="text-xs text-slate-500">Colaborador que reside por cuenta propia o recibe compensación.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPropioModalOpen(false);
                  setSelectedPropioWorker(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {!selectedPropioWorker ? (
                <div className="space-y-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    1. Seleccione el Trabajador:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código (ej: E2105)..."
                      value={propioWorkerQuery}
                      onChange={e => setPropioWorkerQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {isSearchingPropio ? (
                      <div className="p-6 text-center text-slate-400">Buscando colaboradores...</div>
                    ) : propioSearchResults.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">Ningún colaborador encontrado.</div>
                    ) : (
                      propioSearchResults.map((w: any) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setSelectedPropioWorker(w);
                            setPropioClienteNome(w.contratante || '');
                            setPropioObraNome(w.ubicacion || '');
                            setPropioEmpresa(w.contratante || 'LUMINOUS');
                          }}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 cursor-pointer flex justify-between items-center transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{w.Nombre || w.nombre}</p>
                            <p className="text-[11px] text-slate-400">{w.funcion || 'Especialista'} • {w.ubicacion || 'España'}</p>
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
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{selectedPropioWorker.Nombre || selectedPropioWorker.nombre}</p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300">{selectedPropioWorker.Cod_colab || selectedPropioWorker.cod_colab}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPropioWorker(null)}
                      className="text-xs font-bold text-purple-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Empresa Contratante:</label>
                      <select
                        value={propioEmpresa}
                        onChange={e => setPropioEmpresa(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      >
                        <option value="LUMINOUS">LUMINOUS</option>
                        <option value="STOCCO">STOCCO</option>
                        <option value="WISEOWE">WISEOWE</option>
                        <option value="KOTRIK">KOTRIK</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Cliente / Proyecto:</label>
                      <input
                        type="text"
                        value={propioClienteNome}
                        onChange={e => setPropioClienteNome(e.target.value)}
                        placeholder="Ej: INCONAL / EUROFESA"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ubicación / Ciudad de la Obra:</label>
                    <input
                      type="text"
                      value={propioObraNome}
                      onChange={e => setPropioObraNome(e.target.value)}
                      placeholder="Ej: San Sebastián / Madrid / Asturias"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Inicio:</label>
                      <input
                        type="date"
                        value={propioDataInicio}
                        onChange={e => setPropioDataInicio(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Fin Prevista:</label>
                      <input
                        type="date"
                        value={propioDataFim}
                        onChange={e => setPropioDataFim(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Observaciones:</label>
                    <input
                      type="text"
                      value={propioObservacoes}
                      onChange={e => setPropioObservacoes(e.target.value)}
                      placeholder="Motivo o detalle de alojamiento propio..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedPropioWorker && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsPropioModalOpen(false);
                    setSelectedPropioWorker(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPropio}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Guardar Alojamiento Propio
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ASIGNACIÓN DIRECTA DE TRABAJADOR REAL */}
      {/* ========================================================================= */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignación Directa de Colaborador
                  </h3>
                  <p className="text-xs text-slate-500">Búsqueda directa en la base de colaboradores activos de España.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDirectModalOpen(false);
                  setSelectedRealWorker(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {!selectedRealWorker ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código (ej: E2105)..."
                      value={workerSearchQuery}
                      onChange={e => setWorkerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {isSearchingWorkers ? (
                      <div className="p-8 text-center text-slate-400">Buscando colaboradores...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">Ningún colaborador encontrado.</div>
                    ) : (
                      searchResults.map((w: any) => (
                        <div
                          key={w.id}
                          onClick={() => setSelectedRealWorker(w)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer flex justify-between items-center transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{w.Nombre || w.nombre}</p>
                            <p className="text-[11px] text-slate-400">{w.funcion || 'Especialista'} • {w.ubicacion || 'España'}</p>
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
                      <p className="font-black text-slate-800 dark:text-slate-100">{selectedRealWorker.Nombre || selectedRealWorker.nombre}</p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">{selectedRealWorker.contratante} • {selectedRealWorker.ubicacion}</p>
                    </div>
                    <button
                      onClick={() => setSelectedRealWorker(null)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Alojamiento:</label>
                      <select
                        value={directAlojamentoId}
                        onChange={e => {
                          setDirectAlojamentoId(e.target.value);
                          const firstBed = camasDisponiveis.find(c => c.alojamento_id === e.target.value);
                          if (firstBed) setDirectCamaId(firstBed.id);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Seleccionar --</option>
                        {alojamentos.map(a => (
                          <option key={a.id} value={a.id}>{a.nome} ({a.municipio})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Cama:</label>
                      <select
                        value={directCamaId}
                        onChange={e => setDirectCamaId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Seleccionar --</option>
                        {camasDisponiveis
                          .filter(c => c.alojamento_id === directAlojamentoId)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.identificador}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Check-in:</label>
                      <input
                        type="date"
                        value={directDataInicio}
                        onChange={e => setDirectDataInicio(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Prevista Salida:</label>
                      <input
                        type="date"
                        value={directDataFim}
                        onChange={e => setDirectDataFim(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedRealWorker && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDirectModalOpen(false);
                    setSelectedRealWorker(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  disabled={!directCamaId}
                  onClick={handleConfirmDirectAlloc}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirmar Asignación
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CHECK-OUT */}
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
                <p className="text-xs text-slate-500">Liberación de cama e inspección de salida.</p>
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

              <div>
                <label className="font-bold text-slate-600 block mb-1">Fecha Efectiva de Salida:</label>
                <input
                  type="date"
                  value={dataSaidaEfetiva}
                  onChange={e => setDataSaidaEfetiva(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isProcessingCheckout}
                onClick={() => setCheckingOutWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isProcessingCheckout}
                onClick={handleConfirmCheckout}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <LogOut size={13} />
                {isProcessingCheckout ? 'Procesando...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
