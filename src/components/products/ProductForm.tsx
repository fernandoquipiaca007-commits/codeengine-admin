import { useState, useEffect } from 'react';
import { Product, Category } from '../../types/admin';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { CompactFileUpload } from './CompactFileUpload';
import { LanguageToggle } from '../LanguageToggle';
import { AppLocale, ProductTranslationsMap } from '../../types/locale';
import { CurriculumEditor } from './CurriculumEditor';
import { isCourseCategory, isEbookCategory } from '../../lib/curriculum';

interface ProductFormProps {
  product?: Product;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

export interface ProductFormData {
  title: string;
  description: string;
  category_id: string;
  price: number;
  stripe_price_id: string;
  fastpay_link?: string;
  tags: string[];
  cta_text: string;
  status: 'draft' | 'active' | 'archived';
  cover_file?: File;
  preview_file?: File;
  video_file?: File;
  product_file?: File;
  enabledLanguages: AppLocale[];
  translations: ProductTranslationsMap;
  product_type?: 'file' | 'course' | 'ebook';
  is_free?: boolean;
  is_course_mode?: boolean;
}

export default function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: product?.title || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    price: product?.price || 0,
    stripe_price_id: product?.stripe_price_id || '',
    fastpay_link: (product as any)?.fastpay_link || '',
    tags: product?.tags || [],
    cta_text: product?.cta_text || 'Comprar Agora',
    status: product?.status || 'draft',
    product_type: (product as { product_type?: string })?.product_type as 'file' | 'course' | 'ebook' || 'file',
    is_free: (product as { is_free?: boolean })?.is_free ?? false,
    is_course_mode: false,
    enabledLanguages: ['pt'] as AppLocale[],
    translations: {
      pt: {
        title: product?.title || '',
        description: product?.description || '',
        cta_text: product?.cta_text || 'Comprar Agora',
      },
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [activeLang, setActiveLang] = useState<AppLocale>('pt');

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Categoria é obrigatória';
    }

    if (!formData.is_free) {
      if (formData.price <= 0) {
        newErrors.price = 'Preço deve ser maior que 0';
      }
      if (!formData.stripe_price_id.trim()) {
        newErrors.stripe_price_id = 'ID de Preço do Stripe é obrigatório';
      }
    }

    if (!product && !formData.cover_file) {
      newErrors.cover_file = 'Imagem de capa é obrigatória';
    }

    if (!product && !formData.product_file) {
      newErrors.product_file = 'Arquivo do produto digital é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Falha ao salvar produto. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  function handleAddTag() {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  }

  function handleRemoveTag(tag: string) {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  }

  const t = formData.translations[activeLang] || { title: '', description: '', cta_text: 'Comprar Agora' };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LanguageToggle
        selected={formData.enabledLanguages}
        onChange={(langs) => {
          setFormData((prev) => ({ ...prev, enabledLanguages: langs }));
          if (!langs.includes(activeLang)) setActiveLang(langs[0]);
        }}
      />
      <div className="flex gap-2">
        {formData.enabledLanguages.map((l) => (
          <button key={l} type="button" onClick={() => setActiveLang(l)}
            className={`px-3 py-1 rounded text-sm font-medium ${activeLang === l ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Título ({activeLang.toUpperCase()}) *
        </label>
        <input
          type="text"
          id="title"
          value={activeLang === 'pt' ? formData.title : (t.title || '')}
          onChange={(e) => {
            const v = e.target.value;
            if (activeLang === 'pt') setFormData({ ...formData, title: v, translations: { ...formData.translations, pt: { ...formData.translations.pt, title: v, description: formData.translations.pt?.description || formData.description, cta_text: formData.translations.pt?.cta_text || formData.cta_text } } });
            else setFormData({ ...formData, translations: { ...formData.translations, [activeLang]: { ...formData.translations[activeLang], title: v, description: formData.translations[activeLang]?.description || '', cta_text: formData.translations[activeLang]?.cta_text || 'Comprar Agora' } } });
          }}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.title
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="Título do produto"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descrição *
        </label>
        <textarea
          id="description"
          rows={4}
          value={activeLang === 'pt' ? formData.description : (t.description || '')}
          onChange={(e) => {
            const v = e.target.value;
            if (activeLang === 'pt') setFormData({ ...formData, description: v, translations: { ...formData.translations, pt: { ...formData.translations.pt, title: formData.translations.pt?.title || formData.title, description: v, cta_text: formData.translations.pt?.cta_text || formData.cta_text } } });
            else setFormData({ ...formData, translations: { ...formData.translations, [activeLang]: { ...formData.translations[activeLang], title: formData.translations[activeLang]?.title || '', description: v, cta_text: formData.translations[activeLang]?.cta_text || 'Comprar Agora' } } });
          }}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="Descrição detalhada do produto"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      {/* Category and Price */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Categoria *
          </label>
          <select
            id="category"
            value={formData.category_id}
            onChange={(e) => {
              const cat = categories.find((c) => c.id === e.target.value);
              const courseMode = cat ? isCourseCategory(cat.name) : false;
              const ebookMode = cat ? isEbookCategory(cat.name) : false;
              setFormData({
                ...formData,
                category_id: e.target.value,
                is_course_mode: courseMode,
                product_type: courseMode ? 'course' : ebookMode ? 'ebook' : formData.product_type || 'file',
              });
            }}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.category_id
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Preço (R$) {!formData.is_free && '*'}
          </label>
          <input
            type="number"
            id="price"
            step="0.01"
            min="0"
            value={formData.is_free ? 0 : formData.price}
            disabled={formData.is_free}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 ${
              errors.price
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
            placeholder="0.00"
          />
          {formData.is_free && (
            <p className="mt-1 text-xs text-gray-500">Preço desativado para produtos gratuitos.</p>
          )}
          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
        </div>
      </div>

      {/* Stripe Price ID */}
      <div>
        <label htmlFor="stripe_price_id" className="block text-sm font-medium text-gray-700">
          Stripe Price ID {!formData.is_free && '*'}
        </label>
        <input
          type="text"
          id="stripe_price_id"
          value={formData.is_free ? '' : formData.stripe_price_id}
          disabled={formData.is_free}
          onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 ${
            errors.stripe_price_id
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
          placeholder="price_xxxxxxxxxxxxx"
        />
        {errors.stripe_price_id && (
          <p className="mt-1 text-sm text-red-600">{errors.stripe_price_id}</p>
        )}
      </div>

      {/* FastPay Link */}
      {!formData.is_free && (
        <div>
          <label htmlFor="fastpay_link" className="block text-sm font-medium text-gray-700">
            Link FastPay
            <span className="ml-2 text-xs font-normal text-gray-400">(opcional — habilita pagamento local Angola)</span>
          </label>
          <div className="mt-1 relative">
            <input
              type="url"
              id="fastpay_link"
              value={formData.fastpay_link || ''}
              onChange={(e) => setFormData({ ...formData, fastpay_link: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm pr-10"
              placeholder="https://fastpay.ao/..."
            />
            {formData.fastpay_link && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, fastpay_link: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Remover link"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {formData.fastpay_link && !/^https?:\/\//.test(formData.fastpay_link) && (
            <p className="mt-1 text-xs text-red-500">URL inválida. Deve começar com http:// ou https://</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Quando preenchido, o botão "Comprar Agora" oferecerá Stripe e FastPay como opções de pagamento.
          </p>
        </div>
      )}

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Etiquetas
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Adicionar etiqueta"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Adicionar
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-200"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CTA Text */}
      <div>
        <label htmlFor="cta_text" className="block text-sm font-medium text-gray-700">
          Texto do Botão de Ação
        </label>
        <input
          type="text"
          id="cta_text"
          value={formData.cta_text}
          onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          placeholder="Comprar Agora"
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as 'draft' | 'active' | 'archived' })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="draft">Rascunho</option>
          <option value="active">Ativo</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>

      {/* File Uploads - Compact Version */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Arquivos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cover Image */}
          <CompactFileUpload
            label="Imagem de Capa"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            maxSize={5 * 1024 * 1024}
            required={!product}
            currentFile={product?.cover_url}
            onFileSelect={(file) => setFormData({ ...formData, cover_file: file })}
            helpText="Max 5MB • JPG, PNG, WebP"
          />

          {/* Preview File */}
          <CompactFileUpload
            label="Arquivo de Preview"
            accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
            maxSize={10 * 1024 * 1024}
            currentFile={product?.preview_url}
            onFileSelect={(file) => setFormData({ ...formData, preview_file: file })}
            helpText="Max 10MB • JPG, PNG, PDF"
          />

          {/* Video File */}
          <CompactFileUpload
            label="Vídeo Promocional"
            accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg"
            maxSize={100 * 1024 * 1024}
            currentFile={product?.video_url}
            onFileSelect={(file) => setFormData({ ...formData, video_file: file })}
            helpText="Max 100MB • MP4, WebM, OGG"
          />

          {/* Digital Product File (default PT) */}
          <CompactFileUpload
            label={`Produto Digital (${activeLang.toUpperCase()})`}
            accept=".pdf,.zip,.epub,.docx,.mp4,.rar,.7z"
            maxSize={2 * 1024 * 1024 * 1024}
            required={!product && activeLang === 'pt'}
            currentFile={product?.storage_url}
            onFileSelect={(file) => {
              if (activeLang === 'pt') {
                setFormData({ ...formData, product_file: file });
              } else {
                setFormData({
                  ...formData,
                  translations: {
                    ...formData.translations,
                    [activeLang]: {
                      ...formData.translations[activeLang],
                      title: formData.translations[activeLang]?.title || '',
                      description: formData.translations[activeLang]?.description || '',
                      cta_text: formData.translations[activeLang]?.cta_text || 'Comprar Agora',
                      product_file: file,
                    },
                  },
                });
              }
            }}
            helpText="PDF, ZIP, EPUB, DOCX, MP4 — um arquivo por idioma"
          />
        </div>

        {(errors.cover_file || errors.product_file) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {errors.cover_file || errors.product_file}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg border">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.is_free}
            onChange={(e) => {
              const checked = e.target.checked;
              setFormData({
                ...formData,
                is_free: checked,
                price: checked ? 0 : formData.price,
                stripe_price_id: checked ? '' : formData.stripe_price_id,
              });
            }}
          />
          Produto gratuito
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.is_course_mode || formData.product_type === 'course'}
            onChange={(e) =>
              setFormData({
                ...formData,
                is_course_mode: e.target.checked,
                product_type: e.target.checked ? 'course' : formData.product_type === 'ebook' ? 'ebook' : 'file',
              })
            }
          />
          Modo curso (múltiplas aulas)
        </label>
      </div>

      {product?.id && (formData.is_course_mode || formData.product_type === 'course') && (
        <CurriculumEditor productId={product.id} />
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Salvando...
            </>
          ) : (
            <>{product ? 'Atualizar Produto' : 'Criar Produto'}</>
          )}
        </button>
      </div>
    </form>
  );
}
