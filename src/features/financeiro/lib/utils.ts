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

// Date Parsing: Handles ISO (YYYY-MM-DD), EU (DD/MM/YYYY), Spanish Text
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  let cleanDate = dateStr.trim();

  // Handle Spanish month names first
  const spanishMonths: { [key: string]: string } = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
    'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
  };

  Object.keys(spanishMonths).forEach(m => {
    const regex = new RegExp(`\\b${m}\\b`, 'yi'); // case insensitive match
    if (cleanDate.toLowerCase().includes(m)) {
      cleanDate = cleanDate.toLowerCase().replace(m, spanishMonths[m]).replace(/ de | del | of | /gi, '/');
    }
  });

  // Split by common separators
  const parts = cleanDate.split(/[-/\s]/).filter(p => p.trim() !== '');

  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2].split(' ')[0], 10); // Handle "2025 10:00"

    // ISO Format detection: YYYY-MM-DD (First part is 4 digits)
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(p0, p1 - 1, p2);
    }

    // Standard EU Format: DD-MM-YYYY (Last part is 4 digits)
    if (parts[2].length === 4 || p2 > 1000) {
      return new Date(p2, p1 - 1, p0);
    }
  }

  // Fallback
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return null;
};

export const formatDate = (date: Date | null): string => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-ES').format(date);
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
