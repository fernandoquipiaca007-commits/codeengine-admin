import { useState } from 'react';
import { AppLocale } from '../types/locale';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

type PushType = 'new_product' | 'promotion' | 'new_news' | 'announcement';

export default function PushNotifications() {
  const [type, setType] = useState<PushType>('announcement');
  const [payloads, setPayloads] = useState<Record<AppLocale, { title: string; body: string }>>({
    pt: { title: '', body: '' },
    en: { title: '', body: '' },
    fr: { title: '', body: '' },
  });
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
        body: JSON.stringify({ type, payloads, url: url || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setResult(`Enviado para ${data.sent} dispositivos`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          Push Notifications
        </h1>
        <p className="mt-2 text-base text-gray-500">Envie notificações para todos os dispositivos registrados</p>
      </div>

      <div className="max-w-3xl space-y-8 bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Notificação</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PushType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="announcement">Anúncio geral</option>
            <option value="new_product">Novo lançamento</option>
            <option value="promotion">Promoção</option>
            <option value="new_news">Notícia</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(['pt', 'en', 'fr'] as AppLocale[]).map((lang) => (
            <fieldset key={lang} className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50">
              <legend className="text-xs font-black text-primary-600 bg-white px-3 py-1 rounded-full border border-gray-100 uppercase tracking-widest">{lang}</legend>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título</label>
                  <input
                    type="text"
                    placeholder="Título da notificação"
                    value={payloads[lang].title}
                    onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], title: e.target.value } })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corpo da Mensagem</label>
                  <textarea
                    placeholder="Conteúdo da notificação..."
                    value={payloads[lang].body}
                    onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], body: e.target.value } })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    rows={2}
                  />
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL de Destino (opcional)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://codeengine.com/..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {sending && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {sending ? 'Enviando Notificações...' : 'Disparar Notificação'}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-xl border font-bold text-center text-sm ${result.includes('Erro') ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
