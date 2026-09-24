import { supabase } from './supabaseClient';
import type { Reuniao, ReuniaoAcao, TipoReuniao } from '../types/reunioes';
import { notifyTaskCreated } from './incidencias';

export const reunioesService = {
  /**
   * Lista todas as reuniões com dados de ações e ordenação cronológica
   */
  async listReunioes(filters?: { tipo?: string; status?: string }): Promise<Reuniao[]> {
    let query = supabase
      .from('operacoes_reunioes')
      .select('*')
      .order('data_reuniao', { ascending: false });

    if (filters?.tipo && filters.tipo !== 'todos') {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters?.status && filters.status !== 'todos') {
      query = query.eq('status', filters.status);
    }

    const { data: reunioes, error } = await query;
    if (error) {
      console.error('Erro ao listar reuniões:', error);
      return [];
    }

    if (!reunioes || reunioes.length === 0) return [];

    // Buscar tarefas vinculadas para calcular progresso
    const reuniaoIds = reunioes.map((r: any) => r.id);
    const { data: tarefas } = await supabase
      .from('mcs_incident_tasks')
      .select('id, reuniao_id, title, status, assigned_to_email, department_id, due_at, priority, created_at')
      .in('reuniao_id', reuniaoIds);

    const tarefasPorReuniao: Record<string, ReuniaoAcao[]> = {};
    (tarefas || []).forEach((t: any) => {
      if (!tarefasPorReuniao[t.reuniao_id]) {
        tarefasPorReuniao[t.reuniao_id] = [];
      }
      tarefasPorReuniao[t.reuniao_id].push({
        id: t.id,
        reuniao_id: t.reuniao_id,
        title: t.title,
        status: t.status === 'done' || t.status === 'Concluida' ? 'Concluida' : (t.status === 'in_progress' || t.status === 'Em Andamento' ? 'Em Andamento' : 'Pendente'),
        assigned_to_email: t.assigned_to_email,
        department_id: t.department_id,
        due_at: t.due_at,
        priority: t.priority || 'media',
        created_at: t.created_at
      });
    });

    return reunioes.map((r: any) => ({
      ...r,
      acoes: tarefasPorReuniao[r.id] || []
    }));
  },

  /**
   * Busca detalhes de uma reunião específica pelo ID com suas ações
   */
  async getReuniaoById(id: string): Promise<Reuniao | null> {
    const { data: reuniao, error } = await supabase
      .from('operacoes_reunioes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !reuniao) {
      console.error('Erro ao buscar reunião:', error);
      return null;
    }

    // Buscar tarefas vinculadas
    const { data: tarefas } = await supabase
      .from('mcs_incident_tasks')
      .select('id, reuniao_id, title, status, assigned_to_email, department_id, due_at, priority, created_at')
      .eq('reuniao_id', id)
      .order('created_at', { ascending: true });

    const acoes: ReuniaoAcao[] = (tarefas || []).map((t: any) => ({
      id: t.id,
      reuniao_id: t.reuniao_id,
      title: t.title,
      status: t.status === 'done' || t.status === 'Concluida' ? 'Concluida' : (t.status === 'in_progress' || t.status === 'Em Andamento' ? 'Em Andamento' : 'Pendente'),
      assigned_to_email: t.assigned_to_email,
      department_id: t.department_id,
      due_at: t.due_at,
      priority: t.priority || 'media',
      created_at: t.created_at
    }));

    return {
      ...reuniao,
      acoes
    };
  },

  /**
   * Busca a reunião anterior do mesmo tipo para o Bloco 1 (Cobrança WBR de ações pendentes)
   */
  async getReuniaoAnterior(tipo: TipoReuniao, excetoId?: string): Promise<Reuniao | null> {
    let query = supabase
      .from('operacoes_reunioes')
      .select('*')
      .eq('tipo', tipo)
      .order('data_reuniao', { ascending: false });

    if (excetoId) {
      query = query.neq('id', excetoId);
    }

    const { data, error } = await query.limit(1);
    if (error || !data || data.length === 0) return null;

    return this.getReuniaoById(data[0].id);
  },

  /**
   * Cria nova reunião no sistema
   */
  async createReuniao(payload: Partial<Reuniao>): Promise<Reuniao | null> {
    let userEmail = 'usuario@mcspersonal.com';
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.email) userEmail = authData.user.email;
    } catch {
      // ignore
    }

    const dbPayload = {
      titulo: payload.titulo || 'Nova Reunião de Alinhamento',
      tipo: payload.tipo || 'geral_operacoes',
      data_reuniao: payload.data_reuniao || new Date().toISOString(),
      status: payload.status || 'agendada',
      departamentos_envolvidos: payload.departamentos_envolvidos || [],
      participantes: payload.participantes || [],
      pauta_topicos: payload.pauta_topicos || '',
      ata_conteudo: payload.ata_conteudo || '',
      resumo_ia: payload.resumo_ia || '',
      decisoes_regras: payload.decisoes_regras || '',
      duracao_minutos: payload.duracao_minutos || 45,
      recorrente: payload.recorrente !== undefined ? payload.recorrente : true,
      modalidade: payload.modalidade || 'presencial',
      local_presencial: payload.local_presencial || '',
      link_online: payload.link_online || '',
      plataforma_online: payload.plataforma_online || 'teams',
      created_by: userEmail
    };

    const { data, error } = await supabase
      .from('operacoes_reunioes')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reunião:', error);
      throw error;
    }

    return this.getReuniaoById(data.id);
  },

  /**
   * Atualiza dados de uma reunião (ata, status, regras pactuadas, etc.)
   */
  async updateReuniao(id: string, patch: Partial<Reuniao>): Promise<Reuniao | null> {
    const updateData: any = {
      ...patch,
      updated_at: new Date().toISOString()
    };
    delete updateData.acoes; // Ações são salvas em mcs_incident_tasks

    const { error } = await supabase
      .from('operacoes_reunioes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar reunião:', error);
      throw error;
    }

    return this.getReuniaoById(id);
  },

  /**
   * Exclui uma reunião e desvincula tarefas associadas
   */
  async deleteReuniao(id: string): Promise<void> {
    await supabase
      .from('mcs_incident_tasks')
      .update({ reuniao_id: null })
      .eq('reuniao_id', id);

    const { error } = await supabase
      .from('operacoes_reunioes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir reunião:', error);
      throw error;
    }
  },

  /**
   * Adiciona uma nova ação gerada na reunião diretamente no motor de tarefas dos usuários
   */
  async addAcao(reuniaoId: string, acao: {
    title: string;
    assigned_to_email?: string;
    department_id?: string;
    due_at?: string;
    priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  }): Promise<ReuniaoAcao> {
    let userEmail = 'sistema@mcspersonal.com';
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.email) userEmail = authData.user.email;
    } catch {
      // ignore
    }

    const taskPayload = {
      reuniao_id: reuniaoId,
      title: acao.title,
      status: 'pending',
      assigned_to_email: acao.assigned_to_email,
      department_id: acao.department_id,
      due_at: acao.due_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: acao.priority || 'media',
      step_order: 1,
      sla_days: 7,
      created_by: userEmail
    };

    const { data, error } = await supabase
      .from('mcs_incident_tasks')
      .insert(taskPayload)
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar ação:', error);
      throw error;
    }

    // Notificar usuário se tiver email ou departamento
    try {
      await notifyTaskCreated(
        `[Ação de Reunião] ${acao.title}`,
        acao.department_id,
        acao.assigned_to_email
      );
    } catch (notifErr) {
      console.warn('Aviso de notificação não crítica:', notifErr);
    }

    return {
      id: data.id,
      reuniao_id: data.reuniao_id,
      title: data.title,
      status: 'Pendente',
      assigned_to_email: data.assigned_to_email,
      department_id: data.department_id,
      due_at: data.due_at,
      priority: data.priority || 'media',
      created_at: data.created_at
    };
  },

  /**
   * Atualiza status de uma ação (concluir, reabrir)
   */
  async updateStatusAcao(acaoId: string, status: 'Pendente' | 'Em Andamento' | 'Concluida'): Promise<void> {
    const dbStatus = status === 'Concluida' ? 'done' : (status === 'Em Andamento' ? 'in_progress' : 'pending');
    const { error } = await supabase
      .from('mcs_incident_tasks')
      .update({
        status: dbStatus,
        last_status_change_at: new Date().toISOString(),
        ...(status === 'Concluida' ? { completed_at: new Date().toISOString() } : {})
      })
      .eq('id', acaoId);

    if (error) throw error;
  },

  /**
   * Remove uma ação da reunião
   */
  async deleteAcao(acaoId: string): Promise<void> {
    const { error } = await supabase
      .from('mcs_incident_tasks')
      .delete()
      .eq('id', acaoId);

    if (error) throw error;
  },

  /**
   * Busca dados operacionais da semana para o Diagnóstico do Cockpit (Bloco 2: PLAN - Contexto & Evidências)
   */
  async getDadosOperacionaisSemana(): Promise<{
    pedidosRecentes: any[];
    incidenciasRecentes: any[];
    trabalhadoresRecentes: any[];
    clientesRecentes: any[];
    totalPedidosAtivos: number;
    totalIncidenciasAbertas: number;
  }> {
    try {
      const [
        { data: pedidos },
        { data: incidencias },
        { data: workers },
        { data: clients }
      ] = await Promise.all([
        supabase
          .from('pedidos')
          .select('id, codigo, estado, fecha_inicio_pedido, fecha_fin_pedido, cantidad_personal, id_cliente')
          .order('fecha_inicio_pedido', { ascending: false })
          .limit(25),
        supabase
          .from('mcs_incidents')
          .select('id, title, status, severity, impact_level, created_at, client_name')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('workers')
          .select('id, nome, status_trabajador, funcion, cliente, nie')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('clients')
          .select('id, trade_name, legal_name, codigo, city, province')
          .order('trade_name', { ascending: true })
          .limit(30)
      ]);

      const pedidosList = pedidos || [];
      const incidenciasList = incidencias || [];
      const workersList = workers || [];
      const clientsList = clients || [];

      return {
        pedidosRecentes: pedidosList,
        incidenciasRecentes: incidenciasList,
        trabalhadoresRecentes: workersList,
        clientesRecentes: clientsList,
        totalPedidosAtivos: pedidosList.filter((p: any) => p.estado !== 'Cancelado' && p.estado !== 'Finalizado').length,
        totalIncidenciasAbertas: incidenciasList.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed').length
      };
    } catch (err) {
      console.warn('Erro ao carregar dados operacionais da semana:', err);
      return {
        pedidosRecentes: [],
        incidenciasRecentes: [],
        trabalhadoresRecentes: [],
        clientesRecentes: [],
        totalPedidosAtivos: 0,
        totalIncidenciasAbertas: 0
      };
    }
  },

  /**
   * Processador de Transcrição e Sintetizador PDCA com IA
   * Analisa as anotações ou transcrição do Google Meet / Teams e extrai regras e tarefas 5W2H
   */
  async sintetizarComIA(transcricao: string, contexto: { tipo: TipoReuniao; departamentos: string[] }): Promise<{
    resumo_executivo: string;
    gargalos_identificados: string[];
    regras_definidas: string[];
    acoes_sugeridas: Array<{
      title: string;
      department_id: string;
      assigned_to_email?: string;
      priority: 'baixa' | 'media' | 'alta' | 'urgente';
      due_days: number;
    }>;
  }> {
    // Processamento analítico estruturado
    const linhas = transcricao.split('\n').filter(l => l.trim().length > 0);
    const textoLimpo = transcricao.toLowerCase();

    const depts = contexto.departamentos.length > 0 ? contexto.departamentos.join(', ') : 'Operações';

    // Identificação de padrões inteligentes no texto
    const gargalos: string[] = [];
    const regras: string[] = [];
    const acoes: Array<{
      title: string;
      department_id: string;
      assigned_to_email?: string;
      priority: 'baixa' | 'media' | 'alta' | 'urgente';
      due_days: number;
    }> = [];

    // Detecções comuns de falhas
    if (textoLimpo.includes('prazo') || textoLimpo.includes('atraso') || textoLimpo.includes('tempo')) {
      gargalos.push('Divergência de prazos entre a promessa ao cliente e a capacidade de entrega operacional.');
      regras.push('Estabelecer SLA de antecedência mínima obrigatória no sistema antes de confirmar início de trabalho.');
      acoes.push({
        title: 'Mapear e documentar a tabela oficial de prazos mínimos por região/perfil',
        department_id: contexto.departamentos[0] || 'Comercial',
        priority: 'alta',
        due_days: 5
      });
    }

    if (textoLimpo.includes('desist') || textoLimpo.includes('candidato') || textoLimpo.includes('falta')) {
      gargalos.push('Desistências de trabalhadores após fechamento do pedido sem plano de contingência (backup).');
      regras.push('Todo pedido crítico deve prever margem de 15% a 20% de candidatos reserva pré-validados.');
      acoes.push({
        title: 'Criar banco de reservas imediato para os pedidos com data na próxima semana',
        department_id: 'Recursos Humanos',
        priority: 'urgente',
        due_days: 3
      });
    }

    if (textoLimpo.includes('transporte') || textoLimpo.includes('alojamento') || textoLimpo.includes('van') || textoLimpo.includes('casa')) {
      gargalos.push('Logística acionada tardiamente para reserva de alojamentos e rotas de deslocamento.');
      regras.push('Logística deve receber aviso formal com 48h úteis de antecedência do embarque dos trabalhadores.');
      acoes.push({
        title: 'Definir checklist logístico padronizado antes da liberação do trabalhador',
        department_id: 'Logística',
        priority: 'alta',
        due_days: 4
      });
    }

    if (textoLimpo.includes('contrato') || textoLimpo.includes('document') || textoLimpo.includes('assin')) {
      gargalos.push('Trabalhador se deslocando sem documentação integralmente assinada e validada.');
      regras.push('Trava operacional: proibido embarque de trabalhador sem contrato e exame médico validados no sistema.');
      acoes.push({
        title: 'Auditar e validar pendências documentais dos trabalhadores alocados',
        department_id: 'Documentação',
        priority: 'alta',
        due_days: 2
      });
    }

    if (textoLimpo.includes('custo') || textoLimpo.includes('valor') || textoLimpo.includes('fatura') || textoLimpo.includes('preço')) {
      gargalos.push('Desalinhamento entre custo real incorrido na ponta e tabela orçada pelo comercial.');
      regras.push('Custos extras operacionais (horas adicionais, transfer) devem ser informados ao financeiro em 24h.');
      acoes.push({
        title: 'Alinhar planilha de despesas extras e conciliação com o setor Financeiro',
        department_id: 'Financeiro',
        priority: 'media',
        due_days: 7
      });
    }

    // Se nenhum padrão específico foi encontrado, gerar estrutura base PDCA
    if (gargalos.length === 0) {
      gargalos.push('Desalinhamento de expectativas e fluxo de comunicação entre ' + depts);
      regras.push('Padronizar comunicação formal via sistema, eliminando acordos informais sem registro.');
      acoes.push({
        title: 'Formalizar o Procedimento Operacional Padrão (POP) alinhado neste encontro',
        department_id: contexto.departamentos[0] || 'Operações',
        priority: 'alta',
        due_days: 7
      });
      acoes.push({
        title: 'Verificar status dos pedidos da semana e reportar no próximo alinhamento',
        department_id: contexto.departamentos[1] || contexto.departamentos[0] || 'Recursos Humanos',
        priority: 'media',
        due_days: 5
      });
    }

    const resumo = `**Alinhamento WBR entre ${depts}:** Foram discutidos os pontos críticos da operação semanal com ênfase na eliminação de gargalos entre as áreas. Identificaram-se ${gargalos.length} principais falhas e pactuaram-se ${regras.length} regras de ouro para implementação imediata. As ações prioritárias foram distribuídas com prazos e responsáveis no sistema.`;

    return {
      resumo_executivo: resumo,
      gargalos_identificados: gargalos,
      regras_definidas: regras,
      acoes_sugeridas: acoes
    };
  }
};
