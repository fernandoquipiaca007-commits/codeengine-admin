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
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            Membros
          </h1>
          <p className="mt-2 text-base text-gray-500">
            {members.length} membros registrados • Gerencie níveis e acessos
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou nível..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-8 rounded-2xl border border-red-100 bg-red-50/50 px-6 py-4 text-sm text-red-800 font-medium backdrop-blur-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {['starter', 'bronze', 'silver', 'gold'].map(level => {
          const count = members.filter(m => (m.member_points?.[0]?.level || 'starter') === level).length;
          return (
            <div key={level} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{level}</div>
              <div className="text-3xl font-black text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Members List - Mobile Card View */}
      <div className="lg:hidden space-y-4 mb-10">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">{search ? 'Nenhum membro encontrado' : 'Nenhum membro registrado'}</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{member.profile_data?.full_name || '—'}</div>
                  <div className="text-xs text-gray-500 truncate">{member.email || member.auth_id.slice(0, 8)}</div>
                </div>
                <button
                  onClick={() => handleExpandMember(member.id)}
                  className={`p-2 rounded-xl transition-colors ${expandedMember === member.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
                >
                  {expandedMember === member.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Nível</div>
                  <select
                    value={member.member_points?.[0]?.level || 'starter'}
                    onChange={(e) => handleUpdateLevel(member.id, e.target.value)}
                    className={`w-full px-2 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${LEVEL_COLORS[member.member_points?.[0]?.level || 'starter'] || LEVEL_COLORS.starter}`}
                  >
                    <option value="starter">Starter</option>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Pontos</div>
                  <div className="text-sm font-bold text-gray-900">{member.member_points?.[0]?.total_points || 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1 font-medium">
                  <span className="uppercase">{member.profile_data?.country || '—'}</span>
                </div>
                <div className="font-medium">
                  {new Date(member.registration_date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Members Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Membro</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nível</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pontos</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">País</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Registo</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-gray-500 font-medium">
                  {search ? 'Nenhum membro encontrado' : 'Nenhum membro registrado'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                  {/* Member Info Row */}
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member.profile_data?.full_name || '—'}</div>
                      <div className="text-sm text-gray-500">{member.email || member.auth_id.slice(0, 8)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.member_points?.[0]?.level || 'starter'}
                      onChange={(e) => handleUpdateLevel(member.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer shadow-sm transition-transform active:scale-95 ${LEVEL_COLORS[member.member_points?.[0]?.level || 'starter'] || LEVEL_COLORS.starter}`}
                    >
                      <option value="starter">Starter</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">{member.member_points?.[0]?.total_points || 0}</td>
                  <td className="px-6 py-4 text-gray-600 font-bold uppercase text-xs tracking-tight">{member.profile_data?.country || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-medium">
                    {new Date(member.registration_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleExpandMember(member.id)}
                      className={`p-2 rounded-xl transition-all ${expandedMember === member.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                      title="Gerir acessos"
                    >
                      {expandedMember === member.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
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
        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-xl shadow-gray-200/50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-500" />
              Acessos Concedidos
            </h3>
            <button
              onClick={() => setShowGrantForm(!showGrantForm)}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl transition-all shadow-lg ${showGrantForm ? 'bg-gray-500' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'}`}
            >
              {showGrantForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showGrantForm ? 'Cancelar' : 'Conceder Acesso'}
            </button>
          </div>

          {/* Grant Form */}
          {showGrantForm && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-4 border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Produto</label>
                  <select
                    value={grantProductId}
                    onChange={(e) => setGrantProductId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="">Selecione...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expira em</label>
                  <input
                    type="date"
                    value={grantExpiresAt}
                    onChange={(e) => setGrantExpiresAt(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Deixe vazio para acesso permanente</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notas</label>
                  <input
                    type="text"
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    placeholder="Ex: Cortesia, parceria..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAddGrant}
                  disabled={!grantProductId}
                  className="px-8 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-100 transition-all active:scale-95"
                >
                  Confirmar Concessão
                </button>
              </div>
            </div>
          )}

          {/* Grants List */}
          {grants.length === 0 ? (
            <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Nenhum acesso manual concedido a este membro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm group hover:border-purple-200 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{g.product_title}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight flex items-center gap-1.5">
                      <span className={g.expires_at ? 'text-amber-600' : 'text-emerald-600'}>
                        {g.expires_at ? `Expira: ${new Date(g.expires_at).toLocaleDateString('pt-BR')}` : 'Permanente'}
                      </span>
                      {g.notes && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="truncate">{g.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeGrant(g.id)}
                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
