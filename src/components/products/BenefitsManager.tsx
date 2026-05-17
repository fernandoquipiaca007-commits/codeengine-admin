import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface Benefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  display_order: number;
}

interface BenefitsManagerProps {
  productId: string;
}

export function BenefitsManager({ productId }: BenefitsManagerProps) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBenefit, setNewBenefit] = useState({
    icon: 'Code',
    title: '',
    description: '',
  });

  useEffect(() => {
    loadBenefits();
  }, [productId]);

  async function loadBenefits() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_benefits')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBenefits(data || []);
    } catch (error) {
      console.error('Error loading benefits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addBenefit() {
    if (!newBenefit.title || !newBenefit.description) return;

    try {
      const { error } = await supabaseAdmin.from('product_benefits').insert({
        product_id: productId,
        icon: newBenefit.icon,
        title: newBenefit.title,
        description: newBenefit.description,
        display_order: benefits.length,
      });

      if (error) throw error;
      setNewBenefit({ icon: 'Code', title: '', description: '' });
      loadBenefits();
    } catch (error) {
      console.error('Error adding benefit:', error);
    }
  }

  async function deleteBenefit(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_benefits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadBenefits();
    } catch (error) {
      console.error('Error deleting benefit:', error);
    }
  }

  if (loading) return <div className="text-center py-8">Carregando benefícios...</div>;

  const iconOptions = ['Code', 'Zap', 'Star', 'Award', 'Shield', 'Heart', 'Book', 'Users'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Benefício</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
            <select
              value={newBenefit.icon}
              onChange={(e) => setNewBenefit({ ...newBenefit, icon: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              type="text"
              value={newBenefit.title}
              onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
              placeholder="Ex: Conteúdo Premium"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              value={newBenefit.description}
              onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
              placeholder="Ex: Material de alta qualidade..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={addBenefit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Benefício
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((benefit) => (
          <div
            key={benefit.id}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-2">Ícone: {benefit.icon}</div>
                <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                <p className="text-sm text-gray-600 mt-2">{benefit.description}</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Excluir este benefício?')) deleteBenefit(benefit.id);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
