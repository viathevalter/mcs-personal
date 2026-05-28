import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface LodgingRate {
  id: string;
  country_id: string;
  region_id: string | null;
  rate_per_day: number;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useLodgingRates() {
  return useQuery<LodgingRate[]>({
    queryKey: ['lodging-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lodging_rates')
        .select('*');

      if (error) throw error;
      return data as LodgingRate[];
    },
  });
}

export function useMutateLodgingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ country_id, rate_per_day }: { country_id: string; rate_per_day: number }) => {
      // Safe upsert logic to handle nullable region_id unique constraints
      const { data: existing } = await supabase
        .schema('core_comercial')
        .from('lodging_rates')
        .select('id')
        .eq('country_id', country_id)
        .is('region_id', null)
        .is('start_date', null)
        .is('end_date', null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('lodging_rates')
          .update({ rate_per_day })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('lodging_rates')
          .insert({ country_id, rate_per_day })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging-rates'] });
    }
  });
}

export function useUpsertLodgingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rate: {
      id?: string;
      country_id: string;
      region_id?: string | null;
      rate_per_day: number;
      start_date?: string | null;
      end_date?: string | null;
      description?: string | null;
    }) => {
      // 1. If id is provided, update
      if (rate.id) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('lodging_rates')
          .update({
            rate_per_day: rate.rate_per_day,
            start_date: rate.start_date || null,
            end_date: rate.end_date || null,
            description: rate.description || null
          })
          .eq('id', rate.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // 2. If it's a base rate (no dates), upsert
      if (!rate.start_date && !rate.end_date) {
        const query = supabase
          .schema('core_comercial')
          .from('lodging_rates')
          .select('id')
          .eq('country_id', rate.country_id)
          .is('start_date', null)
          .is('end_date', null);

        if (rate.region_id) {
          query.eq('region_id', rate.region_id);
        } else {
          query.is('region_id', null);
        }

        const { data: existing, error: findError } = await query.maybeSingle();
        if (findError) throw findError;

        if (existing) {
          const { data, error } = await supabase
            .schema('core_comercial')
            .from('lodging_rates')
            .update({ rate_per_day: rate.rate_per_day })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      }

      // 3. Insert new record (seasonal rate, or brand new base rate)
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lodging_rates')
        .insert({
          country_id: rate.country_id,
          region_id: rate.region_id || null,
          rate_per_day: rate.rate_per_day,
          start_date: rate.start_date || null,
          end_date: rate.end_date || null,
          description: rate.description || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging-rates'] });
    }
  });
}

export function useDeleteLodgingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('lodging_rates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging-rates'] });
    }
  });
}
