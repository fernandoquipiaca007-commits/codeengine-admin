// Core Product Interface
export interface Product {
  id: string;
  title: string;
  description: string;
  category_id: string;
  price: number;
  stripe_price_id: string;
  stripe_product_id?: string;
  stripe_checkout_url?: string;
  // Legacy URL columns (deprecated, use storage_path columns instead)
  cover_url: string;
  preview_url: string | null;
  video_url: string | null;
  storage_url: string;
  // New storage path columns (preferred)
  cover_storage_path?: string | null;
  preview_storage_path?: string | null;
  video_storage_path?: string | null;
  file_storage_path?: string | null;
  tags: string[];
  cta_text: string;
  status: 'draft' | 'active' | 'archived';
  product_type?: 'file' | 'course' | 'service';
  is_free?: boolean;
  aoa_price?: number | null;
  fastpay_link?: string | null;
  subcategory_id?: string | null;
  visibility?: 'public' | 'members_only';
  min_member_level?: string | null;
  access_duration_days?: number | null;
  use_shared_content?: boolean;
  codeengine_recommended?: boolean;
  editor_choice?: boolean;
  featured_pick?: boolean;
  is_bestseller?: boolean;
  created_at: string;
  updated_at: string;
}

// Product with Category relationship
export interface ProductWithCategory extends Product {
  category: Category;
}

// Category Interface
export interface Category {
  id: string;
  name: string;
  description: string;
  display_order: number;
  created_at: string;
}

// Coupon Interface
export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expiration_date: string;
  usage_limit: number;
  usage_count: number;
  applicable_products: string[] | null; // null = all products
  created_at: string;
}

// Member Interface
export interface Member {
  id: string;
  email: string;
  auth_id: string;
  registration_date: string;
  profile_data: {
    name?: string;
    avatar_url?: string;
  };
}

// Purchase Interface
export interface Purchase {
  id: string;
  member_id: string;
  product_id: string;
  amount_paid: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id: string;
  coupon_code: string | null;
  purchase_date: string;
}

// Purchase with Details
export interface PurchaseWithDetails extends Purchase {
  product: Product;
  member: Member;
}

// Download Interface
export interface Download {
  id: string;
  member_id: string;
  product_id: string;
  download_timestamp: string;
  ip_address: string | null;
}

// Product Media Interface
export interface ProductMedia {
  id: string;
  product_id: string;
  media_type: 'image' | 'video' | 'document';
  url: string;
  storage_path: string | null;
  bucket_name: string | null;
  title: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
}

// Product Video Interface
export interface ProductVideo {
  id: string;
  product_id: string;
  video_type: 'youtube' | 'vimeo' | 'instagram' | 'upload';
  video_url: string | null;
  storage_path: string | null;
  bucket_name: string | null;
  title: string | null;
  description: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

// Analytics Interfaces
export interface SalesStats {
  total_sales: number;
  total_revenue: number;
  total_members: number;
  conversion_rate: number;
}

export interface ProductStats {
  product_id: string;
  product_title: string;
  sales_count: number;
  revenue: number;
}

export interface DownloadStats {
  total_downloads: number;
  downloads_by_product: {
    product_id: string;
    product_title: string;
    download_count: number;
  }[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  sales_count: number;
}

// Storage Bucket Configuration
export interface StorageBucket {
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

// Admin API Interface
export interface AdminAPI {
  // Products
  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product>;
  
  // Storage
  uploadFile(bucket: string, path: string, file: File): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<void>;
  
  // Categories
  createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategories(): Promise<Category[]>;
  
  // Coupons
  createCoupon(coupon: Omit<Coupon, 'id' | 'usage_count' | 'created_at'>): Promise<Coupon>;
  updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon>;
  deactivateCoupon(id: string): Promise<void>;
  getCoupons(): Promise<Coupon[]>;
  
  // Analytics
  getSalesStats(): Promise<SalesStats>;
  getTopProducts(limit?: number): Promise<ProductStats[]>;
  getDownloadStats(): Promise<DownloadStats>;
  getMonthlyRevenue(): Promise<MonthlyRevenue[]>;
}

// Form Types for Product Creation/Update
export interface ProductFormData {
  title: string;
  description: string;
  category_id: string;
  price: number;
  stripe_price_id: string;
  tags: string[];
  cta_text: string;
  status: 'draft' | 'active' | 'archived';
  product_type?: 'file' | 'course' | 'service';
  is_free?: boolean;
  is_course_mode?: boolean;
  cover_file?: File;
  preview_file?: File;
  video_file?: File;
  product_file?: File;
  translations?: Record<string, any>;
  aoa_price?: number;
  fastpay_link?: string;
  subcategory_id?: string;
  visibility?: 'public' | 'members_only';
  min_member_level?: string;
  access_duration_days?: number | null;
  use_shared_content?: boolean;
}

// File Upload Progress
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}
