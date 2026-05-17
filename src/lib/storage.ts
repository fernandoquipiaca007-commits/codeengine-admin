import { supabaseAdmin } from './supabase-admin';
import { StorageBucket } from '../types/admin';

// Storage bucket configurations
export const STORAGE_BUCKETS: Record<string, StorageBucket> = {
  PRODUCT_COVERS: {
    name: 'product-covers',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  PRODUCT_PREVIEWS: {
    name: 'product-previews',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  PRODUCT_VIDEOS: {
    name: 'product-videos',
    public: true,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  },
  EBOOKS_PRIVATE: {
    name: 'ebooks-private',
    public: false,
    fileSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    allowedMimeTypes: [
      // Documents
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/epub+zip',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Archives
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      // Media
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
  },
};

const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  epub: 'application/epub+zip',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
};

function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MIME[ext] || '';
}

function mimeAllowed(file: File, bucket: StorageBucket): boolean {
  const mime = resolveMimeType(file);
  if (!mime) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return Object.keys(EXTENSION_MIME).some(
      (key) => key === ext && bucket.allowedMimeTypes.includes(EXTENSION_MIME[key])
    );
  }
  return bucket.allowedMimeTypes.includes(mime);
}

// Validate file before upload
export function validateFile(file: File, bucket: StorageBucket): { valid: boolean; error?: string } {
  if (file.size > bucket.fileSizeLimit) {
    const limitMB = Math.round(bucket.fileSizeLimit / (1024 * 1024));
    return {
      valid: false,
      error: `Arquivo excede o limite de ${limitMB} MB.`,
    };
  }

  if (!mimeAllowed(file, bucket)) {
    const mime = resolveMimeType(file) || 'desconhecido';
    return {
      valid: false,
      error: `Tipo de ficheiro não permitido (${mime || file.name}). Verifique a extensão e o bucket.`,
    };
  }

  return { valid: true };
}

// Upload file to Supabase Storage
// ALWAYS returns the storage path (not full URL)
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File,
  _onProgress?: (progress: number) => void
): Promise<string> {
  // Find bucket configuration
  const bucketConfig = Object.values(STORAGE_BUCKETS).find((b) => b.name === bucketName);
  
  if (!bucketConfig) {
    throw new Error(`Bucket de armazenamento desconhecido: ${bucketName}`);
  }

  // Validate file
  const validation = validateFile(file, bucketConfig);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload file
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    
    // Categorize errors for better debugging
    if (error.message.includes('exceeded')) {
      throw new Error(`Quota de armazenamento excedida. Contacte o administrador.`);
    } else if (error.message.includes('permission') || error.message.includes('policy')) {
      throw new Error(`Sem permissão para fazer upload. Verifique as políticas de storage.`);
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error(`Erro de rede. Verifique sua conexão e tente novamente.`);
    } else {
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }

  // ALWAYS return the storage path (consistent for all buckets)
  return data.path;
}

// Generate public URL from storage path
export function generatePublicUrl(bucketName: string, storagePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

// Generate signed URL for private files (expires in 1 hour by default)
export async function generateSignedUrl(
  bucketName: string, 
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Erro ao gerar URL assinado: ${error.message}`);
  }

  return data.signedUrl;
}

// Get URL for any storage path (auto-detects public/private)
export async function getStorageUrl(bucketName: string, storagePath: string): Promise<string> {
  const bucketConfig = Object.values(STORAGE_BUCKETS).find((b) => b.name === bucketName);
  
  if (!bucketConfig) {
    throw new Error(`Bucket desconhecido: ${bucketName}`);
  }

  if (bucketConfig.public) {
    return generatePublicUrl(bucketName, storagePath);
  } else {
    return await generateSignedUrl(bucketName, storagePath);
  }
}

// Extract storage path from full URL (for migration/cleanup)
export function extractStoragePathFromUrl(url: string, bucketName: string): string | null {
  try {
    // Handle both full URLs and paths
    if (!url.startsWith('http')) {
      return url; // Already a path
    }

    const urlObj = new URL(url);
    
    // Pattern 1: /storage/v1/object/public/{bucket}/{path}
    const publicPattern = `/storage/v1/object/public/${bucketName}/`;
    if (urlObj.pathname.includes(publicPattern)) {
      return urlObj.pathname.split(publicPattern)[1];
    }
    
    // Pattern 2: /storage/v1/object/sign/{bucket}/{path}
    const signPattern = `/storage/v1/object/sign/${bucketName}/`;
    if (urlObj.pathname.includes(signPattern)) {
      return urlObj.pathname.split(signPattern)[1].split('?')[0];
    }
    
    // Pattern 3: Direct path after bucket name
    const pathParts = urlObj.pathname.split(`/${bucketName}/`);
    if (pathParts.length > 1) {
      return pathParts[1].split('?')[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}

// Delete file from Supabase Storage
export async function deleteFile(bucketName: string, filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(error.message);
  }
}

// Generate file path for product files
export function generateProductFilePath(productId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${productId}/${timestamp}_${sanitizedFileName}`;
}

// Get file extension from filename
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
