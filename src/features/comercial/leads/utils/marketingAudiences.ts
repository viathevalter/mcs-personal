import { detectLeadCountry } from './leadCountryUtils';

export interface MarketingAudienceFilters {
  stageId?: string;
  origin?: string;
  intelligence?: string;
  recencyDays?: string;
  selectedCountries?: string[];
  selectedCompanySizes?: string[];
  selectedRegions?: string[];
  selectedProvinces?: string[];
  selectedSectors?: string[];
  selectedServices?: string[];
  sectorKeyword?: string;
  cargoKeyword?: string;
  provinceKeyword?: string;
  tagKeyword?: string;
  excludeTagKeyword?: string;
  excludeProposals?: boolean;
  limit?: string;
  offset?: string;
}

export interface MarketingAudiencePreset {
  id: string;
  name: string;
  vendedor: 'Omar' | 'Alex' | 'Giada' | 'Michelle' | 'Rosa' | 'VIP / Geral' | 'Personalizados';
  leadCount?: number;
  leadIds?: string[];
  filters?: MarketingAudienceFilters;
  created_at?: string;
  isCustom?: boolean;
}

export const VENDEDOR_CATEGORIES = [
  { id: 'all', label: 'Todos os Vendedores', flag: '👥' },
  { id: 'Omar', label: 'Omar (França / Bélgica)', flag: '🇫🇷' },
  { id: 'Alex', label: 'Alex (Espanha)', flag: '🇪🇸' },
  { id: 'Giada', label: 'Giada (Itália)', flag: '🇮🇹' },
  { id: 'Michelle', label: 'Michelle / Triângulo (Espanha)', flag: '🇪🇸' },
  { id: 'Rosa', label: 'Rosa / Kr-Captación', flag: '🎯' },
  { id: 'VIP / Geral', label: 'Bases Gerais & VIP', flag: '👑' },
  { id: 'Personalizados', label: 'Meus Públicos Salvos', flag: '⭐' },
] as const;

export function detectAudienceVendedor(
  name: string,
  tagKeyword?: string,
  countries?: string[],
  isCustom?: boolean
): MarketingAudiencePreset['vendedor'] {
  const text = `${name || ''} ${tagKeyword || ''}`.toLowerCase();
  if (text.includes('omar') || (countries && (countries.includes('FR') || countries.includes('BE')) && !text.includes('base total') && !text.includes('base global') && !text.includes('novos leads inéditos'))) {
    if (text.includes('omar')) return 'Omar';
  }
  if (text.includes('omar')) return 'Omar';
  if (text.includes('giada') || (countries && countries.includes('IT'))) return 'Giada';
  if (text.includes('alex') || text.includes('comercial 3')) return 'Alex';
  if (text.includes('michelle') || text.includes('mitchelle') || text.includes('triângulo') || text.includes('triangulo')) return 'Michelle';
  if (text.includes('rosa') || text.includes('kr-captacion') || text.includes('kr-captación')) return 'Rosa';
  if (isCustom) return 'Personalizados';
  if (countries && (countries.includes('FR') || countries.includes('BE'))) return 'Omar';
  return 'VIP / Geral';
}

export const ALL_STRATEGIC_AUDIENCES: MarketingAudiencePreset[] = [
  // ==========================================
  // OMAR (FRANÇA & BÉLGICA - WISEOWE)
  // ==========================================
  {
    id: 'aud_fr_omar_scraping_inedits',
    name: '🚀 🇫🇷 Omar - Inédits Portais França / SCMF & Sous-Traiter',
    vendedor: 'Omar',
    leadCount: 228,
    filters: {
      selectedCountries: ['FR'],
      tagKeyword: 'Mailing Omar - Inédits Web Scraping França',
    },
  },
  {
    id: 'aud_fr_omar_scraping_total',
    name: '🎯 🇫🇷 Omar - Mailing Completo Portais França',
    vendedor: 'Omar',
    leadCount: 354,
    filters: {
      selectedCountries: ['FR'],
      tagKeyword: 'Mailing Omar - Web Scraping França 2026',
    },
  },
  {
    id: 'aud_fr_omar_mailing_france',
    name: '🎯 🇫🇷 Omar - Mailing France',
    vendedor: 'Omar',
    leadCount: 2362,
    filters: {
      selectedCountries: ['FR'],
      tagKeyword: 'Mailing Omar - France',
    },
  },
  {
    id: 'aud_fr_omar_inedits_france',
    name: '🚀 🇫🇷 Omar - Inédits France',
    vendedor: 'Omar',
    leadCount: 1309,
    filters: {
      selectedCountries: ['FR'],
      tagKeyword: 'Mailing Omar - Inédits France',
    },
  },
  {
    id: 'aud_be_omar_mailing_belgique',
    name: '🎯 🇧🇪 Omar - Mailing Belgique',
    vendedor: 'Omar',
    leadCount: 208,
    filters: {
      selectedCountries: ['BE'],
      tagKeyword: 'Mailing Omar - Belgique',
    },
  },
  {
    id: 'aud_be_omar_inedits_belgique',
    name: '🚀 🇧🇪 Omar - Inédits Belgique',
    vendedor: 'Omar',
    leadCount: 199,
    filters: {
      selectedCountries: ['BE'],
      tagKeyword: 'Mailing Omar - Inédits Belgique',
    },
  },
  {
    id: 'aud_fr_be_omar_mailing_total',
    name: '🌟 🇪🇺 Omar - Mailing Total FR & BE',
    vendedor: 'Omar',
    leadCount: 2570,
    filters: {
      selectedCountries: ['FR', 'BE'],
      tagKeyword: 'Mailing Omar',
    },
  },
  {
    id: 'aud_fr_omar_planilha_total',
    name: '🚀 🇫🇷 Omar Planilha (Total)',
    vendedor: 'Omar',
    leadCount: 1147,
    filters: {
      selectedCountries: ['FR'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_tuyauterie',
    name: '🎯 🇫🇷 Omar Planilha - Tuyauterie & Chaudronnerie',
    vendedor: 'Omar',
    leadCount: 735,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Tuyauterie & Chaudronnerie Industrielle'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_naval',
    name: '🎯 🇫🇷 Omar Planilha - Chantiers Navals & Marine',
    vendedor: 'Omar',
    leadCount: 239,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Construção & Reparação Naval'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_inox',
    name: '🎯 🇫🇷 Omar Planilha - Tubería Inox & Agroalimentaire',
    vendedor: 'Omar',
    leadCount: 69,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Tubería Inox & Agroalimentaria'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_estructuras',
    name: '🎯 🇫🇷 Omar Planilha - Charpente Métallique & Serrurerie',
    vendedor: 'Omar',
    leadCount: 42,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Estructuras Metálicas & Montajes'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_piping',
    name: '🎯 🇫🇷 Omar Planilha - Tuyauterie Industrielle & Piping',
    vendedor: 'Omar',
    leadCount: 26,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Tuyauterie Industrielle & Piping'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_usinage',
    name: '🎯 🇫🇷 Omar Planilha - Usinage CNC & Mécanique',
    vendedor: 'Omar',
    leadCount: 12,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Mecanizado CNC & Tornería'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_secteur_tuyauterie_chaudronnerie',
    name: '🎯 🇫🇷 França (Omar) - Tuyauterie & Chaudronnerie Industrielle',
    vendedor: 'Omar',
    leadCount: 5676,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Tuyauterie & Chaudronnerie Industrielle', 'Calderería & Tubería Industrial', 'Tuyauterie Industrielle & Piping'],
    },
  },
  {
    id: 'aud_fr_secteur_charpente_metallique',
    name: '🎯 🇫🇷 França (Omar) - Charpente Métallique, Structures & Usinage',
    vendedor: 'Omar',
    leadCount: 2781,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Estructuras Metálicas & Montajes', 'Mecanizado CNC & Tornería', 'Estructuras Metálicas & Cerrajería'],
    },
  },
  {
    id: 'aud_fr_secteur_chantiers_navals',
    name: '🎯 🇫🇷 França (Omar) - Chantiers Navals & Off-shore',
    vendedor: 'Omar',
    leadCount: 352,
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Construção & Reparação Naval', 'Chantiers Navals & Marine'],
    },
  },
  {
    id: 'aud_fr_novos_ineditos_total',
    name: '🚀 🇫🇷 França (Omar) - Novos Leads Inéditos / Sem Contato',
    vendedor: 'Omar',
    leadCount: 9091,
    filters: {
      stageId: '048f4587-f416-4fc2-b3c9-09c42347df95',
      selectedCountries: ['FR'],
    },
  },
  {
    id: 'aud_fr_base_total_france',
    name: '👑 🇫🇷 França (Omar) - Base Total Consolidada',
    vendedor: 'Omar',
    leadCount: 10245,
    filters: {
      selectedCountries: ['FR'],
    },
  },

  // ==========================================
  // ALEX (ESPANHA - LUMINOUS / STOCCO)
  // ==========================================
  {
    id: 'aud_mailing_alex_ineditos_huesca_cuenca_barcelona_2026',
    name: '🚀 Mailing Alex - Inéditos Huesca, Cuenca & Barcelona',
    vendedor: 'Alex',
    leadCount: 460,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Huesca, Cuenca & Barcelona 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huesca_cuenca_barcelona_completo_2026',
    name: '🎯 Mailing Alex - Huesca, Cuenca & Barcelona Completo',
    vendedor: 'Alex',
    leadCount: 574,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Huesca, Cuenca & Barcelona 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_sector_metal_ampliado_4_2026',
    name: '🚀 Mailing Alex - Inéditos Sector Metal Ampliado 4 (Galicia & Multirregional)',
    vendedor: 'Alex',
    leadCount: 70,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Sector Metal España Ampliado 4 (Galicia & Multirregional) 2026',
    },
  },
  {
    id: 'aud_mailing_alex_sector_metal_ampliado_4_completo_2026',
    name: '🎯 Mailing Alex - Sector Metal Ampliado 4 (Galicia & Multirregional) Completo',
    vendedor: 'Alex',
    leadCount: 70,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Sector Metal España Ampliado 4 (Galicia & Multirregional) 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guipuzcoa_navarra_alava_2026',
    name: '🚀 Mailing Alex - Inéditos Guipúzcoa, Navarra & Álava',
    vendedor: 'Alex',
    leadCount: 150,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Guipúzcoa Navarra Álava 2026',
    },
  },
  {
    id: 'aud_mailing_alex_guipuzcoa_navarra_alava_completo_2026',
    name: '🎯 Mailing Alex - Guipúzcoa, Navarra & Álava Completo',
    vendedor: 'Alex',
    leadCount: 390,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Guipúzcoa Navarra Álava 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_vizcaya_2026',
    name: '🚀 Mailing Alex - Inéditos Vizcaya',
    vendedor: 'Alex',
    leadCount: 92,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Vizcaya 2026',
    },
  },
  {
    id: 'aud_mailing_alex_vizcaya_completo_2026',
    name: '🎯 Mailing Alex - Vizcaya Completo',
    vendedor: 'Alex',
    leadCount: 266,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Vizcaya 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_huelva_cyl_cadiz_2026',
    name: '🚀 Mailing Alex - Inéditos Huelva, Castilla y León & Cádiz',
    vendedor: 'Alex',
    leadCount: 312,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Huelva Castilla y León Cádiz 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huelva_cyl_cadiz_completo_2026',
    name: '🎯 Mailing Alex - Huelva, Castilla y León & Cádiz Completo',
    vendedor: 'Alex',
    leadCount: 603,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Huelva Castilla y León Cádiz 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_valencia_albacete_caceres_2026',
    name: '🚀 Mailing Alex - Inéditos Valencia, Albacete & Cáceres',
    vendedor: 'Alex',
    leadCount: 355,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Valencia Albacete Cáceres 2026',
    },
  },
  {
    id: 'aud_mailing_alex_valencia_albacete_caceres_completo_2026',
    name: '🎯 Mailing Alex - Valencia, Albacete & Cáceres Completo',
    vendedor: 'Alex',
    leadCount: 495,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Valencia Albacete Cáceres 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_huelva_zaragoza_granada_2026',
    name: '🚀 Mailing Alex - Inéditos Huelva, Zaragoza & Granada',
    vendedor: 'Alex',
    leadCount: 83,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Huelva Zaragoza Granada 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huelva_zaragoza_granada_completo_2026',
    name: '🎯 Mailing Alex - Huelva, Zaragoza & Granada Completo',
    vendedor: 'Alex',
    leadCount: 212,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - Huelva Zaragoza Granada 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_pais_vasco_2026',
    name: '🚀 Mailing Alex - Inéditos País Vasco',
    vendedor: 'Alex',
    leadCount: 53,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - País Vasco 2026',
    },
  },
  {
    id: 'aud_mailing_alex_pais_vasco_completo_2026',
    name: '🎯 Mailing Alex - País Vasco Completo',
    vendedor: 'Alex',
    leadCount: 138,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex - País Vasco 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_sevilla',
    name: '🚀 Mailing Alex - Inéditos Sevilla',
    vendedor: 'Alex',
    leadCount: 216,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Sevilla',
    },
  },
  {
    id: 'aud_mailing_alex_sevilla_completo',
    name: '🎯 Mailing Alex - Sevilla Completo',
    vendedor: 'Alex',
    leadCount: 272,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Sevilla',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_cadiz',
    name: '🚀 Mailing Alex - Inéditos Cádiz',
    vendedor: 'Alex',
    leadCount: 296,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Cádiz',
    },
  },
  {
    id: 'aud_mailing_alex_cadiz_completo',
    name: '🎯 Mailing Alex - Cádiz Completo',
    vendedor: 'Alex',
    leadCount: 333,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Cádiz',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guadalajara_huelva_huesca',
    name: '🚀 Mailing Alex - Inéditos Guadalajara, Huelva & Huesca',
    vendedor: 'Alex',
    leadCount: 212,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Guadalajara Huelva Huesca',
    },
  },
  {
    id: 'aud_mailing_alex_guadalajara_huelva_huesca',
    name: '🎯 Mailing Alex - Guadalajara, Huelva & Huesca Completo',
    vendedor: 'Alex',
    leadCount: 248,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Guadalajara Huelva Huesca',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guipuzcoa',
    name: '🚀 Mailing Alex - Inéditos Guipúzcoa',
    vendedor: 'Alex',
    leadCount: 190,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Guipúzcoa',
    },
  },
  {
    id: 'aud_mailing_alex_guipuzcoa',
    name: '🎯 Mailing Alex - Guipúzcoa Completo',
    vendedor: 'Alex',
    leadCount: 255,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Guipúzcoa',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_cordoba_granada_girona',
    name: '🚀 Mailing Alex - Inéditos Córdoba, Granada & Girona',
    vendedor: 'Alex',
    leadCount: 410,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Córdoba Granada Girona',
    },
  },
  {
    id: 'aud_mailing_alex_cordoba_granada_girona',
    name: '🎯 Mailing Alex - Córdoba, Granada & Girona Completo',
    vendedor: 'Alex',
    leadCount: 477,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Córdoba Granada Girona',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_ciudadreal_toledo_cadiz',
    name: '🚀 Mailing Alex - Inéditos Ciudad Real, Toledo, Cádiz, Cantabria & Castellón',
    vendedor: 'Alex',
    leadCount: 413,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Ciudad Real Toledo Cádiz Cantabria Castellón',
    },
  },
  {
    id: 'aud_mailing_alex_ciudadreal_toledo_cadiz',
    name: '🎯 Mailing Alex - Ciudad Real, Toledo, Cádiz, Cantabria & Castellón Completo',
    vendedor: 'Alex',
    leadCount: 524,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Ciudad Real Toledo Cádiz Cantabria Castellón',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_burgos_almeria',
    name: '🚀 Mailing Alex - Inéditos Burgos, Ávila, Almería & Cáceres',
    vendedor: 'Alex',
    leadCount: 469,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Inéditos - Burgos Ávila Almería Cáceres',
    },
  },
  {
    id: 'aud_mailing_alex_burgos_almeria',
    name: '🎯 Mailing Alex - Burgos, Ávila, Almería & Cáceres Completo',
    vendedor: 'Alex',
    leadCount: 630,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Burgos-Ávila-Almería-Cáceres',
    },
  },
  {
    id: 'aud_mailing_alex_badajoz',
    name: '🎯 Mailing Alex - Badajoz & Extremadura',
    vendedor: 'Alex',
    leadCount: 237,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Badajoz',
    },
  },
  {
    id: 'aud_mailing_alex_bilbao',
    name: '🎯 Mailing Alex - Bilbao & Bizkaia',
    vendedor: 'Alex',
    leadCount: 401,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Bilbao',
    },
  },
  {
    id: 'aud_mailing_alex_nuevos_2026',
    name: '🎯 Mailing Alex - Novos Mailings (Badajoz + Bilbao)',
    vendedor: 'Alex',
    leadCount: 638,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Nuevos 2026',
    },
  },
  {
    id: 'aud_mailing_alex_asturias_alicante',
    name: '🎯 Mailing Alex - Asturias & Alicante',
    vendedor: 'Alex',
    leadCount: 621,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex Asturias-Alicante',
    },
  },
  {
    id: 'aud_mailing_alex_0209',
    name: '🎯 Mailing Alex - Base Álava & Euskadi',
    vendedor: 'Alex',
    leadCount: 613,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex 02-09',
    },
  },
  {
    id: 'aud_mailing_alex',
    name: '🎯 Mailing Alex - Geral Espanha',
    vendedor: 'Alex',
    leadCount: 5905,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Alex',
    },
  },
  {
    id: 'aud_mailing_alex_stocco',
    name: '💼 Mailing Alex Stocco',
    vendedor: 'Alex',
    leadCount: 2197,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Alex Stocco',
    },
  },
  {
    id: 'aud_mailing_comercial_3',
    name: '💼 Mailing Comercial 3 - Prospecção Equipe',
    vendedor: 'Alex',
    leadCount: 1987,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Comercial 3',
    },
  },

  // ==========================================
  // GIADA (ITÁLIA - TRIÂNGULO)
  // ==========================================
  {
    id: 'aud_triangulo_giada_ineditos_pdf',
    name: '🚀 🇮🇹 Giada - Inéditos PDF Itália',
    vendedor: 'Giada',
    leadCount: 92,
    filters: {
      selectedCountries: ['IT'],
      tagKeyword: 'Mailing Giada - Inéditos PDF Italia',
    },
  },
  {
    id: 'aud_triangulo_giada_pdf_empresas',
    name: '🎯 🇮🇹 Giada - Mailing PDF Empresas Itália',
    vendedor: 'Giada',
    leadCount: 108,
    filters: {
      selectedCountries: ['IT'],
      tagKeyword: 'Mailing Giada - PDF Empresas Italia',
    },
  },
  {
    id: 'aud_triangulo_giada_italia_geral',
    name: '🌟 🇮🇹 Giada - Mailing Geral Itália',
    vendedor: 'Giada',
    leadCount: 1790,
    filters: {
      selectedCountries: ['IT'],
      tagKeyword: 'Giada',
    },
  },
  {
    id: 'aud_triangulo_giada_carpenteria',
    name: '🎯 🇮🇹 Giada - Carpenteria Metallica & Tubazioni',
    vendedor: 'Giada',
    leadCount: 494,
    filters: {
      selectedCountries: ['IT'],
      selectedSectors: ['Calderería & Tubería Industrial', 'Tuyauterie & Chaudronnerie Industrielle', 'Caldareria Pesante & Serbatoi a Pressione (Italia)'],
      tagKeyword: 'Giada',
    },
  },
  {
    id: 'aud_triangulo_giada_strutture',
    name: '🎯 🇮🇹 Giada - Strutture Metalliche & Montaggi',
    vendedor: 'Giada',
    leadCount: 417,
    filters: {
      selectedCountries: ['IT'],
      selectedSectors: ['Estructuras Metálicas & Montajes', 'Estructuras Metálicas & Cerrajería', 'Metalmecânica & Industrial'],
      tagKeyword: 'Giada',
    },
  },
  {
    id: 'aud_triangulo_giada_meccanica',
    name: '🎯 🇮🇹 Giada - Lavorazioni Meccaniche & CNC',
    vendedor: 'Giada',
    leadCount: 501,
    filters: {
      selectedCountries: ['IT'],
      selectedSectors: ['Mecanizado CNC & Tornería', 'Mecanizado & Matricería', 'Talleres & Mecanizado'],
      tagKeyword: 'Giada',
    },
  },
  {
    id: 'aud_triangulo_giada_cantieri_navali',
    name: '🎯 🇮🇹 Giada - Cantieri Navali & Piping Navale',
    vendedor: 'Giada',
    leadCount: 122,
    filters: {
      selectedCountries: ['IT'],
      selectedSectors: ['Construção & Reparação Naval', 'Chantiers Navals & Marine'],
      tagKeyword: 'Giada',
    },
  },

  // ==========================================
  // MICHELLE / MITCHELLE (ESPANHA - TRIÂNGULO)
  // ==========================================
  {
    id: 'aud_triangulo_mitchelle_ineditos_metal',
    name: '🚀 Triângulo (Mitchelle) - Inéditos Metal Lote 2',
    vendedor: 'Michelle',
    leadCount: 48,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Triangulo Mitchelle Inéditos Metal',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_metal',
    name: '🎯 Triângulo (Mitchelle) - Listado Empresas Metal',
    vendedor: 'Michelle',
    leadCount: 153,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Triangulo Metal',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_geral',
    name: '🎯 Triângulo (Mitchelle) - Mailing Geral Empresas Espanha',
    vendedor: 'Michelle',
    leadCount: 308,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Triangulo Mitchelle',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_ineditos_total',
    name: '🚀 Triângulo (Mitchelle) - Inéditos Totais Espanha',
    vendedor: 'Michelle',
    leadCount: 122,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Triangulo Mitchelle Inéditos',
    },
  },
  {
    id: 'aud_triangulo_michelle_es_geral',
    name: '🎯 Triângulo (Michelle) - Geral Espanha Sem Alex',
    vendedor: 'Michelle',
    leadCount: 6546,
    filters: {
      selectedCountries: ['ES'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_caldereria',
    name: '🎯 Triângulo (Michelle) - Calderería, Tubería & Piping',
    vendedor: 'Michelle',
    leadCount: 1200,
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Calderería & Tubería Industrial', 'Tuyauterie & Chaudronnerie Industrielle'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_estructuras',
    name: '🎯 Triângulo (Michelle) - Estructuras Metálicas & Montajes',
    vendedor: 'Michelle',
    leadCount: 1100,
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Estructuras Metálicas & Montajes', 'Estructuras Metálicas & Cerrajería', 'Metalmecânica & Industrial'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_mecanizado',
    name: '🎯 Triângulo (Michelle) - Mecanizado CNC & Tornería',
    vendedor: 'Michelle',
    leadCount: 850,
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Mecanizado CNC & Tornería', 'Mecanizado & Matricería', 'Talleres & Mecanizado'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_catalunha',
    name: '🎯 Triângulo (Michelle) - Catalunha & Barcelona',
    vendedor: 'Michelle',
    leadCount: 1350,
    filters: {
      selectedCountries: ['ES'],
      selectedRegions: ['Catalunha', 'Cataluña', 'Catalunya'],
      selectedProvinces: ['Barcelona', 'Tarragona', 'Girona', 'Lleida'],
      provinceKeyword: 'barcelona',
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_madrid',
    name: '🎯 Triângulo (Michelle) - Madrid & Zona Centro',
    vendedor: 'Michelle',
    leadCount: 1100,
    filters: {
      selectedCountries: ['ES'],
      selectedRegions: ['Comunidad de Madrid', 'Madrid'],
      selectedProvinces: ['Madrid', 'Toledo', 'Guadalajara'],
      provinceKeyword: 'madrid',
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },

  // ==========================================
  // ROSA / KR-CAPTACIÓN
  // ==========================================
  {
    id: 'aud_mailing_kr_captacion',
    name: '🎯 Mailing Kr-Captación / Rosa',
    vendedor: 'Rosa',
    leadCount: 2937,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Kr-Captacion',
    },
  },

  // ==========================================
  // BASES GERAIS & VIP
  // ==========================================
  {
    id: 'aud_tier1_vip',
    name: '👑 Público VIP - Grandes Empresas (Tier 1 & EPC)',
    vendedor: 'VIP / Geral',
    leadCount: 437,
    filters: {
      selectedCountries: ['ES'],
      selectedCompanySizes: ['Gran Empresa (Tier 1)', 'Tier 1 (Gran Empresa / EPC)'],
      tagKeyword: 'Público VIP',
    },
  },
  {
    id: 'aud_tier2_medias',
    name: '🏭 Médias Empresas Industriais (Tier 2)',
    vendedor: 'VIP / Geral',
    leadCount: 785,
    filters: {
      selectedCountries: ['ES'],
      selectedCompanySizes: ['Mediana Empresa (Tier 2)', 'Tier 2 (Mediana Empresa Industrial)'],
    },
  },
  {
    id: 'aud_lote_manha',
    name: '☀️ Lote Manhã - Indústria & Montagens',
    vendedor: 'VIP / Geral',
    leadCount: 1525,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Lote Manhã',
    },
  },
  {
    id: 'aud_lote_tarde',
    name: '🌅 Lote Tarde - Tubería & Calderería',
    vendedor: 'VIP / Geral',
    leadCount: 2446,
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Lote Tarde',
    },
  },
];

export function doesLeadMatchAudience(lead: any, audience: MarketingAudiencePreset): boolean {
  if (!audience) return true;

  // 1. Direct lead IDs list (custom saved selection audience)
  if (audience.leadIds && Array.isArray(audience.leadIds) && audience.leadIds.length > 0) {
    return audience.leadIds.includes(lead.id);
  }

  const filters = audience.filters;
  if (!filters) return true;

  // 2. Stage filter
  if (filters.stageId && lead.stage_id !== filters.stageId) {
    return false;
  }

  // 3. Origin filter
  if (filters.origin && lead.origen_lead !== filters.origin) {
    return false;
  }

  // 4. Country filter
  if (filters.selectedCountries && filters.selectedCountries.length > 0) {
    const leadCountry = detectLeadCountry(lead);
    if (!filters.selectedCountries.includes(leadCountry)) {
      return false;
    }
  }

  // 5. Company Size Tier
  if (filters.selectedCompanySizes && filters.selectedCompanySizes.length > 0) {
    const size = lead.company_size || '';
    const inTags = Array.isArray(lead.tags) && filters.selectedCompanySizes.some(s => lead.tags.includes(s));
    const matchesSize = filters.selectedCompanySizes.includes(size) || inTags;
    if (!matchesSize) return false;
  }

  // 6. Region
  if (filters.selectedRegions && filters.selectedRegions.length > 0) {
    const reg = lead.region || '';
    const inTags = Array.isArray(lead.tags) && filters.selectedRegions.some(r => lead.tags.includes(r));
    const matchesReg = filters.selectedRegions.includes(reg) || inTags;
    if (!matchesReg) return false;
  }

  // 7. Province
  if (filters.selectedProvinces && filters.selectedProvinces.length > 0) {
    const prov = lead.province || '';
    if (!filters.selectedProvinces.includes(prov)) {
      return false;
    }
  }

  // 8. Selected Sectors
  if (filters.selectedSectors && filters.selectedSectors.length > 0) {
    const hasSectorMatch = filters.selectedSectors.some(sec => {
      const sLower = sec.toLowerCase();
      const lSector = (lead.sector || '').toLowerCase();
      const lCompany = (lead.company_name || '').toLowerCase();
      const lNotes = (lead.notes || '').toLowerCase();
      const inTags = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(sLower));
      return lSector.includes(sLower) || lCompany.includes(sLower) || lNotes.includes(sLower) || inTags;
    });
    if (!hasSectorMatch) return false;
  }

  // 9. Selected Services
  if (filters.selectedServices && filters.selectedServices.length > 0) {
    const hasServiceMatch = filters.selectedServices.some(srv => {
      const sLower = srv.toLowerCase();
      const lService = (lead.servicio_producto || '').toLowerCase();
      const lNotes = (lead.notes || '').toLowerCase();
      const lCompany = (lead.company_name || '').toLowerCase();
      return lService.includes(sLower) || lNotes.includes(sLower) || lCompany.includes(sLower);
    });
    if (!hasServiceMatch) return false;
  }

  // 10. Sector Keyword
  if (filters.sectorKeyword) {
    const keyword = filters.sectorKeyword.toLowerCase();
    const sectorText = (lead.sector || '').toLowerCase();
    const serviceText = (lead.servicio_producto || '').toLowerCase();
    const companyText = (lead.company_name || '').toLowerCase();
    const notesText = (lead.notes || '').toLowerCase();
    const inTags = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(keyword));
    if (!sectorText.includes(keyword) && !serviceText.includes(keyword) && !companyText.includes(keyword) && !notesText.includes(keyword) && !inTags) {
      return false;
    }
  }

  // 11. Cargo Keyword
  if (filters.cargoKeyword) {
    const keyword = filters.cargoKeyword.toLowerCase();
    const cargoText = (lead.cargo || '').toLowerCase();
    const nameText = (lead.name || '').toLowerCase();
    if (!cargoText.includes(keyword) && !nameText.includes(keyword)) {
      return false;
    }
  }

  // 12. Province Keyword
  if (filters.provinceKeyword) {
    const keyword = filters.provinceKeyword.toLowerCase();
    const provinceText = (lead.province || '').toLowerCase();
    const regionText = (lead.region_id || lead.region || '').toLowerCase();
    const cityText = (lead.city || '').toLowerCase();
    if (!provinceText.includes(keyword) && !regionText.includes(keyword) && !cityText.includes(keyword)) {
      return false;
    }
  }

  // 13. Tag Keyword / Strategic Audience Tag
  if (filters.tagKeyword) {
    const keyword = filters.tagKeyword.toLowerCase();
    const hasTag = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(keyword));
    const inSector = (lead.sector || '').toLowerCase().includes(keyword);
    const inNotes = (lead.notes || '').toLowerCase().includes(keyword);
    const inSize = (lead.company_size || '').toLowerCase().includes(keyword);
    if (!hasTag && !inSector && !inNotes && !inSize) {
      return false;
    }
  }

  // 14. Exclude Tag Keyword (e.g. Exclude 'Alex' for Michelle / Triangulo)
  if (filters.excludeTagKeyword) {
    const excludeKw = filters.excludeTagKeyword.toLowerCase();
    const hasTag = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(excludeKw));
    const inOrigin = (lead.origen_lead || '').toLowerCase().includes(excludeKw);
    const inAssigned = lead.assigned_to === 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
    if (hasTag || inOrigin || inAssigned) {
      return false;
    }
  }

  // 15. Exclude proposals
  if (filters.excludeProposals) {
    const stageName = (lead.kanban_stages?.name || lead.stage_name || '').toLowerCase();
    if (
      stageName.includes('orçamento') ||
      stageName.includes('presupuesto') ||
      stageName.includes('proposta') ||
      stageName.includes('negociação') ||
      stageName.includes('negociacion') ||
      stageName.includes('convertido') ||
      stageName.includes('ganho')
    ) {
      return false;
    }
  }

  return true;
}

export function doesLeadMatchVendedor(lead: any, vendedor: string): boolean {
  if (!vendedor || vendedor === 'all') return true;
  const tagsLower = Array.isArray(lead.tags) ? lead.tags.map((t: any) => String(t).toLowerCase()) : [];
  const originLower = (lead.origen_lead || '').toLowerCase();
  const notesLower = (lead.notes || '').toLowerCase();
  const cCode = detectLeadCountry(lead);

  if (vendedor === 'Omar') {
    return (
      cCode === 'FR' ||
      cCode === 'BE' ||
      tagsLower.some((t: string) => t.includes('omar')) ||
      originLower.includes('omar') ||
      notesLower.includes('omar')
    );
  }
  if (vendedor === 'Alex') {
    return (
      tagsLower.some((t: string) => t.includes('alex') || t.includes('comercial 3')) ||
      originLower.includes('alex') ||
      lead.assigned_to === 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'
    );
  }
  if (vendedor === 'Giada') {
    return (
      cCode === 'IT' ||
      tagsLower.some((t: string) => t.includes('giada')) ||
      originLower.includes('giada')
    );
  }
  if (vendedor === 'Michelle') {
    const hasMichelleTag = tagsLower.some((t: string) => t.includes('michelle') || t.includes('mitchelle') || t.includes('triangulo') || t.includes('triângulo'));
    if (hasMichelleTag) return true;
    const isAlex = tagsLower.some((t: string) => t.includes('alex')) || originLower.includes('alex') || lead.assigned_to === 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
    return cCode === 'ES' && !isAlex;
  }
  if (vendedor === 'Rosa') {
    return (
      tagsLower.some((t: string) => t.includes('kr-captacion') || t.includes('kr-captación') || t.includes('rosa')) ||
      originLower.includes('kr-captacion') ||
      originLower.includes('rosa')
    );
  }
  return true;
}

export function loadAllMarketingAudiences(leads: any[] = []): MarketingAudiencePreset[] {
  const defaultIds = new Set(ALL_STRATEGIC_AUDIENCES.map(a => a.id));
  const legacyIds = new Set([
    'aud_wiseowe_fr_geral',
    'aud_tier1_vip_wiseowe',
    'aud_fr_tuyauterie_piping',
    'aud_fr_charpente_structures',
    'aud_fr_grands_parcs',
    'aud_fr_usinage_mecanique',
    'aud_fr_chantiers_navals',
    'aud_fr_chaudieres_maintenance',
    'aud_fr_tuyauterie_inox',
    'aud_fr_base_geral_auditada',
    'aud_tier1_vip_triangulo',
    'aud_tier2_medias_triangulo',
  ]);

  const customAudiencesMap = new Map<string, MarketingAudiencePreset>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mcs_marketing_audiences_')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || !item.id || defaultIds.has(item.id) || legacyIds.has(item.id)) continue;
            if (!customAudiencesMap.has(item.id)) {
              const vend = detectAudienceVendedor(
                item.name || '',
                item.filters?.tagKeyword,
                item.filters?.selectedCountries,
                true
              );
              customAudiencesMap.set(item.id, {
                id: item.id,
                name: item.name,
                vendedor: vend,
                leadCount: item.leadCount,
                leadIds: item.leadIds,
                filters: item.filters,
                created_at: item.created_at,
                isCustom: true,
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error loading custom marketing audiences from localStorage:', e);
  }

  // Also discover any dynamic "Mailing ..." tags directly from leads that aren't already covered by strategic presets
  const knownTagKeywords = new Set(
    ALL_STRATEGIC_AUDIENCES.map(a => (a.filters?.tagKeyword || '').toLowerCase().trim()).filter(Boolean)
  );
  customAudiencesMap.forEach(a => {
    if (a.filters?.tagKeyword) {
      knownTagKeywords.add(a.filters.tagKeyword.toLowerCase().trim());
    }
  });

  const dynamicTagCounts = new Map<string, { count: number; countries: Set<string> }>();
  for (const lead of leads) {
    if (Array.isArray(lead.tags)) {
      for (const t of lead.tags) {
        if (typeof t === 'string') {
          const trimmed = t.trim();
          const lower = trimmed.toLowerCase();
          if (
            (lower.startsWith('mailing ') ||
              lower.startsWith('público ') ||
              lower.startsWith('publico ') ||
              lower.startsWith('lote ') ||
              lower.includes('omar') ||
              lower.includes('alex') ||
              lower.includes('giada') ||
              lower.includes('mitchelle') ||
              lower.includes('michelle')) &&
            !knownTagKeywords.has(lower)
          ) {
            const entry = dynamicTagCounts.get(trimmed) || { count: 0, countries: new Set<string>() };
            entry.count++;
            entry.countries.add(detectLeadCountry(lead));
            dynamicTagCounts.set(trimmed, entry);
          }
        }
      }
    }
  }

  const dynamicTagAudiences: MarketingAudiencePreset[] = [];
  dynamicTagCounts.forEach((info, tag) => {
    if (info.count >= 5) {
      const countries = Array.from(info.countries);
      const vend = detectAudienceVendedor(tag, tag, countries, false);
      dynamicTagAudiences.push({
        id: `dyn_tag_${tag.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        name: `🏷️ ${tag}`,
        vendedor: vend,
        leadCount: info.count,
        filters: {
          tagKeyword: tag,
        },
      });
    }
  });

  return [
    ...Array.from(customAudiencesMap.values()),
    ...ALL_STRATEGIC_AUDIENCES,
    ...dynamicTagAudiences,
  ];
}
