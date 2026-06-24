import { useState, useEffect } from 'react';
import {
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
  Video as LucideVideoIcon,
  Upload as LucideUpload,
  Link as LucideLinkIcon,
  Info as LucideInfo
} from 'lucide-react';

const Plus = LucidePlus as any;
const Trash2 = LucideTrash2 as any;
const VideoIcon = LucideVideoIcon as any;
const Upload = LucideUpload as any;
const LinkIcon = LucideLinkIcon as any;
const Info = LucideInfo as any;
import { supabaseAdmin } from '../../lib/supabase-admin';
import { uploadFile, STORAGE_BUCKETS, generateProductFilePath } from '../../lib/storage';

/** Extracts the Google Drive file ID from any known GDrive URL format */
function extractGoogleDriveId(url: string): string | null {
  try {
    // Format: https://drive.google.com/file/d/FILE_ID/view...
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    // Format: https://drive.google.com/open?id=FILE_ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    // Already an embed/preview URL
    const previewMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)\/preview/);
    if (previewMatch) return previewMatch[1];
  } catch (error) {
    console.error('Error extracting Google Drive ID:', error);
  }
  return null;
}

/** Converts any Google Drive sharing URL to the embeddable preview URL */
function toGoogleDriveEmbedUrl(url: string): string {
  const id = extractGoogleDriveId(url);
  if (!id) return url; // fallback: return as-is
  return `https://drive.google.com/file/d/${id}/preview`;
}

interface Video {
  id: string;
  video_type: string;
  video_url: string | null;
  storage_path: string | null;
  bucket_name: string | null;
  title: string | null;
  description: string | null;
  is_primary: boolean;
}

interface VideoManagerProps {
  productId: string;
}

type UploadMode = 'file' | 'url';

export function VideoManager({ productId }: VideoManagerProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newVideo, setNewVideo] = useState({
    video_type: 'youtube',
    video_url: '',
    title: '',
  });

  useEffect(() => {
    loadVideos();
  }, [productId]);

  async function loadVideos() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_videos')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addVideo() {
    if (uploadMode === 'file') {
      // Upload file mode
      if (!selectedFile) {
        alert('Selecione um arquivo de vídeo para fazer upload');
        return;
      }

      try {
        setUploading(true);

        // Upload video file
        const filePath = generateProductFilePath(productId, selectedFile.name);
        const storagePath = await uploadFile(
          STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
          filePath,
          selectedFile
        );

        // Save to database
        const { error } = await supabaseAdmin.from('product_videos').insert({
          product_id: productId,
          video_type: 'upload',
          video_url: storagePath, // Store path for backward compatibility
          storage_path: storagePath,
          bucket_name: STORAGE_BUCKETS.PRODUCT_VIDEOS.name,
          title: newVideo.title || selectedFile.name,
          display_order: videos.length,
          is_primary: videos.length === 0,
        });

        if (error) throw error;

        setNewVideo({ video_type: 'youtube', video_url: '', title: '' });
        setSelectedFile(null);
        loadVideos();
      } catch (error: any) {
        console.error('Error uploading video:', error);
        alert(`Erro ao fazer upload: ${error.message}`);
      } finally {
        setUploading(false);
      }
    } else {
        // URL mode
      if (!newVideo.video_url) {
        alert('Preencha a URL do vídeo');
        return;
      }

      // Normalize Google Drive URLs to embed format before saving
      const finalUrl = newVideo.video_type === 'google-drive'
        ? toGoogleDriveEmbedUrl(newVideo.video_url.trim())
        : newVideo.video_url.trim();

      try {
        const { error } = await supabaseAdmin.from('product_videos').insert({
          product_id: productId,
          video_type: newVideo.video_type,
          video_url: finalUrl,
          storage_path: null,
          bucket_name: null,
          title: newVideo.title,
          display_order: videos.length,
          is_primary: videos.length === 0,
        });

        if (error) throw error;
        setNewVideo({ video_type: 'youtube', video_url: '', title: '' });
        loadVideos();
      } catch (error: any) {
        console.error('Error adding video:', error);
        alert(`Erro ao adicionar vídeo: ${error.message}`);
      }
    }
  }

  async function deleteVideo(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  }

  async function setPrimary(id: string) {
    try {
      await supabaseAdmin
        .from('product_videos')
        .update({ is_primary: false })
        .eq('product_id', productId);

      await supabaseAdmin
        .from('product_videos')
        .update({ is_primary: true })
        .eq('id', id);

      loadVideos();
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  }

  if (loading) return <div className="text-center py-8">Carregando vídeos...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Vídeo</h3>

        <div className="space-y-4">
          {/* Upload Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setUploadMode('file')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                uploadMode === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload de Vídeo
            </button>
            <button
              onClick={() => setUploadMode('url')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                uploadMode === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              URL Externa
            </button>
          </div>

          {uploadMode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Vídeo
              </label>
              <select
                value={newVideo.video_type}
                onChange={(e) => setNewVideo({ ...newVideo, video_type: e.target.value, video_url: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="youtube">YouTube</option>
                <option value="google-drive">Google Drive</option>
                <option value="vimeo">Vimeo</option>
                <option value="instagram">Instagram</option>
                <option value="upload">Direto (Supabase / Link de Vídeo)</option>
              </select>
            </div>
          )}

          {/* Google Drive instructions */}
          {uploadMode === 'url' && newVideo.video_type === 'google-drive' && (
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-blue-800">
                <p className="font-semibold mb-1">Como partilhar um vídeo do Google Drive:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs">
                  <li>Abre o Google Drive e clica com o botão direito no vídeo</li>
                  <li>Clica em <strong>"Partilhar"</strong> → <strong>"Qualquer pessoa com o link"</strong></li>
                  <li>Copia o link e cola aqui abaixo</li>
                </ol>
                <p className="mt-1 text-xs text-blue-600">O link será convertido automaticamente para o formato de incorporação.</p>
              </div>
            </div>
          )}

          {uploadMode === 'file' ? (
            // File Upload Mode
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Vídeo * (MP4, WebM, OGG)
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept="video/mp4,video/webm,video/ogg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Limite: 100 MB por vídeo
              </p>
            </div>
          ) : (
            // URL Mode
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Vídeo
              </label>
              <input
                type="text"
                value={newVideo.video_url}
                onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                placeholder={
                  newVideo.video_type === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : newVideo.video_type === 'google-drive'
                    ? 'https://drive.google.com/file/d/ID/view?usp=sharing'
                    : newVideo.video_type === 'vimeo'
                    ? 'https://vimeo.com/...'
                    : newVideo.video_type === 'instagram'
                    ? 'https://instagram.com/p/...'
                    : 'https://[supabase-url]/storage/v1/object/public/product-videos/...'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {/* Live preview of the converted GDrive URL */}
              {newVideo.video_type === 'google-drive' && newVideo.video_url && (
                <p className="text-xs mt-1 text-gray-500">
                  URL de incorporação:{' '}
                  <span className="text-blue-600 font-mono break-all">
                    {toGoogleDriveEmbedUrl(newVideo.video_url)}
                  </span>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título (opcional)
            </label>
            <input
              type="text"
              value={newVideo.title}
              onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              placeholder="Ex: Vídeo Promocional"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={addVideo}
            disabled={uploading || (uploadMode === 'file' ? !selectedFile : !newVideo.video_url)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                A fazer upload...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {uploadMode === 'file' ? 'Fazer Upload' : 'Adicionar Vídeo'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Vídeos ({videos.length})</h3>

        {videos.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nenhum vídeo adicionado ainda.</p>
          </div>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-start gap-4">
                <VideoIcon className="w-8 h-8 text-blue-600" />

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {video.title || 'Sem título'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{video.video_url}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tipo: {video.video_type === 'upload'
                      ? 'Direto (Supabase / Link de Vídeo)'
                      : video.video_type === 'google-drive'
                      ? 'Google Drive'
                      : video.video_type}
                  </p>

                  <div className="flex items-center gap-4 mt-3">
                    {video.is_primary ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Vídeo Principal
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimary(video.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Definir como principal
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Excluir este vídeo?')) deleteVideo(video.id);
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
