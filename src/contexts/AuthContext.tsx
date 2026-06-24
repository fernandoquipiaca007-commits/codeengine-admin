import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { getAuthClient, getDataClient } from '../lib/supabase-admin';

interface AdminUser {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor';
  permissions: {
    can_publish?: boolean;
    can_delete?: boolean;
    can_manage_users?: boolean;
    can_edit_products?: boolean;
    can_manage_coupons?: boolean;
    can_manage_news?: boolean;
    can_access_analytics?: boolean;
    can_manage_settings?: boolean;
  };
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingAdminRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const authClient = getAuthClient();
  const dataClient = getDataClient();

  async function loadAdminUser(authUserId: string, force = false) {
    if (loadingAdminRef.current) return;
    if (!force && loadedUserIdRef.current === authUserId) {
      setLoading(false);
      return;
    }

    loadingAdminRef.current = true;

    try {
      const { data, error } = await dataClient
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('active', true)
        .single();

      if (error) {
        console.error('[auth] Error loading admin user:', error);
        setAdminUser(null);
        loadedUserIdRef.current = null;
      } else {
        setAdminUser(data);
        loadedUserIdRef.current = authUserId;

        await dataClient
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);
      }
    } catch (error) {
      console.error('[auth] Error loading admin user:', error);
      setAdminUser(null);
      loadedUserIdRef.current = null;
    } finally {
      loadingAdminRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    authClient.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[auth] getSession error:', error);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        void loadAdminUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!mounted) return;

      if (import.meta.env.DEV) {
        console.log('[auth] state change:', event);
      }

      setUser(session?.user ?? null);

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        return;
      }

      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          setLoading(true);
          await loadAdminUser(session.user.id);
        }
      } else {
        setAdminUser(null);
        loadedUserIdRef.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setLoading(true);
        await loadAdminUser(data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    await authClient.auth.signOut();
    setUser(null);
    setAdminUser(null);
    loadedUserIdRef.current = null;
  }

  function hasPermission(permission: string): boolean {
    if (!adminUser) return false;
    if (adminUser.role === 'owner') return true;
    return adminUser.permissions[permission as keyof typeof adminUser.permissions] === true;
  }

  function isOwner(): boolean {
    return adminUser?.role === 'owner';
  }

  function isAdmin(): boolean {
    return adminUser !== null && adminUser.active;
  }

  const value = {
    user,
    adminUser,
    loading,
    signIn,
    signOut,
    hasPermission,
    isOwner,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
