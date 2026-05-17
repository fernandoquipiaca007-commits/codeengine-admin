import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  banner_text: string;
  banner_style: any;
  start_date: string;
  end_date: string;
  is_active: boolean;
  show_countdown: boolean;
  special_price: number | null;
}

interface CampaignsManagerProps {
  productId: string;
}

export function CampaignsManager({ productId }: CampaignsManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    banner_text: '',
    start_date: '',
    end_date: '',
    show_countdown: true,
    special_price: null as number | null,
  });

  useEffect(() => {
    loadCampaigns();
  }, [productId]);

  async function loadCampaigns() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_campaigns')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addCampaign() {
    if (!newCampaign.name || !newCampaign.banner_text || !newCampaign.start_date || !newCampaign.end_date) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('product_campaigns')
        .insert({
          product_id: productId,
          name: newCampaign.name,
          description: newCampaign.description || null,
          banner_text: newCampaign.banner_text,
          banner_style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textColor: '#ffffff',
          },
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          show_countdown: newCampaign.show_countdown,
          special_price: newCampaign.special_price,
          is_active: true,
        });

      if (error) throw error;
      
      setNewCampaign({
        name: '',
        description: '',
        banner_text: '',
        start_date: '',
        end_date: '',
        show_countdown: true,
        special_price: null,
      });
      
      loadCampaigns();
    } catch (error: any) {
      console.error('Error adding campaign:', error);
      alert(`Erro ao criar campanha: ${error.message}`);
    }
  }

  async function toggleCampaign(id: string, isActive: boolean) {
    try {
      const { error } = await supabaseAdmin
        .from('product_campaigns')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadCampaigns();
    } catch (error) {
      console.error('Error toggling campaign:', error);
    }
  }

  async function deleteCampaign(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  }

  function isActive(campaign: Campaign): boolean {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && now >= start && now <= end;
  }

  function getStatus(campaign: Campaign): { text: string; color: string } {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);

    if (!campaign.is_active) {
      return { text: 'INATIVA', color: 'text-gray-400' };
    }
    if (now < start) {
      return { text: 'AGENDADA', color: 'text-blue-600' };
    }
    if (now > end) {
      return { text: 'EXPIRADA', color: 'text-red-600' };
    }
    return { text: 'ATIVA', color: 'text-green-600' };
  }

  if (loading) {
    return <div className="text-center py-8">Carregando campanhas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Nova Campanha</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Campanha *
              </label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="Ex: Black Friday 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço Especial (opcional)
              </label>
              <input
                type="number"
                value={newCampaign.special_price || ''}
                onChange={(e) => setNewCampaign({ ...newCampaign, special_price: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Ex: 197.00"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto do Banner *
            </label>
            <input
              type="text"
              value={newCampaign.banner_text}
              onChange={(e) => setNewCampaign({ ...newCampaign, banner_text: e.target.value })}
              placeholder="Ex: 🔥 BLACK FRIDAY: 50% OFF - Termina em:"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              placeholder="Descrição interna da campanha"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Início *
              </label>
              <input
                type="datetime-local"
                value={newCampaign.start_date}
                onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Término *
              </label>
              <input
                type="datetime-local"
                value={newCampaign.end_date}
                onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newCampaign.show_countdown}
              onChange={(e) => setNewCampaign({ ...newCampaign, show_countdown: e.target.checked })}
              className="rounded"
            />
            Mostrar contador regressivo
          </label>

          <button
            onClick={addCampaign}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Campanha
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Campanhas ({campaigns.length})
        </h3>

        {campaigns.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nenhuma campanha criada ainda.</p>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const status = getStatus(campaign);
            
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{campaign.name}</h4>
                      <span className={`text-xs font-semibold ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    {campaign.description && (
                      <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                    )}
                    
                    <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-2 rounded-lg mb-3 inline-block">
                      {campaign.banner_text}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Início:</span>{' '}
                        <span className="text-gray-600">
                          {new Date(campaign.start_date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Término:</span>{' '}
                        <span className="text-gray-600">
                          {new Date(campaign.end_date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {campaign.special_price && (
                        <div>
                          <span className="font-semibold text-gray-700">Preço Especial:</span>{' '}
                          <span className="text-green-600 font-bold">
                            R$ {campaign.special_price.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-700">Countdown:</span>{' '}
                        <span className="text-gray-600">
                          {campaign.show_countdown ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta campanha?')) {
                        deleteCampaign(campaign.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => toggleCampaign(campaign.id, campaign.is_active)}
                    className={`px-4 py-2 rounded text-sm font-semibold ${
                      campaign.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {campaign.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
