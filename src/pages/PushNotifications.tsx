import { useState, useEffect } from 'react';
import { AppLocale } from '../types/locale';
import { Bell, Upload, X, Globe, Sparkles, Settings, Send, Server, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase-admin';

// Typesafe bypass for React 18 JSX typing mismatch
const BellIcon = Bell as any;
const UploadIcon = Upload as any;
const XIcon = X as any;
const GlobeIcon = Globe as any;
const SparklesIcon = Sparkles as any;
const SettingsIcon = Settings as any;
const SendIcon = Send as any;
const ServerIcon = Server as any;
const MailIcon = Mail as any;
const CheckCircleIcon = CheckCircle as any;
const AlertCircleIcon = AlertCircle as any;

type PushType = 'new_product' | 'promotion' | 'new_news' | 'announcement';

interface SettingsState {
  new_product: { email_enabled: boolean; email_provider: 'n8n' | 'resend'; web_push_enabled: boolean };
  news: { email_enabled: boolean; email_provider: 'n8n' | 'resend'; web_push_enabled: boolean };
  campaign: { email_enabled: boolean; email_provider: 'n8n' | 'resend'; web_push_enabled: boolean };
  forgot_password: { email_enabled: boolean; email_provider: 'n8n' | 'resend' };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotifications() {
  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'browser'>('send');
  
  // Tab 1: Manual Push State
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

  // Tab 2: Channels Settings State
  const [settings, setSettings] = useState<SettingsState>({
    new_product: { email_enabled: false, email_provider: 'n8n', web_push_enabled: true },
    news: { email_enabled: false, email_provider: 'n8n', web_push_enabled: true },
    campaign: { email_enabled: false, email_provider: 'n8n', web_push_enabled: true },
    forgot_password: { email_enabled: true, email_provider: 'resend' }
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingN8n, setTestingN8n] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Tab 3: Admin Browser Alerts & Storage stats
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);

  useEffect(() => {
    void loadSettings();
    void checkSubscription();
    void loadStorageStats();
  }, []);

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-admin.js');
      if (!reg) {
        setIsSubscribed(false);
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (e) {
      console.warn('Error checking SW subscription:', e);
    }
  }

  async function loadStorageStats() {
    setLoadingStorage(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/storage/stats`, {
        headers: {
          'x-admin-key': ADMIN_KEY,
        }
      });
      if (!res.ok) throw new Error('Falha ao buscar dados de armazenamento');
      const data = await res.json();
      setStorageStats(data);
    } catch (e) {
      console.error('Error loading storage stats:', e);
    } finally {
      setLoadingStorage(false);
    }
  }

  async function handleSubscribeAdmin() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      alert('Seu navegador não suporta notificações push.');
      return;
    }

    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permissão de notificação negada.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw-admin.js');
      console.log('SW-Admin registrado:', reg);

      const keyRes = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
      if (!keyRes.ok) throw new Error('Não foi possível obter chave VAPID');
      const { publicKey } = await keyRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const { data: { session } } = await supabaseAdmin.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          browser: navigator.userAgent.slice(0, 100),
          language: 'pt',
          device_id: 'admin-browser',
        }),
      });

      if (!res.ok) throw new Error('Falha ao salvar inscrição no servidor');
      
      setIsSubscribed(true);
      alert('🔔 Navegador inscrito com sucesso para receber alertas do Admin!');
    } catch (err: any) {
      console.error(err);
      alert('❌ Falha ao inscrever navegador:\n\n' + err.message);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribeAdmin() {
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-admin.js');
      if (!reg) return;
      
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${BACKEND_URL}/api/push/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      alert('🔕 Navegador desinscrito com sucesso.');
    } catch (err: any) {
      console.error(err);
      alert('❌ Erro ao desinscrever:\n\n' + err.message);
    } finally {
      setSubscribing(false);
    }
  }

  async function loadSettings() {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('*')
        .eq('key', 'notification_settings')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings({
          new_product: { ...settings.new_product, ...parsed.new_product },
          news: { ...settings.news, ...parsed.news },
          campaign: { ...settings.campaign, ...parsed.campaign },
          forgot_password: { ...settings.forgot_password, ...parsed.forgot_password }
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: 'notification_settings',
          value: JSON.stringify(settings),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('✅ Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('❌ Erro ao salvar configurações:\n\n' + err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function testSend(provider: 'n8n' | 'resend') {
    if (!testEmail.trim()) {
      alert('Por favor, insira um e-mail de destino.');
      return;
    }

    if (provider === 'n8n') setTestingN8n(true);
    else setTestingResend(true);

    setTestResult(null);

    try {
      const { data: member, error: memberErr } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('email', testEmail.trim().toLowerCase())
        .maybeSingle();

      if (memberErr) throw memberErr;
      if (!member) {
        throw new Error('E-mail de destino deve ser um membro cadastrado na plataforma.');
      }

      const { error: queueErr } = await supabaseAdmin
        .from('email_queue')
        .insert({
          member_id: member.id,
          template_key: 'promotion',
          locale: 'pt',
          variables: {
            promo_title: `🧪 Teste de Envio (${provider.toUpperCase()})`,
            promo_message: `Este é um e-mail de teste disparado a partir do Painel de Notificações da CodeEngine Learn. Provedor utilizado: ${provider.toUpperCase()}.\n\nSe você recebeu este e-mail, a integração está funcionando perfeitamente!`
          },
          status: 'pending',
          provider: provider
        });

      if (queueErr) throw queueErr;

      setTestResult(`E-mail de teste enfileirado com sucesso via ${provider.toUpperCase()}! Aguarde a fila processar.`);
    } catch (err: any) {
      console.error(err);
      setTestResult(`Erro: ${err.message || 'Falha ao processar teste'}`);
    } finally {
      setTestingN8n(false);
      setTestingResend(false);
    }
  }

  // Toggle Handlers
  const toggleEmailEnabled = (eventKey: keyof SettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        email_enabled: !prev[eventKey].email_enabled
      }
    }));
  };

  const toggleWebPushEnabled = (eventKey: 'new_product' | 'news' | 'campaign') => {
    setSettings((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        web_push_enabled: !prev[eventKey].web_push_enabled
      }
    }));
  };

  const setProvider = (eventKey: keyof SettingsState, provider: 'n8n' | 'resend') => {
    setSettings((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        email_provider: provider
      }
    }));
  };

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

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <BellIcon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Notificações</h1>
          <p className="text-gray-400 text-sm">Dispare push alerts e configure as regras de envio por canal e provedor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 pb-px mb-8 max-w-4xl">
        <button
          onClick={() => setActiveTab('send')}
          className={`pb-4 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-2 ${
            activeTab === 'send'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <SendIcon className="w-4 h-4" />
          Disparo Manual
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Canais e Provedores
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={`pb-4 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-2 ${
            activeTab === 'browser'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ServerIcon className="w-4 h-4" />
          Alertas do Admin
        </button>
      </div>

      {/* Tab Content: Manual Push */}
      {activeTab === 'send' && (
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
      )}

      {/* Tab Content: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-8 max-w-4xl">
          {loadingSettings ? (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Carregando configurações de notificações...</p>
            </div>
          ) : (
            <>
              {/* Event Cards & Configuration Grid */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8 shadow-xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <ServerIcon className="w-5 h-5 text-indigo-400" />
                    Canais por Tipo de Evento
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Configure quais canais estão ativos para novos eventos e qual provedor enviará os e-mails.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Novos Lançamentos */}
                  <div className="border border-gray-700 bg-gray-900/15 rounded-xl p-5 hover:border-indigo-500/35 transition-colors">
                    <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-1.5">
                      🚀 Novos Lançamentos (new_product)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Canal de E-mail</label>
                        <input
                          type="checkbox"
                          checked={settings.new_product.email_enabled}
                          onChange={() => toggleEmailEnabled('new_product')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                      
                      {settings.new_product.email_enabled && (
                        <div className="pl-4 border-l border-gray-700 space-y-2">
                          <label className="block text-xs text-gray-400">Provedor de E-mail</label>
                          <select
                            value={settings.new_product.email_provider}
                            onChange={(e) => setProvider('new_product', e.target.value as 'n8n' | 'resend')}
                            className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-xs text-white cursor-pointer"
                          >
                            <option value="n8n">n8n / Gmail (Grátis)</option>
                            <option value="resend">Resend (API Key)</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-700/50 pt-3">
                        <label className="text-sm text-gray-300">Web Push Alerts</label>
                        <input
                          type="checkbox"
                          checked={settings.new_product.web_push_enabled}
                          onChange={() => toggleWebPushEnabled('new_product')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Novas Notícias */}
                  <div className="border border-gray-700 bg-gray-900/15 rounded-xl p-5 hover:border-indigo-500/35 transition-colors">
                    <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-1.5">
                      📰 Novas Notícias (news)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Canal de E-mail</label>
                        <input
                          type="checkbox"
                          checked={settings.news.email_enabled}
                          onChange={() => toggleEmailEnabled('news')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                      
                      {settings.news.email_enabled && (
                        <div className="pl-4 border-l border-gray-700 space-y-2">
                          <label className="block text-xs text-gray-400">Provedor de E-mail</label>
                          <select
                            value={settings.news.email_provider}
                            onChange={(e) => setProvider('news', e.target.value as 'n8n' | 'resend')}
                            className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-xs text-white cursor-pointer"
                          >
                            <option value="n8n">n8n / Gmail (Grátis)</option>
                            <option value="resend">Resend (API Key)</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-700/50 pt-3">
                        <label className="text-sm text-gray-300">Web Push Alerts</label>
                        <input
                          type="checkbox"
                          checked={settings.news.web_push_enabled}
                          onChange={() => toggleWebPushEnabled('news')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campanhas e Promoções */}
                  <div className="border border-gray-700 bg-gray-900/15 rounded-xl p-5 hover:border-indigo-500/35 transition-colors">
                    <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-1.5">
                      💎 Campanhas e Promoções (campaign)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Canal de E-mail</label>
                        <input
                          type="checkbox"
                          checked={settings.campaign.email_enabled}
                          onChange={() => toggleEmailEnabled('campaign')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                      
                      {settings.campaign.email_enabled && (
                        <div className="pl-4 border-l border-gray-700 space-y-2">
                          <label className="block text-xs text-gray-400">Provedor de E-mail</label>
                          <select
                            value={settings.campaign.email_provider}
                            onChange={(e) => setProvider('campaign', e.target.value as 'n8n' | 'resend')}
                            className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-xs text-white cursor-pointer"
                          >
                            <option value="n8n">n8n / Gmail (Grátis)</option>
                            <option value="resend">Resend (API Key)</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-700/50 pt-3">
                        <label className="text-sm text-gray-300">Web Push Alerts</label>
                        <input
                          type="checkbox"
                          checked={settings.campaign.web_push_enabled}
                          onChange={() => toggleWebPushEnabled('campaign')}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recuperação de Senha */}
                  <div className="border border-gray-700 bg-gray-900/15 rounded-xl p-5 hover:border-indigo-500/35 transition-colors">
                    <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-1.5">
                      🔑 Recuperação de Senha (forgot_password)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Canal de E-mail (Obrigatório)</label>
                        <input
                          type="checkbox"
                          checked={settings.forgot_password.email_enabled}
                          disabled={true}
                          className="w-4 h-4 text-indigo-500 bg-gray-700 border-gray-700 rounded cursor-not-allowed opacity-60"
                        />
                      </div>
                      
                      <div className="pl-4 border-l border-gray-700 space-y-2">
                        <label className="block text-xs text-gray-400">Provedor de E-mail</label>
                        <select
                          value={settings.forgot_password.email_provider}
                          onChange={(e) => setProvider('forgot_password', e.target.value as 'n8n' | 'resend')}
                          className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-xs text-white cursor-pointer"
                        >
                          <option value="n8n">n8n / Gmail (Grátis)</option>
                          <option value="resend">Resend (API Key)</option>
                        </select>
                      </div>
                      
                      <div className="text-[11px] text-gray-500 italic mt-3 pt-2 border-t border-gray-700/30">
                        * A redefinição de senha sempre requer envio de código (E-mail).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSettings && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Salvar Configurações
                  </button>
                </div>
              </div>

              {/* Providers Info & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <ServerIcon className="w-5 h-5 text-indigo-400" />
                    Servidor n8n VPS
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-700/40">
                      <span className="text-gray-400">Integração:</span>
                      <span className="text-green-400 font-semibold flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" /> Ativo
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-700/40">
                      <span className="text-gray-400">Endpoint:</span>
                      <span className="text-gray-200 font-mono text-xs select-all">n8n-ep3w.srv1739567.hstgr.cloud</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Disparador Gmail:</span>
                      <span className="text-gray-200">codeengine2@gmail.com</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <MailIcon className="w-5 h-5 text-indigo-400" />
                    Serviço Resend API
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-700/40">
                      <span className="text-gray-400">Integração:</span>
                      <span className="text-gray-200 font-semibold flex items-center gap-1">
                        Disponível via Backend
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-700/40">
                      <span className="text-gray-400">Domínio Remetente:</span>
                      <span className="text-gray-300 font-mono text-xs">noreply@codeengine1.com</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Resend API Key:</span>
                      <span className="text-gray-300">Configurada no Servidor</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast Test Box */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8 shadow-xl space-y-6">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-400" />
                    Enviar E-mail de Teste Rápido
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    Insira o e-mail de um membro já cadastrado para testar a comunicação imediata de e-mail.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <input
                        type="email"
                        placeholder="email-membro@gmail.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void testSend('n8n')}
                        disabled={testingN8n || testingResend || !testEmail.trim()}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {testingN8n && (
                          <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        Via n8n (Gmail)
                      </button>
                      <button
                        onClick={() => void testSend('resend')}
                        disabled={testingN8n || testingResend || !testEmail.trim()}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {testingResend && (
                          <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        Via Resend API
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <AlertCircleIcon className="w-3.5 h-3.5 text-gray-500" />
                    O destinatário de teste deve ser um membro cadastrado na plataforma.
                  </p>

                  {testResult && (
                    <div className={`p-4 rounded-xl text-center text-sm font-semibold border ${
                      testResult.includes('Erro') 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                      {testResult}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Admin Browser Alerts & Storage stats */}
      {activeTab === 'browser' && (
        <div className="space-y-8 max-w-4xl">
          {/* Card 1: Push Registration */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-indigo-400" />
                Receber Alertas Administrativos neste Navegador
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                Ao ativar, você receberá notificações push do sistema operacional sempre que novos usuários se registrarem ou o limite de armazenamento (1 GB) for atingido.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-900/40 p-5 rounded-xl border border-gray-700/60">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                <BellIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="text-sm font-semibold text-white">
                  Status: {isSubscribed ? 'Inscrito (Alertas Ativos)' : 'Não Inscrito (Alertas Desativados)'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {isSubscribed 
                    ? 'Este navegador está recebendo notificações administrativas em tempo real.' 
                    : 'Inscreva seu navegador para ser notificado de eventos importantes da plataforma.'}
                </div>
              </div>
              <div>
                {isSubscribed ? (
                  <button
                    onClick={handleUnsubscribeAdmin}
                    disabled={subscribing}
                    className="bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    Desinscrever Navegador
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribeAdmin}
                    disabled={subscribing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {subscribing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Inscrever este Navegador
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Disk & Storage Monitor */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <ServerIcon className="w-5 h-5 text-indigo-400" />
                  Monitor do Armazenamento (Limite: 1.0 GB)
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Acompanhe o tamanho total de arquivos hospedados no Supabase Storage. O sistema alertará automaticamente ao atingir 1.0 GB.
                </p>
              </div>
              <button
                onClick={loadStorageStats}
                disabled={loadingStorage}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
              >
                {loadingStorage ? 'Atualizando...' : 'Recarregar'}
              </button>
            </div>

            {loadingStorage ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Calculando tamanho total de arquivos...</p>
              </div>
            ) : storageStats ? (
              <div className="space-y-6">
                {/* Progress bar container */}
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700/60">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-2xl font-extrabold text-white">
                        {storageStats.totalGB ? storageStats.totalGB.toFixed(3) : '0.000'} GB
                      </span>
                      <span className="text-gray-500 text-xs ml-1">usados de 1.0 GB</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${storageStats.totalGB >= 1.0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                      {storageStats.totalGB >= 1.0 ? '⚠️ Limite Excedido' : '✓ Normal'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 h-3.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${storageStats.totalGB >= 1.0 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}
                      style={{ width: `${Math.min((storageStats.totalGB || 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bucket Breakdown List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Detalhamento por Bucket:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {storageStats.stats?.map((bucket: any) => {
                      const sizeMB = Number(bucket.total_size_bytes || 0) / (1024 * 1024);
                      return (
                        <div key={bucket.bucket_id} className="bg-gray-900/25 p-4 rounded-xl border border-gray-700/50 flex flex-col justify-between">
                          <span className="text-sm font-bold text-gray-200 truncate">{bucket.bucket_id}</span>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">{bucket.file_count} arquivos</span>
                            <span className="text-sm font-semibold text-indigo-400">{sizeMB.toFixed(1)} MB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                Nenhum dado de armazenamento disponível. Clique em recarregar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
