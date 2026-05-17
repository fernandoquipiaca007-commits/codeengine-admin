import { supabaseAdmin } from './supabase-admin';
import { uploadFile, STORAGE_BUCKETS } from './storage';

export interface CourseModule {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  display_order: number;
}

export interface CourseLesson {
  id: string;
  product_id: string;
  module_id?: string | null;
  title: string;
  description?: string;
  display_order: number;
  video_storage_path?: string;
  video_duration_seconds?: number;
  is_preview: boolean;
  is_active: boolean;
}

export async function loadCurriculum(productId: string) {
  const [modulesRes, lessonsRes] = await Promise.all([
    supabaseAdmin.from('course_modules').select('*').eq('product_id', productId).order('display_order'),
    supabaseAdmin.from('course_lessons').select('*').eq('product_id', productId).order('display_order'),
  ]);
  return {
    modules: (modulesRes.data || []) as CourseModule[],
    lessons: (lessonsRes.data || []) as CourseLesson[],
  };
}

export async function saveModule(productId: string, module: Partial<CourseModule> & { title: string }) {
  if (module.id) {
    const { data, error } = await supabaseAdmin
      .from('course_modules')
      .update({
        title: module.title,
        description: module.description,
        display_order: module.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', module.id)
      .select()
      .single();
    if (error) throw error;
    return data as CourseModule;
  }
  const { data, error } = await supabaseAdmin
    .from('course_modules')
    .insert({
      product_id: productId,
      title: module.title,
      description: module.description || '',
      display_order: module.display_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CourseModule;
}

export async function deleteModule(moduleId: string) {
  const { error } = await supabaseAdmin.from('course_modules').delete().eq('id', moduleId);
  if (error) throw error;
}

export async function saveLesson(
  productId: string,
  lesson: Partial<CourseLesson> & { title: string },
  videoFile?: File
) {
  let videoPath = lesson.video_storage_path;
  let duration = lesson.video_duration_seconds || 0;

  if (videoFile) {
    const lessonId = lesson.id || crypto.randomUUID();
    const path = `${productId}/lessons/${lessonId}/${videoFile.name}`;
    videoPath = await uploadFile(STORAGE_BUCKETS.EBOOKS_PRIVATE.name, path, videoFile);
    duration = await getVideoDuration(videoFile);
  }

  const row = {
    product_id: productId,
    module_id: lesson.module_id || null,
    title: lesson.title,
    description: lesson.description || '',
    display_order: lesson.display_order ?? 0,
    video_storage_path: videoPath,
    video_duration_seconds: duration,
    is_preview: lesson.is_preview ?? false,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (lesson.id) {
    const { data, error } = await supabaseAdmin
      .from('course_lessons')
      .update(row)
      .eq('id', lesson.id)
      .select()
      .single();
    if (error) throw error;
    return data as CourseLesson;
  }

  const { data, error } = await supabaseAdmin
    .from('course_lessons')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as CourseLesson;
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabaseAdmin.from('course_lessons').delete().eq('id', lessonId);
  if (error) throw error;
}

export async function reorderLessons(lessons: { id: string; display_order: number }[]) {
  for (const l of lessons) {
    await supabaseAdmin
      .from('course_lessons')
      .update({ display_order: l.display_order })
      .eq('id', l.id);
  }
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration) || 0);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

export function isCourseCategory(categoryName: string): boolean {
  const n = categoryName.toLowerCase();
  return (
    n.includes('curso') ||
    n.includes('série') ||
    n.includes('serie') ||
    n.includes('vídeo') ||
    n.includes('video') ||
    n.includes('tutorial')
  );
}

export function isEbookCategory(categoryName: string): boolean {
  const n = categoryName.toLowerCase();
  return n.includes('ebook') || n.includes('e-book') || n.includes('livro');
}
