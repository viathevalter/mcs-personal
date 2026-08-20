/**
 * Holerite & Nómina Calculation Engine
 * Suporta trabalhadores destacados de Portugal (Alta) e prestadores em regularização.
 */

import type { Worker } from '@/shared/types/corePersonal';
import type { Empresa } from '@/shared/types/coreCommon';

export interface HoleriteParams {
    salarioBasePortugal: number;          // Padrão: 920.00
    ssTaxaTrabalhador: number;            // Padrão: 0.11 (11%)
    subsidioAlimentacaoDiario: number;    // Padrão: 6.15
    ajudaCustoDiariaEspanha: number;      // Padrão: 148.91
    kmValorUnitario: number;              // Padrão: 0.40
    duodecimoFeriasMes: number;           // Padrão: 76.03
    duodecimoNatalMes: number;            // Padrão: 76.30
    diasUteisMesPadrao: number;           // Padrão: 20 ou 22
}

export const DEFAULT_HOLERITE_PARAMS: HoleriteParams = {
    salarioBasePortugal: 920.00,
    ssTaxaTrabalhador: 0.11,
    subsidioAlimentacaoDiario: 6.15,
    ajudaCustoDiariaEspanha: 148.91,
    kmValorUnitario: 0.40,
    duodecimoFeriasMes: 76.03,
    duodecimoNatalMes: 76.30,
    diasUteisMesPadrao: 20,
};

export interface HoleriteItemLinha {
    descricao: string;
    qtd?: string | number;
    valorUnit?: number;
    abonos?: number;
    descontos?: number;
}

export interface HoleriteAltaCalculado {
    tipo: 'alta';
    worker: Worker;
    empresa: {
        nome: string;
        nif: string;
        endereco: string;
        codigoPostal: string;
        cidade: string;
        seguros?: string;
    };
    periodo: {
        mesAnoTexto: string;
        dataInicio: string;
        dataFim: string;
        mesReferencia: string;
    };
    dadosProfissionais: {
        categoria: string;
        tipoProcessamento: string;
        baseProcessamento: string;
        vencimentoBaseConfig: number;
        salarioHoraCalculado: number;
        horasSemana: number;
        diasMes: number;
        numMecanografico: string;
        niss: string;
        nif: string;
    };
    // Linhas da tabela oficial do Recibo de Vencimento
    linhasOficiais: HoleriteItemLinha[];
    totais: {
        totalAbonos: number;
        totalDescontos: number;
        totalAReceber: number;
        valorPorExtenso: string;
    };
    // Detalhamento gerencial anexo (2ª página)
    detalhamento: {
        horasTrabalhadas: number;
        tarifaHora: number;
        valorHoras: number;
        alojamento: number;
        ajustesPositivos: number;
        totalRemuneracoes: number;
        descontos: HoleriteDescontosDetalhados;
        liquidoReal: number;
        clientHoursBreakdown?: Array<{ clientName: string; hours: number }>;
    };
}

export interface ItemizedDesconto {
    categoria: string;
    label: string;
    valor: number;
    descricao?: string;
}

export interface HoleriteDescontosDetalhados {
    adiantamento: number;
    aluguelCarros: number;
    taxasBancarias: number;
    imposto: number;
    descontoCarro: number;
    multaTransito: number;
    combustible: number;
    peajes: number;
    suministros: number;
    multaAlojamiento: number;
    limpiezaDanos: number;
    epis: number;
    outros: number;
    descontosAdicionais: number;
    itemizedList: ItemizedDesconto[];
    totalDescontosDetalhados: number;
    totalDescontos?: number;
}

export interface HoleriteRegularizacaoCalculado {
    tipo: 'regularizacao';
    worker: Worker;
    empresa: {
        nome: string;
        nif: string;
        endereco: string;
        codigoPostal: string;
        cidade: string;
    };
    periodo: {
        mesAnoTexto: string;
        dataEmissao: string;
        mesReferencia: string;
    };
    servicoPrestado: string;
    horas: {
        tarifaHora: number;
        quantidadeHoras: number;
        valorTotalHoras: number;
        ajudaAlojamento: number;
        totalBruto: number;
        clientHoursBreakdown?: Array<{ clientName: string; hours: number }>;
    };
    descontos: HoleriteDescontosDetalhados;
    totalLiquido: number;
    liquidoFinal?: number;
    formaPagamento: string;
    moeda: string;
}

/**
 * Converte valor numérico em euros para texto por extenso em português.
 * Exemplo: 3362.33 -> "três mil, trezentos e sessenta e dois euros e trinta e três cêntimos"
 */
export function numeroPorExtensoEuro(valor: number): string {
    if (isNaN(valor) || valor === 0) return 'zero euros';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function converterCentena(num: number): string {
        if (num === 0) return '';
        if (num === 100) return 'cem';

        const c = Math.floor(num / 100);
        const d = Math.floor((num % 100) / 10);
        const u = num % 10;

        const partes: string[] = [];

        if (c > 0) partes.push(centenas[c]);

        if (d === 1) {
            partes.push(especiais[u]);
        } else {
            if (d > 1) partes.push(dezenas[d]);
            if (u > 0) partes.push(unidades[u]);
        }

        return partes.join(' e ');
    }

    const valorAbs = Math.abs(valor);
    const inteiro = Math.floor(valorAbs);
    const centavos = Math.round((valorAbs - inteiro) * 100);

    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const resto = inteiro % 1000;

    const blocos: string[] = [];

    if (milhoes > 0) {
        blocos.push(converterCentena(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
    }

    if (milhares > 0) {
        if (milhares === 1) {
            blocos.push('mil');
        } else {
            blocos.push(converterCentena(milhares) + ' mil');
        }
    }

    if (resto > 0) {
        blocos.push(converterCentena(resto));
    }

    let textoEuros = blocos.length > 0 ? blocos.join(', ') : 'zero';
    // Correção gramatical suave para "e" no último elemento
    const lastComma = textoEuros.lastIndexOf(', ');
    if (lastComma !== -1 && resto > 0 && resto < 100) {
        textoEuros = textoEuros.substring(0, lastComma) + ' e ' + textoEuros.substring(lastComma + 2);
    }

    const textoMoeda = inteiro === 1 ? 'euro' : 'euros';
    let resultado = `${textoEuros} ${textoMoeda}`;

    if (centavos > 0) {
        const textoCentavos = converterCentena(centavos);
        const textoCentavosMoeda = centavos === 1 ? 'cêntimo' : 'cêntimos';
        resultado += ` e ${textoCentavos} ${textoCentavosMoeda}`;
    }

    return resultado;
}

/**
 * Resolução dinâmica dos dados da empresa contratante do colaborador.
 */
export function resolveEmpresaInfo(
    worker: Worker,
    empresas: Empresa[] = [],
    workerMonthlyActivity?: { contratante?: string; cliente_nombre?: string }
) {
    const contratanteName = workerMonthlyActivity?.contratante || worker.contratante || '';

    // Procura na lista de empresas
    let matched = empresas.find(e => 
        (e.nome && contratanteName && e.nome.toLowerCase() === contratanteName.toLowerCase()) ||
        (e.trade_name && contratanteName && e.trade_name.toLowerCase() === contratanteName.toLowerCase()) ||
        (e.legal_name && contratanteName && e.legal_name.toLowerCase() === contratanteName.toLowerCase()) ||
        (e.id && worker.empresa_id && String(e.id) === String(worker.empresa_id))
    );

    // Fallback padrão se não encontrar ou campos vazios
    const nome = matched?.legal_name || matched?.nome || matched?.trade_name || contratanteName || 'WISEOWE UNIPESSOAL LDA';
    const nif = matched?.tax_id || matched?.vat_id || '518599280';
    const endereco = matched?.address_line || 'Rua Conselheiro Fonseca, n. 157';
    const codigoPostal = matched?.postal_code || '4400-238';
    const cidade = matched?.city || 'Vila Nova de Gaia';

    return {
        nome,
        nif,
        endereco,
        codigoPostal,
        cidade,
        seguros: 'Fidelidade - Companhia de Seguros, S.A.',
    };
}

/**
 * Formata mês de referência (ex: "2026-02" -> "Fevereiro 2026", "1 de Fevereiro 2026 a 28 de Fevereiro 2026")
 */
export function getPeriodoDatas(mesReferencia: string) {
    const [yearStr, monthStr] = mesReferencia.split('-');
    const year = parseInt(yearStr || '2026', 10);
    const month = parseInt(monthStr || '1', 10);

    const mesesNomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const mesNome = mesesNomes[month - 1] || 'Mês';
    const lastDay = new Date(year, month, 0).getDate();

    return {
        mesAnoTexto: `${mesNome.toUpperCase()} ${year}`,
        dataInicio: `1 de ${mesNome} ${year}`,
        dataFim: `${lastDay} de ${mesNome} ${year}`,
        dataEmissao: `${lastDay.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
        mesReferencia,
        lastDay,
        year,
        month
    };
}

/**
 * Separa os descontos cadastrados em categorias padronizadas do holerite
 */
export function parseDescontosCategorias(descontosList: any[]): HoleriteDescontosDetalhados {
    let adiantamento = 0;
    let aluguelCarros = 0;
    let taxasBancarias = 0;
    let imposto = 0;
    let descontoCarro = 0;
    let multaTransito = 0;
    let combustible = 0;
    let peajes = 0;
    let suministros = 0;
    let multaAlojamiento = 0;
    let limpiezaDanos = 0;
    let epis = 0;
    let outros = 0;
    let descontosAdicionais = 0;

    const itemizedList: ItemizedDesconto[] = [];

    const normalizeText = (s: string) => (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    for (const d of (descontosList || [])) {
        const val = Math.round((Number(d.valor || d.amount || 0) + Number.EPSILON) * 100) / 100;
        if (val === 0) continue;

        const rawCat = (d.categoria || d.category || '').trim();
        const rawDesc = (d.descricao || d.description || '').trim();
        const cat = normalizeText(rawCat);
        const desc = normalizeText(rawDesc);

        let label = '';

        if (cat.includes('epi')) {
            epis += val;
            label = 'EPIs';
        } else if (cat.includes('banc') || cat.includes('taxa') || cat.includes('tarifa') || cat.includes('transfer')) {
            taxasBancarias += val;
            label = 'Taxas Bancárias';
        } else if (
            cat.includes('impost') || cat.includes('irpf') || cat.includes('irs') || cat.includes('retenc') || 
            cat.includes('segurid') || cat.includes('social') || cat.includes(' ss') || cat === 'ss'
        ) {
            imposto += val;
            label = 'Imposto / Segurança Social';
        } else if (cat.includes('adiant') || cat.includes('anticip') || cat.includes('vale')) {
            adiantamento += val;
            label = 'Adiantamento';
        } else if (cat.includes('multa') && (cat.includes('trans') || cat.includes('trafic') || cat.includes('veicul') || cat.includes('carro'))) {
            multaTransito += val;
            label = 'Multa de Trânsito';
        } else if (cat.includes('combust') || cat.includes('gasolina') || cat.includes('diesel')) {
            combustible += val;
            label = 'Combustível';
        } else if (cat.includes('peaj') || cat.includes('pedag') || cat.includes('portag')) {
            peajes += val;
            label = 'Pedágios (Peajes)';
        } else if (cat.includes('suminist') || cat.includes('suprim') || cat.includes('material')) {
            suministros += val;
            label = 'Suprimentos (Suministros)';
        } else if (cat.includes('multa') && (cat.includes('aloj') || cat.includes('morad') || cat.includes('vivienda') || cat.includes('casa'))) {
            multaAlojamiento += val;
            label = 'Multa de Alojamento';
        } else if (cat.includes('limp') || cat.includes('dan') || cat.includes('avaria')) {
            limpiezaDanos += val;
            label = 'Limpeza ou Danos';
        } else if (cat.includes('carro') || cat.includes('auto') || cat.includes('veicul') || cat.includes('aluguel')) {
            descontoCarro += val;
            aluguelCarros += val;
            label = 'Aluguel de Carros';
        } else {
            // Fallback checking description if category was generic or empty
            if (desc.includes('epi') && !desc.includes('manual')) {
                epis += val;
                label = 'EPIs';
            } else if ((desc.includes('banc') || desc.includes('taxa')) && !desc.includes('manual')) {
                taxasBancarias += val;
                label = 'Taxas Bancárias';
            } else if ((desc.includes('impost') || desc.includes('segurid') || desc.includes('social')) && !desc.includes('manual')) {
                imposto += val;
                label = 'Imposto / Segurança Social';
            } else if ((desc.includes('adiant') || desc.includes('anticip')) && !desc.includes('manual')) {
                adiantamento += val;
                label = 'Adiantamento';
            } else if (desc.includes('multa') && desc.includes('trans') && !desc.includes('manual')) {
                multaTransito += val;
                label = 'Multa de Trânsito';
            } else if ((desc.includes('combust') || desc.includes('gasolina')) && !desc.includes('manual')) {
                combustible += val;
                label = 'Combustível';
            } else if (desc.includes('peaj') && !desc.includes('manual')) {
                peajes += val;
                label = 'Pedágios (Peajes)';
            } else if (desc.includes('suminist') && !desc.includes('manual')) {
                suministros += val;
                label = 'Suprimentos (Suministros)';
            } else if (desc.includes('aloj') && !desc.includes('manual')) {
                multaAlojamiento += val;
                label = 'Multa de Alojamento';
            } else if ((desc.includes('limp') || desc.includes('dan')) && !desc.includes('manual')) {
                limpiezaDanos += val;
                label = 'Limpeza ou Danos';
            } else if ((desc.includes('carro') || desc.includes('aluguel')) && !desc.includes('manual')) {
                descontoCarro += val;
                aluguelCarros += val;
                label = 'Aluguel de Carros';
            } else {
                outros += val;
                descontosAdicionais += val;
                label = rawCat || rawDesc || 'Outros Descontos';
            }
        }

        itemizedList.push({
            categoria: rawCat || label,
            label: label || rawCat || 'Outros Descontos',
            valor: val,
            descricao: rawDesc && rawDesc !== 'Lançamento Manual' && rawDesc !== '-' ? rawDesc : undefined
        });
    }

    const totalDescontosDetalhados = Math.round(itemizedList.reduce((acc, item) => acc + item.valor, 0) * 100) / 100;

    return {
        adiantamento,
        aluguelCarros,
        taxasBancarias,
        imposto,
        descontoCarro,
        multaTransito,
        combustible,
        peajes,
        suministros,
        multaAlojamiento,
        limpiezaDanos,
        epis,
        outros,
        descontosAdicionais,
        itemizedList,
        totalDescontosDetalhados,
        totalDescontos: totalDescontosDetalhados,
    };
}

/**
 * MOTOR 1: Cálculo e Distribuição para Trabalhador DE ALTA (Destacados de Portugal)
 */
export function calculateHoleriteAlta(options: {
    worker: Worker & { worker_beneficios_settings?: any };
    horasTrabalhadas: number;
    tarifaHora: number;
    proventosAdicionais?: number;
    alojamento?: number;
    eventosDescontos?: any[];
    housingBenefitAmount?: number;
    mesReferencia: string;
    empresas?: Empresa[];
    workerMonthlyActivity?: { contratante?: string; cliente_nombre?: string };
    customParams?: Partial<HoleriteParams>;
}): HoleriteAltaCalculado {
    const {
        worker,
        horasTrabalhadas,
        tarifaHora,
        proventosAdicionais = 0,
        alojamento = 0,
        eventosDescontos = [],
        housingBenefitAmount = 0,
        mesReferencia,
        empresas = [],
        workerMonthlyActivity,
        customParams = {}
    } = options;

    const params: HoleriteParams = { ...DEFAULT_HOLERITE_PARAMS, ...customParams };
    const empresaInfo = resolveEmpresaInfo(worker, empresas, workerMonthlyActivity);
    const periodo = getPeriodoDatas(mesReferencia);

    // 1. Cálculos de Remuneração Real Gerencial
    const valorHoras = Math.round((horasTrabalhadas * tarifaHora + Number.EPSILON) * 100) / 100;
    const totalAlojamento = Number(alojamento || housingBenefitAmount || 0);
    const totalRemuneracoes = Math.round((valorHoras + totalAlojamento + proventosAdicionais + Number.EPSILON) * 100) / 100;

    // Descontos detalhados
    const descontosParsed = parseDescontosCategorias(eventosDescontos);
    const liquidoRealAlvo = Math.max(0, Math.round((totalRemuneracoes - descontosParsed.totalDescontosDetalhados + Number.EPSILON) * 100) / 100);

    // 2. Proporção para casos de contratação parcial ou rendimento baixo
    // Salário base integral de referência = 920.00
    const salarioBaseIntegral = params.salarioBasePortugal;
    
    // Se o trabalhador trabalhou muito pouco ou rendimento total for menor que o salário base:
    const isProporcional = liquidoRealAlvo > 0 && liquidoRealAlvo < salarioBaseIntegral;
    const proporcao = isProporcional ? Math.max(0.2, liquidoRealAlvo / salarioBaseIntegral) : 1.0;

    const vencimentoBase = isProporcional 
        ? Math.round(salarioBaseIntegral * proporcao * 100) / 100 
        : salarioBaseIntegral;

    const subsFerias = isProporcional 
        ? Math.round(params.duodecimoFeriasMes * proporcao * 100) / 100 
        : params.duodecimoFeriasMes;

    const subsNatal = isProporcional 
        ? Math.round(params.duodecimoNatalMes * proporcao * 100) / 100 
        : params.duodecimoNatalMes;

    // Base de incidência de Segurança Social = Vencimento Base + Férias + Natal
    const baseIncidenciaSS = Math.round((vencimentoBase + subsFerias + subsNatal + Number.EPSILON) * 100) / 100;
    const descontoSSCalculado = Math.round((baseIncidenciaSS * params.ssTaxaTrabalhador + Number.EPSILON) * 100) / 100;

    // Se o imposto foi importado na planilha (ex: 218.80 €), utiliza o valor importado; senão, usa a taxa de 11%
    const descontoSS = descontosParsed.imposto > 0 ? descontosParsed.imposto : descontoSSCalculado;

    // Total de Abonos necessários para que: Total Abonos - Desconto SS === liquidoRealAlvo
    const totalAbonosAlvo = Math.round((liquidoRealAlvo + descontoSS + Number.EPSILON) * 100) / 100;

    // Verbas fixas já alocadas
    const abonosFixos = vencimentoBase + subsFerias + subsNatal;
    let restanteADistribuir = Math.round((totalAbonosAlvo - abonosFixos + Number.EPSILON) * 100) / 100;

    // Subsídio de Alimentação (ex: 4 dias x 6.15 = 24.60 €)
    let diasAlimentacao = 4;
    let valorSubsAlimentacao = Math.round(diasAlimentacao * params.subsidioAlimentacaoDiario * 100) / 100;

    if (restanteADistribuir < valorSubsAlimentacao) {
        diasAlimentacao = Math.max(0, Math.floor(restanteADistribuir / params.subsidioAlimentacaoDiario));
        valorSubsAlimentacao = Math.round(diasAlimentacao * params.subsidioAlimentacaoDiario * 100) / 100;
    }
    restanteADistribuir = Math.round((restanteADistribuir - valorSubsAlimentacao + Number.EPSILON) * 100) / 100;

    // Ajudas de Custo Internacional (148.91 € / dia)
    let diasAjudaCusto = 0;
    let valorAjudaCusto = 0;
    let valorKms = 0;
    let qtdKms = 0;

    if (restanteADistribuir > 0) {
        diasAjudaCusto = Math.floor(restanteADistribuir / params.ajudaCustoDiariaEspanha);
        valorAjudaCusto = Math.round(diasAjudaCusto * params.ajudaCustoDiariaEspanha * 100) / 100;
        
        let sobraCentavos = Math.round((restanteADistribuir - valorAjudaCusto + Number.EPSILON) * 100) / 100;

        // Se sobrou fração ou centavos, equilibramos em Kms em viatura própria (0.40 € / km)
        if (sobraCentavos > 0) {
            qtdKms = Math.round((sobraCentavos / params.kmValorUnitario) * 10) / 10;
            // Ajusta o valor dos Kms para fechar exatamente os centavos restantes
            valorKms = sobraCentavos;
        }
    }

    // Recalcula soma exata dos abonos para conferência de precisão
    const totalAbonosEfetivo = Math.round((
        vencimentoBase +
        valorSubsAlimentacao +
        subsFerias +
        subsNatal +
        valorKms +
        valorAjudaCusto +
        Number.EPSILON
    ) * 100) / 100;

    const totalDescontosEfetivo = descontoSS;
    const totalAReceberEfetivo = Math.round((totalAbonosEfetivo - totalDescontosEfetivo + Number.EPSILON) * 100) / 100;

    // Montagem das Linhas Oficiais do Holerite (TOConline layout)
    const linhasOficiais: HoleriteItemLinha[] = [
        {
            descricao: 'Vencimento Base',
            abonos: vencimentoBase,
        },
        ...(valorSubsAlimentacao > 0 ? [{
            descricao: 'Subs. Alimentação',
            qtd: `${diasAlimentacao}d`,
            valorUnit: params.subsidioAlimentacaoDiario,
            abonos: valorSubsAlimentacao,
        }] : []),
        {
            descricao: 'Subs. Férias (100% c/duodécimos)',
            abonos: subsFerias,
        },
        {
            descricao: 'Subs. Natal (100% c/duodécimos)',
            abonos: subsNatal,
        },
        ...(valorKms > 0 ? [{
            descricao: 'Kms em viatura própria',
            qtd: `${qtdKms > 0 ? qtdKms : 2}km`,
            valorUnit: params.kmValorUnitario,
            abonos: valorKms,
        }] : []),
        ...(valorAjudaCusto > 0 ? [{
            descricao: 'Ajudas Custo Internacional',
            qtd: `${diasAjudaCusto}d`,
            valorUnit: params.ajudaCustoDiariaEspanha,
            abonos: valorAjudaCusto,
        }] : []),
        {
            descricao: 'Segurança Social',
            descontos: totalDescontosEfetivo,
        },
        {
            descricao: 'IRS - Taxa efetiva (Subsídio de Férias): 0%.',
            descontos: 0.00,
        }
    ];

    const valorPorExtenso = numeroPorExtensoEuro(totalAReceberEfetivo);

    return {
        tipo: 'alta',
        worker,
        empresa: empresaInfo,
        periodo,
        dadosProfissionais: {
            categoria: worker.funcion || 'Operador Especializado',
            tipoProcessamento: 'Normalizado',
            baseProcessamento: 'Mensal',
            vencimentoBaseConfig: salarioBaseIntegral,
            salarioHoraCalculado: 5.31,
            horasSemana: 40,
            diasMes: params.diasUteisMesPadrao,
            numMecanografico: worker.cod_colab || worker.id.substring(0, 4),
            niss: worker.niss || '-',
            nif: worker.nif || worker.nie || worker.dni || '-',
        },
        linhasOficiais,
        totais: {
            totalAbonos: totalAbonosEfetivo,
            totalDescontos: totalDescontosEfetivo,
            totalAReceber: totalAReceberEfetivo,
            valorPorExtenso,
        },
        detalhamento: {
            horasTrabalhadas,
            tarifaHora,
            valorHoras,
            alojamento: totalAlojamento,
            ajustesPositivos: proventosAdicionais,
            totalRemuneracoes,
            descontos: descontosParsed,
            liquidoReal: totalAReceberEfetivo,
            clientHoursBreakdown: workerMonthlyActivity?.clientHoursBreakdown,
        }
    };
}

/**
 * MOTOR 2: Cálculo para Trabalhador EM REGULARIZAÇÃO (Demonstrativo de Prestação de Serviços)
 */
export function calculateHoleriteRegularizacao(options: {
    worker: Worker & { worker_beneficios_settings?: any };
    horasTrabalhadas: number;
    tarifaHora: number;
    alojamento?: number;
    housingBenefitAmount?: number;
    eventosDescontos?: any[];
    mesReferencia: string;
    empresas?: Empresa[];
    workerMonthlyActivity?: { contratante?: string; cliente_nombre?: string; clientHoursBreakdown?: Array<{ clientName: string; hours: number }> };
}): HoleriteRegularizacaoCalculado {
    const {
        worker,
        horasTrabalhadas,
        tarifaHora,
        alojamento = 0,
        housingBenefitAmount = 0,
        eventosDescontos = [],
        mesReferencia,
        empresas = [],
        workerMonthlyActivity
    } = options;

    const empresaInfo = resolveEmpresaInfo(worker, empresas, workerMonthlyActivity);
    const periodo = getPeriodoDatas(mesReferencia);

    const valorTotalHoras = Math.round((horasTrabalhadas * tarifaHora + Number.EPSILON) * 100) / 100;
    const totalAlojamento = Number(alojamento || housingBenefitAmount || 0);
    const totalBruto = Math.round((valorTotalHoras + totalAlojamento + Number.EPSILON) * 100) / 100;

    const descontosParsed = parseDescontosCategorias(eventosDescontos);
    const totalLiquido = Math.max(0, Math.round((totalBruto - descontosParsed.totalDescontosDetalhados + Number.EPSILON) * 100) / 100);

    return {
        tipo: 'regularizacao',
        worker,
        empresa: empresaInfo,
        periodo: {
            mesAnoTexto: periodo.mesAnoTexto,
            dataEmissao: periodo.dataEmissao,
            mesReferencia,
        },
        servicoPrestado: worker.funcion || 'Manutenção Equipamentos',
        horas: {
            tarifaHora,
            quantidadeHoras: horasTrabalhadas,
            valorTotalHoras,
            ajudaAlojamento: totalAlojamento,
            totalBruto,
            clientHoursBreakdown: workerMonthlyActivity?.clientHoursBreakdown,
        },
        descontos: descontosParsed,
        totalLiquido,
        formaPagamento: 'Transferência Bancária',
        moeda: 'Euro (€)',
    };
}
