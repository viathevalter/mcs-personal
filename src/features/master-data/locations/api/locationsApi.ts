import { supabase } from '@/shared/supabase/client';
import type { Country, Region, CreateCountryDTO, UpdateCountryDTO, CreateRegionDTO, UpdateRegionDTO } from '../types';

export const locationsApi = {
  // Countries
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('countries')
      .select('*')
      .neq('status', 'archived')
      .order('name');
    
    if (error) throw error;
    return data as Country[];
  },

  async createCountry(payload: CreateCountryDTO): Promise<Country> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('countries')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data as Country;
  },

  // Regions
  async getRegions(countryId?: string): Promise<Region[]> {
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
    if (error) throw error;
    return data as Region[];
  },

  async createRegion(payload: CreateRegionDTO): Promise<Region> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('regions')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data as Region;
  },
};
