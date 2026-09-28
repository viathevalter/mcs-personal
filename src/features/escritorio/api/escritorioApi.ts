import { supabase } from '@/shared/supabase/client';
import type { 
    ColaboradorEscritorio, 
    RhDadosLaborais, 
    RhHistoricoSalarial, 
    RhPontoRegistro, 
    RhFeriasSolicitacao, 
    RhFeriasSaldo, 
    RhAusencia, 
    RhPreFolha, 
    RhPreFolhaItem 
} from '../types/escritorio';

/**
 * Lista todos os colaboradores do escritório / oficina
 * Cruzando mcs_department_members com departamentos, empresas e dados laborais
 */
export async function listarColaboradoresEscritorio(filtros?: {
    departamentoId?: string;
    empresaId?: string;
    search?: string;
}): Promise<ColaboradorEscritorio[]> {
    let query = supabase
        .from('mcs_department_members')
        .select(`
            id,
            nombrecompleto,
            correoempresarial,
            ubicaciontrabajo,
            telefonodirecto,
            active,
            department_id,
            timeclock_code,
            mcs_departments (
                id,
                name
            ),
            empresas:empresa_contratante_id (
                id,
                nome_pbi
            )
        `)
        .order('nombrecompleto', { ascending: true });

    if (filtros?.departamentoId && filtros.departamentoId !== 'todos') {
        query = query.eq('department_id', filtros.departamentoId);
    }

    const { data: members, error } = await query;
    if (error) {
        console.error('Erro ao listar colaboradores de escritório:', error);
        throw error;
    }

    const memberIds = (members || []).map((m: any) => m.id);

    // Busca dados laborais complementares
    let laboraisMap = new Map<string, RhDadosLaborais>();
    let salariosMap = new Map<string, number>();
    let feriasMap = new Map<string, RhFeriasSaldo>();
    let ativosCountMap = new Map<string, number>();

    if (memberIds.length > 0) {
        const [laboraisRes, salariosRes, feriasRes, ativosRes] = await Promise.all([
            supabase.from('rh_dados_laborais').select('*').in('member_id', memberIds),
            supabase.from('rh_historico_salarial').select('*').in('member_id', memberIds).order('data_vigencia', { ascending: false }),
            supabase.from('rh_ferias_saldos').select('*').in('member_id', memberIds).eq('ano_exercicio', new Date().getFullYear()),
            supabase.from('patrimonio_ativos').select('worker_id, responsavel_nome').eq('status', 'em_uso'),
        ]);

        if (laboraisRes.data) {
            laboraisRes.data.forEach((l: any) => laboraisMap.set(l.member_id, l));
        }

        if (salariosRes.data) {
            salariosRes.data.forEach((s: any) => {
                if (!salariosMap.has(s.member_id)) {
                    salariosMap.set(s.member_id, s.salario_base);
                }
            });
        }

        if (feriasRes.data) {
            feriasRes.data.forEach((f: any) => feriasMap.set(f.member_id, f));
        }

        if (ativosRes.data) {
            ativosRes.data.forEach((a: any) => {
                if (a.worker_id) {
                    ativosCountMap.set(a.worker_id, (ativosCountMap.get(a.worker_id) || 0) + 1);
                }
            });
        }
    }

    const formatados: ColaboradorEscritorio[] = (members || []).map((m: any) => {
        const lab = laboraisMap.get(m.id);
        const ferias = feriasMap.get(m.id);
        const depNome = m.mcs_departments?.name || lab?.departamento_nome || 'Geral';
        const empNome = m.empresas?.nome_pbi || 'KR Industrial';

        return {
            id: m.id,
            nombrecompleto: m.nombrecompleto || 'Sem Nome',
            correoempresarial: m.correoempresarial,
            ubicaciontrabajo: m.ubicaciontrabajo,
            telefonodirecto: m.telefonodirecto,
            active: m.active !== false,
            department_id: m.department_id,
            department_name: depNome,
            empresa_nome: empNome,
            timeclock_code: m.timeclock_code || lab?.timeclock_code || null,
            laboral: lab || null,
            salario_vigente: salariosMap.get(m.id) || null,
            ferias_saldo: ferias || null,
            ativos_patrimonio_count: ativosCountMap.get(m.id) || 0,
        };
    });

    if (filtros?.search?.trim()) {
        const term = filtros.search.toLowerCase();
        return formatados.filter(
            (c) =>
                c.nombrecompleto.toLowerCase().includes(term) ||
                (c.correoempresarial && c.correoempresarial.toLowerCase().includes(term)) ||
                (c.timeclock_code && c.timeclock_code.includes(term)) ||
                (c.department_name && c.department_name.toLowerCase().includes(term))
        );
    }

    return formatados;
}

/**
 * Busca os detalhes completos de um colaborador de escritório
 */
export async function obterColaboradorEscritorio(id: string): Promise<ColaboradorEscritorio & {
    historicoSalarial: RhHistoricoSalarial[];
    solicitacoesFerias: RhFeriasSolicitacao[];
    ausencias: RhAusencia[];
    ativosPatrimonio: any[];
}> {
    const { data: member, error } = await supabase
        .from('mcs_department_members')
        .select(`
            id,
            nombrecompleto,
            correoempresarial,
            ubicaciontrabajo,
            telefonodirecto,
            active,
            department_id,
            timeclock_code,
            mcs_departments (id, name),
            empresas:empresa_contratante_id (id, nome_pbi)
        `)
        .eq('id', id)
        .single();

    if (error || !member) {
        throw error || new Error('Colaborador não encontrado');
    }

    const [labRes, salariosRes, feriasRes, feriasSolRes, ausenciasRes, ativosRes] = await Promise.all([
        supabase.from('rh_dados_laborais').select('*').eq('member_id', id).maybeSingle(),
        supabase.from('rh_historico_salarial').select('*').eq('member_id', id).order('data_vigencia', { ascending: false }),
        supabase.from('rh_ferias_saldos').select('*').eq('member_id', id).eq('ano_exercicio', new Date().getFullYear()).maybeSingle(),
        supabase.from('rh_ferias_solicitacoes').select('*').eq('member_id', id).order('data_inicio', { ascending: false }),
        supabase.from('rh_ausencias').select('*').eq('member_id', id).order('data_inicio', { ascending: false }),
        supabase.from('patrimonio_ativos').select('*').or(`worker_id.eq.${id},responsavel_nome.ilike.%${member.nombrecompleto}%`),
    ]);

    return {
        id: member.id,
        nombrecompleto: member.nombrecompleto,
        correoempresarial: member.correoempresarial,
        ubicaciontrabajo: member.ubicaciontrabajo,
        telefonodirecto: member.telefonodirecto,
        active: member.active !== false,
        department_id: member.department_id,
        department_name: (member as any).mcs_departments?.name || labRes.data?.departamento_nome || 'Geral',
        empresa_nome: (member as any).empresas?.nome_pbi || 'KR Industrial',
        timeclock_code: member.timeclock_code || labRes.data?.timeclock_code || null,
        laboral: labRes.data || null,
        salario_vigente: salariosRes.data?.[0]?.salario_base || null,
        ferias_saldo: feriasRes.data || null,
        ativos_patrimonio_count: (ativosRes.data || []).length,
        historicoSalarial: (salariosRes.data || []) as RhHistoricoSalarial[],
        solicitacoesFerias: (feriasSolRes.data || []) as RhFeriasSolicitacao[],
        ausencias: (ausenciasRes.data || []) as RhAusencia[],
        ativosPatrimonio: ativosRes.data || [],
    };
}

/**
 * Salva ou atualiza os dados laborais do colaborador
 */
export async function salvarDadosLaborais(
    memberId: string,
    dados: Partial<RhDadosLaborais>
): Promise<RhDadosLaborais> {
    const payload = {
        ...dados,
        member_id: memberId,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('rh_dados_laborais')
        .upsert(payload, { onConflict: 'member_id' })
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar dados laborais:', error);
        throw error;
    }

    // Se informou timeclock_code, atualiza também em mcs_department_members
    if (dados.timeclock_code) {
        await supabase
            .from('mcs_department_members')
            .update({ timeclock_code: dados.timeclock_code })
            .eq('id', memberId);
    }

    return data as RhDadosLaborais;
}

/**
 * Registra novo histórico salarial
 */
export async function adicionarHistoricoSalarial(
    dados: Omit<RhHistoricoSalarial, 'id' | 'created_at'>
): Promise<RhHistoricoSalarial> {
    const { data, error } = await supabase
        .from('rh_historico_salarial')
        .insert(dados)
        .select()
        .single();

    if (error) {
        console.error('Erro ao registrar histórico salarial:', error);
        throw error;
    }

    return data as RhHistoricoSalarial;
}

/**
 * Lista registros de ponto para um mês específico
 */
export async function listarPontoMes(
    mesAno: string, // 'YYYY-MM'
    memberId?: string
): Promise<RhPontoRegistro[]> {
    const [ano, mes] = mesAno.split('-');
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).toISOString().slice(0, 10);

    let query = supabase
        .from('rh_ponto_registros')
        .select('*')
        .gte('data', primeiroDia)
        .lte('data', ultimoDia)
        .order('data', { ascending: true });

    if (memberId && memberId !== 'todos') {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao listar registros de ponto:', error);
        throw error;
    }

    return (data || []) as RhPontoRegistro[];
}

/**
 * Salva lote de registros de ponto importados do relógio
 */
export async function salvarPontoBatch(
    registros: Omit<RhPontoRegistro, 'id' | 'created_at' | 'updated_at'>[]
): Promise<number> {
    if (!registros || registros.length === 0) return 0;

    const { error } = await supabase
        .from('rh_ponto_registros')
        .upsert(registros, { onConflict: 'member_id,data' });

    if (error) {
        console.error('Erro ao salvar lote de ponto:', error);
        throw error;
    }

    return registros.length;
}

/**
 * Ajusta manualmente um registro de ponto com registro de auditoria
 */
export async function ajustarPonto(
    pontoId: string,
    memberId: string,
    campoAlterado: string,
    valorAnterior: string,
    valorNovo: string,
    motivo: string,
    usuarioResponsavel: string,
    camposAtualizados: Partial<RhPontoRegistro>
): Promise<void> {
    // 1. Atualiza o registro
    const { error: updateError } = await supabase
        .from('rh_ponto_registros')
        .update({
            ...camposAtualizados,
            origem: 'ajuste',
            updated_at: new Date().toISOString(),
        })
        .eq('id', pontoId);

    if (updateError) throw updateError;

    // 2. Grava auditoria
    await supabase.from('rh_ponto_ajustes').insert({
        ponto_registro_id: pontoId,
        member_id: memberId,
        campo_alterado: campoAlterado,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        motivo,
        usuario_responsavel: usuarioResponsavel,
    });
}

/**
 * Férias: lista solicitações
 */
export async function listarFerias(ano: number = new Date().getFullYear()): Promise<RhFeriasSolicitacao[]> {
    const { data, error } = await supabase
        .from('rh_ferias_solicitacoes')
        .select('*')
        .eq('ano_exercicio', ano)
        .order('data_inicio', { ascending: false });

    if (error) throw error;
    return (data || []) as RhFeriasSolicitacao[];
}

/**
 * Férias: solicita novo período
 */
export async function solicitarFerias(
    dados: Omit<RhFeriasSolicitacao, 'id' | 'created_at' | 'updated_at'>
): Promise<RhFeriasSolicitacao> {
    const { data, error } = await supabase
        .from('rh_ferias_solicitacoes')
        .insert(dados)
        .select()
        .single();

    if (error) throw error;
    return data as RhFeriasSolicitacao;
}

/**
 * Férias: atualiza status (aprovar/rejeitar)
 */
export async function atualizarStatusFerias(
    id: string,
    status: RhFeriasSolicitacao['status'],
    usuario: string,
    motivoRejeicao?: string
): Promise<void> {
    const payload: any = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (status === 'aprovado') {
        payload.aprovado_por_rh = usuario;
        payload.data_aprovacao_rh = new Date().toISOString();
    } else if (status === 'rejeitado') {
        payload.motivo_rejeicao = motivoRejeicao || 'Não informado';
    }

    const { error } = await supabase
        .from('rh_ferias_solicitacoes')
        .update(payload)
        .eq('id', id);

    if (error) throw error;
}

/**
 * Ausências: lista registros
 */
export async function listarAusencias(memberId?: string): Promise<RhAusencia[]> {
    let query = supabase.from('rh_ausencias').select('*').order('data_inicio', { ascending: false });
    if (memberId && memberId !== 'todos') {
        query = query.eq('member_id', memberId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RhAusencia[];
}

/**
 * Ausências: registra nova ausência
 */
export async function registrarAusencia(dados: Omit<RhAusencia, 'id' | 'created_at' | 'updated_at'>): Promise<RhAusencia> {
    const { data, error } = await supabase
        .from('rh_ausencias')
        .insert(dados)
        .select()
        .single();

    if (error) throw error;
    return data as RhAusencia;
}

/**
 * Pré-Folha: busca ou inicializa para a competência
 */
export async function obterOuCriarPreFolha(competencia: string, empresaId?: string | null): Promise<{
    preFolha: RhPreFolha;
    itens: RhPreFolhaItem[];
}> {
    let query = supabase
        .from('rh_pre_folha')
        .select('*')
        .eq('competencia', competencia);

    if (empresaId) query = query.eq('empresa_id', empresaId);
    else query = query.is('empresa_id', null);

    const { data: existente } = await query.maybeSingle();

    let preFolha: RhPreFolha;

    if (existente) {
        preFolha = existente as RhPreFolha;
    } else {
        // Inicializa nova pré-folha
        const { data: nova, error } = await supabase
            .from('rh_pre_folha')
            .insert({
                competencia,
                empresa_id: empresaId || null,
                titulo: `Pré-Folha ${competencia}`,
                status: 'em_preparacao',
            })
            .select()
            .single();

        if (error) throw error;
        preFolha = nova as RhPreFolha;
    }

    // Busca itens consolidados
    const { data: itens, error: itensError } = await supabase
        .from('rh_pre_folha_itens')
        .select('*')
        .eq('pre_folha_id', preFolha.id);

    if (itensError) throw itensError;

    return {
        preFolha,
        itens: (itens || []) as RhPreFolhaItem[],
    };
}
