import { format, isValid, parse } from 'date-fns';

export interface SimpleWorker {
    id: string;
    cod_colab?: string | null;
    nome: string;
    empresa_id?: string | null;
    contratante?: string | null;
}

export function normalizeText(str?: string | null): string {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export interface MatchResult {
    worker: SimpleWorker;
    matchMethod: 'code_exact' | 'code_numeric' | 'name_exact' | 'name_fuzzy';
}

/**
 * Multi-pass worker lookup:
 * 1. Exact match on cod_colab (case-insensitive, trimmed)
 * 2. Number-based cod_colab match (e.g. "1958" matches "E1958", "447" matches "E0447")
 * 3. Exact normalized name match
 * 4. Substring / fuzzy name match
 */
export function findMatchingWorker(
    workers: SimpleWorker[],
    rawCod?: string | null,
    rawNome?: string | null
): MatchResult | null {
    const codClean = String(rawCod || '').trim().toUpperCase();
    const nomeClean = normalizeText(rawNome);

    // Skip summary / header / invalid rows like "TOTAL GENERAL"
    if (!codClean && !nomeClean) return null;
    if (codClean === 'TOTAL GENERAL' || codClean === 'TOTAL' || codClean === 'SUBTOTAL' || codClean === 'TOTALES') {
        return null;
    }
    if (nomeClean === 'total general' || nomeClean === 'total' || nomeClean === 'subtotal') {
        return null;
    }

    if (codClean) {
        // 1. Exact match on cod_colab
        let found = workers.find(w => String(w.cod_colab || '').trim().toUpperCase() === codClean);
        if (found) return { worker: found, matchMethod: 'code_exact' };

        // 2. Numeric code match (e.g., 1958 -> E1958, 447 -> E0447)
        const digits = codClean.replace(/\D/g, '');
        if (digits) {
            const numVal = parseInt(digits, 10);
            found = workers.find(w => {
                const wDigits = String(w.cod_colab || '').replace(/\D/g, '');
                return !!wDigits && parseInt(wDigits, 10) === numVal;
            });
            if (found) return { worker: found, matchMethod: 'code_numeric' };
        }
    }

    // 3. Name match
    if (nomeClean && nomeClean.length > 2) {
        // Exact normalized name match
        let found = workers.find(w => normalizeText(w.nome) === nomeClean);
        if (found) return { worker: found, matchMethod: 'name_exact' };

        // Substring name match
        found = workers.find(w => {
            const wNorm = normalizeText(w.nome);
            return wNorm.length > 2 && (wNorm.includes(nomeClean) || nomeClean.includes(wNorm));
        });
        if (found) return { worker: found, matchMethod: 'name_fuzzy' };
    }

    return null;
}

export interface CompetenceOption {
    value: string; // YYYY-MM-01
    label: string; // "Julho / 2026"
    shortLabel: string; // "07/2026"
}

export function getCompetenceOptions(): CompetenceOption[] {
    const options: CompetenceOption[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Generate for previous year, current year, next year
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        for (let m = 0; m < 12; m++) {
            const monthStr = String(m + 1).padStart(2, '0');
            const value = `${year}-${monthStr}-01`;
            const label = `Competência de ${monthNames[m]} / ${year}`;
            const shortLabel = `${monthNames[m]} ${year}`;
            options.push({ value, label, shortLabel });
        }
    }
    return options;
}

export function getCurrentCompetence(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
}

export function parseExcelDateToISO(excelDate: any): string | null {
    if (!excelDate) return null;

    if (excelDate instanceof Date) {
        if (isValid(excelDate)) return format(excelDate, 'yyyy-MM-01');
        return null;
    }

    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        if (isValid(utcDate)) {
            return format(utcDate, 'yyyy-MM-01');
        }
        return null;
    }

    if (typeof excelDate === 'string') {
        const str = excelDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const [d, m, y] = str.split('/');
            return `${y}-${m}-${d}`;
        }
    }

    return null;
}

export function calculateProratedBenefitAmount(
    hb: {
        monthly_amount: number;
        start_date: string;
        end_date?: string | null;
        proration_method?: string | null;
    },
    mesReferencia: string // e.g. "2026-07" or "2026-07-01"
): number {
    if (!hb || !hb.monthly_amount || !hb.start_date || !mesReferencia) return 0;

    const amount = Number(hb.monthly_amount);
    if (isNaN(amount) || amount <= 0) return 0;

    const cleanMesRef = mesReferencia.substring(0, 7); // "YYYY-MM"
    const parts = cleanMesRef.split('-').map(Number);
    if (parts.length < 2) return amount;

    const year = parts[0];
    const month = parts[1]; // 1-indexed

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayInMonthNumber = new Date(year, month, 0).getDate();
    const lastDayOfMonth = new Date(year, month - 1, lastDayInMonthNumber);

    // Parse start_date and end_date safely (YYYY-MM-DD)
    const startStr = hb.start_date.substring(0, 10);
    const startParts = startStr.split('-').map(Number);
    const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);

    let endDateObj = new Date(9999, 11, 31);
    if (hb.end_date) {
        const endStr = hb.end_date.substring(0, 10);
        const endParts = endStr.split('-').map(Number);
        endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    }

    // Overlap with competence month
    const overlapStart = startDateObj > firstDayOfMonth ? startDateObj : firstDayOfMonth;
    const overlapEnd = endDateObj < lastDayOfMonth ? endDateObj : lastDayOfMonth;

    if (overlapStart > overlapEnd) return 0;

    const eligibleDays = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // If benefit is active for the full month, return full amount
    if (eligibleDays >= lastDayInMonthNumber) {
        return amount;
    }

    const prorationMethod = hb.proration_method || 'daily_actual';

    if (prorationMethod === 'daily_30') {
        return Number(((amount * eligibleDays) / 30).toFixed(2));
    } else {
        // daily_actual: divide by actual days in this month
        return Number(((amount * eligibleDays) / lastDayInMonthNumber).toFixed(2));
    }
}

