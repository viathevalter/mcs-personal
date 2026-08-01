import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../shared/supabase/client';

type AppRole = 'super_admin' | 'admin_rh' | 'operador' | 'visualizador';

interface RoleContextType {
    role: AppRole | null;
    loadingRole: boolean;
    refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<AppRole | null>(null);
    const [loadingRole, setLoadingRole] = useState(true);

    const fetchRole = async () => {
        try {
            setLoadingRole(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                setRole(null);
                setLoadingRole(false);
                return;
            }

            const superAdminEmails = ['valter@gestaologinpro.com', 'valtencir@gestaologinpro.com', 'joao@gestaologinpro.com', 'angie@gestaologinpro.com', 'thalia@gestaologinpro.com', 'nairelis@gestaologinpro.com', 'kawan@gestaologinpro.com', 'lucia@gestaologinpro.com'];
            if (session.user.email && superAdminEmails.includes(session.user.email.toLowerCase())) {
                setRole('super_admin');
                setLoadingRole(false);
                return;
            }

            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (roleData?.role) {
                setRole(roleData.role as AppRole);
                setLoadingRole(false);
                return;
            }

            const { data: mcsUser } = await supabase
                .from('mcs_users')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

            if (mcsUser?.role) {
                setRole(mcsUser.role as AppRole);
                setLoadingRole(false);
                return;
            }

            setRole('visualizador');
        } catch (err) {
            console.error("Exception fetching user role:", err);
            setRole('visualizador');
        } finally {
            setLoadingRole(false);
        }
    };

    useEffect(() => {
        fetchRole();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchRole();
            } else {
                setRole(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <RoleContext.Provider value={{ role, loadingRole, refreshRole: fetchRole }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
}
