import { useState, useEffect } from 'react';
import {
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
  Users as LucideUsers,
  ExternalLink as LucideExternalLink
} from 'lucide-react';

const Plus = LucidePlus as any;
const Trash2 = LucideTrash2 as any;
const Users = LucideUsers as any;
const ExternalLink = LucideExternalLink as any;
import { supabaseAdmin } from '../lib/supabase-admin';

interface Community {
  id: string;
  title: string;
  description: string | null;
  link: string;
  created_at: string;
}

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadCommunities();
  }, []);

  async function loadCommunities() {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCommunities((data as Community[]) || []);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar comunidades.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCommunity(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newLink.trim()) {
      alert('Preencha o título e o link de acesso.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabaseAdmin
        .from('communities')
        .insert({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          link: newLink.trim()
        });
      if (error) throw error;
      
      setNewTitle('');
      setNewDesc('');
      setNewLink('');
      setShowForm(false);
      await loadCommunities();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao adicionar comunidade.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover esta comunidade da plataforma?')) return;
    try {
      const { error } = await supabaseAdmin
        .from('communities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadCommunities();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao deletar comunidade.');
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 font-sans">
      <div className="mb-8 flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-400" />
            Comunidades de Apoio
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gerencie os links de comunidade oficiais exibidos no painel do colaborador</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.25)]"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Adicionar Comunidade
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddCommunity} className="bg-[#0b0c10] border border-white/10 rounded-2xl p-6 mb-8 max-w-2xl space-y-4">
          <h2 className="font-semibold text-sm text-white">Criar Nova Comunidade</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Comunidade de IA & Automação"
                className="w-full rounded-xl bg-[#12131a] border border-white/10 text-white text-xs px-3 py-2 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Uma breve explicação sobre esta comunidade..."
                className="w-full rounded-xl bg-[#12131a] border border-white/10 text-white text-xs px-3 py-2 focus:outline-none focus:border-purple-500 h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Link de Acesso</label>
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full rounded-xl bg-[#12131a] border border-white/10 text-white text-xs px-3 py-2 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-xs font-bold text-white transition-colors"
            >
              {submitting ? 'Adicionando...' : 'Adicionar Comunidade'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <span className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-[#0b0c10] border border-white/10 p-10 text-center text-slate-400 text-xs rounded-2xl">
          Nenhuma comunidade cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm) => (
            <div key={comm.id} className="bg-[#0b0c10] border border-white/10 p-5 rounded-2xl flex flex-col justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm">{comm.title}</h3>
                {comm.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">{comm.description}</p>
                )}
              </div>
              <div className="flex justify-between items-center w-full pt-2 border-t border-white/5">
                <a
                  href={comm.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold"
                >
                  Ver Link <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(comm.id)}
                  className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
