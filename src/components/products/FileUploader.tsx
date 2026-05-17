import { useState, useCallback } from 'react';
import { uploadFile, validateFile, STORAGE_BUCKETS, formatFileSize } from '../../lib/storage';
import { UploadProgress } from '../../types/admin';

interface FileUploaderProps {
  bucketName: string;
  filePath: string;
  file: File;
  onSuccess: (url: string) => void;
  onError: (error: string) => void;
}

export function FileUploader({ bucketName, filePath, file, onSuccess, onError }: FileUploaderProps) {
  const [progress, setProgress] = useState<UploadProgress>({
    fileName: file.name,
    progress: 0,
    status: 'pending',
  });

  const upload = useCallback(async () => {
    try {
      setProgress({ ...progress, status: 'uploading', progress: 0 });

      // Find bucket configuration
      const bucketConfig = Object.values(STORAGE_BUCKETS).find((b) => b.name === bucketName);
      if (!bucketConfig) {
        throw new Error(`Bucket desconhecido: ${bucketName}`);
      }

      // Validate file
      const validation = validateFile(file, bucketConfig);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Upload file with progress tracking
      const url = await uploadFile(bucketName, filePath, file, (uploadProgress) => {
        setProgress({
          fileName: file.name,
          progress: uploadProgress,
          status: 'uploading',
        });
      });

      setProgress({
        fileName: file.name,
        progress: 100,
        status: 'completed',
      });

      onSuccess(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha no upload';
      setProgress({
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: errorMessage,
      });
      onError(errorMessage);
    }
  }, [bucketName, filePath, file, onSuccess, onError, progress]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {progress.status === 'pending' && (
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          )}
          {progress.status === 'uploading' && (
            <svg
              className="animate-spin h-5 w-5 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {progress.status === 'completed' && (
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          {progress.status === 'error' && (
            <svg
              className="h-5 w-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{progress.fileName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
        {progress.status === 'pending' && (
          <button
            onClick={upload}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Fazer Upload
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {progress.status === 'uploading' && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}

      {/* Error Message */}
      {progress.status === 'error' && progress.error && (
        <p className="text-xs text-red-600 mt-1">{progress.error}</p>
      )}

      {/* Success Message */}
      {progress.status === 'completed' && (
        <p className="text-xs text-green-600 mt-1">Upload concluído com sucesso</p>
      )}
    </div>
  );
}

interface DragDropUploaderProps {
  accept: string;
  maxSize: number;
  onFileSelect: (file: File) => void;
  label: string;
  description: string;
}

export function DragDropUploader({
  accept,
  maxSize,
  onFileSelect,
  label,
  description,
}: DragDropUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];

      // Validate file size
      if (file.size > maxSize) {
        setError(`Tamanho do arquivo excede o limite de ${formatFileSize(maxSize)}`);
        return;
      }

      // Validate file type
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const fileType = file.type;
      const isAccepted = acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', ''));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        setError(`Tipo de arquivo não aceito. Tipos aceitos: ${accept}`);
        return;
      }

      onFileSelect(file);
    },
    [accept, maxSize, onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      // Validate file size
      if (file.size > maxSize) {
        setError(`Tamanho do arquivo excede o limite de ${formatFileSize(maxSize)}`);
        return;
      }

      onFileSelect(file);
    },
    [maxSize, onFileSelect]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <p className="mt-1 text-xs text-gray-500">ou</p>
        <label className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer">
          Procurar Arquivos
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="sr-only"
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">Tamanho máximo: {formatFileSize(maxSize)}</p>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
