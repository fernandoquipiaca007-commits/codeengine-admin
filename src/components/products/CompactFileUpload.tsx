import { useState, useRef } from 'react';
import {
  Upload as LucideUpload,
  File as LucideFile,
  X as LucideX,
  CheckCircle as LucideCheckCircle,
  AlertCircle as LucideAlertCircle
} from 'lucide-react';

const Upload = LucideUpload as any;
const File = LucideFile as any;
const X = LucideX as any;
const CheckCircle = LucideCheckCircle as any;
const AlertCircle = LucideAlertCircle as any;

interface CompactFileUploadProps {
  label: string;
  accept: string;
  maxSize: number;
  required?: boolean;
  currentFile?: string;
  onFileSelect: (file: File | undefined) => void;
  onClearCurrent?: () => void;
  helpText?: string;
  bucketName: string;
  onUrlUpload?: (url: string, path: string) => void;
}

export function CompactFileUpload({
  label,
  accept,
  maxSize,
  required = false,
  currentFile,
  onFileSelect,
  onClearCurrent,
  helpText,
  bucketName,
  onUrlUpload,
}: CompactFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function validateFile(file: File): string | null {
    // Check file size
    if (file.size > maxSize) {
      return `Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase();
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `Tipo de arquivo não aceito`;
    }

    return null;
  }

  function handleFileSelect(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      onFileSelect(undefined);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setUploadedFileInfo(null); // Clear local uploaded info
    setLocalPath('');
    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  async function handleLocalUpload() {
    if (!localPath.trim()) return;
 
    setUploadingLocal(true);
    setError(null);

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3041';
      const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY || '';

      const response = await fetch(`${BACKEND_URL}/api/admin/upload-local-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminApiKey,
        },
        body: JSON.stringify({
          filePath: localPath.trim(),
          bucketName: bucketName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao carregar ficheiro local');
      }

      setUploadedFileInfo({
        name: result.fileName,
        size: result.fileSize || 0,
      });
      setSelectedFile(null); // Clear standard file selection

      onFileSelect(undefined); // Clear standard file in parent
      if (onUrlUpload) {
        onUrlUpload(result.url, result.path);
      }
    } catch (err: any) {
      console.error('Local upload error:', err);
      setError(err instanceof Error ? err.message : 'Falha no upload local');
    } finally {
      setUploadingLocal(false);
    }
  }

  function handleRemove() {
    setSelectedFile(null);
    setUploadedFileInfo(null);
    setLocalPath('');
    setError(null);
    onFileSelect(undefined);
    if (onUrlUpload) onUrlUpload('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* File Display or Upload Area */}
      {selectedFile || uploadedFileInfo || currentFile ? (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedFile || uploadedFileInfo ? (
              <>
                <File className="w-5 h-5 text-primary-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile ? selectedFile.name : uploadedFileInfo?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile ? selectedFile.size : (uploadedFileInfo?.size || 0))}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              </>
            ) : (
              <>
                <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">Arquivo atual</p>
                  <p className="text-xs text-gray-500">Upload novo para substituir</p>
                </div>
              </>
            )}
          </div>
          {selectedFile || uploadedFileInfo ? (
            <button
              type="button"
              onClick={handleRemove}
              className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          ) : currentFile && onClearCurrent ? (
            <button
              type="button"
              onClick={onClearCurrent}
              className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors group"
              title="Remover arquivo atual"
            >
              <X className="w-4 h-4 text-red-500 hover:text-red-700 transition-colors" />
            </button>
          ) : null}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
          <Upload
            className={`w-8 h-8 mx-auto mb-2 ${
              error ? 'text-red-400' : 'text-gray-400'
            }`}
          />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary-600">Clique para escolher</span> ou arraste
            aqui
          </p>
        </div>
      )}

      {/* Local path or URL field - only show if a new file is not yet selected/uploaded */}
      {!(selectedFile || uploadedFileInfo) && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          <label className="block text-xs font-medium text-gray-500">
            Ou caminho do arquivo local / URL (agentes):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: C:\ebooks\livro.pdf ou https://site.com/livro.pdf"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (localPath.trim() && !uploadingLocal) void handleLocalUpload();
                }
              }}
              className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm text-xs focus:ring-indigo-500 focus:border-indigo-500 px-2.5 py-1.5 border"
            />
            <button
              type="button"
              onClick={handleLocalUpload}
              disabled={uploadingLocal || !localPath.trim()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {uploadingLocal ? 'Enviando...' : 'Carregar'}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
