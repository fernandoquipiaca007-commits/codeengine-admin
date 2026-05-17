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
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Push Notifications</h1>

      <div className="space-y-6 bg-white rounded-lg shadow p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
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

        {(['pt', 'en', 'fr'] as AppLocale[]).map((lang) => (
          <fieldset key={lang} className="border border-gray-200 rounded-lg p-4">
            <legend className="text-sm font-semibold text-gray-700 px-2 uppercase">{lang}</legend>
            <input
              type="text"
              placeholder="Título"
              value={payloads[lang].title}
              onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], title: e.target.value } })}
              className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 mb-2"
            />
            <textarea
              placeholder="Mensagem"
              value={payloads[lang].body}
              onChange={(e) => setPayloads({ ...payloads, [lang]: { ...payloads[lang], body: e.target.value } })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={2}
            />
          </fieldset>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL (opcional)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? 'Enviando...' : 'Enviar notificação'}
        </button>

        {result && (
          <p className={`text-sm ${result.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{result}</p>
        )}
      </div>
    </div>
  );
}
