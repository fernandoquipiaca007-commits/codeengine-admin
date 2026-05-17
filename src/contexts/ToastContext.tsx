import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mapError, logAdminError, type ErrorContext, SUCCESS } from '../lib/error-messages';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  hint?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string, hint?: string) => void;
  showInfo: (title: string, message?: string) => void;
  notifyError: (error: unknown, context?: ErrorContext, scope?: string) => void;
  notifySuccess: (message: keyof typeof SUCCESS | string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => push({ type: 'success', title, message }),
    [push]
  );

  const showError = useCallback(
    (title: string, message?: string, hint?: string) =>
      push({ type: 'error', title, message, hint }),
    [push]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => push({ type: 'info', title, message }),
    [push]
  );

  const notifyError = useCallback(
    (error: unknown, context: ErrorContext = 'generic', scope = 'app') => {
      logAdminError(scope, error);
      const mapped = mapError(error, context);
      push({
        type: 'error',
        title: mapped.title,
        message: mapped.message,
        hint: mapped.hint,
      });
    },
    [push]
  );

  const notifySuccess = useCallback(
    (message: keyof typeof SUCCESS | string) => {
      const text =
        message in SUCCESS ? SUCCESS[message as keyof typeof SUCCESS] : message;
      push({ type: 'success', title: text });
    },
    [push]
  );

  const value = useMemo(
    () => ({
      toasts,
      showSuccess,
      showError,
      showInfo,
      notifyError,
      notifySuccess,
      dismiss,
    }),
    [toasts, showSuccess, showError, showInfo, notifyError, notifySuccess, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-[min(100vw-2rem,380px)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const styles: Record<ToastType, string> = {
    success:
      'border-emerald-400/40 bg-emerald-50/80 text-emerald-950 shadow-emerald-500/10',
    error: 'border-red-400/40 bg-red-50/85 text-red-950 shadow-red-500/10',
    warning: 'border-amber-400/40 bg-amber-50/85 text-amber-950 shadow-amber-500/10',
    info: 'border-indigo-400/40 bg-indigo-50/85 text-indigo-950 shadow-indigo-500/10',
  };

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'i',
  };

  return (
    <div
      role="alert"
      className={`relative pointer-events-auto toast-enter rounded-2xl border backdrop-blur-xl p-4 shadow-xl ${styles[toast.type]}`}
    >
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60 text-sm font-bold">
          {icons[toast.type]}
        </span>
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-semibold text-sm leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90 leading-relaxed">{toast.message}</p>
          )}
          {toast.hint && (
            <p className="text-xs mt-2 opacity-75 leading-relaxed">{toast.hint}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 text-current/50 hover:text-current text-lg leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return ctx;
}
