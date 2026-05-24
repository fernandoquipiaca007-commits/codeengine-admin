import { useState, useEffect } from 'react';
import {
  Plus as LucidePlus,
  Trash2 as LucideTrash2
} from 'lucide-react';

const Plus = LucidePlus as any;
const Trash2 = LucideTrash2 as any;
import { supabaseAdmin } from '../../lib/supabase-admin';

interface Campaign {
  id: string;
  campaign_type: string;
  title: string;
  description: string | null;
  badge_text: string | null;
  badge_color: string | null;
  special_price: number | null;
  discount_percentage: number | null;
  countdown_enabled: boolean;
  countdown_end_date: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

interface CampaignsManagerProps {
  productId: string;
}

const CAMPAIGN_TYPES = [
  { value: 'custom', label: 'Personalizada' },
  { value: 'flash_sale', label: 'Flash Sale' },
  { value: 'special_promo', label: 'Promoção Especial' },
  { value: 'black_friday', label: 'Black Friday' },
  { value: 'event', label: 'Evento' },
];

export function CampaignsManager({ productId }: CampaignsManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({
    campaign_type: 'custom',
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
          campaign_type: newCampaign.campaign_type,
          title: newCampaign.name,
          description: newCampaign.description || null,
          badge_text: newCampaign.banner_text,
          badge_color: '#ffffff',
          special_price: newCampaign.special_price,
          countdown_enabled: newCampaign.show_countdown,
          countdown_end_date: newCampaign.show_countdown && newCampaign.end_date
            ? new Date(newCampaign.end_date).toISOString()
            : null,
          is_active: true,
          valid_from: new Date(newCampaign.start_date).toISOString(),
          valid_until: newCampaign.end_date ? new Date(newCampaign.end_date).toISOString() : null,
        });

      if (error) throw error;

      setNewCampaign({
        campaign_type: 'custom',
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

  function getCampaignStatus(campaign: Campaign): { text: string; color: string } {
    const now = new Date();
    const start = new Date(campaign.valid_from);
    const end = campaign.valid_until ? new Date(campaign.valid_until) : null;

    if (!campaign.is_active) return { text: 'Inativa', color: 'bg-gray-100 text-gray-600' };
    if (now < start) return { text: 'Agendada', color: 'bg-blue-100 text-blue-700' };
    if (end && now > end) return { text: 'Encerrada', color: 'bg-red-100 text-red-700' };
    return { text: 'Ativa', color: 'bg-green-100 text-green-700' };
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando campanhas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Nova Campanha</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Campanha *
              </label>
              <select
                value={newCampaign.campaign_type}
                onChange={(e) => setNewCampaign({ ...newCampaign, campaign_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Campanha *
              </label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="Ex: Promoção de Verão"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Texto do Banner *
            </label>
            <input
              type="text"
              value={newCampaign.banner_text}
              onChange={(e) => setNewCampaign({ ...newCampaign, banner_text: e.target.value })}
              placeholder="Ex: OFERTA ESPECIAL — 50% OFF"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Especial (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCampaign.special_price ?? ''}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    special_price: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="Ex: 49.90"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início *
              </label>
              <input
                type="datetime-local"
                value={newCampaign.start_date}
                onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Término *
              </label>
              <input
                type="datetime-local"
                value={newCampaign.end_date}
                onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
            + Criar Campanha
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Campanhas ({campaigns.length})
        </h3>

        {campaigns.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">Nenhuma campanha criada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const status = getCampaignStatus(campaign);
              const typelabel = CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type)?.label || campaign.campaign_type;
              return (
                <div key={campaign.id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{campaign.title}</h4>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {typelabel}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      {campaign.badge_text && (
                        <p className="text-sm text-gray-600 mt-1">Banner: {campaign.badge_text}</p>
                      )}
                      {campaign.description && (
                        <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                        <span>Início: {new Date(campaign.valid_from).toLocaleDateString('pt-BR')}</span>
                        {campaign.valid_until && (
                          <span>Fim: {new Date(campaign.valid_until).toLocaleDateString('pt-BR')}</span>
                        )}
                        {campaign.special_price != null && (
                          <span className="text-green-600 font-medium">Preço especial: $ {campaign.special_price}</span>
                        )}
                        {campaign.countdown_enabled && (
                          <span className="text-orange-500">⏱ Contador ativo</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCampaign(campaign.id, campaign.is_active)}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                          campaign.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {campaign.is_active ? 'Ativa' : 'Inativa'}
                      </button>
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
