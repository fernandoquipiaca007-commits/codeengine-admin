import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Calendar, TrendingUp, Globe, Heart, Upload, Copy } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase-admin';

// Typesafe bypass for React 18 JSX typing mismatch (TS2786)
const PlusIcon = Plus as any;
const EditIcon = Edit as any;
const TrashIcon = Trash2 as any;
const EyeIcon = Eye as any;
const CalendarIcon = Calendar as any;
const TrendingIcon = TrendingUp as any;
const GlobeIcon = Globe as any;
const HeartIcon = Heart as any;
const UploadIcon = Upload as any;
const CopyIcon = Copy as any;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

const LANGUAGES = ['pt', 'en', 'fr'] as const;
type Lang = typeof LANGUAGES[number];
const LANG_LABELS: Record<Lang, string> = { pt: 'Português', en: 'English', fr: 'Français' };

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
  likes_count?: number;
}

interface NewsTranslation {
  id?: string;
  news_id: string;
  language: Lang;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
}

export function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('pt');
  const [translations, setTranslations] = useState<Record<Lang, Partial<NewsTranslation>>>({
    pt: { title: '', slug: '', excerpt: '', content: '' },
    en: { title: '', slug: '', excerpt: '', content: '' },
    fr: { title: '', slug: '', excerpt: '', content: '' },
  });

  // Form state (PT primary)
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
  const [isFeatured, setIsFeatured] = useState(false);

  // Upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);
  const [sessionImages, setSessionImages] = useState<string[]>([]);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const { uploadFile, generatePublicUrl } = await import('../lib/storage');
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `news-covers/${timestamp}_${sanitizedName}`;
      
      const path = await uploadFile('product-covers', filePath, file);
      const publicUrl = generatePublicUrl('product-covers', path);
      
      setThumbnailUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading cover:', err);
      alert('❌ Erro no upload da capa:\n\n' + err.message);
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleMultipleImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMultiple(true);
    try {
      const { uploadFile, generatePublicUrl } = await import('../lib/storage');
      const uploaded: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `news-body/${timestamp}_${sanitizedName}`;

        const path = await uploadFile('product-covers', filePath, file);
        const publicUrl = generatePublicUrl('product-covers', path);
        uploaded.push(publicUrl);
      }

      setSessionImages(prev => {
        const combined = [...prev];
        uploaded.forEach(url => {
          if (!combined.includes(url)) combined.push(url);
        });
        return combined;
      });
    } catch (err: any) {
      console.error('Error uploading multiple images:', err);
      alert('❌ Erro no upload das imagens:\n\n' + err.message);
    } finally {
      setUploadingMultiple(false);
      if (e.target) e.target.value = '';
    }
  }

  function insertImageIntoContent(url: string) {
    const markdown = `\n\n![Imagem](${url})\n\n`;
    if (activeLang === 'pt') {
      setContent(prev => prev + markdown);
    } else {
      setTranslations(prev => ({
        ...prev,
        [activeLang]: {
          ...prev[activeLang],
          content: (prev[activeLang]?.content || '') + markdown
        }
      }));
    }
    alert('✅ Imagem inserida no final do conteúdo!');
  }

  async function handleDeleteUploadedImage(url: string) {
    if (!confirm('⚠️ Deseja excluir esta imagem do servidor?\n\nIsso removerá a imagem do banco de dados de armazenamento. Certifique-se de que ela não está sendo usada em outro artigo.')) return;

    try {
      const { deleteFile, extractStoragePathFromUrl } = await import('../lib/storage');
      const path = extractStoragePathFromUrl(url, 'product-covers');
      if (path) {
        await deleteFile('product-covers', path);
      }
      setSessionImages(prev => prev.filter(img => img !== url));
      alert('✅ Imagem excluída com sucesso!');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('❌ Erro ao excluir imagem:\n\n' + err.message);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create') {
      setShowForm(true);
      const newUrl = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
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
    setIsFeatured(false);
    setEditingNews(null);
    setShowForm(false);
    setActiveLang('pt');
    setSessionImages([]);
    setTranslations({
      pt: { title: '', slug: '', excerpt: '', content: '' },
      en: { title: '', slug: '', excerpt: '', content: '' },
      fr: { title: '', slug: '', excerpt: '', content: '' },
    });
  }

  async function handleEdit(article: NewsArticle) {
    setEditingNews(article);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt);
    setContent(article.content);
    setThumbnailUrl(article.thumbnail_url || '');
    setCategory(article.category);
    setTags(article.tags.filter(t => t !== 'Destaque').join(', '));
    setAuthor(article.author || 'AI Knowledge Team');
    setStatus(article.status);
    setPublishedAt(article.published_at || '');
    setIsFeatured(article.tags.includes('Destaque'));
    setActiveLang('pt');
    setShowForm(true);

    // Parse existing images from content
    const parsedImages: string[] = [];
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(article.content)) !== null) {
      if (!parsedImages.includes(match[1])) {
        parsedImages.push(match[1]);
      }
    }

    // Load existing translations
    try {
      const { data: trans } = await supabase
        .from('news_translations')
        .select('*')
        .eq('news_id', article.id);

      const map: Record<Lang, Partial<NewsTranslation>> = {
        pt: { title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content },
        en: { title: '', slug: '', excerpt: '', content: '' },
        fr: { title: '', slug: '', excerpt: '', content: '' },
      };
      (trans || []).forEach((t: any) => {
        if (t.language === 'en' || t.language === 'fr') {
          map[t.language as Lang] = { id: t.id, news_id: t.news_id, language: t.language, title: t.title, slug: t.slug, excerpt: t.excerpt || '', content: t.content };
          
          // Parse translation content for images too
          let transMatch;
          while ((transMatch = imageRegex.exec(t.content || '')) !== null) {
            if (!parsedImages.includes(transMatch[1])) {
              parsedImages.push(transMatch[1]);
            }
          }
        }
      });
      setTranslations(map);
      setSessionImages(parsedImages);
    } catch (err) {
      console.error('Error loading news translations:', err);
      setSessionImages(parsedImages);
    }
  }

  async function saveTranslations(newsId: string) {
    for (const lang of (['en', 'fr'] as Lang[])) {
      const t = translations[lang];
      if (!t.title?.trim()) continue; // skip empty translations

      const row = {
        news_id: newsId,
        language: lang,
        title: t.title?.trim() || '',
        slug: t.slug?.trim() || generateSlug(t.title?.trim() || ''),
        excerpt: t.excerpt?.trim() || '',
        content: t.content?.trim() || '',
      };

      const { error } = await supabase
        .from('news_translations')
        .upsert(row, { onConflict: 'news_id,language' });

      if (error) console.error(`Error saving ${lang} translation:`, error);
    }
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
      const filteredTags = tagsArray.filter(t => t !== 'Destaque');
      if (isFeatured) {
        filteredTags.push('Destaque');
      }
      const newsData = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        thumbnail_url: thumbnailUrl?.trim() || null,
        category,
        tags: filteredTags,
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

        // Save EN/FR translations
        await saveTranslations(editingNews.id);
        
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

        // Save EN/FR translations
        if (inserted?.id) {
          await saveTranslations(inserted.id);
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
          <PlusIcon className="w-5 h-5" />
          {showForm ? 'Cancelar' : 'Nova Notícia'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingNews ? 'Editar Notícia' : 'Nova Notícia'}
          </h2>

          {/* Language Tabs */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-700">
            <GlobeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 mr-2">Idioma:</span>
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  // Save current PT fields to translations before switching
                  if (activeLang === 'pt') {
                    setTranslations(prev => ({ ...prev, pt: { ...prev.pt, title, slug, excerpt, content } }));
                  }
                  setActiveLang(lang);
                  // Load fields from translation when switching to PT
                  if (lang === 'pt') {
                    const pt = translations.pt;
                    if (pt.title) setTitle(pt.title);
                    if (pt.slug) setSlug(pt.slug);
                    if (pt.excerpt) setExcerpt(pt.excerpt);
                    if (pt.content) setContent(pt.content);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeLang === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {LANG_LABELS[lang]}
                {lang !== 'pt' && translations[lang]?.title?.trim() && (
                  <span className="ml-1 text-green-400">✓</span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Título ({activeLang.toUpperCase()}) *
                </label>
                <input
                  type="text"
                  value={activeLang === 'pt' ? title : (translations[activeLang]?.title || '')}
                  onChange={(e) => {
                    if (activeLang === 'pt') {
                      handleTitleChange(e.target.value);
                    } else {
                      setTranslations(prev => ({
                        ...prev,
                        [activeLang]: { ...prev[activeLang], title: e.target.value, slug: prev[activeLang]?.slug || generateSlug(e.target.value) }
                      }));
                    }
                  }}
                  placeholder={activeLang === 'pt' ? 'Ex: Nova Era da Inteligência Artificial' : `Title in ${LANG_LABELS[activeLang]}`}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required={activeLang === 'pt'}
                />
                {activeLang === 'pt' && <p className="text-xs text-gray-400 mt-1">O slug será gerado automaticamente</p>}
                {activeLang !== 'pt' && <p className="text-xs text-gray-400 mt-1">Deixe vazio para usar o conteúdo em Português como fallback</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slug ({activeLang.toUpperCase()}) * <span className="text-gray-500">(URL amigável)</span>
                </label>
                <input
                  type="text"
                  value={activeLang === 'pt' ? slug : (translations[activeLang]?.slug || '')}
                  onChange={(e) => {
                    if (activeLang === 'pt') {
                      setSlug(e.target.value);
                    } else {
                      setTranslations(prev => ({
                        ...prev,
                        [activeLang]: { ...prev[activeLang], slug: e.target.value }
                      }));
                    }
                  }}
                  placeholder="nova-era-inteligencia-artificial"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required={activeLang === 'pt'}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notícia em Destaque?
                </label>
                <select
                  value={isFeatured ? 'yes' : 'no'}
                  onChange={(e) => setIsFeatured(e.target.value === 'yes')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="no">Normal</option>
                  <option value="yes">Em Destaque (Fica no topo)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Artigos em destaque aparecem no carrossel e no topo da página</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/20 border border-gray-700/60 rounded-xl p-4 sm:p-5">
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
                  Fazer Upload da Capa (Thumbnail)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 file:cursor-pointer"
                  />
                  {uploadingCover && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WebP até 5MB</p>
              </div>
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
                Resumo ({activeLang.toUpperCase()}) * <span className="text-gray-500">(aparece nos cards)</span>
              </label>
              <textarea
                value={activeLang === 'pt' ? excerpt : (translations[activeLang]?.excerpt || '')}
                onChange={(e) => {
                  if (activeLang === 'pt') {
                    setExcerpt(e.target.value);
                  } else {
                    setTranslations(prev => ({
                      ...prev,
                      [activeLang]: { ...prev[activeLang], excerpt: e.target.value }
                    }));
                  }
                }}
                rows={3}
                placeholder={activeLang === 'pt' ? 'Descrição curta que aparecerá nos cards de notícias...' : `Short summary in ${LANG_LABELS[activeLang]}`}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required={activeLang === 'pt'}
              />
              <p className="text-xs text-gray-400 mt-1">Máximo recomendado: 150 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Conteúdo ({activeLang.toUpperCase()}) * <span className="text-gray-500">(suporta Markdown)</span>
              </label>
              <textarea
                value={activeLang === 'pt' ? content : (translations[activeLang]?.content || '')}
                onChange={(e) => {
                  if (activeLang === 'pt') {
                    setContent(e.target.value);
                  } else {
                    setTranslations(prev => ({
                      ...prev,
                      [activeLang]: { ...prev[activeLang], content: e.target.value }
                    }));
                  }
                }}
                rows={10}
                placeholder="# Título Principal&#10;&#10;Seu conteúdo aqui...&#10;&#10;## Subtítulo&#10;&#10;- Item 1&#10;- Item 2"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                required={activeLang === 'pt'}
              />
              <p className="text-xs text-gray-400 mt-1">Use Markdown para formatação: # para títulos, ** para negrito, - para listas</p>
            </div>

            {/* Imagens do Artigo Section */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Galeria de Imagens do Artigo</h3>
                  <p className="text-xs text-gray-400">Faça upload de múltiplas imagens para usar no corpo da sua notícia.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleImagesUpload}
                    disabled={uploadingMultiple}
                    id="multiple-images-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="multiple-images-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {uploadingMultiple ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Carregando...</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="w-4 h-4" />
                        <span>Fazer Upload de Imagens</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {sessionImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-700/60">
                  {sessionImages.map((url, i) => (
                    <div key={i} className="group relative bg-gray-800 border border-gray-700 rounded-lg overflow-hidden aspect-video flex flex-col justify-between">
                      <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`![Imagem](${url})`);
                            alert('📋 Link formatado em Markdown copiado!');
                          }}
                          className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-blue-400 hover:text-white"
                          title="Copiar Markdown"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertImageIntoContent(url)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white"
                          title="Inserir no Conteúdo"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUploadedImage(url)}
                          className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white"
                          title="Excluir Imagem"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                Likes
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
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
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
                        <div className="flex items-center gap-2 font-semibold text-white">
                          <span>{article.title}</span>
                          {article.tags?.includes('Destaque') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                              ★ Destaque
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 line-clamp-1">{article.excerpt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                      <TrendingIcon className="w-3 h-3" />
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
                      <EyeIcon className="w-4 h-4" />
                      <span>{article.views}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-red-400 font-semibold">
                      <HeartIcon className="w-4 h-4 fill-current" />
                      <span>{article.likes_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <CalendarIcon className="w-4 h-4" />
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
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
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
