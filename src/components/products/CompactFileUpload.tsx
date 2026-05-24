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
  helpText?: string;
}

export function CompactFileUpload({
  label,
  accept,
  maxSize,
  required = false,
  currentFile,
  onFileSelect,
  helpText,
}: CompactFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  function handleRemove() {
    setSelectedFile(null);
    setError(null);
    onFileSelect(undefined);
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
      {selectedFile || currentFile ? (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedFile ? (
              <>
                <File className="w-5 h-5 text-primary-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
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
          {selectedFile && (
            <button
              type="button"
              onClick={handleRemove}
              className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
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
