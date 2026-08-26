import { supabase } from './supabaseClient';
import { TablesInsert } from '../types/database.types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// ---- Auth ----

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName: string,
  orgId: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, org_id: orgId, role: 'admin' },
    },
  });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const isWeb = Platform.OS === 'web';
  const redirectUrl = isWeb ? undefined : AuthSession.makeRedirectUri({
    scheme: 'surveyapp',
    path: 'auth/callback'
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectUrl ? { redirectTo: redirectUrl } : {}),
      queryParams: { access_type: 'offline', prompt: 'consent' },
      skipBrowserRedirect: !isWeb, // Handle native manually
    },
  });

  if (error) throw error;
  
  if (Platform.OS !== 'web' && data?.url) {
    // Abre a janela de login nativa segura
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (res.type === 'success' && res.url) {
      // Cria a sessão a partir da URL retornada com o token
      // Avoid `new URL()` in React Native which crashes on custom schemes
      const hashOrQuery = res.url.split('#')[1] || res.url.split('?')[1] || '';
      const params: Record<string, string> = {};
      hashOrQuery.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) params[key] = decodeURIComponent(value);
      });
      
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'surveyapp://auth/reset-password',
  });
  if (error) throw error;
};

// ---- Profile ----

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<TablesInsert<'profiles'>>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ---- Organization ----

export const getOrganization = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return data;
};

export const createOrganization = async (name: string, slug: string) => {
  const { data, error } = await supabase
    .rpc('create_organization_for_signup', { p_name: name, p_slug: slug })
    .single();
  if (error) throw error;
  return data as { id: string; name: string; slug: string };
};
