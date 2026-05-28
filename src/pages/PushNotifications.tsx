import { useState } from 'react';
import { AppLocale } from '../types/locale';
import { Bell, Upload, X, Globe, Sparkles } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

type PushType = 'new_product' | 'promotion' | 'new_news' | 'announcement';

// Typesafe bypass for React 18 JSX typing mismatch
const BellIcon = Bell as any;
const UploadIcon = Upload as any;
const XIcon = X as any;
const GlobeIcon = Globe as any;
const SparklesIcon = Sparkles as any;

export default function PushNotifications() {
  const [type, setType] = useState<PushType>('announcement');
  const [payloads, setPayloads] = useState<Record<AppLocale, { title: string; body: string }>>({
    pt: { title: '', body: '' },
    en: { title: '', body: '' },
    fr: { title: '', body: '' },
  });
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const { uploadFile, generatePublicUrl } = await import('../lib/storage');
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `push-notifications/${timestamp}_${sanitizedName}`;
      
      const path = await uploadFile('product-covers', filePath, file);
      const publicUrl = generatePublicUrl('product-covers', path);
      
      setThumbnailUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading cover:', err);
      alert('❌ Erro no upload da imagem:\n\n' + err.message);
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleDeleteImage() {
    if (!confirm('⚠️ Deseja remover esta imagem da notificação?')) return;
    
    try {
      const { deleteFile, extractStoragePathFromUrl } = await import('../lib/storage');
      const path = extractStoragePathFromUrl(thumbnailUrl, 'product-covers');
      if (path) {
        await deleteFile('product-covers', path);
      }
      setThumbnailUrl('');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      // Just clear the state even if the delete fails (e.g. if the image doesn't exist anymore)
      setThumbnailUrl('');
    }
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({ 
          type, 
          payloads, 
          url: url || undefined,
          thumbnailUrl: thumbnailUrl || undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setResult(`Enviado com sucesso para ${data.sent} dispositivos!`);
    } catch (err) {
      setResult(err instanceof Error ? `Erro: ${err.message}` : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden text-gray-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <BellIcon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Notificações Push</h1>
          <p className="text-gray-400 text-sm">Dispare avisos, notícias e promoções em tempo real para os membros da plataforma</p>
        </div>
      </div>

      <div className="space-y-8 bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8 max-w-4xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Notificação</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PushType)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="announcement">📢 Anúncio Geral</option>
              <option value="new_product">🚀 Novo Lançamento</option>
              <option value="promotion">💎 Promoção Especial</option>
              <option value="new_news">📰 Notícia / Conteúdo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Link de Redirecionamento (opcional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sua-plataforma.com/pagina"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Cover / Image uploader */}
        <div className="border-t border-gray-700 pt-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Imagem Ilustrativa (opcional)</label>
          <div className="space-y-4">
            {thumbnailUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50 p-2 max-w-md group">
                <img
                  src={thumbnailUrl}
                  alt="Notification preview"
                  className="w-full h-44 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="absolute top-4 right-4 p-2 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm transition-all hover:scale-105 shadow-md"
                  title="Remover imagem"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-700 hover:border-indigo-500/50 rounded-xl p-8 transition-colors bg-gray-900/10 max-w-md">
                <div className="flex flex-col items-center text-center">
                  <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                  <span className="text-sm font-semibold text-gray-200 mb-1">
                    {uploadingCover ? 'Enviando imagem...' : 'Fazer upload de imagem'}
                  </span>
                  <span className="text-xs text-gray-500 mb-4">PNG, JPG ou WebP até 5MB</span>
                  
                  <label className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-indigo-500/20">
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
            
            {uploadingCover && (
              <div className="flex items-center gap-2 text-sm text-indigo-400">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Fazendo upload para o servidor...
              </div>
            )}
          </div>
        </div>

        {/* Multilingual Payloads */}
        <div className="border-t border-gray-700 pt-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <GlobeIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Conteúdo por Idioma</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['pt', 'en', 'fr'] as AppLocale[]).map((lang) => (
              <fieldset key={lang} className="border border-gray-700 rounded-xl p-5 bg-gray-900/20 hover:border-gray-600/60 transition-colors">
                <legend className="text-xs font-bold text-indigo-400 px-2 uppercase tracking-widest bg-gray-800 rounded border border-gray-700 py-0.5">
                  {lang === 'pt' ? 'Português 🇧🇷' : lang === 'en' ? 'English 🇺🇸' : 'Français 🇫🇷'}
                </legend>
                <div className="space-y-4 mt-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Título da Notificação"
                      value={payloads[lang].title}
                      onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], title: e.target.value } })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Mensagem detalhada..."
                      value={payloads[lang].body}
                      onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], body: e.target.value } })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      rows={3}
                    />
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        {/* Action Button & Result Feedback */}
        <div className="border-t border-gray-700 pt-6 space-y-4">
          <button
            onClick={handleSend}
            disabled={sending || uploadingCover || !payloads.pt.title.trim()}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Disparando Notificações...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Enviar Notificação Push
              </>
            )}
          </button>

          {result && (
            <div className={`p-4 rounded-xl text-center text-sm font-semibold border ${
              result.includes('Erro') 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
