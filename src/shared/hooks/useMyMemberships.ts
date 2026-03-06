import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/supabase/client';
import type { UserMembership } from '@/shared/types/coreCommon';
import { useRole } from '@/app/providers/RoleProvider';

export interface MembershipsData {
    memberships: UserMembership[];
}

export function useMyMemberships() {
    const { user } = useAuth();
    const { role: globalRole } = useRole();

    return useQuery({
        queryKey: ['my_memberships', user?.id, globalRole],
        queryFn: async (): Promise<MembershipsData> => {
            if (!user) return { memberships: [] };

            // If user is super_admin, they have access to ALL active companies as an 'admin'
            if (globalRole === 'super_admin') {
                const { data: allEmpresas, error: empresasError } = await supabase
                    .schema('core_common')
                    .from('empresas')
                    .select('id')
                    .eq('is_active', true);

                if (empresasError) {
                    console.warn('Failed to fetch companies for super admin.', empresasError);
                    return { memberships: [] };
                }

                const syntheticMemberships: UserMembership[] = (allEmpresas || []).map(e => ({
                    empresa_id: e.id,
                    role: 'admin',
                    is_active: true
                }));

                return { memberships: syntheticMemberships };
            }

            // Normal flow for non-super_admins
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
        enabled: !!user && globalRole !== undefined, // verify global role is loaded before querying
        staleTime: 5 * 60 * 1000,
    });
}
