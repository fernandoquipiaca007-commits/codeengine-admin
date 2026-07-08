import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key-to-prevent-startup-crash';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables are missing! ' +
    'The admin panel will load but database operations will fail until these are configured in Vercel settings.'
  );
}

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

/**
 * Singleton for authentication (anon key + session persistence).
 * This client is used for both authentication and data operations,
 * relying on Row Level Security (RLS) for security.
 */
export function getAuthClient(): SupabaseClient {
  if (!authClientInstance) {
    authClientInstance = createClient(supabaseUrl, supabaseAnonKey, authClientOptions);
  }
  return authClientInstance;
}

/**
 * Singleton for data operations.
 * Refactored to use the authenticated anon client to enforce RLS.
 */
export function getDataClient(): SupabaseClient {
  return getAuthClient();
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

/**
 * Handles Supabase errors by logging the original error and throwing
 * a sanitized error message to prevent sensitive information leakage.
 */
export function handleSupabaseError(error: unknown, context: string): never {
  console.error(`[supabase] ${context}:`, error);
  // Throw a generic message to the frontend while logging detail to the console for admins
  throw new Error('An error occurred while processing your request. Please try again later.');
}

export type { SupabaseClient };
