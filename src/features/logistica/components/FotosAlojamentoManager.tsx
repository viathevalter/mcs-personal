import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  Upload,
  Sparkles,
  ClipboardPaste,
  Check,
  AlertCircle
} from 'lucide-react';
import { uploadAlojamentoPhoto, downloadImage } from '../services/storageService';

interface FotosAlojamentoManagerProps {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  maxFotos?: number;
}

export const FotosAlojamentoManager: React.FC<FotosAlojamentoManagerProps> = ({
  fotos = [],
  onChange,
  maxFotos = 5
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escucha el evento Pegar (Ctrl + V) global para capturar capturas de pantalla
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleAddSingleFile(file, 'captura_pantalla');
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [fotos, maxFotos]);

  const handleAddSingleFile = async (file: File | Blob, prefix = 'foto') => {
    if (fotos.length >= maxFotos) {
      alert(`Ha alcanzado el límite de ${maxFotos} fotos por alojamiento.`);
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadAlojamentoPhoto(file, prefix);
      const updated = [...fotos, url];
      onChange(updated);

      setPasteToast('📸 ¡Imagen adjuntada con éxito!');
      setTimeout(() => setPasteToast(null), 3000);
    } catch (err: any) {
      console.error('Error al procesar imagen:', err);
      alert('Error al adjuntar imagen: ' + (err.message || 'Compruebe el archivo'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = maxFotos - fotos.length;
    if (availableSlots <= 0) {
      alert(`El límite máximo es de ${maxFotos} fotos.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setIsUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        const url = await uploadAlojamentoPhoto(file, 'alojamiento');
        newUrls.push(url);
      }
      onChange([...fotos, ...newUrls]);
    } catch (err: any) {
      console.error('Error al subir fotos:', err);
      alert('Error al subir las fotos: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const availableSlots = maxFotos - fotos.length;
    if (availableSlots <= 0) {
      alert(`El límite máximo es de ${maxFotos} fotos.`);
      return;
    }

    const filesToUpload = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, availableSlots);
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        const url = await uploadAlojamentoPhoto(file, 'alojamiento');
        newUrls.push(url);
      }
      onChange([...fotos, ...newUrls]);
    } catch (err: any) {
      console.error('Error al subir imágenes por arrastre:', err);
      alert('Error al procesar las imágenes.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = fotos.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const handleDownload = (url: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadImage(url, `alojamiento_foto_${idx + 1}.jpg`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-purple-600" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Fotos del Inmueble ({fotos.length}/{maxFotos})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || fotos.length >= maxFotos}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600"></div>
                Subiendo...
              </>
            ) : (
              <>
                <Plus size={13} />
                + Agregar Imágenes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Feedback ao Colar com Ctrl + V */}
      {pasteToast && (
        <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between text-xs font-semibold text-purple-800 dark:text-purple-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={14} className="text-purple-600" />
            <span>{pasteToast}</span>
          </div>
          <button type="button" onClick={() => setPasteToast(null)} className="text-purple-400 hover:text-purple-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dica de Usabilidade: Print Screen + Ctrl V */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Seleccione archivos, arrástrelos a esta zona o pulse <strong>Ctrl + V</strong> para pegar una captura de pantalla.</span>
      </div>

      {/* Grid de Fotos & Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 transition-all rounded-xl ${
          isDragOver ? 'p-3 bg-purple-50/50 dark:bg-purple-950/20 border-2 border-dashed border-purple-400' : ''
        }`}
      >
        {fotos.map((url, idx) => (
          <div
            key={idx}
            onClick={() => setPreviewImage(url)}
            className="group relative rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer hover:shadow-md transition-all"
          >
            <img
              src={url}
              alt={`Alojamiento foto ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />

            {/* Badge de Foto Principal */}
            {idx === 0 && (
              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600/90 text-white text-[9px] font-bold rounded-md shadow-xs">
                Principal
              </span>
            )}

            {/* Overlay de Ações ao passar o mouse */}
            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewImage(url); }}
                className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-xs transition-colors"
                title="Ampliar / Ver Foto"
              >
                <Eye size={13} />
              </button>

              <button
                type="button"
                onClick={(e) => handleDownload(url, idx, e)}
                className="p-1.5 bg-white/90 hover:bg-white text-blue-600 rounded-lg shadow-xs transition-colors"
                title="Descargar Imagen"
              >
                <Download size={13} />
              </button>

              <button
                type="button"
                onClick={(e) => handleRemove(idx, e)}
                className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-xs transition-colors"
                title="Eliminar Imagen"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {/* Card para Adicionar / Dropzone quando houver espaço */}
        {fotos.length < maxFotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 rounded-xl text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all text-xs font-semibold"
          >
            <Upload size={16} />
            <span className="text-[10px]">+ Adjuntar / Ctrl+V</span>
          </button>
        )}
      </div>

      {fotos.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors space-y-1.5"
        >
          <Upload size={22} className="mx-auto text-slate-400" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Ninguna foto adjunta. Haga clic aquí para seleccionar archivos de su equipo.
          </p>
          <p className="text-[11px] text-slate-400">
            Consejo: Si realiza una captura de pantalla (Win + Shift + S), pulse <strong>Ctrl + V</strong> aquí para pegarla directamente.
          </p>
        </div>
      )}

      {/* Modal de Preview / Zoom da Foto */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl p-4 flex flex-col items-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Vista del Inmueble</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(previewImage, 'alojamiento_foto.jpg')}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download size={13} />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="w-full flex-1 overflow-auto flex items-center justify-center rounded-xl bg-slate-950/40 p-2">
              <img
                src={previewImage}
                alt="Zoom Alojamiento"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
