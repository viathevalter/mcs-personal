import { supabase } from '@/shared/supabase/client';

export interface OrdemPagamentoRh {
  id: string;
  cod_orden_pago: string;
  descricao: string;
  fornecedor_id?: string | null;
  cod_provedor?: string | null;
  valor: number;
  data_vencimento: string;
  status: 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'pago' | 'cancelado' | string;
  criador_id?: string | null;
  criador_email?: string | null;
  departamento_origem?: string | null;
  tipo_orden?: string | null;
  centro_custos?: string | null;
  forma_pagamento?: string | null;
  anexos?: string | null;
  comprovante_url?: string | null;
  observaciones?: string | null;
  qtde_itens?: number | null;
  created_at?: string;
  // Campos computados / extraídos
  worker_id?: string;
  worker_nome?: string;
  worker_codigo?: string;
  iban?: string;
  banco?: string;
  competencia?: string;
}

export interface WorkerRhOption {
  id: string;
  nome: string;
  cod_colab?: string;
  nif?: string;
  funcion?: string;
  cliente?: string;
  obra?: string;
  iban?: string | null;
  status_trabajador?: string;
}

export interface CreateOrdemRhPayload {
  tipo_atividade: 'medico' | 'epis' | 'salario' | 'formacion' | 'reembolso' | string;
  categoria: string;
  worker_id?: string;
  worker_nome: string;
  worker_codigo?: string;
  cliente?: string;
  obra?: string;
  empresa_id?: string;
  empresa_nome?: string;
  beneficiario_nome: string;
  iban?: string;
  banco?: string;
  forma_pagamento: string;
  valor: number;
  data_vencimento: string;
  competencia: string;
  anexo_url?: string;
  observacoes?: string;
  status_inicial?: 'rascunho' | 'aguardando_aprovacao';
}

const DEFAULT_USER_FALLBACK = 'e39b47da-0aa3-464e-a901-8e22ac2ca2a6';

async function getCurrentUser(): Promise<{ id: string; email: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      return {
        id: userData.user.id,
        email: userData.user.email || 'rh@gestaologinpro.com'
      };
    }
  } catch (e) {
    console.warn('Erro auth user:', e);
  }
  return { id: DEFAULT_USER_FALLBACK, email: 'rh@gestaologinpro.com' };
}

async function getNextCodOrdenPago(): Promise<string> {
  try {
    const { data } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .select('cod_orden_pago')
      .order('created_at', { ascending: false })
      .limit(50);

    let maxNum = 140;
    if (data && data.length > 0) {
      for (const row of data) {
        if (row.cod_orden_pago) {
          const match = row.cod_orden_pago.match(/OP-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
    }
    return `OP-${String(maxNum + 1).padStart(6, '0')}`;
  } catch (err) {
    console.warn('Erro sequencial OP:', err);
    return `OP-${Date.now().toString().slice(-6)}`;
  }
}

function parseMetadata(obs?: string | null) {
  if (!obs) return {};
  const meta: Record<string, string> = {};
  const lines = obs.split('\n');
  for (const line of lines) {
    if (line.startsWith('IBAN:')) meta.iban = line.replace('IBAN:', '').trim();
    if (line.startsWith('Banco:')) meta.banco = line.replace('Banco:', '').trim();
    if (line.startsWith('Comp:')) meta.competencia = line.replace('Comp:', '').trim();
    if (line.startsWith('Trabajador:')) {
      const parts = line.replace('Trabajador:', '').trim();
      const match = parts.match(/^(.*?)(?:\s*\[(.*?)\])?$/);
      if (match) {
        meta.worker_nome = match[1].trim();
        if (match[2]) meta.worker_codigo = match[2].trim();
      } else {
        meta.worker_nome = parts;
      }
    }
  }
  return meta;
}

export const financeRhService = {
  // 1. Listar todas as ordens de pagamento de Recursos Humanos
  async fetchOrdensRh(): Promise<OrdemPagamentoRh[]> {
    try {
      const { data, error } = await supabase
        .schema('core_finance')
        .from('ordens_pagamento')
        .select('*')
        .or('departamento_origem.eq.Recursos Humanos,departamento_origem.ilike.%RH%,departamento_origem.ilike.%Personal%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ordens RH:', error);
        return [];
      }

      return (data || []).map((row: any) => {
        const meta = parseMetadata(row.observaciones);
        return {
          ...row,
          worker_nome: meta.worker_nome || row.cod_provedor,
          worker_codigo: meta.worker_codigo,
          iban: meta.iban,
          banco: meta.banco,
          competencia: meta.competencia,
          comprovante_url: row.comprovante_url || null
        };
      });
    } catch (e) {
      console.error('Exceção ao buscar ordens RH:', e);
      return [];
    }
  },

  // 2. Carregar trabalhadores ativos para vínculo
  async fetchActiveWorkers(): Promise<WorkerRhOption[]> {
    try {
      const personalClient = (supabase as any).schema ? (supabase as any).schema('core_personal') : supabase;
      const { data, error } = await personalClient
        .from('workers')
        .select('id, nome, cod_colab, nif, funcion, cliente, iban, status_trabajador')
        .order('nome', { ascending: true })
        .limit(2000);

      if (error || !data) return [];

      return data.map((w: any) => ({
        id: w.id || w.cod_colab,
        nome: w.nome,
        cod_colab: w.cod_colab,
        nif: w.nif,
        funcion: w.funcion,
        cliente: w.cliente,
        iban: w.iban || null,
        status_trabajador: w.status_trabajador
      }));
    } catch (e) {
      console.warn('Erro ao buscar trabalhadores para RH:', e);
      return [];
    }
  },

  // 3. Gerar Nova Ordem de Pagamento para RH
  async gerarOrdemPagamentoRh(payload: CreateOrdemRhPayload): Promise<OrdemPagamentoRh> {
    const { id: userId, email: userEmail } = await getCurrentUser();
    const codOrdenPago = await getNextCodOrdenPago();

    const compStr = payload.competencia ? ` [${payload.competencia}]` : '';
    const workerStr = payload.worker_nome ? ` - ${payload.worker_nome}` : '';
    const descricao = `${payload.categoria}${workerStr}${compStr}`;
    const centroCustos = `${payload.cliente || 'Recursos Humanos'} / ${payload.obra || 'Personal General'}`;

    const obsCompletas = [
      payload.worker_nome ? `Trabajador: ${payload.worker_nome}${payload.worker_codigo ? ` [${payload.worker_codigo}]` : ''}` : null,
      payload.beneficiario_nome ? `Beneficiario: ${payload.beneficiario_nome}` : null,
      payload.iban ? `IBAN: ${payload.iban}` : null,
      payload.banco ? `Banco: ${payload.banco}` : null,
      payload.competencia ? `Comp: ${payload.competencia}` : null,
      payload.forma_pagamento ? `Forma de Pago: ${payload.forma_pagamento}` : null,
      payload.observacoes ? `Obs: ${payload.observacoes}` : null
    ].filter(Boolean).join('\n');

    const statusInicial = payload.status_inicial || 'rascunho';

    const { data: newOrdem, error: insertErr } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .insert([{
        cod_orden_pago: codOrdenPago,
        descricao,
        cod_provedor: payload.beneficiario_nome || payload.worker_nome,
        valor: payload.valor,
        data_vencimento: payload.data_vencimento,
        status: statusInicial,
        criador_id: userId,
        criador_email: userEmail,
        departamento_origem: 'Recursos Humanos',
        tipo_orden: payload.categoria,
        centro_custos: centroCustos,
        forma_pagamento: payload.forma_pagamento,
        anexos: payload.anexo_url || null,
        observaciones: obsCompletas,
        qtde_itens: 1
      }])
      .select()
      .single();

    if (insertErr || !newOrdem) {
      console.error('Erro ao gerar OP RH:', insertErr);
      throw new Error(`Falha ao gerar Ordem de Pagamento RH: ${insertErr?.message || 'Erro desconhecido'}`);
    }

    // Inserir item detalhado
    try {
      await supabase
        .schema('core_finance')
        .from('ordens_pagamento_itens')
        .insert([{
          ordem_pagamento_id: newOrdem.id,
          cod_orden_pago: codOrdenPago,
          cod_orden_pago_item: `${codOrdenPago}-IT-001`,
          cod_provedor: payload.beneficiario_nome || payload.worker_nome,
          cod_colab: payload.worker_codigo || null,
          observacion_item: `RH: ${payload.categoria} - Colaborador: ${payload.worker_nome}`,
          categoria_orden: payload.categoria,
          valor_orden: payload.valor,
          vencimento_orden: payload.data_vencimento,
          centro_custo: centroCustos,
          status_item: statusInicial === 'aguardando_aprovacao' ? 'Aguardando Aprovação' : 'Rascunho'
        }]);
    } catch (itErr) {
      console.warn('Erro ao inserir item OP RH:', itErr);
    }

    // Inserir registro no histórico / movimentos
    try {
      await supabase
        .schema('core_finance')
        .from('movimentos_pagos')
        .insert([{
          ordem_pagamento_id: newOrdem.id,
          cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
          tipo_mov: statusInicial === 'aguardando_aprovacao' ? 'Enviada p/ Aprovação' : 'Orden RH Generada',
          estado_mov: statusInicial,
          valor_pago: payload.valor,
          observaciones: `Orden de Pago RH creada por ${userEmail}`,
          criado_por: userEmail
        }]);
    } catch (mErr) {}

    return {
      ...newOrdem,
      worker_nome: payload.worker_nome,
      worker_codigo: payload.worker_codigo,
      iban: payload.iban,
      banco: payload.banco,
      competencia: payload.competencia
    };
  },

  // 4. Enviar ordem de pagamento para aprovação do Financeiro
  async enviarParaAprovacao(id: string): Promise<boolean> {
    const { id: userId, email: userEmail } = await getCurrentUser();
    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update({
        status: 'aguardando_aprovacao',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao despachar OP RH para aprovação:', error);
      throw error;
    }

    try {
      await supabase
        .schema('core_finance')
        .from('movimentos_pagos')
        .insert([{
          ordem_pagamento_id: id,
          cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
          tipo_mov: 'Enviada a Finanzas',
          estado_mov: 'aguardando_aprovacao',
          observaciones: `Despachada para aprobación del Financeiro por ${userEmail}`,
          criado_por: userEmail
        }]);
    } catch (e) {}

    return true;
  },

  // 5. Cancelar ordem
  async cancelarOrdem(id: string, motivo?: string): Promise<boolean> {
    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update({
        status: 'cancelado',
        observaciones: motivo ? `[CANCELADO]: ${motivo}` : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
