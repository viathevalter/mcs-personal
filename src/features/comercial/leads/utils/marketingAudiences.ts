import { detectLeadCountry } from './leadCountryUtils';
import type { CommercialOwnerKey } from '../hooks/useLeads';

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
  leadCount?: number;
  leadIds?: string[];
  filters?: MarketingAudienceFilters;
  created_at?: string;
  isCustom?: boolean;
  ownerKey?: CommercialOwnerKey;
  country?: 'ES' | 'FR';
}

export const ALL_STRATEGIC_AUDIENCES: MarketingAudiencePreset[] = [
  // ==========================================
  // LISETH (ESPANHA - WISEOWE)
  // ==========================================
  {
    id: 'aud_liseth_base_total_2026',
    name: '🌟 🇪🇸 Liseth (Wiseowe) - Base Total Consolidada',
    leadCount: 33,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Liseth',
    },
  },
  {
    id: 'aud_liseth_lote_3010_completo_2026',
    name: '🎯 🇪🇸 Liseth (Wiseowe) - Lote 30/10 Completo',
    leadCount: 20,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Liseth - Lote 30-10 2026',
    },
  },
  {
    id: 'aud_liseth_ineditos_3010_2026',
    name: '🚀 🇪🇸 Liseth (Wiseowe) - Inéditos Lote 30/10',
    leadCount: 10,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Mailing Liseth Inéditos - Lote 30-10 2026',
    },
  },
  {
    id: 'aud_mailing_comercial_3',
    name: '💼 🇪🇸 Liseth (Wiseowe) - Mailing Comercial 3 Espanha',
    leadCount: 1987,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Comercial 3',
    },
  },
  {
    id: 'aud_mailing_kr_captacion',
    name: '🎯 🇪🇸 Liseth (Wiseowe) - Base Captación Espanha',
    leadCount: 2937,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      tagKeyword: 'Kr-Captacion',
    },
  },
  {
    id: 'aud_liseth_es_caldereria_estructuras',
    name: '🏭 🇪🇸 Liseth (Wiseowe) - Calderería, Tubería & Estructuras (ES)',
    leadCount: 1850,
    ownerKey: 'liseth',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Calderería & Tubería Industrial', 'Estructuras Metálicas & Montajes'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },

  // ==========================================
  // FATUMATA (FRANÇA & BÉLGICA - WISEOWE)
  // ==========================================
  {
    id: 'aud_fr_base_total_france',
    name: '🌟 🇫🇷 Fatumata (Wiseowe) - France Base Totale Consolidée',
    leadCount: 10245,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedCountries: ['FR'],
    },
  },
  {
    id: 'aud_fr_novos_ineditos_total',
    name: '🚀 🇫🇷 Fatumata (Wiseowe) - Nouveaux Leads Inédits France',
    leadCount: 9091,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      stageId: '048f4587-f416-4fc2-b3c9-09c42347df95',
      selectedCountries: ['FR'],
    },
  },
  {
    id: 'aud_fr_omar_scraping_inedits',
    name: '🚀 🇫🇷 Fatumata (Wiseowe) - Inédits Portails France / SCMF & Sous-Traiter',
    leadCount: 228,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - Inédits Web Scraping França',
    },
  },
  {
    id: 'aud_fr_omar_scraping_total',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Mailing Complet Portails France',
    leadCount: 354,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - Web Scraping França 2026',
    },
  },
  {
    id: 'aud_fr_omar_mailing_france',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Mailing France Principal',
    leadCount: 2362,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - France',
    },
  },
  {
    id: 'aud_fr_omar_inedits_france',
    name: '🚀 🇫🇷 Fatumata (Wiseowe) - Inédits France Prioritaires',
    leadCount: 1309,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - Inédits France',
    },
  },
  {
    id: 'aud_be_omar_mailing_belgique',
    name: '🎯 🇧🇪 Fatumata (Wiseowe) - Mailing Belgique',
    leadCount: 208,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - Belgique',
    },
  },
  {
    id: 'aud_be_omar_inedits_belgique',
    name: '🚀 🇧🇪 Fatumata (Wiseowe) - Inédits Belgique',
    leadCount: 199,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar - Inédits Belgique',
    },
  },
  {
    id: 'aud_fr_be_omar_mailing_total',
    name: '🌟 🇪🇺 Fatumata (Wiseowe) - Mailing Total FR & BE',
    leadCount: 2570,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Mailing Omar',
    },
  },
  {
    id: 'aud_fr_omar_planilha_total',
    name: '🚀 🇫🇷 Fatumata (Wiseowe) - Base Industrielle France (Total)',
    leadCount: 1147,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_tuyauterie',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Tuyauterie & Chaudronnerie',
    leadCount: 735,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Tuyauterie & Chaudronnerie Industrielle'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_naval',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Chantiers Navals & Marine',
    leadCount: 239,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Construção & Reparação Naval'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_inox',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Tuyauterie Inox & Agroalimentaire',
    leadCount: 69,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Tubería Inox & Agroalimentaria'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_estructuras',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Charpente Métallique & Serrurerie',
    leadCount: 42,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Estructuras Metálicas & Montajes'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_piping',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Tuyauterie Industrielle & Piping',
    leadCount: 26,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Tuyauterie Industrielle & Piping'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_omar_usinage',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Usinage CNC & Mécanique',
    leadCount: 12,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedSectors: ['Mecanizado CNC & Tornería'],
      tagKeyword: 'Omar Planilha',
    },
  },
  {
    id: 'aud_fr_secteur_tuyauterie_chaudronnerie',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Secteur Tuyauterie & Chaudronnerie (FR)',
    leadCount: 5676,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Tuyauterie & Chaudronnerie Industrielle', 'Calderería & Tubería Industrial', 'Tuyauterie Industrielle & Piping'],
    },
  },
  {
    id: 'aud_fr_secteur_charpente_metallique',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Secteur Charpente Métallique & Structures (FR)',
    leadCount: 2781,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Estructuras Metálicas & Montajes', 'Mecanizado CNC & Tornería', 'Estructuras Metálicas & Cerrajería'],
    },
  },
  {
    id: 'aud_fr_secteur_chantiers_navals',
    name: '🎯 🇫🇷 Fatumata (Wiseowe) - Secteur Chantiers Navals & Off-shore (FR)',
    leadCount: 352,
    ownerKey: 'fatumata',
    country: 'FR',
    filters: {
      selectedCountries: ['FR'],
      selectedSectors: ['Construção & Reparação Naval', 'Chantiers Navals & Marine'],
    },
  },

  // ==========================================
  // ALEX (ESPANHA - LUMINOUS)
  // ==========================================
  {
    id: 'aud_mailing_alex_ineditos_huesca_cuenca_barcelona_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Huesca, Cuenca & Barcelona',
    leadCount: 460,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Huesca, Cuenca & Barcelona 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huesca_cuenca_barcelona_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Huesca, Cuenca & Barcelona Completo',
    leadCount: 574,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Huesca, Cuenca & Barcelona 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_sector_metal_ampliado_4_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Sector Metal Ampliado 4 (Galicia)',
    leadCount: 70,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Sector Metal España Ampliado 4 (Galicia & Multirregional) 2026',
    },
  },
  {
    id: 'aud_mailing_alex_sector_metal_ampliado_4_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Sector Metal Ampliado 4 (Galicia) Completo',
    leadCount: 70,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Sector Metal España Ampliado 4 (Galicia & Multirregional) 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guipuzcoa_navarra_alava_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Guipúzcoa, Navarra & Álava',
    leadCount: 150,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Guipúzcoa Navarra Álava 2026',
    },
  },
  {
    id: 'aud_mailing_alex_guipuzcoa_navarra_alava_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Guipúzcoa, Navarra & Álava Completo',
    leadCount: 390,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Guipúzcoa Navarra Álava 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_vizcaya_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Vizcaya',
    leadCount: 92,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Vizcaya 2026',
    },
  },
  {
    id: 'aud_mailing_alex_vizcaya_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Vizcaya Completo',
    leadCount: 266,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Vizcaya 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_huelva_cyl_cadiz_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Huelva, Castilla y León & Cádiz',
    leadCount: 312,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Huelva Castilla y León Cádiz 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huelva_cyl_cadiz_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Huelva, Castilla y León & Cádiz Completo',
    leadCount: 603,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Huelva Castilla y León Cádiz 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_valencia_albacete_caceres_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Valencia, Albacete & Cáceres',
    leadCount: 355,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Valencia Albacete Cáceres 2026',
    },
  },
  {
    id: 'aud_mailing_alex_valencia_albacete_caceres_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Valencia, Albacete & Cáceres Completo',
    leadCount: 495,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Valencia Albacete Cáceres 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_huelva_zaragoza_granada_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Huelva, Zaragoza & Granada',
    leadCount: 83,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Huelva Zaragoza Granada 2026',
    },
  },
  {
    id: 'aud_mailing_alex_huelva_zaragoza_granada_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Huelva, Zaragoza & Granada Completo',
    leadCount: 212,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - Huelva Zaragoza Granada 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_pais_vasco_2026',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos País Vasco',
    leadCount: 53,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - País Vasco 2026',
    },
  },
  {
    id: 'aud_mailing_alex_pais_vasco_completo_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - País Vasco Completo',
    leadCount: 138,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex - País Vasco 2026',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_sevilla',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Sevilla',
    leadCount: 216,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Sevilla',
    },
  },
  {
    id: 'aud_mailing_alex_sevilla_completo',
    name: '🎯 🇪🇸 Alex (Luminous) - Sevilla Completo',
    leadCount: 272,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Sevilla',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_cadiz',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Cádiz',
    leadCount: 296,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Cádiz',
    },
  },
  {
    id: 'aud_mailing_alex_cadiz_completo',
    name: '🎯 🇪🇸 Alex (Luminous) - Cádiz Completo',
    leadCount: 333,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Cádiz',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guadalajara_huelva_huesca',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Guadalajara, Huelva & Huesca',
    leadCount: 212,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Guadalajara Huelva Huesca',
    },
  },
  {
    id: 'aud_mailing_alex_guadalajara_huelva_huesca',
    name: '🎯 🇪🇸 Alex (Luminous) - Guadalajara, Huelva & Huesca Completo',
    leadCount: 248,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Guadalajara Huelva Huesca',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_guipuzcoa',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Guipúzcoa',
    leadCount: 190,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Guipúzcoa',
    },
  },
  {
    id: 'aud_mailing_alex_guipuzcoa',
    name: '🎯 🇪🇸 Alex (Luminous) - Guipúzcoa Completo',
    leadCount: 255,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Guipúzcoa',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_cordoba_granada_girona',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Córdoba, Granada & Girona',
    leadCount: 410,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Córdoba Granada Girona',
    },
  },
  {
    id: 'aud_mailing_alex_cordoba_granada_girona',
    name: '🎯 🇪🇸 Alex (Luminous) - Córdoba, Granada & Girona Completo',
    leadCount: 477,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Córdoba Granada Girona',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_ciudadreal_toledo_cadiz',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Ciudad Real, Toledo, Cádiz & Cantabria',
    leadCount: 413,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Ciudad Real Toledo Cádiz Cantabria Castellón',
    },
  },
  {
    id: 'aud_mailing_alex_ciudadreal_toledo_cadiz',
    name: '🎯 🇪🇸 Alex (Luminous) - Ciudad Real, Toledo, Cádiz & Cantabria Completo',
    leadCount: 524,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Ciudad Real Toledo Cádiz Cantabria Castellón',
    },
  },
  {
    id: 'aud_mailing_alex_ineditos_burgos_almeria',
    name: '🚀 🇪🇸 Alex (Luminous) - Inéditos Burgos, Ávila, Almería & Cáceres',
    leadCount: 469,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Inéditos - Burgos Ávila Almería Cáceres',
    },
  },
  {
    id: 'aud_mailing_alex_burgos_almeria',
    name: '🎯 🇪🇸 Alex (Luminous) - Burgos, Ávila, Almería & Cáceres Completo',
    leadCount: 630,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Burgos-Ávila-Almería-Cáceres',
    },
  },
  {
    id: 'aud_mailing_alex_badajoz',
    name: '🎯 🇪🇸 Alex (Luminous) - Badajoz & Extremadura',
    leadCount: 237,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Badajoz',
    },
  },
  {
    id: 'aud_mailing_alex_bilbao',
    name: '🎯 🇪🇸 Alex (Luminous) - Bilbao & Bizkaia',
    leadCount: 401,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Bilbao',
    },
  },
  {
    id: 'aud_mailing_alex_nuevos_2026',
    name: '🎯 🇪🇸 Alex (Luminous) - Nuevos Mailings (Badajoz + Bilbao)',
    leadCount: 638,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Nuevos 2026',
    },
  },
  {
    id: 'aud_mailing_alex_asturias_alicante',
    name: '🎯 🇪🇸 Alex (Luminous) - Asturias & Alicante',
    leadCount: 621,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex Asturias-Alicante',
    },
  },
  {
    id: 'aud_mailing_alex_0209',
    name: '🎯 🇪🇸 Alex (Luminous) - Base Álava & Euskadi',
    leadCount: 613,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex 02-09',
    },
  },
  {
    id: 'aud_mailing_alex',
    name: '🌟 🇪🇸 Alex (Luminous) - Base General España',
    leadCount: 5905,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Alex',
    },
  },
  {
    id: 'aud_mailing_alex_stocco',
    name: '💼 🇪🇸 Alex (Luminous) - Base Industrial Stocco',
    leadCount: 2197,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Alex Stocco',
    },
  },
  {
    id: 'aud_tier1_vip',
    name: '👑 🇪🇸 Alex (Luminous) - Público VIP Grandes Empresas (Tier 1 & EPC)',
    leadCount: 437,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      selectedCompanySizes: ['Gran Empresa (Tier 1)', 'Tier 1 (Gran Empresa / EPC)'],
      tagKeyword: 'Público VIP',
    },
  },
  {
    id: 'aud_tier2_medias',
    name: '🏭 🇪🇸 Alex (Luminous) - Medianas Empresas Industriales (Tier 2)',
    leadCount: 785,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      selectedCompanySizes: ['Mediana Empresa (Tier 2)', 'Tier 2 (Mediana Empresa Industrial)'],
    },
  },
  {
    id: 'aud_lote_manha',
    name: '☀️ 🇪🇸 Alex (Luminous) - Lote Mañana Industria & Montajes',
    leadCount: 1525,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Lote Manhã',
    },
  },
  {
    id: 'aud_lote_tarde',
    name: '🌅 🇪🇸 Alex (Luminous) - Lote Tarde Tubería & Calderería',
    leadCount: 2446,
    ownerKey: 'alex',
    country: 'ES',
    filters: {
      tagKeyword: 'Lote Tarde',
    },
  },

  // ==========================================
  // ALBA (ESPANHA - TRIÂNGULO)
  // ==========================================
  {
    id: 'aud_triangulo_mitchelle_ineditos_metal',
    name: '🚀 🇪🇸 Alba (Triangulo) - Inéditos Sector Metal Lote 2',
    leadCount: 48,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Triangulo Mitchelle Inéditos Metal',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_metal',
    name: '🎯 🇪🇸 Alba (Triangulo) - Listado Empresas Metal España',
    leadCount: 153,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Triangulo Metal',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_geral',
    name: '🎯 🇪🇸 Alba (Triangulo) - Mailing General Empresas España',
    leadCount: 308,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Triangulo Mitchelle',
    },
  },
  {
    id: 'aud_triangulo_mitchelle_ineditos_total',
    name: '🚀 🇪🇸 Alba (Triangulo) - Inéditos Totales España',
    leadCount: 122,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      tagKeyword: 'Mailing Triangulo Mitchelle Inéditos',
    },
  },
  {
    id: 'aud_triangulo_michelle_es_geral',
    name: '🌟 🇪🇸 Alba (Triangulo) - Base General España (Sin Duplicados)',
    leadCount: 6546,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_caldereria',
    name: '🎯 🇪🇸 Alba (Triangulo) - Calderería, Tubería & Piping',
    leadCount: 1200,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Calderería & Tubería Industrial', 'Tuyauterie & Chaudronnerie Industrielle'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_estructuras',
    name: '🎯 🇪🇸 Alba (Triangulo) - Estructuras Metálicas & Montajes',
    leadCount: 1100,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Estructuras Metálicas & Montajes', 'Estructuras Metálicas & Cerrajería', 'Metalmecânica & Industrial'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_mecanizado',
    name: '🎯 🇪🇸 Alba (Triangulo) - Mecanizado CNC & Tornería',
    leadCount: 850,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      selectedSectors: ['Mecanizado CNC & Tornería', 'Mecanizado & Matricería', 'Talleres & Mecanizado'],
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
  {
    id: 'aud_triangulo_michelle_catalunha',
    name: '🎯 🇪🇸 Alba (Triangulo) - Cataluña & Barcelona',
    leadCount: 1350,
    ownerKey: 'alba',
    country: 'ES',
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
    name: '🎯 🇪🇸 Alba (Triangulo) - Madrid & Zona Centro',
    leadCount: 1100,
    ownerKey: 'alba',
    country: 'ES',
    filters: {
      selectedCountries: ['ES'],
      selectedRegions: ['Comunidad de Madrid', 'Madrid'],
      selectedProvinces: ['Madrid', 'Toledo', 'Guadalajara'],
      provinceKeyword: 'madrid',
      excludeTagKeyword: 'Alex',
      excludeProposals: true,
    },
  },
];

export function classifyAudienceOwner(aud: Partial<MarketingAudiencePreset>): CommercialOwnerKey {
  if (aud.ownerKey && ['alex', 'alba', 'liseth', 'fatumata'].includes(aud.ownerKey)) {
    return aud.ownerKey;
  }
  const idLower = (aud.id || '').toLowerCase();
  const nameLower = (aud.name || '').toLowerCase();
  const tagLower = (aud.filters?.tagKeyword || '').toLowerCase();
  const countries = aud.filters?.selectedCountries || [];

  if (
    idLower.includes('fatumata') ||
    idLower.includes('omar') ||
    idLower.includes('aud_fr_') ||
    idLower.includes('aud_be_') ||
    nameLower.includes('fatumata') ||
    nameLower.includes('omar') ||
    nameLower.includes('frança') ||
    nameLower.includes('france') ||
    nameLower.includes('belgique') ||
    tagLower.includes('omar') ||
    tagLower.includes('frança') ||
    tagLower.includes('france') ||
    countries.includes('FR') ||
    countries.includes('BE')
  ) {
    return 'fatumata';
  }

  if (
    idLower.includes('alba') ||
    idLower.includes('triangulo') ||
    idLower.includes('michelle') ||
    idLower.includes('mitchelle') ||
    nameLower.includes('alba') ||
    nameLower.includes('triângulo') ||
    nameLower.includes('triangulo') ||
    nameLower.includes('michelle') ||
    nameLower.includes('mitchelle') ||
    tagLower.includes('triangulo') ||
    tagLower.includes('michelle') ||
    tagLower.includes('mitchelle')
  ) {
    return 'alba';
  }

  if (
    idLower.includes('liseth') ||
    idLower.includes('lizeth') ||
    idLower.includes('comercial_3') ||
    idLower.includes('kr_captacion') ||
    nameLower.includes('liseth') ||
    nameLower.includes('lizeth') ||
    nameLower.includes('comercial 3') ||
    nameLower.includes('captación') ||
    tagLower.includes('liseth') ||
    tagLower.includes('lizeth') ||
    tagLower.includes('comercial 3') ||
    tagLower.includes('kr-captacion')
  ) {
    return 'liseth';
  }

  return 'alex';
}

export function normalizeAudienceDisplayName(name: string): string {
  return name
    .replace(/\bOmar\b/gi, 'Fatumata')
    .replace(/\bMitchelle\b/gi, 'Alba')
    .replace(/\bMichelle\b/gi, 'Alba');
}

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

  // 4. Tag Keyword / Strategic Audience Tag
  if (filters.tagKeyword) {
    const keyword = filters.tagKeyword.toLowerCase();
    const hasTag = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(keyword));
    const inSector = (lead.sector || '').toLowerCase().includes(keyword);
    const inNotes = (lead.notes || '').toLowerCase().includes(keyword);
    const inSize = (lead.company_size || '').toLowerCase().includes(keyword);
    if (!hasTag && !inSector && !inNotes && !inSize) {
      return false;
    }
  } else if (filters.selectedCountries && filters.selectedCountries.length > 0) {
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

  // 13. Exclude Tag Keyword (e.g. Exclude 'Alex' for Alba / Triangulo)
  if (filters.excludeTagKeyword) {
    const excludeKw = filters.excludeTagKeyword.toLowerCase();
    const hasTag = Array.isArray(lead.tags) && lead.tags.some((t: any) => String(t).toLowerCase().includes(excludeKw));
    const inOrigin = (lead.origen_lead || '').toLowerCase().includes(excludeKw);
    const inAssigned = lead.assigned_to === 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
    if (hasTag || inOrigin || inAssigned) {
      return false;
    }
  }

  // 14. Exclude proposals
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

export interface LoadAudiencesOptions {
  ownerKey?: CommercialOwnerKey | 'all';
  empresaId?: string | null;
}

export function loadAllMarketingAudiences(
  leads: any[] = [],
  options?: LoadAudiencesOptions
): MarketingAudiencePreset[] {
  const filterOwnerKey = options?.ownerKey || 'all';
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
    'aud_fr_base_total_france',
    'aud_fr_novos_ineditos_total',
    'aud_tier1_vip_triangulo',
    'aud_tier2_medias_triangulo',
    'aud_liseth_ineditos_3010_2026_lum',
    'aud_liseth_lote_3010_completo_2026_lum',
    'aud_liseth_base_total_2026_lum',
    'aud_triangulo_giada_ineditos_pdf',
    'aud_triangulo_giada_pdf_empresas',
    'aud_triangulo_giada_italia_geral',
    'aud_triangulo_giada_carpenteria',
    'aud_triangulo_giada_strutture',
    'aud_triangulo_giada_meccanica',
    'aud_triangulo_giada_cantieri_navali',
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
            const nameLower = String(item.name || '').toLowerCase();
            // Skip obsolete Giada / test audiences
            if (nameLower.includes('giada') || nameLower === 'teste10') continue;

            const ownerKey = classifyAudienceOwner(item);
            if (!customAudiencesMap.has(item.id)) {
              customAudiencesMap.set(item.id, {
                id: item.id,
                name: normalizeAudienceDisplayName(item.name || ''),
                leadCount: item.leadCount,
                leadIds: item.leadIds,
                filters: item.filters,
                created_at: item.created_at,
                isCustom: true,
                ownerKey,
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error loading custom marketing audiences from localStorage:', e);
  }

  // Discover dynamic "Mailing ..." tags directly from leads, scoped by commercial owner
  const knownTagKeywords = new Set(
    ALL_STRATEGIC_AUDIENCES.map(a => (a.filters?.tagKeyword || '').toLowerCase().trim()).filter(Boolean)
  );
  customAudiencesMap.forEach(a => {
    if (a.filters?.tagKeyword) {
      knownTagKeywords.add(a.filters.tagKeyword.toLowerCase().trim());
    }
  });

  // Skip generic person-name tags that duplicate strategic presets
  const ignoredRawTags = new Set([
    'omar',
    'alex',
    'alex carmona',
    'mailing alex 2026',
    'giada',
    'liseth',
    'lizeth',
    'mitchelle',
    'michelle',
    'alba',
    'fatumata',
  ]);

  const dynamicTagCounts = new Map<string, number>();
  for (const lead of leads) {
    if (Array.isArray(lead.tags)) {
      for (const t of lead.tags) {
        if (typeof t === 'string') {
          const trimmed = t.trim();
          const lower = trimmed.toLowerCase();
          if (ignoredRawTags.has(lower) || lower.includes('giada')) continue;
          if (
            (lower.startsWith('mailing ') ||
              lower.startsWith('público ') ||
              lower.startsWith('publico ') ||
              lower.startsWith('lote ')) &&
            !knownTagKeywords.has(lower)
          ) {
            dynamicTagCounts.set(trimmed, (dynamicTagCounts.get(trimmed) || 0) + 1);
          }
        }
      }
    }
  }

  const dynamicTagAudiences: MarketingAudiencePreset[] = [];
  dynamicTagCounts.forEach((count, tag) => {
    if (count >= 1) {
      const preset: MarketingAudiencePreset = {
        id: `dyn_tag_${tag.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        name: `🎯 ${normalizeAudienceDisplayName(tag)}`,
        leadCount: count,
        filters: {
          tagKeyword: tag,
        },
      };
      preset.ownerKey = classifyAudienceOwner(preset);
      dynamicTagAudiences.push(preset);
    }
  });

  const allCombined = [
    ...Array.from(customAudiencesMap.values()),
    ...dynamicTagAudiences,
    ...ALL_STRATEGIC_AUDIENCES,
  ];

  if (filterOwnerKey && filterOwnerKey !== 'all') {
    return allCombined.filter(a => (a.ownerKey || classifyAudienceOwner(a)) === filterOwnerKey);
  }

  return allCombined;
}
