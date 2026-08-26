import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { getProfile } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { session, user, profile, isLoading, setSession, setProfile, setLoading, clear } =
    useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Get Session Error:', error);
        alert(`Erro de Sessão: ${error.message}`);
      }
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event, session ? 'Has Session' : 'No Session');
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        clear();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      setProfile(profile);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      // Fallback: tenta construir profile mínimo a partir dos metadados do JWT
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          // Monta um profile parcial para não bloquear o app
          setProfile({
            id: user.id,
            org_id: meta.org_id ?? null,
            full_name: meta.full_name ?? user.email ?? null,
            email: user.email ?? null,
            role: meta.role ?? 'admin',
            avatar_url: meta.avatar_url ?? null,
            created_at: user.created_at,
            updated_at: user.updated_at ?? user.created_at,
          } as any);
          console.warn('Profile carregado via user_metadata (fallback)');
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback de profile também falhou:', fallbackErr);
      }
      alert(`Aviso: Falha ao buscar perfil: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    profile,
    isLoading,
    isAuthenticated: !!session,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'admin' || profile?.role === 'editor',
  };
};
