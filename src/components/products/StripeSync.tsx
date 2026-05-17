import { useState } from 'react';
import { Product } from '../../types/admin';

interface StripeSyncProps {
  product: Product;
  onSyncComplete?: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function StripeSync({ product, onSyncComplete }: StripeSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/stripe/sync-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          name: product.title,
          description: product.description,
          price: product.price,
          images: product.cover_url ? [product.cover_url] : [],
          metadata: {
            category_id: product.category_id,
            tags: product.tags.join(','),
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync product');
      }

      setSuccess(true);
      
      // Call callback after successful sync
      if (onSyncComplete) {
        onSyncComplete();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with Stripe');
    } finally {
      setSyncing(false);
    }
  };

  // Check if product is already synced
  const isSynced = !!(product.stripe_product_id && product.stripe_price_id);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
          transition-colors duration-200
          ${
            isSynced
              ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }
          ${syncing ? 'opacity-50 cursor-not-allowed' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={isSynced ? 'Re-sincronizar com Stripe' : 'Sincronizar com Stripe'}
      >
        {syncing ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Sincronizando...</span>
          </>
        ) : (
          <>
            {isSynced ? (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Sincronizado</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>Sincronizar com Stripe</span>
              </>
            )}
          </>
        )}
      </button>

      {/* Success Message */}
      {success && (
        <div className="inline-flex items-center gap-1 text-sm text-green-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Sincronizado!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="inline-flex items-center gap-1 text-sm text-red-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
