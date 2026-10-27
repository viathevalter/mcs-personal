import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Eye,
  X,
  Upload,
  Sparkles,
  ClipboardPaste,
  Calendar,
  Clock,
  ShieldCheck,
  Wrench,
  Flame,
  Paintbrush,
  Zap,
  Tv,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Highlighter,
  Eraser,
  Maximize2,
  Minimize2,
  Edit3,
  Phone,
  Paperclip,
  Image as ImageIcon,
  Check,
  ArrowUpRight
} from 'lucide-react';
import {
  uploadAlojamentoPhoto,
  uploadDocumentoVistoria,
  downloadFile
} from '../services/storageService';
import type {
  AnexoObservacao,
  RegistroObservacaoHistorico
} from '../services/registrosService';

interface ObservacionesMantenimientoManagerProps {
  observacoes: string;
  observacoesHtml?: string;
  historico: RegistroObservacaoHistorico[];
  onChangeObservacoes: (plainText: string, htmlText?: string) => void;
  onChangeHistorico: (historico: RegistroObservacaoHistorico[]) => void;
}

const CATEGORIAS_MANTENIMIENTO: Array<{
  value: RegistroObservacaoHistorico['categoria'];
  label: string;
  shortLabel: string;
  badgeClass: string;
  icon: React.ElementType;
}> = [
  {
    value: 'caldera_calefaccion',
    label: '🔥 Caldera / Calefacción / Agua Caliente',
    shortLabel: 'Caldera / Calefacción',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    icon: Flame
  },
  {
    value: 'pintura_reparacion',
    label: '🎨 Pintura / Albañilería / Humedad',
    shortLabel: 'Pintura / Reparación',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: Paintbrush
  },
  {
    value: 'electricidad_fontaneria',
    label: '⚡ Electricidad / Fontanería / Clima',
    shortLabel: 'Electricidad / Fontanería',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Zap
  },
  {
    value: 'electrodomesticos',
    label: '🛠️ Electrodomésticos / Mobiliario',
    shortLabel: 'Electrodomésticos',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    icon: Tv
  },
  {
    value: 'garantia_preventivo',
    label: '🛡️ Revisión Preventiva / Garantía',
    shortLabel: 'Preventivo / Garantía',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: ShieldCheck
  },
  {
    value: 'observacion_general',
    label: '📝 Observación General / Normas',
    shortLabel: 'Observación General',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: FileText
  }
];

function getNowLocalDateTime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTimeDisplay(isoOrLocal: string): string {
  if (!isoOrLocal) return '';
  try {
    const d = new Date(isoOrLocal);
    if (isNaN(d.getTime())) return isoOrLocal;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} • ${hh}:${min}`;
  } catch {
    return isoOrLocal;
  }
}

function formatDateOnlyDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function stripHtmlToPlain(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function plainTextToHtml(text: string): string {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n+/)
    .map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
}

export const ObservacionesMantenimientoManager: React.FC<ObservacionesMantenimientoManagerProps> = ({
  observacoes = '',
  observacoesHtml = '',
  historico = [],
  onChangeObservacoes,
  onChangeHistorico
}) => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(historico.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpandedModal, setIsExpandedModal] = useState<boolean>(false);
  const [showGeneralNote, setShowGeneralNote] = useState<boolean>(false);

  // Estado del formulario de registro de mantenimiento / observación
  const [categoria, setCategoria] = useState<RegistroObservacaoHistorico['categoria']>('caldera_calefaccion');
  const [dataHora, setDataHora] = useState<string>(getNowLocalDateTime());
  const [titulo, setTitulo] = useState<string>('');
  const [fornecedorContato, setFornecedorContato] = useState<string>('');
  const [garantiaAte, setGarantiaAte] = useState<string>('');
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [anexosForm, setAnexosForm] = useState<AnexoObservacao[]>([]);

  // Subida de archivos y vista previa
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AnexoObservacao | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const modalEditorRef = useRef<HTMLDivElement>(null);
  const fileInputFormRef = useRef<HTMLInputElement>(null);
  const fileInputQuickCardRef = useRef<HTMLInputElement>(null);
  const quickTargetRecordIdRef = useRef<string | null>(null);

  // Si hay historial, abre por defecto el historial; si está vacío pero hay observación antigua, muestra opción
  useEffect(() => {
    if (historico.length > 0 && !editingId) {
      setIsFormOpen(false);
    }
  }, [historico.length]);

  // Sincronizar contenido inicial del editor rich text cuando cambia editingId o se abre modal
  const syncEditorDom = (htmlContent: string) => {
    if (editorRef.current && editorRef.current.innerHTML !== htmlContent) {
      editorRef.current.innerHTML = htmlContent;
    }
    if (modalEditorRef.current && modalEditorRef.current.innerHTML !== htmlContent) {
      modalEditorRef.current.innerHTML = htmlContent;
    }
  };

  useEffect(() => {
    syncEditorDom(editorHtml);
  }, [isFormOpen, isExpandedModal, editingId]);

  const execRichCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const activeEditor = isExpandedModal ? modalEditorRef.current : editorRef.current;
    if (activeEditor) {
      setEditorHtml(activeEditor.innerHTML);
    }
  };

  const handleSetWarrantyOffset = (months: number) => {
    const baseDate = dataHora ? new Date(dataHora) : new Date();
    const target = new Date(baseDate);
    target.setMonth(target.getMonth() + months);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setGarantiaAte(`${yyyy}-${mm}-${dd}`);
  };

  const processFilesUpload = async (files: File[] | FileList): Promise<AnexoObservacao[]> => {
    const fileArray = Array.from(files);
    const uploaded: AnexoObservacao[] = [];

    for (const file of fileArray) {
      const isImg = file.type.startsWith('image/');
      if (isImg) {
        const url = await uploadAlojamentoPhoto(file, 'mantenimiento');
        uploaded.push({
          id: `anx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          nome: file.name || `foto_mantenimiento_${Date.now()}.jpg`,
          tipo: 'imagem',
          url,
          tamanho_bytes: file.size,
          data_upload: new Date().toISOString()
        });
      } else {
        const doc = await uploadDocumentoVistoria(file, 'outro');
        uploaded.push({
          id: doc.id,
          nome: doc.nome,
          tipo: 'arquivo',
          url: doc.url,
          tamanho_bytes: doc.tamanho_bytes,
          data_upload: doc.data_upload
        });
      }
    }
    return uploaded;
  };

  const handleFormFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const novos = await processFilesUpload(files);
      setAnexosForm(prev => [...prev, ...novos]);
      setPasteToast(`📎 ${novos.length} archivo(s) / imagen(es) adjuntado(s)`);
      setTimeout(() => setPasteToast(null), 3000);
    } catch (err: any) {
      console.error('Error al adjuntar archivo en mantenimiento:', err);
      alert('Error al adjuntar archivo: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsUploading(false);
      if (fileInputFormRef.current) fileInputFormRef.current.value = '';
    }
  };

  // Adjuntar foto/archivo directamente a una tarjeta existente en el historial con 1 clic
  const handleQuickCardFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const targetId = quickTargetRecordIdRef.current;
    if (!files || files.length === 0 || !targetId) return;

    try {
      setUploadingRecordId(targetId);
      const novos = await processFilesUpload(files);
      const updatedHistorico = historico.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            anexos: [...(item.anexos || []), ...novos],
            updated_at: new Date().toISOString()
          };
        }
        return item;
      });
      onChangeHistorico(updatedHistorico);
      setPasteToast('📸 ¡Imagen/archivo agregado al registro del historial! Recuerde pulsar "Guardar Alojamiento".');
      setTimeout(() => setPasteToast(null), 4000);
    } catch (err: any) {
      console.error('Error al subir archivo rápido al registro:', err);
      alert('Error al adjuntar archivo: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setUploadingRecordId(null);
      quickTargetRecordIdRef.current = null;
      if (fileInputQuickCardRef.current) fileInputQuickCardRef.current.value = '';
    }
  };

  // Pegar imagen con Ctrl + V dentro del bloque de mantenimiento
  const handlePasteInZone = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }

    if (imageFiles.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      setIsUploading(true);
      const novos = await processFilesUpload(imageFiles);

      if (isFormOpen) {
        setAnexosForm(prev => [...prev, ...novos]);
        setPasteToast('📸 ¡Imagen pegada (Ctrl+V) en el registro actual!');
      } else if (historico.length > 0) {
        // Si el formulario está cerrado pero hay un registro reciente en el historial, lo adjunta al más reciente
        const firstId = historico[0].id;
        const updatedHistorico = historico.map((item, idx) =>
          idx === 0
            ? { ...item, anexos: [...(item.anexos || []), ...novos], updated_at: new Date().toISOString() }
            : item
        );
        onChangeHistorico(updatedHistorico);
        setPasteToast('📸 ¡Imagen pegada (Ctrl+V) directamente en el último registro de mantenimiento!');
      } else {
        setIsFormOpen(true);
        setAnexosForm(prev => [...prev, ...novos]);
        setPasteToast('📸 ¡Imagen pegada (Ctrl+V)! Complete la descripción y guarde el registro.');
      }
      setTimeout(() => setPasteToast(null), 3500);
    } catch (err: any) {
      console.error('Error al pegar imagen:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoria('caldera_calefaccion');
    setDataHora(getNowLocalDateTime());
    setTitulo('');
    setFornecedorContato('');
    setGarantiaAte('');
    setEditorHtml('');
    setAnexosForm([]);
    syncEditorDom('');
  };

  const handleOpenNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditRecord = (rec: RegistroObservacaoHistorico) => {
    setEditingId(rec.id);
    setCategoria(rec.categoria || 'caldera_calefaccion');
    setDataHora(rec.data_hora ? rec.data_hora.slice(0, 16) : getNowLocalDateTime());
    setTitulo(rec.titulo || '');
    setFornecedorContato(rec.fornecedor_contato || '');
    setGarantiaAte(rec.garantia_ate || '');
    const html = rec.conteudo_html || plainTextToHtml(rec.conteudo_texto || '');
    setEditorHtml(html);
    setAnexosForm(rec.anexos || []);
    setIsFormOpen(true);
    setTimeout(() => syncEditorDom(html), 30);
  };

  const handleSaveRecord = () => {
    const activeEditor = isExpandedModal ? modalEditorRef.current : editorRef.current;
    const rawHtml = (activeEditor ? activeEditor.innerHTML : editorHtml).trim();
    const plainText = stripHtmlToPlain(rawHtml);

    if (!plainText && !titulo.trim() && anexosForm.length === 0) {
      alert('Por favor, escriba una observación/descripción o adjunte al menos una imagen/archivo.');
      return;
    }

    const finalHtml = rawHtml || `<p>${titulo}</p>`;
    const finalPlain = plainText || titulo;

    let novoHistorico: RegistroObservacaoHistorico[];

    if (editingId) {
      novoHistorico = historico.map(item =>
        item.id === editingId
          ? {
              ...item,
              data_hora: dataHora || getNowLocalDateTime(),
              categoria,
              titulo: titulo.trim() || undefined,
              conteudo_html: finalHtml,
              conteudo_texto: finalPlain,
              fornecedor_contato: fornecedorContato.trim() || undefined,
              garantia_ate: garantiaAte || undefined,
              anexos: anexosForm,
              updated_at: new Date().toISOString()
            }
          : item
      );
    } else {
      const novoRegistro: RegistroObservacaoHistorico = {
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data_hora: dataHora || getNowLocalDateTime(),
        categoria,
        titulo: titulo.trim() || undefined,
        conteudo_html: finalHtml,
        conteudo_texto: finalPlain,
        fornecedor_contato: fornecedorContato.trim() || undefined,
        garantia_ate: garantiaAte || undefined,
        anexos: anexosForm,
        created_at: new Date().toISOString()
      };
      novoHistorico = [novoRegistro, ...historico];
    }

    // Ordenar del más reciente al más antiguo
    novoHistorico.sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));

    onChangeHistorico(novoHistorico);

    // Si el campo observacoes general estaba vacío, sincronizar un resumen legible
    if (!observacoes || !observacoes.trim()) {
      onChangeObservacoes(finalPlain, finalHtml);
    }

    resetForm();
    setIsFormOpen(false);
    setPasteToast('✅ Registro añadido al historial. Pulse "Guardar Alojamiento" arriba para confirmar los cambios.');
    setTimeout(() => setPasteToast(null), 4000);
  };

  const handleDeleteRecord = (recId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro del historial de mantenimiento?')) return;
    const filtrados = historico.filter(item => item.id !== recId);
    onChangeHistorico(filtrados);
  };

  const handleRemoveAnexoFromCard = (recId: string, anexoId: string) => {
    const updated = historico.map(item => {
      if (item.id === recId) {
        return {
          ...item,
          anexos: (item.anexos || []).filter(a => a.id !== anexoId),
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });
    onChangeHistorico(updated);
  };

  // Convertir texto plano antiguo en un registro estructurado del historial
  const handleConvertLegacyToHistory = () => {
    if (!observacoes || !observacoes.trim()) return;
    const lower = observacoes.toLowerCase();
    const autoCat: RegistroObservacaoHistorico['categoria'] =
      lower.includes('caldera') || lower.includes('calefacc') || lower.includes('agua caliente') || lower.includes('termostato')
        ? 'caldera_calefaccion'
        : lower.includes('pintura') || lower.includes('pared') || lower.includes('humedad')
        ? 'pintura_reparacion'
        : 'observacion_general';

    const novoReg: RegistroObservacaoHistorico = {
      id: `hist-${Date.now()}`,
      data_hora: getNowLocalDateTime(),
      categoria: autoCat,
      titulo: autoCat === 'caldera_calefaccion' ? 'Mantenimiento de Caldera / Calefacción' : 'Registro de Observación',
      conteudo_html: plainTextToHtml(observacoes),
      conteudo_texto: observacoes,
      anexos: [],
      created_at: new Date().toISOString()
    };

    const novoHist = [novoReg, ...historico];
    onChangeHistorico(novoHist);
    handleEditRecord(novoReg);
  };

  const hasUnconvertedLegacyNote =
    Boolean(observacoes && observacoes.trim()) &&
    historico.length === 0;

  const renderEditorForm = (inModal = false) => (
    <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/70 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
          <Wrench size={13} />
          {editingId ? 'Editar Registro de Mantenimiento / Observación' : 'Nuevo Registro en el Historial'}
        </span>
        {historico.length > 0 && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsFormOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            title="Cerrar formulario"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Categoría y Fecha/Hora */}
      <div className={`grid grid-cols-1 ${inModal ? 'sm:grid-cols-2' : ''} gap-2.5`}>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            Tipo / Categoría
          </label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value as RegistroObservacaoHistorico['categoria'])}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
          >
            {CATEGORIAS_MANTENIMIENTO.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Clock size={11} className="text-blue-600" />
            Fecha y Hora del Registro
          </label>
          <input
            type="datetime-local"
            value={dataHora}
            onChange={e => setDataHora(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
          />
        </div>
      </div>

      {/* Título / Resumen y Proveedor / Técnico */}
      <div className={`grid grid-cols-1 ${inModal ? 'sm:grid-cols-2' : ''} gap-2.5`}>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            Título / Resumen (Opcional)
          </label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Puesta a punto Caldera Ariston / Pintura salón"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Phone size={11} className="text-emerald-600" />
            Empresa / Técnico / Teléfono (Opcional)
          </label>
          <input
            type="text"
            value={fornecedorContato}
            onChange={e => setFornecedorContato(e.target.value)}
            placeholder="Ej: SAT REMOLAR - Tlf 902204520"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Garantía con botones rápidos (+6m, +1 año, +2 años) */}
      <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 rounded-lg space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" />
            Garantía / Próxima Revisión (Opcional)
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSetWarrantyOffset(6)}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[9px] font-bold transition-colors"
            >
              +6 Meses
            </button>
            <button
              type="button"
              onClick={() => handleSetWarrantyOffset(12)}
              className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold transition-colors shadow-2xs"
            >
              +1 Año Garantía
            </button>
            <button
              type="button"
              onClick={() => handleSetWarrantyOffset(24)}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[9px] font-bold transition-colors"
            >
              +2 Años
            </button>
            {garantiaAte && (
              <button
                type="button"
                onClick={() => setGarantiaAte('')}
                className="text-[9px] text-slate-400 hover:text-red-500 px-1"
                title="Quitar fecha de garantía"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <input
          type="date"
          value={garantiaAte}
          onChange={e => setGarantiaAte(e.target.value)}
          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-900 dark:text-emerald-200"
        />
      </div>

      {/* Barra de Herramientas Rich Text + Editor Amplio */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
          Descripción Detallada (Rich Text) *
        </label>
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => execRichCommand('bold')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 transition-colors"
              title="Negrita (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => execRichCommand('italic')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 transition-colors"
              title="Cursiva (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => execRichCommand('underline')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 transition-colors"
              title="Subrayado (Ctrl+U)"
            >
              <Underline size={13} />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => execRichCommand('insertUnorderedList')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 transition-colors"
              title="Lista con viñetas"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => execRichCommand('insertOrderedList')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 transition-colors"
              title="Lista numerada"
            >
              <ListOrdered size={13} />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => execRichCommand('hiliteColor', '#fef08a')}
              className="p-1.5 hover:bg-yellow-100 dark:hover:bg-slate-700 rounded text-amber-600 transition-colors"
              title="Resaltar texto importante"
            >
              <Highlighter size={13} />
            </button>
            <button
              type="button"
              onClick={() => execRichCommand('removeFormat')}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
              title="Limpiar formato"
            >
              <Eraser size={13} />
            </button>
          </div>

          {/* Área Editable Rich Text */}
          <div
            ref={inModal ? modalEditorRef : editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setEditorHtml((e.currentTarget as HTMLDivElement).innerHTML)}
            data-placeholder="Describa el mantenimiento realizado (ej: revisión de caldera, cambio de válvula, pintura, importe, condiciones de garantía...). También puede pulsar Ctrl+V aquí para pegar fotos."
            className={`w-full px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none overflow-y-auto resize-y [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 ${
              inModal ? 'min-h-[180px] max-h-[360px]' : 'min-h-[120px] max-h-[260px]'
            }`}
          />
        </div>
      </div>

      {/* Fotos y Archivos Adjuntos del Registro */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Paperclip size={12} className="text-purple-600" />
            Fotos de la Reparación / Facturas / Garantía ({anexosForm.length})
          </span>
          <button
            type="button"
            onClick={() => fileInputFormRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-2xs disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={12} />
                + Agregar Fotos / Archivos
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          💡 Puede adjuntar fotos de la caldera/reparación, PDFs de facturas o pulsar <strong>Ctrl + V</strong> para pegar una foto directamente.
        </p>

        {anexosForm.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
            {anexosForm.map(anx => (
              <div
                key={anx.id}
                className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 aspect-video flex flex-col items-center justify-center cursor-pointer"
                onClick={() => setPreviewAttachment(anx)}
              >
                {anx.tipo === 'imagem' ? (
                  <img src={anx.url} alt={anx.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-2 text-center">
                    <FileText size={20} className="mx-auto text-blue-600 mb-1" />
                    <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 line-clamp-1">
                      {anx.nome}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setAnexosForm(prev => prev.filter(item => item.id !== anx.id));
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 shadow-xs"
                  title="Quitar adjunto"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botones Guardar / Cancelar del Registro */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        {historico.length > 0 && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsFormOpen(false);
            }}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveRecord}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Check size={14} />
          {editingId ? 'Actualizar Registro' : 'Guardar en el Historial'}
        </button>
      </div>
    </div>
  );

  const renderTimelineList = (inModal = false) => (
    <div className="space-y-3">
      {historico.map(rec => {
        const catMeta =
          CATEGORIAS_MANTENIMIENTO.find(c => c.value === rec.categoria) ||
          CATEGORIAS_MANTENIMIENTO[CATEGORIAS_MANTENIMIENTO.length - 1];
        const CatIcon = catMeta.icon;

        const isWarrantyActive =
          rec.garantia_ate && new Date(rec.garantia_ate + 'T23:59:59') >= new Date();

        return (
          <div
            key={rec.id}
            className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-2xs"
          >
            {/* Cabecera del Registro: Categoría, Fecha/Hora y Acciones */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badgeClass}`}
                  >
                    <CatIcon size={11} />
                    {catMeta.shortLabel}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    <Calendar size={10} className="text-blue-600" />
                    {formatDateTimeDisplay(rec.data_hora)}
                  </span>

                  {rec.garantia_ate && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isWarrantyActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      <ShieldCheck size={11} />
                      {isWarrantyActive
                        ? `En Garantía hasta ${formatDateOnlyDisplay(rec.garantia_ate)}`
                        : `Garantía venció ${formatDateOnlyDisplay(rec.garantia_ate)}`}
                    </span>
                  )}
                </div>

                {rec.titulo && (
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 pt-0.5">
                    {rec.titulo}
                  </h4>
                )}
              </div>

              {/* Botones rápidos de la tarjeta */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    quickTargetRecordIdRef.current = rec.id;
                    fileInputQuickCardRef.current?.click();
                  }}
                  disabled={uploadingRecordId === rec.id}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[10px] font-bold transition-colors"
                  title="Adjuntar foto de la caldera / factura a este registro"
                >
                  {uploadingRecordId === rec.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600" />
                  ) : (
                    <ImageIcon size={11} />
                  )}
                  <span>+ Foto / Archivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEditRecord(rec)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Editar texto o detalles"
                >
                  <Edit3 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteRecord(rec.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Eliminar registro"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Contacto / Proveedor Técnico */}
            {rec.fornecedor_contato && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/70">
                <Phone size={11} className="text-emerald-600 flex-shrink-0" />
                <span>Proveedor / SAT: {rec.fornecedor_contato}</span>
              </div>
            )}

            {/* Contenido Rich Text */}
            <div
              className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 last:[&_p]:mb-0"
              dangerouslySetInnerHTML={{
                __html: rec.conteudo_html || plainTextToHtml(rec.conteudo_texto || '')
              }}
            />

            {/* Galería de Fotos y Archivos Adjuntos del Registro */}
            {rec.anexos && rec.anexos.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Imágenes y Documentos Adjuntos ({rec.anexos.length})
                </span>
                <div className={`grid ${inModal ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
                  {rec.anexos.map(anx => (
                    <div
                      key={anx.id}
                      onClick={() => setPreviewAttachment(anx)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 aspect-video cursor-pointer hover:shadow-md transition-all flex items-center justify-center"
                    >
                      {anx.tipo === 'imagem' ? (
                        <img
                          src={anx.url}
                          alt={anx.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="p-2 text-center">
                          <FileText size={22} className="mx-auto text-blue-600 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                            {anx.nome}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewAttachment(anx);
                          }}
                          className="p-1.5 bg-white/90 text-slate-800 rounded-lg shadow-xs"
                          title="Ver / Ampliar"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            downloadFile(anx.url, anx.nome || 'mantenimiento_adjunto');
                          }}
                          className="p-1.5 bg-white/90 text-blue-600 rounded-lg shadow-xs"
                          title="Descargar"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveAnexoFromCard(rec.id, anx.id);
                          }}
                          className="p-1.5 bg-red-600 text-white rounded-lg shadow-xs"
                          title="Eliminar adjunto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      data-maintenance-paste-zone="true"
      onPaste={handlePasteInZone}
      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs"
    >
      {/* Inputs ocultos para subida de imágenes y documentos */}
      <input
        type="file"
        ref={fileInputFormRef}
        onChange={handleFormFilesChange}
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputQuickCardRef}
        onChange={handleQuickCardFilesChange}
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
      />

      {/* Cabecera Principal */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Wrench size={15} className="text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Observaciones & Mantenimiento</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-full text-[10px] font-bold">
                {historico.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Historial con fecha, hora, rich text, garantías y fotos (caldera, pintura, reparaciones)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isFormOpen && (
            <button
              type="button"
              onClick={handleOpenNewForm}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-colors shadow-2xs"
            >
              <Plus size={13} />
              + Nuevo Registro
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpandedModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold transition-colors"
            title="Abrir en pantalla grande para ver todo el historial y fotos cómodamente"
          >
            <Maximize2 size={12} />
            <span>Ampliar</span>
          </button>
        </div>
      </div>

      {/* Toast de Feedback */}
      {pasteToast && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={14} className="text-blue-600 flex-shrink-0" />
            <span>{pasteToast}</span>
          </div>
          <button type="button" onClick={() => setPasteToast(null)} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Aviso inteligente si existe una observación en texto plano aún no convertida */}
      {hasUnconvertedLegacyNote && (
        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">
              📌 Observación registrada anteriormente
            </span>
            <button
              type="button"
              onClick={handleConvertLegacyToHistory}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors"
            >
              <Sparkles size={11} />
              Pasar al Historial y Agregar Fotos
            </button>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
            {observacoes}
          </p>
        </div>
      )}

      {/* Formulario de Nuevo Registro / Edición */}
      {isFormOpen && renderEditorForm(false)}

      {/* Lista Cronológica del Historial */}
      {historico.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
          {renderTimelineList(false)}
        </div>
      ) : (
        !isFormOpen && (
          <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <Wrench size={22} className="mx-auto text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Aún no hay mantenimientos ni observaciones en el historial.
            </p>
            <button
              type="button"
              onClick={handleOpenNewForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              <Plus size={13} />
              Registrar Primer Mantenimiento / Observación
            </button>
          </div>
        )
      )}

      {/* Nota General Fija (Colapsable para mantener compatibilidad con notas rápidas de llaves/normas) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowGeneralNote(prev => !prev)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={12} className="text-slate-400" />
            Nota General / Resumen Fijo del Alojamiento
          </span>
          <span className="text-[10px] text-blue-600 font-semibold">
            {showGeneralNote ? 'Ocultar' : 'Ver / Editar'}
          </span>
        </button>

        {showGeneralNote && (
          <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
            <textarea
              value={observacoes}
              onChange={e => onChangeObservacoes(e.target.value, observacoesHtml)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 leading-relaxed"
              placeholder="Notas generales permanentes (entrega de llaves, normas de convivencia, contactos)..."
            />
          </div>
        )}
      </div>

      {/* Modal de Vista Ampliada (Pantalla Completa para Gestión Cómoda de Mantenimientos y Garantías) */}
      {isExpandedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsExpandedModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Wrench size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Historial de Mantenimiento, Garantías y Observaciones del Alojamiento
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registro cronológico con fecha, hora, rich text, fotos de reparaciones (caldera, pintura, etc.) y documentos de garantía
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpandedModal(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                <Minimize2 size={14} />
                Cerrar Vista Ampliada
              </button>
            </div>

            {/* Cuerpo en 2 Columnas */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Editor Rich Text + Subida */}
              <div className="lg:col-span-5 space-y-4">
                {renderEditorForm(true)}
              </div>

              {/* Columna Derecha: Historial Cronológico Completo */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Línea de Tiempo de Mantenimientos ({historico.length} registro{historico.length === 1 ? '' : 's'})
                  </h3>
                </div>
                {historico.length > 0 ? (
                  renderTimelineList(true)
                ) : (
                  <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    Aún no hay registros en el historial. Utilice el formulario de la izquierda para agregar el primero.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Vista Previa / Zoom de Imagen o Documento */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl p-4 flex flex-col space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon size={15} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {previewAttachment.nome || 'Archivo Adjunto de Mantenimiento'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile(previewAttachment.url, previewAttachment.nome || 'mantenimiento_archivo')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Download size={13} />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center rounded-xl bg-slate-950/40 p-3 min-h-[300px]">
              {previewAttachment.tipo === 'imagem' ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.nome}
                  className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl">
                  <FileText size={40} className="mx-auto text-blue-600" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{previewAttachment.nome}</p>
                  <a
                    href={previewAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    <ArrowUpRight size={14} />
                    Abrir Documento en Nueva Pestaña
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
