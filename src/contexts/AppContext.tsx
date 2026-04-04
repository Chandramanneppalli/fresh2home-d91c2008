import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'farmer' | 'consumer' | 'admin' | null;

interface AppState {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  userName: string;
  setUserName: (name: string) => void;
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialSessionHydrated = false;

    const syncSessionState = async (currentSession: Session | null) => {
      if (!mounted) return;

      setLoading(true);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        setRole(null);
        setUserName('');
        setLoading(false);
        return;
      }

      const meta = currentSession.user.user_metadata;
      setUserName(meta?.full_name || currentSession.user.email?.split('@')[0] || 'User');

      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentSession.user.id)
          .limit(1);

        if (error) throw error;
        if (!mounted) return;

        if (roles && roles.length > 0) {
          setRole(roles[0].role as UserRole);
        } else {
          setRole((meta?.role as UserRole) || 'consumer');
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        if (mounted) {
          setRole((meta?.role as UserRole) || 'consumer');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      if (event === 'INITIAL_SESSION') {
        if (initialSessionHydrated) return;
        initialSessionHydrated = true;
      }

      setTimeout(() => {
        void syncSessionState(currentSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted || initialSessionHydrated) return;
      initialSessionHydrated = true;
      void syncSessionState(existingSession);
    });

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUserName('');
  };

  const isAuthenticated = !!session;

  return (
    <AppContext.Provider value={{ role, setRole, isAuthenticated, userName, setUserName, user, session, loading, signOut }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
