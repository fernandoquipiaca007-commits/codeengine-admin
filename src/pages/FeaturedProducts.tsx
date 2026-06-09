import { useEffect, useMemo, useState } from 'react';
import { Product } from '../types/admin';
import { getProducts } from '../lib/products';
import { slugify } from '../lib/slug';
import { useToast } from '../contexts/ToastContext';
import { FeaturedCoverUpload } from '../components/featured/FeaturedCoverUpload';
import { loadProductTranslations } from '../lib/translations';
import {
  deleteFeaturedProduct,
  fetchFeaturedProducts,
  FeaturedProductRow,
  uploadFeaturedCover,
  upsertFeaturedProduct,
  fetchFeaturedProductTranslations,
  upsertFeaturedProductTranslations,
} from '../lib/featured-products';

function shortDescription(text: string, max = 120) {
  const t = text?.trim() || '';
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

export default function FeaturedProducts() {
  const { notifyError, notifySuccess } = useToast();
  const [items, setItems] = useState<FeaturedProductRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FeaturedProductRow | null>(null);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [form, setForm] = useState({
    product_id: '',
    order_position: 0,
    custom_title: '',
    custom_subtitle: '',
    custom_description: '',
    custom_cover: '',
    custom_cta: '',
    active: true,
  });

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.product_id) ?? null,
    [products, form.product_id]
  );

  const [translations, setTranslations] = useState({
    en: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' },
    fr: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' }
  });
  const [activeTab, setActiveTab] = useState<'pt' | 'en' | 'fr'>('pt');
  const [productTranslations, setProductTranslations] = useState<any[]>([]);

  useEffect(() => {
    if (form.product_id) {
      loadProductTranslations(form.product_id)
        .then((res) => {
          setProductTranslations(res || []);
        })
        .catch((err) => {
          console.error('[FeaturedProducts] failed to load product translations:', err);
        });
    } else {
      setProductTranslations([]);
    }
  }, [form.product_id]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [featuredRes, productsRes] = await Promise.all([
        fetchFeaturedProducts() as any,
        getProducts({ status: 'active' }) as any,
      ]);
      if (productsRes.error) throw productsRes.error;

      setItems((featuredRes as FeaturedProductRow[]) || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      notifyError(err, 'load', 'featured-products');
    } finally {
      setLoading(false);
    }
  }
  function resetToDefaults() {
    setForm((prev) => ({
      ...prev,
      custom_title: '',
      custom_subtitle: '',
      custom_description: '',
      custom_cover: '',
      custom_cta: '',
    }));
    setTranslations({
      en: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' },
      fr: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' }
    });
    setCoverFile(undefined);
  }

  function openCreate() {
    const first = products[0];
    setEditing(null);
    setShowForm(true);
    setCoverFile(undefined);
    setActiveTab('pt');

    // Scan for first vacant position slot in [0, 1, 2]
    const occupiedPositions = items.map((item) => item.order_position);
    let vacantPosition = 0;
    for (let pos = 0; pos <= 2; pos++) {
      if (!occupiedPositions.includes(pos)) {
        vacantPosition = pos;
        break;
      }
    }

    setTranslations({
      en: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' },
      fr: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' }
    });

    if (first) {
      setForm({
        product_id: first.id,
        order_position: vacantPosition,
        custom_title: '',
        custom_subtitle: '',
        custom_description: '',
        custom_cover: '',
        custom_cta: '',
        active: true,
      });
    } else {
      setForm({
        product_id: '',
        order_position: 0,
        custom_title: '',
        custom_subtitle: '',
        custom_description: '',
        custom_cover: '',
        custom_cta: '',
        active: true,
      });
    }
  }

  function openEdit(row: FeaturedProductRow) {
    setEditing(row);
    setShowForm(true);
    setCoverFile(undefined);
    setActiveTab('pt');
    
    setForm({
      product_id: row.product_id,
      order_position: row.order_position,
      custom_title: row.custom_title || '',
      custom_subtitle: row.custom_subtitle || '',
      custom_description: row.custom_description || '',
      custom_cover: row.custom_cover || '',
      custom_cta: row.custom_cta || '',
      active: row.active,
    });

    setTranslations({
      en: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' },
      fr: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' }
    });

    fetchFeaturedProductTranslations(row.id)
      .then((res) => {
        const fetchedTrs = res || [];
        const enTr = fetchedTrs.find((t: any) => t.language === 'en') || {};
        const frTr = fetchedTrs.find((t: any) => t.language === 'fr') || {};
        setTranslations({
          en: {
            custom_title: enTr.custom_title || '',
            custom_subtitle: enTr.custom_subtitle || '',
            custom_description: enTr.custom_description || '',
            custom_cta: enTr.custom_cta || '',
          },
          fr: {
            custom_title: frTr.custom_title || '',
            custom_subtitle: frTr.custom_subtitle || '',
            custom_description: frTr.custom_description || '',
            custom_cta: frTr.custom_cta || '',
          }
        });
      })
      .catch((err) => {
        console.error('[FeaturedProducts] failed to load featured translations:', err);
      });
  }

  function handleProductChange(productId: string) {
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      custom_title: '',
      custom_subtitle: '',
      custom_description: '',
      custom_cover: '',
      custom_cta: '',
    }));
    setTranslations({
      en: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' },
      fr: { custom_title: '', custom_subtitle: '', custom_description: '', custom_cta: '' }
    });
    setCoverFile(undefined);
  }

  function handleUseOriginalCover() {
    if (selectedProduct?.cover_url) {
      setForm((prev) => ({ ...prev, custom_cover: '' }));
      setCoverFile(undefined);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) {
      notifyError(new Error('Selecione um produto para continuar.'), 'save', 'featured-products');
      return;
    }
    if (items.length >= 3 && !editing) {
      notifyError(new Error('Máximo de 3 produtos em destaque.'), 'save', 'featured-products');
      return;
    }

    setSaving(true);
    try {
      let coverUrl = form.custom_cover;

      if (coverFile) {
        coverUrl = await uploadFeaturedCover(form.product_id, coverFile);
      } else if (coverUrl === selectedProduct?.cover_url || !coverUrl) {
        coverUrl = '';
      }

      // Check if values match product defaults or are empty, and normalize them to empty strings (which become null)
      const payloadTitle = form.custom_title.trim() === selectedProduct?.title ? '' : form.custom_title.trim();
      const payloadSubtitle = form.custom_subtitle.trim() === (selectedProduct?.tags?.[0]?.toUpperCase() ?? 'PRODUTO') ? '' : form.custom_subtitle.trim();
      const payloadDescription = form.custom_description.trim() === shortDescription(selectedProduct?.description || '') ? '' : form.custom_description.trim();
      const payloadCta = form.custom_cta.trim() === (selectedProduct?.cta_text || 'Ver produto') ? '' : form.custom_cta.trim();

      const { data: savedRow, error } = await upsertFeaturedProduct({
        id: editing?.id,
        ...form,
        custom_title: payloadTitle,
        custom_subtitle: payloadSubtitle,
        custom_description: payloadDescription,
        custom_cta: payloadCta,
        custom_cover: coverUrl || undefined,
      }) as any;
      if (error) throw error;

      const featuredId = savedRow.id;

      // Find the English and French translations of the base product to compare defaults
      const enProductTr = productTranslations.find((t) => t.language === 'en') || {};
      const frProductTr = productTranslations.find((t) => t.language === 'fr') || {};

      const payloadEnTitle = translations.en.custom_title.trim() === enProductTr.title ? '' : translations.en.custom_title.trim();
      const payloadEnSubtitle = translations.en.custom_subtitle.trim() === (enProductTr.subtitle || (selectedProduct?.tags?.[0]?.toUpperCase() ?? 'PRODUCT')) ? '' : translations.en.custom_subtitle.trim();
      const payloadEnDescription = translations.en.custom_description.trim() === shortDescription(enProductTr.description || '') ? '' : translations.en.custom_description.trim();
      const payloadEnCta = translations.en.custom_cta.trim() === (enProductTr.cta_text || 'View product') ? '' : translations.en.custom_cta.trim();

      const payloadFrTitle = translations.fr.custom_title.trim() === frProductTr.title ? '' : translations.fr.custom_title.trim();
      const payloadFrSubtitle = translations.fr.custom_subtitle.trim() === (frProductTr.subtitle || (selectedProduct?.tags?.[0]?.toUpperCase() ?? 'PRODUIT')) ? '' : translations.fr.custom_subtitle.trim();
      const payloadFrDescription = translations.fr.custom_description.trim() === shortDescription(frProductTr.description || '') ? '' : translations.fr.custom_description.trim();
      const payloadFrCta = translations.fr.custom_cta.trim() === (frProductTr.cta_text || 'Voir le produit') ? '' : translations.fr.custom_cta.trim();

      await upsertFeaturedProductTranslations(featuredId, [
        {
          language: 'en',
          custom_title: payloadEnTitle,
          custom_subtitle: payloadEnSubtitle,
          custom_description: payloadEnDescription,
          custom_cta: payloadEnCta,
        },
        {
          language: 'fr',
          custom_title: payloadFrTitle,
          custom_subtitle: payloadFrSubtitle,
          custom_description: payloadFrDescription,
          custom_cta: payloadFrCta,
        }
      ]);

      notifySuccess('featuredSaved');
      setShowForm(false);
      setEditing(null);
      setCoverFile(undefined);
      await load();
    } catch (err) {
      notifyError(err, coverFile ? 'upload' : 'save', 'featured-products');
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete(id: string) {
    if (!confirm('Remover este destaque da Home?')) return;
    try {
      const { error } = await deleteFeaturedProduct(id) as any;
      if (error) throw error;
      notifySuccess('featuredDeleted');
      await load();
    } catch (err) {
      notifyError(err, 'delete', 'featured-products');
    }
  }

  const placeholders = useMemo(() => {
    if (activeTab === 'pt') {
      return {
        title: selectedProduct?.title || 'Título do produto',
        subtitle: selectedProduct?.tags?.[0]?.toUpperCase() ?? 'PRODUTO',
        description: selectedProduct ? shortDescription(selectedProduct.description) : 'Descrição curta',
        cta: selectedProduct?.cta_text || 'Ver produto'
      };
    } else if (activeTab === 'en') {
      const enTr = productTranslations.find((t) => t.language === 'en') || {};
      return {
        title: enTr.title || selectedProduct?.title || 'Product Title',
        subtitle: enTr.subtitle || selectedProduct?.tags?.[0]?.toUpperCase() || 'PRODUCT',
        description: enTr.description ? shortDescription(enTr.description) : (selectedProduct ? shortDescription(selectedProduct.description) : 'Short description'),
        cta: enTr.cta_text || 'View product'
      };
    } else {
      const frTr = productTranslations.find((t) => t.language === 'fr') || {};
      return {
        title: frTr.title || selectedProduct?.title || 'Titre du produit',
        subtitle: frTr.subtitle || selectedProduct?.tags?.[0]?.toUpperCase() || 'PRODUIT',
        description: frTr.description ? shortDescription(frTr.description) : (selectedProduct ? shortDescription(selectedProduct.description) : 'Description courte'),
        cta: frTr.cta_text || 'Voir le produit'
      };
    }
  }, [activeTab, selectedProduct, productTranslations]);

  const activeTranslationValues = useMemo(() => {
    if (activeTab === 'pt') {
      return {
        custom_title: form.custom_title,
        custom_subtitle: form.custom_subtitle,
        custom_description: form.custom_description,
        custom_cta: form.custom_cta
      };
    }
    return translations[activeTab];
  }, [activeTab, form, translations]);

  const updateActiveTranslation = (field: 'custom_title' | 'custom_subtitle' | 'custom_description' | 'custom_cta', value: string) => {
    if (activeTab === 'pt') {
      setForm((prev) => ({ ...prev, [field]: value }));
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          [field]: value
        }
      }));
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600">A carregar destaques…</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos em Destaque</h1>
          <p className="text-gray-600 text-sm mt-1">
            Até 3 produtos na Home. Ao escolher um produto, título, descrição e capa são preenchidos
            automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={items.length >= 3 || products.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Adicionar destaque
        </button>
      </div>

      <div className="space-y-4 mb-10">
        {items.map((row) => (
          <div
            key={row.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-center"
          >
            {(row.custom_cover || row.products?.cover_url) && (
              <img
                src={row.custom_cover || row.products?.cover_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                #{row.order_position} — {row.custom_title || row.products?.title}
              </p>
              <p className="text-xs text-gray-500">
                {row.active ? 'Ativo na Home' : 'Inativo'} · ID: {row.product_id.slice(0, 8)}…
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row.id)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Remover dos Destaques
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhum destaque configurado.</p>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">
            {editing ? 'Editar destaque' : 'Novo destaque'}
          </h2>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Produto</span>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              value={form.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Os dados abaixo são preenchidos automaticamente a partir do produto.
            </p>
          </label>

          {selectedProduct && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-1 font-mono">
              <p>
                <span className="text-gray-400">ID:</span> {selectedProduct.id}
              </p>
              <p>
                <span className="text-gray-400">Slug:</span> {slugify(selectedProduct.title)}
              </p>
              <p>
                <span className="text-gray-400">Preço:</span> $ {selectedProduct.price}
              </p>
            </div>
          )}

          <FeaturedCoverUpload
            coverUrl={form.custom_cover || selectedProduct?.cover_url || ''}
            productTitle={selectedProduct?.title}
            onFileSelect={setCoverFile}
            onUseOriginal={handleUseOriginalCover}
            disabled={!form.product_id || saving}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-gray-700">Posição na Home (0–2)</span>
              <input
                type="number"
                min={0}
                max={2}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.order_position}
                onChange={(e) =>
                  setForm({ ...form, order_position: Number(e.target.value) })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Ativo na Home
            </label>
          </div>

          {/* Language Tabs */}
          <div className="flex border-b border-gray-200 mt-6 gap-2">
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pt'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('pt')}
            >
              Português (PT)
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'en'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('en')}
            >
              Inglês (EN)
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fr'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('fr')}
            >
              Francês (FR)
            </button>
          </div>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Título (deixe em branco para usar o padrão traduzido)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 font-normal"
              value={activeTranslationValues.custom_title}
              placeholder={placeholders.title}
              onChange={(e) => updateActiveTranslation('custom_title', e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Badge / subtítulo (deixe em branco para usar o padrão)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 font-normal"
              value={activeTranslationValues.custom_subtitle}
              placeholder={placeholders.subtitle}
              onChange={(e) => updateActiveTranslation('custom_subtitle', e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Descrição curta (deixe em branco para usar o padrão traduzido)</span>
            <textarea
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 font-normal"
              rows={2}
              value={activeTranslationValues.custom_description}
              placeholder={placeholders.description}
              onChange={(e) => updateActiveTranslation('custom_description', e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Texto do botão (CTA - deixe em branco para usar o padrão traduzido)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 font-normal"
              value={activeTranslationValues.custom_cta}
              placeholder={placeholders.cta}
              onChange={(e) => updateActiveTranslation('custom_cta', e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !form.product_id}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'A guardar…' : 'Guardar destaque'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setCoverFile(undefined);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              Cancelar
            </button>
            {selectedProduct && (
              <button
                type="button"
                onClick={resetToDefaults}
                className="px-4 py-2 text-sm text-indigo-600 hover:underline"
              >
                Repor dados do produto
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
