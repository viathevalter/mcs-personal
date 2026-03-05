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

            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

            if (error) {
                console.error("Error fetching user role:", error);
                // Default to visualizador or null if there is an error
                setRole('visualizador');
            } else if (data) {
                setRole(data.role as AppRole);
            } else {
                setRole('visualizador');
            }
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
