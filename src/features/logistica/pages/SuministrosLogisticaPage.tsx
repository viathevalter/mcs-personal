import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Zap,
  Droplets,
  Flame,
  Wifi,
  Wrench,
  Building2,
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Pencil,
  Trash2,
  Users,
  Calculator,
  Download,
  Upload,
  CheckSquare,
  Square,
  ShieldCheck,
  Sliders,
  X,
  ExternalLink,
  Paperclip,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Sparkles,
  Check,
  UserPlus
} from 'lucide-react';
import {
  suministrosLogisticsService,
  SERVICOS_SUMINISTROS,
  calcularDiasEntreDatas,
  obterLimitePadraoServico,
  calcularFranquiaPeriodo,
  type SuministroFatura,
  type RateioMoradorItem,
  type ResumenSuministrosAlojamento,
  type SuministrosLimitesConfig
} from '../services/suministrosLogisticsService';
import { logisticsService, type Alojamento } from '../services/logisticsService';
import { uploadDocumentoVistoria } from '../services/storageService';
import { AlojamentoQuickCombobox, matchesPartialSearch } from '../components/ProvedorSearchCombobox';
import { toast } from 'sonner';

export const SuministrosLogisticaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faturas' | 'resumen'>('faturas');
  const [faturas, setFaturas] = useState<SuministroFatura[]>([]);
  const [resumenList, setResumenList] = useState<ResumenSuministrosAlojamento[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [allWorkers, setAllWorkers] = useState<Array<{ id: string; nome: string; cod_colab?: string; contratante?: string; cliente?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros Aba Faturas
  const [searchTerm, setSearchTerm] = useState('');
  const [alojamentoFilter, setAlojamentoFilter] = useState<string>('todos');
  const [servicoFilter, setServicoFilter] = useState<string>('todos');
  const [estadoPagoFilter, setEstadoPagoFilter] = useState<string>('todos');
  const [estatusFilter, setEstatusFilter] = useState<string>('todos');
  const [excedenteFilter, setExcedenteFilter] = useState<'todos' | 'com_excedente' | 'descontos_lancados' | 'enviado_financeiro'>('todos');
  const [mesPeriodoFilter, setMesPeriodoFilter] = useState<string>('todos');
  const [anoConsumoFilter, setAnoConsumoFilter] = useState<string>('todos');
  const [dataConsumoDesde, setDataConsumoDesde] = useState<string>('');
  const [dataConsumoHasta, setDataConsumoHasta] = useState<string>('');

  // Paginação e Ordenação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [sortField, setSortField] = useState<'data_inicio' | 'valor_fatura' | 'alojamento_nome' | 'servico'>('data_inicio');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Seleção em Lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGeneratingBatchOP, setIsGeneratingBatchOP] = useState(false);

  // Modal Nova / Editar Fatura + Rateio
  const [isFaturaModalOpen, setIsFaturaModalOpen] = useState(false);
  const [editingFatura, setEditingFatura] = useState<SuministroFatura | null>(null);
  const [isSavingFatura, setIsSavingFatura] = useState(false);
  const [isLaunchingDiscounts, setIsLaunchingDiscounts] = useState(false);

  // Form states da Fatura
  const [formAlojamentoId, setFormAlojamentoId] = useState('');
  const [formAlojamentoCodigo, setFormAlojamentoCodigo] = useState('');
  const [formAlojamentoNome, setFormAlojamentoNome] = useState('');
  const [formProvedorId, setFormProvedorId] = useState('');
  const [formProvedorNome, setFormProvedorNome] = useState('');
  const [formServico, setFormServico] = useState('Electricidad');
  const [formConcepto, setFormConcepto] = useState('FACTURA DE ELECTRICIDAD');
  const [formMesPeriodo, setFormMesPeriodo] = useState('');
  const [formDataInicio, setFormDataInicio] = useState('');
  const [formDataFim, setFormDataFim] = useState('');
  const [formNumDias, setFormNumDias] = useState(30);
  const [formValorFatura, setFormValorFatura] = useState<number>(0);
  const [formEstadoPago, setFormEstadoPago] = useState<SuministroFatura['estado_pago']>('PENDIENTE');
  const [formEstatusAloj, setFormEstatusAloj] = useState<'EN CURSO' | 'FINALIZADO'>('EN CURSO');
  const [formDescontadoFianza, setFormDescontadoFianza] = useState(false);
  const [formNumOP, setFormNumOP] = useState('');
  const [formDataOP, setFormDataOP] = useState('');
  const [formAnexoUrl, setFormAnexoUrl] = useState('');
  const [formAnexoNome, setFormAnexoNome] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
  const anexoInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de Franquia e Rateio de Excedente dentro do Modal
  const [formLimitePessoaMes, setFormLimitePessoaMes] = useState<number>(50);
  const [formLimiteAceitavelPeriodo, setFormLimiteAceitavelPeriodo] = useState<number>(0);
  const [formAjusteManualLimite, setFormAjusteManualLimite] = useState<boolean>(false);
  const [formValorExcedente, setFormValorExcedente] = useState<number>(0);
  const [formCompetenciaDesconto, setFormCompetenciaDesconto] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formRateioDetalhes, setFormRateioDetalhes] = useState<RateioMoradorItem[]>([]);
  const [isCalculatingRateio, setIsCalculatingRateio] = useState(false);
  const [workerAddSearch, setWorkerAddSearch] = useState('');

  // Modal de Configuração Rápida de Limites do Alojamento (na aba Resumen)
  const [limitesModalAloj, setLimitesModalAloj] = useState<ResumenSuministrosAlojamento | null>(null);
  const [limitesForm, setLimitesForm] = useState<SuministrosLimitesConfig>({
    limite_luz_pessoa: 50,
    limite_agua_pessoa: 20,
    limite_gas_pessoa: 30,
    limite_calefaccion_pessoa: 30,
    limite_global_pessoa: 0,
    limite_global_alojamento: 0
  });
  const [isSavingLimites, setIsSavingLimites] = useState(false);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [fatData, resData, alojData, workersData] = await Promise.all([
        suministrosLogisticsService.fetchFaturas(),
        suministrosLogisticsService.fetchResumenPorAlojamento(),
        logisticsService.fetchAlojamentos(),
        logisticsService.searchTrabalhadores('')
      ]);
      setFaturas(fatData);
      setResumenList(resData);
      setAlojamentos(alojData);
      setAllWorkers(
        (workersData || []).map((w: any) => ({
          id: w.id,
          nome: w.nome || w.Nombre,
          cod_colab: w.cod_colab || w.Cod_colab,
          contratante: w.contratante,
          cliente: w.cliente
        }))
      );
    } catch (e) {
      console.error('Erro ao carregar dados de suministros:', e);
      toast.error('Error al cargar los suministros.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Recalcular dias quando altera data_inicio ou data_fim no formulário
  useEffect(() => {
    if (formDataInicio && formDataFim) {
      const dias = calcularDiasEntreDatas(formDataInicio, formDataFim);
      setFormNumDias(dias);
    }
  }, [formDataInicio, formDataFim]);

  // Função para recalcular automaticamente moradores e franquia no formulário
  const handleRecalcularMoradoresEFranquia = async (
    targetAlojId = formAlojamentoId,
    targetAlojCod = formAlojamentoCodigo,
    targetAlojNome = formAlojamentoNome,
    targetServico = formServico,
    targetInicio = formDataInicio,
    targetFim = formDataFim,
    targetValor = formValorFatura,
    customLimitePessoaMes?: number
  ) => {
    if (!targetAlojId && !targetAlojCod && !targetAlojNome) return;
    setIsCalculatingRateio(true);
    try {
      const alojObj = alojamentos.find(a => a.id === targetAlojId || (targetAlojCod && a.codigo === targetAlojCod));
      const limitesCfg = (alojObj?.suministros as SuministrosLimitesConfig) || {};
      const padrao = obterLimitePadraoServico(limitesCfg, targetServico);

      const limPessoa = customLimitePessoaMes !== undefined
        ? customLimitePessoaMes
        : (padrao.limitePorPessoaMes > 0 ? padrao.limitePorPessoaMes : (
            targetServico.toLowerCase().includes('electr') ? 50 :
            targetServico.toLowerCase().includes('agua') ? 20 :
            targetServico.toLowerCase().includes('gas') || targetServico.toLowerCase().includes('calefac') ? 30 : 0
          ));

      setFormLimitePessoaMes(limPessoa);

      const diasPeriodo = calcularDiasEntreDatas(targetInicio, targetFim);
      // Primeiro identificar moradores no período
      const preRes = await suministrosLogisticsService.calcularMoradoresERateioPeriodo({
        alojamentoId: targetAlojId,
        alojamentoCodigo: targetAlojCod,
        alojamentoNome: targetAlojNome,
        dataInicio: targetInicio,
        dataFim: targetFim,
        valorFatura: targetValor,
        limiteAceitavelPeriodo: 0
      });

      const qtdMoradores = Math.max(1, preRes.moradores.length || alojObj?.capacidade_pessoas || 1);
      const franquiaCalc = calcularFranquiaPeriodo({
        limitePorPessoaMes: limPessoa,
        limiteFixoAlojamentoMes: padrao.limiteFixoAlojamentoMes,
        qtdMoradores,
        numDias: diasPeriodo
      });

      const limiteFinal = formAjusteManualLimite ? formLimiteAceitavelPeriodo : franquiaCalc;
      if (!formAjusteManualLimite) {
        setFormLimiteAceitavelPeriodo(franquiaCalc);
      }

      const excedenteCalc = limiteFinal > 0 ? Math.max(0, Number((targetValor - limiteFinal).toFixed(2))) : 0;
      setFormValorExcedente(excedenteCalc);

      const distribuido = suministrosLogisticsService.recalcularDistribuicaoProRata(preRes.moradores, excedenteCalc);
      setFormRateioDetalhes(distribuido);
    } catch (err) {
      console.warn('Erro ao calcular moradores do período:', err);
    } finally {
      setIsCalculatingRateio(false);
    }
  };

  // Abrir modal para Nova Fatura
  const handleOpenNovaFatura = () => {
    setEditingFatura(null);
    const today = new Date().toISOString().split('T')[0];
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    setFormAlojamentoId('');
    setFormAlojamentoCodigo('');
    setFormAlojamentoNome('');
    setFormProvedorId('');
    setFormProvedorNome('');
    setFormServico('Electricidad');
    setFormConcepto('FACTURA DE ELECTRICIDAD');
    setFormMesPeriodo('OCT/NOV');
    setFormDataInicio(thirtyAgo);
    setFormDataFim(today);
    setFormNumDias(30);
    setFormValorFatura(0);
    setFormEstadoPago('PENDIENTE');
    setFormEstatusAloj('EN CURSO');
    setFormDescontadoFianza(false);
    setFormNumOP('');
    setFormDataOP('');
    setFormAnexoUrl('');
    setFormAnexoNome('');
    setFormObservacoes('');
    setFormLimitePessoaMes(50);
    setFormLimiteAceitavelPeriodo(0);
    setFormAjusteManualLimite(false);
    setFormValorExcedente(0);
    setFormRateioDetalhes([]);
    setIsFaturaModalOpen(true);
  };

  // Abrir modal para Editar Fatura ou Gerenciar Rateio
  const handleOpenEditarFatura = async (f: SuministroFatura) => {
    setEditingFatura(f);
    setFormAlojamentoId(f.alojamento_id || '');
    setFormAlojamentoCodigo(f.alojamento_codigo || '');
    setFormAlojamentoNome(f.alojamento_nome || f.direccion_planilha || '');
    setFormProvedorId(f.provedor_id || '');
    setFormProvedorNome(f.provedor_nome || '');
    setFormServico(f.servico || 'Electricidad');
    setFormConcepto(f.concepto_original || '');
    setFormMesPeriodo(f.mes_periodo || '');
    setFormDataInicio(f.data_inicio || '');
    setFormDataFim(f.data_fim || '');
    setFormNumDias(f.num_dias || 30);
    setFormValorFatura(f.valor_fatura || 0);
    setFormEstadoPago(f.estado_pago || 'PENDIENTE');
    setFormEstatusAloj(f.estatus_alojamento || 'EN CURSO');
    setFormDescontadoFianza(f.descontado_fianza || false);
    setFormNumOP(f.num_ordem_pago || '');
    setFormDataOP(f.data_ordem_pago || '');
    setFormAnexoUrl(f.anexo_fatura_url || '');
    setFormAnexoNome(f.anexo_fatura_nome || '');
    setFormObservacoes(f.observacoes || '');
    setFormLimitePessoaMes(f.limite_por_pessoa_mes || 50);
    setFormLimiteAceitavelPeriodo(f.limite_aceitavel_periodo || 0);
    setFormAjusteManualLimite(f.ajuste_manual_limite || false);
    setFormValorExcedente(f.valor_excedente || 0);
    if (f.competencia_desconto) setFormCompetenciaDesconto(f.competencia_desconto);

    setIsFaturaModalOpen(true);

    if (f.rateio_detalhes && f.rateio_detalhes.length > 0) {
      setFormRateioDetalhes(f.rateio_detalhes);
    } else {
      await handleRecalcularMoradoresEFranquia(
        f.alojamento_id || '',
        f.alojamento_codigo || '',
        f.alojamento_nome || f.direccion_planilha || '',
        f.servico,
        f.data_inicio || '',
        f.data_fim || '',
        f.valor_fatura,
        f.limite_por_pessoa_mes || undefined
      );
    }
  };

  // Upload de anexo da fatura
  const handleUploadAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAnexo(true);
    try {
      const uploaded = await uploadDocumentoVistoria(file, 'fatura_suministro');
      setFormAnexoUrl(uploaded.url);
      setFormAnexoNome(uploaded.nome || file.name);
      toast.success('Factura adjuntada con éxito.');
    } catch (err: any) {
      toast.error('Error al subir el archivo de la factura.');
    } finally {
      setIsUploadingAnexo(false);
      if (anexoInputRef.current) anexoInputRef.current.value = '';
    }
  };

  // Salvar Fatura (com opção de já solicitar OP ao Financeiro)
  const handleSaveFatura = async (solicitarOP = false) => {
    if (!formAlojamentoNome && !formAlojamentoId) {
      toast.warning('Seleccione un alojamiento para la factura.');
      return;
    }
    if (formValorFatura <= 0) {
      toast.warning('Informe un importe válido para la factura.');
      return;
    }

    setIsSavingFatura(true);
    try {
      const saved = await suministrosLogisticsService.salvarFatura({
        id: editingFatura?.id,
        codigo_fatura: editingFatura?.codigo_fatura,
        alojamento_id: formAlojamentoId || null,
        alojamento_codigo: formAlojamentoCodigo || null,
        alojamento_nome: formAlojamentoNome,
        direccion_planilha: editingFatura?.direccion_planilha || formAlojamentoNome,
        provedor_id: formProvedorId || null,
        provedor_nome: formProvedorNome || 'Proveedor',
        servico: formServico,
        concepto_original: formConcepto,
        mes_periodo: formMesPeriodo,
        data_inicio: formDataInicio || null,
        data_fim: formDataFim || null,
        num_dias: formNumDias,
        valor_fatura: formValorFatura,
        limite_por_pessoa_mes: formLimitePessoaMes,
        limite_aceitavel_periodo: formLimiteAceitavelPeriodo,
        ajuste_manual_limite: formAjusteManualLimite,
        valor_excedente: formValorExcedente,
        qtd_moradores_periodo: formRateioDetalhes.filter(m => !m.isento).length,
        rateio_status: editingFatura?.rateio_status === 'descontos_lancados'
          ? 'descontos_lancados'
          : (formValorExcedente > 0 ? 'pendente_revisao' : 'sem_excedente'),
        competencia_desconto: formCompetenciaDesconto,
        rateio_detalhes: formRateioDetalhes,
        ordem_pagamento_id: editingFatura?.ordem_pagamento_id || null,
        num_ordem_pago: formNumOP || null,
        data_ordem_pago: formDataOP || null,
        estado_pago: formDescontadoFianza ? 'DESCONTADO_FIANZA' : formEstadoPago,
        estatus_alojamento: formEstatusAloj,
        descontado_fianza: formDescontadoFianza,
        anexo_fatura_url: formAnexoUrl || null,
        anexo_fatura_nome: formAnexoNome || null,
        observacoes: formObservacoes
      });

      if (solicitarOP && saved?.id) {
        const opRes = await suministrosLogisticsService.solicitarOrdemPagamentoFinanceiro({
          faturaIds: [saved.id]
        });
        toast.success(`Factura guardada y Orden de Pago (${opRes.codigosOP.join(', ')}) enviada a Aprobación Financiera.`);
      } else {
        toast.success('Factura de suministro guardada con éxito.');
      }

      setIsFaturaModalOpen(false);
      await loadAll();
    } catch (err: any) {
      console.error('Erro ao salvar fatura:', err);
      toast.error(`Error al guardar factura: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSavingFatura(false);
    }
  };

  // Lançar descontos diretamente na folha (worker_discounts)
  const handleConfirmarDescontosFolha = async () => {
    const ativosComValor = formRateioDetalhes.filter(m => !m.isento && (Number(m.valor_desconto) || 0) > 0);
    if (ativosComValor.length === 0) {
      toast.warning('No hay trabajadores con importe de descuento mayor a € 0,00.');
      return;
    }

    setIsLaunchingDiscounts(true);
    try {
      // Primeiro garante que a fatura está salva
      const saved = await suministrosLogisticsService.salvarFatura({
        id: editingFatura?.id,
        codigo_fatura: editingFatura?.codigo_fatura,
        alojamento_id: formAlojamentoId || null,
        alojamento_codigo: formAlojamentoCodigo || null,
        alojamento_nome: formAlojamentoNome,
        provedor_id: formProvedorId || null,
        provedor_nome: formProvedorNome || 'Proveedor',
        servico: formServico,
        concepto_original: formConcepto,
        mes_periodo: formMesPeriodo,
        data_inicio: formDataInicio || null,
        data_fim: formDataFim || null,
        num_dias: formNumDias,
        valor_fatura: formValorFatura,
        limite_por_pessoa_mes: formLimitePessoaMes,
        limite_aceitavel_periodo: formLimiteAceitavelPeriodo,
        ajuste_manual_limite: formAjusteManualLimite,
        valor_excedente: formValorExcedente,
        competencia_desconto: formCompetenciaDesconto,
        rateio_detalhes: formRateioDetalhes,
        estado_pago: formEstadoPago,
        estatus_alojamento: formEstatusAloj,
        descontado_fianza: formDescontadoFianza,
        anexo_fatura_url: formAnexoUrl || null,
        anexo_fatura_nome: formAnexoNome || null,
        observacoes: formObservacoes
      });

      const res = await suministrosLogisticsService.lancarDescontosExcedenteFolha({
        faturaId: saved.id,
        competenciaDesconto: formCompetenciaDesconto,
        limiteAceitavelPeriodo: formLimiteAceitavelPeriodo,
        valorExcedente: formValorExcedente,
        rateioDetalhes: formRateioDetalhes
      });

      toast.success(`✅ Se lanzaron ${res.lancadosCount} descuento(s) en Nómina (Categoría SUMINISTROS) por un total de € ${res.totalDescontado.toFixed(2)}.`);
      setIsFaturaModalOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(`Error al lanzar descuentos: ${err.message}`);
    } finally {
      setIsLaunchingDiscounts(false);
    }
  };

  // Solicitar OP em Lote para faturas selecionadas
  const handleSolicitarOPLote = async (idsToProcess?: string[]) => {
    const targetIds = idsToProcess || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    setIsGeneratingBatchOP(true);
    try {
      const res = await suministrosLogisticsService.solicitarOrdemPagamentoFinanceiro({
        faturaIds: targetIds
      });
      toast.success(`✅ ${res.opCount} Orden(es) de Pago generada(s) y enviada(s) al Financiero: ${res.codigosOP.join(', ')}`);
      setSelectedIds(new Set());
      await loadAll();
    } catch (err: any) {
      toast.error(`Error al generar OP: ${err.message}`);
    } finally {
      setIsGeneratingBatchOP(false);
    }
  };

  // Excluir fatura
  const handleDeleteFatura = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro de factura de suministro?')) return;
    try {
      await suministrosLogisticsService.excluirFaturas(id);
      toast.success('Factura eliminada.');
      await loadAll();
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`);
    }
  };

  // Salvar limites configurados para um alojamento na Aba Resumen
  const handleSaveLimitesAlojamento = async () => {
    if (!limitesModalAloj?.alojamento_id) {
      toast.warning('Este alojamiento no tiene vínculo directo en la base.');
      return;
    }
    setIsSavingLimites(true);
    try {
      await suministrosLogisticsService.salvarLimitesAlojamento(limitesModalAloj.alojamento_id, limitesForm);
      toast.success(`Límites aceptables guardados para ${limitesModalAloj.alojamento_nome}`);
      setLimitesModalAloj(null);
      await loadAll();
    } catch (err: any) {
      toast.error(`Error al guardar límites: ${err.message}`);
    } finally {
      setIsSavingLimites(false);
    }
  };

  // Exportar Excel organizado (BASE_DATOS + RESUMEN_DIRECCIONES)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const baseData = filteredFaturas.map(f => ({
      'Código': f.codigo_fatura,
      'Cod Alojamiento': f.alojamento_codigo || '',
      'Dirección / Alojamiento': f.alojamento_nome || f.direccion_planilha || '',
      'Servicio': f.servico,
      'Concepto original': f.concepto_original || '',
      'Mes / periodo': f.mes_periodo || '',
      'Fecha inicio': f.data_inicio || '',
      'Fecha fin': f.data_fim || '',
      'Nº días': f.num_dias,
      'Importe (€)': f.valor_fatura,
      'Franquicia Aceptable (€)': f.limite_aceitavel_periodo,
      'Excedente (€)': f.valor_excedente,
      'Estado Rateo': f.rateio_status,
      'Fecha Orden de pago': f.data_ordem_pago || '',
      'Nº Orden de pago': f.num_ordem_pago || '',
      'Estado de Pago': f.estado_pago,
      'Observaciones': f.observacoes || '',
      'ESTATUS': f.estatus_alojamento
    }));

    const resumenData = resumenList.map(r => ({
      'Código': r.alojamento_codigo,
      'Dirección': r.alojamento_nome,
      'Nº registros': r.num_registros,
      'Total (€)': r.total_geral,
      'Electricidad (€)': r.total_electricidad,
      'Agua (€)': r.total_agua,
      'Gas (€)': r.total_gas,
      'Internet (€)': r.total_internet,
      'Limpieza / Reparaciones (€)': r.total_limpieza,
      'Calefacción (€)': r.total_calefaccion,
      'Comunidad (€)': r.total_comunidad,
      'Tasas / Residuos (€)': r.total_tasas,
      'Abonos (€)': r.total_abonos,
      'Otros (€)': r.total_otros,
      'Excedente Generado (€)': r.total_excedente_gerado,
      'Límite Luz (€/pers)': r.limites_config?.limite_luz_pessoa || 0,
      'Límite Agua (€/pers)': r.limites_config?.limite_agua_pessoa || 0,
      'Límite Gas (€/pers)': r.limites_config?.limite_gas_pessoa || 0,
      'ESTATUS': r.estatus
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baseData), 'BASE_DATOS');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), 'RESUMEN_DIRECCIONES');
    XLSX.writeFile(wb, `Control_Suministros_Alojamientos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Opções dinâmicas de Anos e Meses/Períodos de Consumo extraídas das faturas
  const anosDisponiveis = useMemo(() => {
    const setAnos = new Set<string>();
    faturas.forEach(f => {
      if (f.data_inicio && f.data_inicio.length >= 4) setAnos.add(f.data_inicio.slice(0, 4));
      if (f.data_fim && f.data_fim.length >= 4) setAnos.add(f.data_fim.slice(0, 4));
    });
    return Array.from(setAnos).sort((a, b) => b.localeCompare(a));
  }, [faturas]);

  const mesesPeriodosDisponiveis = useMemo(() => {
    const ordemMeses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const extras = new Set<string>();
    faturas.forEach(f => {
      const mp = (f.mes_periodo || '').trim().toUpperCase();
      if (mp && !ordemMeses.includes(mp)) {
        extras.add(mp);
      }
    });
    return {
      mesesPadrao: ordemMeses,
      periodosCompostos: Array.from(extras).sort()
    };
  }, [faturas]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    alojamentoFilter !== 'todos' ||
    servicoFilter !== 'todos' ||
    estadoPagoFilter !== 'todos' ||
    estatusFilter !== 'todos' ||
    excedenteFilter !== 'todos' ||
    mesPeriodoFilter !== 'todos' ||
    anoConsumoFilter !== 'todos' ||
    dataConsumoDesde ||
    dataConsumoHasta
  );

  const handleLimparFiltros = () => {
    setSearchTerm('');
    setAlojamentoFilter('todos');
    setServicoFilter('todos');
    setEstadoPagoFilter('todos');
    setEstatusFilter('todos');
    setExcedenteFilter('todos');
    setMesPeriodoFilter('todos');
    setAnoConsumoFilter('todos');
    setDataConsumoDesde('');
    setDataConsumoHasta('');
    setCurrentPage(1);
  };

  // Filtragem e Ordenação das Faturas
  const filteredFaturas = useMemo(() => {
    return faturas
      .filter(f => {
        if (alojamentoFilter !== 'todos') {
          const matchAloj = f.alojamento_id === alojamentoFilter || f.alojamento_codigo === alojamentoFilter || f.alojamento_nome === alojamentoFilter;
          if (!matchAloj) return false;
        }
        if (servicoFilter !== 'todos' && f.servico !== servicoFilter) return false;
        if (estadoPagoFilter !== 'todos' && f.estado_pago !== estadoPagoFilter) return false;
        if (estatusFilter !== 'todos' && f.estatus_alojamento !== estatusFilter) return false;
        if (excedenteFilter === 'com_excedente' && f.valor_excedente <= 0) return false;
        if (excedenteFilter === 'descontos_lancados' && f.rateio_status !== 'descontos_lancados') return false;
        if (excedenteFilter === 'enviado_financeiro' && f.rateio_status !== 'enviado_financeiro') return false;

        // Filtro por Año de Consumo
        if (anoConsumoFilter !== 'todos') {
          const anoIni = f.data_inicio ? f.data_inicio.slice(0, 4) : '';
          const anoFim = f.data_fim ? f.data_fim.slice(0, 4) : '';
          if (anoIni !== anoConsumoFilter && anoFim !== anoConsumoFilter) return false;
        }

        // Filtro por Mes / Período de Consumo (suporta nome do mês, períodos compostos ex: OCT/NOV e mês da data)
        if (mesPeriodoFilter !== 'todos') {
          const mpUpper = (f.mes_periodo || '').toUpperCase();
          const mapMeses: Record<string, { abrev: string[]; num: string }> = {
            ENERO: { abrev: ['ENERO', 'ENE'], num: '01' },
            FEBRERO: { abrev: ['FEBRERO', 'FEB'], num: '02' },
            MARZO: { abrev: ['MARZO', 'MAR'], num: '03' },
            ABRIL: { abrev: ['ABRIL', 'ABR'], num: '04' },
            MAYO: { abrev: ['MAYO', 'MAY'], num: '05' },
            JUNIO: { abrev: ['JUNIO', 'JUN'], num: '06' },
            JULIO: { abrev: ['JULIO', 'JUL'], num: '07' },
            AGOSTO: { abrev: ['AGOSTO', 'AGO'], num: '08' },
            SEPTIEMBRE: { abrev: ['SEPTIEMBRE', 'SEP', 'SET'], num: '09' },
            OCTUBRE: { abrev: ['OCTUBRE', 'OCT'], num: '10' },
            NOVIEMBRE: { abrev: ['NOVIEMBRE', 'NOV'], num: '11' },
            DICIEMBRE: { abrev: ['DICIEMBRE', 'DIC'], num: '12' }
          };
          const infoMes = mapMeses[mesPeriodoFilter];
          if (infoMes) {
            const matchTexto = mpUpper === mesPeriodoFilter || infoMes.abrev.some(ab => mpUpper.includes(ab));
            const mesIni = f.data_inicio ? f.data_inicio.slice(5, 7) : '';
            const mesFim = f.data_fim ? f.data_fim.slice(5, 7) : '';
            const matchData = mesIni === infoMes.num || mesFim === infoMes.num;
            if (!matchTexto && !matchData) return false;
          } else if (mpUpper !== mesPeriodoFilter) {
            return false;
          }
        }

        // Filtro por Intervalo de Datas de Consumo (Desde -> Hasta, verificando superposição do período de consumo)
        if (dataConsumoDesde) {
          const fimRef = f.data_fim || f.data_inicio || '';
          if (!fimRef || fimRef < dataConsumoDesde) return false;
        }
        if (dataConsumoHasta) {
          const iniRef = f.data_inicio || f.data_fim || '';
          if (!iniRef || iniRef > dataConsumoHasta) return false;
        }

        if (searchTerm.trim()) {
          if (
            !matchesPartialSearch(searchTerm, [
              f.codigo_fatura,
              f.alojamento_codigo,
              f.alojamento_nome,
              f.direccion_planilha,
              f.provedor_nome,
              f.servico,
              f.concepto_original,
              f.mes_periodo,
              f.num_ordem_pago,
              f.observacoes,
              f.estado_pago
            ])
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'valor_fatura') {
          cmp = a.valor_fatura - b.valor_fatura;
        } else if (sortField === 'alojamento_nome') {
          cmp = (a.alojamento_nome || '').localeCompare(b.alojamento_nome || '');
        } else if (sortField === 'servico') {
          cmp = (a.servico || '').localeCompare(b.servico || '');
        } else {
          cmp = (a.data_inicio || '').localeCompare(b.data_inicio || '');
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [faturas, alojamentoFilter, servicoFilter, estadoPagoFilter, estatusFilter, excedenteFilter, mesPeriodoFilter, anoConsumoFilter, dataConsumoDesde, dataConsumoHasta, searchTerm, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredFaturas.length / itemsPerPage));
  const paginatedFaturas = filteredFaturas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // KPIs Dinâmicos
  const kpis = useMemo(() => {
    return filteredFaturas.reduce(
      (acc, f) => {
        const v = Number(f.valor_fatura) || 0;
        const serv = (f.servico || '').toLowerCase();
        if (!serv.includes('abono')) {
          acc.totalGasto += v;
          acc.count += 1;
        }
        if (serv.includes('electr') || serv.includes('luz')) acc.luz += v;
        else if (serv.includes('agua')) acc.agua += v;
        else if (serv.includes('gas') || serv.includes('calefac')) acc.gas += v;

        if (f.estado_pago === 'PENDIENTE' || f.estado_pago === 'SOLICITADO' || f.estado_pago === 'CORRECCION_SOLICITADA') {
          acc.pendenteCount += 1;
          acc.pendenteValor += v;
        }
        if (f.valor_excedente > 0) {
          acc.excedenteCount += 1;
          acc.excedenteValor += f.valor_excedente;
        }
        return acc;
      },
      { count: 0, totalGasto: 0, luz: 0, agua: 0, gas: 0, pendenteCount: 0, pendenteValor: 0, excedenteCount: 0, excedenteValor: 0 }
    );
  }, [filteredFaturas]);

  const getServicoBadge = (servico: string) => {
    const s = (servico || '').toLowerCase();
    if (s.includes('electr') || s.includes('luz')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <Zap size={13} className="text-amber-500" />
          {servico}
        </span>
      );
    }
    if (s.includes('agua')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
          <Droplets size={13} className="text-sky-500" />
          {servico}
        </span>
      );
    }
    if (s.includes('gas') || s.includes('calefac')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800">
          <Flame size={13} className="text-orange-500" />
          {servico}
        </span>
      );
    }
    if (s.includes('internet')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <Wifi size={13} className="text-indigo-500" />
          {servico}
        </span>
      );
    }
    if (s.includes('limp') || s.includes('reparac')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          <Wrench size={13} className="text-purple-500" />
          {servico}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        <Building2 size={13} className="text-slate-500" />
        {servico}
      </span>
    );
  };

  const getEstadoPagoBadge = (f: SuministroFatura) => {
    switch (f.estado_pago) {
      case 'PAGADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 size={12} /> PAGADO
          </span>
        );
      case 'DESCONTADO_FIANZA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
            <ShieldCheck size={12} /> DESC. FIANZA
          </span>
        );
      case 'APROBADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300">
            <Check size={12} /> APROBADO FINANZAS
          </span>
        );
      case 'SOLICITADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock size={12} /> SOLICITADO (OP)
          </span>
        );
      case 'CORRECCION_SOLICITADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertTriangle size={12} /> CORRECCIÓN FINANZAS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <Clock size={12} /> PENDIENTE OP
          </span>
        );
    }
  };

  const somaRateioAtual = formRateioDetalhes
    .filter(m => !m.isento)
    .reduce((acc, m) => acc + (Number(m.valor_desconto) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Zap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestión de Suministros & Control de Excedentes
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Puente Logística ↔ Financiero ↔ Nómina
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control de facturas de electricidad, agua, gas y servicios por alojamiento, cálculo de franquicia aceptable por persona/período, generación de Órdenes de Pago y prorrateo de excedentes a los trabajadores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <Download size={15} />
            Exportar Excel
          </button>
          <button
            onClick={loadAll}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenNovaFatura}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus size={16} />
            Registrar Factura de Suministro
          </button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Consumo Suministros</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            € {kpis.totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {kpis.count} facturas en {resumenList.length} alojamientos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Electricidad (Luz)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            € {kpis.luz.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Principal suministro sujeto a franquicia
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Agua + Gas / Calefacción</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600">
              <Droplets size={16} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            € {(kpis.agua + kpis.gas).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Agua: € {kpis.agua.toFixed(0)} • Gas/Calef.: € {kpis.gas.toFixed(0)}
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('faturas');
            setEstadoPagoFilter(estadoPagoFilter === 'PENDIENTE' ? 'todos' : 'PENDIENTE');
          }}
          className="cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 hover:border-amber-400 transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pendientes / En Aprobación</span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            € {kpis.pendenteValor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-600/90 mt-1 font-semibold">
            {kpis.pendenteCount} factura(s) pendientes o en OP
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('faturas');
            setExcedenteFilter(excedenteFilter === 'com_excedente' ? 'todos' : 'com_excedente');
          }}
          className="cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 hover:border-rose-400 transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Excedentes a Descontar</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <Calculator size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            € {kpis.excedenteValor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1 font-semibold">
            {kpis.excedenteCount} factura(s) con exceso de consumo
          </p>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('faturas')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'faturas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            📋 Facturas & Consumos (Base de Datos)
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredFaturas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resumen')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'resumen'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Home size={16} />
            🏠 Resumen por Alojamiento & Límites Aceptables
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {resumenList.length}
            </span>
          </button>
        </div>

        {alojamentoFilter !== 'todos' && (
          <button
            onClick={() => setAlojamentoFilter('todos')}
            className="flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold border border-blue-200"
          >
            <span>Filtro Alojamiento activo</span>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: FACTURAS & CONSUMOS (BASE DE DATOS)                            */}
      {/* ===================================================================== */}
      {activeTab === 'faturas' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-6 gap-3 shadow-2xs">
            <div className="md:col-span-2 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar dirección, código AL-XXXX, Nº OP, mes, concepto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div>
              <select
                value={alojamentoFilter}
                onChange={e => {
                  setAlojamentoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="todos">🏠 Todos los Alojamientos ({resumenList.length})</option>
                {resumenList.map(r => (
                  <option key={r.alojamento_id || r.alojamento_codigo} value={r.alojamento_id || r.alojamento_codigo}>
                    {r.alojamento_codigo} - {r.alojamento_nome.substring(0, 38)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={servicoFilter}
                onChange={e => {
                  setServicoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="todos">⚡ Todos los Servicios</option>
                {SERVICOS_SUMINISTROS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={estadoPagoFilter}
                onChange={e => {
                  setEstadoPagoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="todos">💳 Todos los Estados de Pago</option>
                <option value="PENDIENTE">⏳ Pendiente de OP</option>
                <option value="SOLICITADO">📤 Solicitado (En Aprobación Finanzas)</option>
                <option value="APROBADO">✅ Aprobado por Finanzas</option>
                <option value="PAGADO">💚 Pagado</option>
                <option value="DESCONTADO_FIANZA">🛡️ Descontado de Fianza</option>
                <option value="CORRECCION_SOLICITADA">⚠️ Corrección Solicitada</option>
              </select>
            </div>

            <div>
              <select
                value={excedenteFilter}
                onChange={e => {
                  setExcedenteFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="todos">📊 Todos (Con y Sin Excedente)</option>
                <option value="com_excedente">🔴 Con Excedente (&gt; Límite)</option>
                <option value="enviado_financeiro">📤 Excedente Enviado a Finanzas</option>
                <option value="descontos_lancados">✅ Descuentos Lanzados en Nómina</option>
              </select>
            </div>

            {/* Segunda Linha de Filtros: Período de Consumo (Mês, Ano, Datas Desde/Hasta) e Estatus do Alojamento */}
            <div className="md:col-span-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  📅 Mes / Período Consumo
                </label>
                <select
                  value={mesPeriodoFilter}
                  onChange={e => {
                    setMesPeriodoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todos">Todos los Meses / Períodos</option>
                  <optgroup label="Meses del Año (Incluye fechas y compuestos)">
                    {mesesPeriodosDisponiveis.mesesPadrao.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </optgroup>
                  {mesesPeriodosDisponiveis.periodosCompostos.length > 0 && (
                    <optgroup label="Períodos Específicos / Bimensuales">
                      {mesesPeriodosDisponiveis.periodosCompostos.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  📆 Año Consumo
                </label>
                <select
                  value={anoConsumoFilter}
                  onChange={e => {
                    setAnoConsumoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todos">Todos los Años</option>
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>Año {ano}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  📥 Consumo Desde (Inicio)
                </label>
                <input
                  type="date"
                  value={dataConsumoDesde}
                  onChange={e => {
                    setDataConsumoDesde(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  📤 Consumo Hasta (Fin)
                </label>
                <input
                  type="date"
                  value={dataConsumoHasta}
                  onChange={e => {
                    setDataConsumoHasta(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  🏠 Estatus Inmueble
                </label>
                <select
                  value={estatusFilter}
                  onChange={e => {
                    setEstatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="todos">Todos los Estatus</option>
                  <option value="EN CURSO">🟢 EN CURSO (Activos)</option>
                  <option value="FINALIZADO">⚪ FINALIZADO (Cerrados)</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  disabled={!hasActiveFilters}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    hasActiveFilters
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 cursor-pointer'
                      : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <X size={14} />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Seleção em Lote */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
              <div className="flex items-center gap-3">
                <CheckSquare size={18} />
                <span className="text-xs font-bold">
                  {selectedIds.size} factura(s) seleccionada(s)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleSolicitarOPLote()}
                  disabled={isGeneratingBatchOP}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold shadow-xs transition-all"
                >
                  <Send size={14} />
                  {isGeneratingBatchOP ? 'Enviando al Financiero...' : 'Solicitar Orden de Pago al Financiero'}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabela Principal de Faturas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <button
                        onClick={() => {
                          if (selectedIds.size === paginatedFaturas.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(paginatedFaturas.map(f => f.id)));
                          }
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {selectedIds.size > 0 && selectedIds.size === paginatedFaturas.length ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        setSortField('alojamento_nome');
                        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Alojamiento / Dirección <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        setSortField('servico');
                        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Servicio / Concepto <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        setSortField('data_inicio');
                        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Período Consumo & Días <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800"
                      onClick={() => {
                        setSortField('valor_fatura');
                        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Importe Factura <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right">Franquicia / Excedente</th>
                    <th className="py-3.5 px-4">Estado Pago & OP (Finanzas)</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Cargando facturas de suministros...
                      </td>
                    </tr>
                  ) : paginatedFaturas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No se encontraron facturas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedFaturas.map(f => {
                      const isSelected = selectedIds.has(f.id);
                      const hasExcedente = f.valor_excedente > 0;
                      return (
                        <tr
                          key={f.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                const next = new Set(selectedIds);
                                if (next.has(f.id)) next.delete(f.id);
                                else next.add(f.id);
                                setSelectedIds(next);
                              }}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                            </button>
                          </td>

                          {/* Alojamiento */}
                          <td className="py-3 px-4 max-w-[260px]">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {f.alojamento_codigo && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                                  {f.alojamento_codigo}
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                  f.estatus_alojamento === 'EN CURSO'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {f.estatus_alojamento}
                              </span>
                            </div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate" title={f.alojamento_nome || ''}>
                              {f.alojamento_nome || f.direccion_planilha}
                            </div>
                            {f.observacoes && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={f.observacoes}>
                                💬 {f.observacoes}
                              </div>
                            )}
                          </td>

                          {/* Servicio */}
                          <td className="py-3 px-4">
                            {getServicoBadge(f.servico)}
                            <div className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-[180px]">
                              {f.concepto_original}
                            </div>
                          </td>

                          {/* Período & Días */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              <span>{f.mes_periodo || 'Período'}</span>
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {f.num_dias}d
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {f.data_inicio || '—'} → {f.data_fim || '—'}
                            </div>
                          </td>

                          {/* Importe Factura */}
                          <td className="py-3 px-4 text-right">
                            <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                              € {f.valor_fatura.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {f.anexo_fatura_url && (
                              <a
                                href={f.anexo_fatura_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-0.5 font-semibold"
                              >
                                <Paperclip size={10} /> Ver Factura
                              </a>
                            )}
                          </td>

                          {/* Franquicia / Excedente */}
                          <td className="py-3 px-4 text-right">
                            {hasExcedente ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300">
                                  + € {f.valor_excedente.toFixed(2)}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Límite: € {f.limite_aceitavel_periodo.toFixed(2)}
                                </div>
                                {f.rateio_status === 'descontos_lancados' ? (
                                  <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                    ✅ Descontado en Nómina
                                  </span>
                                ) : f.rateio_status === 'enviado_financeiro' ? (
                                  <span className="inline-block mt-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                    📤 En revisión Finanzas
                                  </span>
                                ) : (
                                  <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-600">
                                    ⚡ Pendiente Prorrateo
                                  </span>
                                )}
                              </div>
                            ) : f.limite_aceitavel_periodo > 0 ? (
                              <div>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  ✅ Dentro del límite
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Tope: € {f.limite_aceitavel_periodo.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenEditarFatura(f)}
                                className="text-[11px] text-slate-400 hover:text-blue-600 underline decoration-dotted"
                              >
                                Calcular franquicia
                              </button>
                            )}
                          </td>

                          {/* Estado de Pago & OP */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col items-start gap-1">
                              {getEstadoPagoBadge(f)}
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                {f.num_ordem_pago && f.num_ordem_pago !== 'N/A' && (
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    Nº OP: {f.num_ordem_pago}
                                  </span>
                                )}
                                {f.data_ordem_pago && <span>• {f.data_ordem_pago}</span>}
                              </div>
                              {f.motivo_correcao_financeiro && (
                                <div className="text-[10px] text-rose-600 font-semibold max-w-[200px] truncate" title={f.motivo_correcao_financeiro}>
                                  ⚠️ {f.motivo_correcao_financeiro}
                                </div>
                              )}
                              {f.comprovante_pagamento_url && (
                                <a
                                  href={f.comprovante_pagamento_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:underline"
                                >
                                  <ExternalLink size={10} /> Comprobante Pago
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditarFatura(f)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold transition-colors"
                                title="Calcular Franquicia, Prorrateo de Moradores y Editar Factura"
                              >
                                <Calculator size={13} />
                                <span>Rateo / Editar</span>
                              </button>

                              {(f.estado_pago === 'PENDIENTE' || f.estado_pago === 'CORRECCION_SOLICITADA') && !f.descontado_fianza && (
                                <button
                                  onClick={() => handleSolicitarOPLote([f.id])}
                                  disabled={isGeneratingBatchOP}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs transition-colors"
                                  title="Enviar Solicitud de Orden de Pago al Financiero"
                                >
                                  <Send size={12} />
                                  <span>Solicitar OP</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteFatura(f.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Eliminar factura"
                              >
                                <Trash2 size={14} />
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

            {/* Rodapé de Paginação */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredFaturas.length)} de {filteredFaturas.length} facturas
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: RESUMEN POR ALOJAMIENTO & PARÁMETROS DE LÍMITES                 */}
      {/* ===================================================================== */}
      {activeTab === 'resumen' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                Resumen Consolidado por Dirección / Alojamiento (Stock & Parámetros de Consumo Aceptable)
              </h3>
              <p className="text-xs text-slate-500">
                Haga clic en "Configurar Límites" para definir el valor aceptable por persona/mes (Luz, Agua, Gas) o tope fijo de cada alojamiento.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Alojamiento / Dirección</th>
                  <th className="py-3 px-3 text-center">Facturas</th>
                  <th className="py-3 px-3 text-right">Total (€)</th>
                  <th className="py-3 px-3 text-right text-amber-600">Luz (€)</th>
                  <th className="py-3 px-3 text-right text-sky-600">Agua (€)</th>
                  <th className="py-3 px-3 text-right text-orange-600">Gas / Calef. (€)</th>
                  <th className="py-3 px-3 text-right text-indigo-600">Internet (€)</th>
                  <th className="py-3 px-3 text-right text-purple-600">Limpieza (€)</th>
                  <th className="py-3 px-3 text-right">Tasas / Com. (€)</th>
                  <th className="py-3 px-3 text-right text-emerald-600">Abonos (€)</th>
                  <th className="py-3 px-3 text-center">Límites Aceptables (€/pers/mes)</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {resumenList.map((r, idx) => {
                  const cfg = r.limites_config || {};
                  return (
                    <tr key={r.alojamento_id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                            {r.alojamento_codigo}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              r.estatus === 'EN CURSO'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.estatus}
                          </span>
                          {r.ocupantes_atuais > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700">
                              👥 {r.ocupantes_atuais} alojados
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setAlojamentoFilter(r.alojamento_id || r.alojamento_codigo);
                            setActiveTab('faturas');
                          }}
                          className="font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 text-left truncate block w-full"
                          title={r.alojamento_nome}
                        >
                          {r.alojamento_nome}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.num_registros}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white font-mono">
                        € {r.total_geral.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 font-semibold">
                        € {r.total_electricidad.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-sky-700 dark:text-sky-300 font-semibold">
                        € {r.total_agua.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-orange-700 dark:text-orange-300 font-semibold">
                        € {(r.total_gas + r.total_calefaccion).toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-indigo-700 dark:text-indigo-300">
                        € {r.total_internet.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-purple-700 dark:text-purple-300">
                        € {r.total_limpieza.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        € {(r.total_tasas + r.total_comunidad + r.total_otros).toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                        {r.total_abonos > 0 ? `€ ${r.total_abonos.toFixed(2)}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            ⚡ {cfg.limite_luz_pessoa ?? 50}€
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-[10px] font-bold">
                            💧 {cfg.limite_agua_pessoa ?? 20}€
                          </span>
                          <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 text-[10px] font-bold">
                            🔥 {cfg.limite_gas_pessoa ?? 30}€
                          </span>
                          {Number(cfg.limite_global_alojamento) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-bold">
                              🏠 Tope: {cfg.limite_global_alojamento}€
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setLimitesModalAloj(r);
                              setLimitesForm({
                                limite_luz_pessoa: Number(cfg.limite_luz_pessoa ?? 50),
                                limite_agua_pessoa: Number(cfg.limite_agua_pessoa ?? 20),
                                limite_gas_pessoa: Number(cfg.limite_gas_pessoa ?? 30),
                                limite_calefaccion_pessoa: Number(cfg.limite_calefaccion_pessoa ?? 30),
                                limite_global_pessoa: Number(cfg.limite_global_pessoa ?? 0),
                                limite_global_alojamento: Number(cfg.limite_global_alojamento ?? 0)
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold"
                          >
                            <Sliders size={12} />
                            <span>Límites</span>
                          </button>
                          <button
                            onClick={() => {
                              setAlojamentoFilter(r.alojamento_id || r.alojamento_codigo);
                              setActiveTab('faturas');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold"
                          >
                            Ver Facturas
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE NOVA / EDITAR FATURA + PRORRATEO DE EXCEDENTE                 */}
      {/* ===================================================================== */}
      {isFaturaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {editingFatura ? `Factura ${editingFatura.codigo_fatura} — Control de Suministro & Prorrateo` : 'Registrar Nueva Factura de Suministro'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Complete los datos de la factura, verifique la franquicia aceptable y el prorrateo entre los moradores del período.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFaturaModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Bloco 1: Dados da Fatura e Alojamento */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alojamiento Vinculado *
                  </label>
                  <AlojamentoQuickCombobox
                    alojamentos={alojamentos as any}
                    selectedId={formAlojamentoId}
                    onSelect={alojId => {
                      const found = alojamentos.find(a => a.id === alojId);
                      setFormAlojamentoId(alojId);
                      if (found) {
                        setFormAlojamentoCodigo(found.codigo || '');
                        setFormAlojamentoNome(found.nome || found.titulo || '');
                        setFormProvedorId(found.provedor_id || '');
                        setFormProvedorNome(found.provedor?.nome_razao_social || 'Proveedor');
                        setFormEstatusAloj(found.status === 'Inactivo' ? 'FINALIZADO' : 'EN CURSO');
                        handleRecalcularMoradoresEFranquia(
                          found.id,
                          found.codigo || '',
                          found.nome || found.titulo || '',
                          formServico,
                          formDataInicio,
                          formDataFim,
                          formValorFatura
                        );
                      }
                    }}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Suministro / Servicio *
                  </label>
                  <select
                    value={formServico}
                    onChange={e => {
                      const s = e.target.value;
                      setFormServico(s);
                      setFormConcepto(`FACTURA DE ${s.toUpperCase()}`);
                      handleRecalcularMoradoresEFranquia(
                        formAlojamentoId,
                        formAlojamentoCodigo,
                        formAlojamentoNome,
                        s,
                        formDataInicio,
                        formDataFim,
                        formValorFatura
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {SERVICOS_SUMINISTROS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mes / Período Referencia
                  </label>
                  <input
                    type="text"
                    value={formMesPeriodo}
                    onChange={e => setFormMesPeriodo(e.target.value)}
                    placeholder="Ej: OCT/NOV o NOVIEMBRE"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold uppercase"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Inicio Consumo
                  </label>
                  <input
                    type="date"
                    value={formDataInicio}
                    onChange={e => {
                      setFormDataInicio(e.target.value);
                      handleRecalcularMoradoresEFranquia(
                        formAlojamentoId,
                        formAlojamentoCodigo,
                        formAlojamentoNome,
                        formServico,
                        e.target.value,
                        formDataFim,
                        formValorFatura,
                        formLimitePessoaMes
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Fin Consumo
                  </label>
                  <input
                    type="date"
                    value={formDataFim}
                    onChange={e => {
                      setFormDataFim(e.target.value);
                      handleRecalcularMoradoresEFranquia(
                        formAlojamentoId,
                        formAlojamentoCodigo,
                        formAlojamentoNome,
                        formServico,
                        formDataInicio,
                        e.target.value,
                        formValorFatura,
                        formLimitePessoaMes
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nº Días Período
                  </label>
                  <input
                    type="number"
                    value={formNumDias}
                    onChange={e => setFormNumDias(Math.max(1, Number(e.target.value) || 30))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Importe Total de la Factura (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formValorFatura || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setFormValorFatura(val);
                      const exc = formLimiteAceitavelPeriodo > 0 ? Math.max(0, Number((val - formLimiteAceitavelPeriodo).toFixed(2))) : 0;
                      setFormValorExcedente(exc);
                      setFormRateioDetalhes(prev => suministrosLogisticsService.recalcularDistribuicaoProRata(prev, exc));
                    }}
                    placeholder="Ej: 500.00"
                    className="w-full px-3.5 py-2 bg-emerald-50/50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-black text-emerald-900 dark:text-emerald-200"
                  />
                </div>
              </div>

              {/* Opções de Anexo, Fianza e Observações */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Archivo PDF / Foto de la Factura
                  </label>
                  <input
                    ref={anexoInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleUploadAnexo}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => anexoInputRef.current?.click()}
                      disabled={isUploadingAnexo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      <Upload size={13} />
                      {isUploadingAnexo ? 'Subiendo...' : 'Subir Factura'}
                    </button>
                    {formAnexoUrl && (
                      <a
                        href={formAnexoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline truncate max-w-[160px]"
                      >
                        📎 {formAnexoNome || 'Ver Anexo'}
                      </a>
                    )}
                  </div>
                </div>

                <div className="md:col-span-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formDescontadoFianza}
                      onChange={e => {
                        setFormDescontadoFianza(e.target.checked);
                        if (e.target.checked) setFormEstadoPago('DESCONTADO_FIANZA');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-purple-800 dark:text-purple-300 block">
                        Se descuenta de la Fianza del Alojamiento
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        No requiere Orden de Pago bancaria (abate saldo de fianza)
                      </span>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Observaciones / Notas
                  </label>
                  <input
                    type="text"
                    value={formObservacoes}
                    onChange={e => setFormObservacoes(e.target.value)}
                    placeholder="Ej: Exceso de consumo por calefacción / visitas..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* ===================================================================== */}
              {/* BLOCO 2: MOTOR DE FRANQUIA ACEITÁVEL & PRORRATEO POR MORADOR          */}
              {/* ===================================================================== */}
              <div className="rounded-2xl border-2 border-amber-200/90 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-white">
                      <Calculator size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Cálculo de Consumo Aceptable (Franquicia) & Prorrateo de Excedente
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Fórmula automática: <strong>Límite €/persona/mes × Nº Moradores ({formRateioDetalhes.filter(m => !m.isento).length || 1}) × ({formNumDias} días / 30)</strong> (con ajuste manual libre).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRecalcularMoradoresEFranquia(
                        formAlojamentoId,
                        formAlojamentoCodigo,
                        formAlojamentoNome,
                        formServico,
                        formDataInicio,
                        formDataFim,
                        formValorFatura,
                        formLimitePessoaMes
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors"
                  >
                    <RefreshCw size={13} className={isCalculatingRateio ? 'animate-spin' : ''} />
                    Recalcular Automático por Período
                  </button>
                </div>

                {/* Linha de Parâmetros Numéricos da Franquia */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Parámetro (€ / Persona / 30d)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formLimitePessoaMes}
                      onChange={e => {
                        const limP = Number(e.target.value) || 0;
                        setFormLimitePessoaMes(limP);
                        setFormAjusteManualLimite(false);
                        const moradoresAtivos = Math.max(1, formRateioDetalhes.filter(m => !m.isento).length || 1);
                        const novoLimPeriodo = calcularFranquiaPeriodo({
                          limitePorPessoaMes: limP,
                          qtdMoradores: moradoresAtivos,
                          numDias: formNumDias
                        });
                        setFormLimiteAceitavelPeriodo(novoLimPeriodo);
                        const novoExc = novoLimPeriodo > 0 ? Math.max(0, Number((formValorFatura - novoLimPeriodo).toFixed(2))) : 0;
                        setFormValorExcedente(novoExc);
                        setFormRateioDetalhes(prev => suministrosLogisticsService.recalcularDistribuicaoProRata(prev, novoExc));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-black text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">
                      Límite Aceptable Período (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formLimiteAceitavelPeriodo}
                      onChange={e => {
                        const limPer = Number(e.target.value) || 0;
                        setFormLimiteAceitavelPeriodo(limPer);
                        setFormAjusteManualLimite(true);
                        const novoExc = Math.max(0, Number((formValorFatura - limPer).toFixed(2)));
                        setFormValorExcedente(novoExc);
                        setFormRateioDetalhes(prev => suministrosLogisticsService.recalcularDistribuicaoProRata(prev, novoExc));
                      }}
                      className="w-full px-2.5 py-1.5 bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 rounded-lg text-sm font-black text-emerald-700 dark:text-emerald-300"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/60">
                    <label className="block text-[10px] font-bold text-rose-600 uppercase mb-1">
                      Excedente a Descontar (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formValorExcedente}
                      onChange={e => {
                        const excManual = Math.max(0, Number(e.target.value) || 0);
                        setFormValorExcedente(excManual);
                        setFormRateioDetalhes(prev => suministrosLogisticsService.recalcularDistribuicaoProRata(prev, excManual));
                      }}
                      className="w-full px-2.5 py-1.5 bg-rose-50/60 dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg text-sm font-black text-rose-700 dark:text-rose-300"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">
                      Mes Nómina (Descuento)
                    </label>
                    <input
                      type="month"
                      value={formCompetenciaDesconto}
                      onChange={e => setFormCompetenciaDesconto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Tabela Editável de Moradores do Período */}
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Users size={14} className="text-blue-600" />
                      Trabajadores Alojados en el Período ({formRateioDetalhes.length})
                    </span>

                    {/* Adicionar trabalhador manualmente ao rateio */}
                    <div className="flex items-center gap-2">
                      <select
                        value={workerAddSearch}
                        onChange={e => {
                          const wId = e.target.value;
                          if (!wId) return;
                          const wObj = allWorkers.find(w => w.id === wId);
                          if (wObj && !formRateioDetalhes.some(m => m.worker_id === wObj.id)) {
                            const novaLista: RateioMoradorItem[] = [
                              ...formRateioDetalhes,
                              {
                                worker_id: wObj.id,
                                worker_nome: wObj.nome,
                                codigo_colab: wObj.cod_colab,
                                empresa_contratante: wObj.contratante,
                                cliente_nome: wObj.cliente,
                                dias_alojado: formNumDias,
                                percentual: 0,
                                valor_sugerido: 0,
                                valor_desconto: 0,
                                isento: false
                              }
                            ];
                            setFormRateioDetalhes(
                              suministrosLogisticsService.recalcularDistribuicaoProRata(novaLista, formValorExcedente)
                            );
                          }
                          setWorkerAddSearch('');
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="">+ Incluir trabajador manualmente al prorrateo...</option>
                        {allWorkers.slice(0, 150).map(w => (
                          <option key={w.id} value={w.id}>
                            {w.nome} ({w.cod_colab || 'S/C'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formRateioDetalhes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No se detectaron trabajadores en este alojamiento para el período seleccionado. Puede seleccionar un alojamiento o añadir un trabajador manualmente arriba.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                          <th className="py-2 px-3">Aplicar</th>
                          <th className="py-2 px-3">Trabajador</th>
                          <th className="py-2 px-3">Cliente / Empresa</th>
                          <th className="py-2 px-3 text-center">Días en Período</th>
                          <th className="py-2 px-3 text-right">% Prop.</th>
                          <th className="py-2 px-3 text-right">Descuento (€)</th>
                          <th className="py-2 px-3">Nota Individual</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {formRateioDetalhes.map((m, idx) => (
                          <tr key={m.worker_id || idx} className={m.isento ? 'opacity-50 bg-slate-50/50' : ''}>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={!m.isento}
                                onChange={e => {
                                  const next = formRateioDetalhes.map((item, i) =>
                                    i === idx ? { ...item, isento: !e.target.checked } : item
                                  );
                                  setFormRateioDetalhes(
                                    suministrosLogisticsService.recalcularDistribuicaoProRata(next, formValorExcedente)
                                  );
                                }}
                                className="rounded border-slate-300 text-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {m.worker_nome}
                              <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                                {m.codigo_colab || ''}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {m.cliente_nome || m.empresa_contratante || 'General'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={365}
                                value={m.dias_alojado}
                                onChange={e => {
                                  const novosDias = Math.max(0, Number(e.target.value) || 0);
                                  const next = formRateioDetalhes.map((item, i) =>
                                    i === idx ? { ...item, dias_alojado: novosDias } : item
                                  );
                                  setFormRateioDetalhes(
                                    suministrosLogisticsService.recalcularDistribuicaoProRata(next, formValorExcedente)
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {m.percentual.toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={m.valor_desconto}
                                onChange={e => {
                                  const novoVal = Math.max(0, Number(e.target.value) || 0);
                                  setFormRateioDetalhes(prev =>
                                    prev.map((item, i) => (i === idx ? { ...item, valor_desconto: novoVal } : item))
                                  );
                                }}
                                className="w-24 px-2 py-1 text-right font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-slate-900 border border-rose-200 dark:border-slate-700 rounded-lg"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={m.observacao || ''}
                                onChange={e => {
                                  const obs = e.target.value;
                                  setFormRateioDetalhes(prev =>
                                    prev.map((item, i) => (i === idx ? { ...item, observacao: obs } : item))
                                  );
                                }}
                                placeholder="Opcional..."
                                className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = formRateioDetalhes.filter((_, i) => i !== idx);
                                  setFormRateioDetalhes(
                                    suministrosLogisticsService.recalcularDistribuicaoProRata(next, formValorExcedente)
                                  );
                                }}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 font-bold">
                          <td colSpan={5} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                            Total Prorrateado a Descontar:
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-rose-700 dark:text-rose-300">
                            € {somaRateioAtual.toFixed(2)}
                          </td>
                          <td colSpan={2} className="py-2.5 px-3 text-right">
                            {formValorExcedente > 0 && (
                              <button
                                type="button"
                                onClick={handleConfirmarDescontosFolha}
                                disabled={isLaunchingDiscounts}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs transition-all"
                              >
                                <Check size={13} />
                                {isLaunchingDiscounts ? 'Lanzando...' : 'Lanzar Descuentos en Nómina Ahora'}
                              </button>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-3">
              <div className="text-[11px] text-slate-500">
                💡 Al enviar al Financiero, el prorrateo sugerido aparecerá directamente en la pantalla de aprobación de la Orden de Pago.
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFaturaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFatura(false)}
                  disabled={isSavingFatura}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                >
                  {isSavingFatura ? 'Guardando...' : 'Guardar Factura'}
                </button>
                {!formDescontadoFianza && (!editingFatura?.ordem_pagamento_id) && (
                  <button
                    type="button"
                    onClick={() => handleSaveFatura(true)}
                    disabled={isSavingFatura}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20"
                  >
                    <Send size={14} />
                    Guardar + Solicitar OP al Financiero
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE CONFIGURAÇÃO DE LIMITES ACEITÁVEIS POR ALOJAMENTO            */}
      {/* ===================================================================== */}
      {limitesModalAloj && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Configurar Límites Aceptables (Franquicia)
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-sm">
                  {limitesModalAloj.alojamento_codigo} — {limitesModalAloj.alojamento_nome}
                </p>
              </div>
              <button onClick={() => setLimitesModalAloj(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 mb-1">⚡ Luz (€/pers/mes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitesForm.limite_luz_pessoa ?? 50}
                    onChange={e => setLimitesForm(prev => ({ ...prev, limite_luz_pessoa: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-amber-50/40 dark:bg-slate-800 border border-amber-200 rounded-xl text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-sky-700 mb-1">💧 Agua (€/pers/mes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitesForm.limite_agua_pessoa ?? 20}
                    onChange={e => setLimitesForm(prev => ({ ...prev, limite_agua_pessoa: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-sky-50/40 dark:bg-slate-800 border border-sky-200 rounded-xl text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-orange-700 mb-1">🔥 Gas (€/pers/mes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitesForm.limite_gas_pessoa ?? 30}
                    onChange={e => setLimitesForm(prev => ({ ...prev, limite_gas_pessoa: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-orange-50/40 dark:bg-slate-800 border border-orange-200 rounded-xl text-sm font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tope Global (€/persona/mes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitesForm.limite_global_pessoa ?? 0}
                    onChange={e => setLimitesForm(prev => ({ ...prev, limite_global_pessoa: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tope Fijo Alojamiento (€/mes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitesForm.limite_global_alojamento ?? 0}
                    onChange={e => setLimitesForm(prev => ({ ...prev, limite_global_alojamento: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setLimitesModalAloj(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLimitesAlojamento}
                disabled={isSavingLimites}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {isSavingLimites ? 'Guardando...' : 'Guardar Límites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
