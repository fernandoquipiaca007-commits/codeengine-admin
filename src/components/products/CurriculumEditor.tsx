import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Video } from 'lucide-react';
import {
  CourseModule,
  CourseLesson,
  loadCurriculum,
  saveModule,
  deleteModule,
  saveLesson,
  deleteLesson,
} from '../../lib/curriculum';

interface CurriculumEditorProps {
  productId: string;
  onChange?: (lessons: CourseLesson[]) => void;
}

export function CurriculumEditor({ productId, onChange }: CurriculumEditorProps) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) load();
  }, [productId]);

  async function load() {
    setLoading(true);
    try {
      const data = await loadCurriculum(productId);
      setModules(data.modules);
      setLessons(data.lessons);
      onChange?.(data.lessons);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function addModule() {
    setSaving(true);
    try {
      const m = await saveModule(productId, {
        title: `Módulo ${modules.length + 1}`,
        display_order: modules.length,
      });
      setModules([...modules, m]);
    } finally {
      setSaving(false);
    }
  }

  async function addLesson(moduleId?: string) {
    setSaving(true);
    try {
      const l = await saveLesson(productId, {
        title: `Aula ${lessons.length + 1}`,
        module_id: moduleId || null,
        display_order: lessons.filter((x) => x.module_id === moduleId).length,
        is_preview: false,
        is_active: true,
      });
      const updated = [...lessons, l];
      setLessons(updated);
      onChange?.(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleLessonFile(lessonId: string, file: File) {
    setSaving(true);
    setUploadError(null);
    try {
      const lesson = lessons.find((l) => l.id === lessonId);
      if (!lesson) return;
      const updated = await saveLesson(productId, lesson, file);
      const list = lessons.map((l) => (l.id === lessonId ? updated : l));
      setLessons(list);
      onChange?.(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar o vídeo da aula.';
      setUploadError(message);
      console.error('Lesson upload error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function moveLesson(lessonId: string, direction: 'up' | 'down') {
    const sorted = [...lessons].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await saveLesson(productId, { ...a, display_order: b.display_order });
    await saveLesson(productId, { ...b, display_order: a.display_order });
    await load();
  }

  const unassignedLessons = lessons.filter((l) => !l.module_id);
  const lessonsByModule = (moduleId: string) =>
    lessons.filter((l) => l.module_id === moduleId).sort((a, b) => a.display_order - b.display_order);

  function renderLessonRow(lesson: CourseLesson) {
    return (
      <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 mt-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={lesson.title}
              onChange={(e) =>
                setLessons(lessons.map((l) => (l.id === lesson.id ? { ...l, title: e.target.value } : l)))
              }
              onBlur={() => saveLesson(productId, lesson).then(load)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Título da aula"
            />
            <textarea
              value={lesson.description || ''}
              onChange={(e) =>
                setLessons(lessons.map((l) => (l.id === lesson.id ? { ...l, description: e.target.value } : l)))
              }
              onBlur={() => saveLesson(productId, lesson).then(load)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={2}
              placeholder="Descrição"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lesson.is_preview}
                  onChange={(e) => {
                    const updated = { ...lesson, is_preview: e.target.checked };
                    saveLesson(productId, updated).then(load);
                  }}
                />
                Preview na store
              </label>
              {lesson.video_storage_path && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Video className="w-3 h-3" /> Vídeo carregado
                  {lesson.video_duration_seconds
                    ? ` (${Math.floor(lesson.video_duration_seconds / 60)}min)`
                    : ''}
                </span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                disabled={saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleLessonFile(lesson.id, f);
                }}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                MP4/WebM/MOV até 2GB (bucket ebooks-private).
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => moveLesson(lesson.id, 'up')} className="p-1 hover:bg-gray-200 rounded">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => moveLesson(lesson.id, 'down')} className="p-1 hover:bg-gray-200 rounded">
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteLesson(lesson.id).then(load)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando curriculum...</p>;
  }

  return (
    <div className="space-y-6 border border-indigo-200 rounded-xl p-6 bg-indigo-50/30">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Conteúdo do Curso</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addModule}
            disabled={saving}
            className="text-sm px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50"
          >
            + Módulo
          </button>
          <button
            type="button"
            onClick={() => addLesson()}
            disabled={saving}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Aula
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {uploadError}
        </div>
      )}

      {saving && (
        <p className="text-sm text-indigo-600">A enviar arquivo… Aguarde (vídeos até 2GB no bucket ebooks-private).</p>
      )}

      {modules.map((mod) => (
        <div key={mod.id} className="border border-gray-300 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={mod.title}
              onChange={(e) =>
                setModules(modules.map((m) => (m.id === mod.id ? { ...m, title: e.target.value } : m)))
              }
              onBlur={() => saveModule(productId, mod)}
              className="font-semibold text-gray-900 border-b border-transparent focus:border-indigo-500 outline-none flex-1"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => addLesson(mod.id)} className="text-xs text-indigo-600">
                + Aula
              </button>
              <button type="button" onClick={() => deleteModule(mod.id).then(load)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">{lessonsByModule(mod.id).map(renderLessonRow)}</div>
        </div>
      ))}

      {unassignedLessons.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Aulas sem módulo</h4>
          <div className="space-y-3">{unassignedLessons.map(renderLessonRow)}</div>
        </div>
      )}

      {lessons.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          Adicione pelo menos uma aula antes de publicar o curso.
        </p>
      )}
    </div>
  );
}
