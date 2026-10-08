import { supabase } from '@/shared/supabase/client';

export interface CaixaDespesa {
    id: string;
    nombre: string;
    trabajador_id: string;
    id_empresa: string | null;
    status: 'Ativo' | 'Inativo';
    created_at?: string;

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
    saldo: number;
    total_recargas: number;
    total_despesas: number;
}

export interface CaixaRecarga {
    id: string;
    caixa_id: string;
    valor: number;
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
    valor: number;
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
    data: string;
    descricao: string;
    categoria?: string;
    comprovante_url?: string | null;
    coche_id?: string | null;
    id_empresa?: string | null;
    created_at?: string;
    status_pagamento?: string | null;
    runningBalance?: number;
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
    tipo: 'escritorio' | 'campo';
    email?: string;
}

export const caixaService = {
    // 1. Obter colaboradores (Escritório + Trabalhadores de Campo)
    async getColaboradores(): Promise<ColaboradorOption[]> {
        try {
            // Usuários de escritório
            const { data: users } = await supabase
                .schema('core_operacoes')
                .from('users')
                .select('id, display_name, email')
                .order('display_name', { ascending: true });

            // Trabalhadores de campo
            const { data: trabs } = await supabase
                .from('trabajadores')
                .select('id, Nombre, Cod_colab, email, status_trabajador')
                .eq('status_trabajador', 'Ativo')
                .order('Nombre', { ascending: true });

            const list: ColaboradorOption[] = [];

            if (users && users.length > 0) {
                users.forEach(u => {
                    list.push({
                        id: u.id,
                        nome: u.display_name || u.email || 'Usuário',
                        identificador: u.email || u.id,
                        tipo: 'escritorio',
                        email: u.email
                    });
                });
            }

            if (trabs && trabs.length > 0) {
                trabs.forEach(t => {
                    list.push({
                        id: t.id,
                        nome: t.Nombre,
                        identificador: t.Cod_colab || t.id,
                        tipo: 'campo',
                        email: t.email
                    });
                });
            }

            return list;
        } catch (err) {
            console.error('Erro ao buscar colaboradores:', err);
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

    // 4. Obter todos os caixas com dados agregados
    async getCaixas(): Promise<CaixaDespesa[]> {
        try {
            const { data: caixas, error: caixasErr } = await supabase
                .from('caixas_despesas')
                .select('*')
                .order('created_at', { ascending: false });

            if (caixasErr) throw caixasErr;
            if (!caixas || caixas.length === 0) return [];

            const [colabs, empresas, recargasRes, despesasRes, opsRes] = await Promise.all([
                this.getColaboradores(),
                this.getEmpresas(),
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

                // Recargas válidas (sem OP ou com OP com status 'pago')
                const recargasCaixa = mRecargas.filter((r: any) => r.caixa_id === caixa.id);
                const totalRecargas = recargasCaixa
                    .filter((r: any) => {
                        if (!r.ordem_pagamento_id) return true;
                        const op = mOps.find((o: any) => o.id === r.ordem_pagamento_id);
                        return op ? op.status === 'pago' : false;
                    })
                    .reduce((sum: number, r: any) => sum + Number(r.valor), 0);

                const despesasCaixa = mDespesas.filter((d: any) => d.caixa_id === caixa.id);
                const totalDespesas = despesasCaixa.reduce((sum: number, d: any) => sum + Number(d.valor), 0);

                return {
                    ...caixa,
                    trabajador: colab ? {
                        Nombre: colab.nome,
                        Cod_colab: colab.identificador,
                        email: colab.email,
                        tipo: colab.tipo
                    } : {
                        Nombre: 'Colaborador',
                        Cod_colab: caixa.trabajador_id
                    },
                    empresa: emp ? { id: emp.id, nome: emp.nome } : null,
                    saldo: totalRecargas - totalDespesas,
                    total_recargas: totalRecargas,
                    total_despesas: totalDespesas
                };
            });
        } catch (err) {
            console.error('Erro no caixaService.getCaixas:', err);
            return [];
        }
    },

    // 5. Obter um caixa específico por ID
    async getCaixaById(id: string): Promise<CaixaDespesa | null> {
        try {
            const caixas = await this.getCaixas();
            return caixas.find(c => c.id === id) || null;
        } catch (err) {
            console.error('Erro ao buscar caixa por ID:', err);
            return null;
        }
    },

    // 6. Criar novo caixa
    async createCaixa(caixa: {
        nombre: string;
        trabajador_id: string;
        id_empresa?: string | null;
        status?: 'Ativo' | 'Inativo';
        saldo_inicial?: number;
    }): Promise<CaixaDespesa> {
        const { saldo_inicial = 0, ...dadosCaixa } = caixa;

        const { data, error } = await supabase
            .from('caixas_despesas')
            .insert([{
                ...dadosCaixa,
                status: dadosCaixa.status || 'Ativo'
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar caixa:', error);
            throw error;
        }

        if (saldo_inicial > 0) {
            await this.addRecarga({
                caixa_id: data.id,
                valor: saldo_inicial,
                data_recarga: new Date().toISOString().split('T')[0],
                observacoes: 'Saldo inicial na abertura do caixa.',
                gerar_op: false
            });
        }

        return {
            ...data,
            saldo: saldo_inicial,
            total_recargas: saldo_inicial,
            total_despesas: 0
        };
    },

    // 7. Atualizar caixa (ex: ativar/desativar)
    async updateCaixa(id: string, dados: Partial<CaixaDespesa>): Promise<any> {
        const { trabajador, empresa, saldo, total_recargas, total_despesas, ...cleanData } = dados as any;

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

    // 9. Adicionar recarga
    async addRecarga(recarga: {
        caixa_id: string;
        valor: number;
        data_recarga?: string;
        comprovante_url?: string | null;
        observacoes?: string | null;
        gerar_op?: boolean;
        id_empresa?: string | null;
    }): Promise<CaixaRecarga> {
        const { gerar_op = false, id_empresa, ...dadosRecarga } = recarga;
        let ordemPagamentoId: string | null = null;

        if (gerar_op) {
            try {
                const { data: caixa } = await supabase
                    .from('caixas_despesas')
                    .select('nombre, trabajador_id, id_empresa')
                    .eq('id', recarga.caixa_id)
                    .single();

                const { data: opData, error: opErr } = await supabase
                    .schema('core_finance')
                    .from('ordens_pagamento')
                    .insert([{
                        descricao: `Recarga Fundo de Caixa - ${caixa?.nombre || 'Viagem'}`,
                        valor: recarga.valor,
                        data_vencimento: recarga.data_recarga || new Date().toISOString().split('T')[0],
                        id_empresa: id_empresa || caixa?.id_empresa || null,
                        tipo_orden: 'caixas_recargas',
                        status: 'aguardando_aprovacao',
                        observaciones: recarga.observacoes || 'Recarga de fundo de caixa'
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
                data_recarga: dadosRecarga.data_recarga || new Date().toISOString().split('T')[0],
                ordem_pagamento_id: ordemPagamentoId
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar recarga:', error);
            throw error;
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

    // 11. Adicionar despesa
    async addDespesa(despesa: {
        caixa_id: string;
        valor: number;
        data_despesa?: string;
        categoria: 'Combustível' | 'Alimentação' | 'Alojamento' | 'Viagem/Transporte' | 'Manutenção' | 'Outros';
        coche_id?: string | null;
        id_empresa?: string | null;
        comprovante_url?: string | null;
        descricao?: string | null;
    }): Promise<CaixaDespesaRegistro> {
        const { data, error } = await supabase
            .from('caixas_despesas_registros')
            .insert([{
                ...despesa,
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

    // 13. Extrato consolidado com saldo dinâmico
    async getExtratoCompleto(caixaId: string): Promise<MovimentoExtrato[]> {
        try {
            const [recargas, despesas, coches] = await Promise.all([
                this.getRecargas(caixaId),
                this.getDespesasRegistros(caixaId),
                this.getCoches()
            ]);

            const movimentos: MovimentoExtrato[] = [];

            recargas.forEach(r => {
                const isPendente = r.ordem_pagamento_id && r.op_status !== 'pago';
                movimentos.push({
                    id: r.id,
                    caixa_id: r.caixa_id,
                    tipo: 'entrada',
                    valor: Number(r.valor),
                    data: r.data_recarga,
                    descricao: r.observacoes || (isPendente ? 'Recarga (Aguardando Aprovação Financeira)' : 'Depósito de Recarga'),
                    comprovante_url: r.comprovante_url,
                    created_at: r.created_at,
                    status_pagamento: r.op_status || 'pago'
                });
            });

            despesas.forEach(d => {
                const coche = coches.find(c => c.id === d.coche_id);
                movimentos.push({
                    id: d.id,
                    caixa_id: d.caixa_id,
                    tipo: 'saida',
                    valor: Number(d.valor),
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
            const comSaldo = movimentos.map(m => {
                const isPendente = m.tipo === 'entrada' && m.status_pagamento && m.status_pagamento !== 'pago';
                if (!isPendente) {
                    if (m.tipo === 'entrada') running += m.valor;
                    else running -= m.valor;
                }
                return { ...m, runningBalance: running };
            });

            // Retorna em ordem decrescente (mais recente primeiro)
            return comSaldo.reverse();
        } catch (err) {
            console.error('Erro ao gerar extrato completo:', err);
            return [];
        }
    },

    // 14. Obter todos os movimentos de todos os caixas
    async getTodosMovimentos(): Promise<(MovimentoExtrato & { caixa_nome: string; trabalhador_nome: string })[]> {
        try {
            const caixas = await this.getCaixas();
            const todos: (MovimentoExtrato & { caixa_nome: string; trabalhador_nome: string })[] = [];

            for (const cx of caixas) {
                const extrato = await this.getExtratoCompleto(cx.id);
                extrato.forEach(mov => {
                    todos.push({
                        ...mov,
                        caixa_nome: cx.nombre,
                        trabalhador_nome: cx.trabajador?.Nombre || 'Desconhecido'
                    });
                });
            }

            todos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
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
            // Fallback para bucket coches caso o comprovantes-financeiro falhe
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
    }
};
