import { useState, useEffect } from 'react';
import {
  Users as LucideUsers,
  Gift as LucideGift,
  Search as LucideSearch,
  ChevronDown as LucideChevronDown,
  ChevronUp as LucideChevronUp,
  X as LucideX,
  Plus as LucidePlus
} from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase-admin';

// Typesafe Lucide Bypasses
const Users = LucideUsers as any;
const Gift = LucideGift as any;
const Search = LucideSearch as any;
const ChevronDown = LucideChevronDown as any;
const ChevronUp = LucideChevronUp as any;
const X = LucideX as any;
const Plus = LucidePlus as any;

interface Member {
  id: string;
  auth_id: string;
  email: string | null;
  registration_date: string;
  profile_data: { full_name?: string; country?: string; [key: string]: any } | null;
  member_points?: Array<{
    total_points: number;
    level: string;
  }>;
}

interface MemberGrant {
  id: string;
  member_id: string;
  product_id: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  product_title?: string;
}

interface ProductOption {
  id: string;
  title: string;
}

const LEVEL_COLORS: Record<string, string> = {
  starter: 'bg-gray-500/20 text-gray-400',
  bronze: 'bg-amber-700/20 text-amber-500',
  silver: 'bg-gray-300/20 text-gray-300',
  gold: 'bg-yellow-500/20 text-yellow-400',
  platinum: 'bg-purple-500/20 text-purple-400',
  diamond: 'bg-cyan-400/20 text-cyan-400',
};

export function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [grants, setGrants] = useState<MemberGrant[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantProductId, setGrantProductId] = useState('');
  const [grantNotes, setGrantNotes] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    loadProducts();
  }, []);

  async function loadMembers() {
    try {
      setErrorMessage(null);
      const { data, error } = await supabase
        .from('members')
        .select('*, member_points(total_points, level)')
        .order('registration_date', { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error loading members:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar membros.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, title')
        .eq('status', 'active')
        .order('title');
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setErrorMessage('Falha ao carregar produtos ativos para concessão de acesso.');
    }
  }

  async function loadGrants(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('member_grants')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with product titles
      const enriched = (data || []).map((g: any) => {
        const prod = products.find(p => p.id === g.product_id);
        return { ...g, product_title: prod?.title || g.product_id };
      });

      setGrants(enriched);
    } catch (err) {
      console.error('Error loading grants:', err);
      setGrants([]);
      setErrorMessage('Falha ao carregar acessos do membro.');
    }
  }

  async function handleExpandMember(memberId: string) {
    if (expandedMember === memberId) {
      setExpandedMember(null);
      setGrants([]);
      setShowGrantForm(false);
      return;
    }
    setExpandedMember(memberId);
    setShowGrantForm(false);
    await loadGrants(memberId);
  }

  async function handleAddGrant() {
    if (!expandedMember || !grantProductId) return;

    try {
      const { error } = await supabase
        .from('member_grants')
        .upsert({
          member_id: expandedMember,
          product_id: grantProductId,
          expires_at: grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null,
          notes: grantNotes.trim() || null,
        }, { onConflict: 'member_id,product_id' });

      if (error) throw error;

      alert('✅ Acesso concedido com sucesso!');
      setShowGrantForm(false);
      setGrantProductId('');
      setGrantNotes('');
      setGrantExpiresAt('');
      await loadGrants(expandedMember);
    } catch (err: any) {
      console.error('Error granting access:', err);
      alert(`❌ Erro ao conceder acesso: ${err.message}`);
      setErrorMessage(err.message || 'Erro ao conceder acesso.');
    }
  }

  async function handleRevokeGrant(grantId: string) {
    if (!confirm('Tem certeza que deseja revogar este acesso?')) return;

    try {
      const { error } = await supabase
        .from('member_grants')
        .delete()
        .eq('id', grantId);

      if (error) throw error;

      alert('✅ Acesso revogado.');
      if (expandedMember) await loadGrants(expandedMember);
    } catch (err: any) {
      console.error('Error revoking grant:', err);
      alert(`❌ Erro: ${err.message}`);
      setErrorMessage(err.message || 'Erro ao revogar acesso.');
    }
  }

  async function handleUpdateLevel(memberId: string, newLevel: string) {
    try {
      const { error } = await supabase
        .from('member_points')
        .upsert({ 
          member_id: memberId, 
          level: newLevel, 
          level_updated_at: new Date().toISOString() 
        }, { onConflict: 'member_id' });

      if (error) throw error;
      setMembers(members.map(m => {
        if (m.id === memberId) {
          const currentPoints = m.member_points || [{ total_points: 0, level: 'starter' }];
          return {
            ...m,
            member_points: [{ ...currentPoints[0], level: newLevel }]
          };
        }
        return m;
      }));
    } catch (err: any) {
      console.error('Error updating level:', JSON.stringify(err, null, 2));
      alert(`❌ Erro: ${err.message || JSON.stringify(err)}`);
      setErrorMessage(err.message || 'Erro ao atualizar nível do membro.');
    }
  }

  const filteredMembers = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = m.profile_data?.full_name || '';
    const level = m.member_points?.[0]?.level || 'starter';
    const country = m.profile_data?.country || '';
    return (
      fullName.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      level.toLowerCase().includes(q) ||
      country.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" />
            Membros
          </h1>
          <p className="text-gray-400">
            {members.length} membros registrados • Gerencie níveis e acessos
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou nível..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {['starter', 'bronze', 'silver', 'gold'].map(level => {
          const count = members.filter(m => (m.member_points?.[0]?.level || 'starter') === level).length;
          return (
            <div key={level} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400 capitalize mb-1">{level}</div>
              <div className="text-2xl font-bold text-white">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Members Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Membro</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nível</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pontos</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">País</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Registo</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {search ? 'Nenhum membro encontrado' : 'Nenhum membro registrado'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className="group">
                  {/* Member Info Row */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-white">{member.profile_data?.full_name || '—'}</div>
                      <div className="text-sm text-gray-400">{member.email || member.auth_id.slice(0, 8)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.member_points?.[0]?.level || 'starter'}
                      onChange={(e) => handleUpdateLevel(member.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${LEVEL_COLORS[member.member_points?.[0]?.level || 'starter'] || LEVEL_COLORS.starter}`}
                    >
                      <option value="starter">Starter</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{member.member_points?.[0]?.total_points || 0}</td>
                  <td className="px-6 py-4 text-gray-300 uppercase text-sm">{member.profile_data?.country || '—'}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(member.registration_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleExpandMember(member.id)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Gerir acessos"
                    >
                      {expandedMember === member.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Grants Panel */}
      {expandedMember && (
        <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              Acessos concedidos
            </h3>
            <button
              onClick={() => setShowGrantForm(!showGrantForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Conceder acesso
            </button>
          </div>

          {/* Grant Form */}
          {showGrantForm && (
            <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Produto</label>
                  <select
                    value={grantProductId}
                    onChange={(e) => setGrantProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="">Selecione...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Expira em</label>
                  <input
                    type="date"
                    value={grantExpiresAt}
                    onChange={(e) => setGrantExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Vazio = permanente</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notas</label>
                  <input
                    type="text"
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    placeholder="Ex: Cortesia, parceria..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowGrantForm(false)}
                  className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddGrant}
                  disabled={!grantProductId}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Grants List */}
          {grants.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum acesso manual concedido a este membro.</p>
          ) : (
            <div className="space-y-2">
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{g.product_title}</div>
                    <div className="text-xs text-gray-400">
                      {g.expires_at
                        ? `Expira: ${new Date(g.expires_at).toLocaleDateString('pt-BR')}`
                        : 'Permanente'}
                      {g.notes && ` • ${g.notes}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeGrant(g.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Revogar acesso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
