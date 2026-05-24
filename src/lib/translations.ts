import { supabaseAdmin } from './supabase-admin';
import { uploadFile, STORAGE_BUCKETS } from './storage';
import { AppLocale, ProductTranslationFields } from '../types/locale';

export async function upsertProductTranslations(
  productId: string,
  translations: Partial<Record<AppLocale, ProductTranslationFields>>
) {
  for (const [lang, fields] of Object.entries(translations) as [AppLocale, ProductTranslationFields][]) {
    if (!fields?.title?.trim()) continue;

    let coverUrl = fields.cover_url;
    let previewUrl = fields.preview_url;
    let storageUrl = fields.storage_url;

    if (fields.cover_file) {
      const path = `${productId}/${lang}/${fields.cover_file.name}`;
      coverUrl = await uploadFile(STORAGE_BUCKETS.PRODUCT_COVERS.name, path, fields.cover_file);
    }
    if (fields.preview_file) {
      const path = `${productId}/${lang}/${fields.preview_file.name}`;
      previewUrl = await uploadFile(STORAGE_BUCKETS.PRODUCT_PREVIEWS.name, path, fields.preview_file);
    }
    if (fields.product_file) {
      const path = `${productId}/${lang}/${fields.product_file.name}`;
      storageUrl = await uploadFile(STORAGE_BUCKETS.EBOOKS_PRIVATE.name, path, fields.product_file);
    }

    const { error } = await supabaseAdmin.from('products_translations').upsert({
      product_id: productId,
      language: lang,
      title: fields.title,
      subtitle: fields.subtitle || null,
      description: fields.description,
      content: fields.content || null,
      cta_text: fields.cta_text || 'Comprar Agora',
      category_name: fields.category_name || null,
      cover_url: coverUrl,
      preview_url: previewUrl,
      storage_url: storageUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product_id,language' });

    if (error) throw error;
  }
}

export async function loadProductTranslations(productId: string) {
  const { data, error } = await supabaseAdmin
    .from('products_translations')
    .select('*')
    .eq('product_id', productId);
  if (error) throw error;
  return data || [];
}
