import { useEffect, useMemo, useState } from 'react';
import { Product } from '../types/admin';
import { getProducts } from '../lib/products';
import { slugify } from '../lib/slug';
import { useToast } from '../contexts/ToastContext';
import { FeaturedCoverUpload } from '../components/featured/FeaturedCoverUpload';
import {
  deleteFeaturedProduct,
  fetchFeaturedProducts,
  FeaturedProductRow,
  uploadFeaturedCover,
  upsertFeaturedProduct,
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
    custom_cta: 'Ver produto',
    active: true,
  });

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.product_id) ?? null,
    [products, form.product_id]
  );

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

  function applyProductDefaults(productId: string, keepOverrides = false) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const firstTag = product.tags?.[0]?.toUpperCase() ?? 'PRODUTO';

    setForm((prev) => ({
      ...prev,
      product_id: productId,
      custom_title: keepOverrides && prev.custom_title ? prev.custom_title : product.title,
      custom_subtitle: keepOverrides && prev.custom_subtitle ? prev.custom_subtitle : firstTag,
      custom_description:
        keepOverrides && prev.custom_description
          ? prev.custom_description
          : shortDescription(product.description),
      custom_cover: product.cover_url || '',
      custom_cta: keepOverrides && prev.custom_cta ? prev.custom_cta : product.cta_text || 'Ver produto',
    }));
    setCoverFile(undefined);
  }

  function openCreate() {
    const first = products[0];
    setEditing(null);
    setShowForm(true);
    setCoverFile(undefined);

    // Scan for first vacant position slot in [0, 1, 2]
    const occupiedPositions = items.map((item) => item.order_position);
    let vacantPosition = 0;
    for (let pos = 0; pos <= 2; pos++) {
      if (!occupiedPositions.includes(pos)) {
        vacantPosition = pos;
        break;
      }
    }

    if (first) {
      setForm({
        product_id: first.id,
        order_position: vacantPosition,
        custom_title: first.title,
        custom_subtitle: first.tags?.[0]?.toUpperCase() ?? 'PRODUTO',
        custom_description: shortDescription(first.description),
        custom_cover: first.cover_url || '',
        custom_cta: first.cta_text || 'Ver produto',
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
        custom_cta: 'Ver produto',
        active: true,
      });
    }
  }

  function openEdit(row: FeaturedProductRow) {
    setEditing(row);
    setShowForm(true);
    setCoverFile(undefined);
    setForm({
      product_id: row.product_id,
      order_position: row.order_position,
      custom_title: row.custom_title || row.products?.title || '',
      custom_subtitle: row.custom_subtitle || '',
      custom_description: row.custom_description || '',
      custom_cover: row.custom_cover || row.products?.cover_url || '',
      custom_cta: row.custom_cta || 'Ver produto',
      active: row.active,
    });
  }

  function handleProductChange(productId: string) {
    applyProductDefaults(productId, false);
  }

  function handleUseOriginalCover() {
    if (selectedProduct?.cover_url) {
      setForm((prev) => ({ ...prev, custom_cover: selectedProduct.cover_url }));
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
      } else if (!coverUrl && selectedProduct?.cover_url) {
        coverUrl = selectedProduct.cover_url;
      }

      const { error } = await upsertFeaturedProduct({
        id: editing?.id,
        ...form,
        custom_cover: coverUrl || undefined,
      }) as any;
      if (error) throw error;

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

  if (loading) {
    return <div className="p-8 text-gray-600">A carregar destaques…</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl overflow-x-hidden">
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Produtos em Destaque</h1>
          <p className="mt-2 text-base text-gray-500 max-w-xl">
            Configure até 3 produtos para aparecerem no carrossel da Home.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={items.length >= 3 || products.length === 0}
          className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Adicionar Destaque
        </button>
      </div>

      <div className="space-y-4 mb-12">
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
            coverUrl={form.custom_cover}
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

          <label className="block text-sm">
            <span className="text-gray-700">Título (editável)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.custom_title}
              onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Badge / subtítulo</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.custom_subtitle}
              onChange={(e) => setForm({ ...form, custom_subtitle: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Descrição curta</span>
            <textarea
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              value={form.custom_description}
              onChange={(e) => setForm({ ...form, custom_description: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Texto do botão (CTA)</span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.custom_cta}
              onChange={(e) => setForm({ ...form, custom_cta: e.target.value })}
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
                onClick={() => applyProductDefaults(form.product_id, false)}
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
