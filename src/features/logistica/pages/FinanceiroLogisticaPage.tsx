import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Home,
  CreditCard,
  Send,
  Check,
  X,
  FileText,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Copy,
  Zap,
  Droplets,
  Globe,
  Flame,
  Wrench,
  Pencil,
  Trash2,
  Ban,
  FileCheck,
  ExternalLink,
  Filter,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Plane,
  Ticket,
  User,
  FileUp,
  Paperclip,
  MapPin,
  Navigation,
  Utensils
} from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { financeLogisticsService } from '../services/financeLogisticsService';
import type { PagoAlojamento } from '../services/financeLogisticsService';
import { logisticsService } from '../services/logisticsService';
import type { Alojamento, Provedor } from '../services/logisticsService';
import { EditarOrdemPagoModal } from '../components/EditarOrdemPagoModal';
import { ReciboPagoModal } from '../components/ReciboPagoModal';

export const FinanceiroLogisticaPage: React.FC = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState<PagoAlojamento[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [competenciaFilter, setCompetenciaFilter] = useState<string>('todos');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Seleção Múltipla para Envio e Exclusão em Lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Ordenação de Colunas
  const [sortField, setSortField] = useState<string>('data_vencimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Modais de Edição e Recibo
  const [editingOp, setEditingOp] = useState<PagoAlojamento | null>(null);
  const [receiptOp, setReceiptOp] = useState<PagoAlojamento | null>(null);

  // Lista de Trabalhadores e Alocações
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Array<{ id: string; nome: string; cod_colab?: string; nif?: string }>>([]);

  // Modal Nueva OP / Gasto (Ampliado e Completo)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoVinculacao, setModoVinculacao] = useState<'deslocamento' | 'alojamento' | 'geral'>('deslocamento');

  // Trabalhador & Deslocamento
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedWorkerNome, setSelectedWorkerNome] = useState<string>('');
  const [selectedWorkerCodigo, setSelectedWorkerCodigo] = useState<string>('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState<string>('');
  const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState<boolean>(false);
  const [pedidoCodigo, setPedidoCodigo] = useState<string>('');
  const [rotaDeslocamento, setRotaDeslocamento] = useState<string>('');

  // Alojamento & Fornecedor
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [provedorNome, setProvedorNome] = useState<string>('');
  const [ibanCobranca, setIbanCobranca] = useState<string>('');
  const [bancoCobranca, setBancoCobranca] = useState<string>('');
  const [titularCobranca, setTitularCobranca] = useState<string>('');

  // Categoria, Forma de Pagamento e Valores
  const [tipoGasto, setTipoGasto] = useState<PagoAlojamento['tipo_pago']>('Passagens_Transporte');
  const [formaPagamento, setFormaPagamento] = useState<string>('Cartão de Reserva / Corporativo');
  const [valorGasto, setValorGasto] = useState<number>(0);
  const [vencimentoGasto, setVencimentoGasto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [competenciaGasto, setCompetenciaGasto] = useState<string>('10/2026');
  const [clienteCentroCusto, setClienteCentroCusto] = useState<string>('');
  const [obraCentroCusto, setObraCentroCusto] = useState<string>('');
  const [observacoesGasto, setObservacoesGasto] = useState<string>('');

  // Anexo / Comprovante / Passagem
  const [anexoUrl, setAnexoUrl] = useState<string>('');
  const [anexoNome, setAnexoNome] = useState<string>('');
  const [isUploadingAnexo, setIsUploadingAnexo] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isSavingOp, setIsSavingOp] = useState(false);

  // Modal Detalhes Simples
  const [viewingOp, setViewingOp] = useState<PagoAlojamento | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pagosData, alojData, provData, alocsData, workersRes] = await Promise.all([
        financeLogisticsService.fetchPagos(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchProvedores(),
        logisticsService.fetchAlocacoesAtivas(),
        supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nome, cod_colab, nif')
          .order('nome', { ascending: true })
          .limit(1000)
          .catch(() => ({ data: [] }))
      ]);
      setPagos(pagosData);
      setAlojamentos(alojData);
      setProvedores(provData);
      setAlocacoes(alocsData);
      if (workersRes?.data) {
        setWorkers(workersRes.data);
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

  // Extrair lista de competências únicas existentes para filtro
  const competenciasUnicas = Array.from(
    new Set(pagos.map(p => p.periodo_competencia).filter(Boolean))
  ).sort().reverse();

  const handleSelectAlojamento = (alojId: string) => {
    setSelectedAlojamentoId(alojId);
    if (!alojId) {
      setClienteCentroCusto('');
      setObraCentroCusto('');
      setProvedorNome('');
      setIbanCobranca('');
      return;
    }

    const aloj = alojamentos.find(a => a.id === alojId);
    if (!aloj) return;

    // Buscar ocupantes ativos
    const occ = alocacoes.filter(a => 
      a.status !== 'Checkout' && 
      (a.alojamento_id === alojId || a.alojamento_codigo === aloj.codigo || (a.alojamento_nome && (a.alojamento_nome === aloj.nome || a.alojamento_nome === aloj.titulo)))
    );

    if (occ.length > 0) {
      const uniqueClients = Array.from(new Set(occ.map(o => o.cliente_nome).filter(Boolean)));
      setClienteCentroCusto(uniqueClients.join(', '));
    } else {
      setClienteCentroCusto(aloj.cliente_nome || (aloj.municipio ? `Obra ${aloj.municipio}` : 'Centro de Coste General'));
    }

    setObraCentroCusto(`Obra ${aloj.municipio || aloj.provincia || 'Principal'}`);

    const prov = provedores.find(p => p.id === aloj.provedor_id);
    if (prov) {
      setProvedorNome(prov.nome_razao_social || '');
      setIbanCobranca(prov.iban || '');
      setBancoCobranca(prov.banco || '');
      setTitularCobranca(prov.titular_conta || prov.nome_razao_social || '');
    }

    if (tipoGasto === 'Aluguel' && (aloj.custo_mensal_total || aloj.valor_mensal)) {
      setValorGasto(Number(aloj.custo_mensal_total || aloj.valor_mensal));
    }
  };

  const handleSelectWorker = (w: { id: string; nome: string; cod_colab?: string }) => {
    setSelectedWorkerId(w.id);
    setSelectedWorkerNome(w.nome);
    setSelectedWorkerCodigo(w.cod_colab || '');
    setWorkerSearchTerm(`${w.nome}${w.cod_colab ? ` [${w.cod_colab}]` : ''}`);
    setIsWorkerDropdownOpen(false);

    // Buscar se esse trabalhador possui uma alocação ativa para preencher o pedido/cliente/obra
    const matchAloc = alocacoes.find((a: any) =>
      a.status !== 'Checkout' &&
      (a.worker_id === w.id || (w.cod_colab && a.codigo_colab === w.cod_colab) || (a.worker_nome && a.worker_nome.toLowerCase() === w.nome.toLowerCase()))
    );

    if (matchAloc) {
      if (matchAloc.cliente_nome) setClienteCentroCusto(matchAloc.cliente_nome);
      if (matchAloc.obra_nome) setObraCentroCusto(matchAloc.obra_nome);
      if (matchAloc.pedido_codigo) setPedidoCodigo(matchAloc.pedido_codigo);
      else if (matchAloc.solicitud_id) setPedidoCodigo(matchAloc.solicitud_id);
    }
  };

  const resetModalForm = (novoModo?: 'deslocamento' | 'alojamento' | 'geral') => {
    const modo = novoModo || modoVinculacao;
    setSelectedAlojamentoId('');
    setSelectedWorkerId('');
    setSelectedWorkerNome('');
    setSelectedWorkerCodigo('');
    setWorkerSearchTerm('');
    setPedidoCodigo('');
    setRotaDeslocamento('');
    setProvedorNome(modo === 'deslocamento' ? 'Iberia / Renfe / Transporte' : '');
    setIbanCobranca('');
    setBancoCobranca('');
    setTitularCobranca('');
    setTipoGasto(modo === 'deslocamento' ? 'Passagens_Transporte' : modo === 'alojamento' ? 'Aluguel' : 'Outros_Gastos');
    setFormaPagamento(modo === 'deslocamento' ? 'Cartão de Reserva / Corporativo' : 'Transferência Bancária / Fatura');
    setValorGasto(0);
    setVencimentoGasto(new Date().toISOString().split('T')[0]);
    setCompetenciaGasto('10/2026');
    setClienteCentroCusto('');
    setObraCentroCusto('');
    setObservacoesGasto('');
    setAnexoUrl('');
    setAnexoNome('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAnexo = async (file: File) => {
    try {
      setIsUploadingAnexo(true);
      const fileExt = file.name.split('.').pop() || 'pdf';
      const cleanFileName = `gasto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `comprovantes/${cleanFileName}`;

      let uploadResult = await supabase.storage
        .from('comprovantes-financeiro')
        .upload(filePath, file, { upsert: true });

      let publicUrl = '';
      if (!uploadResult.error) {
        const { data } = supabase.storage.from('comprovantes-financeiro').getPublicUrl(filePath);
        publicUrl = data?.publicUrl || '';
      } else {
        const fallbackRes = await supabase.storage
          .from('alojamentos')
          .upload(filePath, file, { upsert: true });
        if (!fallbackRes.error) {
          const { data } = supabase.storage.from('alojamentos').getPublicUrl(filePath);
          publicUrl = data?.publicUrl || '';
        }
      }

      if (publicUrl) {
        setAnexoUrl(publicUrl);
        setAnexoNome(file.name);
      } else {
        alert('No fue posible subir el archivo. Compruebe los permisos o tamaño.');
      }
    } catch (e: any) {
      console.error('Error al subir comprobante:', e);
      alert('Error en la carga del archivo.');
    } finally {
      setIsUploadingAnexo(false);
    }
  };

  const handleCopyIban = (iban: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // Enviar individual para aprovação
  const handleEnviarAprovacao = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await financeLogisticsService.enviarParaAprovacao(op.id);
      alert(`¡Orden de Pago ${op.codigo_pago} enviada a aprobación de Finanzas!`);
      loadData();
    } catch (err) {
      console.error('Error al enviar OP:', err);
      alert('Error al enviar a aprobación.');
    }
  };

  // Enviar lote selecionado para aprovação
  const handleEnviarLoteAprovacao = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`¿Desea enviar ${ids.length} órdenes seleccionadas a aprobación de Finanzas?`)) {
      return;
    }

    try {
      setIsSendingBatch(true);
      await financeLogisticsService.enviarParaAprovacao(ids);
      alert(`¡Se enviaron ${ids.length} órdenes a aprobación de Finanzas con éxito!`);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error('Error al enviar lote:', err);
      alert('Error al enviar el lote a aprobación.');
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Voltar para trás / Reverter ordem individual para Rascunho
  const handleReverterRascunho = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`¿Desea retirar la orden ${op.codigo_pago} de aprobación y devolverla a Borrador (Rascunho)? Podrá editarla o eliminarla libremente.`)) {
      return;
    }

    try {
      await financeLogisticsService.reverterParaRascunho(op.id);
      alert(`Orden de pago ${op.codigo_pago} devuelta a borrador.`);
      loadData();
    } catch (err: any) {
      console.error('Error al revertir OP:', err);
      alert(`Error al devolver a borrador: ${err?.message || 'Compruebe la conexión.'}`);
    }
  };

  // Reverter lote selecionado para Rascunho
  const handleReverterLoteRascunho = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`¿Desea devolver ${ids.length} órdenes seleccionadas a Borrador (Rascunho)?`)) {
      return;
    }

    try {
      await financeLogisticsService.reverterParaRascunho(ids);
      alert(`¡Se devolvieron ${ids.length} órdenes a borrador con éxito!`);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      console.error('Error al devolver lote a borrador:', err);
      alert('Error al devolver lote a borrador.');
    }
  };

  // Excluir ordem permanentemente
  const handleExcluirOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (op.status_pago === 'Pago') {
      alert('No es posible eliminar una orden que ya ha sido Pagada en Tesorería.');
      return;
    }
    if (!confirm(`¿Está seguro de que desea ELIMINAR permanentemente la orden ${op.codigo_pago}? Esta acción liberará el registro para ser generado nuevamente.`)) {
      return;
    }

    try {
      await financeLogisticsService.excluirOrdemPagamento(op.id);
      alert(`Orden de pago ${op.codigo_pago} eliminada permanentemente.`);
      loadData();
    } catch (err: any) {
      console.error('Error al eliminar OP:', err);
      alert(`Error al eliminar: ${err?.message || 'Compruebe los permisos.'}`);
    }
  };

  // Excluir lote selecionado
  const handleExcluirLote = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`¿Está seguro de que desea ELIMINAR permanentemente ${ids.length} órdenes seleccionadas? Esta acción liberará los registros para ser generados nuevamente.`)) {
      return;
    }

    try {
      setIsDeletingBatch(true);
      await financeLogisticsService.excluirOrdemPagamento(ids);
      alert(`¡Se eliminaron ${ids.length} órdenes permanentemente!`);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      console.error('Error al eliminar lote:', err);
      alert(`Error al eliminar lote: ${err?.message || 'Compruebe los permisos.'}`);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Cancelar ordem de pagamento
  const handleCancelarOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const motivo = prompt(`Informe el motivo de cancelación de la orden ${op.codigo_pago}:`, 'Cancelada por Logística');
    if (motivo === null) return; // Cancelou prompt

    try {
      await financeLogisticsService.cancelarOrdemPagamento(op.id, motivo);
      alert(`¡Orden de pago ${op.codigo_pago} cancelada con éxito!`);
      loadData();
    } catch (err: any) {
      console.error('Error al cancelar OP:', err);
      alert(`Error al cancelar: ${err?.message || 'Compruebe la conexión.'}`);
    }
  };

  // Salvar Nova OP (nasce como Rascunho / Opção B)
  const handleSaveNovaOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valorGasto <= 0) {
      alert('Informe un importe válido mayor a 0.');
      return;
    }

    if (modoVinculacao === 'alojamento' && !selectedAlojamentoId) {
      alert('Seleccione un inmueble / alojamiento vinculado.');
      return;
    }

    if (modoVinculacao === 'deslocamento' && !selectedWorkerNome && !workerSearchTerm) {
      alert('Indique o busque el trabajador que realizará el viaje o desplazamiento.');
      return;
    }

    try {
      setIsSavingOp(true);
      const aloj = alojamentos.find(a => a.id === selectedAlojamentoId);
      const prov = provedores.find(p => p.id === aloj?.provedor_id);

      const finalWorkerNome = selectedWorkerNome || workerSearchTerm;
      const finalProvedorNome = provedorNome.trim() || prov?.nome_razao_social || (modoVinculacao === 'deslocamento' ? 'Agencia / Transporte' : 'Proveedor Logístico');

      const novaOp = await financeLogisticsService.gerarOrdemPagamento({
        alojamento_id: modoVinculacao === 'alojamento' ? selectedAlojamentoId : undefined,
        alojamento_nome: modoVinculacao === 'alojamento' ? (aloj?.nome || 'Alojamiento') : undefined,
        alojamento_codigo: modoVinculacao === 'alojamento' ? (aloj?.codigo || 'AL-XXXX') : undefined,
        worker_id: selectedWorkerId || undefined,
        worker_nome: finalWorkerNome || undefined,
        worker_codigo: selectedWorkerCodigo || undefined,
        pedido_codigo: pedidoCodigo || undefined,
        rota_deslocamento: rotaDeslocamento || undefined,
        provedor_id: aloj?.provedor_id,
        provedor_nome: finalProvedorNome,
        iban_cobranca: ibanCobranca || prov?.iban || '',
        banco: bancoCobranca || prov?.banco || '',
        titular: titularCobranca || prov?.titular_conta || finalProvedorNome,
        centro_custo_cliente: clienteCentroCusto,
        centro_custo_obra: obraCentroCusto || pedidoCodigo,
        tipo_pago: tipoGasto,
        forma_pagamento: formaPagamento,
        anexo_url: anexoUrl || undefined,
        valor: valorGasto,
        data_vencimento: vencimentoGasto,
        periodo_competencia: competenciaGasto,
        observacoes: observacoesGasto
      });

      alert(`¡Orden de Pago ${novaOp.codigo_pago} creada como Borrador con éxito!\nPuede revisarla y enviarla a aprobación.`);
      setIsModalOpen(false);
      resetModalForm();
      loadData();
    } catch (err: any) {
      console.error('Error al crear OP:', err);
      alert(`Error al crear Orden de Pago: ${err?.message || 'Compruebe los datos.'}`);
    } finally {
      setIsSavingOp(false);
    }
  };

  // Controle de Seleção
  const toggleSelectOp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  // KPIs
  const totalValor = pagos
    .filter(p => p.status_pago !== 'Cancelado')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const rascunhosValor = pagos
    .filter(p => p.status_pago === 'Rascunho')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const pendentesAprovacao = pagos
    .filter(p => p.status_pago === 'Aguardando Aprovação')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const aprovadosPagados = pagos
    .filter(p => p.status_pago === 'Aprovado' || p.status_pago === 'Pago')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  // Filtragem da Lista
  const filtered = pagos.filter(p => {
    const matchesSearch =
      p.codigo_pago.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.alojamento_nome && p.alojamento_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.worker_nome && p.worker_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.worker_codigo && p.worker_codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.pedido_codigo && p.pedido_codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.rota_deslocamento && p.rota_deslocamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.provedor_nome && p.provedor_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.centro_custo_cliente && p.centro_custo_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.iban_cobranca && p.iban_cobranca.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== 'todos' && p.status_pago !== statusFilter) return false;
    if (tipoFilter !== 'todos' && p.tipo_pago !== tipoFilter) return false;
    if (competenciaFilter !== 'todos' && p.periodo_competencia !== competenciaFilter) return false;
    return true;
  });

  // Dados Ordenados
  const sortedPagos = React.useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'valor_previsto') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'data_vencimento') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA === undefined || valA === null) return sortDirection === 'asc' ? 1 : -1;
      if (valB === undefined || valB === null) return sortDirection === 'asc' ? -1 : 1;

      return sortDirection === 'asc'
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
  }, [filtered, sortField, sortDirection]);

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isCurrent = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none font-bold uppercase tracking-wider text-[10px] ${
          align === 'right' ? 'ml-auto justify-end' : align === 'center' ? 'mx-auto justify-center' : 'justify-start'
        }`}
      >
        <span>{label}</span>
        {isCurrent ? (
          sortDirection === 'asc' ? (
            <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          )
        ) : (
          <ArrowUpDown size={12} className="text-slate-400/50 hover:text-slate-500 shrink-0" />
        )}
      </button>
    );
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Passagens_Transporte':
      case 'Passagens':
      case 'Pasajes':
        return <Ticket size={13} className="text-teal-500" />;
      case 'Viagem_Deslocamento':
      case 'Viagem':
      case 'Desplazamiento':
        return <Plane size={13} className="text-purple-500" />;
      case 'Diarias_Alimentacao':
      case 'Dietas':
        return <Utensils size={13} className="text-amber-600" />;
      case 'Aluguel':
        return <Home size={13} className="text-blue-500" />;
      case 'Fiança':
      case 'Fianza_Saida':
      case 'Fianza_Devolucion':
        return <ShieldCheck size={13} className="text-emerald-500" />;
      case 'Luz':
      case 'Suministro_Luz':
        return <Zap size={13} className="text-amber-500" />;
      case 'Água':
      case 'Suministro_Agua':
        return <Droplets size={13} className="text-cyan-500" />;
      case 'Internet':
      case 'Suministro_Internet':
        return <Globe size={13} className="text-indigo-500" />;
      case 'Gás':
      case 'Suministro_Gas':
        return <Flame size={13} className="text-orange-500" />;
      case 'Manutencao_Limpeza':
      case 'Manutenção / Limpeza':
        return <Wrench size={13} className="text-slate-500" />;
      default:
        return <DollarSign size={13} className="text-slate-500" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'Passagens_Transporte':
      case 'Passagens':
      case 'Pasajes':
        return 'Pasajes / Transporte';
      case 'Viagem_Deslocamento':
      case 'Viagem':
      case 'Desplazamiento':
        return 'Viaje / Desplazamiento';
      case 'Diarias_Alimentacao':
      case 'Dietas':
        return 'Dietas / Alimentación';
      case 'Aluguel':
        return 'Alquiler Mensual';
      case 'Fiança':
      case 'Fianza_Saida':
        return 'Fianza Depósito';
      case 'Fianza_Devolucion':
        return 'Devolución Fianza';
      case 'Luz':
      case 'Suministro_Luz':
        return 'Electricidad';
      case 'Água':
      case 'Suministro_Agua':
        return 'Agua';
      case 'Internet':
      case 'Suministro_Internet':
        return 'Internet / Fibra';
      case 'Gás':
      case 'Suministro_Gas':
        return 'Gas';
      case 'Manutencao_Limpeza':
      case 'Manutenção / Limpeza':
        return 'Mantenimiento / Limpieza';
      case 'Outros_Gastos':
        return 'Otros Gastos';
      default:
        return tipo;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            Pagado / Liquidado
          </span>
        );
      case 'Aprovado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            Aprobado (En Tesorería)
          </span>
        );
      case 'Aguardando Aprovação':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
            <Clock size={11} />
            Pendiente Aprobación
          </span>
        );
      case 'Cancelado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 flex items-center gap-1 w-fit">
            <Ban size={11} />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 w-fit">
            <Pencil size={10} />
            Borrador (Rascunho)
          </span>
        );
    }
  };

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Financiero de Logística & Órdenes de Pago
              </h1>
              <p className="text-xs text-slate-500">
                Seguimiento, emisión, edición y consulta de OPs integradas con Finanzas central
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            title="Recargar datos de Finanzas"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Nueva Orden de Pago / Gasto
          </button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Mês */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL PREVISTO
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
              € {totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago !== 'Cancelado').length} órdenes activas registradas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Borradores */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              BORRADORES (RASCUNHO)
            </span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5 block">
              € {rascunhosValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Rascunho').length} órdenes por revisar/enviar
            </span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Pencil size={22} />
          </div>
        </div>

        {/* Pendientes de Aprobación */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              PENDIENTE APROBACIÓN
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              € {pendentesAprovacao.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Aguardando Aprovação').length} en cola de Finanzas
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        {/* Aprobados / Pagados */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              APROBADOS / PAGADOS
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
              € {aprovadosPagados.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Pago').length} pagados • {pagos.filter(p => p.status_pago === 'Aprovado').length} en tesorería
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Ações em Lote quando há seleção */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Check size={16} />
            </div>
            <div>
              <span className="font-bold text-sm">
                {selectedIds.size} {selectedIds.size === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
              </span>
              <span className="text-xs text-slate-400 ml-2">
                (Total: € {pagos.filter(p => selectedIds.has(p.id)).reduce((acc, p) => acc + p.valor_previsto, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleEnviarLoteAprovacao}
              disabled={isSendingBatch || isDeletingBatch}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Enviar órdenes seleccionadas a aprobación de Finanzas"
            >
              <Send size={13} />
              {isSendingBatch ? 'Enviando...' : `Enviar a Aprobación (${selectedIds.size})`}
            </button>

            <button
              onClick={handleReverterLoteRascunho}
              disabled={isSendingBatch || isDeletingBatch}
              className="px-3 py-2 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Volver órdenes seleccionadas al estado Borrador (Rascunho)"
            >
              <RotateCcw size={13} />
              Volver a Borrador
            </button>

            <button
              onClick={handleExcluirLote}
              disabled={isSendingBatch || isDeletingBatch}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Eliminar permanentemente las órdenes seleccionadas"
            >
              <Trash2 size={13} />
              {isDeletingBatch ? 'Eliminando...' : `Eliminar (${selectedIds.size})`}
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela Principal & Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código OP, inmueble, proveedor o cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Seletores de Filtro */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filtro por Competência */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar size={13} className="text-slate-400" />
              <span className="text-slate-500 font-semibold">Comp:</span>
              <select
                value={competenciaFilter}
                onChange={e => setCompetenciaFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="todos">Todas</option>
                {competenciasUnicas.map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>

            {/* Abas Rápidas de Status */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold overflow-x-auto">
              {[
                { id: 'todos', label: 'Todas' },
                { id: 'Rascunho', label: 'Borradores' },
                { id: 'Aguardando Aprovação', label: 'Pendientes' },
                { id: 'Aprovado', label: 'Aprobadas' },
                { id: 'Pago', label: 'Pagadas' },
                { id: 'Cancelado', label: 'Canceladas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Dados com Cabeçalho Fixo e Scroll Interno da Galeria */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[380px] rounded-b-2xl border-t border-slate-100 dark:border-slate-800">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              Cargando órdenes de pago desde Finanzas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Ninguna orden de pago encontrada</p>
              <p className="text-xs text-slate-400">
                Genere OPs a partir de los contratos en <strong>"Contratos & Fianzas"</strong> o cree una nueva orden con el botón superior.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus size={15} />
                Nueva Orden de Pago
              </button>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs uppercase font-bold text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 shadow-xs">
                <tr>
                  <th className="px-3 py-3 w-10 text-center sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === sortedPagos.length && sortedPagos.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                    />
                  </th>
                  <th className="px-3 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    {renderSortHeader('Código OP & Categoría', 'codigo_pago')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    {renderSortHeader('Alojamiento / Trabajador', 'alojamento_nome')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    {renderSortHeader('Proveedor / Forma Pago', 'provedor_nome')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    {renderSortHeader('Centro de Coste', 'centro_custo_cliente')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20">
                    {renderSortHeader('Competencia & Vencimiento', 'data_vencimento')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20 text-right">
                    {renderSortHeader('Importe Previsto', 'valor_previsto', 'right')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20 text-center">
                    {renderSortHeader('Estado', 'status_pago', 'center')}
                  </th>
                  <th className="px-4 py-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-20 text-right">
                    Acciones & Comprobantes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {sortedPagos.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Checkbox Seleção */}
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(op.id)}
                        onChange={() => toggleSelectOp(op.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                      />
                    </td>

                    {/* Código & Tipo */}
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {op.codigo_pago}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 w-fit">
                          {getTipoIcon(op.tipo_pago)}
                          {getTipoLabel(op.tipo_pago)}
                        </span>
                      </div>
                    </td>

                    {/* Alojamento OU Trabalhador / Viagem */}
                    <td className="px-4 py-3.5">
                      {op.worker_nome ? (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {op.worker_nome}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {op.worker_codigo && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                                  {op.worker_codigo}
                                </span>
                              )}
                              {op.pedido_codigo && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  Pedido: {op.pedido_codigo}
                                </span>
                              )}
                              {op.rota_deslocamento && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                                  • {op.rota_deslocamento}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : op.alojamento_nome ? (
                        <div className="flex items-center gap-2">
                          <Home size={14} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {op.alojamento_nome}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                {op.alojamento_codigo || '-'} {op.contrato_id ? `• ${op.contrato_id}` : ''}
                              </span>
                              {op.ocupantes && op.ocupantes.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-help"
                                  title={op.ocupantes.map(o => `${o.worker_nome} (${o.codigo_colab || 'S/C'}) - ${o.obra_nome || 'Obra'}`).join('\n')}
                                >
                                  <Users size={10} /> {op.ocupantes.length} ocupante(s)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Gasto Operativo Logística
                        </span>
                      )}
                    </td>

                    {/* Proveedor e IBAN / Forma de Pagamento */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{op.provedor_nome || 'Logística / Proveedor'}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {op.forma_pagamento && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            op.forma_pagamento.toLowerCase().includes('reserva') || op.forma_pagamento.toLowerCase().includes('cart')
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            💳 {op.forma_pagamento}
                          </span>
                        )}
                        {op.iban_cobranca ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-slate-500">
                              {op.iban_cobranca.slice(0, 4)} •••• {op.iban_cobranca.slice(-4)}
                            </span>
                            <button
                              onClick={e => handleCopyIban(op.iban_cobranca || '', e)}
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 ml-0.5"
                            >
                              <Copy size={10} />
                              {copiedIban === op.iban_cobranca ? '¡Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Centro de Custo */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                        {op.centro_custo_cliente || 'Centro de Coste General'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                        {op.centro_custo_obra || 'Obra Principal'}
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {op.data_vencimento}
                      </span>
                      <span className="text-[10px] text-slate-400">Comp: {op.periodo_competencia || '-'}</span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3.5">
                      <span className="font-black text-slate-900 dark:text-white text-xs">
                        € {Number(op.valor_previsto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(op.status_pago)}</td>

                    {/* Ações e Comprobantes */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Botão de Ver Anexo / Passagem / Fatura se houver */}
                        {op.anexo_fatura_url && (
                          <a
                            href={op.anexo_fatura_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                            title="Ver billete / factura adjunta"
                          >
                            <Paperclip size={13} />
                          </a>
                        )}
                        {/* Ações para RASCUNHO / BORRADOR */}
                        {op.status_pago === 'Rascunho' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingOp(op); }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Modificar / Editar Orden de Pago"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={e => handleExcluirOp(op, e)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Eliminar borrador permanentemente"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              onClick={e => handleEnviarAprovacao(op, e)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Enviar a aprobación en Finanzas"
                            >
                              <Send size={11} />
                              Enviar
                            </button>
                          </>
                        )}

                        {/* Ações para AGUARDANDO APROVAÇÃO */}
                        {op.status_pago === 'Aguardando Aprovação' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingOp(op); }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Modificar datos de la orden"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={e => handleReverterRascunho(op, e)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Volver a Borrador (Rascunho)"
                            >
                              <RotateCcw size={14} />
                            </button>

                            <button
                              onClick={e => handleExcluirOp(op, e)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Eliminar orden permanentemente"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              onClick={e => handleCancelarOp(op, e)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Cancelar orden de pago"
                            >
                              <Ban size={11} />
                              Cancelar
                            </button>
                          </>
                        )}

                        {/* Ações para APROVADO */}
                        {op.status_pago === 'Aprovado' && (
                          <>
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                              <Clock size={11} />
                              En Tesorería
                            </span>
                            <button
                              onClick={e => handleCancelarOp(op, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Anular / Cancelar"
                            >
                              <Ban size={13} />
                            </button>
                          </>
                        )}

                        {/* Ações para PAGO */}
                        {op.status_pago === 'Pago' && (
                          <>
                            {op.comprovante_url && (
                              <a
                                href={op.comprovante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="Ver comprobante bancario"
                              >
                                <ExternalLink size={11} />
                                Comprobante
                              </a>
                            )}

                            <button
                              onClick={e => { e.stopPropagation(); setReceiptOp(op); }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Ver ficha de liquidación y comprobante"
                            >
                              <FileCheck size={12} className="text-emerald-500" />
                              Recibo
                            </button>
                          </>
                        )}

                        {/* Cancelado */}
                        {op.status_pago === 'Cancelado' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-red-500">
                              Anulada
                            </span>
                            <button
                              onClick={e => handleExcluirOp(op, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Eliminar permanentemente del histórico"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Modificação / Edição de Ordem */}
      {editingOp && (
        <EditarOrdemPagoModal
          op={editingOp}
          isOpen={!!editingOp}
          onClose={() => setEditingOp(null)}
          onSuccess={loadData}
        />
      )}

      {/* Modal de Recibo / Comprovante Imprimível */}
      {receiptOp && (
        <ReciboPagoModal
          op={receiptOp}
          onClose={() => setReceiptOp(null)}
        />
      )}

      {/* Modal Nova Ordem de Pagamento / Gasto Ampliado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 text-white rounded-2xl shadow-sm ${
                  modoVinculacao === 'trabalhador' ? 'bg-indigo-600' : modoVinculacao === 'alojamento' ? 'bg-blue-600' : 'bg-emerald-600'
                }`}>
                  {modoVinculacao === 'trabalhador' ? <Plane size={22} /> : modoVinculacao === 'alojamento' ? <Home size={22} /> : <DollarSign size={22} />}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Nueva Orden de Pago / Gasto de Logística
                  </h2>
                  <p className="text-xs text-slate-500">
                    Se creará en estado <strong>Borrador (Rascunho)</strong> para revisión previa antes de enviar a Finanzas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); resetModalForm(); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNovaOp} className="p-6 space-y-5 text-xs overflow-y-auto max-h-[82vh]">
              {/* Seletor de Modo do Gasto */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Tipo de Actividad / Destino del Gasto
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculacao('trabalhador');
                      setTipoGasto('Passagens_Transporte');
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      modoVinculacao === 'trabalhador'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Plane size={18} className={modoVinculacao === 'trabalhador' ? 'text-indigo-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                    <div>
                      <span className="font-bold block text-xs">Desplazamiento / Viajes</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                        Billetes de avión/tren, traslado de trabajadores a obras/pedidos
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculacao('alojamento');
                      setTipoGasto('Aluguel');
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      modoVinculacao === 'alojamento'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Home size={18} className={modoVinculacao === 'alojamento' ? 'text-blue-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                    <div>
                      <span className="font-bold block text-xs">Alojamiento / Inmueble</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                        Alquiler, suministros, fianza, mantenimiento de pisos
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculacao('geral');
                      setTipoGasto('Outros_Gastos');
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      modoVinculacao === 'geral'
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Ticket size={18} className={modoVinculacao === 'geral' ? 'text-emerald-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                    <div>
                      <span className="font-bold block text-xs">Gasto Operativo General</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                        Materiales, combustible, gestiones o proveedores diversos
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* SEÇÃO CONFORME O MODO */}
              {modoVinculacao === 'trabalhador' && (
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3.5">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                    <User size={15} />
                    <span>Datos del Trabajador y Trayecto</span>
                  </div>

                  {/* Seleção do Trabalhador com Autocomplete */}
                  <div className="relative">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Trabajador Contratado / Beneficiario <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Escriba el nombre o código del colaborador para buscar..."
                        value={workerSearchTerm}
                        onChange={e => {
                          setWorkerSearchTerm(e.target.value);
                          setIsWorkerDropdownOpen(true);
                        }}
                        onFocus={() => setIsWorkerDropdownOpen(true)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      {selectedWorkerNome && (
                        <div className="absolute right-2 top-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                            {selectedWorkerCodigo || 'Seleccionado'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dropdown Lista de Trabalhadores */}
                    {isWorkerDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100 dark:divide-slate-800">
                        {workers
                          .filter(w =>
                            !workerSearchTerm ||
                            w.nome.toLowerCase().includes(workerSearchTerm.toLowerCase()) ||
                            (w.cod_colab && w.cod_colab.toLowerCase().includes(workerSearchTerm.toLowerCase())) ||
                            (w.nif && w.nif.toLowerCase().includes(workerSearchTerm.toLowerCase()))
                          )
                          .slice(0, 50)
                          .map(w => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => handleSelectWorker(w)}
                              className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{w.nome}</span>
                                <span className="text-[10px] text-slate-400">
                                  {w.cod_colab ? `Cód: ${w.cod_colab}` : 'Sin código'} {w.nif ? `• NIF: ${w.nif}` : ''}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600">Seleccionar</span>
                            </button>
                          ))}
                        {workers.length === 0 && (
                          <div className="p-3 text-slate-400 text-center">No hay trabajadores en la base</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pedido e Rota */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Pedido / Obra Vinculada
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: PED-2026-089 / Madrid - Milán"
                        value={pedidoCodigo}
                        onChange={e => setPedidoCodigo(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Trayecto / Ruta de Desplazamiento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Madrid ➔ Milán (Italia)"
                        value={rotaDeslocamento}
                        onChange={e => setRotaDeslocamento(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required={modoVinculacao === 'trabalhador'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {modoVinculacao === 'alojamento' && (
                <div className="space-y-1 p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                    <Home size={13} className="text-blue-500" />
                    Inmueble / Alojamiento Vinculado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAlojamentoId}
                    onChange={e => handleSelectAlojamento(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    required={modoVinculacao === 'alojamento'}
                  >
                    <option value="">Seleccione un alojamiento...</option>
                    {alojamentos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} - {a.nome} ({a.municipio || 'España'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Categorias e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Categoría del Gasto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipoGasto}
                    onChange={e => setTipoGasto(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    required
                  >
                    {modoVinculacao === 'trabalhador' ? (
                      <>
                        <option value="Passagens_Transporte">✈️ Billetes de Avión / Tren / Autobús</option>
                        <option value="Viagem_Deslocamento">🚗 Desplazamiento / Viajes</option>
                        <option value="Diarias_Alimentacao">🍽️ Dietas / Manutención</option>
                        <option value="Outros_Gastos">📦 Otros Gastos de Movilidad</option>
                      </>
                    ) : modoVinculacao === 'alojamento' ? (
                      <>
                        <option value="Aluguel">🏠 Alquiler Mensual</option>
                        <option value="Fianza_Saida">💰 Fianza (Depósito)</option>
                        <option value="Suministro_Luz">💡 Suministro Luz</option>
                        <option value="Suministro_Agua">💧 Suministro Agua</option>
                        <option value="Suministro_Gas">🔥 Suministro Gas</option>
                        <option value="Suministro_Internet">📶 Internet / Wifi</option>
                        <option value="Manutencao_Limpeza">🧹 Mantenimiento / Limpieza</option>
                        <option value="Outros_Gastos">📦 Otros Gastos</option>
                      </>
                    ) : (
                      <>
                        <option value="Outros_Gastos">📦 Gasto General Logística</option>
                        <option value="Passagens_Transporte">🎫 Transporte / Combustible</option>
                        <option value="Manutencao_Limpeza">🧹 Mantenimiento de Equipos</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Forma de Pago / Modalidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    required
                  >
                    <option value="Cartão de Reserva / Corporativo">💳 Tarjeta de Reserva / Corporativa (Pagado en el acto)</option>
                    <option value="Transferência Bancária">🏦 Transferencia Bancaria (A pagar por Tesorería)</option>
                  </select>
                </div>
              </div>

              {/* Informação sobre Cartão de Reserva */}
              {formaPagamento.includes('Reserva') && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                  <CreditCard size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Liquidado con Tarjeta de Reserva:</strong> La compra fue agilizada y pagada directamente por el departamento de Logística. Se enviará a Finanzas para conciliación bancaria y aprobación del cargo corporativo.
                  </p>
                </div>
              )}

              {/* Valores, Competência e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Importe Previsto (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={valorGasto || ''}
                    onChange={e => setValorGasto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Mes / Competencia
                  </label>
                  <input
                    type="text"
                    placeholder="10/2026"
                    value={competenciaGasto}
                    onChange={e => setCompetenciaGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Fecha de Vencimiento / Cargo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={vencimentoGasto}
                    onChange={e => setVencimentoGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>

              {/* Proveedor / Compañía e IBAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Proveedor / Empresa Emitente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Iberia, Ryanair, Renfe, Booking, Arrendador..."
                    value={provedorNome}
                    onChange={e => setProvedorNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    IBAN / Cuenta Bancaria {formaPagamento.includes('Reserva') ? '(Opcional)' : ''}
                  </label>
                  <input
                    type="text"
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    value={ibanCobranca}
                    onChange={e => setIbanCobranca(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Centros de Costo (Cliente & Obra) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Cliente Imputado / Centro de Coste
                  </label>
                  <input
                    type="text"
                    value={clienteCentroCusto}
                    onChange={e => setClienteCentroCusto(e.target.value)}
                    placeholder="Cliente / Obra Principal"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Obra / Destino
                  </label>
                  <input
                    type="text"
                    value={obraCentroCusto}
                    onChange={e => setObraCentroCusto(e.target.value)}
                    placeholder="Obra"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Anexo / Bilhete / Passagem / Fatura */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-blue-500" />
                    Billete / Pasaje / Factura Adjunta
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, JPG o PNG (máx. 10MB)</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadAnexo}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                {anexoUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                        {anexoNome || 'Archivo adjunto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={anexoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg text-[10px] font-bold"
                      >
                        Visualizar
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setAnexoUrl('');
                          setAnexoNome('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Quitar archivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAnexo}
                    className="w-full py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors bg-white dark:bg-slate-900"
                  >
                    <FileUp size={16} className={isUploadingAnexo ? 'animate-bounce' : ''} />
                    <span className="font-bold text-xs">
                      {isUploadingAnexo ? 'Subiendo archivo al servidor...' : 'Subir billete, tarjeta de embarque o factura'}
                    </span>
                  </button>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Observaciones / Notas Adicionales
                </label>
                <textarea
                  rows={2}
                  value={observacoesGasto}
                  onChange={e => setObservacoesGasto(e.target.value)}
                  placeholder="Detalles sobre este viaje, horarios, localizador de reserva o datos bancarios..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Rodapé de Ações */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetModalForm(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingOp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Plus size={14} />
                  {isSavingOp ? 'Creando Orden...' : 'Crear Orden Borrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
