import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_highlighted: boolean;
  is_expanded_by_default: boolean;
}

interface FAQManagerProps {
  productId: string;
}

export function FAQManager({ productId }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });

  useEffect(() => {
    loadFAQs();
  }, [productId]);

  async function loadFAQs() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_faqs')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addFAQ() {
    if (!newFAQ.question || !newFAQ.answer) return;

    try {
      const { error } = await supabaseAdmin
        .from('product_faqs')
        .insert({
          product_id: productId,
          question: newFAQ.question,
          answer: newFAQ.answer,
          display_order: faqs.length,
        });

      if (error) throw error;
      setNewFAQ({ question: '', answer: '' });
      loadFAQs();
    } catch (error) {
      console.error('Error adding FAQ:', error);
    }
  }

  async function deleteFAQ(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
    }
  }

  async function updateFAQ(id: string, updates: Partial<FAQ>) {
    try {
      const { error } = await supabaseAdmin
        .from('product_faqs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      loadFAQs();
    } catch (error) {
      console.error('Error updating FAQ:', error);
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index - 1]] = [newFaqs[index - 1], newFaqs[index]];
    await reorderFAQs(newFaqs);
  }

  async function moveDown(index: number) {
    if (index === faqs.length - 1) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    await reorderFAQs(newFaqs);
  }

  async function reorderFAQs(newFaqs: FAQ[]) {
    try {
      const updates = newFaqs.map((faq, index) => ({
        id: faq.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabaseAdmin
          .from('product_faqs')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      loadFAQs();
    } catch (error) {
      console.error('Error reordering FAQs:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Nova Pergunta</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pergunta
            </label>
            <input
              type="text"
              value={newFAQ.question}
              onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
              placeholder="Ex: Como funciona o acesso?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resposta
            </label>
            <textarea
              value={newFAQ.answer}
              onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
              placeholder="Ex: O acesso é vitalício e imediato após a compra..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={addFAQ}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar FAQ
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Perguntas ({faqs.length})
        </h3>

        {faqs.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nenhuma pergunta adicionada ainda.</p>
          </div>
        ) : (
          faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === faqs.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  {editingId === faq.id ? (
                    <>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = faqs.map((f) =>
                            f.id === faq.id ? { ...f, question: e.target.value } : f
                          );
                          setFaqs(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = faqs.map((f) =>
                            f.id === faq.id ? { ...f, answer: e.target.value } : f
                          );
                          setFaqs(updated);
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            updateFAQ(faq.id, {
                              question: faq.question,
                              answer: faq.answer,
                            });
                            setEditingId(null);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            loadFAQs();
                            setEditingId(null);
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-900">{faq.question}</h4>
                      <p className="text-gray-600 text-sm">{faq.answer}</p>
                      
                      <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={faq.is_highlighted}
                            onChange={(e) =>
                              updateFAQ(faq.id, { is_highlighted: e.target.checked })
                            }
                            className="rounded"
                          />
                          Destacar
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={faq.is_expanded_by_default}
                            onChange={(e) =>
                              updateFAQ(faq.id, {
                                is_expanded_by_default: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          Expandido por padrão
                        </label>

                        <button
                          onClick={() => setEditingId(faq.id)}
                          className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
                      deleteFAQ(faq.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
