import { supabase } from '@/shared/supabase/client';

export interface PagoAlojamento {
  id: string;
  codigo_pago: string;
  contrato_id?: string;
  alojamento_id?: string;
  alojamento_nome?: string;
  alojamento_codigo?: string;
  provedor_id?: string;
  provedor_nome?: string;
  iban_cobranca?: string;
  banco?: string;
  titular?: string;
  centro_custo_cliente?: string;
  centro_custo_obra?: string;
  ordem_pagamento_id?: string;
  tipo_pago: 'Aluguel' | 'Fianza_Saida' | 'Fianza_Devolucion' | 'Suministro_Luz' | 'Suministro_Agua' | 'Suministro_Gas' | 'Suministro_Internet' | 'Manutencao_Limpeza';
  status_pago: 'Rascunho' | 'Aguardando Aprovação' | 'Aprovado' | 'Pago' | 'Cancelado';
  periodo_competencia?: string;
  data_emissao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  valor_previsto: number;
  moeda?: string;
  observacoes?: string;
  anexo_fatura_url?: string;
  comprovante_url?: string;
  pago_por?: string;
  forma_pagamento?: string;
}

const DEFAULT_USER_FALLBACK = 'e39b47da-0aa3-464e-a901-8e22ac2ca2a6';

// Helper para obter ID do usuário autenticado de forma robusta
async function getCurrentUserId(): Promise<{ id: string; email: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      return {
        id: userData.user.id,
        email: userData.user.email || 'usuario@gestaologinpro.com'
      };
    }
  } catch (e) {
    console.warn('Erro ao obter usuário auth:', e);
  }
  return { id: DEFAULT_USER_FALLBACK, email: 'sistema@gestaologinpro.com' };
}

// Helper para calcular o próximo código de ordem de pagamento sequencial OP-000XXX
async function getNextCodOrdenPago(offset = 0): Promise<string> {
  try {
    const { data } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .select('cod_orden_pago')
      .order('created_at', { ascending: false })
      .limit(50);

    let maxNum = 123;
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
    const nextNum = maxNum + 1 + offset;
    return `OP-${String(nextNum).padStart(6, '0')}`;
  } catch (err) {
    console.warn('Erro ao gerar sequencial OP:', err);
    return `OP-${Date.now().toString().slice(-6)}`;
  }
}

// Extrai metadados salvos na string de observações
function parseMetadataFromObs(obs?: string | null) {
  if (!obs) return {};
  const meta: Record<string, string> = {};
  const lines = obs.split('\n');
  for (const line of lines) {
    if (line.startsWith('IBAN:')) meta.iban = line.replace('IBAN:', '').trim();
    if (line.startsWith('Banco:')) meta.banco = line.replace('Banco:', '').trim();
    if (line.startsWith('Titular:')) meta.titular = line.replace('Titular:', '').trim();
    if (line.startsWith('Comp:')) meta.competencia = line.replace('Comp:', '').trim();
    if (line.startsWith('Alojamiento:')) meta.alojamento_nome = line.replace('Alojamiento:', '').trim();
  }
  return meta;
}

export const financeLogisticsService = {
  // 1. Busca todas as Ordens de Pagamento vinculadas à Logística diretamente do banco
  async fetchPagos(): Promise<PagoAlojamento[]> {
    try {
      const { data: ordens, error } = await supabase
        .schema('core_finance')
        .from('ordens_pagamento')
        .select('*')
        .or('departamento_origem.eq.Logística,departamento_origem.eq.Logistica,cod_alojamiento.not.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ordens de pagamento no Supabase:', error);
        throw error;
      }

      if (!ordens || ordens.length === 0) {
        return [];
      }

      // Buscar se há pagamentos vinculados em contas_pagar para resgatar comprovantes e datas
      const opIds = ordens.map(o => o.id);
      let contasPagarMap: Record<string, any> = {};
      try {
        const { data: cpList } = await supabase
          .from('contas_pagar')
          .select('ordem_pagamento_id, dt_pagamento, anexo_url, banco, status, obs_pagamento')
          .in('ordem_pagamento_id', opIds);

        if (cpList) {
          for (const cp of cpList) {
            if (cp.ordem_pagamento_id) {
              contasPagarMap[cp.ordem_pagamento_id] = cp;
            }
          }
        }
      } catch (e) {
        console.warn('Aviso: Não foi possível correlacionar com contas_pagar:', e);
      }

      return ordens.map((op: any): PagoAlojamento => {
        const cp = contasPagarMap[op.id];
        const meta = parseMetadataFromObs(op.observaciones);

        // Mapear status
        let statusUI: PagoAlojamento['status_pago'] = 'Rascunho';
        const stLower = (op.status || '').toLowerCase();
        if (stLower === 'rascunho') statusUI = 'Rascunho';
        else if (stLower === 'aguardando_aprovacao') statusUI = 'Aguardando Aprovação';
        else if (stLower === 'aprovado') statusUI = 'Aprovado';
        else if (stLower === 'pago') statusUI = 'Pago';
        else if (stLower === 'cancelado' || stLower === 'rejeitado') statusUI = 'Cancelado';

        // Centros de custo
        const ccParts = (op.centro_custos || '').split(' / ');
        const clienteCC = ccParts[0] || '';
        const obraCC = ccParts[1] || '';

        // Formatação da competência
        let comp = meta.competencia;
        if (!comp) {
          const compMatch = (op.descricao || '').match(/\((\d{2}\/\d{4})\)/);
          if (compMatch) comp = compMatch[1];
        }

        return {
          id: op.id,
          codigo_pago: op.cod_orden_pago || `OP-${op.id.substring(0, 8)}`,
          contrato_id: op.cod_contrato || undefined,
          alojamento_codigo: op.cod_alojamiento || undefined,
          alojamento_nome: meta.alojamento_nome || op.descricao?.replace(/^(Alquiler|Aluguel|Fianza|Suministro)\s*-\s*/i, '').replace(/\s*\(\d{2}\/\d{4}\)$/, '') || 'Alojamiento',
          provedor_id: op.fornecedor_id || undefined,
          provedor_nome: op.cod_provedor || 'Proveedor',
          iban_cobranca: meta.iban || '',
          banco: meta.banco || cp?.banco || '',
          titular: meta.titular || '',
          centro_custo_cliente: clienteCC,
          centro_custo_obra: obraCC,
          ordem_pagamento_id: op.id,
          tipo_pago: (op.tipo_orden as any) || 'Aluguel',
          status_pago: statusUI,
          periodo_competencia: comp || '09/2026',
          data_emissao: op.created_at ? op.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          data_vencimento: op.data_vencimento || op.fecha_vencto || '',
          data_pagamento: op.fecha_pago ? op.fecha_pago.split('T')[0] : (cp?.dt_pagamento || undefined),
          valor_previsto: Number(op.valor) || 0,
          moeda: 'EUR',
          observacoes: op.observaciones || '',
          anexo_fatura_url: op.anexos || undefined,
          comprovante_url: op.comprovante_geral || cp?.anexo_url || undefined,
          pago_por: op.pago_por || undefined,
          forma_pagamento: cp?.obs_pagamento || undefined
        };
      });
    } catch (err) {
      console.error('Falha ao buscar pagamentos de logística:', err);
      return [];
    }
  },

  // 2. Geração Individual de Ordem de Pagamento (NASCENDO COMO RASCUNHO)
  async gerarOrdemPagamento(payload: {
    contrato_id?: string;
    alojamento_id?: string;
    alojamento_nome?: string;
    alojamento_codigo?: string;
    provedor_id?: string;
    provedor_nome?: string;
    iban_cobranca?: string;
    banco?: string;
    titular?: string;
    centro_custo_cliente?: string;
    centro_custo_obra?: string;
    tipo_pago: PagoAlojamento['tipo_pago'];
    valor: number;
    data_vencimento: string;
    periodo_competencia?: string;
    observacoes?: string;
  }): Promise<PagoAlojamento> {
    const { id: userId, email: userEmail } = await getCurrentUserId();
    const codOrdenPago = await getNextCodOrdenPago(0);

    const compStr = payload.periodo_competencia ? ` (${payload.periodo_competencia})` : '';
    const descricao = `${payload.tipo_pago} - ${payload.alojamento_nome || 'Alojamiento'}${compStr}`;
    const centroCustos = `${payload.centro_custo_cliente || 'Centro de Coste General'} / ${payload.centro_custo_obra || 'Obra Principal'}`;

    const obsCompletas = [
      `Alojamiento: ${payload.alojamento_nome || ''}`,
      payload.iban_cobranca ? `IBAN: ${payload.iban_cobranca}` : null,
      payload.banco ? `Banco: ${payload.banco}` : null,
      payload.titular ? `Titular: ${payload.titular}` : null,
      payload.periodo_competencia ? `Comp: ${payload.periodo_competencia}` : null,
      payload.observacoes ? `Obs: ${payload.observacoes}` : null
    ].filter(Boolean).join('\n');

    // Inserir Header na tabela core_finance.ordens_pagamento
    const { data: newOrdem, error: insertErr } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .insert([{
        cod_orden_pago: codOrdenPago,
        descricao,
        fornecedor_id: payload.provedor_id && /^[0-9a-fA-F-]{36}$/.test(payload.provedor_id) ? payload.provedor_id : null,
        cod_provedor: payload.provedor_nome || 'Proveedor',
        valor: payload.valor,
        data_vencimento: payload.data_vencimento,
        status: 'rascunho', // OPÇÃO B: Nascendo como Rascunho
        criador_id: userId,
        departamento_origem: 'Logística',
        cod_alojamiento: payload.alojamento_codigo || null,
        cod_contrato: payload.contrato_id || null,
        tipo_orden: payload.tipo_pago,
        centro_custos: centroCustos,
        observaciones: obsCompletas,
        qtde_itens: 1
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('Erro ao inserir OP no Supabase:', insertErr);
      throw new Error(`Falha ao gerar Ordem de Pagamento: ${insertErr.message}`);
    }

    // Inserir Item em core_finance.ordens_pagamento_itens
    try {
      await supabase
        .schema('core_finance')
        .from('ordens_pagamento_itens')
        .insert([{
          ordem_pagamento_id: newOrdem.id,
          cod_orden_pago: codOrdenPago,
          cod_orden_pago_item: `${codOrdenPago}-IT-001`,
          cod_contrato: payload.contrato_id || null,
          cod_provedor: payload.provedor_nome || null,
          cod_alojamiento: payload.alojamento_codigo || null,
          categoria_orden: payload.tipo_pago,
          valor_orden: payload.valor,
          vencimento_orden: payload.data_vencimento,
          centro_custo: centroCustos,
          status_item: 'Rascunho'
        }]);
    } catch (itemErr) {
      console.warn('Erro não-bloqueante ao registrar item da OP:', itemErr);
    }

    // Registrar histórico inicial em core_finance.movimentos_pagos
    try {
      await supabase
        .schema('core_finance')
        .from('movimentos_pagos')
        .insert([{
          ordem_pagamento_id: newOrdem.id,
          cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
          tipo_mov: 'Orden Generada',
          estado_mov: 'Rascunho',
          valor_pago: payload.valor,
          observaciones: `Orden de Pago generada en Logística como Rascunho por ${userEmail}`,
          criado_por: userEmail
        }]);
    } catch (movErr) {
      console.warn('Erro não-bloqueante ao registrar log de movimento:', movErr);
    }

    return {
      id: newOrdem.id,
      codigo_pago: codOrdenPago,
      contrato_id: payload.contrato_id,
      alojamento_id: payload.alojamento_id,
      alojamento_nome: payload.alojamento_nome,
      alojamento_codigo: payload.alojamento_codigo,
      provedor_id: payload.provedor_id,
      provedor_nome: payload.provedor_nome,
      iban_cobranca: payload.iban_cobranca,
      banco: payload.banco,
      titular: payload.titular,
      centro_custo_cliente: payload.centro_custo_cliente,
      centro_custo_obra: payload.centro_custo_obra,
      tipo_pago: payload.tipo_pago,
      status_pago: 'Rascunho',
      periodo_competencia: payload.periodo_competencia,
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: payload.data_vencimento,
      valor_previsto: payload.valor,
      moeda: 'EUR',
      observacoes: obsCompletas
    };
  },

  // 3. Geração em Lote a partir dos Contratos Selecionados (NASCENDO COMO RASCUNHO)
  async gerarOrdensPagamentoEmLote(
    payloads: Array<{
      contrato_id?: string;
      alojamento_id?: string;
      alojamento_nome?: string;
      alojamento_codigo?: string;
      provedor_id?: string;
      provedor_nome?: string;
      iban_cobranca?: string;
      banco?: string;
      titular?: string;
      centro_custo_cliente?: string;
      centro_custo_obra?: string;
      tipo_pago: PagoAlojamento['tipo_pago'];
      valor: number;
      data_vencimento: string;
      periodo_competencia?: string;
      observacoes?: string;
    }>
  ): Promise<PagoAlojamento[]> {
    const { id: userId, email: userEmail } = await getCurrentUserId();
    const createdList: PagoAlojamento[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const codOrdenPago = await getNextCodOrdenPago(i);

      const compStr = payload.periodo_competencia ? ` (${payload.periodo_competencia})` : '';
      const descricao = `${payload.tipo_pago} - ${payload.alojamento_nome || 'Alojamiento'}${compStr}`;
      const centroCustos = `${payload.centro_custo_cliente || 'Centro de Coste General'} / ${payload.centro_custo_obra || 'Obra Principal'}`;

      const obsCompletas = [
        `Alojamiento: ${payload.alojamento_nome || ''}`,
        payload.iban_cobranca ? `IBAN: ${payload.iban_cobranca}` : null,
        payload.banco ? `Banco: ${payload.banco}` : null,
        payload.titular ? `Titular: ${payload.titular}` : null,
        payload.periodo_competencia ? `Comp: ${payload.periodo_competencia}` : null,
        payload.observacoes ? `Obs: ${payload.observacoes}` : null
      ].filter(Boolean).join('\n');

      const { data: newOrdem, error: insertErr } = await supabase
        .schema('core_finance')
        .from('ordens_pagamento')
        .insert([{
          cod_orden_pago: codOrdenPago,
          descricao,
          fornecedor_id: payload.provedor_id && /^[0-9a-fA-F-]{36}$/.test(payload.provedor_id) ? payload.provedor_id : null,
          cod_provedor: payload.provedor_nome || 'Proveedor',
          valor: payload.valor,
          data_vencimento: payload.data_vencimento,
          status: 'rascunho', // OPÇÃO B: Rascunho
          criador_id: userId,
          departamento_origem: 'Logística',
          cod_alojamiento: payload.alojamento_codigo || null,
          cod_contrato: payload.contrato_id || null,
          tipo_orden: payload.tipo_pago,
          centro_custos: centroCustos,
          observaciones: obsCompletas,
          qtde_itens: 1
        }])
        .select()
        .single();

      if (insertErr) {
        console.error(`Erro ao gerar OP em lote para ${payload.alojamento_nome}:`, insertErr);
        continue;
      }

      try {
        await supabase
          .schema('core_finance')
          .from('ordens_pagamento_itens')
          .insert([{
            ordem_pagamento_id: newOrdem.id,
            cod_orden_pago: codOrdenPago,
            cod_orden_pago_item: `${codOrdenPago}-IT-001`,
            cod_contrato: payload.contrato_id || null,
            cod_provedor: payload.provedor_nome || null,
            cod_alojamiento: payload.alojamento_codigo || null,
            categoria_orden: payload.tipo_pago,
            valor_orden: payload.valor,
            vencimento_orden: payload.data_vencimento,
            centro_custo: centroCustos,
            status_item: 'Rascunho'
          }]);
      } catch (e) {}

      createdList.push({
        id: newOrdem.id,
        codigo_pago: codOrdenPago,
        contrato_id: payload.contrato_id,
        alojamento_id: payload.alojamento_id,
        alojamento_nome: payload.alojamento_nome,
        alojamento_codigo: payload.alojamento_codigo,
        provedor_id: payload.provedor_id,
        provedor_nome: payload.provedor_nome,
        iban_cobranca: payload.iban_cobranca,
        banco: payload.banco,
        titular: payload.titular,
        centro_custo_cliente: payload.centro_custo_cliente,
        centro_custo_obra: payload.centro_custo_obra,
        tipo_pago: payload.tipo_pago,
        status_pago: 'Rascunho',
        periodo_competencia: payload.periodo_competencia,
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: payload.data_vencimento,
        valor_previsto: payload.valor,
        moeda: 'EUR',
        observacoes: obsCompletas
      });
    }

    return createdList;
  },

  // 4. Edição / Alteração de Ordem de Pagamento
  async atualizarOrdemPagamento(
    id: string,
    updates: {
      valor?: number;
      data_vencimento?: string;
      periodo_competencia?: string;
      provedor_nome?: string;
      iban_cobranca?: string;
      banco?: string;
      titular?: string;
      observacoes?: string;
      centro_custo_cliente?: string;
      centro_custo_obra?: string;
    }
  ): Promise<void> {
    const { email: userEmail } = await getCurrentUserId();
    const updateObj: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.valor !== undefined) updateObj.valor = updates.valor;
    if (updates.data_vencimento) updateObj.data_vencimento = updates.data_vencimento;
    if (updates.provedor_nome) updateObj.cod_provedor = updates.provedor_nome;

    if (updates.centro_custo_cliente || updates.centro_custo_obra) {
      updateObj.centro_custos = `${updates.centro_custo_cliente || ''} / ${updates.centro_custo_obra || ''}`;
    }

    if (updates.observacoes !== undefined || updates.iban_cobranca || updates.periodo_competencia) {
      const obsLines: string[] = [];
      if (updates.iban_cobranca) obsLines.push(`IBAN: ${updates.iban_cobranca}`);
      if (updates.banco) obsLines.push(`Banco: ${updates.banco}`);
      if (updates.titular) obsLines.push(`Titular: ${updates.titular}`);
      if (updates.periodo_competencia) obsLines.push(`Comp: ${updates.periodo_competencia}`);
      if (updates.observacoes) obsLines.push(`Obs: ${updates.observacoes}`);
      if (obsLines.length > 0) updateObj.observaciones = obsLines.join('\n');
    }

    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update(updateObj)
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar OP: ${error.message}`);
    }

    // Atualizar também o item
    try {
      const itemUpdates: Record<string, any> = {};
      if (updates.valor !== undefined) itemUpdates.valor_orden = updates.valor;
      if (updates.data_vencimento) itemUpdates.vencimento_orden = updates.data_vencimento;
      if (updates.centro_custo_cliente || updates.centro_custo_obra) {
        itemUpdates.centro_custo = `${updates.centro_custo_cliente || ''} / ${updates.centro_custo_obra || ''}`;
      }
      if (Object.keys(itemUpdates).length > 0) {
        await supabase
          .schema('core_finance')
          .from('ordens_pagamento_itens')
          .update(itemUpdates)
          .eq('ordem_pagamento_id', id);
      }
    } catch (e) {}

    // Registrar log
    try {
      await supabase
        .schema('core_finance')
        .from('movimentos_pagos')
        .insert([{
          ordem_pagamento_id: id,
          cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
          tipo_mov: 'Modificación',
          estado_mov: 'Alterada',
          valor_pago: updates.valor,
          observaciones: `Orden de pago modificada por ${userEmail}`,
          criado_por: userEmail
        }]);
    } catch (e) {}
  },

  // 5. Exclusão de Ordem de Pagamento (somente em rascunho)
  async excluirOrdemPagamento(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir ordem de pagamento: ${error.message}`);
    }
  },

  // 6. Cancelamento de Ordem de Pagamento
  async cancelarOrdemPagamento(id: string, motivo?: string): Promise<void> {
    const { email: userEmail } = await getCurrentUserId();

    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update({
        status: 'cancelado',
        cancelado_por: userEmail,
        fecha_cancelamento: new Date().toISOString(),
        observaciones_financeiro: motivo ? `Cancelada por Logística: ${motivo}` : 'Cancelada por Logística'
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao cancelar OP: ${error.message}`);
    }

    try {
      await supabase
        .schema('core_finance')
        .from('movimentos_pagos')
        .insert([{
          ordem_pagamento_id: id,
          cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
          tipo_mov: 'Cancelación',
          estado_mov: 'Cancelado',
          observaciones: motivo || 'Cancelada en Logística',
          criado_por: userEmail
        }]);
    } catch (e) {}
  },

  // 7. Envio para Aprovação (Individual ou Lote)
  async enviarParaAprovacao(ids: string | string[]): Promise<void> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    const { email: userEmail } = await getCurrentUserId();

    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update({
        status: 'aguardando_aprovacao',
        updated_at: new Date().toISOString()
      })
      .in('id', idList);

    if (error) {
      throw new Error(`Erro ao enviar OP para aprovação: ${error.message}`);
    }

    for (const opId of idList) {
      try {
        await supabase
          .schema('core_finance')
          .from('movimentos_pagos')
          .insert([{
            ordem_pagamento_id: opId,
            cod_mov: `MOV-${Date.now().toString().slice(-10)}`,
            tipo_mov: 'Envío Aprobación',
            estado_mov: 'Aguardando Aprovação',
            observaciones: `Enviada a aprobación por ${userEmail}`,
            criado_por: userEmail
          }]);
      } catch (e) {}
    }
  },

  // 8. Aprovação direta (para quem possui papel de aprovador/gestor)
  async aprovarOrdemPagamento(id: string): Promise<void> {
    const { id: userId, email: userEmail } = await getCurrentUserId();

    const { error } = await supabase
      .schema('core_finance')
      .from('ordens_pagamento')
      .update({
        status: 'aprovado',
        aprovador_id: userId,
        fecha_aprobacion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao aprovar OP: ${error.message}`);
    }
  },

  // 9. Devolução de Fiança
  async registrarDevolucaoFianza(params: {
    contrato_id?: string;
    alojamento_id?: string;
    alojamento_nome?: string;
    alojamento_codigo?: string;
    provedor_id?: string;
    provedor_nome?: string;
    iban_cobranca?: string;
    banco?: string;
    titular?: string;
    centro_custo_cliente?: string;
    centro_custo_obra?: string;
    valor_devolvido: number;
    valor_danos?: number;
    valor_suministros?: number;
    documentos_url?: string;
    observacoes?: string;
  }): Promise<PagoAlojamento> {
    return this.gerarOrdemPagamento({
      contrato_id: params.contrato_id,
      alojamento_id: params.alojamento_id,
      alojamento_nome: params.alojamento_nome,
      alojamento_codigo: params.alojamento_codigo,
      provedor_id: params.provedor_id,
      provedor_nome: params.provedor_nome,
      iban_cobranca: params.iban_cobranca,
      banco: params.banco,
      titular: params.titular,
      centro_custo_cliente: params.centro_custo_cliente,
      centro_custo_obra: params.centro_custo_obra,
      tipo_pago: 'Fianza_Devolucion',
      valor: params.valor_devolvido,
      data_vencimento: new Date().toISOString().split('T')[0],
      periodo_competencia: '09/2026',
      observacoes: `Reembolso / Devolución de fianza de ${params.alojamento_nome}. Importe devuelto: € ${params.valor_devolvido}. ${params.valor_danos ? `(Daños: € ${params.valor_danos})` : ''} ${params.observacoes || ''}`
    });
  }
};
