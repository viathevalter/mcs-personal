import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/supabase/client';
import type { UserMembership } from '@/shared/types/coreCommon';

export interface MembershipsData {
    memberships: UserMembership[];
}

export function useMyMemberships() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['my_memberships', user?.id],
        queryFn: async (): Promise<MembershipsData> => {
            if (!user) return { memberships: [] };

            const { data, error } = await supabase
                .schema('core_common')
                .from('user_memberships')
                .select('empresa_id, role, is_active')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) {
                console.warn('Failed to fetch memberships.', error);
                return { memberships: [] };
            }

            return {
                memberships: (data || []) as UserMembership[]
            };
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });
}
