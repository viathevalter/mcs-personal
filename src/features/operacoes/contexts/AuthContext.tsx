import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User as AuthUser, Session } from '@supabase/supabase-js';

// Extend the user type to include our profile data
export interface User extends AuthUser {
    profile?: {
        role: 'admin' | 'user' | 'manager' | 'super_admin';
        department_id?: string;
        full_name?: string;
        avatar_url?: string;
        managed_departments?: string[];
    };
    // Helper to check roles
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const userRef = React.useRef<User | null>(null);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session?.user) {
                // If it's just a token refresh and the user is already loaded, do NOT reset loading or refetch
                if (event === 'TOKEN_REFRESHED' && userRef.current?.id === session.user.id) {
                    return;
                }
                // If user changed or not yet loaded
                if (!userRef.current || userRef.current.id !== session.user.id) {
                    fetchProfile(session.user);
                }
            } else {
                userRef.current = null;
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (authUser: AuthUser) => {
        try {
            // 1. Buscar do user_roles (especialmente para super_admin)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', authUser.id)
                .maybeSingle();

            // 2. Buscar do mcs_users (para dados adicionais de cadastro de usuários das operações)
            const { data: mcsUser } = await supabase
                .from('mcs_users')
                .select('role, department_id, display_name, email, managed_departments')
                .eq('id', authUser.id)
                .maybeSingle();

            const role = roleData?.role || mcsUser?.role || 'user';

            // Merge auth user with profile data
            const fullUser: User = {
                ...authUser,
                profile: {
                    role: role as 'admin' | 'user' | 'manager' | 'super_admin',
                    department_id: mcsUser?.department_id || undefined,
                    full_name: mcsUser?.display_name || authUser.email?.split('@')[0] || 'User',
                    managed_departments: mcsUser?.managed_departments || [],
                },
                isAdmin: role === 'admin' || role === 'super_admin' || role === 'admin_rh' || role === 'operador',
                isSuperAdmin: role === 'super_admin',
            };

            userRef.current = fullUser;
            setUser(fullUser);
        } catch (err) {
            console.error('AuthContext: Unexpected error fetching profile:', err);
            const fallbackUser = { ...authUser, isAdmin: false, isSuperAdmin: false };
            userRef.current = fallbackUser;
            setUser(fallbackUser);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async () => {
        console.log('SignIn triggered - implement login UI');
    };

    const signOut = async () => {
        sessionStorage.clear();
        await supabase.auth.signOut();
        userRef.current = null;
        setUser(null);
    };

    const refreshProfile = async () => {
        if (session?.user) {
            await fetchProfile(session.user);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
