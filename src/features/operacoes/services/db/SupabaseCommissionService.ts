import { supabase } from '../supabaseClient';
import type {  CommissionGenerated, CommissionLancamento, CommissionSettings, CommissionAdjustmentType  } from '../../types/models';

export const commissionService = {
    // Fetch settings
    async getSettings(): Promise<CommissionSettings | null> {
        const { data, error } = await supabase
            .from('mcs_comissoes_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching commission settings:', error);
            return null;
        }
        return data;
    },

    // Update Settings (Admin Only)
    async updateSettings(settings: Partial<CommissionSettings>): Promise<void> {
        const { error } = await supabase
            .from('mcs_comissoes_settings')
            .update(settings)
            .eq('id', 1);

        if (error) throw error;
    },

    // Fetch pending commissions (from View)
    async getComissoesGeradas(startDate?: string, endDate?: string, vendedorEmail?: string): Promise<CommissionGenerated[]> {
        let query = supabase.from('vw_comissoes_geradas').select('*');

        if (startDate) {
            query = query.gte('data_referencia', startDate);
        }
        if (endDate) {
            query = query.lte('data_referencia', endDate);
        }
        if (vendedorEmail) {
            query = query.eq('vendedor_email', vendedorEmail);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as CommissionGenerated[];
    },

    // Fetch ledger (payments and manual adjustments)
    async getLancamentos(startDate?: string, endDate?: string, vendedorEmail?: string): Promise<CommissionLancamento[]> {
        let query = supabase.from('mcs_comissoes_lancamentos').select('*');

        if (startDate) {
            // Assumimos que a data base para filtragem será o created_at (data do lançamento do pagamento/ajuste)
            // Se fosse pela referência do mês (ex: pagou retroativamente), teremos que analisar a regra.
            // Para manter a visão de fluxo de caixa, o date range vai usar created_at para exibir os pagamentos DAQUELE período.
            query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
        }
        if (vendedorEmail) {
            query = query.eq('vendedor_email', vendedorEmail);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as CommissionLancamento[];
    },

    // Pay multiple commissions
    async registerPayments(
        payments: { id: string, email: string, name: string, mes_referencia: string, valor: number }[],
        adminId: string
    ): Promise<void> {
        const records = payments.map(p => ({
            vendedor_email: p.email,
            vendedor_nome: p.name,
            tipo: 'pagamento' as CommissionAdjustmentType,
            mes_referencia: p.mes_referencia,
            valor: p.valor,
            referencia_id: p.id,
            descricao: `Pagamento automático Ref: ${p.id}`,
            created_by: adminId
        }));

        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .insert(records);

        if (error) throw error;
    },

    // Insert a single manual adjustment
    async insertAdjustment(
        email: string,
        name: string,
        mesReferencia: string,
        tipo: 'ajuste_positivo' | 'ajuste_negativo',
        valor: number,
        descricao: string,
        adminId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .insert([{
                vendedor_email: email,
                vendedor_nome: name,
                tipo,
                mes_referencia: mesReferencia,
                valor,
                descricao,
                created_by: adminId
            }]);

        if (error) throw error;
    },

    async deleteLancamento(id: string): Promise<void> {
        const { error } = await supabase
            .from('mcs_comissoes_lancamentos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
