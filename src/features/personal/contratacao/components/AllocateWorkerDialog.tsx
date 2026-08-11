import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, UserPlus, Search, Check, Briefcase, ChevronDown, HelpCircle, AlertTriangle } from 'lucide-react';
import type { OpenPosition } from '../hooks/useOpenPositions';
import { useAllocateWorker } from '../hooks/useAllocateWorker';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const getDurationText = (start: string, end: string) => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '';
  if (endDate < startDate) return 'A data de fim deve ser posterior à data de início';

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Cálculo de meses e dias mais preciso
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months -= startDate.getMonth();
  months += endDate.getMonth();
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  
  let adjustedMonths = months;
  if (endDay < startDay) {
    adjustedMonths -= 1;
  }
  
  let remainingDays = 0;
  const tempDate = new Date(startDate);
  tempDate.setMonth(tempDate.getMonth() + adjustedMonths);
  const remainingTime = endDate.getTime() - tempDate.getTime();
  if (remainingTime > 0) {
    remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
  }

  if (adjustedMonths <= 0) {
    return `Duração estimada: ${diffDays} dia(s)`;
  }
  
  if (remainingDays === 0) {
    return `Duração estimada: ${adjustedMonths} mês(es) (${diffDays} dias no total)`;
  }

  return `Duração estimada: ${adjustedMonths} mês(es) e ${remainingDays} dia(s) (${diffDays} dias no total)`;
};

export const AllocateWorkerDialog: React.FC<AllocateWorkerDialogProps> = ({ isOpen, onClose, position }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const { selectedEmpresaId } = useEmpresa();

  const getProfileQuestions = (perguntaRespuesta: any, cargoName: string) => {
    if (!perguntaRespuesta || typeof perguntaRespuesta !== 'object') return [];
    return Object.values(perguntaRespuesta).filter((q: any) => 
      q?.cargo?.toLowerCase() === cargoName?.toLowerCase()
    );
  };
  
  // Inactive worker selection
  const { data: workers = [], isLoading: isLoadingWorkers, error: workersError } = useQuery({
    queryKey: ['inactive_workers', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      let queryBuilder = supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, nif, dni, email, movil, funcion, cod_colab, status_trabajador, camiseta, pantalones, licencia_conducir');
        
      const { data, error } = await queryBuilder.or('status_trabajador.is.null,status_trabajador.not.in.(Ativo,Activo,ATIVO,ACTIVO)');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEmpresaId && isOpen
  });
  
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [searchWorker, setSearchWorker] = useState('');
  const [selectedFunctionFilter, setSelectedFunctionFilter] = useState('');

  // Extract all unique job functions among the loaded inactive workers
  const uniqueFunctions = useMemo(() => {
    const functions = workers
      .map((w: any) => w.funcion)
      .filter(Boolean);
    return [...new Set(functions)].sort();
  }, [workers]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // New worker form
  const [workerName, setWorkerName] = useState('');
  const [workerDocument, setWorkerDocument] = useState('');
  
  // Common states (allocated rates, sizes, mobile, driver license)
  const [camiseta, setCamiseta] = useState('');
  const [pantalones, setPantalones] = useState('');
  const [licenciaConducir, setLicenciaConducir] = useState<'Si' | 'No' | ''>('');
  const [movil, setMovil] = useState('');
  const [tarifaAcordada, setTarifaAcordada] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode('existing');
      setSelectedWorkerId('');
      setSearchWorker('');
      setSelectedFunctionFilter('');
      setWorkerName('');
      setWorkerDocument('');
      setCamiseta('');
      setPantalones('');
      setLicenciaConducir('');
      setMovil('');
      setTarifaAcordada('');
      setNotes('');
      setIsDropdownOpen(false);
      
      if (position?.replacement_due_date) {
        try {
          const formattedDate = new Date(position.replacement_due_date).toISOString().split('T')[0];
          setPlannedStartDate(formattedDate);
        } catch (e) {
          setPlannedStartDate(position.replacement_due_date.split('T')[0]);
        }
      } else if (position?.expected_start_date) {
        setPlannedStartDate(position.expected_start_date);
      } else {
        setPlannedStartDate(new Date().toISOString().split('T')[0]);
      }

      if (position?.expected_end_date) {
        setPlannedEndDate(position.expected_end_date);
      } else {
        setPlannedEndDate('');
      }
    }
  }, [isOpen, position]);
  
  const selectedWorker = useMemo(() => {
    return workers.find((w: any) => w.id === selectedWorkerId);
  }, [workers, selectedWorkerId]);

  // Pre-fill states from selected worker
  useEffect(() => {
    if (selectedWorker) {
      setCamiseta(selectedWorker.camiseta || '');
      setPantalones(selectedWorker.pantalones || '');
      setLicenciaConducir(selectedWorker.licencia_conducir || '');
      setMovil(selectedWorker.movil || '');
    }
  }, [selectedWorker]);

  const checkDuplicateDocument = async (docValue: string) => {
    if (!docValue || !selectedEmpresaId) return;
    
    const cleanDoc = docValue.trim().toUpperCase();
    if (!cleanDoc) return;
    
    try {
      const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cod_colab, nif, dni, nie, pasaporte')
        .or(`nif.eq.${cleanDoc},dni.eq.${cleanDoc},nie.eq.${cleanDoc},pasaporte.eq.${cleanDoc}`)
        .limit(1);
        
      if (error) {
        console.error('Erro ao verificar documento:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const found = data[0];
        toast.warning(
          `Trabalhador já cadastrado: ${found.nome} (${found.cod_colab || 'Sem código'}). O sistema selecionará ele automaticamente.`,
          { duration: 6000 }
        );
        
        // Redireciona e seleciona o trabalhador
        setMode('existing');
        setSelectedWorkerId(found.id);
        setSearchWorker(found.nome);
      }
    } catch (err) {
      console.error('Erro na consulta do documento:', err);
    }
  };

  const { mutate: allocate, isPending } = useAllocateWorker();

  if (!isOpen || !position) return null;

  const filteredWorkers = workers.filter((w: any) => {
    if (selectedFunctionFilter && w.funcion !== selectedFunctionFilter) {
      return false;
    }
    if (!searchWorker) return true;
    const search = searchWorker.toLowerCase();
    return (w.nome && w.nome.toLowerCase().includes(search)) || 
           (w.nif && w.nif.toLowerCase().includes(search)) ||
           (w.dni && w.dni.toLowerCase().includes(search)) ||
           (w.cod_colab && w.cod_colab.toLowerCase().includes(search)) ||
           (w.funcion && w.funcion.toLowerCase().includes(search));
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'new' && !workerName) {
      toast.error('O nome completo é obrigatório para novo trabalhador.');
      return;
    }
    
    if (mode === 'existing' && !selectedWorkerId) {
      toast.error('Selecione um trabalhador inativo.');
      return;
    }

    if (!camiseta) {
      toast.error('O tamanho de camisa (camiseta) é obrigatório.');
      return;
    }

    if (!pantalones) {
      toast.error('O tamanho de calça (pantalones) é obrigatório.');
      return;
    }

    if (!licenciaConducir) {
      toast.error('A informação de CNH (carta de condução) é obrigatória.');
      return;
    }

    if (!movil) {
      toast.error('O telefone móvel (móvel) é obrigatório.');
      return;
    }

    if (!plannedStartDate) {
      toast.error('Data de Início Prevista é obrigatória.');
      return;
    }

    if (!tarifaAcordada) {
      toast.error('A tarifa acordada é obrigatória.');
      return;
    }

    const isTarifaSuperior = position.base_cost_hour_snapshot && Number(tarifaAcordada) > Number(position.base_cost_hour_snapshot);
    if (isTarifaSuperior && (!notes || notes.trim().length === 0)) {
      toast.error('A tarifa acordada é superior à orçada. Por favor, digite uma breve justificativa nas "Observações de Alocação".');
      return;
    }

    allocate(
      {
        pedido_item_id: (position.isSynthetic || (position.id && position.id.startsWith('reemplazo-'))) ? undefined : position.id,
        worker_id: mode === 'existing' ? selectedWorkerId : undefined,
        worker_name: mode === 'new' ? workerName : undefined,
        worker_document: mode === 'new' ? workerDocument : undefined,
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate || undefined,
        notes: notes || undefined,
        camiseta: camiseta || undefined,
        pantalones: pantalones || undefined,
        licencia_conducir: licenciaConducir,
        movil: movil || undefined,
        tarifa_acordada: parseFloat(tarifaAcordada),
        solicitud_id: position.solicitud_id || undefined,
        empresa_id: (position as any).empresa_id || selectedEmpresaId || undefined
      },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alocar Trabalhador</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha a vaga para o Pedido {position.pedido_codigo}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{position.job_function_name}</h3>
                  {(() => {
                    const qas = getProfileQuestions(position.pergunta_respuesta, position.job_function_name);
                    if (qas.length === 0) return null;
                    return (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-slate-400 hover:text-slate-655 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-900 border border-slate-800 text-white p-3 rounded-lg shadow-lg z-[60]">
                            <div className="space-y-2 text-xs">
                              <p className="font-bold border-b border-slate-800 pb-1 text-slate-350">Respostas da Viabilidade:</p>
                              {qas.map((qa: any, idx: number) => (
                                <div key={idx} className="space-y-0.5 text-left">
                                  <span className="text-slate-400 font-medium block">{qa.pergunta}</span>
                                  <span className="text-white font-semibold block">{qa.resposta}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Saldo de Vagas</div>
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-700 font-bold">
                    {position.quantity_requested - position.quantity_fulfilled}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Cliente/Obra:</span> {position.client_name} • {position.site_name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Data Prevista (Pedido):</span> {position.expected_start_date ? new Date(position.expected_start_date).toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>

              {position.replacement_due_date && (
                <div className="mt-3 flex items-start gap-2 text-xs text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-900/40">
                  <AlertTriangle className="h-4 w-4 text-purple-650 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Vaga de Reemplazo (Substituição) Ativa!</strong>
                    <span className="block mt-1">
                      Esta vaga foi reaberta devido a uma solicitação operacional de substituição. 
                      O novo trabalhador deve iniciar em: <strong>{new Date(position.replacement_due_date).toLocaleDateString('pt-PT')}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {(() => {
                const qas = getProfileQuestions(position.pergunta_respuesta, position.job_function_name);
                if (qas.length === 0) return null;
                return (
                  <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-slate-900/50 rounded-lg border border-indigo-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-2 block">Respostas da Viabilidade</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {qas.map((qa: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium block">{qa.pergunta}</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold block mt-0.5">{qa.resposta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {position.description_snapshot && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Observações da Vaga</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {position.description_snapshot}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'existing' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Search className="inline-block mr-2 h-4 w-4" /> Trabalhador Existente
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'new' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <UserPlus className="inline-block mr-2 h-4 w-4" /> Cadastrar Novo
            </button>
          </div>

          <div className="space-y-6">
            {mode === 'existing' ? (
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Selecionar Trabalhador Inativo <span className="text-red-500">*</span>
                </label>
                
                {/* Combobox Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-colors focus:ring-2 focus:ring-blue-500 outline-none text-left"
                >
                  {selectedWorker ? (
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{selectedWorker.nome}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedWorker.funcion || 'Sem função'} • NIF/DNI: {selectedWorker.nif || selectedWorker.dni || 'Não informado'} • Cód: {selectedWorker.cod_colab}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Selecione um trabalhador inativo...</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Combobox Floating List */}
                {isDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden animate-scale-in">
                    {/* Search Input inside Dropdown */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50">
                      <Search size={16} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Pesquisar por nome, documento ou código..."
                        value={searchWorker}
                        onChange={(e) => setSearchWorker(e.target.value)}
                        className="w-full bg-transparent border-0 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 py-1"
                      />
                      {searchWorker && (
                        <button 
                          type="button" 
                          onClick={() => setSearchWorker('')}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    {/* Filter by Job Function inside Dropdown */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[11px] uppercase text-slate-400 font-bold tracking-wider shrink-0 ml-1">Função:</span>
                      <select
                        value={selectedFunctionFilter}
                        onChange={(e) => setSelectedFunctionFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Todas as funções</option>
                        {position?.job_function_name && (
                          <option value={position.job_function_name}>
                            Mesma função da vaga ({position.job_function_name})
                          </option>
                        )}
                        {uniqueFunctions.map((f: string) => (
                          f !== position?.job_function_name && (
                            <option key={f} value={f}>{f}</option>
                          )
                        ))}
                      </select>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                      {isLoadingWorkers ? (
                        <div className="p-4 text-center text-sm text-slate-500">Carregando trabalhadores...</div>
                      ) : workersError ? (
                        <div className="p-4 text-center text-sm text-red-500 bg-rose-50 dark:bg-rose-950/20">
                          Erro ao carregar: {workersError ? ((workersError as any).message || JSON.stringify(workersError)) : 'Erro no banco.'}
                        </div>
                      ) : filteredWorkers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">Nenhum trabalhador inativo encontrado.</div>
                      ) : (
                        filteredWorkers.map((w: any) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              setSelectedWorkerId(w.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              selectedWorkerId === w.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{w.nome}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {w.funcion || 'Sem função'} • NIF/DNI: {w.nif || w.dni || 'Não informado'} • Cód: {w.cod_colab}
                              </p>
                            </div>
                            {selectedWorkerId === w.id && (
                              <Check size={16} className="text-blue-600 shrink-0 self-center" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Documento (Passaporte/DNI/NIE)
                    </label>
                    <input
                      type="text"
                      value={workerDocument}
                      onChange={(e) => setWorkerDocument(e.target.value)}
                      onBlur={(e) => checkDuplicateDocument(e.target.value)}
                      placeholder="Ex: 00000000A"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Nota: Você poderá completar o cadastro deste trabalhador (endereço, banco, benefícios) mais tarde no módulo de Trabalhadores.
                </div>
              </div>
            )}

            {/* New Allocation Fields Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tamanho de Camisa (Camiseta) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={camiseta}
                  onChange={e => setCamiseta(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="S (50/52)">S (50/52)</option>
                  <option value="M(54/56)">M(54/56)</option>
                  <option value="L(58)">L(58)</option>
                  <option value="XL(60)">XL(60)</option>
                  <option value="XXL(62)">XXL(62)</option>
                  <option value="XXXL(64)">XXXL(64)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tamanho de Calça (Pantalones) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={pantalones}
                  onChange={e => setPantalones(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="S (38/40)">S (38/40)</option>
                  <option value="M(42/44)">M(42/44)</option>
                  <option value="L(46)">L(46)</option>
                  <option value="XL(52)">XL(52)</option>
                  <option value="XXL(54)">XXL(54)</option>
                  <option value="XXXL(56)">XXXL(56)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Licença de Conducir (CNH) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={licenciaConducir}
                  onChange={e => setLicenciaConducir(e.target.value as 'Si' | 'No' | '')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Telefone Móvel (Móvil) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+351 900 000 000"
                  value={movil}
                  onChange={e => setMovil(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data de Início Prevista <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data de Fim Prevista
                </label>
                <input
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              {/* Duração calculada exibida com legenda */}
              {plannedStartDate && plannedEndDate && (
                <div className="md:col-span-3 text-xs font-semibold text-blue-600 dark:text-blue-455 bg-blue-50/70 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/60 mt-1">
                  {getDurationText(plannedStartDate, plannedEndDate)}
                </div>
              )}

            </div>

            {/* Tarifa acordada em linha exclusiva e layout flex */}
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Tarifa acordada com o Trabalhador <span className="text-red-500">*</span>
                  </span>
                  {position.base_cost_hour_snapshot !== undefined && position.base_cost_hour_snapshot !== null && (
                    <span className="font-black text-xs text-rose-600 dark:text-rose-455 bg-rose-50 dark:bg-rose-950/45 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 shadow-sm">
                      Tarifa Orçada: {Number(position.base_cost_hour_snapshot).toFixed(2)} €/h
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina o valor pago por hora a este trabalhador de acordo com o acordado.
                </p>
                {tarifaAcordada && position.base_cost_hour_snapshot && Number(tarifaAcordada) > Number(position.base_cost_hour_snapshot) && (
                  <div className="text-xs text-rose-600 dark:text-rose-450 font-semibold mt-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg flex flex-col gap-1.5 animate-pulse">
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={14} className="shrink-0" />
                      Atenção: A tarifa acordada ({Number(tarifaAcordada).toFixed(2)} €) é superior à tarifa orçada ({Number(position.base_cost_hour_snapshot).toFixed(2)} €).
                    </div>
                    <p className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                      Como controle operacional, é obrigatório preencher o campo de <strong>Observações de Alocação</strong> abaixo detalhando a justificativa dessa contratação acima do orçado para que o sistema libere a alocação.
                    </p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-64 shrink-0">
                <select
                  required
                  value={tarifaAcordada}
                  onChange={e => setTarifaAcordada(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 outline-none text-sm transition-colors ${
                    tarifaAcordada && position.base_cost_hour_snapshot && Number(tarifaAcordada) > Number(position.base_cost_hour_snapshot)
                      ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecione a tarifa...</option>
                  <option value="12">12,00 €</option>
                  <option value="13">13,00 €</option>
                  <option value="14">14,00 €</option>
                  <option value="15">15,00 €</option>
                  <option value="16">16,00 €</option>
                  <option value="17">17,00 €</option>
                  <option value="18">18,00 €</option>
                  <option value="19">19,00 €</option>
                  <option value="20">20,00 €</option>
                  <option value="21">21,00 €</option>
                  <option value="22">22,00 €</option>
                  <option value="23">23,00 €</option>
                  <option value="24">24,00 €</option>
                  <option value="25">25,00 €</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Observações de Alocação
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                placeholder="Detalhes adicionais sobre esta alocação..."
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-slate-755 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isPending ? 'Alocando...' : 'Confirmar Alocação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
