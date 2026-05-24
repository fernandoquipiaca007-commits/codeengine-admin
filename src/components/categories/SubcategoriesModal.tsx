import { useState, useEffect } from 'react';
import { supabaseAdmin as supabase } from '../../lib/supabase-admin';
import {
  X as LucideX,
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
  ArrowUpDown as LucideArrowUpDown,
  Loader2 as LucideLoader2,
  AlertCircle as LucideAlertCircle
} from 'lucide-react';

const X = LucideX as any;
const Plus = LucidePlus as any;
const Trash2 = LucideTrash2 as any;
const ArrowUpDown = LucideArrowUpDown as any;
const Loader2 = LucideLoader2 as any;
const AlertCircle = LucideAlertCircle as any;

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

interface SubcategoriesModalProps {
  category: {
    id: string;
    name: string;
  };
  onClose: () => void;
}

export default function SubcategoriesModal({ category, onClose }: SubcategoriesModalProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New subcategory form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);

  useEffect(() => {
    loadSubcategories();
  }, [category.id]);

  async function loadSubcategories() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', category.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubcategories(data || []);
      // Pre-fill next display order
      const nextOrder = data && data.length > 0 
        ? Math.max(...data.map((s: any) => s.display_order)) + 1 
        : 1;
      setDisplayOrder(nextOrder);
    } catch (err: any) {
      console.error('Error loading subcategories:', err);
      setError(err.message || 'Erro ao carregar subcategorias');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          category_id: category.id,
          name: name.trim(),
          description: description.trim() || null,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setSubcategories([...subcategories, data].sort((a, b) => a.display_order - b.display_order));
      setName('');
      setDescription('');
      setDisplayOrder(prev => prev + 1);
    } catch (err: any) {
      console.error('Error creating subcategory:', err);
      setError(err.message || 'Erro ao criar subcategoria');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir esta subcategoria?')) return;

    setError(null);
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          throw new Error('Esta subcategoria está associada a produtos e não pode ser excluída.');
        }
        throw error;
      }

      setSubcategories(subcategories.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting subcategory:', err);
      setError(err.message || 'Erro ao deletar subcategoria');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Subcategorias: {category.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Gerencie subcategorias para esta categoria de produtos
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {/* New Subcategory Form */}
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary-600" /> Nova Subcategoria
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Backend, React, Finanças..."
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ordem de Exibição</label>
                <input
                  type="number"
                  required
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve descrição sobre a subcategoria..."
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Criando...' : 'Adicionar Subcategoria'}
              </button>
            </div>
          </form>

          {/* Subcategories List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
              <ArrowUpDown className="w-4 h-4 text-gray-500" /> Subcategorias Existentes
            </h4>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : subcategories.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
                Nenhuma subcategoria criada para esta categoria.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordem</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="relative px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {subcategories.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-semibold">{sub.display_order}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{sub.description || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
