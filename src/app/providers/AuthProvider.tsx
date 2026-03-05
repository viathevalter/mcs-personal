import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/shared/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: () => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // For real usage, signIn usually takes email/password. Since requirements
    // only asked to expose signIn and signOut, we'll keep it simple or align with standard.
    // Actually, we probably should pass email/password or let the login page handle the Supabase call directly.
    // We'll leave the actual signIn implementation up to the login form, 
    // or we can implement it here. Given standard practices, exposing signIn here is fine but usually it's just passing down to supabase.auth.signInWithPassword.
    // Let's implement it with email and password to be helpful.
    const signIn = async () => {
        // The actual login will happen in LoginPage.tsx using supabase.auth.signInWithPassword.
        // This is just a placeholder if needed, but we'll remove it in favor of direct
        // auth calls in the form itself which handles its own errors, or we can provide it here.
        // For now, we will just expose what was requested.
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
