import { ensureValidSession, getDataClient } from './supabase-admin';

const RETRYABLE_CODES = new Set([
  'PGRST301',
  'PGRST302',
  'PGRST303',
  '57014',
  '57P01',
  '08006',
  '08001',
  '08P01',
]);

const RETRYABLE_MESSAGE_FRAGMENTS = [
  'fetch failed',
  'network',
  'timeout',
  'Failed to fetch',
  'JWT expired',
  'Invalid JWT',
  'session',
];

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  context?: string;
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code: string }).code) : '';
  if (RETRYABLE_CODES.has(code)) return true;

  const message = 'message' in error ? String((error as { message: string }).message) : '';
  const lower = message.toLowerCase();
  return RETRYABLE_MESSAGE_FRAGMENTS.some((fragment) =>
    lower.includes(fragment.toLowerCase())
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${context}: request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Runs a Supabase operation with session refresh, retries, and timeout.
 */
type SupabaseResult<T> = { data: T | null; error: unknown };

export async function executeWithRetry<T>(
  operation: () => PromiseLike<SupabaseResult<T>>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    timeoutMs = 30000,
    context = 'supabase-request',
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const sessionOk = await ensureValidSession();
    if (!sessionOk && attempt === 1) {
      console.warn(`[${context}] session refresh failed before request`);
    }

    try {
      const result = await withTimeout(operation(), timeoutMs, context);

      if (!result.error) {
        if (result.data === null) {
          throw new Error(`${context}: no data returned`);
        }
        return result.data;
      }

      lastError = result.error;

      if (!isRetryableError(result.error) || attempt === maxAttempts) {
        const message =
          result.error &&
          typeof result.error === 'object' &&
          'message' in result.error
            ? String((result.error as { message: string }).message)
            : 'Unknown error';
        console.error(`[${context}] failed (attempt ${attempt}):`, result.error);
        throw new Error(`${context}: ${message}`);
      }

      console.warn(`[${context}] retryable error (attempt ${attempt}):`, result.error);
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        console.error(`[${context}] exception (attempt ${attempt}):`, error);
        throw error instanceof Error ? error : new Error(String(error));
      }

      console.warn(`[${context}] retrying after exception (attempt ${attempt}):`, error);
    }

    await delay(baseDelayMs * attempt);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Lightweight ping for heartbeat */
export async function pingDatabase(): Promise<boolean> {
  try {
    const { error } = await getDataClient()
      .from('categories')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
