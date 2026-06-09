import { getDataClient } from './supabase-admin';
import { executeWithRetry } from './supabase-request';
import { uploadFile, STORAGE_BUCKETS } from './storage';

export interface FeaturedProductRow {
  id: string;
  product_id: string;
  order_position: number;
  custom_title: string | null;
  custom_subtitle: string | null;
  custom_description: string | null;
  custom_cover: string | null;
  custom_cta: string | null;
  active: boolean;
  products?: { id: string; title: string; cover_url: string; status: string };
}

export interface FeaturedProductInput {
  product_id: string;
  order_position: number;
  custom_title?: string;
  custom_subtitle?: string;
  custom_description?: string;
  custom_cover?: string;
  custom_cta?: string;
  active?: boolean;
}

export async function fetchFeaturedProducts() {
  return executeWithRetry(async () => {
    const supabase = getDataClient();
    return supabase
      .from('featured_products')
      .select('*, products(id, title, cover_url, status)')
      .order('order_position', { ascending: true });
  });
}

export async function upsertFeaturedProduct(input: FeaturedProductInput & { id?: string }) {
  return executeWithRetry(async () => {
    const supabase = getDataClient();
    const payload = {
      product_id: input.product_id,
      order_position: input.order_position,
      custom_title: input.custom_title || null,
      custom_subtitle: input.custom_subtitle || null,
      custom_description: input.custom_description || null,
      custom_cover: input.custom_cover || null,
      custom_cta: input.custom_cta || null,
      active: input.active ?? true,
    };

    if (input.id) {
      return supabase.from('featured_products').update(payload).eq('id', input.id).select().single();
    }
    return supabase.from('featured_products').insert(payload).select().single();
  });
}

export async function uploadFeaturedCover(productId: string, file: File) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `featured/${productId}/${Date.now()}_cover.${ext}`;
  return uploadFile(STORAGE_BUCKETS.PRODUCT_COVERS.name, path, file);
}

export async function deleteFeaturedProduct(id: string) {
  return executeWithRetry(async () => {
    const supabase = getDataClient();
    return supabase.from('featured_products').delete().eq('id', id);
  });
}

export interface FeaturedProductTranslationInput {
  featured_id: string;
  language: 'pt' | 'en' | 'fr';
  custom_title?: string | null;
  custom_subtitle?: string | null;
  custom_description?: string | null;
  custom_cta?: string | null;
}

export async function fetchFeaturedProductTranslations(featuredId: string) {
  return executeWithRetry(async () => {
    const supabase = getDataClient();
    return supabase
      .from('featured_product_translations')
      .select('*')
      .eq('featured_id', featuredId);
  });
}

export async function upsertFeaturedProductTranslations(
  featuredId: string,
  translations: Array<{
    language: 'en' | 'fr';
    custom_title?: string | null;
    custom_subtitle?: string | null;
    custom_description?: string | null;
    custom_cta?: string | null;
  }>
) {
  return executeWithRetry<any>(async () => {
    const supabase = getDataClient();
    for (const tr of translations) {
      const payload = {
        featured_id: featuredId,
        language: tr.language,
        custom_title: tr.custom_title || null,
        custom_subtitle: tr.custom_subtitle || null,
        custom_description: tr.custom_description || null,
        custom_cta: tr.custom_cta || null,
      };

      const { error } = await supabase
        .from('featured_product_translations')
        .upsert(payload, { onConflict: 'featured_id,language' });
      if (error) throw error;
    }
    return { data: true, error: null };
  });
}
