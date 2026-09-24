import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, Calendar, Users, AlertTriangle,
  Play, Pause, RotateCcw, Sparkles, Send, Plus, Trash2, Check,
  ChevronRight, Save, Layers, Share2, FileText, Bot, ExternalLink,
  ShieldCheck, RefreshCw, CheckSquare, AlertCircle, ChevronDown,
  ChevronUp, Edit3, ListOrdered, Video, MapPin, Globe, Briefcase,
  Building2, UserCheck, FolderKanban, Search, Tag, X, Sparkle,
  Link2, PlusCircle, CheckCheck, Lightbulb, Package, MessageSquareText,
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { reunioesService } from '../services/reunioesService';
import { listDepartments } from '../services/incidencias';
import { supabase } from '../services/supabaseClient';
import { VisualWysiwygEditor } from '../components/ui/VisualWysiwygEditor';
import type { Reuniao, ReuniaoAcao, TopicoLivreContexto } from '../types/reunioes';
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

  // Pauta Oficial do Encontro
  const [pautaConteudo, setPautaConteudo] = useState('');
  const [pautaEditando, setPautaEditando] = useState(false);
  const [isPautaExpanded, setIsPautaExpanded] = useState(true);

  // Dados operacionais da semana (Bloco PLAN - Contexto & Evidências)
  const [dadosSemana, setDadosSemana] = useState<{
    pedidosRecentes: any[];
    incidenciasRecentes: any[];
    trabalhadoresRecentes: any[];
    clientesRecentes: any[];
    totalPedidosAtivos: number;
    totalIncidenciasAbertas: number;
  }>({
    pedidosRecentes: [],
    incidenciasRecentes: [],
    trabalhadoresRecentes: [],
    clientesRecentes: [],
    totalPedidosAtivos: 0,
    totalIncidenciasAbertas: 0
  });

  // Contexto Operacional Vinculado no PLAN (Passo 2)
  const [pedidosSelecionados, setPedidosSelecionados] = useState<string[]>([]);
  const [incidenciasSelecionadas, setIncidenciasSelecionadas] = useState<string[]>([]);
  const [trabalhadoresSelecionados, setTrabalhadoresSelecionados] = useState<string[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [topicosLivres, setTopicosLivres] = useState<TopicoLivreContexto[]>([]);

  // Aba ativa e busca no PLAN
  const [planTab, setPlanTab] = useState<'topicos' | 'pedidos' | 'trabalhadores' | 'incidencias' | 'clientes'>('topicos');
  const [searchTermPlan, setSearchTermPlan] = useState('');

  // Formulário de Novo Tópico Livre (Sistemas, Novos Negócios, Funcionalidades)
  const [novoTopicoTitulo, setNovoTopicoTitulo] = useState('');
  const [novoTopicoCategoria, setNovoTopicoCategoria] = useState<'sistemas' | 'projeto' | 'processos' | 'comercial' | 'outro'>('sistemas');
  const [novoTopicoDescricao, setNovoTopicoDescricao] = useState('');

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
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    contexto_ref: ''
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
      setPautaConteudo(data.pauta_topicos || '');
      setTimerSeconds((data.duracao_minutos || 45) * 60);

      // Contexto Operacional Vinculado no PLAN
      setPedidosSelecionados(data.pedidos_contexto || []);
      setIncidenciasSelecionadas(data.incidencias_contexto || []);
      setTrabalhadoresSelecionados(data.trabalhadores_contexto || []);
      setClientesSelecionados(data.clientes_contexto || []);
      setTopicosLivres(data.topicos_livres || []);

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

  // Salvar Ata / Regras / Pauta Geral
  const handleSaveAta = async () => {
    if (!reuniao) return;
    setSaving(true);
    try {
      await reunioesService.updateReuniao(reuniao.id, {
        ata_conteudo: ataTexto,
        decisoes_regras: decisoesRegras,
        pauta_topicos: pautaConteudo
      });
      setReuniao(prev => prev ? {
        ...prev,
        ata_conteudo: ataTexto,
        decisoes_regras: decisoesRegras,
        pauta_topicos: pautaConteudo
      } : null);
      toast.success('Ata, Regras e Pauta salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar ata');
    } finally {
      setSaving(false);
    }
  };

  // Salvar Pauta Específica (ao editar o card de Pauta)
  const handleSavePauta = async () => {
    if (!reuniao) return;
    setSaving(true);
    try {
      await reunioesService.updateReuniao(reuniao.id, {
        pauta_topicos: pautaConteudo
      });
      setReuniao(prev => prev ? { ...prev, pauta_topicos: pautaConteudo } : null);
      setPautaEditando(false);
      toast.success('Pauta da reunião atualizada com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar pauta');
    } finally {
      setSaving(false);
    }
  };

  // Renderizador de Pauta HTML (com fallback amigável a markdown)
  const renderPautaHtml = (pauta?: string) => {
    if (!pauta || !pauta.trim()) {
      return (
        <p className="text-xs text-slate-400 italic py-2">
          Nenhuma pauta detalhada foi cadastrada previamente para este alinhamento.
        </p>
      );
    }

    if (
      pauta.includes('<p>') ||
      pauta.includes('<h3>') ||
      pauta.includes('<h2>') ||
      pauta.includes('<ul>') ||
      pauta.includes('<strong>') ||
      pauta.includes('<br>') ||
      pauta.includes('<div>') ||
      pauta.includes('<span')
    ) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-sans [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-slate-900 dark:[&>h3]:text-white [&>h3]:mt-3 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:ml-5 [&>ol]:space-y-1 [&>p]:mb-2"
          dangerouslySetInnerHTML={{ __html: pauta }}
        />
      );
    }

    // Markdown / plain text fallback
    const htmlConverted = pauta
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc my-1">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc my-1">$1</li>')
      .replace(/^(\d+)[\.\)]\s+(.*$)/gim, '<div class="my-2 p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 shadow-xs"><strong class="text-emerald-600 dark:text-emerald-400 font-bold mr-2 text-sm">$1.</strong> $2</div>')
      .replace(/\n/g, '<br />');

    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-sans"
        dangerouslySetInnerHTML={{ __html: htmlConverted }}
      />
    );
  };

  // --- GESTÃO DE CONTEXTO E TÓPICOS LIVRES (PASSO 2 - PLAN) ---

  // Alternar seleção de caso operacional no PLAN
  const handleToggleContexto = async (
    tipo: 'pedidos' | 'incidencias' | 'trabalhadores' | 'clientes',
    identifier: string
  ) => {
    if (!reuniao) return;

    let updatedPedidos = [...pedidosSelecionados];
    let updatedIncidencias = [...incidenciasSelecionadas];
    let updatedTrabalhadores = [...trabalhadoresSelecionados];
    let updatedClientes = [...clientesSelecionados];

    if (tipo === 'pedidos') {
      updatedPedidos = updatedPedidos.includes(identifier)
        ? updatedPedidos.filter(id => id !== identifier)
        : [...updatedPedidos, identifier];
      setPedidosSelecionados(updatedPedidos);
    } else if (tipo === 'incidencias') {
      updatedIncidencias = updatedIncidencias.includes(identifier)
        ? updatedIncidencias.filter(id => id !== identifier)
        : [...updatedIncidencias, identifier];
      setIncidenciasSelecionadas(updatedIncidencias);
    } else if (tipo === 'trabalhadores') {
      updatedTrabalhadores = updatedTrabalhadores.includes(identifier)
        ? updatedTrabalhadores.filter(id => id !== identifier)
        : [...updatedTrabalhadores, identifier];
      setTrabalhadoresSelecionados(updatedTrabalhadores);
    } else if (tipo === 'clientes') {
      updatedClientes = updatedClientes.includes(identifier)
        ? updatedClientes.filter(id => id !== identifier)
        : [...updatedClientes, identifier];
      setClientesSelecionados(updatedClientes);
    }

    try {
      await reunioesService.updateReuniao(reuniao.id, {
        pedidos_contexto: updatedPedidos,
        incidencias_contexto: updatedIncidencias,
        trabalhadores_contexto: updatedTrabalhadores,
        clientes_contexto: updatedClientes
      });
      setReuniao(prev => prev ? {
        ...prev,
        pedidos_contexto: updatedPedidos,
        incidencias_contexto: updatedIncidencias,
        trabalhadores_contexto: updatedTrabalhadores,
        clientes_contexto: updatedClientes
      } : null);
      toast.success('Dossiê do PLAN atualizado!');
    } catch (err) {
      toast.error('Erro ao salvar item no contexto da reunião');
    }
  };

  // Adicionar Tópico Livre / Sistemas / Projetos (Passo 2 - PLAN)
  const handleAdicionarTopicoLivre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTopicoTitulo.trim() || !reuniao) {
      toast.error('Informe o título do tópico ou funcionalidade');
      return;
    }

    const novo: TopicoLivreContexto = {
      id: crypto.randomUUID(),
      titulo: novoTopicoTitulo.trim(),
      categoria: novoTopicoCategoria,
      descricao: novoTopicoDescricao.trim(),
      criado_em: new Date().toISOString()
    };

    const updated = [...topicosLivres, novo];
    setTopicosLivres(updated);
    setNovoTopicoTitulo('');
    setNovoTopicoDescricao('');

    try {
      await reunioesService.updateReuniao(reuniao.id, { topicos_livres: updated });
      setReuniao(prev => prev ? { ...prev, topicos_livres: updated } : null);
      toast.success('Tópico registrado no PLAN!');
    } catch (err) {
      toast.error('Erro ao salvar tópico no PLAN');
    }
  };

  // Remover Tópico Livre
  const handleRemoverTopicoLivre = async (topicoId: string) => {
    if (!reuniao) return;
    const updated = topicosLivres.filter(t => t.id !== topicoId);
    setTopicosLivres(updated);

    try {
      await reunioesService.updateReuniao(reuniao.id, { topicos_livres: updated });
      setReuniao(prev => prev ? { ...prev, topicos_livres: updated } : null);
      toast.success('Tópico removido');
    } catch (err) {
      toast.error('Erro ao remover tópico');
    }
  };

  // Inserir Contexto do PLAN na Ata (Passo 3 - DO)
  const handleInserirContextoNaAta = () => {
    const linhas: string[] = [];

    if (topicosLivres.length > 0) {
      linhas.push('💡 **Tópicos de Sistemas & Projetos em Pauta:**');
      topicosLivres.forEach(t => {
        linhas.push(`- [${t.categoria.toUpperCase()}] **${t.titulo}**${t.descricao ? `: ${t.descricao}` : ''}`);
      });
    }

    if (pedidosSelecionados.length > 0) {
      linhas.push('\n📦 **Pedidos em Análise:**');
      pedidosSelecionados.forEach(pId => {
        const p = dadosSemana.pedidosRecentes.find(x => x.id === pId || x.codigo === pId);
        linhas.push(`- Pedido #${p?.codigo || pId}: ${p?.cantidad_personal || 0} trabalhadores • Início: ${p?.fecha_inicio_pedido ? new Date(p.fecha_inicio_pedido).toLocaleDateString('pt-BR') : 'A definir'}`);
      });
    }

    if (trabalhadoresSelecionados.length > 0) {
      linhas.push('\n👥 **Trabalhadores / Casos de RH em Pauta:**');
      trabalhadoresSelecionados.forEach(wId => {
        const w = dadosSemana.trabalhadoresRecentes.find(x => x.id === wId || x.nome === wId);
        linhas.push(`- ${w?.nome || wId} (${w?.funcion || 'Geral'} • Status: ${w?.status_trabajador || 'Ativo'})`);
      });
    }

    if (incidenciasSelecionadas.length > 0) {
      linhas.push('\n⚠️ **Ocorrências & Falhas Discutidas:**');
      incidenciasSelecionadas.forEach(iId => {
        const i = dadosSemana.incidenciasRecentes.find(x => x.id === iId || x.title === iId);
        linhas.push(`- ${i?.title || iId} (Severidade: ${i?.severity || 'Normal'})`);
      });
    }

    if (clientesSelecionados.length > 0) {
      linhas.push('\n🏢 **Clientes / Obras em Questão:**');
      clientesSelecionados.forEach(cId => {
        const c = dadosSemana.clientesRecentes.find(x => x.id === cId || x.trade_name === cId);
        linhas.push(`- ${c?.trade_name || cId}`);
      });
    }

    if (linhas.length === 0) {
      toast.info('Nenhum caso ou tópico foi vinculado no Passo 2 (PLAN) ainda.');
      return;
    }

    const blocoContexto = `\n\n--- 📌 CONTEXTO & CASOS DISCUTIDOS (PLAN) ---\n${linhas.join('\n')}\n----------------------------------------------\n`;
    setAtaTexto(prev => (prev ? prev + blocoContexto : blocoContexto.trim()));
    toast.success('Contexto do PLAN inserido na Ata!');
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

    let tituloFinal = novaAcao.title;
    if (novaAcao.contexto_ref) {
      tituloFinal = `[${novaAcao.contexto_ref}] ${novaAcao.title}`;
    }

    try {
      await reunioesService.addAcao(reuniao.id, {
        title: tituloFinal,
        department_id: novaAcao.department_id || reuniao.departamentos_envolvidos[0],
        assigned_to_email: novaAcao.assigned_to_email || undefined,
        due_at: new Date(novaAcao.due_at).toISOString(),
        priority: novaAcao.priority
      });

      toast.success('Ação registrada! Ela já está visível em Minhas Tarefas do responsável.');
      setNovaAcao(prev => ({ ...prev, title: '', contexto_ref: '' }));
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
    if (!transcricaoInput.trim() && topicosLivres.length === 0 && pedidosSelecionados.length === 0) {
      toast.error('Cole notas, transcrição ou selecione tópicos/pedidos no PLAN antes de sintetizar');
      return;
    }

    setIaLoading(true);
    try {
      // Montar contexto completo para a IA
      let contextoCompleto = transcricaoInput || '';
      const partesContexto: string[] = [];

      if (topicosLivres.length > 0) {
        partesContexto.push(`Tópicos e Sistemas: ${topicosLivres.map(t => `[${t.categoria}] ${t.titulo}: ${t.descricao}`).join('; ')}`);
      }
      if (pedidosSelecionados.length > 0) {
        partesContexto.push(`Pedidos vinculados: ${pedidosSelecionados.join(', ')}`);
      }
      if (trabalhadoresSelecionados.length > 0) {
        partesContexto.push(`Trabalhadores vinculados: ${trabalhadoresSelecionados.join(', ')}`);
      }
      if (incidenciasSelecionadas.length > 0) {
        partesContexto.push(`Falhas/Incidências vinculadas: ${incidenciasSelecionadas.join(', ')}`);
      }
      if (clientesSelecionados.length > 0) {
        partesContexto.push(`Clientes vinculados: ${clientesSelecionados.join(', ')}`);
      }

      if (partesContexto.length > 0) {
        contextoCompleto = `${contextoCompleto}\n\n[CONTEXTO & CASOS SELECIONADOS NO PLAN]:\n${partesContexto.join('\n')}`;
      }

      const resultado = await reunioesService.sintetizarComIA(contextoCompleto, {
        tipo: reuniao!.tipo,
        departamentos: reuniao!.departamentos_envolvidos
      });

      // Anexar resumo executivo e gargalos à ata
      const novaAtaFormatada = `${ataTexto ? ataTexto + '\n\n' : ''}### Resumo Executivo (Sintetizado com IA)\n${resultado.resumo_executivo}\n\n**Gargalos Operacionais Identificados:**\n${resultado.gargalos_identificados.map(g => `- ${g}`).join('\n')}`;
      setAtaTexto(novaAtaFormatada);

      // Anexar regras decididas
      const novasRegrasFormatadas = `${decisoesRegras ? decisoesRegras + '\n\n' : ''}**Regras de Ouro Aprovadas:**\n${resultado.regras_definidas.map(r => `✅ ${r}`).join('\n')}`;
      setDecisoesRegras(novasRegrasFormatadas);

      // Criar automaticamente as ações sugeridas no banco
      for (const acaoSug of resultado.acoes_sugeridas) {
        await reunioesService.addAcao(reuniao!.id, {
          title: acaoSug.title,
          department_id: acaoSug.department_id,
          priority: acaoSug.priority,
          due_at: new Date(Date.now() + acaoSug.due_days * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Salvar ata atualizada
      await reunioesService.updateReuniao(reuniao!.id, {
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

          {/* Botão de Conexão Online Rápida */}
          {reuniao.link_online && (
            <a
              href={reuniao.link_online}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02]"
              title="Abrir sala de videochamada (Teams / Meet)"
            >
              <Video size={14} />
              <span>Entrar na Sala Virtual</span>
              <ExternalLink size={12} />
            </a>
          )}

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
              {reuniao.modalidade === 'online' && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 flex items-center gap-1">
                  <Video size={12} /> 100% Online ({reuniao.plataforma_online || 'Teams'})
                </span>
              )}
              {reuniao.modalidade === 'hibrido' && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1">
                  <Globe size={12} /> Híbrido (Sala + Online)
                </span>
              )}
              {reuniao.modalidade === 'presencial' && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                  <MapPin size={12} /> Presencial
                </span>
              )}
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
              {reuniao.local_presencial && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-emerald-400" />
                  <span className="font-semibold text-white">Local:</span>{' '}
                  {reuniao.local_presencial}
                </div>
              )}
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

      {/* Pauta Oficial do Encontro (Ordem do Dia / O que será tratado) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="p-5 md:p-6 bg-slate-50/70 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner">
              <ListOrdered size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pauta Oficial do Encontro (Ordem do Dia)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {reuniao.duracao_minutos || 45} min
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alinhamento prévio e tópicos essenciais a serem debatidos e resolvidos nesta reunião.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!pautaEditando ? (
              <button
                type="button"
                onClick={() => setPautaEditando(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
                title="Editar Pauta"
              >
                <Edit3 size={14} className="text-slate-500" />
                Editar Pauta
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPautaConteudo(reuniao.pauta_topicos || '');
                    setPautaEditando(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePauta}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Save size={13} />
                  {saving ? 'Salvando...' : 'Salvar Pauta'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsPautaExpanded(!isPautaExpanded)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isPautaExpanded ? 'Recolher Pauta' : 'Expandir Pauta'}
            >
              {isPautaExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {isPautaExpanded && (
          <div className="p-6 md:p-8 bg-white dark:bg-slate-900 transition-all">
            {pautaEditando ? (
              <div className="space-y-3">
                <VisualWysiwygEditor
                  value={pautaConteudo}
                  onChange={(val) => setPautaConteudo(val)}
                  placeholder="Estruture os tópicos da pauta, metas e regras a discutir..."
                  minHeight="180px"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPautaConteudo(reuniao.pauta_topicos || '');
                      setPautaEditando(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Descartar Edição
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePauta}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
                  >
                    <Save size={14} /> {saving ? 'Salvando...' : 'Atualizar Pauta'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/60 dark:bg-slate-850/40 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70">
                {renderPautaHtml(pautaConteudo)}
              </div>
            )}
          </div>
        )}
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
            <div className="text-xs opacity-80 truncate">Contexto, Casos & Tópicos</div>
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

      {/* ETAPA 2: PLAN (Contexto, Casos Operacionais & Tópicos Livres de Sistemas/Projetos) */}
      {activeStep === 'plan' && (
        <div className="space-y-6">
          {/* Card Principal de Contexto & Evidências */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban size={20} className="text-blue-600 dark:text-blue-400" />
                  Passo 2: PLAN — Contexto, Casos & Evidências Operacionais
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selecione casos concretos do sistema (pedidos, RH, falhas, clientes) ou crie tópicos livres (sistemas, projetos, novas empresas) para fundamentar as discussões deste encontro.
                </p>
              </div>

              {/* Botão de Avanço Rápido */}
              <button
                onClick={() => setActiveStep('do')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 shrink-0 self-start sm:self-center"
              >
                Avançar para Ata (Passo 3) <ChevronRight size={15} />
              </button>
            </div>

            {/* Dossiê de Contexto Vinculado a este Encontro */}
            {(() => {
              const totalContextosVinculados =
                topicosLivres.length +
                pedidosSelecionados.length +
                trabalhadoresSelecionados.length +
                incidenciasSelecionadas.length +
                clientesSelecionados.length;

              return (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag size={14} className="text-blue-600 dark:text-blue-400" />
                      Dossiê da Reunião ({totalContextosVinculados} itens vinculados)
                    </span>
                    {totalContextosVinculados > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCheck size={13} />
                        Pronto para alimentar a Ata e as Tarefas
                      </span>
                    )}
                  </div>

                  {totalContextosVinculados === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Nenhum caso ou tópico vinculado ainda. Use as abas abaixo para adicionar tópicos de sistemas/projetos ou marcar pedidos, trabalhadores e falhas para debater.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {/* Tópicos Livres */}
                      {topicosLivres.map(t => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium shadow-2xs"
                        >
                          <Lightbulb size={12} className="text-indigo-500 shrink-0" />
                          <span className="font-bold">[{t.categoria?.toUpperCase() || 'SISTEMAS'}]</span> {t.titulo}
                          <button
                            type="button"
                            onClick={() => handleRemoverTopicoLivre(t.id)}
                            className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                            title="Remover tópico"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      {/* Pedidos */}
                      {pedidosSelecionados.map(pId => {
                        const p = dadosSemana.pedidosRecentes.find(x => x.id === pId || x.codigo === pId);
                        return (
                          <span
                            key={pId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium shadow-2xs"
                          >
                            <Package size={12} className="text-blue-500 shrink-0" />
                            <span>Pedido #{p?.codigo || pId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleContexto('pedidos', pId)}
                              className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}

                      {/* Trabalhadores */}
                      {trabalhadoresSelecionados.map(wId => {
                        const w = dadosSemana.trabalhadoresRecentes.find(x => x.id === wId || x.nome === wId);
                        return (
                          <span
                            key={wId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium shadow-2xs"
                          >
                            <Users size={12} className="text-emerald-500 shrink-0" />
                            <span>{w?.nome || wId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleContexto('trabalhadores', wId)}
                              className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}

                      {/* Incidências */}
                      {incidenciasSelecionadas.map(iId => {
                        const inc = dadosSemana.incidenciasRecentes.find(x => x.id === iId || x.title === iId);
                        return (
                          <span
                            key={iId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium shadow-2xs"
                          >
                            <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{inc?.title || iId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleContexto('incidencias', iId)}
                              className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}

                      {/* Clientes */}
                      {clientesSelecionados.map(cId => {
                        const cl = dadosSemana.clientesRecentes.find(x => x.id === cId || x.trade_name === cId);
                        return (
                          <span
                            key={cId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-medium shadow-2xs"
                          >
                            <Building2 size={12} className="text-purple-500 shrink-0" />
                            <span>{cl?.trade_name || cl?.legal_name || cId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleContexto('clientes', cId)}
                              className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Navegador de Abas de Contexto */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPlanTab('topicos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    planTab === 'topicos'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Lightbulb size={13} />
                  <span>Sistemas, Projetos & Notas</span>
                  {topicosLivres.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {topicosLivres.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPlanTab('pedidos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    planTab === 'pedidos'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Package size={13} />
                  <span>Pedidos & Prazos</span>
                  {pedidosSelecionados.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {pedidosSelecionados.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPlanTab('trabalhadores')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    planTab === 'trabalhadores'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users size={13} />
                  <span>Trabalhadores & RH</span>
                  {trabalhadoresSelecionados.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {trabalhadoresSelecionados.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPlanTab('incidencias')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    planTab === 'incidencias'
                      ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <AlertTriangle size={13} />
                  <span>Falhas & Incidências</span>
                  {incidenciasSelecionadas.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {incidenciasSelecionadas.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPlanTab('clientes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    planTab === 'clientes'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 size={13} />
                  <span>Clientes & Obras</span>
                  {clientesSelecionados.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {clientesSelecionados.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Barra de Busca de Itens da aba ativa (se não for tópicos livres) */}
              {planTab !== 'topicos' && (
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Buscar em ${planTab}...`}
                    value={searchTermPlan}
                    onChange={e => setSearchTermPlan(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* ABA 1: TÓPICOS LIVRES & SISTEMAS / PROJETOS (SOLICITAÇÃO DO USUÁRIO) */}
            {planTab === 'topicos' && (
              <div className="space-y-4">
                {/* Form de Criação de Tópico */}
                <form onSubmit={handleAdicionarTopicoLivre} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Lightbulb size={15} className="text-indigo-600 dark:text-indigo-400" />
                    Registrar Tópico Livre, Funcionalidade de Sistema ou Novo Negócio
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Use para assuntos que não são pedidos ou trabalhadores: novas ferramentas, abertura de filial, padronização de fluxos ou planejamento estratégico.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-8">
                      <input
                        type="text"
                        required
                        placeholder="Título do Tópico (Ex: Desenvolvimento da tela de conciliação, Abertura de empresa nova...)"
                        value={novoTopicoTitulo}
                        onChange={e => setNovoTopicoTitulo(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <select
                        value={novoTopicoCategoria}
                        onChange={e => setNovoTopicoCategoria(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="sistemas">💻 Sistemas & TI</option>
                        <option value="projeto">🚀 Novo Negócio & Expansão</option>
                        <option value="processos">⚙️ Processos & Governança</option>
                        <option value="comercial">📊 Comercial & Regras</option>
                        <option value="outro">📌 Outro Assunto Geral</option>
                      </select>
                    </div>
                    <div className="md:col-span-10">
                      <textarea
                        rows={2}
                        placeholder="Descrição ou escopo detalhado (Ex: quais os requisitos, quem participa, prazos preliminares)..."
                        value={novoTopicoDescricao}
                        onChange={e => setNovoTopicoDescricao(e.target.value)}
                        className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                      >
                        <Plus size={15} /> Adicionar
                      </button>
                    </div>
                  </div>
                </form>

                {/* Lista de Tópicos Cadastrados */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tópicos Registrados neste Encontro ({topicosLivres.length})
                  </div>

                  {topicosLivres.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                      Nenhum tópico livre registrado ainda. Preencha o formulário acima para adicionar tópicos de sistemas ou planejamento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {topicosLivres.map(t => (
                        <div
                          key={t.id}
                          className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                {t.categoria?.toUpperCase() || 'SISTEMAS'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoverTopicoLivre(t.id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                title="Excluir tópico"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {t.titulo}
                            </h4>
                            {t.descricao && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                {t.descricao}
                              </p>
                            )}
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Registrado no plano</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Vinculado ao dossiê
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: PEDIDOS & PRAZOS */}
            {planTab === 'pedidos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{dadosSemana.totalPedidosAtivos} pedidos ativos identificados</span>
                  <span>Clique em Vincular para debater este pedido na reunião</span>
                </div>

                {(() => {
                  const filtrados = dadosSemana.pedidosRecentes.filter(p => {
                    if (!searchTermPlan.trim()) return true;
                    const term = searchTermPlan.toLowerCase();
                    return (
                      (p.codigo || '').toLowerCase().includes(term) ||
                      (p.estado || '').toLowerCase().includes(term) ||
                      (p.id || '').toLowerCase().includes(term)
                    );
                  });

                  if (filtrados.length === 0) {
                    return <p className="text-xs text-slate-400 py-6 text-center">Nenhum pedido encontrado</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtrados.map((pedido) => {
                        const isVinculado = pedidosSelecionados.includes(pedido.codigo || pedido.id);

                        return (
                          <div
                            key={pedido.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                              isVinculado
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700/60 shadow-xs'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            <div className="pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Pedido #{pedido.codigo || pedido.id.slice(0, 8)}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                  {pedido.estado || 'Em aberto'}
                                </span>
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 mt-1">
                                Início: {pedido.fecha_inicio_pedido ? new Date(pedido.fecha_inicio_pedido).toLocaleDateString('pt-BR') : 'A definir'} • {pedido.cantidad_personal || 0} trabalhadores
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleContexto('pedidos', pedido.codigo || pedido.id)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all shrink-0 flex items-center gap-1 ${
                                isVinculado
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isVinculado ? <><Check size={13} /> Vinculado</> : <><Plus size={13} /> Vincular</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ABA 3: TRABALHADORES & RH */}
            {planTab === 'trabalhadores' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Trabalhadores e candidatos recentes</span>
                  <span>Vincule casos de provas, admissões ou desistências</span>
                </div>

                {(() => {
                  const filtrados = dadosSemana.trabalhadoresRecentes.filter(w => {
                    if (!searchTermPlan.trim()) return true;
                    const term = searchTermPlan.toLowerCase();
                    return (
                      (w.nome || '').toLowerCase().includes(term) ||
                      (w.funcion || '').toLowerCase().includes(term) ||
                      (w.status_trabajador || '').toLowerCase().includes(term)
                    );
                  });

                  if (filtrados.length === 0) {
                    return <p className="text-xs text-slate-400 py-6 text-center">Nenhum trabalhador encontrado</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtrados.map((worker) => {
                        const identifier = worker.nome || worker.id;
                        const isVinculado = trabalhadoresSelecionados.includes(identifier);

                        return (
                          <div
                            key={worker.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                              isVinculado
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60 shadow-xs'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            <div className="pr-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {worker.nome}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {worker.funcion || 'Trabalhador'} • Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{worker.status_trabajador || 'Ativo'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleContexto('trabalhadores', identifier)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all shrink-0 flex items-center gap-1 ${
                                isVinculado
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isVinculado ? <><Check size={13} /> Vinculado</> : <><Plus size={13} /> Vincular</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ABA 4: INCIDÊNCIAS & FALHAS */}
            {planTab === 'incidencias' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{dadosSemana.totalIncidenciasAbertas} ocorrências pendentes no sistema</span>
                  <span>Vincule para tratar as causas raízes nesta reunião</span>
                </div>

                {(() => {
                  const filtrados = dadosSemana.incidenciasRecentes.filter(i => {
                    if (!searchTermPlan.trim()) return true;
                    const term = searchTermPlan.toLowerCase();
                    return (
                      (i.title || '').toLowerCase().includes(term) ||
                      (i.client_name || '').toLowerCase().includes(term) ||
                      (i.severity || '').toLowerCase().includes(term)
                    );
                  });

                  if (filtrados.length === 0) {
                    return <p className="text-xs text-slate-400 py-6 text-center">Nenhuma incidência aberta encontrada</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtrados.map((inc) => {
                        const identifier = inc.title || inc.id;
                        const isVinculado = incidenciasSelecionadas.includes(identifier);

                        return (
                          <div
                            key={inc.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                              isVinculado
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            <div className="pr-3">
                              <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                                {inc.title}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {inc.client_name ? `Cliente: ${inc.client_name} • ` : ''}
                                Severidade: <span className="font-semibold capitalize">{inc.severity || 'Normal'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleContexto('incidencias', identifier)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all shrink-0 flex items-center gap-1 ${
                                isVinculado
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-amber-600 hover:text-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isVinculado ? <><Check size={13} /> Vinculado</> : <><Plus size={13} /> Vincular</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ABA 5: CLIENTES & CONTRATOS */}
            {planTab === 'clientes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Clientes e obras cadastradas</span>
                  <span>Vincule para debater prazos ou renovações específicas</span>
                </div>

                {(() => {
                  const filtrados = dadosSemana.clientesRecentes.filter(c => {
                    if (!searchTermPlan.trim()) return true;
                    const term = searchTermPlan.toLowerCase();
                    return (
                      (c.trade_name || '').toLowerCase().includes(term) ||
                      (c.legal_name || '').toLowerCase().includes(term) ||
                      (c.codigo || '').toLowerCase().includes(term) ||
                      (c.city || '').toLowerCase().includes(term)
                    );
                  });

                  if (filtrados.length === 0) {
                    return <p className="text-xs text-slate-400 py-6 text-center">Nenhum cliente encontrado</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtrados.map((cliente) => {
                        const identifier = cliente.trade_name || cliente.legal_name || cliente.id;
                        const isVinculado = clientesSelecionados.includes(identifier);

                        return (
                          <div
                            key={cliente.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                              isVinculado
                                ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-700/60 shadow-xs'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            <div className="pr-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {cliente.trade_name || cliente.legal_name}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {cliente.codigo ? `Cód: ${cliente.codigo} • ` : ''}
                                {cliente.city ? `${cliente.city}` : 'Espanha'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleContexto('clientes', identifier)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all shrink-0 flex items-center gap-1 ${
                                isVinculado
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-purple-600 hover:text-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isVinculado ? <><Check size={13} /> Vinculado</> : <><Plus size={13} /> Vincular</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Navegação Inferior */}
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
          {/* Banner de Sincronização do Dossiê do PLAN */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 dark:from-slate-800/90 dark:via-indigo-950/30 dark:to-slate-900 rounded-2xl border border-blue-200/90 dark:border-blue-900/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Dossiê Operacional & Tópicos Livres do PLAN
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                  {topicosLivres.length + pedidosSelecionados.length + trabalhadoresSelecionados.length + incidenciasSelecionadas.length + clientesSelecionados.length} itens vinculados
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Os tópicos livres e casos operacionais vinculados no Passo 2 alimentam o resumo da IA e podem ser inseridos diretamente na ata oficial.
              </p>

              {/* Chips Rápidos */}
              {(topicosLivres.length > 0 || pedidosSelecionados.length > 0 || trabalhadoresSelecionados.length > 0 || incidenciasSelecionadas.length > 0 || clientesSelecionados.length > 0) ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {topicosLivres.map(t => (
                    <span key={t.id} className="text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-850 font-medium">
                      💡 [{t.categoria.toUpperCase()}] {t.titulo}
                    </span>
                  ))}
                  {pedidosSelecionados.map(pId => (
                    <span key={pId} className="text-[11px] px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-850 font-medium">
                      📦 Pedido #{dadosSemana.pedidosRecentes.find(x => x.id === pId || x.codigo === pId)?.codigo || pId}
                    </span>
                  ))}
                  {trabalhadoresSelecionados.map(wId => (
                    <span key={wId} className="text-[11px] px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-850 font-medium">
                      👥 {dadosSemana.trabalhadoresRecentes.find(x => x.id === wId || x.nome === wId)?.nome || wId}
                    </span>
                  ))}
                  {incidenciasSelecionadas.map(iId => (
                    <span key={iId} className="text-[11px] px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-850 font-medium">
                      ⚠️ {dadosSemana.incidenciasRecentes.find(x => x.id === iId || x.title === iId)?.title || iId}
                    </span>
                  ))}
                  {clientesSelecionados.map(cId => (
                    <span key={cId} className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-850 font-medium">
                      🏢 {dadosSemana.clientesRecentes.find(x => x.id === cId || x.trade_name === cId)?.trade_name || cId}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic pt-1">
                  Nenhum tópico livre ou caso operacional foi vinculado no Passo 2 (PLAN). Você pode prosseguir com anotações livres ou voltar ao PLAN para vincular.
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInserirContextoNaAta}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors"
                title="Insere o bloco formatado com os tópicos livres e casos selecionados no texto da Ata"
              >
                <ClipboardList size={14} className="text-blue-600 dark:text-blue-400" />
                Inserir Dossiê na Ata
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('plan')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-semibold transition-colors"
              >
                Ajustar no PLAN <ExternalLink size={13} />
              </button>
            </div>
          </div>

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

          {/* Referência Rápida da Pauta no Passo 3 */}
          <details className="group bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 transition-all">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <ListOrdered size={16} className="text-indigo-500" />
                Consultar Pauta do Encontro enquanto preenche a Ata
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 group-open:hidden">
                Clique para expandir tópicos da pauta
              </span>
              <span className="text-[11px] text-slate-400 hidden group-open:inline">
                Ocultar tópicos
              </span>
            </summary>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl">
              {renderPautaHtml(pautaConteudo)}
            </div>
          </details>

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
            <form onSubmit={handleAddAcao} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <PlusCircle size={15} className="text-blue-600 dark:text-blue-400" />
                  Pactuar Novo Compromisso / Tarefa 5W2H
                </div>
                <span className="text-[11px] text-slate-500">
                  Gera tarefa automática no módulo 'Minhas Tarefas'
                </span>
              </div>

              {/* Linha 1: Vínculo com Contexto do PLAN e Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Vincular ao Contexto do PLAN (Opcional)
                  </label>
                  <select
                    value={novaAcao.contexto_ref}
                    onChange={e => setNovaAcao({ ...novaAcao, contexto_ref: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Nenhum vínculo direto (Geral / Administrativo)</option>
                    {topicosLivres.length > 0 && (
                      <optgroup label="💡 Sistemas & Tópicos Livres">
                        {topicosLivres.map(t => (
                          <option key={t.id} value={`Tópico: ${t.titulo}`}>
                            💡 [{t.categoria.toUpperCase()}] {t.titulo}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {pedidosSelecionados.length > 0 && (
                      <optgroup label="📦 Pedidos em Pauta">
                        {pedidosSelecionados.map(pId => {
                          const p = dadosSemana.pedidosRecentes.find(x => x.id === pId || x.codigo === pId);
                          return (
                            <option key={pId} value={`Pedido #${p?.codigo || pId}`}>
                              📦 Pedido #{p?.codigo || pId}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {trabalhadoresSelecionados.length > 0 && (
                      <optgroup label="👥 Trabalhadores / RH em Pauta">
                        {trabalhadoresSelecionados.map(wId => {
                          const w = dadosSemana.trabalhadoresRecentes.find(x => x.id === wId || x.nome === wId);
                          return (
                            <option key={wId} value={`RH: ${w?.nome || wId}`}>
                              👥 {w?.nome || wId} ({w?.funcion || 'Geral'})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {incidenciasSelecionadas.length > 0 && (
                      <optgroup label="⚠️ Ocorrências & Falhas">
                        {incidenciasSelecionadas.map(iId => {
                          const i = dadosSemana.incidenciasRecentes.find(x => x.id === iId || x.title === iId);
                          return (
                            <option key={iId} value={`Falha: ${i?.title || iId}`}>
                              ⚠️ {i?.title || iId}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {clientesSelecionados.length > 0 && (
                      <optgroup label="🏢 Clientes & Obras">
                        {clientesSelecionados.map(cId => {
                          const c = dadosSemana.clientesRecentes.find(x => x.id === cId || x.trade_name === cId);
                          return (
                            <option key={cId} value={`Cliente: ${c?.trade_name || cId}`}>
                              🏢 {c?.trade_name || cId}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={novaAcao.priority}
                    onChange={e => setNovaAcao({ ...novaAcao, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="baixa">Prioridade: Baixa</option>
                    <option value="media">Prioridade: Média</option>
                    <option value="alta">Prioridade: Alta</option>
                    <option value="urgente">Prioridade: Urgente 🔥</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: O que fazer, Setor, Dono Único, Prazo e Botão */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
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
                    className="w-full h-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
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
                        {(() => {
                          const match = acao.title.match(/^\[(.*?)\]\s*(.*)$/);
                          const tag = match ? match[1] : null;
                          const cleanText = match ? match[2] : acao.title;
                          return (
                            <div className="flex items-center flex-wrap gap-1.5">
                              {tag && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200 dark:border-indigo-800">
                                  📌 {tag}
                                </span>
                              )}
                              <span className={`font-semibold ${
                                acao.status === 'Concluida' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                              }`}>
                                {cleanText}
                              </span>
                            </div>
                          );
                        })()}
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
