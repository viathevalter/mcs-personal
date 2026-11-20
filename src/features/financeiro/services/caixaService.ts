import { supabase } from '@/shared/supabase/client';
import { fetchCartoes } from '../data/loader';
import type { CartaoCorporativo } from '../types';

export interface MoedaOption {
    code: string;
    label: string;
    symbol: string;
    flag: string;
    locale: string;
}

export const MOEDAS_CAIXA: MoedaOption[] = [
    { code: 'EUR', label: 'Euro (EUR)', symbol: '€', flag: '🇪🇺', locale: 'pt-PT' },
    { code: 'PLN', label: 'Złoty Polonês (PLN)', symbol: 'PLN', flag: '🇵🇱', locale: 'pl-PL' },
    { code: 'GBP', label: 'Libra Esterlina (GBP)', symbol: '£', flag: '🇬🇧', locale: 'en-GB' },
    { code: 'USD', label: 'Dólar Americano (USD)', symbol: '$', flag: '🇺🇸', locale: 'en-US' },
    { code: 'BRL', label: 'Real Brasileiro (BRL)', symbol: 'R$', flag: '🇧🇷', locale: 'pt-BR' },
];

export const getMoedaInfo = (code?: string | null): MoedaOption => {
    const normalized = (code || 'EUR').toUpperCase();
    return MOEDAS_CAIXA.find(m => m.code === normalized) || MOEDAS_CAIXA[0];
};

export const formatCurrencyByCode = (val: number, moeda?: string | null): string => {
    const code = (moeda || 'EUR').toUpperCase();
    const num = Number.isFinite(val) ? val : 0;
    try {
        if (code === 'PLN') {
            return `${new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)} PLN`;
        }
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: code }).format(num);
    } catch {
        return `${num.toFixed(2)} ${code}`;
    }
};

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CaixaDespesa {
    id: string;
    nombre: string;
    trabajador_id: string;
    id_empresa: string | null;
    status: 'Ativo' | 'Inativo';
    created_at?: string;

    // Novo modelo com Cartão Corporativo e Fechamento
    tipo_fundo?: 'dinheiro' | 'cartao';
    cartao_id?: string | null;
    conta_pagar_id?: string | number | null;
    fechado_em?: string | null;
    fechado_por?: string | null;
    centro_custo?: string | null;
    cat_despesa?: string | null;
    cartao?: CartaoCorporativo | null;

    // Multi-moeda
    moeda: string;
    taxa_cambio: number;
    taxa_cambio_efetiva: number;

    // Virtual fields
    trabajador?: {
        Nombre: string;
        Cod_colab: string;
        email?: string;
        tipo?: 'escritorio' | 'campo';
    } | null;
    empresa?: {
        id: string;
        nome: string;
    } | null;

    // Valores na moeda do caixa (local)
    saldo: number;
    total_recargas: number;
    total_despesas: number;

    // Valores equivalentes em EUR (contabilidade da empresa)
    saldo_eur: number;
    total_recargas_eur: number;
    total_taxas_bancarias_eur: number;
    total_recargas_liquido_eur: number;
    total_despesas_eur: number;
}

export interface CaixaRecarga {
    id: string;
    caixa_id: string;
    valor: number; // Valor creditado na moeda do caixa
    valor_eur?: number | null; // Valor total transferido em EUR
    taxa_bancaria_eur?: number | null; // Taxa bancária em EUR descontada na remessa
    taxa_cambio?: number | null; // Cotação aplicada (1 EUR líquido = X moeda local)
    data_recarga: string;
    comprovante_url?: string | null;
    observacoes?: string | null;
    ordem_pagamento_id?: string | null;
    created_at?: string;
    op_status?: string | null;
}

export interface CaixaDespesaRegistro {
    id: string;
    caixa_id: string;
    valor: number; // Valor gasto na moeda do caixa
    valor_eur?: number | null; // Equivalente em EUR
    taxa_cambio?: number | null; // Cotação utilizada no lançamento
    data_despesa: string;
    categoria: 'Combustível' | 'Alimentação' | 'Alojamento' | 'Viagem/Transporte' | 'Manutenção' | 'Outros';
    coche_id?: string | null;
    id_empresa?: string | null;
    comprovante_url?: string | null;
    descricao?: string | null;
    created_at?: string;

    // Virtual fields
    coche?: {
        id: string;
        matricula: string;
        marca: string;
        modelo: string;
    } | null;
    empresa?: {
        id: string;
        nome: string;
    } | null;
}

export interface MovimentoExtrato {
    id: string;
    caixa_id: string;
    tipo: 'entrada' | 'saida';
    valor: number;
    valor_eur: number;
    taxa_bancaria_eur?: number;
    taxa_cambio?: number;
    moeda: string;
    data: string;
    descricao: string;
    categoria?: string;
    comprovante_url?: string | null;
    coche_id?: string | null;
    id_empresa?: string | null;
    created_at?: string;
    status_pagamento?: string | null;
    runningBalance?: number;
    runningBalanceEur?: number;
    coche?: {
        matricula: string;
        marca: string;
        modelo: string;
    } | null;
}

export interface ColaboradorOption {
    id: string;
    nome: string;
    identificador: string;
    email?: string;
}

export const caixaService = {
    // 1. Obter funcionários do escritório
    async getColaboradores(): Promise<ColaboradorOption[]> {
        try {
            const { data: users, error } = await supabase
                .schema('core_operacoes')
                .from('users')
                .select('id, display_name, email')
                .order('display_name', { ascending: true });

            if (error) throw error;
            if (!users || users.length === 0) return [];

            return users.map(u => ({
                id: u.id,
                nome: u.display_name || u.email || 'Funcionário',
                identificador: u.email || u.id,
                email: u.email
            }));
        } catch (err) {
            console.error('Erro ao buscar funcionários do escritório:', err);
            return [];
        }
    },

    // 2. Obter empresas
    async getEmpresas(): Promise<{ id: string; nome: string }[]> {
        try {
            const { data, error } = await supabase
                .schema('core_common')
                .from('empresas')
                .select('id, nome')
                .order('nome', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao buscar empresas:', err);
            return [];
        }
    },

    // 3. Obter coches / veículos
    async getCoches(): Promise<{ id: string; matricula: string; marca: string; modelo: string }[]> {
        try {
            const { data, error } = await supabase
                .from('coches')
                .select('id, matricula, marca, modelo')
                .order('matricula', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao buscar coches:', err);
            return [];
        }
    },

    // 4. Obter todos os caixas com dados agregados (Local + EUR)
    async getCaixas(): Promise<CaixaDespesa[]> {
        try {
            const { data: caixas, error: caixasErr } = await supabase
                .from('caixas_despesas')
                .select('*')
                .order('created_at', { ascending: false });

            if (caixasErr) throw caixasErr;
            if (!caixas || caixas.length === 0) return [];

            const [colabs, empresas, cartoes, recargasRes, despesasRes, opsRes] = await Promise.all([
                this.getColaboradores(),
                this.getEmpresas(),
                fetchCartoes(),
                supabase.from('caixas_recargas').select('*'),
                supabase.from('caixas_despesas_registros').select('*'),
                supabase.schema('core_finance').from('ordens_pagamento').select('id, status')
            ]);

            const mRecargas = recargasRes.data || [];
            const mDespesas = despesasRes.data || [];
            const mOps = opsRes.data || [];

            return caixas.map((caixa: any) => {
                const colab = colabs.find(c => c.id === caixa.trabajador_id) || null;
                const emp = empresas.find(e => e.id === caixa.id_empresa) || null;
                const cartao = cartoes.find(ct => ct.id === caixa.cartao_id) || null;
                const moeda = (caixa.moeda || 'EUR').toUpperCase();
                const isForeign = moeda !== 'EUR';

                // Recargas válidas (sem OP ou com OP com status 'pago')
                const recargasValidas = mRecargas
                    .filter((r: any) => r.caixa_id === caixa.id)
                    .filter((r: any) => {
                        if (!r.ordem_pagamento_id) return true;
                        const op = mOps.find((o: any) => o.id === r.ordem_pagamento_id);
                        return op ? op.status === 'pago' : false;
                    });

                const totalRecargas = recargasValidas.reduce((sum: number, r: any) => sum + Number(r.valor || 0), 0);
                const totalRecargasEur = recargasValidas.reduce((sum: number, r: any) => {
                    const vEur = r.valor_eur != null ? Number(r.valor_eur) : Number(r.valor || 0);
                    return sum + vEur;
                }, 0);
                const totalTaxasBancariasEur = recargasValidas.reduce((sum: number, r: any) => {
                    return sum + Number(r.taxa_bancaria_eur || 0);
                }, 0);
                const totalRecargasLiquidoEur = Math.max(0, totalRecargasEur - totalTaxasBancariasEur);

                // Taxa de câmbio ponderada do caixa (1 EUR líquido = X moeda local)
                let taxaCambio = 1;
                let taxaCambioEfetiva = 1;
                if (isForeign) {
                    if (totalRecargas > 0 && totalRecargasLiquidoEur > 0) {
                        taxaCambio = totalRecargas / totalRecargasLiquidoEur;
                    } else if (Number(caixa.taxa_cambio) > 0) {
                        taxaCambio = Number(caixa.taxa_cambio);
                    }
                    taxaCambioEfetiva = (totalRecargas > 0 && totalRecargasEur > 0)
                        ? totalRecargas / totalRecargasEur
                        : taxaCambio;
                }

                const despesasCaixa = mDespesas.filter((d: any) => d.caixa_id === caixa.id);
                const totalDespesas = despesasCaixa.reduce((sum: number, d: any) => sum + Number(d.valor || 0), 0);
                const totalDespesasEur = isForeign
                    ? despesasCaixa.reduce((sum: number, d: any) => {
                        if (d.valor_eur != null && Number(d.valor_eur) > 0) {
                            return sum + Number(d.valor_eur);
                        }
                        const rate = Number(d.taxa_cambio) > 0 ? Number(d.taxa_cambio) : taxaCambio;
                        return sum + (rate > 0 ? Number(d.valor || 0) / rate : Number(d.valor || 0));
                    }, 0)
                    : totalDespesas;

                const saldo = totalRecargas - totalDespesas;
                const saldoEur = isForeign
                    ? (taxaCambio > 0 ? saldo / taxaCambio : saldo)
                    : saldo;

                return {
                    ...caixa,
                    moeda,
                    taxa_cambio: taxaCambio,
                    taxa_cambio_efetiva: taxaCambioEfetiva,
                    tipo_fundo: caixa.tipo_fundo || 'dinheiro',
                    cartao_id: caixa.cartao_id,
                    cartao: cartao,
                    conta_pagar_id: caixa.conta_pagar_id,
                    fechado_em: caixa.fechado_em,
                    fechado_por: caixa.fechado_por,
                    centro_custo: caixa.centro_custo,
                    cat_despesa: caixa.cat_despesa,
                    trabajador: colab ? {
                        Nombre: colab.nome,
                        Cod_colab: colab.identificador,
                        email: colab.email
                    } : {
                        Nombre: 'Funcionário',
                        Cod_colab: caixa.trabajador_id
                    },
                    empresa: emp ? { id: emp.id, nome: emp.nome } : (cartao?.empresa_nome ? { id: String(cartao.empresa_id), nome: cartao.empresa_nome } : null),
                    saldo: round2(saldo),
                    total_recargas: round2(totalRecargas),
                    total_despesas: round2(totalDespesas),
                    saldo_eur: round2(saldoEur),
                    total_recargas_eur: round2(totalRecargasEur),
                    total_taxas_bancarias_eur: round2(totalTaxasBancariasEur),
                    total_recargas_liquido_eur: round2(totalRecargasLiquidoEur),
                    total_despesas_eur: round2(totalDespesasEur)
                };
            });
        } catch (err) {
            console.error('Erro no caixaService.getCaixas:', err);
            return [];
        }
    },

    // 5. Obter caixas de um funcionário específico (pelo ID do usuário ou email)
    async getCaixasDoFuncionario(userId: string, userEmail?: string): Promise<CaixaDespesa[]> {
        const all = await this.getCaixas();
        const cleanEmail = (userEmail || '').toLowerCase().trim();
        const cleanNormalized = cleanEmail.replace('@gestaologin.pro', '@gestaologinpro.com');

        return all.filter(c => {
            const matchesId = c.trabajador_id === userId;
            const cEmail = (c.trabajador?.email || '').toLowerCase().trim();
            const matchesEmail = Boolean(cEmail && (cEmail === cleanEmail || cEmail === cleanNormalized));
            const matchesOmar = cleanEmail.includes('omar') && (c.nombre.toLowerCase().includes('omar') || (c.trabajador?.Nombre || '').toLowerCase().includes('omar'));
            return matchesId || matchesEmail || matchesOmar;
        });
    },

    // 6. Obter um caixa específico por ID
    async getCaixaById(id: string): Promise<CaixaDespesa | null> {
        try {
            const caixas = await this.getCaixas();
            return caixas.find(c => c.id === id) || null;
        } catch (err) {
            console.error('Erro ao buscar caixa por ID:', err);
            return null;
        }
    },

    // 6. Criar novo caixa (com suporte multi-moeda e taxa bancária)
    async createCaixa(caixa: {
        nombre: string;
        trabajador_id: string;
        id_empresa?: string | null;
        status?: 'Ativo' | 'Inativo';
        saldo_inicial?: number; // Na moeda do caixa (ex: 891.40 PLN ou 200 EUR)
        saldo_inicial_eur?: number; // Total transferido em EUR (ex: 200 EUR)
        taxa_bancaria_eur?: number; // Taxa bancária em EUR (ex: 5 EUR)
        moeda?: string;
        taxa_cambio?: number;
        tipo_fundo?: 'dinheiro' | 'cartao';
        cartao_id?: string | null;
    }): Promise<CaixaDespesa> {
        const {
            saldo_inicial = 0,
            saldo_inicial_eur,
            taxa_bancaria_eur = 0,
            moeda = 'EUR',
            taxa_cambio = 1,
            tipo_fundo = 'dinheiro',
            cartao_id = null,
            ...dadosCaixa
        } = caixa;

        const cleanMoeda = (moeda || 'EUR').toUpperCase();
        const isForeign = cleanMoeda !== 'EUR';
        const resolvedValorEur = isForeign
            ? (saldo_inicial_eur != null && saldo_inicial_eur > 0 ? saldo_inicial_eur : (taxa_cambio > 0 ? saldo_inicial / taxa_cambio : saldo_inicial))
            : saldo_inicial;
        const netEur = Math.max(0, resolvedValorEur - (taxa_bancaria_eur || 0));
        const resolvedRate = isForeign
            ? (saldo_inicial > 0 && netEur > 0 ? saldo_inicial / netEur : (taxa_cambio > 0 ? taxa_cambio : 1))
            : 1;

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const safeIdEmpresa = (dadosCaixa.id_empresa && UUID_REGEX.test(dadosCaixa.id_empresa))
            ? dadosCaixa.id_empresa
            : null;
        const safeCartaoId = (cartao_id && UUID_REGEX.test(cartao_id))
            ? cartao_id
            : null;

        const { data, error } = await supabase
            .from('caixas_despesas')
            .insert([{
                ...dadosCaixa,
                id_empresa: safeIdEmpresa,
                tipo_fundo,
                cartao_id: safeCartaoId,
                moeda: cleanMoeda,
                taxa_cambio: Number(resolvedRate.toFixed(6)),
                status: dadosCaixa.status || 'Ativo'
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar caixa:', error);
            throw error;
        }

        if (saldo_inicial > 0) {
            const obsParts = ['Saldo inicial na abertura do caixa.'];
            if (isForeign) {
                obsParts.push(`Remessa: ${formatCurrencyByCode(resolvedValorEur, 'EUR')}`);
                if (taxa_bancaria_eur > 0) {
                    obsParts.push(`Taxa bancária: ${formatCurrencyByCode(taxa_bancaria_eur, 'EUR')}`);
                }
                obsParts.push(`Cotação: 1 EUR = ${resolvedRate.toFixed(4)} ${cleanMoeda}`);
            }

            await this.addRecarga({
                caixa_id: data.id,
                valor: saldo_inicial,
                valor_eur: round2(resolvedValorEur),
                taxa_bancaria_eur: round2(taxa_bancaria_eur || 0),
                taxa_cambio: Number(resolvedRate.toFixed(6)),
                data_recarga: new Date().toISOString().split('T')[0],
                observacoes: obsParts.join(' '),
                gerar_op: false
            });
        }

        return {
            ...data,
            moeda: cleanMoeda,
            taxa_cambio: resolvedRate,
            taxa_cambio_efetiva: (isForeign && saldo_inicial > 0 && resolvedValorEur > 0) ? (saldo_inicial / resolvedValorEur) : resolvedRate,
            saldo: round2(saldo_inicial),
            total_recargas: round2(saldo_inicial),
            total_despesas: 0,
            saldo_eur: round2(netEur),
            total_recargas_eur: round2(resolvedValorEur),
            total_taxas_bancarias_eur: round2(taxa_bancaria_eur || 0),
            total_recargas_liquido_eur: round2(netEur),
            total_despesas_eur: 0
        };
    },

    // 7. Atualizar caixa (ex: nome, funcionário, empresa, cartão, status, moeda, taxa_cambio)
    async updateCaixa(id: string, dados: Partial<CaixaDespesa>): Promise<any> {
        const {
            trabajador,
            empresa,
            saldo,
            total_recargas,
            total_despesas,
            saldo_eur,
            total_recargas_eur,
            total_taxas_bancarias_eur,
            total_recargas_liquido_eur,
            total_despesas_eur,
            taxa_cambio_efetiva,
            cartao,
            ...cleanData
        } = dados as any;

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if ('id_empresa' in cleanData) {
            cleanData.id_empresa = (cleanData.id_empresa && UUID_REGEX.test(cleanData.id_empresa))
                ? cleanData.id_empresa
                : null;
        }
        if ('cartao_id' in cleanData) {
            cleanData.cartao_id = (cleanData.cartao_id && UUID_REGEX.test(cleanData.cartao_id))
                ? cleanData.cartao_id
                : null;
        }

        const { data, error } = await supabase
            .from('caixas_despesas')
            .update(cleanData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar caixa:', error);
            throw error;
        }
        return data;
    },

    // 7.1 Excluir caixa e seus registros vinculados
    async deleteCaixa(id: string): Promise<boolean> {
        try {
            await supabase.from('caixas_despesas_registros').delete().eq('caixa_id', id);
            await supabase.from('caixas_recargas').delete().eq('caixa_id', id);

            const { error } = await supabase
                .from('caixas_despesas')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Erro ao excluir caixa:', error);
                throw error;
            }
            return true;
        } catch (err) {
            console.error('Erro no deleteCaixa:', err);
            throw err;
        }
    },

    // 8. Buscar recargas de um caixa
    async getRecargas(caixaId: string): Promise<(CaixaRecarga & { op_status?: string | null })[]> {
        const { data: recargas, error } = await supabase
            .from('caixas_recargas')
            .select('*')
            .eq('caixa_id', caixaId)
            .order('data_recarga', { ascending: false });

        if (error) {
            console.error('Erro ao buscar recargas:', error);
            return [];
        }
        if (!recargas || recargas.length === 0) return [];

        const { data: ops } = await supabase
            .schema('core_finance')
            .from('ordens_pagamento')
            .select('id, status');

        const mOps = ops || [];
        return recargas.map((r: any) => {
            const op = mOps.find((o: any) => o.id === r.ordem_pagamento_id);
            return {
                ...r,
                op_status: op ? op.status : null
            };
        });
    },

    // 9. Adicionar recarga (com suporte multi-moeda e taxa bancária)
    async addRecarga(recarga: {
        caixa_id: string;
        valor: number; // Na moeda do caixa
        valor_eur?: number; // Total em EUR transferido
        taxa_bancaria_eur?: number; // Taxa bancária em EUR
        taxa_cambio?: number; // Cotação da remessa
        data_recarga?: string;
        comprovante_url?: string | null;
        observacoes?: string | null;
        gerar_op?: boolean;
        id_empresa?: string | null;
    }): Promise<CaixaRecarga> {
        const { gerar_op = false, id_empresa, ...dadosRecarga } = recarga;
        let ordemPagamentoId: string | null = null;

        const { data: caixaInfo } = await supabase
            .from('caixas_despesas')
            .select('nombre, trabajador_id, id_empresa, moeda, taxa_cambio')
            .eq('id', recarga.caixa_id)
            .single();

        const moeda = (caixaInfo?.moeda || 'EUR').toUpperCase();
        const isForeign = moeda !== 'EUR';
        const taxaBancaria = Number(recarga.taxa_bancaria_eur || 0);
        const valorEur = isForeign
            ? Number(recarga.valor_eur ?? (Number(caixaInfo?.taxa_cambio) > 0 ? recarga.valor / Number(caixaInfo.taxa_cambio) : recarga.valor))
            : recarga.valor;
        const netEur = Math.max(0, valorEur - taxaBancaria);
        const taxaCambio = isForeign
            ? (recarga.taxa_cambio && recarga.taxa_cambio > 0
                ? recarga.taxa_cambio
                : (netEur > 0 ? recarga.valor / netEur : Number(caixaInfo?.taxa_cambio || 1)))
            : 1;

        if (gerar_op) {
            try {
                const opObs = isForeign
                    ? `${recarga.observacoes || 'Recarga de fundo de caixa'} | Creditado: ${formatCurrencyByCode(recarga.valor, moeda)} (Taxa bancária: ${formatCurrencyByCode(taxaBancaria, 'EUR')} | Cotação: 1 EUR = ${taxaCambio.toFixed(4)} ${moeda})`
                    : (recarga.observacoes || 'Recarga de fundo de caixa');

                const { data: opData, error: opErr } = await supabase
                    .schema('core_finance')
                    .from('ordens_pagamento')
                    .insert([{
                        descricao: `Recarga Fundo de Caixa - ${caixaInfo?.nombre || 'Viagem'}`,
                        valor: round2(valorEur),
                        data_vencimento: recarga.data_recarga || new Date().toISOString().split('T')[0],
                        id_empresa: id_empresa || caixaInfo?.id_empresa || null,
                        tipo_orden: 'caixas_recargas',
                        status: 'aguardando_aprovacao',
                        observaciones: opObs
                    }])
                    .select('id')
                    .single();

                if (!opErr && opData) {
                    ordemPagamentoId = opData.id;
                }
            } catch (err) {
                console.warn('Não foi possível gerar OP automática:', err);
            }
        }

        const { data, error } = await supabase
            .from('caixas_recargas')
            .insert([{
                ...dadosRecarga,
                valor: round2(recarga.valor),
                valor_eur: round2(valorEur),
                taxa_bancaria_eur: round2(taxaBancaria),
                taxa_cambio: Number(taxaCambio.toFixed(6)),
                data_recarga: dadosRecarga.data_recarga || new Date().toISOString().split('T')[0],
                ordem_pagamento_id: ordemPagamentoId
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar recarga:', error);
            throw error;
        }

        // Atualiza a taxa média ponderada no registro do caixa (quando moeda estrangeira)
        if (isForeign) {
            try {
                const todasRecargas = await this.getRecargas(recarga.caixa_id);
                const validas = todasRecargas.filter(r => !r.ordem_pagamento_id || r.op_status === 'pago');
                const totLocal = validas.reduce((s, r) => s + Number(r.valor || 0), 0);
                const totNetEur = validas.reduce((s, r) => {
                    const vEur = r.valor_eur != null ? Number(r.valor_eur) : Number(r.valor || 0);
                    const fee = Number(r.taxa_bancaria_eur || 0);
                    return s + Math.max(0, vEur - fee);
                }, 0);
                if (totLocal > 0 && totNetEur > 0) {
                    const avgRate = Number((totLocal / totNetEur).toFixed(6));
                    await supabase
                        .from('caixas_despesas')
                        .update({ taxa_cambio: avgRate })
                        .eq('id', recarga.caixa_id);
                }
            } catch (err) {
                console.warn('Não foi possível atualizar taxa média do caixa:', err);
            }
        }

        return data;
    },

    // 10. Buscar despesas de um caixa
    async getDespesasRegistros(caixaId: string): Promise<CaixaDespesaRegistro[]> {
        try {
            const { data: despesas, error } = await supabase
                .from('caixas_despesas_registros')
                .select('*')
                .eq('caixa_id', caixaId)
                .order('data_despesa', { ascending: false });

            if (error) throw error;
            if (!despesas || despesas.length === 0) return [];

            const [coches, empresas] = await Promise.all([
                this.getCoches(),
                this.getEmpresas()
            ]);

            return despesas.map((d: any) => {
                const coche = coches.find(c => c.id === d.coche_id) || null;
                const emp = empresas.find(e => e.id === d.id_empresa) || null;
                return {
                    ...d,
                    coche: coche ? { id: coche.id, matricula: coche.matricula, marca: coche.marca, modelo: coche.modelo } : null,
                    empresa: emp ? { id: emp.id, nome: emp.nome } : null
                };
            });
        } catch (err) {
            console.error('Erro ao buscar registros de despesas:', err);
            return [];
        }
    },

    // 11. Adicionar despesa (converte automaticamente para EUR pela cotação do caixa)
    async addDespesa(despesa: {
        caixa_id: string;
        valor: number; // Valor gasto na moeda do caixa
        valor_eur?: number;
        taxa_cambio?: number;
        data_despesa?: string;
        categoria: 'Combustível' | 'Alimentação' | 'Alojamento' | 'Viagem/Transporte' | 'Manutenção' | 'Outros';
        coche_id?: string | null;
        id_empresa?: string | null;
        comprovante_url?: string | null;
        descricao?: string | null;
    }): Promise<CaixaDespesaRegistro> {
        let rate = despesa.taxa_cambio;
        let valorEur = despesa.valor_eur;

        if (!rate || !valorEur) {
            const caixa = await this.getCaixaById(despesa.caixa_id);
            const moeda = (caixa?.moeda || 'EUR').toUpperCase();
            rate = moeda === 'EUR' ? 1 : (caixa?.taxa_cambio && caixa.taxa_cambio > 0 ? caixa.taxa_cambio : 1);
            valorEur = moeda === 'EUR' ? despesa.valor : round2(despesa.valor / rate);
        }

        const { data, error } = await supabase
            .from('caixas_despesas_registros')
            .insert([{
                ...despesa,
                valor: round2(despesa.valor),
                taxa_cambio: Number((rate || 1).toFixed(6)),
                valor_eur: round2(valorEur),
                data_despesa: despesa.data_despesa || new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar despesa:', error);
            throw error;
        }
        return data;
    },

    // 12. Deletar despesa
    async deleteDespesa(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('caixas_despesas_registros')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Erro ao deletar despesa:', error);
            throw error;
        }
        return true;
    },

    // 13. Extrato consolidado com saldo dinâmico (Local + EUR)
    async getExtratoCompleto(caixaId: string, caixaRef?: CaixaDespesa | null): Promise<MovimentoExtrato[]> {
        try {
            const [caixaData, recargas, despesas, coches] = await Promise.all([
                caixaRef ? Promise.resolve(caixaRef) : this.getCaixaById(caixaId),
                this.getRecargas(caixaId),
                this.getDespesasRegistros(caixaId),
                this.getCoches()
            ]);

            const moeda = (caixaData?.moeda || 'EUR').toUpperCase();
            const isForeign = moeda !== 'EUR';
            const fallbackRate = caixaData?.taxa_cambio && caixaData.taxa_cambio > 0 ? caixaData.taxa_cambio : 1;

            const movimentos: MovimentoExtrato[] = [];

            recargas.forEach(r => {
                const isPendente = r.ordem_pagamento_id && r.op_status !== 'pago';
                const valLocal = Number(r.valor || 0);
                const valEur = r.valor_eur != null ? Number(r.valor_eur) : (isForeign ? round2(valLocal / fallbackRate) : valLocal);
                const taxaBancaria = Number(r.taxa_bancaria_eur || 0);
                const rate = Number(r.taxa_cambio) > 0 ? Number(r.taxa_cambio) : fallbackRate;

                movimentos.push({
                    id: r.id,
                    caixa_id: r.caixa_id,
                    tipo: 'entrada',
                    valor: valLocal,
                    valor_eur: valEur,
                    taxa_bancaria_eur: taxaBancaria,
                    taxa_cambio: rate,
                    moeda,
                    data: r.data_recarga,
                    descricao: r.observacoes || (isPendente ? 'Recarga (Aguardando Aprovação Financeira)' : 'Depósito de Recarga'),
                    comprovante_url: r.comprovante_url,
                    created_at: r.created_at,
                    status_pagamento: r.op_status || 'pago'
                });
            });

            despesas.forEach(d => {
                const coche = coches.find(c => c.id === d.coche_id);
                const valLocal = Number(d.valor || 0);
                const rate = Number(d.taxa_cambio) > 0 ? Number(d.taxa_cambio) : fallbackRate;
                const valEur = d.valor_eur != null && Number(d.valor_eur) > 0
                    ? Number(d.valor_eur)
                    : (isForeign ? round2(valLocal / rate) : valLocal);

                movimentos.push({
                    id: d.id,
                    caixa_id: d.caixa_id,
                    tipo: 'saida',
                    valor: valLocal,
                    valor_eur: valEur,
                    taxa_cambio: rate,
                    moeda,
                    data: d.data_despesa,
                    descricao: d.descricao || `Gasto com ${d.categoria}`,
                    categoria: d.categoria,
                    comprovante_url: d.comprovante_url,
                    coche_id: d.coche_id,
                    id_empresa: d.id_empresa,
                    created_at: d.created_at,
                    coche: coche ? { matricula: coche.matricula, marca: coche.marca, modelo: coche.modelo } : null
                });
            });

            // Ordenação cronológica para cálculo do running balance
            movimentos.sort((a, b) => {
                const dA = new Date(a.data).getTime();
                const dB = new Date(b.data).getTime();
                if (dA !== dB) return dA - dB;
                return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
            });

            let running = 0;
            let runningEur = 0;
            const comSaldo = movimentos.map(m => {
                const isPendente = m.tipo === 'entrada' && m.status_pagamento && m.status_pagamento !== 'pago';
                if (!isPendente) {
                    if (m.tipo === 'entrada') {
                        running += m.valor;
                        runningEur += Math.max(0, m.valor_eur - (m.taxa_bancaria_eur || 0));
                    } else {
                        running -= m.valor;
                        runningEur -= m.valor_eur;
                    }
                }
                return { ...m, runningBalance: round2(running), runningBalanceEur: round2(runningEur) };
            });

            // Retorna em ordem decrescente (mais recente primeiro)
            return comSaldo.reverse();
        } catch (err) {
            console.error('Erro ao gerar extrato completo:', err);
            return [];
        }
    },

    // 14. Obter todos os movimentos de todos os caixas (em lote, sem N+1)
    async getTodosMovimentos(caixasPreloaded?: CaixaDespesa[]): Promise<(MovimentoExtrato & { caixa_nome: string; trabalhador_nome: string; empresa_nome?: string })[]> {
        try {
            const [caixas, recargasRes, despesasRes, opsRes] = await Promise.all([
                caixasPreloaded ? Promise.resolve(caixasPreloaded) : this.getCaixas(),
                supabase.from('caixas_recargas').select('*'),
                supabase.from('caixas_despesas_registros').select('*'),
                supabase.schema('core_finance').from('ordens_pagamento').select('id, status')
            ]);

            const caixaMap = new Map(caixas.map(c => [c.id, c]));
            const opsMap = new Map((opsRes.data || []).map((o: any) => [o.id, o.status]));
            const todos: (MovimentoExtrato & { caixa_nome: string; trabalhador_nome: string; empresa_nome?: string })[] = [];

            (recargasRes.data || []).forEach((r: any) => {
                const cx = caixaMap.get(r.caixa_id);
                if (!cx) return;
                const moeda = cx.moeda || 'EUR';
                const isForeign = moeda !== 'EUR';
                const opStatus = r.ordem_pagamento_id ? (opsMap.get(r.ordem_pagamento_id) || null) : null;
                const isPendente = r.ordem_pagamento_id && opStatus !== 'pago';
                const valLocal = Number(r.valor || 0);
                const rate = Number(r.taxa_cambio) > 0 ? Number(r.taxa_cambio) : (cx.taxa_cambio || 1);
                const valEur = r.valor_eur != null ? Number(r.valor_eur) : (isForeign ? round2(valLocal / rate) : valLocal);

                todos.push({
                    id: r.id,
                    caixa_id: r.caixa_id,
                    tipo: 'entrada',
                    valor: valLocal,
                    valor_eur: valEur,
                    taxa_bancaria_eur: Number(r.taxa_bancaria_eur || 0),
                    taxa_cambio: rate,
                    moeda,
                    data: r.data_recarga,
                    descricao: r.observacoes || (isPendente ? 'Recarga (Aguardando Aprovação Financeira)' : 'Depósito de Recarga'),
                    comprovante_url: r.comprovante_url,
                    created_at: r.created_at,
                    status_pagamento: opStatus || 'pago',
                    caixa_nome: cx.nombre,
                    trabalhador_nome: cx.trabajador?.Nombre || 'Desconhecido',
                    empresa_nome: cx.empresa?.nome || cx.cartao?.empresa_nome || ''
                });
            });

            (despesasRes.data || []).forEach((d: any) => {
                const cx = caixaMap.get(d.caixa_id);
                if (!cx) return;
                const moeda = cx.moeda || 'EUR';
                const isForeign = moeda !== 'EUR';
                const valLocal = Number(d.valor || 0);
                const rate = Number(d.taxa_cambio) > 0 ? Number(d.taxa_cambio) : (cx.taxa_cambio || 1);
                const valEur = d.valor_eur != null && Number(d.valor_eur) > 0
                    ? Number(d.valor_eur)
                    : (isForeign ? round2(valLocal / rate) : valLocal);

                todos.push({
                    id: d.id,
                    caixa_id: d.caixa_id,
                    tipo: 'saida',
                    valor: valLocal,
                    valor_eur: valEur,
                    taxa_cambio: rate,
                    moeda,
                    data: d.data_despesa,
                    descricao: d.descricao || `Gasto com ${d.categoria}`,
                    categoria: d.categoria,
                    comprovante_url: d.comprovante_url,
                    coche_id: d.coche_id,
                    id_empresa: d.id_empresa,
                    created_at: d.created_at,
                    caixa_nome: cx.nombre,
                    trabalhador_nome: cx.trabajador?.Nombre || 'Desconhecido',
                    empresa_nome: cx.empresa?.nome || cx.cartao?.empresa_nome || ''
                });
            });

            todos.sort((a, b) => {
                const dDiff = new Date(b.data).getTime() - new Date(a.data).getTime();
                if (dDiff !== 0) return dDiff;
                return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            });

            return todos;
        } catch (err) {
            console.error('Erro ao obter histórico geral:', err);
            return [];
        }
    },

    // 15. Upload de comprovante para bucket de storage público
    async uploadComprovante(file: File): Promise<string> {
        const ext = file.name.split('.').pop() || 'jpg';
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `caixas_comprovantes/${cleanName}`;

        const { error: uploadError } = await supabase.storage
            .from('comprovantes-financeiro')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            const { error: fallbackErr } = await supabase.storage
                .from('coches')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (fallbackErr) {
                console.error('Erro no upload do comprovante:', uploadError, fallbackErr);
                throw new Error('Falha ao fazer upload da imagem.');
            }

            const { data: { publicUrl } } = supabase.storage
                .from('coches')
                .getPublicUrl(filePath);
            return publicUrl;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('comprovantes-financeiro')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    // 16. Fechar Caixa e Gerar Conta a Pagar Consolidada em EUR (Status: Pago)
    async fecharCaixa(params: {
        caixaId: string;
        catDespesa: string;
        centroCusto: string;
        observacoes?: string;
        numDoc?: string;
        usuarioNome?: string;
        incluirTaxasBancarias?: boolean;
    }): Promise<{ success: boolean; contaPagarId?: string; error?: any }> {
        try {
            const caixa = await this.getCaixaById(params.caixaId);
            if (!caixa) throw new Error('Caixa não encontrado.');

            const incluirTaxas = params.incluirTaxasBancarias !== false;
            const totalGastoEur = round2(caixa.total_despesas_eur + (incluirTaxas ? caixa.total_taxas_bancarias_eur : 0));
            const isForeign = caixa.moeda !== 'EUR';

            const empresaNome = caixa.cartao?.empresa_nome || caixa.empresa?.nome || 'Kotrik';
            const bancoNome = caixa.cartao
                ? `${caixa.cartao.nome_cartao}${caixa.cartao.banco_nome ? ' (' + caixa.cartao.banco_nome + ')' : ''}`
                : 'Fundo de Caixa';

            const hoje = new Date().toISOString().split('T')[0];

            const obsDetalhes = isForeign
                ? `Fechamento do Fundo de Caixa: ${caixa.nombre} (${caixa.moeda}). Gastos: ${formatCurrencyByCode(caixa.total_despesas, caixa.moeda)} (≈ € ${caixa.total_despesas_eur.toFixed(2)})${caixa.total_taxas_bancarias_eur > 0 ? ` + Taxas bancárias: € ${caixa.total_taxas_bancarias_eur.toFixed(2)}` : ''}. Cotação média: 1 EUR = ${caixa.taxa_cambio.toFixed(4)} ${caixa.moeda}. Total contabilizado: € ${totalGastoEur.toFixed(2)}. ${params.observacoes || ''}`.trim()
                : `Fechamento do Fundo de Caixa: ${caixa.nombre}. Total gasto: € ${totalGastoEur.toFixed(2)}. ${params.observacoes || ''}`.trim();

            const { data: cpData, error: cpErr } = await supabase
                .from('contas_pagar')
                .insert([{
                    empresa: empresaNome,
                    cod_provedor: caixa.trabajador?.Cod_colab || caixa.trabajador?.Nombre || 'CAIXA',
                    provedor: `Fundo de Caixa: ${caixa.nombre} (${caixa.trabajador?.Nombre || 'Colaborador'})`,
                    valor_total: totalGastoEur > 0 ? totalGastoEur.toFixed(2) : '0',
                    saldo_a_pagar: '0',
                    status: 'Pago',
                    origem: `Fundo de Caixa #${caixa.id.slice(0, 8)}`,
                    cat_despesa: params.catDespesa,
                    centro_custo: params.centroCusto,
                    num_doc: params.numDoc || `FC-${caixa.id.slice(0, 6).toUpperCase()}`,
                    obs: obsDetalhes,
                    form_pag: caixa.tipo_fundo === 'cartao' ? 'Cartão Corporativo' : 'Adiantamento em Dinheiro',
                    banco: bancoNome,
                    dt_pagamento: hoje,
                    data_emissao: hoje,
                    dt_venc: hoje,
                    creado: new Date().toISOString(),
                    creado_por: params.usuarioNome || 'sistema'
                }])
                .select('id')
                .single();

            if (cpErr) {
                console.error('Erro ao gerar conta a pagar no fechamento:', cpErr);
                throw cpErr;
            }

            const { error: updErr } = await supabase
                .from('caixas_despesas')
                .update({
                    status: 'Inativo',
                    fechado_em: new Date().toISOString(),
                    fechado_por: params.usuarioNome || 'sistema',
                    conta_pagar_id: cpData?.id || null,
                    centro_custo: params.centroCusto,
                    cat_despesa: params.catDespesa
                })
                .eq('id', params.caixaId);

            if (updErr) {
                console.error('Erro ao atualizar status do caixa após fechamento:', updErr);
                throw updErr;
            }

            return { success: true, contaPagarId: cpData?.id };
        } catch (err: any) {
            console.error('Erro no fechamento do caixa:', err);
            return { success: false, error: err?.message || err };
        }
    }
};
