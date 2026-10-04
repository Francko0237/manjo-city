import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) setProfile(data);
    } catch (e) {
      console.error("Erreur récupération profil AuthContext:", e);
    }
  };

  useEffect(() => {
    // Restauration initiale de la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Écouteur global d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
      } else if (currentSession) {
        setSession(currentSession);
        fetchProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        user: session?.user,
        isAdmin: profile?.role === 'admin',
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
