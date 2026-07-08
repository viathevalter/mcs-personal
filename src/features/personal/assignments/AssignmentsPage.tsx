import React, { useState, useMemo } from 'react';
import { Building, AlertCircle, Search, Users, X } from 'lucide-react';
import { useWorkerAssignments } from '@/features/operacoes/solicitudes/hooks/useWorkerAssignments';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export const AssignmentsPage: React.FC = () => {
  const { selectedEmpresaId } = useEmpresa();
  
  // Estados para filtros
  const [workerSearch, setWorkerSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [pedidoSearch, setPedidoSearch] = useState('');

  // Busca alocações da empresa
  const { data: assignments = [], isLoading } = useWorkerAssignments({
    empresa_id: selectedEmpresaId
  });

  // Lista de clientes únicos para o filtro dropdown
  const clientsList = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a: any) => {
      if (a.client) {
        map.set(a.client.id, a.client.trade_name || a.client.legal_name || 'Cliente');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  // Lógica de filtragem local
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment: any) => {
      // 1. Busca por nome do trabalhador
      if (workerSearch) {
        const name = (assignment.worker?.nome || '').toLowerCase();
        if (!name.includes(workerSearch.toLowerCase())) return false;
      }

      // 2. Filtro por cliente
      if (clientFilter !== 'all') {
        if (assignment.client_id !== clientFilter) return false;
      }

      // 3. Busca por código do pedido
      if (pedidoSearch) {
        const code = (assignment.pedido?.codigo || '').toLowerCase();
        if (!code.includes(pedidoSearch.toLowerCase())) return false;
      }

      return true;
    });
  }, [assignments, workerSearch, clientFilter, pedidoSearch]);

  const handleClearFilters = () => {
    setWorkerSearch('');
    setClientFilter('all');
    setPedidoSearch('');
  };

  return (
    <div className="h-[calc(100vh-85px)] overflow-hidden flex flex-col p-8 w-full animate-fade-in space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Trabalhadores Alocados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Visão geral de todos os trabalhadores ativos ou planejados.
          </p>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm flex flex-wrap gap-4 items-end">
        {/* Busca Trabalhador */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Buscar Trabalhador</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nome ou documento..."
              value={workerSearch}
              onChange={e => setWorkerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filtro Cliente */}
        <div className="w-64 min-w-[180px] space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cliente</label>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todos os Clientes</option>
            {clientsList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Busca Pedido */}
        <div className="w-64 min-w-[180px] space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Código do Pedido</label>
          <input
            type="text"
            placeholder="Ex: PED-2026-000001"
            value={pedidoSearch}
            onChange={e => setPedidoSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Botão de Limpar */}
        {(workerSearch || clientFilter !== 'all' || pedidoSearch) && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40"
          >
            <X size={14} />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Conteúdo com Scroll Limitado à Tabela */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap relative">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-850">
              <tr>
                <th className="px-6 py-4 font-medium bg-slate-50 dark:bg-slate-800">Trabalhador</th>
                <th className="px-6 py-4 font-medium bg-slate-50 dark:bg-slate-800">Empresa</th>
                <th className="px-6 py-4 font-medium bg-slate-50 dark:bg-slate-800">Pedido</th>
                <th className="px-6 py-4 font-medium bg-slate-50 dark:bg-slate-800">Cliente / Obra</th>
                <th className="px-6 py-4 font-medium bg-slate-50 dark:bg-slate-800">Função</th>
                <th className="px-6 py-4 font-medium text-center bg-slate-50 dark:bg-slate-800">Contratado Em</th>
                <th className="px-6 py-4 font-medium text-center bg-slate-50 dark:bg-slate-800">Início Previsto</th>
                <th className="px-6 py-4 font-medium text-center bg-slate-50 dark:bg-slate-800">Início Real</th>
                <th className="px-6 py-4 font-medium text-center bg-slate-50 dark:bg-slate-800">Status</th>
                <th className="px-6 py-4 font-medium text-right bg-slate-50 dark:bg-slate-800">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    Carregando alocações...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma alocação encontrada para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment: any) => (
                  <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Trabalhador */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {assignment.worker?.nome || 'Desconhecido'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {assignment.worker?.nif || assignment.worker?.dni || assignment.worker?.cod_colab || 'Sem documento'}
                      </div>
                    </td>

                    {/* Empresa */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                      {assignment.empresa?.nome || '-'}
                    </td>

                    {/* Pedido */}
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-350">
                      {assignment.pedido?.codigo || 'N/A'}
                    </td>

                    {/* Cliente / Obra */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {assignment.client?.trade_name || assignment.client?.legal_name || 'Cliente'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {assignment.client_site?.name || 'Obra'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Função */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {assignment.job_function_name_snapshot || 'Desconhecida'}
                    </td>

                    {/* Contratado Em */}
                    <td className="px-6 py-4 text-center text-xs font-semibold text-slate-655 dark:text-slate-400">
                      {assignment.created_at ? new Date(assignment.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>

                    {/* Início Previsto */}
                    <td className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {assignment.planned_start_date ? new Date(assignment.planned_start_date).toLocaleDateString('pt-BR') : '-'}
                    </td>

                    {/* Início Real */}
                    <td className="px-6 py-4 text-center text-xs font-semibold text-slate-655 dark:text-slate-400">
                      {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString('pt-BR') : '-'}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        assignment.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-450' :
                        assignment.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-450' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {assignment.status === 'active' ? 'Ativo' : 
                         assignment.status === 'planned' ? 'Planejado' : 
                         assignment.status}
                      </span>
                    </td>

                    {/* Origem */}
                    <td className="px-6 py-4 text-right">
                      {assignment.assignment_type === 'new_hire' && !assignment.replacement_of_assignment_id ? (
                        <span className="text-xs font-medium text-slate-500">Alocação Raiz</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded border border-amber-250 dark:border-amber-900/40">
                            <AlertCircle size={12} />
                            Substituição
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
