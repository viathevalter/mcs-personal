import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency to European format (e.g., 1.234,56 €)
// Format currency to European format (e.g., 1.234,56 €)
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCompactCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

// Parse European number string to float (e.g. "1.234,56" -> 1234.56)
// Number Parsing: Handles both EU (1.234,56) and US (1,234.56) formats
export const parseEuroNumber = (str: string | number | null | undefined): number => {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;

  // Convert to string, trim, remove currency symbol (€), whitespace, and "EUR"
  let cleanStr = String(str).trim().replace(/[€\s]|^EUR\s*|EUR$/gi, '');

  if (!cleanStr) return 0;

  // Check format heuristics
  const lastCommaIndex = cleanStr.lastIndexOf(',');
  const lastDotIndex = cleanStr.lastIndexOf('.');

  // Scenario 1: EU Format (1.234,56) -> Comma is decimal, Dot is thousands
  // Heuristic: Comma is after the last dot (if any), OR only comma exists as separator
  if (lastCommaIndex > lastDotIndex) {
    // Remove thousands separator (.)
    cleanStr = cleanStr.replace(/\./g, '');
    // Replace decimal separator (,) with (.)
    cleanStr = cleanStr.replace(',', '.');
  }
  // Scenario 2: US/Standard Format (1,234.56 or 1234.56) -> Dot is decimal
  else if (lastDotIndex > lastCommaIndex) {
    // Remove thousands separator (,)
    cleanStr = cleanStr.replace(/,/g, '');
    // Dot remains as decimal separator
  }

  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAME_MAP: { [key: string]: number } = {
  'janeiro': 0, 'jan': 0, 'enero': 0, 'ene': 0, 'january': 0,
  'fevereiro': 1, 'fev': 1, 'febrero': 1, 'feb': 1, 'february': 1,
  'março': 2, 'marco': 2, 'mar': 2, 'marzo': 2, 'march': 2,
  'abril': 3, 'abr': 3, 'april': 3, 'apr': 3,
  'maio': 4, 'mai': 4, 'mayo': 4, 'may': 4,
  'junho': 5, 'jun': 5, 'junio': 5, 'june': 5,
  'julho': 6, 'jul': 6, 'julio': 6, 'july': 6,
  'agosto': 7, 'ago': 7, 'august': 7, 'aug': 7,
  'setembro': 8, 'set': 8, 'septiembre': 8, 'sep': 8, 'sept': 8, 'september': 8,
  'outubro': 9, 'out': 9, 'octubre': 9, 'oct': 9, 'october': 9,
  'novembro': 10, 'nov': 10, 'noviembre': 10, 'november': 10,
  'dezembro': 11, 'dez': 11, 'diciembre': 11, 'dic': 11, 'december': 11, 'dec': 11
};

// Date Parsing: Handles ISO (YYYY-MM-DD), EU (DD/MM/YYYY, DD-MM-YYYY), Spanish & Portuguese Text
export const parseDate = (dateStr: string | Date | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  let cleanDate = String(dateStr).trim();
  if (!cleanDate || cleanDate === '-') return null;

  // Sort month keys by length descending so full names match before 3-letter prefixes
  const monthKeys = Object.keys(MONTH_NAME_MAP).sort((a, b) => b.length - a.length);
  for (const m of monthKeys) {
    const regex = new RegExp(`(^|[^a-záàâãéêíóôõúç])${m}([^a-záàâãéêíóôõúç]|$)`, 'i');
    if (regex.test(cleanDate)) {
      const mNum = String(MONTH_NAME_MAP[m] + 1).padStart(2, '0');
      cleanDate = cleanDate.replace(new RegExp(m, 'i'), mNum).replace(/ de | del | of | /gi, '/');
      break;
    }
  }

  // Split by common separators
  const parts = cleanDate.split(/[-/\s]/).filter(p => p.trim() !== '');

  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2].split(/[T\s]/)[0], 10); // Handle "2025 10:00" or "30T00:00:00.000Z"

    // ISO Format detection: YYYY-MM-DD (First part is 4 digits)
    if (parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2);
    }

    // Standard EU Format: DD-MM-YYYY or DD/MM/YYYY (Last part is 4 digits)
    if (parts[2].split(/[T\s]/)[0].length === 4 || p2 > 1000) {
      return new Date(p2, p1 - 1, p0);
    }
  }

  // Fallback
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return null;
};

// Always format as DD/MM/YYYY with slashes
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d || isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Normalize billing period to Portuguese standard: "Setembro 2026"
export const normalizePeriodoFat = (raw?: string | null, fallbackDate?: Date | string | null): string => {
  if (!raw || !raw.trim()) {
    if (fallbackDate) {
      const d = typeof fallbackDate === 'string' ? parseDate(fallbackDate) : fallbackDate;
      if (d && !isNaN(d.getTime())) {
        return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    return '';
  }

  const clean = raw.trim().toLowerCase();
  if (clean.includes('aplica')) return 'Não se aplica';

  const yearMatch = clean.match(/\b(20\d{2})\b/);
  let fallbackYear = '2026';
  if (fallbackDate) {
    const d = typeof fallbackDate === 'string' ? parseDate(fallbackDate) : fallbackDate;
    if (d && !isNaN(d.getTime())) fallbackYear = String(d.getFullYear());
  }
  const year = yearMatch ? yearMatch[1] : fallbackYear;

  const tokens = clean.split(/[^a-záàâãéêíóôõúç]+/).filter(Boolean);
  let foundMonthIdx = -1;
  for (const token of tokens) {
    if (MONTH_NAME_MAP[token] !== undefined) {
      foundMonthIdx = MONTH_NAME_MAP[token];
    }
  }

  if (foundMonthIdx !== -1) {
    return `${MONTHS_PT[foundMonthIdx]} ${year}`;
  }

  return raw.trim();
};

// Convert "Setembro 2026" -> numeric sort value (e.g. 202608) for chronological sorting
export const getPeriodoFatSortValue = (periodo?: string | null): number => {
  if (!periodo) return -1;
  const norm = normalizePeriodoFat(periodo);
  if (!norm || norm === 'Não se aplica') return 0;
  const parts = norm.split(/\s+/);
  if (parts.length >= 2) {
    const mIdx = MONTH_NAME_MAP[parts[0].toLowerCase()];
    const year = parseInt(parts[1], 10);
    if (mIdx !== undefined && !isNaN(year)) {
      return year * 100 + mIdx;
    }
  }
  return 0;
};

// Sort periods chronologically descending (newest first, "Não se aplica" at the end)
export const sortPeriodosFatDesc = (periodos: string[]): string[] => {
  return [...periodos].sort((a, b) => {
    const valA = getPeriodoFatSortValue(a);
    const valB = getPeriodoFatSortValue(b);
    if (valA !== valB) return valB - valA;
    return a.localeCompare(b);
  });
};

export const isSameDay = (d1: Date, d2: Date) => {
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
};

export const isDateInRange = (date: Date, start: Date, end: Date) => {
  // Normalize to start of day for accurate comparison
  const d = new Date(date.setHours(0, 0, 0, 0));
  const s = new Date(start.setHours(0, 0, 0, 0));
  const e = new Date(end.setHours(23, 59, 59, 999));
  return d >= s && d <= e;
};

export const normalizeEmpresaName = (raw?: string | null): string => {
  if (!raw) return '';
  const upper = raw.trim().toUpperCase();
  if (upper.includes('LUMINOUS')) return 'LUMINOUS';
  if (upper.includes('STOCCO')) return 'STOCCO';
  if (upper.includes('WISEOWE')) return 'WISEOWE';
  if (upper.includes('TRIANGULO') || upper.includes('TRIÂNGULO')) return 'TRIANGULO';
  if (upper.includes('KOTRIK')) return 'KOTRIK';
  if (upper.includes('ROSAS')) return 'ROSAS';
  if (upper.includes('GENIO') || upper.includes('GÊNIO')) return 'GENIO';
  if (upper.includes('SANTIFER')) return 'SANTIFER';
  if (upper.includes('LOGIN PRO')) return 'LOGIN PRO';
  return upper;
};
