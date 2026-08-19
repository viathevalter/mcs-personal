/**
 * Normaliza e resolve categorias de descontos considerando maiúsculas/minúsculas e apelidos legados.
 */
export const STANDARD_DISCOUNT_CATEGORIES = [
    'ADIANTAMENTO',
    'COMBUSTIBLE',
    'DESCONTO CARRO',
    'EPIS',
    'IMPOSTO SS',
    'LIMPIEZA O DAÑOS',
    'MULTA ALOJAMIENTO',
    'MULTA TRANSITO',
    'OUTROS',
    'PEAJES',
    'SUMINISTROS',
    'TAXA BANCÁRIA'
];

export function normalizeDiscountCategoryName(
    categoryInput?: string | null,
    availableCategories?: Array<{ id?: string; name: string }> | string[]
): string {
    if (!categoryInput) return '';

    const cleanInput = categoryInput.trim();
    if (!cleanInput) return '';

    const candidateList: string[] = availableCategories && availableCategories.length > 0
        ? availableCategories.map(c => typeof c === 'string' ? c : c.name)
        : STANDARD_DISCOUNT_CATEGORIES;

    // 1. Verificação de correspondência exata
    const exact = candidateList.find(c => c === cleanInput);
    if (exact) return exact;

    // 2. Verificação case-insensitive
    const lowerInput = cleanInput.toLowerCase();
    const caseMatch = candidateList.find(c => c.toLowerCase() === lowerInput);
    if (caseMatch) return caseMatch;

    // 3. Mapeamento inteligente de apelidos legados / variações
    if (lowerInput.includes('carro') || lowerInput.includes('aluguel') || lowerInput.includes('veiculo') || lowerInput.includes('auto')) {
        const match = candidateList.find(c => c.toUpperCase() === 'DESCONTO CARRO');
        if (match) return match;
    }

    if (lowerInput.includes('adiantamento') || lowerInput.includes('vale') || lowerInput.includes('anticipo')) {
        const match = candidateList.find(c => c.toUpperCase() === 'ADIANTAMENTO');
        if (match) return match;
    }

    if (lowerInput.includes('banc') || lowerInput.includes('taxa') || lowerInput.includes('tarifa')) {
        const match = candidateList.find(c => c.toUpperCase().includes('TAXA') || c.toUpperCase().includes('BANC'));
        if (match) return match;
    }

    if (lowerInput.includes('imposto') || lowerInput.includes('seguridad') || lowerInput.includes('ss') || lowerInput.includes('irs') || lowerInput.includes('retenc')) {
        const match = candidateList.find(c => c.toUpperCase().includes('IMPOSTO') || c.toUpperCase().includes('SS'));
        if (match) return match;
    }

    if (lowerInput.includes('combust')) {
        const match = candidateList.find(c => c.toUpperCase().includes('COMBUST'));
        if (match) return match;
    }

    if (lowerInput.includes('peaje') || lowerInput.includes('pedagio')) {
        const match = candidateList.find(c => c.toUpperCase().includes('PEAJE'));
        if (match) return match;
    }

    if (lowerInput.includes('limpeza') || lowerInput.includes('limpieza') || lowerInput.includes('dano') || lowerInput.includes('avaria')) {
        const match = candidateList.find(c => c.toUpperCase().includes('LIMPIEZA') || c.toUpperCase().includes('DAÑOS'));
        if (match) return match;
    }

    if (lowerInput.includes('multa') && (lowerInput.includes('transito') || lowerInput.includes('trafego') || lowerInput.includes('radar'))) {
        const match = candidateList.find(c => c.toUpperCase().includes('TRANSITO'));
        if (match) return match;
    }

    if (lowerInput.includes('alojamento') || lowerInput.includes('moradia') || lowerInput.includes('vivienda')) {
        const match = candidateList.find(c => c.toUpperCase().includes('ALOJAMIENTO'));
        if (match) return match;
    }

    if (lowerInput.includes('epi')) {
        const match = candidateList.find(c => c.toUpperCase() === 'EPIS');
        if (match) return match;
    }

    if (lowerInput.includes('suministro') || lowerInput.includes('suprimento')) {
        const match = candidateList.find(c => c.toUpperCase().includes('SUMINISTROS'));
        if (match) return match;
    }

    // Se não encontrou alias, retorna a string em maiúsculas se existir, ou a original
    const upperMatch = candidateList.find(c => c.toUpperCase() === cleanInput.toUpperCase());
    if (upperMatch) return upperMatch;

    return cleanInput;
}
