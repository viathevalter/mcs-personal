import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../shared/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'admin_rh' | 'manager' | 'operador' | 'visualizador' | 'user';

interface RoleContextType {
    role: AppRole | null;
    loadingRole: boolean;
    blockedModules: string[];
    refreshRole: () => Promise<void>;
    canViewModule: (moduleId: string, defaultAllowed?: boolean) => boolean;
    canEditModule: (moduleId: string, defaultCanEdit?: boolean) => boolean;
    canViewFeature: (featureKey: string, defaultAllowed?: boolean) => boolean;
    canEditFeature: (featureKey: string, moduleId?: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<AppRole | null>(null);
    const [blockedModules, setBlockedModules] = useState<string[]>([]);
    const [loadingRole, setLoadingRole] = useState(true);

    const roleRef = React.useRef<AppRole | null>(null);

    const fetchRole = async (isSilent = false) => {
        try {
            if (!isSilent && !roleRef.current) {
                setLoadingRole(true);
            }
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                roleRef.current = null;
                setRole(null);
                setBlockedModules([]);
                setLoadingRole(false);
                return;
            }

            // Fetch mcs_users data (role and blocked_modules)
            const { data: mcsUser } = await supabase
                .from('mcs_users')
                .select('role, blocked_modules')
                .eq('id', session.user.id)
                .maybeSingle();

            if (mcsUser?.blocked_modules) {
                setBlockedModules(mcsUser.blocked_modules);
            } else {
                setBlockedModules([]);
            }

            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (roleData?.role) {
                roleRef.current = roleData.role as AppRole;
                setRole(roleData.role as AppRole);
                setLoadingRole(false);
                return;
            }

            if (mcsUser?.role) {
                roleRef.current = mcsUser.role as AppRole;
                setRole(mcsUser.role as AppRole);
                setLoadingRole(false);
                return;
            }

            roleRef.current = 'visualizador';
            setRole('visualizador');
        } catch (err) {
            console.error("Exception fetching user role:", err);
            roleRef.current = 'visualizador';
            setRole('visualizador');
        } finally {
            setLoadingRole(false);
        }
    };

    useEffect(() => {
        fetchRole(false);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                if (event === 'TOKEN_REFRESHED') {
                    // Do not block UI on token refresh
                    return;
                }
                fetchRole(true);
            } else {
                roleRef.current = null;
                setRole(null);
                setBlockedModules([]);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const canViewModule = React.useCallback((moduleId: string, defaultAllowed = true): boolean => {
        if (role === 'super_admin') return true;
        if (blockedModules.includes(moduleId)) return false;
        if (blockedModules.includes(`mod_view:${moduleId}`) || blockedModules.includes(`mod_allow:${moduleId}`)) {
            return true;
        }
        return defaultAllowed;
    }, [role, blockedModules]);

    const canEditModule = React.useCallback((moduleId: string, defaultCanEdit = true): boolean => {
        if (role === 'super_admin') return true;
        if (blockedModules.includes(moduleId) || blockedModules.includes(`mod_view:${moduleId}`)) {
            return false;
        }
        if (blockedModules.includes(`mod_allow:${moduleId}`)) {
            return true;
        }
        return role !== 'visualizador' && defaultCanEdit;
    }, [role, blockedModules]);

    const canViewFeature = React.useCallback((featureKey: string, defaultAllowed = true): boolean => {
        if (role === 'super_admin') return true;
        if (blockedModules.includes(`hide:${featureKey}`)) return false;
        if (blockedModules.includes(`view:${featureKey}`) || blockedModules.includes(`edit:${featureKey}`)) {
            return true;
        }
        return defaultAllowed;
    }, [role, blockedModules]);

    const canEditFeature = React.useCallback((featureKey: string, moduleId?: string): boolean => {
        if (role === 'super_admin') return true;
        if (blockedModules.includes(`hide:${featureKey}`) || blockedModules.includes(`view:${featureKey}`)) {
            return false;
        }
        if (blockedModules.includes(`edit:${featureKey}`)) {
            return true;
        }
        if (moduleId && (blockedModules.includes(moduleId) || blockedModules.includes(`mod_view:${moduleId}`))) {
            return false;
        }
        return role !== 'visualizador';
    }, [role, blockedModules]);

    return (
        <RoleContext.Provider value={{
            role,
            loadingRole,
            blockedModules,
            refreshRole: fetchRole,
            canViewModule,
            canEditModule,
            canViewFeature,
            canEditFeature
        }}>
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
