import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface CustomSection {
  id: string;
  section_type: string;
  title: string;
  content: any;
  display_order: number;
  is_visible: boolean;
}

interface CustomSectionsManagerProps {
  productId: string;
}

export function CustomSectionsManager({ productId }: CustomSectionsManagerProps) {
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({
    section_type: 'text',
    title: '',
    content: { text: '', html: '' },
  });

  useEffect(() => {
    loadSections();
  }, [productId]);

  async function loadSections() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_custom_sections')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addSection() {
    if (!newSection.title) {
      alert('Preencha o título da seção');
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('product_custom_sections')
        .insert({
          product_id: productId,
          section_type: newSection.section_type,
          title: newSection.title,
          content: newSection.content,
          display_order: sections.length,
          is_visible: true,
        });

      if (error) throw error;
      
      setNewSection({
        section_type: 'text',
        title: '',
        content: { text: '', html: '' },
      });
      
      loadSections();
    } catch (error: any) {
      console.error('Error adding section:', error);
      alert(`Erro ao criar seção: ${error.message}`);
    }
  }

  async function deleteSection(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_custom_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSections();
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  }

  async function updateSection(id: string, updates: Partial<CustomSection>) {
    try {
      const { error } = await supabaseAdmin
        .from('product_custom_sections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      loadSections();
    } catch (error) {
      console.error('Error updating section:', error);
    }
  }

  async function toggleVisibility(id: string, isVisible: boolean) {
    await updateSection(id, { is_visible: !isVisible });
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    await reorderSections(newSections);
  }

  async function moveDown(index: number) {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    await reorderSections(newSections);
  }

  async function reorderSections(newSections: CustomSection[]) {
    try {
      const updates = newSections.map((section, index) => ({
        id: section.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabaseAdmin
          .from('product_custom_sections')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      loadSections();
    } catch (error) {
      console.error('Error reordering sections:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando seções...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Nova Seção</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Seção
              </label>
              <select
                value={newSection.section_type}
                onChange={(e) => setNewSection({ ...newSection, section_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="text">Texto</option>
                <option value="html">HTML Customizado</option>
                <option value="testimonials">Depoimentos</option>
                <option value="comparison">Comparação</option>
                <option value="cta">Call to Action</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Seção
              </label>
              <input
                type="text"
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="Ex: Por que escolher este produto?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo
            </label>
            <textarea
              value={newSection.content.text}
              onChange={(e) => setNewSection({ 
                ...newSection, 
                content: { ...newSection.content, text: e.target.value } 
              })}
              placeholder="Digite o conteúdo da seção..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Suporta Markdown e HTML básico
            </p>
          </div>

          <button
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Seção
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Seções Customizadas ({sections.length})
        </h3>

        {sections.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nenhuma seção customizada ainda.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <div
              key={section.id}
              className={`bg-white rounded-lg shadow-sm p-6 border ${
                section.is_visible ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
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
                    disabled={index === sections.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  {editingId === section.id ? (
                    <>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          const updated = sections.map((s) =>
                            s.id === section.id ? { ...s, title: e.target.value } : s
                          );
                          setSections(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        value={section.content.text || ''}
                        onChange={(e) => {
                          const updated = sections.map((s) =>
                            s.id === section.id 
                              ? { ...s, content: { ...s.content, text: e.target.value } } 
                              : s
                          );
                          setSections(updated);
                        }}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            updateSection(section.id, {
                              title: section.title,
                              content: section.content,
                            });
                            setEditingId(null);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            loadSections();
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
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-gray-900">{section.title}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          {section.section_type}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {section.content.text || 'Sem conteúdo'}
                        </pre>
                      </div>
                      
                      <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={section.is_visible}
                            onChange={() => toggleVisibility(section.id, section.is_visible)}
                            className="rounded"
                          />
                          Visível
                        </label>

                        <button
                          onClick={() => setEditingId(section.id)}
                          className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta seção?')) {
                      deleteSection(section.id);
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
