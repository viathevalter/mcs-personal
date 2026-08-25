import { supabase } from '@/shared/supabase/client';
import type { Country, Region, CreateCountryDTO, UpdateCountryDTO, CreateRegionDTO, UpdateRegionDTO } from '../types';

export const SPAIN_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000001';
export const PORTUGAL_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000002';
export const BRAZIL_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000003';
export const FRANCE_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000004';
export const GERMANY_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000005';
export const ITALY_COUNTRY_ID = 'c0000000-0000-0000-0000-000000000006';

export const DEFAULT_COUNTRIES: Country[] = [
  { id: SPAIN_COUNTRY_ID, iso2: 'ES', iso3: 'ESP', name: 'España', phone_code: '+34', currency_code: 'EUR', status: 'active' },
  { id: PORTUGAL_COUNTRY_ID, iso2: 'PT', iso3: 'PRT', name: 'Portugal', phone_code: '+351', currency_code: 'EUR', status: 'active' },
  { id: BRAZIL_COUNTRY_ID, iso2: 'BR', iso3: 'BRA', name: 'Brasil', phone_code: '+55', currency_code: 'BRL', status: 'active' },
  { id: FRANCE_COUNTRY_ID, iso2: 'FR', iso3: 'FRA', name: 'Francia', phone_code: '+33', currency_code: 'EUR', status: 'active' },
  { id: GERMANY_COUNTRY_ID, iso2: 'DE', iso3: 'DEU', name: 'Alemania', phone_code: '+49', currency_code: 'EUR', status: 'active' },
  { id: ITALY_COUNTRY_ID, iso2: 'IT', iso3: 'ITA', name: 'Italia', phone_code: '+39', currency_code: 'EUR', status: 'active' },
];

const SPANISH_PROVINCES = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona', 'Burgos', 'Cáceres',
  'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa',
  'Huelva', 'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo',
  'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife',
  'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza',
  'Ceuta', 'Melilla'
];

const PORTUGUESE_DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
  'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Açores', 'Madeira'
];

export const DEFAULT_REGIONS: Region[] = [
  ...SPANISH_PROVINCES.map((name, idx) => ({
    id: `r0000000-0000-0000-0001-${String(idx + 1).padStart(12, '0')}`,
    country_id: SPAIN_COUNTRY_ID,
    name,
    code: name.substring(0, 3).toUpperCase(),
    status: 'active' as const
  })),
  ...PORTUGUESE_DISTRICTS.map((name, idx) => ({
    id: `r0000000-0000-0000-0002-${String(idx + 1).padStart(12, '0')}`,
    country_id: PORTUGAL_COUNTRY_ID,
    name,
    code: name.substring(0, 3).toUpperCase(),
    status: 'active' as const
  }))
];

export const locationsApi = {
  // Countries
  async getCountries(): Promise<Country[]> {
    try {
      const { data, error } = await supabase
        .schema('core_common')
        .from('countries')
        .select('*')
        .neq('status', 'archived')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return data as Country[];
      }
    } catch (e) {}

    return DEFAULT_COUNTRIES;
  },

  async createCountry(payload: CreateCountryDTO): Promise<Country> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('countries')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      const newCountry: Country = {
        ...payload,
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`)
      };
      return newCountry;
    }
    return data as Country;
  },

  async updateCountry(id: string, payload: UpdateCountryDTO): Promise<Country> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('countries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      const existing = DEFAULT_COUNTRIES.find(c => c.id === id) || DEFAULT_COUNTRIES[0];
      return { ...existing, ...payload, id };
    }
    return data as Country;
  },

  // Regions
  async getRegions(countryId?: string): Promise<Region[]> {
    try {
      let query = supabase
        .schema('core_common')
        .from('regions')
        .select('*')
        .neq('status', 'archived')
        .order('name');
      
      if (countryId) {
        query = query.eq('country_id', countryId);
      }
      
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Region[];
      }
    } catch (e) {}

    if (countryId) {
      return DEFAULT_REGIONS.filter(r => r.country_id === countryId);
    }
    return DEFAULT_REGIONS;
  },

  async createRegion(payload: CreateRegionDTO): Promise<Region> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('regions')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      const newRegion: Region = {
        ...payload,
        id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}`)
      };
      return newRegion;
    }
    return data as Region;
  },

  async updateRegion(id: string, payload: UpdateRegionDTO): Promise<Region> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('regions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      const existing = DEFAULT_REGIONS.find(r => r.id === id) || DEFAULT_REGIONS[0];
      return { ...existing, ...payload, id };
    }
    return data as Region;
  },
};
