import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  MapPin,
  BedDouble,
  Calendar,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Trash2,
  FileDown,
  PenTool,
  Type,
  Upload,
  Droplets,
  Zap,
  Flame,
  Wifi,
  Sparkles,
  KeyRound,
  Tv,
  ExternalLink,
  Check,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  termoResponsabilidadeService,
  type TermoResponsabilidadeAlojamento,
  CLAUSULAS_TERMO_ALOJAMENTO,
  CHECKLIST_ITEMS_CATALOG,
  type EstadoConservacion,
  type ChecklistRespostasMap,
  buildDefaultChecklistRespostas
} from '../services/termoResponsabilidadeService';
import {
  generateTermoAlojamentoPdfDocument,
  downloadTermoAlojamentoPdf
} from '../utils/termoAlojamentoPdfGenerator';

export const PublicTermoAlojamentoPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState<'ES' | 'PT'>('ES');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingItemKey, setUploadingItemKey] = useState<string | null>(null);
  const [termo, setTermo] = useState<TermoResponsabilidadeAlojamento | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showClausesExpanded, setShowClausesExpanded] = useState(true);

  // Editable worker & housing confirmation fields
  const [workerDocumento, setWorkerDocumento] = useState('');
  const [workerCargo, setWorkerCargo] = useState('');
  const [camaIdentificador, setCamaIdentificador] = useState('');
  const [quantidadeLlaves, setQuantidadeLlaves] = useState('1 juego');
  const [quantidadeMandos, setQuantidadeMandos] = useState('1');
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [respostas, setRespostas] = useState<ChecklistRespostasMap>(() => buildDefaultChecklistRespostas());
  const [aceiteTermos, setAceiteTermos] = useState(false);

  // Signature state
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setErrorMsg('Enlace inválido o incompleto.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const found = await termoResponsabilidadeService.getTermoByToken(token);
        if (!found) {
          setErrorMsg(
            'No se encontró el Término de Responsabilidad solicitado. Verifique el enlace con el departamento de Logística.'
          );
        } else {
          setTermo(found);
          setWorkerDocumento(found.worker_documento || '');
          setWorkerCargo(found.worker_cargo || 'Especialista Operativo');
          setCamaIdentificador(found.cama_identificador || 'Habitación Asignada');
          setQuantidadeLlaves(found.quantidade_llaves || '1 juego');
          setQuantidadeMandos(found.quantidade_mandos || '1');
          setObservacoesGerais(found.observacoes_gerais || '');
          setRespostas(
            found.checklist_respostas && Object.keys(found.checklist_respostas).length > 0
              ? found.checklist_respostas
              : buildDefaultChecklistRespostas()
          );
          setTypedSignature(found.worker_nome || '');
          if (found.aceite_termos) {
            setAceiteTermos(true);
          }
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error al cargar el documento.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Initialize signature canvas
  useEffect(() => {
    if (sigMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [sigMode, loading]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const buildTypedSignatureDataUrl = (nameText: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 38px "Brush Script MT", "Segoe Script", "Caveat", cursive, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText.trim(), canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleEstadoChange = (itemId: string, estado: EstadoConservacion) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { estado: 'BUENA', observacao: '', fotos: [] }),
        estado
      }
    }));
  };

  const handleObsChange = (itemId: string, observacao: string) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { estado: 'BUENA', observacao: '', fotos: [] }),
        observacao
      }
    }));
  };

  const handleEspecificacionChange = (itemId: string, especificacion: string) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { estado: 'BUENA', observacao: '', fotos: [] }),
        especificacion
      }
    }));
  };

  const handlePhotoUploadForItem = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !termo) return;
    setUploadingItemKey(itemId);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await termoResponsabilidadeService.uploadFotoChecklist(files[i], termo.codigo_termo);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setRespostas(prev => {
          const curr = prev[itemId] || { estado: 'BUENA', observacao: '', fotos: [] };
          return {
            ...prev,
            [itemId]: {
              ...curr,
              fotos: [...(curr.fotos || []), ...uploadedUrls]
            }
          };
        });
      }
    } catch (e) {
      console.error('Error al subir foto:', e);
    } finally {
      setUploadingItemKey(null);
    }
  };

  const handleRemovePhotoFromItem = (itemId: string, photoIndex: number) => {
    setRespostas(prev => {
      const curr = prev[itemId];
      if (!curr) return prev;
      return {
        ...prev,
        [itemId]: {
          ...curr,
          fotos: curr.fotos.filter((_, idx) => idx !== photoIndex)
        }
      };
    });
  };

  const markAllAreaAsBuena = (areaKey: string) => {
    setRespostas(prev => {
      const next = { ...prev };
      CHECKLIST_ITEMS_CATALOG.filter(i => i.areaKey === areaKey).forEach(item => {
        next[item.id] = {
          ...(next[item.id] || { observacao: '', fotos: [] }),
          estado: item.id.endsWith('_otros') ? 'NA' : 'BUENA'
        };
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo || !token) return;

    if (!workerDocumento.trim()) {
      alert(
        lang === 'ES'
          ? 'Por favor, indique su número de DNI / NIE / Pasaporte.'
          : 'Por favor, informe seu número de DNI / NIE / Passaporte.'
      );
      return;
    }

    if (!aceiteTermos) {
      alert(
        lang === 'ES'
          ? 'Debe marcar la casilla de aceptación de los términos de responsabilidad.'
          : 'Você deve marcar a caixa de aceite dos termos de responsabilidade.'
      );
      return;
    }

    let finalSignatureDataUrl = '';
    if (sigMode === 'draw') {
      if (!hasDrawn || !canvasRef.current) {
        alert(
          lang === 'ES'
            ? 'Por favor, dibuje su firma en el recuadro antes de finalizar.'
            : 'Por favor, desenhe sua assinatura no quadro antes de finalizar.'
        );
        return;
      }
      finalSignatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else if (sigMode === 'type') {
      if (!typedSignature.trim()) {
        alert(
          lang === 'ES'
            ? 'Por favor, escriba su nombre completo para generar la firma.'
            : 'Por favor, digite seu nome completo para gerar a assinatura.'
        );
        return;
      }
      finalSignatureDataUrl = buildTypedSignatureDataUrl(typedSignature);
    } else if (sigMode === 'upload') {
      if (!uploadedSignature) {
        alert(
          lang === 'ES'
            ? 'Por favor, seleccione una imagen de su firma.'
            : 'Por favor, selecione uma imagem da sua assinatura.'
        );
        return;
      }
      finalSignatureDataUrl = uploadedSignature;
    }

    setSubmitting(true);
    try {
      let clientIp = 'Verificada Digitalmente';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) {
          const ipJson = await ipRes.json();
          if (ipJson.ip) clientIp = ipJson.ip;
        }
      } catch {}

      const nowIso = new Date().toISOString();
      const previewSignedTermo: TermoResponsabilidadeAlojamento = {
        ...termo,
        worker_documento: workerDocumento.trim(),
        worker_cargo: workerCargo.trim(),
        cama_identificador: camaIdentificador.trim(),
        checklist_respostas: respostas,
        quantidade_llaves: quantidadeLlaves,
        quantidade_mandos: quantidadeMandos,
        observacoes_gerais: observacoesGerais,
        worker_assinatura_url: finalSignatureDataUrl,
        assinado_em: nowIso,
        assinatura_ip: clientIp,
        aceite_termos: true,
        status: Object.values(respostas).some(r => r.estado === 'MALA' || r.estado === 'REGULAR')
          ? 'COM_INCIDENCIAS'
          : 'ASSINADO'
      };

      const { blob } = await generateTermoAlojamentoPdfDocument(previewSignedTermo);

      const saved = await termoResponsabilidadeService.submitChecklistAndSignature(token, {
        worker_documento: workerDocumento.trim(),
        worker_cargo: workerCargo.trim(),
        cama_identificador: camaIdentificador.trim(),
        checklist_respostas: respostas,
        quantidade_llaves: quantidadeLlaves,
        quantidade_mandos: quantidadeMandos,
        observacoes_gerais: observacoesGerais,
        worker_assinatura_url: finalSignatureDataUrl,
        assinatura_ip: clientIp,
        pdfBlob: blob
      });

      setTermo(saved);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(err?.message || 'Error al registrar la firma.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">
          Cargando Término de Responsabilidad y Check-list de Alojamiento...
        </p>
      </div>
    );
  }

  if (errorMsg || !termo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Documento no disponible</h1>
          <p className="text-sm text-slate-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const isAlreadySigned =
    termo.status === 'ASSINADO' || termo.status === 'COM_INCIDENCIAS' || Boolean(termo.worker_assinatura_url);

  const mapsQuery = encodeURIComponent(
    [termo.alojamento_endereco, termo.alojamento_cidade, termo.alojamento_provincia, 'España']
      .filter(Boolean)
      .join(', ')
  );
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const areasGroup: Array<{
    key: 'HABITACION' | 'AREAS_COMUNES' | 'EQUIPOS_DISPONIBLES' | 'BANOS';
    titleEs: string;
    titlePt: string;
    subtitleEs: string;
    subtitlePt: string;
  }> = [
    {
      key: 'HABITACION',
      titleEs: '1. Habitación (Dormitorio Asignado)',
      titlePt: '1. Quarto (Dormitório Designado)',
      subtitleEs: 'Pintura, persiana, cama, colchón, ropa de cama, armario e iluminación',
      subtitlePt: 'Pintura, persiana, cama, colchão, roupa de cama, armário e iluminação'
    },
    {
      key: 'AREAS_COMUNES',
      titleEs: '2. Áreas Comunes del Inmueble',
      titlePt: '2. Áreas Comuns do Imóvel',
      subtitleEs: 'Pasillos, sala-comedor, área de cocina, utensilios y tendedero',
      subtitlePt: 'Corredores, sala de estar/jantar, cozinha, utensílios e lavanderia'
    },
    {
      key: 'EQUIPOS_DISPONIBLES',
      titleEs: '3. Equipos y Electrodomésticos Disponibles',
      titlePt: '3. Equipamentos e Eletrodomésticos Disponíveis',
      subtitleEs: 'Climatización, TV, mandos, cocina, refrigerador, lavadora y termo/caldera',
      subtitlePt: 'Climatização, TV, controles, fogão, geladeira, máquina de lavar e caldeira'
    },
    {
      key: 'BANOS',
      titleEs: '4. Baños e Instalaciones Sanitarias',
      titlePt: '4. Banheiros e Instalações Sanitárias',
      subtitleEs: 'Limpieza general, estado del WC, espejo, ducha y grifería',
      subtitlePt: 'Limpeza geral, vaso sanitário, espelho, chuveiro e torneiras'
    }
  ];

  const sum = termo.suministros_info || {};

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Top Executive Banner */}
      <header className="bg-slate-900 text-white border-b-4 border-blue-600 sticky top-0 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-black text-base">
              MCS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  {termo.empresa_contratante || 'GRUPO MCS'} • LOGÍSTICA
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {termo.codigo_termo}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                {lang === 'ES'
                  ? 'Término de Responsabilidad y Check-list de Alojamiento'
                  : 'Termo de Responsabilidade e Check-list de Alojamento'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setLang('ES')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  lang === 'ES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇪🇸 ES
              </button>
              <button
                type="button"
                onClick={() => setLang('PT')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  lang === 'PT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇵🇹 PT
              </button>
            </div>

            <button
              type="button"
              onClick={() => downloadTermoAlojamentoPdf(termo)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-5 space-y-5">
        {/* Signed Confirmation Banner if already completed */}
        {isAlreadySigned && (
          <div className="bg-emerald-950 text-white rounded-2xl p-5 border border-emerald-700 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full mb-1">
                  {lang === 'ES' ? 'DOCUMENTO FIRMADO Y ARCHIVADO' : 'DOCUMENTO ASSINADO E ARQUIVADO'}
                </span>
                <h2 className="text-base sm:text-lg font-bold">
                  {lang === 'ES'
                    ? '¡Check-in y Término de Responsabilidad Completado con Éxito!'
                    : 'Check-in e Termo de Responsabilidade Concluído com Sucesso!'}
                </h2>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  {lang === 'ES'
                    ? `Firmado electrónicamente por ${termo.worker_nome} el ${
                        termo.assinado_em ? new Date(termo.assinado_em).toLocaleString('es-ES') : 'hoy'
                      }. Este documento ya se encuentra archivado en su ficha de trabajador y en Logística.`
                    : `Assinado eletronicamente por ${termo.worker_nome} em ${
                        termo.assinado_em ? new Date(termo.assinado_em).toLocaleString('pt-BR') : 'hoje'
                      }. Este documento já está arquivado no seu cadastro e na Logística.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadTermoAlojamentoPdf(termo)}
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <FileDown className="w-4 h-4" />
              {lang === 'ES' ? 'Descargar Copia en PDF' : 'Baixar Cópia em PDF'}
            </button>
          </div>
        )}

        {/* CARD 1: DIRECCIÓN DEL ALOJAMIENTO, HABITACIÓN Y SUMINISTROS (CONTAS DO ALOJAMENTO) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-800 to-slate-900 px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-300" />
              <h2 className="text-sm font-bold uppercase tracking-wide">
                {lang === 'ES'
                  ? '1. Dirección del Alojamiento y Cuentas / Suministros'
                  : '1. Endereço do Alojamento e Contas / Suministros'}
              </h2>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-100 text-xs font-bold transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              {lang === 'ES' ? 'Abrir Dirección en Google Maps' : 'Abrir Endereço no Google Maps'}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                  {lang === 'ES' ? 'Alojamiento Asignado' : 'Alojamento Designado'}
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  [{termo.alojamento_codigo || 'AL-01'}] {termo.alojamento_nome}
                </p>
                <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    {termo.alojamento_endereco}
                    {termo.alojamento_cidade ? `, ${termo.alojamento_cidade}` : ''}
                    {termo.alojamento_provincia ? ` (${termo.alojamento_provincia})` : ''}
                  </span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
                <span className="text-[11px] font-semibold uppercase text-teal-700 block">
                  {lang === 'ES' ? 'Habitación / Apartamento / Cama' : 'Quarto / Apartamento / Cama'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <BedDouble className="w-5 h-5 text-teal-700 shrink-0" />
                  <input
                    type="text"
                    disabled={isAlreadySigned}
                    value={camaIdentificador}
                    onChange={e => setCamaIdentificador(e.target.value)}
                    className="w-full bg-white px-2.5 py-1 rounded-lg border border-teal-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-transparent disabled:border-transparent"
                  />
                </div>
                <p className="text-[11px] text-teal-700 mt-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Check-in: <strong>{termo.data_checkin || termo.data_emissao}</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                  {lang === 'ES' ? 'Entrega de Llaves y Mandos' : 'Entrega de Chaves e Controles'}
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">
                      {lang === 'ES' ? 'Juegos de Llaves' : 'Jogos de Chaves'}
                    </label>
                    <input
                      type="text"
                      disabled={isAlreadySigned}
                      value={quantidadeLlaves}
                      onChange={e => setQuantidadeLlaves(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 text-xs font-bold rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">
                      {lang === 'ES' ? 'Cant. Mandos' : 'Qtd. Controles'}
                    </label>
                    <input
                      type="text"
                      disabled={isAlreadySigned}
                      value={quantidadeMandos}
                      onChange={e => setQuantidadeMandos(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 text-xs font-bold rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Suministros / Contas do Alojamento */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-600" />
                  {lang === 'ES'
                    ? 'Régimen de Suministros y Cuentas del Alojamiento'
                    : 'Regime de Contas do Alojamento (Água, Luz, Gás, Internet)'}
                </h3>
                <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {lang === 'ES' ? 'Consumo Monitorizado por Logística' : 'Consumo Monitorado pela Logística'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {sum.agua !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    {lang === 'ES' ? 'Agua Potable' : 'Água Potável'}
                  </span>
                )}
                {sum.luz !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {lang === 'ES' ? 'Electricidad (Luz)' : 'Energia Elétrica (Luz)'}
                  </span>
                )}
                {sum.gas !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    {lang === 'ES' ? 'Gas / Termo Calentador' : 'Gás / Aquecedor'}
                  </span>
                )}
                {sum.internet !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                    Internet Wi-Fi
                  </span>
                )}
                {sum.cocina !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {lang === 'ES' ? 'Cocina y Electrodomésticos' : 'Cozinha e Eletrodomésticos'}
                  </span>
                )}
                {sum.lavadora !== false && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-700">
                    <Tv className="w-3.5 h-3.5 text-purple-600" />
                    {lang === 'ES' ? 'Lavadora / Climatización' : 'Lavadora / Climatização'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {lang === 'ES'
                  ? 'Las cuentas de Agua, Luz, Gas e Internet son gestionadas para el bienestar de los trabajadores alojados. Es obligatorio apagar luces, televisores, aires acondicionados y calefactores al salir de la habitación o del piso. Consumos abusivos por negligencia serán auditados conforme a la Cláusula 4.'
                  : 'As contas de Água, Luz, Gás e Internet são geridas para o bem-estar dos trabalhadores alojados. É obrigatório desligar luzes, TVs, ar-condicionado e aquecedores ao sair do quarto ou do imóvel. Consumos abusivos por negligência serão auditados conforme a Cláusula 4.'}
              </p>
            </div>
          </div>
        </section>

        {/* CARD 2: DATOS DEL TRABAJADOR */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-5 py-3 text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
              {lang === 'ES'
                ? '2. Datos del Trabajador Asignado'
                : '2. Dados do Trabalhador Designado'}
            </h2>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block">
                {lang === 'ES' ? 'Trabajador' : 'Trabalhador'}
              </label>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {termo.worker_nome}{' '}
                <span className="text-xs font-mono text-blue-600">({termo.worker_codigo || 'S/C'})</span>
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                DNI / NIE / Pasaporte <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isAlreadySigned}
                required
                placeholder="Ej: Y1234567X"
                value={workerDocumento}
                onChange={e => setWorkerDocumento(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                {lang === 'ES' ? 'Cargo / Función' : 'Cargo / Função'}
              </label>
              <input
                type="text"
                disabled={isAlreadySigned}
                value={workerCargo}
                onChange={e => setWorkerCargo(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block">
                {lang === 'ES' ? 'Empresa / Cliente' : 'Empresa / Cliente'}
              </label>
              <p className="text-xs font-bold text-slate-800 mt-1.5">
                {termo.empresa_contratante}
                {termo.cliente_nome ? ` • ${termo.cliente_nome}` : ''}
              </p>
            </div>
          </div>
        </section>

        {/* CARD 3: CLÁUSULAS DE RESPONSABILIDAD (1 A 8) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowClausesExpanded(prev => !prev)}
            className="w-full bg-slate-800 px-5 py-3.5 text-white flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                  {lang === 'ES'
                    ? '3. Términos, Reglas y Compromisos de Responsabilidad (8 Cláusulas)'
                    : '3. Termos, Regras e Compromissos de Responsabilidade (8 Cláusulas)'}
                </h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-slate-300">
              {showClausesExpanded
                ? lang === 'ES'
                  ? 'Ocultar'
                  : 'Ocultar'
                : lang === 'ES'
                  ? 'Leer cláusulas'
                  : 'Ler cláusulas'}
              {showClausesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {showClausesExpanded && (
            <div className="p-5 space-y-3 bg-slate-50/50">
              <p className="text-xs text-slate-600 italic">
                {lang === 'ES'
                  ? `Por medio del presente documento, yo ${termo.worker_nome}, declaro haber recibido en asignación el alojamiento arriba detallado, bajo los siguientes términos y compromisos:`
                  : `Por meio do presente documento, eu ${termo.worker_nome}, declaro ter recebido em designação o alojamento acima detalhado, sob os seguintes termos e compromissos:`}
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {CLAUSULAS_TERMO_ALOJAMENTO.map(cl => (
                  <div
                    key={cl.numero}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-lg bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {cl.numero}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase">
                        {lang === 'ES' ? cl.tituloEs : cl.tituloPt}
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed mt-0.5">
                        {lang === 'ES' ? cl.textoEs : cl.textoPt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* CARD 4: CUESTIONARIO / CHECK-LIST DE CONSERVACIÓN Y FOTOS DE AVERÍAS */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 px-5 py-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block">
                    {lang === 'ES' ? 'INSPECCIÓN DE ENTRADA OBLIGATORIA' : 'VISTORIA DE ENTRADA OBRIGATÓRIA'}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold">
                    {lang === 'ES'
                      ? '4. Cuestionario de Condición de Conservación del Inmueble'
                      : '4. Questionário de Condição de Conservação do Imóvel'}
                  </h2>
                </div>
                <div className="text-xs text-blue-200 flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <Camera className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {lang === 'ES'
                      ? 'Si detecta alguna avería (Regular o Mala), tome una foto con su móvil'
                      : 'Se identificar alguma avaria (Regular ou Mau), tire uma foto com seu celular'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {areasGroup.map(area => {
                const areaItems = CHECKLIST_ITEMS_CATALOG.filter(i => i.areaKey === area.key);
                return (
                  <div key={area.key} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {lang === 'ES' ? area.titleEs : area.titlePt}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'ES' ? area.subtitleEs : area.subtitlePt}
                        </p>
                      </div>
                      {!isAlreadySigned && (
                        <button
                          type="button"
                          onClick={() => markAllAreaAsBuena(area.key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 border border-emerald-300 text-[11px] font-bold transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {lang === 'ES' ? 'Marcar área como BUENA' : 'Marcar área como BOM'}
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-200">
                      {areaItems.map(item => {
                        const ans = respostas[item.id] || {
                          estado: 'BUENA' as EstadoConservacion,
                          observacao: '',
                          fotos: []
                        };
                        const isAvaria = ans.estado === 'REGULAR' || ans.estado === 'MALA';
                        const isUploadingThis = uploadingItemKey === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 transition-colors ${
                              ans.estado === 'MALA'
                                ? 'bg-red-50/40'
                                : ans.estado === 'REGULAR'
                                  ? 'bg-amber-50/40'
                                  : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                  {lang === 'ES' ? item.labelEs : item.labelPt}
                                </p>
                                {item.allowEspecificacion && (
                                  <input
                                    type="text"
                                    disabled={isAlreadySigned}
                                    placeholder={
                                      lang === 'ES'
                                        ? 'Especificar elemento (si aplica)...'
                                        : 'Especificar item (se aplicável)...'
                                    }
                                    value={ans.especificacion || ''}
                                    onChange={e => handleEspecificacionChange(item.id, e.target.value)}
                                    className="mt-1.5 w-full sm:w-80 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                                  />
                                )}
                              </div>

                              {/* Rating Buttons: BUENA | REGULAR | MALA | N/A */}
                              <div className="grid grid-cols-4 gap-1.5 shrink-0">
                                {(
                                  [
                                    {
                                      code: 'BUENA',
                                      labelEs: 'BUENA',
                                      labelPt: 'BOM',
                                      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
                                      idleClass: 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                                    },
                                    {
                                      code: 'REGULAR',
                                      labelEs: 'REGULAR',
                                      labelPt: 'REGULAR',
                                      activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
                                      idleClass: 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                                    },
                                    {
                                      code: 'MALA',
                                      labelEs: 'MALA',
                                      labelPt: 'MAU / AVARIA',
                                      activeClass: 'bg-red-600 text-white border-red-600 shadow-xs',
                                      idleClass: 'bg-white text-slate-700 border-slate-300 hover:bg-red-50'
                                    },
                                    {
                                      code: 'NA',
                                      labelEs: 'N/A',
                                      labelPt: 'N/A',
                                      activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs',
                                      idleClass: 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                                    }
                                  ] as const
                                ).map(btn => {
                                  const active = ans.estado === btn.code;
                                  return (
                                    <button
                                      key={btn.code}
                                      type="button"
                                      disabled={isAlreadySigned}
                                      onClick={() => handleEstadoChange(item.id, btn.code)}
                                      className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold transition text-center ${
                                        active ? btn.activeClass : btn.idleClass
                                      } disabled:opacity-75`}
                                    >
                                      {lang === 'ES' ? btn.labelEs : btn.labelPt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Observation + Camera Upload Row */}
                            <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                disabled={isAlreadySigned}
                                placeholder={
                                  isAvaria
                                    ? lang === 'ES'
                                      ? 'Describa el daño, mancha o avería observada...'
                                      : 'Descreva o dano, mancha ou avaria observada...'
                                    : lang === 'ES'
                                      ? 'Observación opcional sobre este ítem...'
                                      : 'Observação opcional sobre este item...'
                                }
                                value={ans.observacao || ''}
                                onChange={e => handleObsChange(item.id, e.target.value)}
                                className={`flex-1 px-3 py-1.5 rounded-xl border text-xs ${
                                  isAvaria
                                    ? 'border-amber-400 bg-white font-medium text-slate-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              />

                              {!isAlreadySigned && (
                                <label
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition shrink-0 ${
                                    isAvaria
                                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600 shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {isUploadingThis ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Camera className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {lang === 'ES' ? 'Tomar / Subir Foto' : 'Tirar / Anexar Foto'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    className="hidden"
                                    onChange={e => handlePhotoUploadForItem(item.id, e.target.files)}
                                  />
                                </label>
                              )}
                            </div>

                            {/* Thumbnail Gallery for this item */}
                            {Array.isArray(ans.fotos) && ans.fotos.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {ans.fotos.map((fotoUrl, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-300 shadow-2xs bg-slate-100"
                                  >
                                    <a href={fotoUrl} target="_blank" rel="noreferrer">
                                      <img
                                        src={fotoUrl}
                                        alt={`Evidencia ${fIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </a>
                                    {!isAlreadySigned && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePhotoFromItem(item.id, fIdx)}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Observaciones Generales */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {lang === 'ES'
                    ? 'Observaciones Generales del Estado del Alojamiento (Opcional)'
                    : 'Observações Gerais do Estado do Alojamento (Opcional)'}
                </label>
                <textarea
                  rows={3}
                  disabled={isAlreadySigned}
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  placeholder={
                    lang === 'ES'
                      ? 'Indique cualquier observación general adicional sobre la recepción de la habitación o del piso...'
                      : 'Indique qualquer observação geral adicional sobre o recebimento do quarto ou do imóvel...'
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
          </section>

          {/* CARD 5: FIRMAS (POR LA EMPRESA Y POR EL TRABAJADOR) */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                {lang === 'ES'
                  ? '5. Termo de Ciencia y Firma Electrónica'
                  : '5. Termo de Ciência e Assinatura Eletrônica'}
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {/* Acceptance Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/80 border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isAlreadySigned}
                  checked={aceiteTermos}
                  onChange={e => setAceiteTermos(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-blue-400 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                  {lang === 'ES'
                    ? `Declaro que he leído íntegramente las 8 cláusulas de este Término de Responsabilidad, he verificado el estado de conservación del alojamiento (${termo.alojamento_nome} - ${camaIdentificador}) y me comprometo a cumplir las normas de convivencia y uso consciente de las cuentas de suministros.`
                    : `Declaro que li integralmente as 8 cláusulas deste Termo de Responsabilidade, verifiquei o estado de conservação do alojamento (${termo.alojamento_nome} - ${camaIdentificador}) e comprometo-me a cumprir as normas de convivência e uso consciente das contas do imóvel.`}
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: POR LA EMPRESA */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                      {lang === 'ES' ? 'POR LA EMPRESA / LOGÍSTICA' : 'PELA EMPRESA / LOGÍSTICA'}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {termo.empresa_representante_nome || 'Coordinación de Logística & Operaciones'}
                    </p>
                  </div>

                  <div className="my-4 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-center min-h-[120px]">
                    {termo.empresa_assinatura_url ? (
                      <img
                        src={termo.empresa_assinatura_url}
                        alt="Sello Empresa"
                        className="max-h-28 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-blue-900">
                        SELLO DIGITAL CORPORATIVO • {termo.empresa_contratante}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span>Entidad: {termo.empresa_contratante}</span>
                    <span className="text-emerald-700 font-semibold">✓ Verificado</span>
                  </div>
                </div>

                {/* Right: POR EL TRABAJADOR */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                        {lang === 'ES'
                          ? 'POR EL TRABAJADOR (FIRMA ELECTRÓNICA)'
                          : 'PELO TRABALHADOR (ASSINATURA ELETRÔNICA)'}
                      </span>
                      <p className="text-xs text-slate-600 font-semibold">{termo.worker_nome}</p>
                    </div>

                    {!isAlreadySigned && (
                      <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setSigMode('draw')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                            sigMode === 'draw' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          {lang === 'ES' ? 'Dibujar' : 'Desenhar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigMode('type')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                            sigMode === 'type' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          <Type className="w-3 h-3" />
                          {lang === 'ES' ? 'Texto' : 'Digitar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigMode('upload')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                            sigMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          {lang === 'ES' ? 'Imagen' : 'Imagem'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isAlreadySigned && termo.worker_assinatura_url ? (
                    <div className="my-2 bg-white rounded-xl border border-emerald-300 p-3 flex flex-col items-center justify-center min-h-[130px]">
                      <img
                        src={termo.worker_assinatura_url}
                        alt="Firma del Trabajador"
                        className="max-h-28 object-contain"
                      />
                      <span className="text-[10px] text-emerald-700 font-mono mt-1">
                        Firmado: {termo.assinado_em ? new Date(termo.assinado_em).toLocaleString('es-ES') : ''}
                      </span>
                    </div>
                  ) : sigMode === 'draw' ? (
                    <div>
                      <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden relative">
                        <canvas
                          ref={canvasRef}
                          width={460}
                          height={150}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-[135px] touch-none cursor-crosshair"
                        />
                        {!hasDrawn && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                            {lang === 'ES'
                              ? 'Firme aquí con su dedo o ratón'
                              : 'Assine aqui com o dedo ou mouse'}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end mt-1.5">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-[11px] font-semibold text-slate-500 hover:text-red-600"
                        >
                          {lang === 'ES' ? 'Limpiar recuadro' : 'Limpar quadro'}
                        </button>
                      </div>
                    </div>
                  ) : sigMode === 'type' ? (
                    <div className="my-2 space-y-2">
                      <input
                        type="text"
                        value={typedSignature}
                        onChange={e => setTypedSignature(e.target.value)}
                        placeholder={lang === 'ES' ? 'Escriba su nombre completo' : 'Digite seu nome completo'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                      />
                      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center min-h-[84px] flex items-center justify-center">
                        <span className="text-2xl italic font-serif text-slate-900">
                          {typedSignature || termo.worker_nome}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="my-2">
                      <label className="flex flex-col items-center justify-center min-h-[125px] rounded-xl border-2 border-dashed border-slate-300 bg-white cursor-pointer hover:bg-slate-50 p-3">
                        {uploadedSignature ? (
                          <img src={uploadedSignature} alt="Firma subida" className="max-h-24 object-contain" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-xs text-slate-600 font-medium">
                              {lang === 'ES'
                                ? 'Subir foto de su firma en papel'
                                : 'Enviar foto da sua assinatura'}
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setUploadedSignature(reader.result);
                              }
                            };
                            reader.readAsDataURL(f);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span>DNI/NIE: {workerDocumento || 'Pendiente'}</span>
                    <span>Código: {termo.worker_codigo || 'S/C'}</span>
                  </div>
                </div>
              </div>

              {!isAlreadySigned && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2.5 transition disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {lang === 'ES'
                            ? 'Generando Acta PDF y Archivando Firma...'
                            : 'Gerando PDF Oficial e Arquivando Assinatura...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>
                          {lang === 'ES'
                            ? 'Confirmar Check-list, Firmar Término y Enviar a Logística'
                            : 'Confirmar Check-list, Assinar Termo e Enviar à Logística'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>
        </form>
      </main>
    </div>
  );
};

export default PublicTermoAlojamentoPage;
