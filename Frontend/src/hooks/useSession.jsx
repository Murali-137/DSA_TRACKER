import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../supabase';
import { api } from '../api';

const SessionContext = createContext({
  session: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
  syncAndLoadProfile: async () => {},
});

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch verified profile from backend API (uses Service Role, immune to RLS)
  const syncAndLoadProfile = useCallback(async (currentSession, overrideRole = null) => {
    if (!currentSession?.user) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const user = currentSession.user;
      // 1. Sync profile with backend
      const syncRes = await api.post('/signup', {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        role: overrideRole || undefined,
      });

      const loadedProfile = syncRes.data?.user || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role || 'user',
      };

      setProfile(loadedProfile);
      setLoading(false);
      return loadedProfile;
    } catch (err) {
      console.warn('Profile sync notice:', err);
      try {
        const { data: dbProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (dbProfile) {
          setProfile(dbProfile);
          setLoading(false);
          return dbProfile;
        }
      } catch {}

      const fallback = {
        id: currentSession.user.id,
        email: currentSession.user.email,
        full_name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0],
        avatar_url: currentSession.user.user_metadata?.avatar_url,
        role: currentSession.user.user_metadata?.role || 'user',
      };
      setProfile(fallback);
      setLoading(false);
      return fallback;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession) {
        await syncAndLoadProfile(currentSession);
      } else {
        setProfile(null);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [syncAndLoadProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          if (currentSession) {
            await syncAndLoadProfile(currentSession);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        if (currentSession) {
          await syncAndLoadProfile(currentSession);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [syncAndLoadProfile]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setSession(null);
    setProfile(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  return (
    <SessionContext.Provider value={{ session, profile, loading, logout, refreshSession, syncAndLoadProfile }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);

export default useSession;

