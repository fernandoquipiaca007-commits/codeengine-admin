import { useState, useEffect, useRef } from 'react';
import {
  Video as LucideVideo,
  Upload as LucideUpload,
  Copy as LucideCopy,
  Check as LucideCheck,
  Trash2 as LucideTrash2,
  Play as LucidePlay,
  X as LucideX
} from 'lucide-react';

const VideoIcon = LucideVideo as any;
const UploadIcon = LucideUpload as any;
const CopyIcon = LucideCopy as any;
const CheckIcon = LucideCheck as any;
const TrashIcon = LucideTrash2 as any;
const PlayIcon = LucidePlay as any;
const CloseIcon = LucideX as any;

import { supabaseAdmin } from '../lib/supabase-admin';
import { uploadFile, generatePublicUrl, deleteFile, formatFileSize } from '../lib/storage';

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export default function Media() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    try {
      // List files directly from the 'product-videos' bucket
      const { data, error } = await supabaseAdmin.storage
        .from('product-videos')
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (error) throw error;

      // Filter out empty system folders/files
      const filtered = (data || []).filter(
        (f) => f.name !== '.emptyFolderPlaceholder' && !f.name.startsWith('.')
      );

      setFiles(filtered as any);
    } catch (e) {
      console.error('Erro ao carregar ficheiros:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading) return;
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      void handleUpload(droppedFiles[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      void handleUpload(selectedFiles[0]);
    }
  };

  async function handleUpload(file: File) {
    if (!file) return;

    // Validation (100MB limit for product-videos bucket)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      alert('O ficheiro excede o limite de 100 MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'];
    if (!allowedExts.includes(ext)) {
      alert('Apenas são permitidos ficheiros de vídeo (mp4, webm, ogg, mov, mkv, avi).');
      return;
    }

    setUploading(true);
    setLastUploadedUrl(null);

    try {
      // Format file path with timestamp to prevent collisions
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${Date.now()}_${sanitizedName}`;

      // Upload using storage utility
      const pathInBucket = await uploadFile('product-videos', filePath, file);
      
      // Generate Public URL
      const publicUrl = generatePublicUrl('product-videos', pathInBucket);

      setLastUploadedUrl(publicUrl);
      
      // Auto-copy the URL on success
      await navigator.clipboard.writeText(publicUrl);

      // Reload list
      await loadFiles();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao realizar upload do ficheiro.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileName: string) {
    if (!confirm(`Deseja excluir permanentemente o ficheiro "${fileName}" do armazenamento?`)) {
      return;
    }

    try {
      await deleteFile('product-videos', fileName);
      await loadFiles();
      if (lastUploadedUrl && lastUploadedUrl.includes(fileName)) {
        setLastUploadedUrl(null);
      }
    } catch (e: any) {
      console.error(e);
      alert('Erro ao excluir ficheiro.');
    }
  }

  function handleCopy(url: string, name: string) {
    void navigator.clipboard.writeText(url);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <VideoIcon className="w-7 h-7 text-primary-600" />
          Gerenciador de Mídia e Vídeos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Faça upload de vídeos pesados e obtenha links diretos da CDN da CodeEngine 1 para uso no storefront.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              uploading 
                ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                : 'hover:bg-primary-50/30 hover:border-primary-500 border-gray-300'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
              disabled={uploading}
            />
            
            <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4 text-primary-600">
              <UploadIcon className="w-6 h-6 animate-pulse" />
            </div>
            
            {uploading ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Enviando ficheiro de vídeo...</p>
                <p className="text-xs text-gray-500">Isto pode demorar alguns momentos para ficheiros grandes.</p>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto mt-2 overflow-hidden">
                  <div className="bg-primary-600 h-full rounded-full animate-pulse" style={{ width: '80%' }}></div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700">
                  Arraste e solte o vídeo ou clique para procurar
                </p>
                <p className="text-xs text-gray-500">
                  Formatos aceitos: MP4, WebM, OGG, MOV (máximo 100MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Result */}
        <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-2">Último Link Gerado</h3>
            <p className="text-xs text-gray-500 mb-4">
              O link é copiado automaticamente após o upload. Você também pode copiar usando o botão abaixo.
            </p>
            {lastUploadedUrl ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border text-xs font-mono break-all line-clamp-3 select-all">
                  {lastUploadedUrl}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(lastUploadedUrl, 'last_upload')}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  {copiedName === 'last_upload' ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-32 border-2 border-dotted rounded-lg flex items-center justify-center text-xs text-gray-400">
                Nenhum upload feito recentemente nesta sessão.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-950 text-base">Vídeos Hospedados</h3>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-gray-500 text-sm">Carregando mídias...</p>
          ) : files.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <VideoIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-medium text-gray-600 text-sm">Nenhum vídeo hospedado no momento.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">Use a área de upload acima para hospedar o seu primeiro vídeo.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 font-semibold">
                <tr>
                  <th className="px-6 py-3 text-left">Nome do Ficheiro</th>
                  <th className="px-6 py-3 text-left">Tamanho</th>
                  <th className="px-6 py-3 text-left">Data de Envio</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {files.map((file) => {
                  const fileUrl = generatePublicUrl('product-videos', file.name);
                  const displayDate = file.created_at
                    ? new Date(file.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-';
                  
                  return (
                    <tr key={file.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-xs sm:max-w-md truncate">
                        {file.name}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatFileSize(file.metadata?.size || 0)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {displayDate}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActivePreviewUrl(fileUrl)}
                          className="p-2 border hover:bg-gray-50 rounded-lg inline-flex items-center text-xs text-gray-700"
                          title="Visualizar Vídeo"
                        >
                          <PlayIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(fileUrl, file.name)}
                          className="p-2 border hover:bg-gray-50 rounded-lg inline-flex items-center text-xs text-gray-700"
                          title="Copiar Link Público"
                        >
                          {copiedName === file.name ? (
                            <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <CopyIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(file.name)}
                          className="p-2 border hover:bg-red-50 rounded-lg inline-flex items-center text-xs text-red-600 hover:text-red-700 border-red-100 hover:border-red-200"
                          title="Excluir do Storage"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl w-full relative">
            <button
              onClick={() => setActivePreviewUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white z-10"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="aspect-video bg-black">
              <video src={activePreviewUrl} controls autoPlay className="w-full h-full" />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center text-xs font-mono break-all max-w-full">
              <span className="truncate select-all text-gray-600 flex-1 mr-4">{activePreviewUrl}</span>
              <button
                type="button"
                onClick={() => handleCopy(activePreviewUrl, 'modal_preview')}
                className="px-3 py-1.5 bg-primary-600 text-white rounded font-sans text-xs font-semibold hover:bg-primary-700"
              >
                {copiedName === 'modal_preview' ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
