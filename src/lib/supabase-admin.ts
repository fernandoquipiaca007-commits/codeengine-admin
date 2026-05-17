import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

if (!supabaseServiceRoleKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_SERVICE_ROLE_KEY missing — admin data ops use anon client with user session'
  );
}

/** Isolated storage so service-role client never reads/writes auth tokens */
const noopAuthStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const authClientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'codeengine-admin-auth',
  },
  global: {
    headers: {
      'x-client-info': 'codeengine-admin',
    },
  },
};

let authClientInstance: SupabaseClient | null = null;
let dataClientInstance: SupabaseClient | null = null;

/**
 * Singleton for authentication ONLY (anon key + session persistence).
 */
export function getAuthClient(): SupabaseClient {
  if (!authClientInstance) {
    authClientInstance = createClient(supabaseUrl, supabaseAnonKey, authClientOptions);
  }
  return authClientInstance;
}

/**
 * Singleton for database/storage operations (service role when available).
 * Never use .auth on this client.
 */
export function getDataClient(): SupabaseClient {
  if (!dataClientInstance) {
    if (supabaseServiceRoleKey) {
      dataClientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storage: noopAuthStorage,
          storageKey: 'codeengine-admin-service-inert',
        },
        global: {
          headers: {
            'x-client-info': 'codeengine-admin-data',
          },
        },
      });
    } else {
      dataClientInstance = getAuthClient();
    }
  }
  return dataClientInstance;
}

/** @deprecated Use getAuthClient() for auth and getDataClient() for queries */
export const supabase = getAuthClient();

/** Data client — all .from() / storage calls should use this */
export const supabaseAdmin = getDataClient();

export type ConnectionHealth = 'connected' | 'degraded' | 'offline';

export async function ensureValidSession(): Promise<boolean> {
  const auth = getAuthClient();
  const { data: sessionData, error: sessionError } = await auth.auth.getSession();

  if (sessionError) {
    console.error('[supabase] getSession error:', sessionError);
    return false;
  }

  if (sessionData.session) {
    const expiresAt = sessionData.session.expires_at ?? 0;
    const expiresInSec = expiresAt - Math.floor(Date.now() / 1000);
    if (expiresInSec > 120) {
      return true;
    }
  }

  const { data: refreshData, error: refreshError } = await auth.auth.refreshSession();
  if (refreshError) {
    console.error('[supabase] refreshSession error:', refreshError);
    return false;
  }

  return Boolean(refreshData.session);
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client = getDataClient();
    const { error } = await client
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      console.error('[supabase] connection check failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[supabase] connection check exception:', error);
    return false;
  }
}

export function handleSupabaseError(error: unknown, context: string): never {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : 'Unknown error';
  console.error(`[supabase] ${context}:`, error);
  throw new Error(`${context}: ${message}`);
}

export type { SupabaseClient };
