import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface CountryTaxParameters {
  id: string;
  country_id: string;
  ss_employer_rate: number;
  ss_employee_rate: number;
  ss_use_total: boolean;
  destacado_base_salary: number;
}

export function useCountryTaxParameters() {
  return useQuery<CountryTaxParameters[]>({
    queryKey: ['country-tax-parameters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('country_tax_parameters')
        .select('*');

      if (error) throw error;
      return data as CountryTaxParameters[];
    },
  });
}

export function useMutateCountryTaxParameters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      country_id: string;
      ss_employer_rate: number;
      ss_employee_rate: number;
      ss_use_total: boolean;
      destacado_base_salary: number;
    }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('country_tax_parameters')
        .upsert(payload, { onConflict: 'country_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-tax-parameters'] });
    }
  });
}

