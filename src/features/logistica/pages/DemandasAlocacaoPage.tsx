import React, { useEffect, useState } from 'react';
import { Users, Search, MapPin, CheckCircle, Clock, Filter, ArrowRight, Home, Building2, UserPlus, RefreshCw } from 'lucide-react';
import { logisticsService } from '../services/logisticsService';
import type { Alojamento, Cama } from '../services/logisticsService';
import { supabase } from '@/shared/supabase/client';

interface SolicitudDemanda {
  id: string;
  codigo?: string;
  worker_nome: string;
  funcao?: string;
  cliente_nome?: string;
  municipio?: string;
  pais?: string;
  status: string;
  data_solicitacao?: string;
}

export const DemandasAlocacaoPage: React.FC = () => {
  const [demandas, setDemandas] = useState<SolicitudDemanda[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [camasDisponiveis, setCamasDisponiveis] = useState<Cama[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedDemanda, setSelectedDemanda] = useState<SolicitudDemanda | null>(null);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [selectedCamaId, setSelectedCamaId] = useState<string>('');
  const [isAllocating, setIsAllocating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar trabalhadores com solicitações ativas vindos de core_operacoes
      const { data: solData } = await supabase
        .from('solicitudes_operativas')
        .select('*')
        .order('created_at', { ascending: false });

      if (solData && solData.length > 0) {
        setDemandas(solData.map((s: any) => ({
          id: s.id,
          codigo: s.codigo || 'SOL-001',
          worker_nome: s.worker_name || s.descricao || 'Trabalhador Solicitado',
          funcao: s.funcao || 'Operador',
          cliente_nome: s.cliente_nome || 'Cliente Obra',
          municipio: s.municipio || 'Barcelona',
          pais: s.pais || 'España',
          status: s.status || 'Pendente',
          data_solicitacao: s.created_at
        })));
      } else {
        // Mock inicial realista baseado nos CSVs
        setDemandas([
          { id: '1', codigo: 'SOL-2026/0445', worker_nome: 'E11813 - Carlos Eduardo', funcao: 'Eletricista', cliente_nome: 'BECK & POLLITZER IBERICA SLU', municipio: 'Barcelona', pais: 'España', status: 'Aguardando Alocação' },
          { id: '2', codigo: 'SOL-2026/0445', worker_nome: 'E12077 - Juan Rodriguez', funcao: 'Serralheiro', cliente_nome: 'BECK & POLLITZER IBERICA SLU', municipio: 'Barcelona', pais: 'España', status: 'Aguardando Alocação' },
          { id: '3', codigo: 'SOL-2026/0374', worker_nome: 'E12148 - Mateo Fernandes', funcao: 'Montador', cliente_nome: 'ASTUR NORTE SERVICIOS', municipio: 'Gijón', pais: 'España', status: 'Aguardando Alocação' },
        ]);
      }

      // 2. Buscar Alojamentos e Camas
      const alojData = await logisticsService.fetchAlojamentos();
      setAlojamentos(alojData);

      const camasData = await logisticsService.fetchCamas();
      setCamasDisponiveis(camasData.filter(c => c.status === 'livre'));
    } catch (err) {
      console.error('Erro ao carregar demandas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmAllocation = async () => {
    if (!selectedDemanda || !selectedCamaId || !selectedAlojamentoId) {
      alert('Selecione uma demanda, um alojamento e uma cama disponível.');
      return;
    }

    try {
      setIsAllocating(true);
      await logisticsService.alocarTrabalhador({
        cama_id: selectedCamaId,
        alojamento_id: selectedAlojamentoId,
        worker_id: selectedDemanda.id,
        solicitud_id: selectedDemanda.id,
        data_inicio: new Date().toISOString().split('T')[0]
      });

      alert(`Trabalhador ${selectedDemanda.worker_nome} alocado com sucesso!`);
      setSelectedDemanda(null);
      setSelectedCamaId('');
      setSelectedAlojamentoId('');
      loadData();
    } catch (err: any) {
      console.error('Erro ao alocar:', err);
      alert('Erro ao realizar alocação.');
    } finally {
      setIsAllocating(false);
    }
  };

  const filteredDemandas = demandas.filter(d => 
    d.worker_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.cliente_nome && d.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const camasFiltradas = camasDisponiveis.filter(c => c.alojamento_id === selectedAlojamentoId);

  return (
    <div className="w-full px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-600" size={26} />
            Central de Demandas de Alocação
          </h1>
          <p className="text-sm text-slate-500">Atendimento de solicitações da Operação e RH para alojamento de trabalhadores</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Atualizar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Demandas */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Trabalhadores Aguardando Alocação
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                {filteredDemandas.length}
              </span>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar trabalhador/obra..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Carregando solicitações...</div>
            ) : filteredDemandas.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhuma solicitação pendente.</div>
            ) : (
              filteredDemandas.map(d => (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDemanda(d);
                    setSelectedAlojamentoId('');
                    setSelectedCamaId('');
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDemanda?.id === d.id
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{d.codigo}</span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{d.worker_nome}</h3>
                      <p className="text-xs text-slate-500">{d.funcao} • Obra: {d.cliente_nome}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      {d.municipio}, {d.pais}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de Alocação Rápida */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UserPlus className="text-blue-600" size={20} />
            Alocar no Alojamento
          </h2>

          {selectedDemanda ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Trabalhador Selecionado:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedDemanda.worker_nome}</p>
                <p className="text-xs text-slate-500">{selectedDemanda.cliente_nome} ({selectedDemanda.municipio})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Selecionar Alojamento
                </label>
                <select
                  value={selectedAlojamentoId}
                  onChange={e => {
                    setSelectedAlojamentoId(e.target.value);
                    setSelectedCamaId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">Escolha um alojamento na região...</option>
                  {alojamentos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nome} ({a.municipio}, {a.pais}) - Cap: {a.capacidade_pessoas} pax
                    </option>
                  ))}
                </select>
              </div>

              {selectedAlojamentoId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    2. Selecionar Cama Disponível
                  </label>
                  {camasFiltradas.length === 0 ? (
                    <p className="text-xs text-amber-600">Nenhuma cama livre neste alojamento.</p>
                  ) : (
                    <select
                      value={selectedCamaId}
                      onChange={e => setSelectedCamaId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="">Selecione uma cama livre...</option>
                      {camasFiltradas.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.identificador} ({c.tipo})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmAllocation}
                disabled={!selectedCamaId || isAllocating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                {isAllocating ? 'Alocando...' : 'Confirmar Check-in / Alocação'}
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Selecione um trabalhador da lista ao lado para iniciar o processo de alocação de cama.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
