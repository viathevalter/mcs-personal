import type { Empresa } from '../types/coreCommon';

export const HOLDING_EMPRESA_ID = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

export function isHolding(empresa?: Empresa | null): boolean {
    if (!empresa) return false;
    if (empresa.is_holding) return true;
    if (empresa.id === HOLDING_EMPRESA_ID) return true;
    if (empresa.codigo === 'GRP') return true;
    const name = (empresa.trade_name || empresa.legal_name || empresa.nome || '').toLowerCase();
    return name.includes('login pro');
}

export function isHoldingId(empresaId?: string | null, empresas?: Empresa[]): boolean {
    if (!empresaId) return false;
    if (empresaId === HOLDING_EMPRESA_ID) return true;
    if (empresas && empresas.length > 0) {
        const found = empresas.find(e => e.id === empresaId);
        if (found) return isHolding(found);
    }
    return false;
}

export function getEffectiveEmpresaId(empresaId?: string | null, empresas?: Empresa[]): string | null {
    if (!empresaId) return null;
    if (isHoldingId(empresaId, empresas)) return null;
    return empresaId;
}
