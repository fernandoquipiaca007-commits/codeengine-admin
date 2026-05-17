// ============================================
// STRIPE SYNC SERVICE (Admin)
// ============================================
// Automatically sync products with Stripe when created/updated

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ProductStripeData {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_url: string;
  discount_percentage?: number;
  original_price?: number;
}

/**
 * Sync product with Stripe (create product and price)
 */
export async function syncProductWithStripe(
  product: ProductStripeData
): Promise<{
  success: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/stripe/sync-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        name: product.title,
        description: product.description,
        price: product.price,
        images: [product.cover_url],
        metadata: {
          supabase_product_id: product.id,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to sync with Stripe');
    }

    return {
      success: true,
      stripeProductId: data.stripeProductId,
      stripePriceId: data.stripePriceId,
    };
  } catch (error) {
    console.error('Error syncing with Stripe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update Stripe product
 */
export async function updateStripeProduct(
  stripeProductId: string,
  updates: {
    name?: string;
    description?: string;
    images?: string[];
    active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/stripe/update-product`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripeProductId,
        updates,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update Stripe product');
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating Stripe product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create Stripe coupon
 */
export async function createStripeCoupon(couponData: {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxRedemptions?: number;
  expiresAt?: Date;
}): Promise<{
  success: boolean;
  stripeCouponId?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/stripe/create-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: couponData.code,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        maxRedemptions: couponData.maxRedemptions,
        expiresAt: couponData.expiresAt
          ? Math.floor(couponData.expiresAt.getTime() / 1000)
          : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create Stripe coupon');
    }

    return {
      success: true,
      stripeCouponId: data.stripeCouponId,
    };
  } catch (error) {
    console.error('Error creating Stripe coupon:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate coupon code
 */
export async function validateCouponCode(
  code: string
): Promise<{
  success: boolean;
  valid?: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/stripe/validate-coupon?code=${encodeURIComponent(code)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to validate coupon');
    }

    return {
      success: true,
      valid: data.valid,
      discountType: data.discountType,
      discountValue: data.discountValue,
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
