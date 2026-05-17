export type AppLocale = 'pt' | 'en' | 'fr';

export interface ProductTranslationFields {
  title: string;
  subtitle?: string;
  description: string;
  content?: string;
  cta_text: string;
  cover_file?: File;
  preview_file?: File;
  product_file?: File;
  cover_url?: string;
  preview_url?: string;
  storage_url?: string;
}

export type ProductTranslationsMap = Partial<Record<AppLocale, ProductTranslationFields>>;
