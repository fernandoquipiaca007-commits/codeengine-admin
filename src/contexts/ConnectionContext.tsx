import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import {
  checkConnection,
  ensureValidSession,
  getAuthClient,
  type ConnectionHealth,
} from '../lib/supabase-admin';
import { pingDatabase } from '../lib/supabase-request';

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

interface ConnectionContextType {
  status: ConnectionHealth;
  lastError: string | null;
  isRecovering: boolean;
  recoverConnection: () => Promise<boolean>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionHealth>('connected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runHealthCheck = useCallback(async (): Promise<boolean> => {
    const auth = getAuthClient();
    const { data: { session } } = await auth.auth.getSession();
    if (!session) {
      return true;
    }

    const sessionOk = await ensureValidSession();
    if (!sessionOk) {
      setStatus('offline');
      setLastError('Sessão expirada ou inválida');
      return false;
    }

    const dbOk = await pingDatabase();
    if (!dbOk) {
      setStatus('offline');
      setLastError('Não foi possível contactar o banco de dados');
      return false;
    }

    setStatus('connected');
    setLastError(null);
    return true;
  }, []);

  const recoverConnection = useCallback(async (): Promise<boolean> => {
    setIsRecovering(true);
    setStatus('degraded');
    setLastError(null);

    try {
      const auth = getAuthClient();
      const { error: refreshError } = await auth.auth.refreshSession();
      if (refreshError) {
        console.error('[connection] refresh failed:', refreshError);
        setLastError(refreshError.message);
      }

      const ok = await runHealthCheck();
      if (!ok) {
        const fallback = await checkConnection();
        if (fallback) {
          setStatus('connected');
          setLastError(null);
          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro de reconexão';
      setStatus('offline');
      setLastError(message);
      console.error('[connection] recover failed:', error);
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [runHealthCheck]);

  useEffect(() => {
    void runHealthCheck();

    const auth = getAuthClient();
    const {
      data: { subscription },
    } = auth.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (import.meta.env.DEV) {
        console.log('[auth]', event, session?.user?.email ?? 'no user');
      }

      switch (event) {
        case 'TOKEN_REFRESHED':
        case 'SIGNED_IN':
          setStatus('connected');
          setLastError(null);
          break;
        case 'SIGNED_OUT':
          setStatus('offline');
          setLastError('Sessão encerrada');
          break;
        default:
          break;
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void recoverConnection();
      }
    };

    const onOnline = () => {
      void recoverConnection();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    heartbeatRef.current = setInterval(() => {
      void runHealthCheck();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [recoverConnection, runHealthCheck]);

  const value: ConnectionContextType = {
    status,
    lastError,
    isRecovering,
    recoverConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
}
