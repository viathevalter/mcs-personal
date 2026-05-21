import React, { useState } from 'react';
import { X, UserPlus, Search, Check, Briefcase, ChevronDown } from 'lucide-react';
import type { OpenPosition } from '../hooks/useOpenPositions';
import { useAllocateWorker } from '../hooks/useAllocateWorker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

interface AllocateWorkerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: OpenPosition | null;
}

export const AllocateWorkerDialog: React.FC<AllocateWorkerDialogProps> = ({ isOpen, onClose, position }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const { selectedEmpresaId } = useEmpresa();
  
  // Inactive worker selection
  const { data: workers = [], isLoading: isLoadingWorkers, error: workersError } = useQuery({
    queryKey: ['inactive_workers', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      let queryBuilder = supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, nif, dni, email, movil, funcion, cod_colab, status_trabajador');
        
      if (selectedEmpresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
        queryBuilder = queryBuilder.eq('empresa_id', selectedEmpresaId);
      }
      
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
  const uniqueFunctions = React.useMemo(() => {
    const functions = workers
      .map((w: any) => w.funcion)
      .filter(Boolean);
    return [...new Set(functions)].sort();
  }, [workers]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setMode('existing');
      setSelectedWorkerId('');
      setSearchWorker('');
      setSelectedFunctionFilter('');
      setWorkerName('');
      setWorkerDocument('');
      setNotes('');
      setIsDropdownOpen(false);
    }
  }, [isOpen]);
  
  // New worker form
  const [workerName, setWorkerName] = useState('');
  const [workerDocument, setWorkerDocument] = useState('');
  
  // Common
  // Initialize with the position's expected_start_date if available, or today
  const [plannedStartDate, setPlannedStartDate] = useState(position?.expected_start_date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Update plannedStartDate when position changes
  React.useEffect(() => {
    if (position?.expected_start_date) {
      setPlannedStartDate(position.expected_start_date);
    }
  }, [position]);

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

  const selectedWorker = workers.find((w: any) => w.id === selectedWorkerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'new' && (!workerName || !workerDocument)) {
      alert('Nome e documento são obrigatórios para novo trabalhador.');
      return;
    }
    
    if (mode === 'existing' && !selectedWorkerId) {
      alert('Selecione um trabalhador inativo.');
      return;
    }

    if (!plannedStartDate) {
      alert('Data de Início Prevista é obrigatória.');
      return;
    }

    allocate(
      {
        pedido_item_id: position.id,
        worker_id: mode === 'existing' ? selectedWorkerId : undefined,
        worker_name: mode === 'new' ? workerName : undefined,
        worker_document: mode === 'new' ? workerDocument : undefined,
        planned_start_date: plannedStartDate,
        notes: notes || undefined
      },
      {
        onSuccess: () => {
          onClose();
          // Reset form
          setMode('existing');
          setSelectedWorkerId('');
          setWorkerName('');
          setWorkerDocument('');
          setNotes('');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alocar Trabalhador</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha a vaga para o Pedido {position.pedido_codigo}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-slate-900 dark:text-white">{position.job_function_name}</h3>
                <div className="text-right">
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
                  <span className="font-medium text-slate-600 dark:text-slate-300">Data Prevista:</span> {position.expected_start_date ? new Date(position.expected_start_date).toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>
              
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
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-6">
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
                          Erro ao carregar: {workersError instanceof Error ? workersError.message : 'Erro no banco.'}
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Documento / NIF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={workerDocument}
                    onChange={(e) => setWorkerDocument(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 text-xs text-slate-500 mt-1">
                  Nota: Você poderá completar o cadastro deste trabalhador (endereço, banco, benefícios) mais tarde no módulo de Trabalhadores.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data de Início Prevista <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Observações
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Detalhes adicionais sobre esta alocação..."
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
