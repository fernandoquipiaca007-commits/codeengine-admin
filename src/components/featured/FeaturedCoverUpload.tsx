import { useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';

interface FeaturedCoverUploadProps {
  coverUrl: string;
  productTitle?: string;
  onFileSelect: (file: File | undefined) => void;
  onUseOriginal: () => void;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;

export function FeaturedCoverUpload({
  coverUrl,
  productTitle,
  onFileSelect,
  onUseOriginal,
  disabled,
}: FeaturedCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayUrl = preview || coverUrl;

  function validate(file: File): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return 'Use imagem JPG, PNG ou WebP.';
    }
    if (file.size > MAX_SIZE) {
      return 'Imagem muito grande. Máximo: 5 MB.';
    }
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) {
      setLocalError(err);
      onFileSelect(undefined);
      return;
    }
    setLocalError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  }

  function clearReplacement() {
    setPreview(null);
    setLocalError(null);
    onFileSelect(undefined);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">Capa do destaque</span>
        {preview && (
          <button
            type="button"
            onClick={clearReplacement}
            className="text-xs text-indigo-600 hover:text-indigo-800"
            disabled={disabled}
          >
            Cancelar nova imagem
          </button>
        )}
      </div>

      {displayUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/10] max-h-56">
          <img
            src={displayUrl}
            alt={productTitle || 'Capa'}
            className="w-full h-full object-cover"
          />
          {preview && (
            <span className="absolute top-2 left-2 text-xs font-medium bg-indigo-600 text-white px-2 py-1 rounded-full">
              Nova imagem
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Selecione um produto para carregar a capa automaticamente.
        </div>
      )}

      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50/50'
            : 'border-gray-300 bg-white hover:border-indigo-300'
        } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-700 font-medium">
          Arraste uma imagem ou clique para substituir
        </p>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG ou WebP — até 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {coverUrl && !preview && (
        <button
          type="button"
          onClick={onUseOriginal}
          className="text-sm text-gray-600 hover:text-indigo-600 flex items-center gap-1"
          disabled={disabled}
        >
          <X className="w-3.5 h-3.5" />
          Usar capa original do produto
        </button>
      )}

      {localError && <p className="text-sm text-red-600">{localError}</p>}
    </div>
  );
}
