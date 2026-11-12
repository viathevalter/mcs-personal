import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
  getCommercialProfileByUser,
} from '@/features/comercial/leads/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Award,
  Search,
  MapPin,
  Building2,
  Copy,
  Download,
  CheckSquare,
  Square,
  ShieldCheck,
  RefreshCw,
  Briefcase,
  UserCheck,
  Receipt,
  Globe2,
  Mail,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

export type BillingCompanyKey =
  | 'WISEOWE'
  | 'LUMINOUS'
  | 'TRIANGULO'
  | 'STOCCO'
  | 'GENIO'
  | 'KOTRIK'
  | 'HEXAGON';

export type DossierLanguage = 'es' | 'fr' | 'it';

interface CompanyBrandConfig {
  key: BillingCompanyKey;
  code: string;
  empresaId: string;
  shortLabel: string;
  brandTitle: Record<DossierLanguage, string>;
  legalName: string;
  nif: string;
  website: string;
  logoPath: string;
  logoOnDark: boolean;
  headerRgb: [number, number, number];
  accentRgb: [number, number, number];
  zoneTextRgb: [number, number, number];
  headerHex: string;
  accentHex: string;
  pillClass: string;
  activeFilterPillClass: string;
  defaultRepName: string;
  defaultRepEmail: string;
  defaultRepPhone: string;
}

const COMPANY_BRANDS: Record<BillingCompanyKey, CompanyBrandConfig> = {
  WISEOWE: {
    key: 'WISEOWE',
    code: 'WIS',
    empresaId: 'dae64d51-2181-4510-b14f-e63d2f111a8e',
    shortLabel: 'Wiseowe',
    brandTitle: {
      es: 'WISEOWE SERVICIOS INDUSTRIALES',
      fr: 'WISEOWE INDUSTRIE FRANCE',
      it: 'WISEOWE SERVIZI INDUSTRIALI',
    },
    legalName: 'WISEOWE, UNIPESSOAL LDA',
    nif: 'PT 518 599 280',
    website: 'www.wiseowe.com',
    logoPath: '/assets/images/wiseowe-logo.png',
    logoOnDark: true,
    headerRgb: [12, 25, 44],
    accentRgb: [20, 184, 166],
    zoneTextRgb: [15, 118, 110],
    headerHex: '#0C192C',
    accentHex: '#14B8A6',
    pillClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    activeFilterPillClass: 'bg-teal-600 text-white border-teal-600 shadow-sm',
    defaultRepName: 'Liseth Alexandra',
    defaultRepEmail: 'comercial2@wiseowe.com',
    defaultRepPhone: '+34 937 37 15 40',
  },
  LUMINOUS: {
    key: 'LUMINOUS',
    code: 'LUM',
    empresaId: '847796c4-b253-4e53-9e6b-34a127ec7d85',
    shortLabel: 'Luminous',
    brandTitle: {
      es: 'LUMINOUS ALLEY · SERVICIOS INDUSTRIALES',
      fr: 'LUMINOUS ALLEY · SERVICES INDUSTRIELS',
      it: 'LUMINOUS ALLEY · SERVIZI INDUSTRIALI',
    },
    legalName: 'LUMINOUS ALLEY, UNIPESSOAL LDA',
    nif: 'PT 518 954 021',
    website: 'www.luminousalley.com',
    logoPath: '/luminous-logo-official-2026.png',
    logoOnDark: true,
    headerRgb: [15, 23, 42],
    accentRgb: [245, 158, 11],
    zoneTextRgb: [180, 83, 9],
    headerHex: '#0F172A',
    accentHex: '#F59E0B',
    pillClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    activeFilterPillClass: 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm',
    defaultRepName: 'Alex Carmona Archiles',
    defaultRepEmail: 'comercial1@luminousalley.com',
    defaultRepPhone: '+34 937 37 41 80',
  },
  TRIANGULO: {
    key: 'TRIANGULO',
    code: 'TRI',
    empresaId: 'a798620a-358a-4c6c-9db2-3a507c583cac',
    shortLabel: 'Triángulo',
    brandTitle: {
      es: 'TRIÁNGULO SERVICIOS INDUSTRIALES',
      fr: 'TRIÁNGULO SERVICES INDUSTRIELS',
      it: 'TRIÁNGULO SERVIZI INDUSTRIALI',
    },
    legalName: 'TRIANGULO MATIZADO, UNIPESSOAL LDA',
    nif: 'PT 518 818 799',
    website: 'www.triangulolda.com',
    logoPath: '/triangulo_logo_blanco_ES.png',
    logoOnDark: true,
    headerRgb: [15, 23, 42],
    accentRgb: [37, 99, 235],
    zoneTextRgb: [29, 78, 216],
    headerHex: '#0F172A',
    accentHex: '#2563EB',
    pillClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    activeFilterPillClass: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    defaultRepName: 'Alba Bernal',
    defaultRepEmail: 'comercial4@triangulolda.com',
    defaultRepPhone: '+34 937 37 48 30',
  },
  STOCCO: {
    key: 'STOCCO',
    code: 'STO',
    empresaId: '441f1f5d-aed3-40e3-8c77-7b1217757251',
    shortLabel: 'Stocco',
    brandTitle: {
      es: 'STOCCO SERVICIOS INDUSTRIALES',
      fr: 'STOCCO SERVICES INDUSTRIELS',
      it: 'STOCCO SERVIZI INDUSTRIALI',
    },
    legalName: 'STOCCO, LDA',
    nif: 'PT 517 884 747',
    website: 'www.stocco.pt',
    logoPath: '/assets/images/logo-stocco.png',
    logoOnDark: false,
    headerRgb: [15, 23, 42],
    accentRgb: [225, 29, 72],
    zoneTextRgb: [190, 18, 60],
    headerHex: '#0F172A',
    accentHex: '#E11D48',
    pillClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    activeFilterPillClass: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    defaultRepName: 'Departamento Comercial',
    defaultRepEmail: 'ventas@stocco.pt',
    defaultRepPhone: '+34 937 37 41 80',
  },
  GENIO: {
    key: 'GENIO',
    code: 'GEN',
    empresaId: '4a507974-f922-409f-83c0-9ef8cbf982cb',
    shortLabel: 'Génio',
    brandTitle: {
      es: 'GÉNIO MONTAGENS INDUSTRIALES',
      fr: 'GÉNIO MONTAGES INDUSTRIELS',
      it: 'GÉNIO MONTAGGI INDUSTRIALI',
    },
    legalName: 'GENIO VENERAVEL UNIPESSOAL LDA',
    nif: 'PT 518 000 000',
    website: 'www.geniomontagens.com',
    logoPath: '/assets/images/genio/logo_full.png',
    logoOnDark: false,
    headerRgb: [10, 37, 64],
    accentRgb: [220, 38, 38],
    zoneTextRgb: [185, 28, 28],
    headerHex: '#0A2540',
    accentHex: '#DC2626',
    pillClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    activeFilterPillClass: 'bg-orange-600 text-white border-orange-600 shadow-sm',
    defaultRepName: 'Ayslan',
    defaultRepEmail: 'comercial5@geniomontagens.com',
    defaultRepPhone: '+351 913 417 249',
  },
  KOTRIK: {
    key: 'KOTRIK',
    code: 'KOR',
    empresaId: 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
    shortLabel: 'Kotrik / Rosas',
    brandTitle: {
      es: 'KOTRIK & ROSAS INDUSTRIAL',
      fr: 'KOTRIK & ROSAS INDUSTRIE',
      it: 'KOTRIK & ROSAS INDUSTRIALE',
    },
    legalName: 'KOTRIK INDUSTRIAL, LDA',
    nif: 'PT 515 660 710',
    website: 'www.kotrik.pt',
    logoPath: '/logo_mcs_transparent.png',
    logoOnDark: false,
    headerRgb: [15, 23, 42],
    accentRgb: [99, 102, 241],
    zoneTextRgb: [67, 56, 202],
    headerHex: '#0F172A',
    accentHex: '#6366F1',
    pillClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    activeFilterPillClass: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
    defaultRepName: 'Departamento Comercial',
    defaultRepEmail: 'vendas@kotrik.pt',
    defaultRepPhone: '+351 210 000 000',
  },
  HEXAGON: {
    key: 'HEXAGON',
    code: 'HEX',
    empresaId: '2c944db5-f1d0-4789-a562-8cfa1c0155b7',
    shortLabel: 'Hexagon',
    brandTitle: {
      es: 'HEXAGON MONTAJES INDUSTRIALES',
      fr: 'HEXAGON MONTAGES INDUSTRIELS',
      it: 'HEXAGON MONTAGGI INDUSTRIALI',
    },
    legalName: 'HEXAGON MONTAJES INDUSTRIALES, S.L.',
    nif: 'B05688197',
    website: 'www.montajeshexagon.com',
    logoPath: '/logo_mcs_transparent.png',
    logoOnDark: false,
    headerRgb: [15, 23, 42],
    accentRgb: [14, 165, 233],
    zoneTextRgb: [3, 105, 161],
    headerHex: '#0F172A',
    accentHex: '#0EA5E9',
    pillClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    activeFilterPillClass: 'bg-sky-600 text-white border-sky-600 shadow-sm',
    defaultRepName: 'Departamento Comercial',
    defaultRepEmail: 'comercial1@montajeshexagon.com',
    defaultRepPhone: '+34 937 37 41 80',
  },
};

interface DossierPreset {
  id: string;
  label: string;
  companyKey: BillingCompanyKey;
  repName: string;
  repEmail: string;
  repPhone: string;
  defaultCountry: 'ES' | 'FR' | 'IT' | 'ALL';
  language: DossierLanguage;
  ownerKey?: string;
}

const DOSSIER_PRESETS: DossierPreset[] = [
  {
    id: 'wiseowe_liseth',
    label: 'Wiseowe — Liseth Alexandra (Espanha 🇪🇸)',
    companyKey: 'WISEOWE',
    repName: 'Liseth Alexandra',
    repEmail: 'comercial2@wiseowe.com',
    repPhone: '+34 937 37 15 40',
    defaultCountry: 'ES',
    language: 'es',
    ownerKey: 'liseth',
  },
  {
    id: 'triangulo_alba',
    label: 'Triángulo — Alba Bernal (Espanha 🇪🇸)',
    companyKey: 'TRIANGULO',
    repName: 'Alba Bernal',
    repEmail: 'comercial4@triangulolda.com',
    repPhone: '+34 937 37 48 30',
    defaultCountry: 'ES',
    language: 'es',
    ownerKey: 'alba',
  },
  {
    id: 'luminous_alex',
    label: 'Luminous Alley — Alex Carmona (Espanha 🇪🇸)',
    companyKey: 'LUMINOUS',
    repName: 'Alex Carmona Archiles',
    repEmail: 'comercial1@luminousalley.com',
    repPhone: '+34 937 37 41 80',
    defaultCountry: 'ES',
    language: 'es',
    ownerKey: 'alex',
  },
  {
    id: 'stocco_corp',
    label: 'Stocco — Dossiê Corporativo (Espanha 🇪🇸)',
    companyKey: 'STOCCO',
    repName: 'Departamento Comercial',
    repEmail: 'ventas@stocco.pt',
    repPhone: '+34 937 37 41 80',
    defaultCountry: 'ES',
    language: 'es',
  },
  {
    id: 'genio_ayslan',
    label: 'Génio Montagens — Ayslan (Espanha 🇪🇸)',
    companyKey: 'GENIO',
    repName: 'Ayslan',
    repEmail: 'comercial5@geniomontagens.com',
    repPhone: '+351 913 417 249',
    defaultCountry: 'ES',
    language: 'es',
    ownerKey: 'ayslan',
  },
  {
    id: 'wiseowe_fatumata',
    label: 'Wiseowe — Fatumata (França 🇫🇷)',
    companyKey: 'WISEOWE',
    repName: 'Fatumata',
    repEmail: 'comercial3@wiseowe.com',
    repPhone: '+33 1 76 21 06 55',
    defaultCountry: 'FR',
    language: 'fr',
    ownerKey: 'fatumata',
  },
  {
    id: 'wiseowe_giada',
    label: 'Wiseowe — Giada (Itália 🇮🇹)',
    companyKey: 'WISEOWE',
    repName: 'Giada',
    repEmail: 'comercial4@wiseowe.com',
    repPhone: '+39 393 306 0003',
    defaultCountry: 'IT',
    language: 'it',
    ownerKey: 'giada',
  },
  {
    id: 'kotrik_corp',
    label: 'Kotrik & Rosas — Dossiê Corporativo',
    companyKey: 'KOTRIK',
    repName: 'Departamento Comercial',
    repEmail: 'vendas@kotrik.pt',
    repPhone: '+351 210 000 000',
    defaultCountry: 'ES',
    language: 'es',
  },
];

type BillingFilterValue =
  | 'WISEOWE'
  | 'LUMINOUS'
  | 'TRIANGULO'
  | 'STOCCO'
  | 'KOTRIK'
  | 'GENIO'
  | 'ANY_BILLED'
  | 'ALL_CLIENTS';

interface ClientReference {
  id: string;
  codigo?: string;
  trade_name: string;
  legal_name?: string;
  tax_id?: string;
  province?: string;
  city?: string;
  address_line?: string;
  postal_code?: string;
  notes?: string;
  financial_status?: string;
  functions_json?: unknown;
  countryCode: 'ES' | 'FR' | 'IT' | 'PT' | 'OTHER';
  countryLabel: string;
  countryFlag: string;
  zone: string;
  zoneKey: string;
  sectorDisplay: string;
  isRecommended: boolean;
  hasJudicialAlert: boolean;
  billedBy: BillingCompanyKey[];
  billingCounts: Partial<Record<BillingCompanyKey, number>>;
}

interface RawClientRow {
  id: string;
  codigo?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  province?: string | null;
  city?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  financial_status?: string | null;
  functions_json?: unknown;
  countries?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawEmpresaRow {
  id: string;
  codigo?: string | null;
  nome?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
}

interface RawFaturaRow {
  client_id?: string | null;
  empresa_id?: string | null;
  status?: string | null;
}

const REGION_PRESETS = [
  { id: 'all', label: 'Todas as Regiões' },
  { id: 'norte_completo', label: 'Zona Norte Completa (País Vasco, Navarra, Cantabria, Asturias, Galicia, Cast. y León)' },
  { id: 'pais_vasco_navarra', label: 'País Vasco & Navarra (Bizkaia, Álava, Gipuzkoa, Navarra)' },
  { id: 'vizcaya', label: 'Bilbao / Bizkaia (Vizcaya)' },
  { id: 'alava', label: 'Vitoria-Gasteiz / Álava' },
  { id: 'gipuzkoa', label: 'Gipuzkoa (San Sebastián / Donostia)' },
  { id: 'navarra', label: 'Navarra (Pamplona)' },
  { id: 'cantabria', label: 'Cantabria (Santander / Torrelavega)' },
  { id: 'asturias', label: 'Asturias (Oviedo / Gijón / Avilés)' },
  { id: 'galicia', label: 'Galicia (Vigo / A Coruña / Pontevedra)' },
  { id: 'castilla_leon', label: 'Castilla y León (Burgos / León / Valladolid)' },
  { id: 'aragon_rioja', label: 'Aragón & La Rioja (Zaragoza)' },
  { id: 'cataluna', label: 'Cataluña (Barcelona / Tarragona / Girona / Lleida)' },
  { id: 'madrid_centro', label: 'Madrid & Zona Centro (Madrid / Toledo / Cast.-La Mancha)' },
  { id: 'levante', label: 'Comunidad Valenciana & Levante (Valencia / Alicante / Castellón)' },
  { id: 'sur_andalucia', label: 'Andalucía, Murcia & Sur' },
  { id: 'islas', label: 'Islas Canarias & Baleares' },
];

const COUNTRY_FILTERS: Array<{ id: 'ALL' | 'ES' | 'FR' | 'IT' | 'PT'; label: string }> = [
  { id: 'ES', label: '🇪🇸 Espanha' },
  { id: 'FR', label: '🇫🇷 França' },
  { id: 'IT', label: '🇮🇹 Itália' },
  { id: 'PT', label: '🇵🇹 Portugal' },
  { id: 'ALL', label: '🌍 Todos os Países' },
];

function normalizeBillingCompany(raw?: string | null): BillingCompanyKey | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (u.includes('WISE')) return 'WISEOWE';
  if (u.includes('LUMINO') || u.includes('LUMINU') || u === 'LUM') return 'LUMINOUS';
  if (u.includes('TRIANG') || u.includes('TRIÂNG') || u === 'TRI') return 'TRIANGULO';
  if (u.includes('STOCCO') || u.includes('ESTOCO') || u === 'STO') return 'STOCCO';
  if (u.includes('GENIO') || u.includes('GÊNIO') || u === 'GEN') return 'GENIO';
  if (u.includes('KOTRIK') || u.includes('ROSAS') || u === 'KOR') return 'KOTRIK';
  if (u.includes('HEXAGON') || u === 'HEX') return 'HEXAGON';
  return null;
}

function normalizeClientMatchKey(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?l\.?u?\.?|s\.?a\.?u?\.?|s\.?r\.?l\.?|lda|unipessoal|sociedad|limitada|anonima)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function extractSpanishProvincePrefix(postalCode?: string | null, taxId?: string | null): string | null {
  const pc = (postalCode || '').trim();
  if (/^\d{5}$/.test(pc)) {
    return pc.slice(0, 2);
  }
  const cleanTax = (taxId || '').trim().toUpperCase().replace(/^ES/, '').replace(/[^A-Z0-9]/g, '');
  const cifMatch = cleanTax.match(/^[A-HJ-NP-SUVW](\d{2})\d{5}[A-Z0-9]$/);
  if (cifMatch) {
    return cifMatch[1];
  }
  return null;
}

function classifyCountryAndZone(c: RawClientRow): {
  countryCode: 'ES' | 'FR' | 'IT' | 'PT' | 'OTHER';
  countryLabel: string;
  countryFlag: string;
  zone: string;
  zoneKey: string;
} {
  const countryObj = Array.isArray(c.countries) ? c.countries[0] : c.countries;
  const countryNameStr = countryObj?.name || '';
  const rawCountry = String(countryNameStr).toLowerCase().trim();
  const taxUpper = String(c.tax_id || '').toUpperCase().trim();
  const combined = `${c.trade_name || ''} ${c.legal_name || ''} ${c.province || ''} ${c.city || ''} ${c.address_line || ''}`.toLowerCase();

  // 1. Detect non-Spanish countries accurately
  if (
    rawCountry.includes('fran') ||
    taxUpper.startsWith('FR') ||
    combined.includes('clermont-ferrand') ||
    combined.includes('france')
  ) {
    const loc = c.city || c.province || 'FRANCIA';
    return {
      countryCode: 'FR',
      countryLabel: 'França',
      countryFlag: '🇫🇷',
      zone: `FRANCIA · ${loc.toUpperCase()}`,
      zoneKey: 'francia',
    };
  }

  if (
    rawCountry.includes('itál') ||
    rawCountry.includes('ital') ||
    taxUpper.startsWith('IT') ||
    /\bs\.?r\.?l\.?\b/i.test(`${c.trade_name || ''} ${c.legal_name || ''}`)
  ) {
    const loc = c.city || c.province || 'ITALIA';
    return {
      countryCode: 'IT',
      countryLabel: 'Itália',
      countryFlag: '🇮🇹',
      zone: `ITALIA · ${loc.toUpperCase()}`,
      zoneKey: 'italia',
    };
  }

  if (rawCountry.includes('portugal') || taxUpper.startsWith('PT')) {
    const loc = c.city || c.province || 'PORTUGAL';
    return {
      countryCode: 'PT',
      countryLabel: 'Portugal',
      countryFlag: '🇵🇹',
      zone: `PORTUGAL · ${loc.toUpperCase()}`,
      zoneKey: 'portugal',
    };
  }

  if (rawCountry && !rawCountry.includes('espan') && !rawCountry.includes('españ') && !rawCountry.includes('spain')) {
    return {
      countryCode: 'OTHER',
      countryLabel: countryNameStr || 'Internacional',
      countryFlag: '🌍',
      zone: `${String(countryNameStr || 'INTERNACIONAL').toUpperCase()}`,
      zoneKey: 'internacional',
    };
  }

  // 2. Spanish Regional Classification (Text + Postal Code + Spanish CIF/NIF INE prefix)
  const prefix = extractSpanishProvincePrefix(c.postal_code, c.tax_id);

  if (
    combined.includes('vitoria') ||
    combined.includes('alava') ||
    combined.includes('álava') ||
    combined.includes('araba') ||
    prefix === '01'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'VITORIA-GASTEIZ / ÁLAVA', zoneKey: 'alava' };
  }

  if (
    combined.includes('bilbao') ||
    combined.includes('vizcaya') ||
    combined.includes('bizkaia') ||
    combined.includes('barakaldo') ||
    combined.includes('getxo') ||
    combined.includes('durango') ||
    combined.includes('zierbena') ||
    prefix === '48' ||
    prefix === '95'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'BILBAO / BIZKAIA (VIZCAYA)', zoneKey: 'vizcaya' };
  }

  if (
    combined.includes('gipuzkoa') ||
    combined.includes('guipuzcoa') ||
    combined.includes('guipúzcoa') ||
    combined.includes('san sebastian') ||
    combined.includes('san sebastián') ||
    combined.includes('donostia') ||
    combined.includes('irun') ||
    combined.includes('beasain') ||
    combined.includes('bergara') ||
    combined.includes('urretxu') ||
    prefix === '20'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'GIPUZKOA (SAN SEBASTIÁN)', zoneKey: 'gipuzkoa' };
  }

  if (
    combined.includes('navarra') ||
    combined.includes('pamplona') ||
    combined.includes('tudela') ||
    prefix === '31'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'NAVARRA (PAMPLONA)', zoneKey: 'navarra' };
  }

  if (
    combined.includes('cantabria') ||
    combined.includes('santander') ||
    combined.includes('torrelavega') ||
    combined.includes('camargo') ||
    combined.includes('astillero') ||
    prefix === '39'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'CANTABRIA (SANTANDER / TORRELAVEGA)', zoneKey: 'cantabria' };
  }

  if (
    combined.includes('asturias') ||
    combined.includes('gijon') ||
    combined.includes('gijón') ||
    combined.includes('oviedo') ||
    combined.includes('aviles') ||
    combined.includes('avilés') ||
    prefix === '33' ||
    prefix === '52'
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'ASTURIAS (OVIEDO / GIJÓN / AVILÉS)', zoneKey: 'asturias' };
  }

  if (
    combined.includes('galicia') ||
    combined.includes('vigo') ||
    combined.includes('pontevedra') ||
    combined.includes('coruña') ||
    combined.includes('coruna') ||
    combined.includes('ferrol') ||
    combined.includes('lugo') ||
    combined.includes('ourense') ||
    ['15', '27', '32', '36', '70'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'GALICIA (VIGO / A CORUÑA)', zoneKey: 'galicia' };
  }

  if (
    combined.includes('burgos') ||
    combined.includes('leon') ||
    combined.includes('león') ||
    combined.includes('ponferrada') ||
    combined.includes('valladolid') ||
    combined.includes('palencia') ||
    combined.includes('salamanca') ||
    combined.includes('zamora') ||
    combined.includes('segovia') ||
    combined.includes('soria') ||
    ['05', '09', '24', '34', '37', '40', '42', '47', '49'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'CASTILLA Y LEÓN (BURGOS / LEÓN / VALLADOLID)', zoneKey: 'castilla_leon' };
  }

  if (
    combined.includes('zaragoza') ||
    combined.includes('aragon') ||
    combined.includes('aragón') ||
    combined.includes('huesca') ||
    combined.includes('teruel') ||
    combined.includes('rioja') ||
    combined.includes('logroño') ||
    ['22', '26', '44', '50', '99'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'ARAGÓN & LA RIOJA (ZARAGOZA)', zoneKey: 'aragon_rioja' };
  }

  if (
    combined.includes('barcelona') ||
    combined.includes('catalunya') ||
    combined.includes('cataluña') ||
    combined.includes('tarragona') ||
    combined.includes('girona') ||
    combined.includes('lleida') ||
    combined.includes('badalona') ||
    combined.includes('sabadell') ||
    combined.includes('terrassa') ||
    combined.includes('granollers') ||
    ['08', '17', '25', '43', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'CATALUÑA (BARCELONA / TARRAGONA / GIRONA / LLEIDA)', zoneKey: 'cataluna' };
  }

  if (
    combined.includes('valencia') ||
    combined.includes('alicante') ||
    combined.includes('castellon') ||
    combined.includes('castellón') ||
    ['03', '12', '46', '53', '54', '96', '97', '98'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'COMUNIDAD VALENCIANA & LEVANTE', zoneKey: 'levante' };
  }

  if (
    combined.includes('madrid') ||
    combined.includes('toledo') ||
    combined.includes('guadalajara') ||
    combined.includes('ciudad real') ||
    combined.includes('albacete') ||
    combined.includes('cuenca') ||
    ['02', '13', '16', '19', '28', '45', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'MADRID & ZONA CENTRO', zoneKey: 'madrid_centro' };
  }

  if (
    combined.includes('sevilla') ||
    combined.includes('cordoba') ||
    combined.includes('córdoba') ||
    combined.includes('huelva') ||
    combined.includes('cadiz') ||
    combined.includes('cádiz') ||
    combined.includes('malaga') ||
    combined.includes('málaga') ||
    combined.includes('granada') ||
    combined.includes('almeria') ||
    combined.includes('jaen') ||
    combined.includes('murcia') ||
    combined.includes('cartagena') ||
    combined.includes('badajoz') ||
    combined.includes('caceres') ||
    ['04', '06', '10', '11', '14', '18', '21', '23', '29', '30', '41', '72', '73', '91', '92', '93'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'ANDALUCÍA, MURCIA & SUR', zoneKey: 'sur_andalucia' };
  }

  if (
    combined.includes('tenerife') ||
    combined.includes('canarias') ||
    combined.includes('las palmas') ||
    combined.includes('baleares') ||
    combined.includes('mallorca') ||
    ['07', '35', '38', '57', '76'].includes(prefix || '')
  ) {
    return { countryCode: 'ES', countryLabel: 'Espanha', countryFlag: '🇪🇸', zone: 'ISLAS CANARIAS & BALEARES', zoneKey: 'islas' };
  }

  return {
    countryCode: 'ES',
    countryLabel: 'Espanha',
    countryFlag: '🇪🇸',
    zone: 'ESPAÑA · ÁMBITO NACIONAL',
    zoneKey: 'nacional_es',
  };
}

/**
 * Strips emojis and unsupported UTF-16 surrogates so jsPDF built-in Helvetica never corrupts spacing/glyphs.
 */
function sanitizePdfText(input: string): string {
  if (!input) return '';
  return input
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF•€]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function loadLogoForPdf(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 100;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: w,
          height: h,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function resolveDefaultPresetForContext(
  loggedProfile: ReturnType<typeof getCommercialProfileByUser>,
  selectedEmpresaId: string | null
): DossierPreset {
  if (loggedProfile) {
    const byOwner = DOSSIER_PRESETS.find((p) => p.ownerKey === loggedProfile.ownerKey);
    if (byOwner) return byOwner;
  }
  if (selectedEmpresaId === COMPANY_BRANDS.WISEOWE.empresaId) return DOSSIER_PRESETS[0];
  if (selectedEmpresaId === COMPANY_BRANDS.TRIANGULO.empresaId) return DOSSIER_PRESETS[1];
  if (selectedEmpresaId === COMPANY_BRANDS.LUMINOUS.empresaId) return DOSSIER_PRESETS[2];
  if (selectedEmpresaId === COMPANY_BRANDS.STOCCO.empresaId) return DOSSIER_PRESETS[3];
  if (selectedEmpresaId === COMPANY_BRANDS.GENIO.empresaId) return DOSSIER_PRESETS[4];
  if (selectedEmpresaId === COMPANY_BRANDS.KOTRIK.empresaId) return DOSSIER_PRESETS[7];
  return DOSSIER_PRESETS[2]; // Default Luminous
}

export function PortfolioReferenciasPage() {
  const { user } = useAuth();
  const { selectedEmpresaId } = useEmpresa();

  const loggedCommercialProfile = useMemo(
    () => getCommercialProfileByUser(user),
    [user]
  );

  const initialPreset = useMemo(
    () => resolveDefaultPresetForContext(loggedCommercialProfile, selectedEmpresaId),
    [loggedCommercialProfile, selectedEmpresaId]
  );

  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [activeBrandKey, setActiveBrandKey] = useState<BillingCompanyKey>(initialPreset.companyKey);
  const [dossierLang, setDossierLang] = useState<DossierLanguage>(initialPreset.language);
  const [repName, setRepName] = useState<string>(initialPreset.repName);
  const [repEmail, setRepEmail] = useState<string>(initialPreset.repEmail);
  const [repPhone, setRepPhone] = useState<string>(initialPreset.repPhone);

  const [clients, setClients] = useState<ClientReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [billingFilter, setBillingFilter] = useState<BillingFilterValue>(initialPreset.companyKey as BillingFilterValue);
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'ES' | 'FR' | 'IT' | 'PT'>(initialPreset.defaultCountry);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyRecommended, setOnlyRecommended] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Apply preset helper
  const applyPreset = useCallback((preset: DossierPreset, syncBillingFilter = true) => {
    setActivePresetId(preset.id);
    setActiveBrandKey(preset.companyKey);
    setDossierLang(preset.language);
    setRepName(preset.repName);
    setRepEmail(preset.repEmail);
    setRepPhone(preset.repPhone);
    setSelectedCountry(preset.defaultCountry);
    setSelectedRegion('all');
    if (syncBillingFilter) {
      setBillingFilter(preset.companyKey as BillingFilterValue);
      setSelectedClientIds(new Set());
    }
  }, []);

  // Sync automatically when user logs in OR when top-bar company switcher changes
  useEffect(() => {
    const nextPreset = resolveDefaultPresetForContext(loggedCommercialProfile, selectedEmpresaId);
    applyPreset(nextPreset, true);
  }, [loggedCommercialProfile, selectedEmpresaId, applyPreset]);

  // Enrich commercial contact details from public.mcs_users if logged user has custom commercial fields
  useEffect(() => {
    if (!user?.id && !user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const query = supabase
          .from('mcs_users')
          .select('display_name, commercial_name, commercial_email, email, commercial_phone, commercial_country, commercial_empresa_id');
        const { data } = user.id
          ? await query.eq('id', user.id).maybeSingle()
          : await query.eq('email', user.email!).maybeSingle();

        if (cancelled || !data) return;

        // Only override contact info automatically if user belongs to a commercial profile / has commercial_email configured
        if (data.commercial_email || loggedCommercialProfile) {
          const matchedEmpBrand = Object.values(COMPANY_BRANDS).find(
            (b) => b.empresaId === data.commercial_empresa_id
          );
          if (matchedEmpBrand && (!selectedEmpresaId || selectedEmpresaId === matchedEmpBrand.empresaId || loggedCommercialProfile)) {
            setActiveBrandKey(matchedEmpBrand.key);
            setBillingFilter(matchedEmpBrand.key as BillingFilterValue);
          }
          if (data.commercial_name || data.display_name) {
            setRepName(data.commercial_name || data.display_name);
          }
          if (data.commercial_email) {
            setRepEmail(data.commercial_email);
          }
          if (data.commercial_phone) {
            setRepPhone(data.commercial_phone);
          }
          if (data.commercial_country === 'ES' || data.commercial_country === 'FR' || data.commercial_country === 'IT') {
            setSelectedCountry(data.commercial_country);
            setDossierLang(data.commercial_country === 'FR' ? 'fr' : data.commercial_country === 'IT' ? 'it' : 'es');
          }
        }
      } catch {
        // Ignore fallback silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, loggedCommercialProfile, selectedEmpresaId]);

  const activeBrand = COMPANY_BRANDS[activeBrandKey] || COMPANY_BRANDS.LUMINOUS;

  // Blacklist/Custom excluded clients (in case some company had issues)
  const [customExcludedIds, setCustomExcludedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mcs_portfolio_excluded_clients');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleClientExclusion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Empresa reativada como apta para referência!');
      } else {
        next.add(id);
        setSelectedClientIds((s) => {
          const sNext = new Set(s);
          sNext.delete(id);
          return sNext;
        });
        toast.warning('Empresa desmarcada como referência recomendada.');
      }
      localStorage.setItem('mcs_portfolio_excluded_clients', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch clients, empresas, faturas, and contas_receber in parallel
      const fetchAllContasReceberLite = async () => {
        const rows: Array<{ cod_cliente?: string | null; cliente?: string | null; empresa?: string | null; status?: string | null }> = [];
        for (let page = 0; page < 10; page++) {
          const { data, error } = await supabase
            .from('contas_receber')
            .select('cod_cliente, cliente, empresa, status')
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error || !data || data.length === 0) break;
          rows.push(...data);
          if (data.length < 1000) break;
        }
        return rows;
      };

      const fetchAllClientsLite = async (): Promise<RawClientRow[]> => {
        const rows: RawClientRow[] = [];
        for (let page = 0; page < 5; page++) {
          const { data, error } = await supabase
            .schema('core_common')
            .from('clients')
            .select('*, countries(name)')
            .is('deleted_at', null)
            .order('trade_name', { ascending: true })
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          rows.push(...(data as RawClientRow[]));
          if (data.length < 1000) break;
        }
        return rows;
      };

      const [clientsRaw, empresasRes, faturasRes, contasReceberRows] = await Promise.all([
        fetchAllClientsLite(),
        supabase.schema('core_common').from('empresas').select('id, codigo, nome, trade_name, legal_name'),
        supabase.schema('core_finance').from('faturas').select('client_id, empresa_id, status').range(0, 4999),
        fetchAllContasReceberLite(),
      ]);

      // Map empresa UUID -> canonical BillingCompanyKey
      const empresaIdToKey = new Map<string, BillingCompanyKey>();
      ((empresasRes.data || []) as RawEmpresaRow[]).forEach((emp) => {
        const key = normalizeBillingCompany(emp.trade_name || emp.nome || emp.legal_name || emp.codigo);
        if (key) empresaIdToKey.set(emp.id, key);
      });

      // Build lookup indexes for clients (by ID, by codigo, and by normalized name)
      const clientIdSet = new Set<string>();
      const codigoToClientIds = new Map<string, string[]>();
      const normNameToClientIds = new Map<string, string[]>();

      clientsRaw.forEach((c) => {
        clientIdSet.add(c.id);
        const cod = String(c.codigo || '').trim().toUpperCase();
        if (cod) {
          const arr = codigoToClientIds.get(cod) || [];
          arr.push(c.id);
          codigoToClientIds.set(cod, arr);
        }
        const nTrade = normalizeClientMatchKey(c.trade_name);
        if (nTrade.length > 3) {
          const arr = normNameToClientIds.get(nTrade) || [];
          if (!arr.includes(c.id)) arr.push(c.id);
          normNameToClientIds.set(nTrade, arr);
        }
        const nLegal = normalizeClientMatchKey(c.legal_name);
        if (nLegal.length > 3 && nLegal !== nTrade) {
          const arr = normNameToClientIds.get(nLegal) || [];
          if (!arr.includes(c.id)) arr.push(c.id);
          normNameToClientIds.set(nLegal, arr);
        }
      });

      // Aggregate billing links per client ID
      const billingCountsByClient = new Map<string, Partial<Record<BillingCompanyKey, number>>>();
      const judicialClientIds = new Set<string>();

      const addBilling = (clientId: string, compKey: BillingCompanyKey) => {
        const current = billingCountsByClient.get(clientId) || {};
        current[compKey] = (current[compKey] || 0) + 1;
        billingCountsByClient.set(clientId, current);
      };

      // 1. From core_finance.faturas
      ((faturasRes.data || []) as RawFaturaRow[]).forEach((f) => {
        if (!f.client_id || !f.empresa_id || !clientIdSet.has(f.client_id)) return;
        const compKey = empresaIdToKey.get(f.empresa_id);
        if (compKey) {
          addBilling(f.client_id, compKey);
        }
      });

      // 2. From public.contas_receber
      contasReceberRows.forEach((cr) => {
        const compKey = normalizeBillingCompany(cr.empresa);
        if (!compKey) return;

        const matchedIds = new Set<string>();
        const cod = String(cr.cod_cliente || '').trim().toUpperCase();
        if (cod && codigoToClientIds.has(cod)) {
          codigoToClientIds.get(cod)!.forEach((id) => matchedIds.add(id));
        }
        if (matchedIds.size === 0 && cr.cliente) {
          const nCr = normalizeClientMatchKey(cr.cliente);
          if (nCr.length > 3 && normNameToClientIds.has(nCr)) {
            normNameToClientIds.get(nCr)!.forEach((id) => matchedIds.add(id));
          }
        }

        const isJudicial = String(cr.status || '').toLowerCase().includes('judicial');
        matchedIds.forEach((cid) => {
          addBilling(cid, compKey);
          if (isJudicial) judicialClientIds.add(cid);
        });
      });

      const companyPriority: BillingCompanyKey[] = [
        'WISEOWE',
        'LUMINOUS',
        'TRIANGULO',
        'STOCCO',
        'GENIO',
        'KOTRIK',
        'HEXAGON',
      ];

      const list: ClientReference[] = clientsRaw.map((c) => {
        const combined = `${c.trade_name || ''} ${c.legal_name || ''} ${c.notes || ''}`.toLowerCase();
        const geo = classifyCountryAndZone(c);

        // Sector classification
        let sectorDisplay = 'Montaje Industrial & Mantenimiento';
        if (combined.includes('caldereria') || combined.includes('calderería')) {
          sectorDisplay = 'Calderería & Fabricación Pesada';
        } else if (combined.includes('tuberia') || combined.includes('tubería') || combined.includes('piping') || combined.includes('tubos') || combined.includes('tub')) {
          sectorDisplay = 'Piping & Montajes de Tubería Industrial';
        } else if (combined.includes('electric') || combined.includes('eléctric') || combined.includes('automatism')) {
          sectorDisplay = 'Instalaciones & Cuadros Eléctricos';
        } else if (combined.includes('mecanic') || combined.includes('mecánic') || combined.includes('mecanizado') || combined.includes('maquinaria')) {
          sectorDisplay = 'Mecanizado & Montajes de Precisión';
        } else if (combined.includes('clima') || combined.includes('calorifug') || combined.includes('ventil') || combined.includes('termic')) {
          sectorDisplay = 'Climatización & Calorifugado Industrial';
        } else if (combined.includes('naval') || combined.includes('maritim') || combined.includes('yacht') || combined.includes('astiller')) {
          sectorDisplay = 'Sector Naval & Estructuras Offshore';
        } else if (combined.includes('estructur') || combined.includes('metal') || combined.includes('cerrajer')) {
          sectorDisplay = 'Estructuras Metálicas & Carpintería Industrial';
        }

        const counts = billingCountsByClient.get(c.id) || {};
        const billedBy = companyPriority.filter((k) => (counts[k] || 0) > 0);
        const hasJudicialAlert = judicialClientIds.has(c.id);
        const isBlocked =
          c.financial_status === 'blocked' ||
          c.financial_status === 'inadimplente' ||
          hasJudicialAlert;

        return {
          id: c.id,
          codigo: c.codigo || undefined,
          trade_name: c.trade_name || c.legal_name || 'Cliente Industrial',
          legal_name: (c.legal_name || c.trade_name) ?? undefined,
          tax_id: c.tax_id || undefined,
          province: c.province || undefined,
          city: c.city || undefined,
          address_line: c.address_line || undefined,
          postal_code: c.postal_code || undefined,
          notes: c.notes || undefined,
          financial_status: c.financial_status || undefined,
          functions_json: c.functions_json,
          countryCode: geo.countryCode,
          countryLabel: geo.countryLabel,
          countryFlag: geo.countryFlag,
          zone: geo.zone,
          zoneKey: geo.zoneKey,
          sectorDisplay,
          isRecommended: !isBlocked,
          hasJudicialAlert,
          billedBy,
          billingCounts: counts,
        };
      });

      setClients(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error('Erro ao carregar portfólio de clientes: ' + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Counts per billing company (respecting country + recommended toggle so numbers feel accurate, plus global counts)
  const billingCompanyStats = useMemo(() => {
    const counts: Record<string, number> = {
      WISEOWE: 0,
      LUMINOUS: 0,
      TRIANGULO: 0,
      STOCCO: 0,
      KOTRIK: 0,
      GENIO: 0,
      ANY_BILLED: 0,
      ALL_CLIENTS: 0,
    };

    clients.forEach((c) => {
      if (selectedCountry !== 'ALL' && c.countryCode !== selectedCountry) return;
      if (onlyRecommended && (!c.isRecommended || customExcludedIds.has(c.id))) return;

      counts.ALL_CLIENTS += 1;
      if (c.billedBy.length > 0) counts.ANY_BILLED += 1;
      c.billedBy.forEach((comp) => {
        counts[comp] = (counts[comp] || 0) + 1;
      });
    });

    return counts;
  }, [clients, selectedCountry, onlyRecommended, customExcludedIds]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // 1. Recommended filter
      if (onlyRecommended && (!c.isRecommended || customExcludedIds.has(c.id))) {
        return false;
      }

      // 2. Billing Company filter
      if (billingFilter === 'ANY_BILLED') {
        if (c.billedBy.length === 0) return false;
      } else if (billingFilter !== 'ALL_CLIENTS') {
        if (!c.billedBy.includes(billingFilter)) return false;
      }

      // 3. Country filter
      if (selectedCountry !== 'ALL' && c.countryCode !== selectedCountry) {
        return false;
      }

      // 4. Region filter (Spanish zones)
      if (selectedRegion !== 'all') {
        if (selectedRegion === 'norte_completo') {
          const northZones = ['vizcaya', 'alava', 'gipuzkoa', 'navarra', 'cantabria', 'asturias', 'galicia', 'castilla_leon'];
          if (!northZones.includes(c.zoneKey)) return false;
        } else if (selectedRegion === 'pais_vasco_navarra') {
          const pvZones = ['vizcaya', 'alava', 'gipuzkoa', 'navarra'];
          if (!pvZones.includes(c.zoneKey)) return false;
        } else if (c.zoneKey !== selectedRegion) {
          return false;
        }
      }

      // 5. Search query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const billedLabels = c.billedBy.map((b) => COMPANY_BRANDS[b]?.shortLabel || b).join(' ');
        const searchTarget = `${c.codigo || ''} ${c.trade_name} ${c.legal_name || ''} ${c.tax_id || ''} ${c.city || ''} ${c.province || ''} ${c.address_line || ''} ${c.zone} ${c.sectorDisplay} ${billedLabels}`.toLowerCase();
        if (!searchTarget.includes(q)) return false;
      }

      return true;
    });
  }, [clients, billingFilter, selectedCountry, selectedRegion, onlyRecommended, searchTerm, customExcludedIds]);

  // Selected client objects
  const selectedClients = useMemo(() => {
    return clients.filter((c) => selectedClientIds.has(c.id) && !customExcludedIds.has(c.id));
  }, [clients, selectedClientIds, customExcludedIds]);

  const handleSelectAll = () => {
    const next = new Set(selectedClientIds);
    let added = 0;
    filteredClients.forEach((c) => {
      if (c.isRecommended && !customExcludedIds.has(c.id)) {
        if (!next.has(c.id)) added += 1;
        next.add(c.id);
      }
    });
    setSelectedClientIds(next);
    toast.success(`${filteredClients.length} empresas filtradas incluídas no dossiê (${added} novas).`);
  };

  const handleDeselectAll = () => {
    setSelectedClientIds(new Set());
    toast.info('Seleção limpa.');
  };

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBillingFilterChange = (nextVal: BillingFilterValue) => {
    setBillingFilter(nextVal);
    // Prune any previously selected clients that don't belong to the new company filter to prevent cross-company leaks
    if (nextVal !== 'ALL_CLIENTS' && nextVal !== 'ANY_BILLED') {
      setSelectedClientIds((prev) => {
        const next = new Set<string>();
        clients.forEach((c) => {
          if (prev.has(c.id) && c.billedBy.includes(nextVal)) {
            next.add(c.id);
          }
        });
        return next;
      });
    }
  };

  // 1. Action: Copy Formatted Text for WhatsApp / Teams / Email (Localized ES / FR / IT)
  const handleCopyFormattedText = () => {
    if (selectedClients.length === 0) {
      toast.warning('Selecione ao menos 1 empresa da lista para copiar.');
      return;
    }

    const byZone: Record<string, ClientReference[]> = {};
    selectedClients.forEach((c) => {
      if (!byZone[c.zone]) byZone[c.zone] = [];
      byZone[c.zone].push(c);
    });

    const brandTitle = activeBrand.brandTitle[dossierLang];
    let text = '';

    if (dossierLang === 'fr') {
      text += `*RÉFÉRENCES CLIENTS & PROJETS INDUSTRIELS*\n`;
      text += `*${brandTitle} (${activeBrand.legalName})*\n\n`;
      text += `Madame, Monsieur,\n\n`;
      text += `Afin d'attester de notre capacité technique et de notre expérience opérationnelle, voici une sélection d'entreprises industrielles avec lesquelles nous avons collaboré :\n\n`;
      Object.keys(byZone).forEach((zone) => {
        text += `📍 *${zone}*\n`;
        byZone[zone].forEach((c, idx) => {
          const cityPart = c.city ? ` (${c.city})` : c.province ? ` (${c.province})` : '';
          text += `${idx + 1}. *${c.trade_name}*${cityPart} — _${c.sectorDisplay}_\n`;
        });
        text += `\n`;
      });
      text += `🛡️ *Garantie Qualité & Conformité :* Équipes qualifiées (ISO 9606-1 / ASME IX), certificats A1/SIPSI, HSE et logistique clé en main (hébergement et mobilité).\n\n`;
      text += `👤 *Contact Commercial :* ${repName}\n`;
      text += `📞 ${repPhone} | ✉️ ${repEmail} | 🌐 ${activeBrand.website}`;
    } else if (dossierLang === 'it') {
      text += `*REFERENZE CLIENTI & PROGETTI INDUSTRIALI*\n`;
      text += `*${brandTitle} (${activeBrand.legalName})*\n\n`;
      text += `Gentile Cliente,\n\n`;
      text += `Al fine di attestare la nostra solidità tecnica ed esperienza operativa, Le presentiamo una selezione di aziende industriali con cui abbiamo collaborato:\n\n`;
      Object.keys(byZone).forEach((zone) => {
        text += `📍 *${zone}*\n`;
        byZone[zone].forEach((c, idx) => {
          const cityPart = c.city ? ` (${c.city})` : c.province ? ` (${c.province})` : '';
          text += `${idx + 1}. *${c.trade_name}*${cityPart} — _${c.sectorDisplay}_\n`;
        });
        text += `\n`;
      });
      text += `🛡️ *Garanzia di Qualità & Sicurezza:* Personale qualificato (ISO 9606-1 / ASME IX), conformità A1/HSE e gestione integrale di alloggio e mobilità.\n\n`;
      text += `👤 *Referente Commerciale:* ${repName}\n`;
      text += `📞 ${repPhone} | ✉️ ${repEmail} | 🌐 ${activeBrand.website}`;
    } else {
      text += `*REFERENCIAS DE CLIENTES Y PROYECTOS INDUSTRIALES*\n`;
      text += `*${brandTitle} (${activeBrand.legalName})*\n\n`;
      text += `Estimado/a cliente,\n\n`;
      text += `Con el fin de acreditar nuestra solvencia técnica y experiencia operativa, a continuación le facilitamos una selección de empresas y clientes industriales con los que hemos colaborado y desarrollado proyectos:\n\n`;
      Object.keys(byZone).forEach((zone) => {
        text += `📍 *${zone}*\n`;
        byZone[zone].forEach((c, idx) => {
          const cityPart = c.city ? ` (${c.city})` : c.province ? ` (${c.province})` : '';
          text += `${idx + 1}. *${c.trade_name}*${cityPart} — _${c.sectorDisplay}_\n`;
        });
        text += `\n`;
      });
      text += `🛡️ *Garantía de Calidad & Solvencia:* Todas nuestras brigadas y operarios cuentan con homologaciones vigentes (ASME/ISO 9606), PRL y gestión integral de alojamiento y movilidad.\n\n`;
      text += `Quedamos a su entera disposición para coordinar cualquier detalle técnico.\n`;
      text += `👤 *Atención Comercial:* ${repName} — ${activeBrand.shortLabel}\n`;
      text += `📞 ${repPhone} | ✉️ ${repEmail} | 🌐 ${activeBrand.website}`;
    }

    navigator.clipboard.writeText(text);
    toast.success(`Texto formatado para ${activeBrand.shortLabel} (${selectedClients.length} empresas) copiado!`);
  };

  // 2. Action: Generate Executive Multi-Brand PDF Dossier with Company Logo & Rep Data
  const handleGeneratePdf = async () => {
    if (selectedClients.length === 0) {
      toast.warning('Selecione ao menos 1 empresa para gerar o dossiê em PDF.');
      return;
    }

    try {
      setGeneratingPdf(true);

      const logoAsset = await loadLogoForPdf(activeBrand.logoPath);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const year = new Date().getFullYear();
      const locale = dossierLang === 'fr' ? 'fr-FR' : dossierLang === 'it' ? 'it-IT' : 'es-ES';
      const dateStr = new Date().toLocaleDateString(locale);
      const refCode = `REF-${activeBrand.code}-${year}`;

      const i18nPdf =
        dossierLang === 'fr'
          ? {
              dossierBadge: 'DOSSIER DE RÉFÉRENCES CLIENTS',
              subtitle: 'Accréditation de Capacité Technique & Projets Industriels en Europe',
              sectionTitle: 'Sélection des Entreprises et Projets Réalisés :',
              zonePrefix: 'ZONE :',
              locLabel: 'Localisation',
              specLabel: 'Spécialité',
              nationalFallback: 'Europe',
              complianceTitle: 'Conformité Légale, Sécurité HSE et Disponibilité Opérationnelle :',
              bullet1: '• Personnel technique qualifié en soudure (TIG, MIG-MAG, 6G ISO 9606-1), tuyauterie et montage mécanique.',
              bullet2: '• Gestion 100% clé en main : hébergement, déplacements, certificats A1/SIPSI, EPI certifiés et flotte.',
              contactHeading: 'Direction Commerciale & Contact Direct :',
              issuedLabel: 'Émission',
            }
          : dossierLang === 'it'
          ? {
              dossierBadge: 'DOSSIER DI REFERENZE INDUSTRIALI',
              subtitle: 'Accreditamento di Solidità Tecnica & Progetti Industriali in Europa',
              sectionTitle: 'Elenco delle Aziende e Progetti Eseguiti:',
              zonePrefix: 'ZONA:',
              locLabel: 'Sede',
              specLabel: 'Specialità',
              nationalFallback: 'Nazionale',
              complianceTitle: 'Conformità Legale, Sicurezza HSE e Disponibilità Operativa:',
              bullet1: '• Personale tecnico qualificato in saldatura (TIG, MIG-MAG, 6G ISO 9606-1), tubisteria e montaggio meccanico.',
              bullet2: '• Gestione 100% chiavi in mano: alloggi, trasferte, Modelli A1, DPI certificati e veicoli di cantiere.',
              contactHeading: 'Direzione Commerciale & Contatto Diretto:',
              issuedLabel: 'Data',
            }
          : {
              dossierBadge: 'DOSSIER EJECUTIVO DE REFERENCIAS',
              subtitle: 'Acreditación de Solvencia Técnica & Proyectos Industriales Ejecutados',
              sectionTitle: 'Relación de Empresas y Proyectos Ejecutados:',
              zonePrefix: 'ZONA:',
              locLabel: 'Ubicación',
              specLabel: 'Especialidad',
              nationalFallback: 'Nacional',
              complianceTitle: 'Compliance, Seguridad PRL y Disponibilidad Operativa:',
              bullet1: '• Personal técnico homologado en soldadura (TIG, MIG-MAG, 6G ISO 9606-1), piping y montaje mecánico.',
              bullet2: '• Gestión 100% integral de alojamientos, dietas, PRL, certificados A1, EPIs homologados y vehículos de obra.',
              contactHeading: 'Atención Comercial Directa:',
              issuedLabel: 'Emisión',
            };

      const drawHeader = (isFirstPage: boolean) => {
        const headerH = isFirstPage ? 46 : 22;
        doc.setFillColor(...activeBrand.headerRgb);
        doc.rect(0, 0, pageWidth, headerH, 'F');

        doc.setFillColor(...activeBrand.accentRgb);
        doc.rect(0, headerH, pageWidth, 2.2, 'F');

        if (isFirstPage) {
          let titleStartY = 17;

          // Draw Logo at top-left
          if (logoAsset) {
            const maxW = activeBrand.logoOnDark ? 48 : 40;
            const maxH = activeBrand.logoOnDark ? 13.5 : 12;
            const ratio = Math.min(maxW / logoAsset.width, maxH / logoAsset.height);
            const drawW = logoAsset.width * ratio;
            const drawH = logoAsset.height * ratio;

            if (!activeBrand.logoOnDark) {
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(15, 7, drawW + 6, drawH + 4, 2, 2, 'F');
              doc.addImage(logoAsset.dataUrl, 'PNG', 18, 9, drawW, drawH, undefined, 'FAST');
              titleStartY = 11 + drawH + 8;
            } else {
              doc.addImage(logoAsset.dataUrl, 'PNG', 15, 8, drawW, drawH, undefined, 'FAST');
              titleStartY = 8 + drawH + 7.5;
            }
          } else {
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(sanitizePdfText(activeBrand.brandTitle[dossierLang]), 15, 16);
            titleStartY = 25;
          }

          // Left Dossier Title & Subtitle
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13.5);
          doc.text(sanitizePdfText(`${activeBrand.shortLabel.toUpperCase()} · ${i18nPdf.dossierBadge}`), 15, titleStartY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.8);
          doc.setTextColor(203, 213, 225);
          doc.text(sanitizePdfText(i18nPdf.subtitle), 15, titleStartY + 5.8);

          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            sanitizePdfText(`${activeBrand.legalName} (NIF: ${activeBrand.nif})`),
            15,
            titleStartY + 11
          );

          // Right-aligned Commercial & Document Metadata Box
          const rightX = pageWidth - 15;
          doc.setTextColor(...activeBrand.accentRgb);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(sanitizePdfText(`${i18nPdf.issuedLabel}: ${dateStr}  |  ${refCode}`), rightX, 12, { align: 'right' });

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.text(sanitizePdfText(repName), rightX, 19, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.2);
          doc.setTextColor(226, 232, 240);
          if (repPhone) {
            doc.text(sanitizePdfText(`Tel: ${repPhone}`), rightX, 24.5, { align: 'right' });
          }
          if (repEmail) {
            doc.text(sanitizePdfText(repEmail), rightX, 29.5, { align: 'right' });
          }
          doc.setTextColor(148, 163, 184);
          doc.text(sanitizePdfText(activeBrand.website), rightX, 34.5, { align: 'right' });
        } else {
          // Compact continuation header on pages 2+
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(
            sanitizePdfText(`${activeBrand.brandTitle[dossierLang]} · ${i18nPdf.dossierBadge}`),
            15,
            13.5
          );
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(203, 213, 225);
          doc.text(sanitizePdfText(`${refCode} | ${repEmail}`), pageWidth - 15, 13.5, { align: 'right' });
        }
      };

      drawHeader(true);
      let currentY = 57;

      // Intro statement
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.8);
      doc.text(sanitizePdfText(i18nPdf.sectionTitle), 15, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        sanitizePdfText(`Total: ${selectedClients.length} referencias seleccionadas`),
        pageWidth - 15,
        currentY,
        { align: 'right' }
      );
      currentY += 7.5;

      // Group selected clients by zone
      const byZone: Record<string, ClientReference[]> = {};
      selectedClients.forEach((c) => {
        if (!byZone[c.zone]) byZone[c.zone] = [];
        byZone[c.zone].push(c);
      });

      Object.keys(byZone).forEach((zone) => {
        if (currentY > 258) {
          doc.addPage();
          drawHeader(false);
          currentY = 33;
        }

        // Zone Header Pill
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(15, currentY - 4.2, pageWidth - 30, 7.8, 1.8, 1.8, 'F');
        doc.setFillColor(...activeBrand.accentRgb);
        doc.rect(15, currentY - 4.2, 2.2, 7.8, 'F');

        doc.setTextColor(...activeBrand.zoneTextRgb);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        doc.text(sanitizePdfText(`${i18nPdf.zonePrefix} ${zone}`), 20, currentY + 1);
        currentY += 8.5;

        byZone[zone].forEach((c, idx) => {
          if (currentY > 268) {
            doc.addPage();
            drawHeader(false);
            currentY = 33;
          }

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.3);
          doc.text(sanitizePdfText(`${idx + 1}. ${c.trade_name}`), 20, currentY);

          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.2);
          const loc = c.city
            ? c.province && c.province.toLowerCase() !== c.city.toLowerCase()
              ? `${c.city} (${c.province})`
              : c.city
            : c.province || i18nPdf.nationalFallback;

          doc.text(
            sanitizePdfText(`${i18nPdf.locLabel}: ${loc}  |  ${i18nPdf.specLabel}: ${c.sectorDisplay}`),
            20,
            currentY + 4
          );

          currentY += 8.8;
        });

        currentY += 3.5;
      });

      // Quality & Commercial Contact Footer Box
      if (currentY > 234) {
        doc.addPage();
        drawHeader(false);
        currentY = 33;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, currentY, pageWidth - 30, 38, 2.8, 2.8, 'FD');

      // Left accent stripe on compliance card
      doc.setFillColor(...activeBrand.accentRgb);
      doc.rect(15, currentY, 2.5, 38, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(sanitizePdfText(i18nPdf.complianceTitle), 21, currentY + 7);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      doc.text(sanitizePdfText(i18nPdf.bullet1), 21, currentY + 13.5);
      doc.text(sanitizePdfText(i18nPdf.bullet2), 21, currentY + 19);

      // Divider inside footer box
      doc.setDrawColor(226, 232, 240);
      doc.line(21, currentY + 23, pageWidth - 21, currentY + 23);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(
        sanitizePdfText(`${i18nPdf.contactHeading} ${repName} (${activeBrand.legalName})`),
        21,
        currentY + 28.5
      );

      doc.setTextColor(...activeBrand.zoneTextRgb);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      const contactLine = [repPhone, repEmail, activeBrand.website].filter(Boolean).join('  |  ');
      doc.text(sanitizePdfText(contactLine), 21, currentY + 34);

      // Add page numbers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          sanitizePdfText(`${activeBrand.legalName} · ${activeBrand.website}`),
          15,
          pageHeight - 7
        );
        doc.text(
          sanitizePdfText(`Página ${p} / ${totalPages}`),
          pageWidth - 15,
          pageHeight - 7,
          { align: 'right' }
        );
      }

      const fileCompany = activeBrand.key;
      doc.save(`${fileCompany}_Dossier_Referencias_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Dossiê Executivo da ${activeBrand.shortLabel} gerado com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error('Erro ao gerar o PDF: ' + msg);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Active Company Branding Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Live Company Logo Preview */}
            <div
              className="h-14 px-3.5 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
              style={{
                backgroundColor: activeBrand.logoOnDark ? activeBrand.headerHex : '#FFFFFF',
                borderColor: activeBrand.accentHex,
              }}
            >
              <img
                src={activeBrand.logoPath}
                alt={activeBrand.shortLabel}
                className="max-h-9 max-w-[130px] object-contain"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Portfólio & Referências de Clientes
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${activeBrand.pillClass}`}>
                  {activeBrand.shortLabel} · {activeBrand.code}
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                  Prova de Autoridade B2B
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filtre clientes faturados por empresa e região e gere dossiês oficiais com a logomarca da{' '}
                <strong className="text-slate-700 dark:text-slate-200">{activeBrand.shortLabel}</strong> e os dados de{' '}
                <strong className="text-slate-700 dark:text-slate-200">{repName}</strong>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
            <Button
              onClick={fetchClients}
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs font-semibold"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              onClick={handleCopyFormattedText}
              variant="outline"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold"
            >
              <Copy className="mr-1.5 h-4 w-4" />
              Copiar Texto ({selectedClients.length})
            </Button>

            <Button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: activeBrand.key === 'LUMINOUS' ? '#D97706' : activeBrand.accentHex }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {generatingPdf ? 'Gerando PDF...' : `Gerar Dossiê ${activeBrand.shortLabel} (${selectedClients.length})`}
            </Button>
          </div>
        </div>

        {/* Dossier Identity & Commercial Contact Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Formatação da Empresa / Comercial
            </label>
            <select
              value={activePresetId}
              onChange={(e) => {
                const chosen = DOSSIER_PRESETS.find((p) => p.id === e.target.value);
                if (chosen) applyPreset(chosen, true);
              }}
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-slate-900 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold"
            >
              {DOSSIER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              Responsável Comercial (PDF/Texto)
            </label>
            <Input
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              placeholder="Nome do comercial"
              className="h-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              E-mail de Contato
            </label>
            <Input
              value={repEmail}
              onChange={(e) => setRepEmail(e.target.value)}
              placeholder="comercial@empresa.com"
              className="h-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              Telefone Direto
            </label>
            <Input
              value={repPhone}
              onChange={(e) => setRepPhone(e.target.value)}
              placeholder="+34 ..."
              className="h-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Quick Company Billing Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
            <Receipt className="h-3.5 w-3.5 text-slate-400" />
            Faturado por:
          </span>

          {(
            [
              { id: 'WISEOWE' as BillingFilterValue, label: 'Wiseowe', brand: COMPANY_BRANDS.WISEOWE },
              { id: 'LUMINOUS' as BillingFilterValue, label: 'Luminous', brand: COMPANY_BRANDS.LUMINOUS },
              { id: 'TRIANGULO' as BillingFilterValue, label: 'Triángulo', brand: COMPANY_BRANDS.TRIANGULO },
              { id: 'STOCCO' as BillingFilterValue, label: 'Stocco', brand: COMPANY_BRANDS.STOCCO },
              { id: 'KOTRIK' as BillingFilterValue, label: 'Kotrik / Rosas', brand: COMPANY_BRANDS.KOTRIK },
            ] as const
          ).map((item) => {
            const isActive = billingFilter === item.id;
            const count = billingCompanyStats[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleBillingFilterChange(item.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? item.brand.activeFilterPillClass
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-black/15 text-current' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleBillingFilterChange('ANY_BILLED')}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 ${
              billingFilter === 'ANY_BILLED'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Todas Faturadas (Grupo)</span>
            <span className="text-[10px] px-1.5 rounded-full bg-slate-500/20">
              {billingCompanyStats.ANY_BILLED}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleBillingFilterChange('ALL_CLIENTS')}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 ${
              billingFilter === 'ALL_CLIENTS'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>Base Completa</span>
            <span className="text-[10px] px-1.5 rounded-full bg-slate-500/15">
              {billingCompanyStats.ALL_CLIENTS}
            </span>
          </button>
        </div>

        {/* Search + Country + Region + Recommended Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, NIF, cidade, província ou setor..."
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Country Selector */}
          <div className="md:col-span-2 relative">
            <select
              value={selectedCountry}
              onChange={(e) => {
                const nextCountry = e.target.value as 'ALL' | 'ES' | 'FR' | 'IT' | 'PT';
                setSelectedCountry(nextCountry);
                if (nextCountry !== 'ES' && nextCountry !== 'ALL') {
                  setSelectedRegion('all');
                }
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold"
            >
              {COUNTRY_FILTERS.map((cf) => (
                <option key={cf.id} value={cf.id}>
                  {cf.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region Selector */}
          <div className="md:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={selectedCountry !== 'ES' && selectedCountry !== 'ALL'}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium disabled:opacity-50"
            >
              {REGION_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Only Recommended Toggle */}
          <div className="md:col-span-3 flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border rounded-lg h-9">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="truncate">Apenas Aptos / Recomendados</span>
            </label>
            <input
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
            />
          </div>
        </div>

        {/* Selection Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-slate-600 dark:text-slate-400">
            <span>
              Mostrando: <strong className="text-slate-900 dark:text-slate-100">{filteredClients.length}</strong> empresas
            </span>
            <span>•</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {selectedClients.length} selecionadas para o dossiê da {activeBrand.shortLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleSelectAll} className="h-7 text-xs font-semibold">
              <CheckSquare className="mr-1 h-3.5 w-3.5" /> Selecionar Todos Filtrados ({filteredClients.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDeselectAll} className="h-7 text-xs font-medium text-slate-500">
              <Square className="mr-1 h-3.5 w-3.5" /> Limpar Seleção
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Client References */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border rounded-2xl">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Carregando clientes e histórico de faturamento por empresa...
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl space-y-3 px-4">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            Nenhum cliente encontrado com os filtros aplicados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tente alterar a região, o país ou clique em &ldquo;Todas Faturadas (Grupo)&rdquo; para visualizar clientes faturados por outras empresas do grupo.
          </p>
          {billingFilter !== 'ANY_BILLED' && billingFilter !== 'ALL_CLIENTS' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBillingFilterChange('ANY_BILLED')}
              className="text-xs font-semibold mt-2"
            >
              Ver todas as empresas faturadas pelo grupo ({billingCompanyStats.ANY_BILLED})
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isSelected = selectedClientIds.has(client.id);
            const isExcluded = customExcludedIds.has(client.id);

            return (
              <div
                key={client.id}
                onClick={() => toggleSelectClient(client.id)}
                className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 dark:border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-500/[0.02]'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 dark:bg-slate-800 border text-slate-600 dark:text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                        {client.codigo || 'REF'}
                      </span>
                      <span className="text-xs" title={client.countryLabel}>
                        {client.countryFlag}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => toggleClientExclusion(client.id, e)}
                        title={
                          isExcluded
                            ? 'Empresa desmarcada como referência recomendada. Clique para reativar.'
                            : 'Clique para marcar como não recomendada.'
                        }
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors flex items-center gap-1 ${
                          isExcluded || !client.isRecommended
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isExcluded || !client.isRecommended ? '⚠️ Não Recomendado' : '⭐ Apto para Referência'}
                      </button>

                      <div
                        className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-snug mb-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                    {client.trade_name}
                  </h3>

                  {client.legal_name && client.legal_name !== client.trade_name && (
                    <p className="text-xs text-slate-400 truncate mb-2">{client.legal_name}</p>
                  )}

                  {/* Billing Companies Badges ("Faturado pela Luminous / Wiseowe / Triangulo / Stocco") */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-2">
                    {client.billedBy.length > 0 ? (
                      client.billedBy.map((compKey) => {
                        const b = COMPANY_BRANDS[compKey];
                        const invCount = client.billingCounts[compKey] || 1;
                        return (
                          <span
                            key={compKey}
                            title={`Faturado pela ${b.shortLabel} (${invCount} registo${invCount > 1 ? 's' : ''} de faturação)`}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border inline-flex items-center gap-1 ${b.pillClass}`}
                          >
                            <Receipt size={10} className="shrink-0" />
                            Faturado: {b.shortLabel}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 inline-flex items-center gap-1">
                        <Globe2 size={10} className="shrink-0" />
                        Cadastro sem fatura emitida
                      </span>
                    )}
                  </div>

                  {/* Badges / Location info */}
                  <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin size={13} className="text-amber-500 shrink-0" />
                      <span className="font-bold text-amber-700 dark:text-amber-400 truncate">{client.zone}</span>
                    </div>

                    {(client.city || client.province || client.address_line) && (
                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 pl-5 truncate">
                        {client.city ? `${client.city}` : ''}
                        {client.province && client.province !== client.city ? ` (${client.province})` : ''}
                        {client.address_line ? ` • ${client.address_line}` : ''}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 pl-0.5 pt-1">
                      <Briefcase size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {client.sectorDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action snippet */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-mono">{client.tax_id || `NIF ${client.countryLabel}`}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:underline flex items-center gap-1">
                    {isSelected ? '✓ Incluído no Dossiê' : '+ Clique para Incluir'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
