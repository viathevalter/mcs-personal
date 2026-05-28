import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export interface SpainProvince {
  codigo: string;
  pais: string;
  provincia: string;
  valor_dia: number;
  coste_envio: number;
}

export function useSpainProvinces() {
  return useQuery<SpainProvince[]>({
    queryKey: ['spain-provinces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('spain_provinces')
        .select('*')
        .order('provincia');

      if (error) throw error;
      return data as SpainProvince[];
    },
  });
}
