import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Clock, CheckCircle2, AlertCircle, Plus, Search,
  Sparkles, TrendingUp, Layers, ChevronRight, Play, Check, ShieldAlert,
  ArrowUpRight, RefreshCw, X, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { reunioesService } from '../services/reunioesService';
import { listDepartments } from '../services/incidencias';
import type { Reuniao, TipoReuniao, StatusReuniao } from '../types/reunioes';
import { TIPOS_REUNIAO_MAP } from '../types/reunioes';

export const Reunioes: React.FC = () => {
  const navigate = useNavigate();
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newReuniao, setNewReuniao] = useState({
    titulo: '',
    tipo: 'comercial_rh' as TipoReuniao,
    data_reuniao: new Date().toISOString().slice(0, 16),
    duracao_minutos: 45,
    pauta_topicos: '',
    departamentos_envolvidos: ['Comercial', 'Recursos Humanos'],
    participantesTexto: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, depts] = await Promise.all([
        reunioesService.listReunioes({
          tipo: selectedTipo !== 'todos' ? selectedTipo : undefined,
          status: selectedStatus !== 'todos' ? selectedStatus : undefined
        }),
        listDepartments().catch(() => [])
      ]);
      setReunioes(list);
      setDepartments(depts);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTipo, selectedStatus]);

  // Métricas WBR
  const totalReunioes = reunioes.length;
  const agendadas = reunioes.filter(r => r.status === 'agendada' || r.status === 'em_andamento').length;
  const concluidas = reunioes.filter(r => r.status === 'concluida').length;
  
  const todasAcoes = reunioes.flatMap(r => r.acoes || []);
  const totalAcoes = todasAcoes.length;
  const acoesConcluidas = todasAcoes.filter(a => a.status === 'Concluida').length;
  const taxaConclusao = totalAcoes > 0 ? Math.round((acoesConcluidas / totalAcoes) * 100) : 100;

  // Próxima reunião
  const proximaReuniao = reunioes
    .filter(r => r.status === 'agendada' && new Date(r.data_reuniao).getTime() >= Date.now() - 3600000)
    .sort((a, b) => new Date(a.data_reuniao).getTime() - new Date(b.data_reuniao).getTime())[0];

  const handleTipoChange = (tipo: TipoReuniao) => {
    const config = TIPOS_REUNIAO_MAP[tipo];
    setNewReuniao(prev => ({
      ...prev,
      tipo,
      titulo: `Alinhamento Semanal: ${config.label}`,
      departamentos_envolvidos: config.depts
    }));
  };

  const handleCreateReuniao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReuniao.titulo.trim()) {
      toast.error('Por favor informe o título da reunião');
      return;
    }

    setCreating(true);
    try {
      const participantes = newReuniao.participantesTexto
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const created = await reunioesService.createReuniao({
        titulo: newReuniao.titulo,
        tipo: newReuniao.tipo,
        data_reuniao: new Date(newReuniao.data_reuniao).toISOString(),
        duracao_minutos: Number(newReuniao.duracao_minutos) || 45,
        pauta_topicos: newReuniao.pauta_topicos,
        departamentos_envolvidos: newReuniao.departamentos_envolvidos,
        participantes: participantes,
        status: 'agendada'
      });

      toast.success('Reunião agendada com sucesso!');
      setIsModalOpen(false);
      await loadData();
      if (created?.id) {
        navigate(`/operacoes/reunioes/${created.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao agendar reunião');
    } finally {
      setCreating(false);
    }
  };

  const filteredReunioes = reunioes.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.titulo.toLowerCase().includes(term) ||
      (r.pauta_topicos || '').toLowerCase().includes(term) ||
      r.departamentos_envolvidos.some(d => d.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header com Identidade Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles size={16} />
            Metodologia WBR + Ciclo PDCA Operacional
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Reuniões & Alinhamentos Interdepartamentais
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Elimine atritos entre Comercial, RH, Logística e Financeiro. Conduza encontros orientados a dados reais, registre regras de processo e acompanhe o cumprimento das ações pactuadas no sistema.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 self-start md:self-center">
          <button
            onClick={() => {
              setNewReuniao({
                titulo: 'Alinhamento Semanal: Comercial × RH & Contratação',
                tipo: 'comercial_rh',
                data_reuniao: new Date().toISOString().slice(0, 16),
                duracao_minutos: 45,
                pauta_topicos: '1. Cobrança de ações da semana anterior\n2. Pedidos em aberto e prazos de contratação\n3. Desistências e planos de backup\n4. Pactuação de novos prazos e responsáveis',
                departamentos_envolvidos: ['Comercial', 'Recursos Humanos'],
                participantesTexto: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Agendar Novo Alinhamento
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Raio-X do Ciclo WBR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Próximo Encontro */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Próximo Encontro</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            {proximaReuniao ? (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {proximaReuniao.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Clock size={13} />
                  {new Date(proximaReuniao.data_reuniao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum encontro agendado</p>
            )}
          </div>
          {proximaReuniao && (
            <button
              onClick={() => navigate(`/operacoes/reunioes/${proximaReuniao.id}`)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Abrir Cockpit <ArrowUpRight size={14} />
            </button>
          )}
        </div>

        {/* Taxa de Cumprimento de Ações (WBR Compliance) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Taxa de Conclusão (WBR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{taxaConclusao}%</span>
              <span className="text-xs text-slate-500">das ações pactuadas</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${taxaConclusao}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {acoesConcluidas} de {totalAcoes} tarefas resolvidas
          </div>
        </div>

        {/* Ciclos Realizados */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ciclos Realizados</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{concluidas}</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {agendadas} em andamento / agendadas
            </p>
          </div>
          <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Histórico registrado no sistema
          </div>
        </div>

        {/* Regras e POPs Ativos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Estrutura PDCA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              Rito Semanal Ativo
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              4 Blocos: Check ➡️ Plan ➡️ Do ➡️ Act
            </p>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Duração padrão de 45 min
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Buscar por pauta, título ou setor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={loadData}
            title="Atualizar lista"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Tipo */}
          <select
            value={selectedTipo}
            onChange={e => setSelectedTipo(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Tipos de Alinhamento</option>
            <option value="comercial_rh">Comercial × RH & Contratação</option>
            <option value="comercial_logistica">Comercial × Logística</option>
            <option value="contratacao_financeiro">Contratação × Financeiro</option>
            <option value="logistica_financeiro">Logística × Financeiro</option>
            <option value="documentacao_rh">Documentação × RH</option>
            <option value="geral_operacoes">Geral de Operações</option>
            <option value="outro">Outro</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="agendada">Agendadas</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
          </select>
        </div>
      </div>

      {/* Lista de Reuniões */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-medium">Carregando ciclos e atas de reuniões...</p>
          </div>
        ) : filteredReunioes.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Nenhuma reunião encontrada
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Agende a primeira reunião semanal para iniciar o alinhamento entre departamentos e eliminar os gargalos operacionais.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              <Plus size={16} /> Agendar 1ª Reunião
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReunioes.map((reuniao) => {
              const tipoConfig = TIPOS_REUNIAO_MAP[reuniao.tipo] || TIPOS_REUNIAO_MAP.outro;
              const acoes = reuniao.acoes || [];
              const concluidas = acoes.filter(a => a.status === 'Concluida').length;
              const pctAcoes = acoes.length > 0 ? Math.round((concluidas / acoes.length) * 100) : 0;
              const isAoVivo = reuniao.status === 'em_andamento';

              return (
                <div
                  key={reuniao.id}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-5 md:p-6 shadow-sm hover:shadow-md ${
                    isAoVivo
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Lado Esquerdo: Identificação e Pauta */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Tag de Tipo */}
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border bg-gradient-to-r ${tipoConfig.color}`}>
                          {tipoConfig.label}
                        </span>

                        {/* Status */}
                        {reuniao.status === 'em_andamento' && (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                            EM ANDAMENTO (AO VIVO)
                          </span>
                        )}
                        {reuniao.status === 'agendada' && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Agendada
                          </span>
                        )}
                        {reuniao.status === 'concluida' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            Concluída
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {reuniao.duracao_minutos || 45} min
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {reuniao.titulo}
                        </h3>
                        {reuniao.pauta_topicos && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {reuniao.pauta_topicos}
                          </p>
                        )}
                      </div>

                      {/* Departamentos e Participantes */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Layers size={14} className="text-slate-400" />
                          <span>Setores:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {reuniao.departamentos_envolvidos.join(', ')}
                          </span>
                        </div>

                        {reuniao.participantes && reuniao.participantes.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-slate-400" />
                            <span>{reuniao.participantes.length} participantes</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Ações WBR e Botão do Cockpit */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      {/* Progresso de Tarefas Pactuadas */}
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className="flex items-center sm:justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="font-medium">
                            {concluidas} de {acoes.length} ações resolvidas
                          </span>
                        </div>
                        {acoes.length > 0 && (
                          <div className="w-36 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden ml-auto">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${pctAcoes}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Data e Botão de Ação */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(reuniao.data_reuniao).toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                          <div>
                            {new Date(reuniao.data_reuniao).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/operacoes/reunioes/${reuniao.id}`)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            reuniao.status === 'concluida'
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          {reuniao.status === 'concluida' ? (
                            <>Ver Ata & Ações <ChevronRight size={16} /></>
                          ) : (
                            <>
                              <Play size={14} className="fill-current" />
                              Abrir Cockpit da Reunião
                            </>
                          )}
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

      {/* Modal Premium de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Agendar Alinhamento Intersetorial
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina o foco entre os departamentos e a pauta para condução no rito PDCA.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReuniao} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Tipo de Reunião */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Tipo de Alinhamento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(TIPOS_REUNIAO_MAP) as TipoReuniao[]).map((tipoKey) => {
                    const cfg = TIPOS_REUNIAO_MAP[tipoKey];
                    const isSelected = newReuniao.tipo === tipoKey;
                    return (
                      <button
                        key={tipoKey}
                        type="button"
                        onClick={() => handleTipoChange(tipoKey)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-semibold">{cfg.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{cfg.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título da Reunião */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Título da Reunião
                </label>
                <input
                  type="text"
                  required
                  value={newReuniao.titulo}
                  onChange={e => setNewReuniao({ ...newReuniao, titulo: e.target.value })}
                  placeholder="Ex: Alinhamento Semanal: Comercial × RH"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data, Hora e Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Data e Hora do Encontro
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newReuniao.data_reuniao}
                    onChange={e => setNewReuniao({ ...newReuniao, data_reuniao: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Duração Planejada
                  </label>
                  <select
                    value={newReuniao.duracao_minutos}
                    onChange={e => setNewReuniao({ ...newReuniao, duracao_minutos: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutos (Express)</option>
                    <option value={45}>45 minutos (Padrão WBR)</option>
                    <option value={60}>60 minutos (Completa)</option>
                    <option value={90}>90 minutos (Planejamento Estratégico)</option>
                  </select>
                </div>
              </div>

              {/* Participantes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Participantes (Nomes ou E-mails separados por vírgula)
                </label>
                <input
                  type="text"
                  value={newReuniao.participantesTexto}
                  onChange={e => setNewReuniao({ ...newReuniao, participantesTexto: e.target.value })}
                  placeholder="ex: valter@mcspersonal.com, rh@mcspersonal.com, logistica@mcspersonal.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pauta Preliminar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Pauta & Tópicos de Discussão
                </label>
                <textarea
                  rows={4}
                  value={newReuniao.pauta_topicos}
                  onChange={e => setNewReuniao({ ...newReuniao, pauta_topicos: e.target.value })}
                  placeholder="Liste os pontos críticos a serem debatidos..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Confirmar e Abrir Reunião
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
