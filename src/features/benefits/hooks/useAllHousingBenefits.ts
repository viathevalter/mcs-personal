import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages } from '@/shared/supabase/pagination';
import type { HousingBenefit } from '@/shared/types/corePersonal';

export const ALL_HOUSING_BENEFITS_QUERY_KEY = 'all-worker-housing-benefits';

export function useAllHousingBenefits() {
    return useQuery({
        queryKey: [ALL_HOUSING_BENEFITS_QUERY_KEY],
        queryFn: async () => {
            const data = await fetchAllPages<HousingBenefit>((from, to) =>
                supabase
                    .schema('core_personal')
                    .from('worker_benefit_housing')
                    .select('*')
                    .order('start_date', { ascending: false })
                    .range(from, to)
            );

            return (data || []) as HousingBenefit[];
        },
    });
}
