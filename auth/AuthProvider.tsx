import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        // If supabase is null (offline mode), this will just fail gracefully or needs check
        if (!supabase) {
            console.warn('[DEBUG] Supabase client is null. Offline mode?');
            setLoading(false);
            return;
        }

        console.log('[DEBUG] AuthProvider: Fetching session...');
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[DEBUG] AuthProvider: Session fetched:', session ? 'Found' : 'Not found');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch((error: Error) => {
            console.error('Failed to get Supabase session:', error);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
