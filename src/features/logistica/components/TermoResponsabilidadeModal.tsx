import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  FileDown,
  Building2,
  MapPin,
  BedDouble,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  ShieldCheck,
  Save,
  QrCode,
  Droplets,
  Zap,
  Flame,
  Wifi,
  Sparkles,
  Tv,
  Loader2,
  Eye
} from 'lucide-react';
import {
  termoResponsabilidadeService,
  type TermoResponsabilidadeAlojamento,
  CHECKLIST_ITEMS_CATALOG,
  CLAUSULAS_TERMO_ALOJAMENTO,
  type EstadoConservacion
} from '../services/termoResponsabilidadeService';
import { downloadTermoAlojamentoPdf } from '../utils/termoAlojamentoPdfGenerator';

interface TermoResponsabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  termo: TermoResponsabilidadeAlojamento | null;
  onUpdated?: (updated: TermoResponsabilidadeAlojamento) => void;
}

export const TermoResponsabilidadeModal: React.FC<TermoResponsabilidadeModalProps> = ({
  isOpen,
  onClose,
  termo,
  onUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'envio' | 'checklist' | 'documento'>('envio');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [savingCapa, setSavingCapa] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Editable cover state
  const [alojamentoNome, setAlojamentoNome] = useState('');
  const [alojamentoEndereco, setAlojamentoEndereco] = useState('');
  const [alojamentoCidade, setAlojamentoCidade] = useState('');
  const [camaIdentificador, setCamaIdentificador] = useState('');
  const [workerNome, setWorkerNome] = useState('');
  const [workerDocumento, setWorkerDocumento] = useState('');
  const [workerCargo, setWorkerCargo] = useState('');
  const [workerMovil, setWorkerMovil] = useState('');
  const [empresaContratante, setEmpresaContratante] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [dataCheckin, setDataCheckin] = useState('');
  const [quantidadeLlaves, setQuantidadeLlaves] = useState('1 juego');
  const [quantidadeMandos, setQuantidadeMandos] = useState('1');
  const [suministros, setSuministros] = useState({
    agua: true,
    luz: true,
    gas: true,
    internet: true,
    limpieza: false,
    cocina: true,
    lavadora: true,
    calefaccion: true
  });

  useEffect(() => {
    if (termo) {
      setAlojamentoNome(termo.alojamento_nome || '');
      setAlojamentoEndereco(termo.alojamento_endereco || '');
      setAlojamentoCidade(termo.alojamento_cidade || '');
      setCamaIdentificador(termo.cama_identificador || '');
      setWorkerNome(termo.worker_nome || '');
      setWorkerDocumento(termo.worker_documento || '');
      setWorkerCargo(termo.worker_cargo || '');
      setWorkerMovil(termo.worker_movil || '');
      setEmpresaContratante(termo.empresa_contratante || 'LUMINOUS');
      setClienteNome(termo.cliente_nome || '');
      setDataCheckin(termo.data_checkin || termo.data_emissao || new Date().toISOString().split('T')[0]);
      setQuantidadeLlaves(termo.quantidade_llaves || '1 juego');
      setQuantidadeMandos(termo.quantidade_mandos || '1');
      setSuministros({
        agua: termo.suministros_info?.agua !== false,
        luz: termo.suministros_info?.luz !== false,
        gas: termo.suministros_info?.gas !== false,
        internet: termo.suministros_info?.internet !== false,
        limpieza: Boolean(termo.suministros_info?.limpieza),
        cocina: termo.suministros_info?.cocina !== false,
        lavadora: termo.suministros_info?.lavadora !== false,
        calefaccion: termo.suministros_info?.calefaccion !== false
      });
    }
  }, [termo]);

  if (!isOpen || !termo) return null;

  const publicUrl = `${window.location.origin}/public/termo-alojamento/${termo.token}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [alojamentoEndereco, alojamentoCidade, 'España'].filter(Boolean).join(', ')
  )}`;

  const whatsappMessage = [
    `Hola *${workerNome}*, bienvenido(a).`,
    `El departamento de Logística de *${empresaContratante}* le asigna su alojamiento operativo:`,
    ``,
    `🏠 *Alojamiento:* [${termo.alojamento_codigo || 'ALOJ'}] ${alojamentoNome}`,
    `📍 *Dirección:* ${alojamentoEndereco}${alojamentoCidade ? `, ${alojamentoCidade}` : ''}`,
    `🗺️ *Ubicación Maps:* ${mapsUrl}`,
    `🛏️ *Habitación / Cama:* ${camaIdentificador}`,
    `📅 *Fecha de Entrada:* ${dataCheckin}`,
    ``,
    `⚠️ *IMPORTANTE (Check-in Obligatorio):*`,
    `Al ingresar al alojamiento, por favor revise el estado de su habitación, áreas comunes, equipos y baños, tome foto si observa algún desperfecto y firme electrónicamente su *Término de Responsabilidad* en el siguiente enlace:`,
    `👉 ${publicUrl}`
  ].join('\n');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopyWhatsappText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {}
  };

  const handleSendWhatsApp = async () => {
    if (termo.status === 'PENDENTE') {
      const updated = await termoResponsabilidadeService.updateTermoCapa(termo.id, { status: 'ENVIADO' });
      if (updated && onUpdated) onUpdated(updated);
    }
    const cleanPhone = (workerMovil || '').replace(/\D/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveCapa = async () => {
    setSavingCapa(true);
    try {
      const updated = await termoResponsabilidadeService.updateTermoCapa(termo.id, {
        alojamento_nome: alojamentoNome,
        alojamento_endereco: alojamentoEndereco,
        alojamento_cidade: alojamentoCidade,
        cama_identificador: camaIdentificador,
        worker_nome: workerNome,
        worker_documento: workerDocumento,
        worker_cargo: workerCargo,
        worker_movil: workerMovil,
        empresa_contratante: empresaContratante,
        cliente_nome: clienteNome,
        data_checkin: dataCheckin,
        quantidade_llaves: quantidadeLlaves,
        quantidade_mandos: quantidadeMandos,
        suministros_info: suministros
      });
      if (updated && onUpdated) {
        onUpdated(updated);
      }
    } finally {
      setSavingCapa(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadTermoAlojamentoPdf({
        ...termo,
        alojamento_nome: alojamentoNome,
        alojamento_endereco: alojamentoEndereco,
        alojamento_cidade: alojamentoCidade,
        cama_identificador: camaIdentificador,
        worker_nome: workerNome,
        worker_documento: workerDocumento,
        worker_cargo: workerCargo,
        empresa_contratante: empresaContratante,
        cliente_nome: clienteNome,
        data_checkin: dataCheckin,
        quantidade_llaves: quantidadeLlaves,
        quantidade_mandos: quantidadeMandos,
        suministros_info: suministros
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isSigned =
    termo.status === 'ASSINADO' || termo.status === 'COM_INCIDENCIAS' || Boolean(termo.worker_assinatura_url);

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    publicUrl
  )}`;

  const countByEstado = (estado: EstadoConservacion) =>
    Object.values(termo.checklist_respostas || {}).filter(r => r.estado === estado).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-slate-800 text-blue-300 px-2 py-0.5 rounded border border-slate-700">
                  {termo.codigo_termo}
                </span>
                {termo.status === 'COM_INCIDENCIAS' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    FIRMADO CON AVERÍAS ({termo.total_fotos} foto/s)
                  </span>
                ) : isSigned ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    FIRMADO Y ARCHIVADO
                  </span>
                ) : termo.status === 'ENVIADO' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full">
                    <Send className="w-3 h-3" />
                    ENVIADO AL TRABAJADOR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    PENDIENTE DE ENVÍO / FIRMA
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Término de Responsabilidad & Check-list — {workerNome}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Descargar PDF Oficial
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800/70 px-6 pt-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('envio')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'envio'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            1. Envío de Dirección + Enlace de Firma y Capa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'checklist'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            2. Respuestas del Check-list & Fotos ({CHECKLIST_ITEMS_CATALOG.length} ítems)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documento')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'documento'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            3. Vista Previa & Firmas Electrónicas
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'envio' && (
            <>
              {/* Quick Dispatch Banner (WhatsApp + Link + QR) */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 border border-blue-800/50 shadow-lg">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Flujo Digital de Recepción de Alojamiento
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold">
                      Enviar Dirección del Alojamiento + Check-list y Firma Electrónica
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Envíe este enlace al trabajador por WhatsApp cuando le asigne el alojamiento. El trabajador verá
                      la dirección exacta con mapa, las reglas de las cuentas (agua, luz, gas, internet), calificará el
                      estado de cada área (Buena / Regular / Mala), tomará fotos si detecta alguna avería y firmará
                      electrónicamente desde su móvil.
                    </p>

                    {/* Copyable Public URL */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <div className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-blue-300 truncate">
                        {publicUrl}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 transition shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                      </button>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir Portal del Trabajador
                      </a>
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        Enviar Dirección + Termo por WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyWhatsappText}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
                      >
                        {copiedMsg ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedMsg ? 'Mensaje Copiado' : 'Copiar Mensaje con Dirección'}
                      </button>
                    </div>
                  </div>

                  {/* QR Code Card for In-Person Scanning */}
                  <div className="bg-white text-slate-900 rounded-2xl p-3.5 flex flex-col items-center justify-center shrink-0 w-full sm:w-44 mx-auto lg:mx-0">
                    <img
                      src={qrCodeImageUrl}
                      alt="QR Code Firma"
                      className="w-28 h-28 object-contain rounded-lg"
                    />
                    <span className="text-[10px] font-bold uppercase text-slate-600 mt-2 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-blue-600" />
                      Escanear con Móvil
                    </span>
                  </div>
                </div>
              </div>

              {/* Cover Data Form (Capa Personalizada para el Trabajador y Alojamiento) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Datos de Capa del Documento (Trabajador, Dirección, Habitación y Cuentas)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Personalice los datos de asignación antes de enviar o descargar el PDF.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCapa}
                    disabled={savingCapa}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {savingCapa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar Cambios de Capa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Nombre del Trabajador
                    </label>
                    <input
                      type="text"
                      value={workerNome}
                      onChange={e => setWorkerNome(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      DNI / NIE / Pasaporte
                    </label>
                    <input
                      type="text"
                      placeholder="Completar o lo llena el trabajador"
                      value={workerDocumento}
                      onChange={e => setWorkerDocumento(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Teléfono Móvil / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: +34 600 000 000"
                      value={workerMovil}
                      onChange={e => setWorkerMovil(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Cargo / Especialidad
                    </label>
                    <input
                      type="text"
                      value={workerCargo}
                      onChange={e => setWorkerCargo(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Empresa Contratante
                    </label>
                    <input
                      type="text"
                      value={empresaContratante}
                      onChange={e => setEmpresaContratante(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Cliente / Obra Vinculada
                    </label>
                    <input
                      type="text"
                      value={clienteNome}
                      onChange={e => setClienteNome(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Alojamiento Asignado
                    </label>
                    <input
                      type="text"
                      value={alojamentoNome}
                      onChange={e => setAlojamentoNome(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Dirección Exacta del Alojamiento (Para Envío al Trabajador)
                    </label>
                    <input
                      type="text"
                      value={alojamentoEndereco}
                      onChange={e => setAlojamentoEndereco(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block">
                      Ciudad / Municipio
                    </label>
                    <input
                      type="text"
                      value={alojamentoCidade}
                      onChange={e => setAlojamentoCidade(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-teal-700 block">
                      Habitación / Apartamento / Cama No.
                    </label>
                    <input
                      type="text"
                      value={camaIdentificador}
                      onChange={e => setCamaIdentificador(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-teal-400 bg-teal-50/40 dark:bg-slate-900 text-xs font-bold text-teal-900 dark:text-teal-300"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block">Check-in</label>
                      <input
                        type="date"
                        value={dataCheckin}
                        onChange={e => setDataCheckin(e.target.value)}
                        className="w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block">Llaves</label>
                      <input
                        type="text"
                        value={quantidadeLlaves}
                        onChange={e => setQuantidadeLlaves(e.target.value)}
                        className="w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block">Mandos</label>
                      <input
                        type="text"
                        value={quantidadeMandos}
                        onChange={e => setQuantidadeMandos(e.target.value)}
                        className="w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Suministros / Contas do Alojamento Toggles */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block mb-2">
                    Cuentas y Suministros Incluidos / Controlados en este Alojamiento:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'agua', label: 'Agua Potable', icon: Droplets },
                      { key: 'luz', label: 'Electricidad (Luz)', icon: Zap },
                      { key: 'gas', label: 'Gas / Termo', icon: Flame },
                      { key: 'internet', label: 'Internet Wi-Fi', icon: Wifi },
                      { key: 'cocina', label: 'Cocina Equipada', icon: Sparkles },
                      { key: 'lavadora', label: 'Lavadora', icon: Tv },
                      { key: 'calefaccion', label: 'Climatización / Calefacción', icon: Flame },
                      { key: 'limpieza', label: 'Limpieza Común', icon: Sparkles }
                    ].map(sItem => {
                      const active = (suministros as any)[sItem.key];
                      const IconComp = sItem.icon;
                      return (
                        <button
                          key={sItem.key}
                          type="button"
                          onClick={() =>
                            setSuministros(prev => ({ ...prev, [sItem.key]: !(prev as any)[sItem.key] }))
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-500 border-slate-300'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          {sItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-bold uppercase text-emerald-700">Condición BUENA</span>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">{countByEstado('BUENA')} ítems</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold uppercase text-amber-700">Condición REGULAR</span>
                  <p className="text-xl font-black text-amber-900 mt-0.5">{countByEstado('REGULAR')} ítems</p>
                </div>
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[11px] font-bold uppercase text-red-700">Condición MALA / AVERÍA</span>
                  <p className="text-xl font-black text-red-900 mt-0.5">{countByEstado('MALA')} ítems</p>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[11px] font-bold uppercase text-blue-700">Fotos de Evidencia</span>
                  <p className="text-xl font-black text-blue-900 mt-0.5">{termo.total_fotos || 0} foto(s)</p>
                </div>
              </div>

              {/* Checklist Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Área / Elemento Inspeccionado</th>
                      <th className="py-3 px-4 text-center w-32">Calificación</th>
                      <th className="py-3 px-4">Observaciones y Fotos Adjuntas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {CHECKLIST_ITEMS_CATALOG.map(item => {
                      const ans = termo.checklist_respostas?.[item.id] || {
                        estado: 'BUENA',
                        observacao: '',
                        fotos: []
                      };
                      return (
                        <tr
                          key={item.id}
                          className={
                            ans.estado === 'MALA'
                              ? 'bg-red-50/60'
                              : ans.estado === 'REGULAR'
                                ? 'bg-amber-50/60'
                                : 'bg-white'
                          }
                        >
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold uppercase text-blue-700 block">
                              {item.areaLabelEs}
                            </span>
                            <span className="font-semibold text-slate-900">{item.labelEs}</span>
                            {ans.especificacion && (
                              <span className="block text-[11px] text-slate-500 italic">
                                Especificación: {ans.especificacion}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                ans.estado === 'BUENA'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : ans.estado === 'REGULAR'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : ans.estado === 'MALA'
                                      ? 'bg-red-100 text-red-800 border border-red-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {ans.estado === 'NA' ? 'N/A' : ans.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ans.observacao ? (
                              <p className="font-medium text-slate-800">{ans.observacao}</p>
                            ) : (
                              <span className="text-slate-400">Sin observaciones</span>
                            )}
                            {Array.isArray(ans.fotos) && ans.fotos.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {ans.fotos.map((fUrl, idx) => (
                                  <a
                                    key={idx}
                                    href={fUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shadow-2xs"
                                  >
                                    <img src={fUrl} alt="Foto" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'documento' && (
            <div className="space-y-5">
              {/* Dual Signature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-blue-900 block">
                    POR LA EMPRESA ({empresaContratante})
                  </span>
                  <div className="my-3 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-center h-28">
                    {termo.empresa_assinatura_url ? (
                      <img
                        src={termo.empresa_assinatura_url}
                        alt="Sello Empresa"
                        className="max-h-24 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">Sello Corporativo</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 text-center">
                    {termo.empresa_representante_nome}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-emerald-800 block">
                    POR EL TRABAJADOR ({workerNome})
                  </span>
                  <div className="my-3 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-center h-28">
                    {termo.worker_assinatura_url ? (
                      <img
                        src={termo.worker_assinatura_url}
                        alt="Firma Trabajador"
                        className="max-h-24 object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <span className="text-xs text-slate-500">
                          Pendiente de firma por el trabajador en el enlace público
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 text-center">
                    {workerNome} • DNI/NIE: {workerDocumento || 'Pendiente'}
                  </p>
                  {termo.assinado_em && (
                    <p className="text-[11px] text-emerald-700 text-center mt-0.5">
                      Firmado el {new Date(termo.assinado_em).toLocaleString('es-ES')} • IP: {termo.assinatura_ip}
                    </p>
                  )}
                </div>
              </div>

              {/* Clauses Summary Preview */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cláusulas Oficiales Incluidas en el Término de Responsabilidad
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {CLAUSULAS_TERMO_ALOJAMENTO.map(cl => (
                    <div key={cl.numero} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <strong className="text-slate-900">
                        {cl.numero}. {cl.tituloEs}:
                      </strong>{' '}
                      <span className="text-slate-600">{cl.textoEs}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
