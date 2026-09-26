import { supabase } from '@/shared/supabase/client';
import type {
    AtivoPatrimonio,
    HistoricoPatrimonio,
    DocumentoPatrimonio,
    ManutencaoPatrimonio,
    PatrimonioFiltros,
    PatrimonioStatus,
} from '../types/patrimonio';

const TABLE_ATIVOS = 'ativos';
const TABLE_HISTORICO = 'historico';
const TABLE_DOCUMENTOS = 'documentos';
const TABLE_MANUTENCOES = 'manutencoes';
const BUCKET_NAME = 'patrimonio';

// Obter schema core_patrimonio ou fallback public
const getClient = () => {
    return supabase.schema('core_patrimonio' as any);
};

export async function listarAtivos(filtros?: PatrimonioFiltros): Promise<AtivoPatrimonio[]> {
    let query = getClient()
        .from(TABLE_ATIVOS)
        .select('*')
        .order('created_at', { ascending: false });

    if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
    }

    if (filtros?.categoria && filtros.categoria !== 'todas') {
        query = query.eq('categoria', filtros.categoria);
    }

    if (filtros?.empresa && filtros.empresa !== 'todas') {
        query = query.eq('empresa_proprietaria', filtros.empresa);
    }

    if (filtros?.projeto && filtros.projeto !== 'todos') {
        query = query.eq('projeto', filtros.projeto);
    }

    if (filtros?.responsavel) {
        query = query.ilike('responsavel_nome', `%${filtros.responsavel}%`);
    }

    if (filtros?.coordenador) {
        query = query.ilike('coordenador_nome', `%${filtros.coordenador}%`);
    }

    if (filtros?.localizacao) {
        query = query.ilike('localizacao', `%${filtros.localizacao}%`);
    }

    if (filtros?.search) {
        const s = filtros.search.trim();
        query = query.or(
            `codigo_patrimonial.ilike.%${s}%,descricao.ilike.%${s}%,marca.ilike.%${s}%,modelo.ilike.%${s}%,numero_serie.ilike.%${s}%,imei.ilike.%${s}%,matricula.ilike.%${s}%,responsavel_nome.ilike.%${s}%`
        );
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao listar ativos:', error);
        throw error;
    }

    return (data || []) as AtivoPatrimonio[];
}

export async function obterAtivoPorId(id: string): Promise<AtivoPatrimonio | null> {
    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Erro ao buscar ativo por id:', error);
        throw error;
    }

    return data as AtivoPatrimonio;
}

export async function obterAtivoPorCodigo(codigo: string): Promise<AtivoPatrimonio | null> {
    const cleanCodigo = codigo.trim().toUpperCase();
    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .select('*')
        .ilike('codigo_patrimonial', cleanCodigo)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar ativo por código:', error);
        throw error;
    }

    return data as AtivoPatrimonio | null;
}

export async function gerarProximoCodigo(prefixo: string = 'PAT'): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('core_patrimonio.gerar_proximo_codigo' as any, {
            p_prefixo: prefixo,
        });
        if (!error && data) {
            return data;
        }
    } catch {
        // Fallback no front-end caso a RPC não esteja disponível
    }

    const cleanPref = prefixo.toUpperCase();
    const { data } = await getClient()
        .from(TABLE_ATIVOS)
        .select('codigo_patrimonial')
        .ilike('codigo_patrimonial', `${cleanPref}-%`)
        .order('codigo_patrimonial', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        const lastCode = data[0].codigo_patrimonial;
        const match = lastCode.match(/-(\d+)$/);
        if (match) {
            const nextNum = parseInt(match[1], 10) + 1;
            return `${cleanPref}-${String(nextNum).padStart(6, '0')}`;
        }
    }

    return `${cleanPref}-000001`;
}

export async function criarAtivo(
    ativo: Omit<AtivoPatrimonio, 'id' | 'created_at' | 'updated_at'>,
    usuarioNome?: string
): Promise<AtivoPatrimonio> {
    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .insert({
            ...ativo,
            fotos: ativo.fotos || [],
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar ativo:', error);
        throw error;
    }

    const novoAtivo = data as AtivoPatrimonio;

    // Registra evento inicial no histórico
    await adicionarEventoHistorico({
        ativo_id: novoAtivo.id,
        tipo_evento: 'aquisicao',
        titulo: 'Patrimônio Cadastrado',
        descricao: `Ativo cadastrado no sistema com status inicial ${novoAtivo.status}. Fornecedor: ${novoAtivo.fornecedor || 'Não informado'}.`,
        localizacao: novoAtivo.localizacao || 'Armazém Central',
        status_anterior: null,
        status_novo: novoAtivo.status,
        registrado_por_nome: usuarioNome || 'Sistema',
    });

    return novoAtivo;
}

export async function atualizarAtivo(
    id: string,
    campos: Partial<AtivoPatrimonio>,
    eventoDescricao?: string,
    usuarioNome?: string
): Promise<AtivoPatrimonio> {
    const ativoAnterior = await obterAtivoPorId(id);

    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .update({
            ...campos,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar ativo:', error);
        throw error;
    }

    const ativoAtualizado = data as AtivoPatrimonio;

    // Se houve mudança de status ou foi solicitada descrição, adiciona ao histórico
    if (
        (ativoAnterior && ativoAnterior.status !== ativoAtualizado.status) ||
        eventoDescricao
    ) {
        await adicionarEventoHistorico({
            ativo_id: id,
            tipo_evento: 'status_alterado',
            titulo: `Status alterado para ${ativoAtualizado.status}`,
            descricao: eventoDescricao || `Atualização cadastral do patrimônio.`,
            status_anterior: ativoAnterior?.status,
            status_novo: ativoAtualizado.status,
            localizacao: ativoAtualizado.localizacao,
            projeto: ativoAtualizado.projeto,
            worker_nome: ativoAtualizado.responsavel_nome,
            registrado_por_nome: usuarioNome || 'Sistema',
        });
    }

    return ativoAtualizado;
}

export async function excluirAtivo(id: string): Promise<void> {
    const { error } = await getClient().from(TABLE_ATIVOS).delete().eq('id', id);
    if (error) {
        console.error('Erro ao excluir ativo:', error);
        throw error;
    }
}

// ----------------- HISTÓRICO -----------------
export async function listarHistorico(ativoId: string): Promise<HistoricoPatrimonio[]> {
    const { data, error } = await getClient()
        .from(TABLE_HISTORICO)
        .select('*')
        .eq('ativo_id', ativoId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao listar histórico:', error);
        throw error;
    }

    return (data || []) as HistoricoPatrimonio[];
}

export async function adicionarEventoHistorico(
    evento: Omit<HistoricoPatrimonio, 'id' | 'created_at'>
): Promise<HistoricoPatrimonio> {
    const { data, error } = await getClient()
        .from(TABLE_HISTORICO)
        .insert(evento)
        .select()
        .single();

    if (error) {
        console.error('Erro ao registrar histórico:', error);
        throw error;
    }

    return data as HistoricoPatrimonio;
}

// ----------------- FLUXOS DE OPERAÇÃO (ENTREGA, DEVOLUÇÃO, TRANSFERÊNCIA) -----------------

export interface DadosEntrega {
    workerId: string;
    workerNome: string;
    workerDoc?: string;
    coordenadorNome: string;
    dataEntrega: string;
    localEntrega: string;
    projeto: string;
    previsaoDevolucao?: string;
    acessoriosEntregues?: string;
    observacoes?: string;
    usuarioNome?: string;
}

export async function realizarEntrega(
    ativoId: string,
    dados: DadosEntrega
): Promise<AtivoPatrimonio> {
    const ativo = await obterAtivoPorId(ativoId);
    if (!ativo) throw new Error('Ativo não encontrado');

    const statusNovo: PatrimonioStatus = 'em_uso';

    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .update({
            status: statusNovo,
            worker_id: dados.workerId,
            responsavel_nome: dados.workerNome,
            responsavel_documento: dados.workerDoc,
            coordenador_nome: dados.coordenadorNome,
            data_entrega: dados.dataEntrega || new Date().toISOString(),
            local_entrega: dados.localEntrega,
            projeto: dados.projeto,
            previsao_devolucao: dados.previsaoDevolucao || null,
            acessorios_entregues: dados.acessoriosEntregues || null,
            observacoes_entrega: dados.observacoes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ativoId)
        .select()
        .single();

    if (error) throw error;

    await adicionarEventoHistorico({
        ativo_id: ativoId,
        tipo_evento: 'entrega',
        titulo: `Entregue para ${dados.workerNome}`,
        descricao: `Equipamento entregue por ${dados.coordenadorNome || 'Coordenador'} no projeto ${dados.projeto || 'Geral'}. Acessórios: ${dados.acessoriosEntregues || 'Padrão'}.`,
        worker_id: dados.workerId,
        worker_nome: dados.workerNome,
        projeto: dados.projeto,
        localizacao: dados.localEntrega,
        status_anterior: ativo.status,
        status_novo: statusNovo,
        registrado_por_nome: dados.usuarioNome || 'Sistema',
    });

    return data as AtivoPatrimonio;
}

export interface DadosDevolucao {
    localDevolucao: string;
    estadoEquipamento: string;
    statusNovo?: PatrimonioStatus;
    observacoes?: string;
    usuarioNome?: string;
}

export async function realizarDevolucao(
    ativoId: string,
    dados: DadosDevolucao
): Promise<AtivoPatrimonio> {
    const ativo = await obterAtivoPorId(ativoId);
    if (!ativo) throw new Error('Ativo não encontrado');

    const statusFinal: PatrimonioStatus = dados.statusNovo || 'disponivel';
    const workerAnterior = ativo.responsavel_nome;

    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .update({
            status: statusFinal,
            worker_id: null,
            responsavel_nome: null,
            responsavel_documento: null,
            coordenador_nome: null,
            data_entrega: null,
            previsao_devolucao: null,
            localizacao: dados.localDevolucao || 'Armazém Central',
            acessorios_entregues: null,
            observacoes_entrega: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ativoId)
        .select()
        .single();

    if (error) throw error;

    await adicionarEventoHistorico({
        ativo_id: ativoId,
        tipo_evento: 'devolucao',
        titulo: `Devolvido ao armazém (${dados.localDevolucao || 'Central'})`,
        descricao: `Devolução concluída por ${workerAnterior || 'Funcionário'}. Estado: ${dados.estadoEquipamento}. Observações: ${dados.observacoes || 'Nenhuma'}.`,
        localizacao: dados.localDevolucao,
        status_anterior: ativo.status,
        status_novo: statusFinal,
        registrado_por_nome: dados.usuarioNome || 'Sistema',
    });

    return data as AtivoPatrimonio;
}

export interface DadosTransferencia {
    novoProjeto: string;
    novaLocalizacao: string;
    coordenadorNome?: string;
    observacoes?: string;
    usuarioNome?: string;
}

export async function realizarTransferencia(
    ativoId: string,
    dados: DadosTransferencia
): Promise<AtivoPatrimonio> {
    const ativo = await obterAtivoPorId(ativoId);
    if (!ativo) throw new Error('Ativo não encontrado');

    const { data, error } = await getClient()
        .from(TABLE_ATIVOS)
        .update({
            projeto: dados.novoProjeto,
            localizacao: dados.novaLocalizacao,
            coordenador_nome: dados.coordenadorNome || ativo.coordenador_nome,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ativoId)
        .select()
        .single();

    if (error) throw error;

    await adicionarEventoHistorico({
        ativo_id: ativoId,
        tipo_evento: 'transferencia_projeto',
        titulo: `Transferido para Projeto ${dados.novoProjeto}`,
        descricao: `Transferência de localização para ${dados.novaLocalizacao}. Coordenador: ${dados.coordenadorNome || 'Mesmo'}. Obs: ${dados.observacoes || 'Nenhuma'}.`,
        projeto: dados.novoProjeto,
        localizacao: dados.novaLocalizacao,
        worker_nome: ativo.responsavel_nome,
        status_anterior: ativo.status,
        status_novo: ativo.status,
        registrado_por_nome: dados.usuarioNome || 'Sistema',
    });

    return data as AtivoPatrimonio;
}

// ----------------- DOCUMENTOS -----------------
export async function listarDocumentos(ativoId: string): Promise<DocumentoPatrimonio[]> {
    const { data, error } = await getClient()
        .from(TABLE_DOCUMENTOS)
        .select('*')
        .eq('ativo_id', ativoId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao listar documentos:', error);
        throw error;
    }

    return (data || []) as DocumentoPatrimonio[];
}

export async function salvarDocumento(
    doc: Omit<DocumentoPatrimonio, 'id' | 'created_at'>
): Promise<DocumentoPatrimonio> {
    const { data, error } = await getClient()
        .from(TABLE_DOCUMENTOS)
        .insert(doc)
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar documento:', error);
        throw error;
    }

    return data as DocumentoPatrimonio;
}

export async function excluirDocumento(id: string): Promise<void> {
    const { error } = await getClient().from(TABLE_DOCUMENTOS).delete().eq('id', id);
    if (error) throw error;
}

// ----------------- MANUTENÇÃO -----------------
export async function listarManutencoes(ativoId: string): Promise<ManutencaoPatrimonio[]> {
    const { data, error } = await getClient()
        .from(TABLE_MANUTENCOES)
        .select('*')
        .eq('ativo_id', ativoId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao listar manutenções:', error);
        throw error;
    }

    return (data || []) as ManutencaoPatrimonio[];
}

export async function registrarManutencao(
    manutencao: Omit<ManutencaoPatrimonio, 'id' | 'created_at' | 'updated_at'>,
    usuarioNome?: string
): Promise<ManutencaoPatrimonio> {
    const { data, error } = await getClient()
        .from(TABLE_MANUTENCOES)
        .insert(manutencao)
        .select()
        .single();

    if (error) throw error;

    // Atualiza status do ativo para em_manutencao
    await atualizarAtivo(
        manutencao.ativo_id,
        { status: 'em_manutencao' },
        `Enviado para manutenção: ${manutencao.motivo}. Oficina: ${manutencao.fornecedor_oficina || 'Não informada'}.`,
        usuarioNome
    );

    return data as ManutencaoPatrimonio;
}

export async function concluirManutencao(
    manutencaoId: string,
    dadosConclusao: {
        solucao: string;
        custoFinal: number;
        dataRetorno: string;
        statusAtivoPosManutencao?: PatrimonioStatus;
        usuarioNome?: string;
    }
): Promise<void> {
    const { data: m, error } = await getClient()
        .from(TABLE_MANUTENCOES)
        .update({
            status: 'concluida',
            solucao_aplicada: dadosConclusao.solucao,
            custo: dadosConclusao.custoFinal,
            data_retorno: dadosConclusao.dataRetorno,
            updated_at: new Date().toISOString(),
        })
        .eq('id', manutencaoId)
        .select()
        .single();

    if (error) throw error;

    const manut = m as ManutencaoPatrimonio;
    await atualizarAtivo(
        manut.ativo_id,
        { status: dadosConclusao.statusAtivoPosManutencao || 'disponivel' },
        `Manutenção concluída. Solução: ${dadosConclusao.solucao}. Custo: €${dadosConclusao.custoFinal.toFixed(2)}.`,
        dadosConclusao.usuarioNome
    );
}

// ----------------- STORAGE UPLOAD -----------------
export async function uploadArquivoPatrimonio(
    file: File,
    folder: 'fotos' | 'documentos' | 'termos' = 'fotos'
): Promise<string> {
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        console.error('Erro no upload para storage:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return data.publicUrl;
}
