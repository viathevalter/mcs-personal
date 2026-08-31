import { registrosService } from './registrosService';
import { logisticsService, type Alojamento, type Provedor } from './logisticsService';

export interface ContratoAlojamento {
  id: string;
  codigo?: string;
  alojamento_id?: string;
  alojamento_nome?: string;
  provedor_id?: string;
  provedor_nome?: string;
  empresa_id?: string;
  empresa_contratante?: string;
  cliente_id?: string;
  cliente_nome?: string;
  centro_custo_obra?: string;
  total_ocupantes?: number;
  ocupantes_nomes?: string;
  status: 'Activo' | 'Cerrado' | 'Pendente_Renovacao';
  tipo_contrato: 'Fijo' | 'Por Trabajador / Habitación' | 'Temporario (Airbnb / Booking)' | 'Hotel / Pensión' | 'Auxilio_moradia';
  data_inicio?: string;
  data_fim?: string;
  valor_mensal: number;
  valor_por_pessoa?: number;
  dia_vencimento: number;
  tem_fianza?: boolean;
  fianza_valor: number;
  fianza_meses: number;
  renovacao_automatica: boolean;
  aviso_rescisao_dias: number;
  metodo_pago?: string;
  iban_cobranca?: string;
  banco?: string;
  swift?: string;
  titular?: string;
  observacoes?: string;
  alojamento?: Alojamento;
  provedor?: Provedor;
}

export const contratosLogisticsService = {
  async fetchContratos(): Promise<ContratoAlojamento[]> {
    try {
      const [alojamentos, alocacoesAtivas] = await Promise.all([
        registrosService.fetchAlojamentos(),
        logisticsService.fetchAlocacoesAtivas()
      ]);

      const activeOccupants = alocacoesAtivas.filter(a => a.status !== 'Checkout');

      return alojamentos.map((a: Alojamento) => {
        const comod = a.comodidades || {};
        const cont = a.contrato || (comod as any).__contrato || {};
        const prov = a.provedor;

        const codigoContrato = cont.codigo || (`CT-2026/` + (a.codigo ? a.codigo.replace(/[^0-9]/g, '') : Math.floor(1000 + Math.random() * 9000)));
        const valor = Number(a.valor_mensal || a.custo_mensal_total || cont.valor_mensal || 0);
        const fianza = Number(cont.fianza_valor || 0);

        // Mapear ocupantes ativos neste alojamento
        const occupants = activeOccupants.filter(aloc => 
          (aloc.alojamento_id && aloc.alojamento_id === a.id) ||
          (aloc.alojamento_codigo && aloc.alojamento_codigo === a.codigo) ||
          (aloc.alojamento_nome && (aloc.alojamento_nome === a.nome || aloc.alojamento_nome === a.titulo))
        );

        let clienteNome = '';
        let empresaContratante = '';
        let ocupantesNomes = '';

        if (occupants.length > 0) {
          const uniqueClients = Array.from(new Set(occupants.map(o => o.cliente_nome).filter(Boolean)));
          const uniqueEmpresas = Array.from(new Set(occupants.map(o => o.empresa_contratante).filter(Boolean)));
          clienteNome = uniqueClients.join(', ');
          empresaContratante = uniqueEmpresas.join(', ');
          ocupantesNomes = occupants.map(o => `${o.worker_nome} (${o.codigo_colab || 'E-XXXX'})`).join(', ');
        }

        if (!clienteNome) {
          clienteNome = cont.cliente_nome || a.cliente_nome || (a.municipio ? `Obra ${a.municipio}` : 'Centro de Coste General');
        }

        if (!empresaContratante) {
          empresaContratante = cont.empresa_contratante || a.empresa_contratante || 'LUMINOUS';
        }

        return {
          id: a.id,
          codigo: codigoContrato,
          alojamento_id: a.id,
          alojamento_nome: a.nome || a.titulo,
          provedor_id: a.provedor_id,
          provedor_nome: prov?.nome_razao_social || 'Proveedor',
          cliente_nome: clienteNome,
          empresa_contratante: empresaContratante,
          centro_custo_obra: `Obra ${a.municipio || a.provincia || 'Principal'}`,
          total_ocupantes: occupants.length,
          ocupantes_nomes: ocupantesNomes,
          status: (cont.status as any) || (a.status === 'Inactivo' || a.status === 'inativo' ? 'Cerrado' : 'Activo'),
          tipo_contrato: (cont.tipo_contrato as any) || (a.tipo_alojamento as any) || 'Fijo',
          data_inicio: cont.data_inicio || '2026-09-01',
          data_fim: cont.data_fim || '',
          dia_vencimento: cont.dia_vencimento || 5,
          valor_mensal: valor,
          valor_por_pessoa: cont.valor_por_pessoa || 0,
          tem_fianza: cont.tem_fianza ?? (fianza > 0),
          fianza_valor: fianza,
          fianza_meses: cont.fianza_meses || (fianza > 0 ? 1 : 0),
          renovacao_automatica: cont.renovacao_automatica ?? true,
          aviso_rescisao_dias: cont.aviso_renovacao_dias || 5,
          metodo_pago: cont.metodo_pago || prov?.metodo_pago || 'Transferir',
          banco: cont.banco || prov?.banco || '',
          iban_cobranca: cont.iban || prov?.iban || '',
          swift: cont.swift || prov?.swift || '',
          titular: cont.titular || prov?.titular_conta || prov?.nome_razao_social || '',
          observacoes: a.observacoes || '',
          alojamento: a,
          provedor: prov as any
        };
      });
    } catch (error) {
      console.error('Erro ao buscar contratos dos alojamentos:', error);
      return [];
    }
  },

  async updateContrato(id: string, contrato: Partial<ContratoAlojamento>): Promise<void> {
    const existing = await registrosService.fetchAlojamentoById(id);
    if (!existing) return;

    const currentComod = existing.comodidades || {};
    const currentCont = existing.contrato || (currentComod as any).__contrato || {};

    const updatedContrato = {
      ...currentCont,
      ...contrato,
      status: contrato.status || currentCont.status,
      valor_mensal: contrato.valor_mensal ?? currentCont.valor_mensal,
      fianza_valor: contrato.fianza_valor ?? currentCont.fianza_valor,
    };

    await registrosService.updateAlojamento(id, {
      ...existing,
      valor_mensal: contrato.valor_mensal ?? existing.valor_mensal,
      contrato: updatedContrato as any
    });
  }
};
