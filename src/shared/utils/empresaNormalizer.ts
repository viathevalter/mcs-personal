/**
 * Empresa normalization utility to ensure consistent uppercase canonical names
 * across all modules, filters, exports, and dropdowns.
 */

export const CANONICAL_EMPRESAS = [
    'WISEOWE',
    'LUMINOUS',
    'STOCCO',
    'TRIANGULO',
    'KOTRIK & ROSAS',
    'GENIO',
    'SANTIFER'
] as const;

export type CanonicalEmpresa = typeof CANONICAL_EMPRESAS[number];

/**
 * Normalizes any raw company string, legal name, or variation to the canonical uppercase company name.
 * Examples:
 *  - "WISEOWE, UNIPESSOAL LDA" -> "WISEOWE"
 *  - "Wiseowe" -> "WISEOWE"
 *  - "LUMINOUS ALLEY, UNIPESSOAL LDA" -> "LUMINOUS"
 *  - "Stocco, Lda" -> "STOCCO"
 *  - "Triangulo Matizado, Unipessoal LDA" -> "TRIANGULO"
 */
export function normalizeEmpresaName(raw?: string | null): string {
    if (!raw) return '';
    const upper = raw.trim().toUpperCase();

    if (upper.includes('WISEOWE')) return 'WISEOWE';
    if (upper.includes('LUMINOUS') || upper.includes('LUMINUS')) return 'LUMINOUS';
    if (upper.includes('STOCCO')) return 'STOCCO';
    if (upper.includes('TRIANGULO') || upper.includes('TRIÂNGULO')) return 'TRIANGULO';
    if (upper.includes('KOTRIK') || upper.includes('ROSAS')) return 'KOTRIK & ROSAS';
    if (upper.includes('GENIO') || upper.includes('GÊNIO')) return 'GENIO';
    if (upper.includes('SANTIFER') || upper.includes('SANTFER')) return 'SANTIFER';
    if (upper.includes('LOGIN PRO')) return 'LOGIN PRO';

    return upper;
}

/**
 * Finds the matching Empresa entity from a list of Empresa objects based on name, code, or trade name.
 */
export function findMatchingEmpresa<T extends { id: string; nome?: string | null; trade_name?: string | null; codigo?: string | null }>(
    empresas: T[],
    rawNameOrCode?: string | null
): T | undefined {
    if (!rawNameOrCode || !empresas.length) return undefined;
    const targetNorm = normalizeEmpresaName(rawNameOrCode);
    if (!targetNorm) return undefined;

    return empresas.find(e => {
        if (e.id === rawNameOrCode) return true;
        const eNormNome = normalizeEmpresaName(e.nome);
        const eNormTrade = normalizeEmpresaName(e.trade_name);
        const eCodigo = (e.codigo || '').toUpperCase();
        return (
            eNormNome === targetNorm ||
            eNormTrade === targetNorm ||
            eCodigo === targetNorm ||
            (targetNorm.length >= 3 && (eNormNome.includes(targetNorm) || eNormTrade.includes(targetNorm)))
        );
    });
}

/**
 * Checks if a worker's company matches the selected company filter,
 * taking into account canonical normalization.
 */
export function matchesEmpresaFilter(workerEmpresa?: string | null, filterVal?: string | null): boolean {
    if (!filterVal || filterVal === 'all' || filterVal === 'ALL') return true;
    if (!workerEmpresa) return false;

    const normWorker = normalizeEmpresaName(workerEmpresa);
    const normFilter = normalizeEmpresaName(filterVal);

    if (normWorker === normFilter) return true;
    return normWorker.includes(normFilter) || normFilter.includes(normWorker);
}
