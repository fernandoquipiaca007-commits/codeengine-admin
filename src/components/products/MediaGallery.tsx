import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { uploadFile, STORAGE_BUCKETS, generatePublicUrl, generateProductFilePath } from '../../lib/storage';

interface Media {
  id: string;
  media_type: string;
  file_url: string;
  storage_path: string | null;
  bucket_name: string | null;
  title: string | null;
  alt_text: string | null;
  display_order: number;
}

interface MediaGalleryProps {
  productId: string;
}

type UploadMode = 'file' | 'url';

export function MediaGallery({ productId }: MediaGalleryProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMedia, setNewMedia] = useState({
    media_type: 'image' as string,
    file_url: '',
    title: '',
    alt_text: '',
  });

  useEffect(() => {
    loadMedia();
  }, [productId]);

  async function loadMedia() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  }

  // Resolve the display URL for a media item
  function resolveDisplayUrl(item: Media): string {
    if (item.storage_path && item.bucket_name) {
      // It's a storage file — generate public URL
      return generatePublicUrl(item.bucket_name, item.storage_path);
    }
    // It's an external URL stored directly in file_url
    return item.file_url;
  }

  async function addMedia() {
    if (uploadMode === 'file') {
      if (!selectedFile) {
        alert('Selecione um arquivo para fazer upload');
        return;
      }

      try {
        setUploading(true);

        // Determine bucket based on media type
        let bucketName = STORAGE_BUCKETS.PRODUCT_PREVIEWS.name;
        if (newMedia.media_type === 'video') {
          bucketName = STORAGE_BUCKETS.PRODUCT_VIDEOS.name;
        } else if (newMedia.media_type === 'document') {
          bucketName = STORAGE_BUCKETS.EBOOKS_PRIVATE.name;
        }

        // Upload file — returns storage path
        const filePath = generateProductFilePath(productId, selectedFile.name);
        const storagePath = await uploadFile(bucketName, filePath, selectedFile);

        // Save to database with storage_path + bucket_name
        const { error } = await supabaseAdmin
          .from('product_media')
          .insert({
            product_id: productId,
            media_type: newMedia.media_type,
            file_url: storagePath,       // keep file_url populated (NOT NULL constraint)
            storage_path: storagePath,
            bucket_name: bucketName,
            title: newMedia.title || selectedFile.name,
            alt_text: newMedia.alt_text || null,
            display_order: media.length,
          });

        if (error) throw error;

        setNewMedia({ media_type: 'image', file_url: '', title: '', alt_text: '' });
        setSelectedFile(null);
        loadMedia();
      } catch (error: any) {
        console.error('Error uploading media:', error);
        alert(`Erro ao fazer upload: ${error.message}`);
      } finally {
        setUploading(false);
      }
    } else {
      // URL mode
      if (!newMedia.file_url) {
        alert('Preencha a URL da mídia');
        return;
      }

      try {
        const { error } = await supabaseAdmin
          .from('product_media')
          .insert({
            product_id: productId,
            media_type: newMedia.media_type,
            file_url: newMedia.file_url,
            storage_path: null,
            bucket_name: null,
            title: newMedia.title || null,
            alt_text: newMedia.alt_text || null,
            display_order: media.length,
          });

        if (error) throw error;

        setNewMedia({ media_type: 'image', file_url: '', title: '', alt_text: '' });
        loadMedia();
      } catch (error: any) {
        console.error('Error adding media:', error);
        alert(`Erro ao adicionar mídia: ${error.message}`);
      }
    }
  }

  async function deleteMedia(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  }

  function getMediaIcon(type: string) {
    switch (type) {
      case 'video': return '🎥';
      case 'document': return '📄';
      default: return '🖼️';
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando galeria...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Media Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Nova Mídia</h3>

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
              Upload de Arquivo
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

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mídia</label>
            <select
              value={newMedia.media_type}
              onChange={(e) => setNewMedia({ ...newMedia, media_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="document">Documento</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="screenshot">Screenshot</option>
              <option value="banner">Banner</option>
              <option value="mockup">Mockup</option>
            </select>
          </div>

          {/* File or URL input */}
          {uploadMode === 'file' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Arquivo *
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept={
                  newMedia.media_type === 'video'
                    ? 'video/*'
                    : newMedia.media_type === 'document'
                    ? '.pdf,.doc,.docx,.zip'
                    : 'image/*'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Mídia *
              </label>
              <input
                type="url"
                value={newMedia.file_url}
                onChange={(e) => setNewMedia({ ...newMedia, file_url: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole a URL pública da mídia (YouTube, Vimeo, Cloudinary, etc.)
              </p>
            </div>
          )}

          {/* Title & Alt Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título (opcional)
              </label>
              <input
                type="text"
                value={newMedia.title}
                onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                placeholder="Ex: Screenshot do Dashboard"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Alternativo (opcional)
              </label>
              <input
                type="text"
                value={newMedia.alt_text}
                onChange={(e) => setNewMedia({ ...newMedia, alt_text: e.target.value })}
                placeholder="Descrição para acessibilidade"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={addMedia}
            disabled={uploading || (uploadMode === 'file' ? !selectedFile : !newMedia.file_url)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                A fazer upload...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {uploadMode === 'file' ? 'Fazer Upload' : 'Adicionar Mídia'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Galeria de Mídia ({media.length})
          </h3>
          <div className="text-sm text-gray-500">
            <span className="mr-4">🖼️ Imagens: {media.filter(m => m.media_type === 'image' || m.media_type === 'thumbnail' || m.media_type === 'screenshot' || m.media_type === 'banner' || m.media_type === 'mockup').length}</span>
            <span className="mr-4">🎥 Vídeos: {media.filter(m => m.media_type === 'video').length}</span>
            <span>📄 Docs: {media.filter(m => m.media_type === 'document').length}</span>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma mídia adicionada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => {
              const displayUrl = resolveDisplayUrl(item);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group"
                >
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {item.media_type !== 'video' && item.media_type !== 'document' ? (
                      <img
                        src={displayUrl}
                        alt={item.alt_text || item.title || 'Media'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/400x300?text=Imagem+não+encontrada';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        {getMediaIcon(item.media_type)}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta mídia?')) {
                          deleteMedia(item.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Badge: Storage vs URL */}
                    <span className={`absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.storage_path
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.storage_path ? '✓ Storage' : '🔗 URL'}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getMediaIcon(item.media_type)}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        {item.media_type}
                      </span>
                    </div>

                    {item.title && (
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm truncate">{item.title}</h4>
                    )}

                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 truncate block"
                    >
                      Ver mídia →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Dica: Duas Formas de Adicionar Mídia</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Upload de Arquivo:</strong> Faz upload direto para o Supabase Storage. Recomendado para imagens e documentos do produto.</li>
          <li><strong>URL Externa:</strong> Use URLs de serviços externos como YouTube, Vimeo, Cloudinary, etc.</li>
        </ul>
      </div>
    </div>
  );
}
