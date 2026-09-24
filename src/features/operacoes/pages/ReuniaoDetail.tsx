import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, Calendar, Users, AlertTriangle,
  Play, Pause, RotateCcw, Sparkles, Send, Plus, Trash2, Check,
  ChevronRight, Save, Layers, Share2, FileText, Bot, ExternalLink,
  ShieldCheck, RefreshCw, CheckSquare, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { reunioesService } from '../services/reunioesService';
import { listDepartments } from '../services/incidencias';
import { supabase } from '../services/supabaseClient';
import type { Reuniao, ReuniaoAcao } from '../types/reunioes';
import { TIPOS_REUNIAO_MAP } from '../types/reunioes';

export const ReuniaoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados principais
  const [reuniao, setReuniao] = useState<Reuniao | null>(null);
  const [reuniaoAnterior, setReuniaoAnterior] = useState<Reuniao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // Dados operacionais da semana (Bloco Plan/Data)
  const [dadosSemana, setDadosSemana] = useState<{
    pedidosRecentes: any[];
    incidenciasRecentes: any[];
    totalPedidosAtivos: number;
    totalIncidenciasAbertas: number;
  }>({
    pedidosRecentes: [],
    incidenciasRecentes: [],
    totalPedidosAtivos: 0,
    totalIncidenciasAbertas: 0
  });

  // Etapa ativa do Ciclo PDCA no Cockpit
  const [activeStep, setActiveStep] = useState<'check' | 'plan' | 'do' | 'act'>('check');

  // Timer da Reunião
  const [timerSeconds, setTimerSeconds] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Form de Ata e Anotações
  const [ataTexto, setAtaTexto] = useState('');
  const [decisoesRegras, setDecisoesRegras] = useState('');
  const [transcricaoInput, setTranscricaoInput] = useState('');
  const [iaLoading, setIaLoading] = useState(false);

  // Nova Ação (Passo ACT)
  const [novaAcao, setNovaAcao] = useState({
    title: '',
    department_id: '',
    assigned_to_email: '',
    due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'urgente'
  });

  // Próxima Reunião
  const [proximaData, setProximaData] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  // Carregar Dados
  const loadReuniao = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await reunioesService.getReuniaoById(id);
      if (!data) {
        toast.error('Reunião não encontrada');
        navigate('/operacoes/reunioes');
        return;
      }

      setReuniao(data);
      setAtaTexto(data.ata_conteudo || '');
      setDecisoesRegras(data.decisoes_regras || '');
      setTimerSeconds((data.duracao_minutos || 45) * 60);

      // Buscar reunião anterior do mesmo tipo para o bloco 1 (CHECK)
      const anterior = await reunioesService.getReuniaoAnterior(data.tipo, data.id);
      setReuniaoAnterior(anterior);

      // Buscar dados da semana para o bloco 2 (PLAN)
      const opData = await reunioesService.getDadosOperacionaisSemana();
      setDadosSemana(opData);

      // Buscar departamentos e usuários do sistema
      const [depts, { data: usersData }] = await Promise.all([
        listDepartments().catch(() => []),
        supabase.from('mcs_users').select('id, email, full_name, department_id').limit(100)
      ]);
      setDepartments(depts);
      setSystemUsers(usersData || []);

      if (data.departamentos_envolvidos && data.departamentos_envolvidos.length > 0) {
        setNovaAcao(prev => ({ ...prev, department_id: data.departamentos_envolvidos[0] }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar detalhes da reunião');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReuniao();
  }, [id]);

  // Controle do Timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Salvar Ata / Regras
  const handleSaveAta = async () => {
    if (!reuniao) return;
    setSaving(true);
    try {
      await reunioesService.updateReuniao(reuniao.id, {
        ata_conteudo: ataTexto,
        decisoes_regras: decisoesRegras
      });
      toast.success('Ata e Regras salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar ata');
    } finally {
      setSaving(false);
    }
  };

  // Alternar Status de Ação (Concluir / Reabrir)
  const handleToggleAcao = async (acao: ReuniaoAcao) => {
    const novoStatus = acao.status === 'Concluida' ? 'Pendente' : 'Concluida';
    try {
      await reunioesService.updateStatusAcao(acao.id, novoStatus);
      toast.success(novoStatus === 'Concluida' ? 'Ação marcada como concluída!' : 'Ação reaberta');
      loadReuniao();
    } catch (err) {
      toast.error('Falha ao atualizar status da ação');
    }
  };

  // Adicionar Nova Ação vinculada a Minhas Tarefas
  const handleAddAcao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuniao || !novaAcao.title.trim()) return;

    try {
      await reunioesService.addAcao(reuniao.id, {
        title: novaAcao.title,
        department_id: novaAcao.department_id || reuniao.departamentos_envolvidos[0],
        assigned_to_email: novaAcao.assigned_to_email || undefined,
        due_at: new Date(novaAcao.due_at).toISOString(),
        priority: novaAcao.priority
      });

      toast.success('Ação registrada! Ela já está visível em Minhas Tarefas do responsável.');
      setNovaAcao(prev => ({ ...prev, title: '' }));
      loadReuniao();
    } catch (err) {
      toast.error('Erro ao registrar ação');
    }
  };

  // Excluir Ação
  const handleDeleteAcao = async (acaoId: string) => {
    if (!confirm('Deseja excluir esta ação?')) return;
    try {
      await reunioesService.deleteAcao(acaoId);
      toast.success('Ação excluída');
      loadReuniao();
    } catch (err) {
      toast.error('Erro ao excluir ação');
    }
  };

  // Processar Transcrição com IA
  const handleProcessarIA = async () => {
    if (!transcricaoInput.trim() || !reuniao) {
      toast.error('Cole notas ou a transcrição da reunião antes de sintetizar');
      return;
    }

    setIaLoading(true);
    try {
      const resultado = await reunioesService.sintetizarComIA(transcricaoInput, {
        tipo: reuniao.tipo,
        departamentos: reuniao.departamentos_envolvidos
      });

      // Anexar resumo executivo e gargalos à ata
      const novaAtaFormatada = `${ataTexto ? ataTexto + '\n\n' : ''}### Resumo Executivo (Sintetizado com IA)\n${resultado.resumo_executivo}\n\n**Gargalos Operacionais Identificados:**\n${resultado.gargalos_identificados.map(g => `- ${g}`).join('\n')}`;
      setAtaTexto(novaAtaFormatada);

      // Anexar regras decididas
      const novasRegrasFormatadas = `${decisoesRegras ? decisoesRegras + '\n\n' : ''}**Regras de Ouro Aprovadas:**\n${resultado.regras_definidas.map(r => `✅ ${r}`).join('\n')}`;
      setDecisoesRegras(novasRegrasFormatadas);

      // Criar automaticamente as ações sugeridas no banco
      for (const acaoSug of resultado.acoes_sugeridas) {
        await reunioesService.addAcao(reuniao.id, {
          title: acaoSug.title,
          department_id: acaoSug.department_id,
          priority: acaoSug.priority,
          due_at: new Date(Date.now() + acaoSug.due_days * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Salvar ata atualizada
      await reunioesService.updateReuniao(reuniao.id, {
        ata_conteudo: novaAtaFormatada,
        decisoes_regras: novasRegrasFormatadas,
        resumo_ia: resultado.resumo_executivo
      });

      toast.success(`IA processou a reunião! ${resultado.acoes_sugeridas.length} ações adicionadas à matriz.`);
      setTranscricaoInput('');
      loadReuniao();
      setActiveStep('act');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar com IA');
    } finally {
      setIaLoading(false);
    }
  };

  // Concluir Reunião e Agendar Próxima (ou Concluir Pontual)
  const handleConcluirReuniao = async () => {
    if (!reuniao) return;

    const isRecorrente = reuniao.recorrente !== false;
    const msgConfirm = isRecorrente
      ? 'Deseja finalizar esta reunião e agendar o próximo alinhamento semanal?'
      : 'Deseja finalizar esta reunião pontual?';

    if (!confirm(msgConfirm)) return;

    try {
      let proximaId: string | undefined = undefined;

      // 1. Criar próxima reunião apenas se for recorrente
      if (isRecorrente) {
        const proxima = await reunioesService.createReuniao({
          titulo: `Alinhamento Semanal: ${TIPOS_REUNIAO_MAP[reuniao.tipo]?.label || reuniao.titulo}`,
          tipo: reuniao.tipo,
          data_reuniao: new Date(proximaData).toISOString(),
          duracao_minutos: reuniao.duracao_minutos || 45,
          recorrente: true,
          departamentos_envolvidos: reuniao.departamentos_envolvidos,
          participantes: reuniao.participantes,
          status: 'agendada'
        });
        proximaId = proxima?.id;
      }

      // 2. Atualizar reunião atual para concluída
      await reunioesService.updateReuniao(reuniao.id, {
        status: 'concluida',
        ata_conteudo: ataTexto,
        decisoes_regras: decisoesRegras,
        proxima_reuniao_id: proximaId,
        proxima_reuniao_data: isRecorrente ? new Date(proximaData).toISOString() : undefined
      });

      toast.success(isRecorrente ? 'Reunião concluída e próximo alinhamento agendado!' : 'Reunião concluída com sucesso!');
      navigate('/operacoes/reunioes');
    } catch (err) {
      toast.error('Erro ao finalizar reunião');
    }
  };

  if (loading || !reuniao) {
    return (
      <div className="py-32 text-center text-slate-400">
        <RefreshCw size={36} className="animate-spin mx-auto mb-3 text-blue-500" />
        <p className="text-sm font-semibold">Carregando Cockpit da Reunião...</p>
      </div>
    );
  }

  const tipoConfig = TIPOS_REUNIAO_MAP[reuniao.tipo] || TIPOS_REUNIAO_MAP.outro;
  const acoesAtuais = reuniao.acoes || [];
  const acoesAnteriores = reuniaoAnterior?.acoes || [];

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
      {/* Top Bar de Navegação & Ações Rápidas */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/operacoes/reunioes')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para Painel de Reuniões
        </button>

        <div className="flex items-center gap-3">
          {/* Timer da Reunião (Projeção) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs shadow-md border border-slate-700">
            <Clock size={14} className="text-blue-400" />
            <span className="font-bold text-sm tracking-wider">{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 hover:text-blue-400 transition-colors"
              title={isTimerRunning ? 'Pausar' : 'Iniciar'}
            >
              {isTimerRunning ? <Pause size={13} /> : <Play size={13} className="fill-current" />}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds((reuniao.duracao_minutos || 45) * 60);
              }}
              className="p-1 hover:text-blue-400 transition-colors"
              title="Resetar"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            onClick={handleSaveAta}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all"
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          {reuniao.status !== 'concluida' && (
            <button
              onClick={handleConcluirReuniao}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 size={15} /> Concluir & Agendar Próxima
            </button>
          )}
        </div>
      </div>

      {/* Header Executivo do Cockpit (Ideal para Projeção na Sala/Meet) */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border bg-gradient-to-r ${tipoConfig.color}`}>
                {tipoConfig.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                Ciclo WBR #{reuniao.id.slice(0, 6)}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(reuniao.data_reuniao).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {reuniao.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Layers size={15} className="text-blue-400" />
                <span className="font-semibold text-white">Setores:</span>{' '}
                {reuniao.departamentos_envolvidos.join(' • ')}
              </div>
              {reuniao.participantes && reuniao.participantes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users size={15} className="text-blue-400" />
                  <span className="font-semibold text-white">Presentes:</span>{' '}
                  {reuniao.participantes.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Card de Progresso do Rito */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60 min-w-[240px]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Status das Ações Deste Encontro
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {acoesAtuais.filter(a => a.status === 'Concluida').length} / {acoesAtuais.length}
              </span>
              <span className="text-xs text-slate-400">resolvidas</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${acoesAtuais.length > 0 ? (acoesAtuais.filter(a => a.status === 'Concluida').length / acoesAtuais.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stepper PDCA Interativo (A Condução da Reunião) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Bloco 1: CHECK */}
        <button
          onClick={() => setActiveStep('check')}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
            activeStep === 'check'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            activeStep === 'check' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
          }`}>
            1
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Passo 1: CHECK</div>
            <div className="text-xs opacity-80 truncate">Cobrança da Semana Anterior</div>
          </div>
        </button>

        {/* Bloco 2: PLAN */}
        <button
          onClick={() => setActiveStep('plan')}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
            activeStep === 'plan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            activeStep === 'plan' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
          }`}>
            2
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Passo 2: PLAN</div>
            <div className="text-xs opacity-80 truncate">Raio-X dos Pedidos & Falhas</div>
          </div>
        </button>

        {/* Bloco 3: DO */}
        <button
          onClick={() => setActiveStep('do')}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
            activeStep === 'do'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            activeStep === 'do' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
          }`}>
            3
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Passo 3: DO</div>
            <div className="text-xs opacity-80 truncate">Ata & Assistente IA</div>
          </div>
        </button>

        {/* Bloco 4: ACT */}
        <button
          onClick={() => setActiveStep('act')}
          className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
            activeStep === 'act'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            activeStep === 'act' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
          }`}>
            4
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Passo 4: ACT</div>
            <div className="text-xs opacity-80 truncate">Matriz 5W2H (Minhas Tarefas)</div>
          </div>
        </button>
      </div>

      {/* CONTEÚDO DE CADA ETAPA DO COCKPIT */}

      {/* ETAPA 1: CHECK (Cobrança da Reunião Anterior) */}
      {activeStep === 'check' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare size={20} className="text-blue-600" />
                  WBR Check: Cobrança dos Compromissos da Semana Passada
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A reunião inicia conferindo o cumprimento das pendências pactuadas no encontro anterior.
                </p>
              </div>

              {reuniaoAnterior && (
                <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                  Ref: Reunião de {new Date(reuniaoAnterior.data_reuniao).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {acoesAnteriores.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nenhuma pendência anterior em aberto!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Esta é a primeira reunião deste tipo ou todas as tarefas do ciclo anterior foram entregues.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {acoesAnteriores.map((acao) => (
                  <div
                    key={acao.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      acao.status === 'Concluida'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAcao(acao)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          acao.status === 'Concluida'
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {acao.status === 'Concluida' && <Check size={14} />}
                      </button>
                      <div>
                        <p className={`text-sm font-semibold ${
                          acao.status === 'Concluida'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {acao.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {acao.department_id && (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Setor: {acao.department_id}
                            </span>
                          )}
                          {acao.assigned_to_email && (
                            <span>Resp: {acao.assigned_to_email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      acao.status === 'Concluida'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    }`}>
                      {acao.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setActiveStep('plan')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20"
              >
                Avançar para Raio-X dos Pedidos (Passo 2) <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 2: PLAN (Raio-X de Dados Operacionais e Falhas) */}
      {activeStep === 'plan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pedidos em Andamento */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={18} className="text-blue-500" />
                    Pedidos em Curso (Últimos 15 dias)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Análise dos prazos pactuados com o cliente vs capacidade de entrega.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  {dadosSemana.totalPedidosAtivos} ativos
                </span>
              </div>

              {dadosSemana.pedidosRecentes.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum pedido recente no período</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {dadosSemana.pedidosRecentes.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          Pedido #{pedido.codigo || pedido.id.slice(0, 8)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          Início: {pedido.fecha_inicio_pedido ? new Date(pedido.fecha_inicio_pedido).toLocaleDateString('pt-BR') : 'Não definida'} • {pedido.cantidad_personal || 0} trabalhadores
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                        {pedido.estado || 'Em aberto'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Falhas / Incidências Recentes */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Ocorrências & Incidências Operacionais
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gargalos reais: desistências, problemas de alojamento ou transporte.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  {dadosSemana.totalIncidenciasAbertas} pendentes
                </span>
              </div>

              {dadosSemana.incidenciasRecentes.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma incidência aberta no período</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {dadosSemana.incidenciasRecentes.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {inc.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {inc.client_name ? `Cliente: ${inc.client_name} • ` : ''}
                          Registrado em: {new Date(inc.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded font-medium ${
                        inc.severity === 'alta' || inc.severity === 'critica'
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {inc.severity || 'Normal'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStep('check')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              Voltar para Passo 1
            </button>
            <button
              onClick={() => setActiveStep('do')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20"
            >
              Avançar para Ata & Discussão com IA (Passo 3) <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: DO (Ata Viva & Copilot de IA) */}
      {activeStep === 'do' && (
        <div className="space-y-6">
          {/* Assistente de IA / Transcrição */}
          <div className="p-6 bg-gradient-to-br from-indigo-900/20 via-blue-900/10 to-slate-900/30 rounded-2xl border border-blue-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <Sparkles size={18} />
                Copilot de Reunião: Transcrição & Síntese PDCA
              </div>
              <span className="text-[11px] text-slate-400">
                Compatível com Google Meet / Teams / Áudio
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cole aqui a transcrição gerada pelo Meet/Teams ou suas anotações livres da conversa. A IA extrairá os atritos entre os setores, redigirá a ata e sugerirá tarefas com responsáveis automaticamente.
            </p>

            <textarea
              rows={4}
              value={transcricaoInput}
              onChange={e => setTranscricaoInput(e.target.value)}
              placeholder="Cole a transcrição ou anotações livres aqui... Ex: 'O comercial reclamou que o prazo de 3 dias para fechar 10 soldadores foi descumprido. O RH explicou que 4 desistiram no dia do embarque e faltou alojamento reservado pela logística...'"
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end">
              <button
                onClick={handleProcessarIA}
                disabled={iaLoading || !transcricaoInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {iaLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Sintetizando Ata com IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Sintetizar com IA e Gerar Ações
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ata & Regras Pactuadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  Ata da Reunião & Discussão dos Casos
                </label>
              </div>
              <textarea
                rows={10}
                value={ataTexto}
                onChange={e => setAtaTexto(e.target.value)}
                placeholder="Registro das decisões, pontos abordados e justificativas operacionais..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Regras de Ouro & Novos Processos Pactuados
                </label>
              </div>
              <textarea
                rows={10}
                value={decisoesRegras}
                onChange={e => setDecisoesRegras(e.target.value)}
                placeholder="Ex: Comercial só confirma pedido com antecedência mínima de 48h úteis; RH deve manter backup de 20% para vagas de alta rotatividade..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStep('plan')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              Voltar para Passo 2
            </button>
            <button
              onClick={() => setActiveStep('act')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20"
            >
              Avançar para Matriz 5W2H (Passo 4) <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: ACT (Matriz 5W2H - Ações que caem no Minhas Tarefas) */}
      {activeStep === 'act' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                Matriz de Ações 5W2H (Integração Direta com Minhas Tarefas)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Toda ação cadastrada aqui é enviada diretamente para a tela de tarefas do colaborador e do setor.
              </p>
            </div>

            {/* Formulário Rápido de Adição de Ação */}
            <form onSubmit={handleAddAcao} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                Pactuar Novo Compromisso / Tarefa
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="O quê fazer (Ação clara)..."
                    value={novaAcao.title}
                    onChange={e => setNovaAcao({ ...novaAcao, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    value={novaAcao.department_id}
                    onChange={e => setNovaAcao({ ...novaAcao, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Setor Responsável</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    {reuniao.departamentos_envolvidos.map((d: string) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={novaAcao.assigned_to_email}
                    onChange={e => setNovaAcao({ ...novaAcao, assigned_to_email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Dono Único (Email)</option>
                    {systemUsers.map((u: any) => (
                      <option key={u.id} value={u.email}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <input
                    type="date"
                    required
                    value={novaAcao.due_at}
                    onChange={e => setNovaAcao({ ...novaAcao, due_at: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full h-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de Ações Pactuadas */}
            <div className="space-y-2.5">
              {acoesAtuais.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma ação registrada ainda para esta reunião. Use o formulário acima ou gere com a IA.
                </p>
              ) : (
                acoesAtuais.map((acao) => (
                  <div
                    key={acao.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAcao(acao)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          acao.status === 'Concluida'
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {acao.status === 'Concluida' && <Check size={12} />}
                      </button>

                      <div>
                        <span className={`font-semibold ${
                          acao.status === 'Concluida' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {acao.title}
                        </span>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-0.5">
                          {acao.department_id && <span>Setor: <b>{acao.department_id}</b></span>}
                          {acao.assigned_to_email && <span>Dono: <b>{acao.assigned_to_email}</b></span>}
                          {acao.due_at && (
                            <span>Prazo: {new Date(acao.due_at).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        acao.status === 'Concluida'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {acao.status}
                      </span>
                      <button
                        onClick={() => handleDeleteAcao(acao.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Excluir ação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Agendamento da Próxima Reunião / Conclusão */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    {reuniao.recorrente !== false
                      ? 'Fechar Ciclo & Agendar Próximo Alinhamento Semanal'
                      : 'Finalizar Encontro Pontual'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {reuniao.recorrente !== false
                      ? 'O rito WBR exige que a próxima reunião já saia com data e hora marcada para manter a continuidade.'
                      : 'Esta reunião foi configurada como pontual. Ao concluir, as ações pactuadas continuam ativas no sistema.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {reuniao.recorrente !== false && (
                  <input
                    type="datetime-local"
                    value={proximaData}
                    onChange={e => setProximaData(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                )}

                <button
                  onClick={handleConcluirReuniao}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02]"
                >
                  <CheckCircle2 size={15} />
                  {reuniao.recorrente !== false
                    ? 'Finalizar Reunião & Salvar Próxima'
                    : 'Concluir Reunião Pontual'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
