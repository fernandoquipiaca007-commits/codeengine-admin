import { supabaseAdmin, ensureValidSession } from './supabase-admin';
import { 
  uploadFile, 
  deleteFile, 
  generateProductFilePath, 
  STORAGE_BUCKETS,
  extractStoragePathFromUrl,
  generatePublicUrl
} from './storage';
import { Product } from '../types/admin';
import { ProductFormData } from '../components/products/ProductForm';
import { upsertProductTranslations } from './translations';

export interface CreateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
}

export interface UpdateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
}

/**
 * Create a new product with file uploads
 */
export async function createProduct(formData: ProductFormData): Promise<CreateProductResult> {
  try {
    const sessionOk = await ensureValidSession();
    if (!sessionOk) {
      return { success: false, error: 'Sessão expirada. Reconecte sem sair da página.' };
    }

    // Generate a temporary product ID for file organization
    const tempProductId = crypto.randomUUID();

    // Upload cover image (required)
    if (!formData.cover_file) {
      return { success: false, error: 'Cover image is required' };
    }

    const coverPath = generateProductFilePath(tempProductId, formData.cover_file.name);
    const coverStoragePath = await uploadFile(
      STORAGE_BUCKETS.PRODUCT_COVERS.name,
      coverPath,
      formData.cover_file
    );

    // Upload digital product file (required)
    if (!formData.product_file) {
      return { success: false, error: 'Digital product file is required' };
    }

    const productPath = generateProductFilePath(tempProductId, formData.product_file.name);
    const fileStoragePath = await uploadFile(
      STORAGE_BUCKETS.EBOOKS_PRIVATE.name,
      productPath,
      formData.product_file
    );

    // Upload preview file (optional)
    let previewStoragePath: string | null = null;
    if (formData.preview_file) {
      const previewPath = generateProductFilePath(tempProductId, formData.preview_file.name);
      previewStoragePath = await uploadFile(
        STORAGE_BUCKETS.PRODUCT_PREVIEWS.name,
        previewPath,
        formData.preview_file
      );
    }

    // Upload video file (optional)
    let videoStoragePath: string | null = null;
    if (formData.video_file) {
      const videoPath = generateProductFilePath(tempProductId, formData.video_file.name);
      videoStoragePath = await uploadFile(
        STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
        videoPath,
        formData.video_file
      );
    }

    // Create product record in database
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        price: formData.is_free ? 0 : formData.price,
        stripe_price_id: formData.is_free ? '' : formData.stripe_price_id,
        cover_storage_path: coverStoragePath,
        preview_storage_path: previewStoragePath,
        video_storage_path: videoStoragePath,
        file_storage_path: fileStoragePath,
        // Keep old columns for backward compatibility (will be deprecated)
        cover_url: generatePublicUrl(STORAGE_BUCKETS.PRODUCT_COVERS.name, coverStoragePath),
        preview_url: previewStoragePath ? generatePublicUrl(STORAGE_BUCKETS.PRODUCT_PREVIEWS.name, previewStoragePath) : null,
        video_url: videoStoragePath ? generatePublicUrl(STORAGE_BUCKETS.PRODUCT_VIDEOS.name, videoStoragePath) : null,
        storage_url: fileStoragePath,
        tags: formData.tags,
        cta_text: formData.cta_text,
        status: formData.status,
        product_type: formData.product_type || (formData.is_course_mode ? 'course' : 'file'),
        is_free: formData.is_free ?? false,
        subcategory_id: formData.subcategory_id || null,
        fastpay_link: formData.fastpay_link?.trim() || null,
        visibility: formData.visibility || 'public',
        min_member_level: formData.min_member_level || null,
        access_duration_days: formData.access_duration_days || null,
        use_shared_content: formData.use_shared_content ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      await cleanupProductFiles(
        STORAGE_BUCKETS.PRODUCT_COVERS.name,
        coverStoragePath,
        STORAGE_BUCKETS.PRODUCT_PREVIEWS.name,
        previewStoragePath,
        STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
        videoStoragePath,
        STORAGE_BUCKETS.EBOOKS_PRIVATE.name,
        fileStoragePath
      );
      return { success: false, error: `Failed to create product: ${error.message}` };
    }

    if (formData.translations && data?.id) {
      const translations = { ...formData.translations };
      if (!translations.pt) {
        translations.pt = {
          title: formData.title,
          description: formData.description,
          cta_text: formData.cta_text,
          cover_url: generatePublicUrl(STORAGE_BUCKETS.PRODUCT_COVERS.name, coverStoragePath),
          preview_url: previewStoragePath ? generatePublicUrl(STORAGE_BUCKETS.PRODUCT_PREVIEWS.name, previewStoragePath) : undefined,
          storage_url: fileStoragePath,
        };
      }
      await upsertProductTranslations(data.id, translations);
    }

    return { success: true, product: data };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update an existing product with optional file replacements
 */
export async function updateProduct(
  productId: string,
  formData: ProductFormData,
  existingProduct: Product
): Promise<UpdateProductResult> {
  try {
    const sessionOk = await ensureValidSession();
    if (!sessionOk) {
      return { success: false, error: 'Sessão expirada. Reconecte sem sair da página.' };
    }

    let coverStoragePath = existingProduct.cover_storage_path || existingProduct.cover_url;
    let previewStoragePath = existingProduct.preview_storage_path || existingProduct.preview_url;
    let videoStoragePath = existingProduct.video_storage_path || existingProduct.video_url;
    let fileStoragePath = existingProduct.file_storage_path || existingProduct.storage_url;

    // Upload new cover if provided
    if (formData.cover_file) {
      const coverPath = generateProductFilePath(productId, formData.cover_file.name);
      coverStoragePath = await uploadFile(
        STORAGE_BUCKETS.PRODUCT_COVERS.name,
        coverPath,
        formData.cover_file
      );
      // Delete old cover
      if (existingProduct.cover_storage_path || existingProduct.cover_url) {
        await deleteOldFile(
          existingProduct.cover_storage_path || existingProduct.cover_url, 
          STORAGE_BUCKETS.PRODUCT_COVERS.name
        );
      }
    }

    // Upload new preview if provided
    if (formData.preview_file) {
      const previewPath = generateProductFilePath(productId, formData.preview_file.name);
      previewStoragePath = await uploadFile(
        STORAGE_BUCKETS.PRODUCT_PREVIEWS.name,
        previewPath,
        formData.preview_file
      );
      // Delete old preview
      if (existingProduct.preview_storage_path || existingProduct.preview_url) {
        await deleteOldFile(
          existingProduct.preview_storage_path || existingProduct.preview_url || '', 
          STORAGE_BUCKETS.PRODUCT_PREVIEWS.name
        );
      }
    }

    // Upload new video if provided
    if (formData.video_file) {
      const videoPath = generateProductFilePath(productId, formData.video_file.name);
      videoStoragePath = await uploadFile(
        STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
        videoPath,
        formData.video_file
      );
      // Delete old video
      if (existingProduct.video_storage_path || existingProduct.video_url) {
        await deleteOldFile(
          existingProduct.video_storage_path || existingProduct.video_url || '', 
          STORAGE_BUCKETS.PRODUCT_VIDEOS.name
        );
      }
    }

    // Upload new product file if provided
    if (formData.product_file) {
      const productPath = generateProductFilePath(productId, formData.product_file.name);
      fileStoragePath = await uploadFile(
        STORAGE_BUCKETS.EBOOKS_PRIVATE.name,
        productPath,
        formData.product_file
      );
      // Delete old product file
      if (existingProduct.file_storage_path || existingProduct.storage_url) {
        await deleteOldFile(
          existingProduct.file_storage_path || existingProduct.storage_url, 
          STORAGE_BUCKETS.EBOOKS_PRIVATE.name
        );
      }
    }

    // Update product record in database
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        price: formData.is_free ? 0 : formData.price,
        stripe_price_id: formData.is_free ? '' : formData.stripe_price_id,
        cover_storage_path: coverStoragePath,
        preview_storage_path: previewStoragePath,
        video_storage_path: videoStoragePath,
        file_storage_path: fileStoragePath,
        // Keep old columns for backward compatibility
        cover_url: coverStoragePath.startsWith('http') ? coverStoragePath : generatePublicUrl(STORAGE_BUCKETS.PRODUCT_COVERS.name, coverStoragePath),
        preview_url: previewStoragePath ? (previewStoragePath.startsWith('http') ? previewStoragePath : generatePublicUrl(STORAGE_BUCKETS.PRODUCT_PREVIEWS.name, previewStoragePath)) : null,
        video_url: videoStoragePath ? (videoStoragePath.startsWith('http') ? videoStoragePath : generatePublicUrl(STORAGE_BUCKETS.PRODUCT_VIDEOS.name, videoStoragePath)) : null,
        storage_url: fileStoragePath,
        tags: formData.tags,
        cta_text: formData.cta_text,
        status: formData.status,
        product_type: formData.product_type || (formData.is_course_mode ? 'course' : 'file'),
        is_free: formData.is_free ?? false,
        subcategory_id: formData.subcategory_id || null,
        fastpay_link: formData.fastpay_link?.trim() || null,
        visibility: formData.visibility || 'public',
        min_member_level: formData.min_member_level || null,
        access_duration_days: formData.access_duration_days || null,
        use_shared_content: formData.use_shared_content ?? false,
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: `Failed to update product: ${error.message}` };
    }

    if (formData.translations && data?.id) {
      await upsertProductTranslations(data.id, formData.translations);
    }

    return { success: true, product: data };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete a product and all associated files
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionOk = await ensureValidSession();
    if (!sessionOk) {
      return { success: false, error: 'Sessão expirada. Reconecte sem sair da página.' };
    }

    // Get product details first
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) {
      return { success: false, error: `Failed to fetch product: ${fetchError.message}` };
    }

    // Check if product has any purchases (prevent deletion if so)
    const { data: purchases, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (purchaseError) {
      return { success: false, error: `Failed to check purchases: ${purchaseError.message}` };
    }

    if (purchases && purchases.length > 0) {
      return {
        success: false,
        error: 'Cannot delete product with existing purchases. Archive it instead.',
      };
    }

    // Delete product record from database
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      return { success: false, error: `Failed to delete product: ${deleteError.message}` };
    }

    // Delete associated files from storage
    await cleanupProductFiles(
      STORAGE_BUCKETS.PRODUCT_COVERS.name,
      product.cover_storage_path || product.cover_url,
      STORAGE_BUCKETS.PRODUCT_PREVIEWS.name,
      product.preview_storage_path || product.preview_url,
      STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
      product.video_storage_path || product.video_url,
      STORAGE_BUCKETS.EBOOKS_PRIVATE.name,
      product.file_storage_path || product.storage_url
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all products with optional filtering
 */
export async function getProducts(filters?: {
  status?: string;
  category_id?: string;
  search?: string;
}): Promise<{ data: Product[] | null; error: any }> {
  try {
    let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    return { data, error };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { data: null, error };
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<{ data: Product | null; error: any }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { data: null, error };
  }
}

/**
 * Helper function to cleanup product files from storage
 */
async function cleanupProductFiles(
  coverBucket: string,
  coverPath: string | null,
  previewBucket: string,
  previewPath: string | null,
  videoBucket: string,
  videoPath: string | null,
  fileBucket: string,
  filePath: string | null
): Promise<void> {
  try {
    // Delete cover
    if (coverPath) {
      await deleteFile(coverBucket, coverPath);
    }

    // Delete preview
    if (previewPath) {
      await deleteFile(previewBucket, previewPath);
    }

    // Delete video
    if (videoPath) {
      await deleteFile(videoBucket, videoPath);
    }

    // Delete product file
    if (filePath) {
      await deleteFile(fileBucket, filePath);
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
    // Don't throw - cleanup is best effort
  }
}

/**
 * Helper function to delete old file from storage
 * Handles both storage paths and full URLs (for backward compatibility)
 */
async function deleteOldFile(filePathOrUrl: string, bucketName: string): Promise<void> {
  try {
    // Extract storage path from URL if needed
    const filePath = extractStoragePathFromUrl(filePathOrUrl, bucketName) || filePathOrUrl;
    
    if (filePath) {
      await deleteFile(bucketName, filePath);
    }
  } catch (error) {
    console.error('Error deleting old file:', error);
    // Don't throw - deletion is best effort
  }
}
