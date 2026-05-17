import { useConnection } from '../contexts/ConnectionContext';

export function ConnectionBanner() {
  const { status, lastError, recoverConnection, isRecovering } = useConnection();

  if (status === 'connected') {
    return null;
  }

  const isOffline = status === 'offline';

  return (
    <div
      role="alert"
      className={`sticky top-0 z-50 px-4 py-2 text-sm flex flex-wrap items-center justify-center gap-3 ${
        isOffline ? 'bg-red-600 text-white' : 'bg-amber-500 text-amber-950'
      }`}
    >
      <span>
        {isOffline
          ? 'Conexão com o servidor perdida. Suas alterações podem não ser salvas.'
          : 'Reconectando ao Supabase…'}
      </span>
      {lastError && (
        <span className="text-xs opacity-90 max-w-md truncate" title={lastError}>
          {lastError}
        </span>
      )}
      {isOffline && (
        <button
          type="button"
          onClick={() => void recoverConnection()}
          disabled={isRecovering}
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 disabled:opacity-60"
        >
          {isRecovering ? 'Reconectando…' : 'Tentar novamente'}
        </button>
      )}
    </div>
  );
}
