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

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                // Ensure loading stays true until profile is fetched
                fetchProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                // Determine if we need to fetch profile (e.g. if user changed)
                // For simplicity, fetch if we don't have a user or if ID differs
                if (!user || user.id !== session.user.id) {
                    setLoading(true); // BLOCK UI until profile loads
                    fetchProfile(session.user);
                }
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []); // Removed 'user' dependency to avoid loops

    const fetchProfile = async (authUser: AuthUser) => {
        try {
            console.log('AuthContext: Fetching profile for', authUser.email);
            
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

            console.log('AuthContext: Setting user:', fullUser);
            setUser(fullUser);
        } catch (err) {
            console.error('AuthContext: Unexpected error fetching profile:', err);
            // Fallback
            setUser({ ...authUser, isAdmin: false, isSuperAdmin: false });
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
        setUser(null);
    };

    const refreshProfile = async () => {
        if (session?.user) {
            await fetchProfile(session.user);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
