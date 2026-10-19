import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Search,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  Paperclip,
  CheckCircle2,
  Send,
  FileCheck,
  Stethoscope,
  HardHat,
  Banknote,
  GraduationCap,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { financeRhService, type WorkerRhOption, type CreateOrdemRhPayload } from '../services/financeRhService';
import { supabase } from '@/shared/supabase/client';

interface NovaOrdemPagoRhModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TipoAtividadeRh = 'medico' | 'epis' | 'salario' | 'formacion' | 'reembolso';

export const NovaOrdemPagoRhModal: React.FC<NovaOrdemPagoRhModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [workers, setWorkers] = useState<WorkerRhOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Estados do formulário
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividadeRh>('medico');
  const [categoria, setCategoria] = useState<string>('Exame Médico / Reconhecimento Admissional');

  // Trabalhador vinculado
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedWorkerNome, setSelectedWorkerNome] = useState<string>('');
  const [selectedWorkerCodigo, setSelectedWorkerCodigo] = useState<string>('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Favorecido e Dados Bancários
  const [beneficiarioNome, setBeneficiarioNome] = useState<string>('');
  const [iban, setIban] = useState<string>('');
  const [banco, setBanco] = useState<string>('');
  const [clienteCC, setClienteCC] = useState<string>('Recursos Humanos');
  const [obraCC, setObraCC] = useState<string>('Personal General');

  // Valores e Datas
  const [valor, setValor] = useState<number | ''>('');
  const [competencia, setCompetencia] = useState<string>('');
  const [dataVencimento, setDataVencimento] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('Transferência Bancária (IBAN)');

  // Anexo e Observações
  const [anexoUrl, setAnexoUrl] = useState<string>('');
  const [anexoNome, setAnexoNome] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inicializar datas padrão
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setCompetencia(`${mm}/${yyyy}`);
      setDataVencimento(`${yyyy}-${mm}-${dd}`);

      loadWorkers();
    }
  }, [isOpen]);

  const loadWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const list = await financeRhService.fetchActiveWorkers();
      setWorkers(list);
    } catch (e) {
      console.warn('Erro ao carregar trabalhadores:', e);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleTipoAtividadeChange = (tipo: TipoAtividadeRh) => {
    setTipoAtividade(tipo);
    if (tipo === 'medico') {
      setCategoria('Exame Médico / Reconhecimento Admissional');
    } else if (tipo === 'epis') {
      setCategoria('Equipamentos de Proteção Individual (EPIs)');
    } else if (tipo === 'salario') {
      setCategoria('Adiantamento Salarial / Vale');
    } else if (tipo === 'formacion') {
      setCategoria('Curso PRL / Formação Obrigatória');
    } else if (tipo === 'reembolso') {
      setCategoria('Reembolso de Despesas / Combustível (Tickets)');
    }

    // Atualizar favorecido se já houver trabalhador
    if (selectedWorkerNome) {
      if (tipo === 'salario') {
        setBeneficiarioNome(`Adiantamento: ${selectedWorkerNome}`);
      } else if (tipo === 'reembolso') {
        setBeneficiarioNome(`Reembolso: ${selectedWorkerNome}`);
      }
    }
  };

  const handleSelectWorker = (w: WorkerRhOption) => {
    setSelectedWorkerId(w.id);
    setSelectedWorkerNome(w.nome);
    setSelectedWorkerCodigo(w.cod_colab || '');
    setWorkerSearchTerm(`${w.nome}${w.cod_colab ? ` [${w.cod_colab}]` : ''}`);
    setIsDropdownOpen(false);

    if (w.cliente) setClienteCC(w.cliente);
    if (w.iban) setIban(w.iban);
    setBanco(w.nome);

    if (tipoAtividade === 'salario') {
      setBeneficiarioNome(`Adiantamento: ${w.nome}`);
    } else if (tipoAtividade === 'reembolso') {
      setBeneficiarioNome(`Reembolso: ${w.nome}`);
    } else if (!beneficiarioNome) {
      setBeneficiarioNome(w.nome);
    }
  };

  const handleClearWorker = () => {
    setSelectedWorkerId('');
    setSelectedWorkerNome('');
    setSelectedWorkerCodigo('');
    setWorkerSearchTerm('');
    setIban('');
    setBanco('');
    setBeneficiarioNome('');
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop() || 'pdf';
      const cleanFileName = `rh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `ordens_rh/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes-financeiro')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback para bucket público
        const { error: fbErr } = await supabase.storage
          .from('alojamentos')
          .upload(filePath, file, { upsert: true });
        if (fbErr) throw uploadError;

        const { data: pubData } = supabase.storage.from('alojamentos').getPublicUrl(filePath);
        setAnexoUrl(pubData.publicUrl);
        setAnexoNome(file.name);
      } else {
        const { data: pubData } = supabase.storage.from('comprovantes-financeiro').getPublicUrl(filePath);
        setAnexoUrl(pubData.publicUrl);
        setAnexoNome(file.name);
      }
    } catch (err: any) {
      alert(`Error al subir comprobante: ${err?.message || 'Compruebe su conexión'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (statusInicial: 'rascunho' | 'aguardando_aprovacao') => {
    if (!valor || Number(valor) <= 0) {
      alert('Por favor, informe un importe válido superior a 0.');
      return;
    }
    if (!dataVencimento) {
      alert('Por favor, seleccione una fecha de vencimiento.');
      return;
    }
    if (!selectedWorkerNome && !beneficiarioNome) {
      alert('Indique el colaborador o beneficiario de la orden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateOrdemRhPayload = {
        tipo_atividade: tipoAtividade,
        categoria,
        worker_id: selectedWorkerId || undefined,
        worker_nome: selectedWorkerNome || beneficiarioNome,
        worker_codigo: selectedWorkerCodigo || undefined,
        beneficiario_nome: beneficiarioNome || selectedWorkerNome,
        cliente: clienteCC,
        obra: obraCC,
        iban: iban || undefined,
        banco: banco || undefined,
        forma_pagamento: formaPagamento,
        valor: Number(valor),
        data_vencimento: dataVencimento,
        competencia,
        anexo_url: anexoUrl || undefined,
        observacoes,
        status_inicial: statusInicial
      };

      await financeRhService.gerarOrdemPagamentoRh(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error al generar la orden: ${err?.message || 'Intente de nuevo.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    if (!workerSearchTerm) return true;
    const term = workerSearchTerm.toLowerCase();
    return (
      (w.nome || '').toLowerCase().includes(term) ||
      (w.cod_colab || '').toLowerCase().includes(term) ||
      (w.nif || '').toLowerCase().includes(term) ||
      (w.funcion || '').toLowerCase().includes(term)
    );
  }).slice(0, 30);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 text-white rounded-2xl shadow-sm ${
              tipoAtividade === 'medico'
                ? 'bg-rose-600'
                : tipoAtividade === 'epis'
                ? 'bg-amber-600'
                : tipoAtividade === 'salario'
                ? 'bg-emerald-600'
                : tipoAtividade === 'formacion'
                ? 'bg-blue-600'
                : 'bg-purple-600'
            }`}>
              {tipoAtividade === 'medico' && <Stethoscope size={22} />}
              {tipoAtividade === 'epis' && <HardHat size={22} />}
              {tipoAtividade === 'salario' && <Banknote size={22} />}
              {tipoAtividade === 'formacion' && <GraduationCap size={22} />}
              {tipoAtividade === 'reembolso' && <Receipt size={22} />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Nueva Orden de Pago — Recursos Humanos
              </h2>
              <p className="text-xs text-slate-500">
                Gastos, anticipos de personal y reembolsos autorizados para el Financeiro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com 2 Colunas */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[82vh]">
          {/* 1. SELETOR DE MODO / ATIVIDADE DO RH */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase text-[10px] tracking-wider">
              Tipo de Actividad / Destino del Gasto *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleTipoAtividadeChange('medico')}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                  tipoAtividade === 'medico'
                    ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Stethoscope size={16} className={tipoAtividade === 'medico' ? 'text-rose-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <span className="font-bold block text-xs truncate">Médico & PRL</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">Exámenes, clínicas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoAtividadeChange('epis')}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                  tipoAtividade === 'epis'
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <HardHat size={16} className={tipoAtividade === 'epis' ? 'text-amber-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <span className="font-bold block text-xs truncate">EPIs & Vestuario</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">Botas, cascos, chalecos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoAtividadeChange('salario')}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                  tipoAtividade === 'salario'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Banknote size={16} className={tipoAtividade === 'salario' ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <span className="font-bold block text-xs truncate">Anticipos Nómina</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">Vales, ayudas de coste</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoAtividadeChange('formacion')}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                  tipoAtividade === 'formacion'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <GraduationCap size={16} className={tipoAtividade === 'formacion' ? 'text-blue-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <span className="font-bold block text-xs truncate">Formación / Cursos</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">PRL, grúas, tasas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoAtividadeChange('reembolso')}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                  tipoAtividade === 'reembolso'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Receipt size={16} className={tipoAtividade === 'reembolso' ? 'text-purple-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
                <div className="min-w-0">
                  <span className="font-bold block text-xs truncate">Reembolso General</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">Tickets, viajes, billetes</span>
                </div>
              </button>
            </div>
          </div>

          {/* Banner Informativo */}
          {tipoAtividade === 'salario' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
              <Banknote size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Anticipo Salarial / Vale:</strong> El importe se liquidará directamente a la cuenta bancaria del trabajador y podrá ser imputado para deducción en la nómina del mes ({competencia}).
              </p>
            </div>
          )}

          {tipoAtividade === 'reembolso' && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200 flex items-start gap-2.5">
              <Receipt size={16} className="text-purple-600 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Reembolso a Colaborador:</strong> Al seleccionar al trabajador, su IBAN se auto-rellenará para que el Financeiro ejecute la transferencia de los tickets de gastos o combustible adjuntos.
              </p>
            </div>
          )}

          {/* Layout de 2 Colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* COLUNA ESQUERDA: TRABALHADOR, CATEGORIA, FORMA DE PAGAMENTO E VALORES */}
            <div className="space-y-3.5">
              {/* Vínculo de Trabalhador */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <User size={14} className="text-blue-600" />
                    <span>Colaborador / Trabajador Vinculado *</span>
                  </label>
                  {selectedWorkerNome && (
                    <button
                      type="button"
                      onClick={handleClearWorker}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Cambiar
                    </button>
                  )}
                </div>

                {selectedWorkerNome ? (
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900 shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg shrink-0">
                        <User size={14} />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white block text-xs truncate">
                          {selectedWorkerNome}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {selectedWorkerCodigo ? `Cod: ${selectedWorkerCodigo}` : ''} {clienteCC ? `• Cliente: ${clienteCC}` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearWorker}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={loadingWorkers ? "Cargando trabajadores..." : "Buscar colaborador por nombre, código o función..."}
                      value={workerSearchTerm}
                      onChange={e => {
                        setWorkerSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredWorkers.map(w => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => handleSelectWorker(w)}
                            className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                                {w.nome}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {w.funcion || 'Colaborador'} {w.cod_colab ? `(${w.cod_colab})` : ''} {w.cliente ? `• ${w.cliente}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 shrink-0 ml-2">
                              Elegir
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Categorias e Modalidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                    Categoría del Gasto *
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {tipoAtividade === 'medico' && (
                      <>
                        <option value="Exame Médico / Reconhecimento Admissional">🩺 Reconocimiento Médico Admisional</option>
                        <option value="Exame Médico Periódico / Aptitud">📋 Reconocimiento Médico Periódico</option>
                        <option value="Vacunación / Análisis Clínicos">💉 Vacunación / Analítica</option>
                        <option value="Servicio de Prevención Ajeno (PRL)">🛡️ Cuota de Prevención / PRL</option>
                      </>
                    )}
                    {tipoAtividade === 'epis' && (
                      <>
                        <option value="Equipamentos de Proteção Individual (EPIs)">🦺 Kit Inicial de EPIs</option>
                        <option value="Calzado de Seguridad">👟 Botas / Calzado de Seguridad</option>
                        <option value="Ropa de Trabajo / Uniformes">👕 Ropa Laboral y Uniformes</option>
                        <option value="Reposición de EPIs por Desgaste">🔄 Reposición por Desgaste</option>
                      </>
                    )}
                    {tipoAtividade === 'salario' && (
                      <>
                        <option value="Adiantamento Salarial / Vale">💵 Anticipo de Salario / Vale</option>
                        <option value="Ayuda de Coste de Incorporación">🤝 Ayuda de Coste / Incorporación</option>
                        <option value="Finiquito / Liquidación Urgente">⚖️ Finiquito Urgente</option>
                        <option value="Gratificación / Bono Especial">⭐ Gratificación / Bono</option>
                      </>
                    )}
                    {tipoAtividade === 'formacion' && (
                      <>
                        <option value="Curso PRL / Formação Obrigatória">🎓 Curso PRL Obligatorio (Convenio)</option>
                        <option value="Curso Plataforma Elevadora / Grúa">🚜 Carnet Plataformas / Maquinaria</option>
                        <option value="Homologación de Títulos / Notaría">📜 Homologaciones / Notaría</option>
                        <option value="Tasas Consulares / Visados / NIE">🏛️ Tasas Consulares / NIE</option>
                      </>
                    )}
                    {tipoAtividade === 'reembolso' && (
                      <>
                        <option value="Reembolso de Despesas / Combustível (Tickets)">⛽ Reembolso de Combustible (Tickets)</option>
                        <option value="Reembolso de Billetes / Desplazamiento">✈️ Reembolso de Billetes de Viaje</option>
                        <option value="Reembolso de Dietas y Comidas">🍽️ Reembolso de Dietas / Alimentación</option>
                        <option value="Reembolso Compra Emergencial EPIs">🦺 Compra de EPIs por el Trabajador</option>
                        <option value="Otros Gastos Operativos Reembolsables">📦 Otros Reembolsos Justificados</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                    Forma de Pago *
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Transferência Bancária (IBAN)">🏦 Transferencia Bancaria (IBAN)</option>
                    <option value="Adelanto en Efectivo / Caja">💵 Adelanto en Efectivo / Caja Chica</option>
                    <option value="Tarjeta Corporativa (Pagado en el acto)">💳 Tarjeta Corporativa (Pagado en el acto)</option>
                    <option value="Domiciliación / Factura Mensual">🔄 Domiciliación / Factura Mensual</option>
                  </select>
                </div>
              </div>

              {/* Valores, Competência e Vencimento */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                    Importe (€) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={valor}
                      onChange={e => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full pl-7 pr-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-black text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                    Competencia *
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AAAA"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                    Vencimiento *
                  </label>
                  <input
                    type="date"
                    value={dataVencimento}
                    onChange={e => setDataVencimento(e.target.value)}
                    className="w-full px-2 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FAVORECIDO, IBAN, CENTRO DE CUSTO, ANEXO E OBS */}
            <div className="space-y-3.5">
              {/* Beneficiário e Dados Bancários */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Beneficiario / Favorecido *
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre de la clínica, proveedor o colaborador..."
                    value={beneficiarioNome}
                    onChange={e => setBeneficiarioNome(e.target.value)}
                    className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                      IBAN del Beneficiario
                    </label>
                    <input
                      type="text"
                      placeholder="ES00 0000 0000 0000 0000 0000"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                      Banco / Titular
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Santander / BBVA"
                      value={banco}
                      onChange={e => setBanco(e.target.value)}
                      className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Centro de Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                    Cliente / Centro de Coste
                  </label>
                  <input
                    type="text"
                    value={clienteCC}
                    onChange={e => setClienteCC(e.target.value)}
                    placeholder="Recursos Humanos / Cliente"
                    className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                    Obra / Destino
                  </label>
                  <input
                    type="text"
                    value={obraCC}
                    onChange={e => setObraCC(e.target.value)}
                    placeholder="Obra General"
                    className="w-full px-2.5 py-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Factura / Comprobante / Recibo Adjunto */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <Paperclip size={13} className="text-rose-500" />
                    <span>Factura / Recibo / Tickets de Gasto</span>
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, JPG o PNG</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadFile}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... o pulse Subir archivo"
                    value={anexoUrl}
                    onChange={e => setAnexoUrl(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 h-8 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    {isUploading ? 'Subiendo...' : 'Subir'}
                  </button>
                </div>

                {anexoUrl && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span className="truncate">{anexoNome || 'Comprobante adjuntado con éxito'}</span>
                    <a
                      href={anexoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline ml-auto shrink-0 hover:text-blue-800"
                    >
                      Ver
                    </a>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Observaciones / Notas para Finanzas
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el gasto, justificación, clínica o cuenta de cargo..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSubmit('rascunho')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <FileCheck size={14} className="text-slate-500" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar como Borrador'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('aguardando_aprovacao')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Enviando...' : 'Crear y Enviar a Finanzas'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
