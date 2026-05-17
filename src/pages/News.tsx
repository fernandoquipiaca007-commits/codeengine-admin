import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Calendar, TrendingUp } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase-admin';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnail_url: string | null;
  category: string;
  tags: string[];
  author: string | null;
  published_at: string | null;
  status: 'draft' | 'published' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
}

export function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('AI');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('AI Knowledge Team');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Tabela "news" não encontrada. Execute o SQL de criação das tabelas primeiro.');
        }
        throw error;
      }

      setNews(data || []);
    } catch (error: any) {
      console.error('Error loading news:', error);
      
      let errorMessage = '❌ Erro ao carregar notícias:\n\n';
      
      if (error.message.includes('não encontrada')) {
        errorMessage += error.message + '\n\n';
        errorMessage += '📋 Solução:\n';
        errorMessage += '1. Abra o Supabase SQL Editor\n';
        errorMessage += '2. Execute o arquivo: supabase/news-system-safe.sql\n';
        errorMessage += '3. Recarregue esta página';
      } else if (error.code === '42501') {
        errorMessage += '• Sem permissão para acessar notícias\n\n';
        errorMessage += '📋 Solução:\n';
        errorMessage += '1. Verifique as políticas RLS no Supabase\n';
        errorMessage += '2. Certifique-se de estar autenticado';
      } else {
        errorMessage += `• ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (!editingNews) {
      setSlug(generateSlug(newTitle));
    }
  }

  function resetForm() {
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setThumbnailUrl('');
    setCategory('AI');
    setTags('');
    setAuthor('AI Knowledge Team');
    setStatus('draft');
    setPublishedAt('');
    setEditingNews(null);
    setShowForm(false);
  }

  function handleEdit(article: NewsArticle) {
    setEditingNews(article);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt);
    setContent(article.content);
    setThumbnailUrl(article.thumbnail_url || '');
    setCategory(article.category);
    setTags(article.tags.join(', '));
    setAuthor(article.author || 'AI Knowledge Team');
    setStatus(article.status);
    setPublishedAt(article.published_at || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validação detalhada dos campos
    const errors: string[] = [];
    
    if (!title || title.trim() === '') {
      errors.push('• Título é obrigatório');
    }
    
    if (!slug || slug.trim() === '') {
      errors.push('• Slug é obrigatório');
    }
    
    if (!excerpt || excerpt.trim() === '') {
      errors.push('• Resumo é obrigatório');
    }
    
    if (!content || content.trim() === '') {
      errors.push('• Conteúdo é obrigatório');
    }
    
    if (!category) {
      errors.push('• Categoria é obrigatória');
    }

    if (errors.length > 0) {
      alert('❌ Campos obrigatórios não preenchidos:\n\n' + errors.join('\n') + '\n\nPreencha todos os campos marcados com * antes de continuar.');
      return;
    }

    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const newsData = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        thumbnail_url: thumbnailUrl?.trim() || null,
        category,
        tags: tagsArray,
        author: author?.trim() || null,
        status,
        published_at: status === 'published' && !publishedAt ? new Date().toISOString() : publishedAt || null,
      };

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingNews.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error('Este slug já está em uso. Escolha um slug diferente.');
          }
          throw error;
        }
        
        alert('✅ Notícia atualizada com sucesso!\n\n' + 
              (status === 'published' 
                ? '📧 Notificações e emails foram enviados para todos os membros.' 
                : '📝 A notícia foi salva como rascunho.'));
      } else {
        const { data: inserted, error } = await supabase
          .from('news')
          .insert([newsData])
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('Este slug já está em uso. Escolha um slug diferente.');
          }
          throw error;
        }

        // Send email notifications if published
        if (status === 'published' && inserted?.id) {
          try {
            await fetch(`${BACKEND_URL}/api/admin/notify-news`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
              body: JSON.stringify({ news_id: inserted.id, title: newsData.title, summary: newsData.excerpt }),
            });
          } catch (notifyErr) {
            console.error('Notify error (non-blocking):', notifyErr);
          }
        }
        
        alert('✅ Notícia criada com sucesso!\n\n' + 
              (status === 'published' 
                ? '📧 Notificações e emails foram enviados para todos os membros.' 
                : '📝 A notícia foi salva como rascunho.'));
      }

      resetForm();
      loadNews();
    } catch (error: any) {
      console.error('Error saving news:', error);
      
      let errorMessage = '❌ Erro ao salvar notícia:\n\n';
      
      if (error.message.includes('slug')) {
        errorMessage += '• O slug informado já está em uso\n';
        errorMessage += '• Solução: Altere o campo "Slug" para um valor único\n';
        errorMessage += '• Exemplo: adicione um número ou data ao final';
      } else if (error.code === '23503') {
        errorMessage += '• Erro de referência no banco de dados\n';
        errorMessage += '• Verifique se todas as tabelas necessárias existem';
      } else if (error.code === '42501') {
        errorMessage += '• Sem permissão para realizar esta operação\n';
        errorMessage += '• Verifique as políticas RLS no Supabase';
      } else if (error.message.includes('JWT')) {
        errorMessage += '• Sessão expirada\n';
        errorMessage += '• Solução: Recarregue a página e tente novamente';
      } else {
        errorMessage += `• ${error.message}\n`;
        errorMessage += '\n💡 Dica: Verifique o console do navegador para mais detalhes';
      }
      
      alert(errorMessage);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('⚠️ Tem certeza que deseja excluir esta notícia?\n\nEsta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          throw new Error('Não é possível excluir esta notícia pois existem visualizações associadas.');
        }
        throw error;
      }

      alert('✅ Notícia excluída com sucesso!');
      loadNews();
    } catch (error: any) {
      console.error('Error deleting news:', error);
      
      let errorMessage = '❌ Erro ao excluir notícia:\n\n';
      
      if (error.message.includes('visualizações')) {
        errorMessage += error.message;
      } else if (error.code === '42501') {
        errorMessage += '• Sem permissão para excluir\n';
        errorMessage += '• Verifique as políticas RLS no Supabase';
      } else {
        errorMessage += `• ${error.message}`;
      }
      
      alert(errorMessage);
    }
  }

  const categories = ['AI', 'Automação', 'SaaS', 'Programação', 'Produtividade', 'Inovação', 'Tendências'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400';
      case 'draft': return 'bg-yellow-500/20 text-yellow-400';
      case 'archived': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Rascunho';
      case 'archived': return 'Arquivado';
      default: return status;
    }
  };

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Notícias</h1>
          <p className="text-gray-400">Gerencie notícias e atualizações da plataforma</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          {showForm ? 'Cancelar' : 'Nova Notícia'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {editingNews ? 'Editar Notícia' : 'Nova Notícia'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Nova Era da Inteligência Artificial"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">O slug será gerado automaticamente</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slug * <span className="text-gray-500">(URL amigável)</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nova-era-inteligencia-artificial"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números e hífens</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="draft">Rascunho (não visível)</option>
                  <option value="published">Publicado (envia notificações)</option>
                  <option value="archived">Arquivado</option>
                </select>
                {status === 'published' && (
                  <p className="text-xs text-yellow-400 mt-1">⚠️ Ao publicar, todos os membros receberão notificação</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Autor
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="AI Knowledge Team"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt ? new Date(publishedAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Deixe vazio para usar data atual</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL da Thumbnail <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Recomendado: 800x600px ou maior</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags <span className="text-gray-500">(separadas por vírgula)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="IA, Tecnologia, Automação"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resumo * <span className="text-gray-500">(aparece nos cards)</span>
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="Descrição curta que aparecerá nos cards de notícias..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Máximo recomendado: 150 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Conteúdo * <span className="text-gray-500">(suporta Markdown)</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="# Título Principal&#10;&#10;Seu conteúdo aqui...&#10;&#10;## Subtítulo&#10;&#10;- Item 1&#10;- Item 2"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Use Markdown para formatação: # para títulos, ** para negrito, - para listas</p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {editingNews ? 'Atualizar' : 'Criar'} Notícia
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* News List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Notícia
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {news.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Nenhuma notícia cadastrada
                </td>
              </tr>
            ) : (
              news.map((article) => (
                <tr key={article.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {article.thumbnail_url && (
                        <img
                          src={article.thumbnail_url}
                          alt={article.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-white">{article.title}</div>
                        <div className="text-sm text-gray-400 line-clamp-1">{article.excerpt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      {article.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(article.status)}`}>
                      {getStatusLabel(article.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Eye className="w-4 h-4" />
                      <span>{article.views}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      {article.published_at
                        ? new Date(article.published_at).toLocaleDateString('pt-BR')
                        : 'Não publicado'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(article)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
