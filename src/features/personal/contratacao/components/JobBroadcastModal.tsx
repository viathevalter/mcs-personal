import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  Copy,
  Check,
  Download,
  Share2,
  Image as ImageIcon,
  MessageCircle,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Smartphone,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  contratacaoRecruitmentService,
  type BroadcastChannel,
} from '../services/contratacaoRecruitmentService';

export interface JobBroadcastInitialData {
  pedidoCodigo?: string;
  clientName?: string;
  jobFunctionName?: string;
  quantity?: number;
  location?: string;
  startDate?: string;
  alojamentoIncluso?: boolean;
  epiIncluso?: boolean;
  tarifaReferencia?: string;
}

interface JobBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: JobBroadcastInitialData | null;
}

type CardTheme = 'dark' | 'blue' | 'amber';
type CardAspect = 'square' | 'story';

export const JobBroadcastModal: React.FC<JobBroadcastModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const [roleTitle, setRoleTitle] = useState('SOLDADOR TIG (GTAW)');
  const [quantity, setQuantity] = useState(2);
  const [location, setLocation] = useState('España');
  const [startDateText, setStartDateText] = useState('Incorporación Inmediata');
  const [requirements, setRequirements] = useState(
    'Documentación europea o permiso de trabajo válido • Experiencia comprobada en obra industrial'
  );
  const [benefits, setBenefits] = useState(
    'Alojamiento incluido • EPIs completos • Contrato estable • Pagos puntuales'
  );
  const [recruiterPhone, setRecruiterPhone] = useState('+34 600 000 000');
  const [captureFormUrl, setCaptureFormUrl] = useState(
    'https://mcs-contratacao.vercel.app/#/candidatar'
  );
  const [language, setLanguage] = useState<'es' | 'pt'>('es');
  const [platformTab, setPlatformTab] = useState<'whatsapp' | 'facebook'>('whatsapp');
  const [customText, setCustomText] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // Visual Card Generator states
  const [cardTheme, setCardTheme] = useState<CardTheme>('dark');
  const [cardAspect, setCardAspect] = useState<CardAspect>('square');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Favorite Broadcast Channels (WhatsApp / Facebook groups)
  const [channels, setChannels] = useState<BroadcastChannel[]>([]);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] =
    useState<BroadcastChannel['platform']>('facebook');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      contratacaoRecruitmentService.fetchBroadcastChannels().then(setChannels);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      if (initialData.jobFunctionName) setRoleTitle(initialData.jobFunctionName.toUpperCase());
      if (initialData.quantity && initialData.quantity > 0) setQuantity(initialData.quantity);
      if (initialData.location) setLocation(initialData.location);
      if (initialData.startDate) {
        setStartDateText(`Inicio previsto: ${initialData.startDate}`);
      } else {
        setStartDateText('Incorporación Inmediata');
      }
      const benParts: string[] = [];
      if (initialData.alojamentoIncluso !== false) benParts.push('Alojamiento incluido');
      if (initialData.epiIncluso !== false) benParts.push('EPIs completos');
      benParts.push('Contrato directo');
      benParts.push('Alta en Seguridad Social');
      setBenefits(benParts.join(' • '));
    }
  }, [initialData, isOpen]);

  // Gerar texto automático sempre que os parâmetros mudarem
  useEffect(() => {
    const cleanPhone = recruiterPhone.replace(/[^0-9]/g, '');
    const waDirectLink = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          language === 'es'
            ? `Hola! Tengo interés en la vacante de ${roleTitle} (${location}).`
            : `Olá! Tenho interesse na vaga de ${roleTitle} (${location}).`
        )}`
      : '';

    if (language === 'es') {
      if (platformTab === 'whatsapp') {
        setCustomText(
          `🚨 *OFERTA DE EMPLEO INDUSTRIAL - INCORPORACIÓN INMEDIATA* 🚨\n\n` +
            `👷‍♂️ *Puesto:* ${roleTitle}\n` +
            `🔢 *Vacantes:* ${quantity} plaza(s)\n` +
            `📍 *Ubicación:* ${location}\n` +
            `📅 *Inicio:* ${startDateText}\n\n` +
            `✅ *Requisitos:*\n• ${requirements.split('•').map(s => s.trim()).filter(Boolean).join('\n• ')}\n\n` +
            `🏠 *Ofrecemos:*\n• ${benefits.split('•').map(s => s.trim()).filter(Boolean).join('\n• ')}\n\n` +
            `📲 *¿Interesado/a? Envía tu CV ahora mismo:*\n` +
            (waDirectLink ? `👉 *WhatsApp Directo:* ${waDirectLink}\n` : `👉 *WhatsApp:* ${recruiterPhone}\n`) +
            (captureFormUrl ? `📝 *Registro Rápido de CV:* ${captureFormUrl}` : '')
        );
      } else {
        setCustomText(
          `📢 ¡SE BUSCAN PROFESIONALES: ${roleTitle} (${quantity} VACANTES)! 🔧⚡\n\n` +
            `Estamos seleccionando personal cualificado para proyecto industrial en ${location}.\n\n` +
            `🔹 PUESTO: ${roleTitle} (${quantity} plazas)\n` +
            `🔹 UBICACIÓN: ${location}\n` +
            `🔹 INCORPORACIÓN: ${startDateText}\n\n` +
            `📋 REQUISITOS:\n` +
            `✔️ ${requirements.split('•').map(s => s.trim()).filter(Boolean).join('\n✔️ ')}\n\n` +
            `💼 QUÉ OFRECEMOS:\n` +
            `⭐ ${benefits.split('•').map(s => s.trim()).filter(Boolean).join('\n⭐ ')}\n\n` +
            `📩 ¿CÓMO APLICAR?\n` +
            `1️⃣ Contáctanos por WhatsApp al ${recruiterPhone}${waDirectLink ? ` (${waDirectLink})` : ''}\n` +
            `2️⃣ O sube tu currículum directamente aquí: ${captureFormUrl}\n\n` +
            `#EmpleoIndustrial #Soldadores #Electricistas #MontajeIndustrial #TrabajoEnEspaña #TrabajoEnEuropa #VacantesUrgentes`
        );
      }
    } else {
      if (platformTab === 'whatsapp') {
        setCustomText(
          `🚨 *VAGA DE EMPREGO INDUSTRIAL - CONTRATAÇÃO IMEDIATA* 🚨\n\n` +
            `👷‍♂️ *Função:* ${roleTitle}\n` +
            `🔢 *Vagas:* ${quantity} vaga(s)\n` +
            `📍 *Local da Obra:* ${location}\n` +
            `📅 *Início:* ${startDateText}\n\n` +
            `✅ *Requisitos:*\n• ${requirements.split('•').map(s => s.trim()).filter(Boolean).join('\n• ')}\n\n` +
            `🏠 *Oferecemos:*\n• ${benefits.split('•').map(s => s.trim()).filter(Boolean).join('\n• ')}\n\n` +
            `📲 *Tem interesse e documentação válida? Chame agora:*\n` +
            (waDirectLink ? `👉 *WhatsApp Direto:* ${waDirectLink}\n` : `👉 *WhatsApp:* ${recruiterPhone}\n`) +
            (captureFormUrl ? `📝 *Envie seu Currículo no link:* ${captureFormUrl}` : '')
        );
      } else {
        setCustomText(
          `📢 CONTRATAÇÃO IMEDIATA NA EUROPA: ${roleTitle} (${quantity} VAGAS)! 🔧⚡\n\n` +
            `Selecionamos profissionais com experiência comprovada para obra industrial em ${location}.\n\n` +
            `🔹 FUNÇÃO: ${roleTitle} (${quantity} vagas)\n` +
            `🔹 LOCALIZAÇÃO: ${location}\n` +
            `🔹 INÍCIO: ${startDateText}\n\n` +
            `📋 REQUISITOS:\n` +
            `✔️ ${requirements.split('•').map(s => s.trim()).filter(Boolean).join('\n✔️ ')}\n\n` +
            `💼 OFERECEMOS:\n` +
            `⭐ ${benefits.split('•').map(s => s.trim()).filter(Boolean).join('\n⭐ ')}\n\n` +
            `📩 COMO SE CANDIDATAR:\n` +
            `1️⃣ Chame no WhatsApp: ${recruiterPhone}${waDirectLink ? ` (${waDirectLink})` : ''}\n` +
            `2️⃣ Ou cadastre seu currículo diretamente em: ${captureFormUrl}\n\n` +
            `#VagasNaEuropa #Soldador #Eletricista #Tubero #MontagemIndustrial #EmpregoEspanha #EmpregoPortugal`
        );
      }
    }
  }, [
    roleTitle,
    quantity,
    location,
    startDateText,
    requirements,
    benefits,
    recruiterPhone,
    captureFormUrl,
    language,
    platformTab,
  ]);

  // Renderizar o Card Visual em PNG (HTML5 Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = cardAspect === 'square' ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient por Tema
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (cardTheme === 'dark') {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#062019');
    } else if (cardTheme === 'blue') {
      grad.addColorStop(0, '#0a192f');
      grad.addColorStop(0.5, '#112240');
      grad.addColorStop(1, '#1e3a8a');
    } else {
      grad.addColorStop(0, '#181207');
      grad.addColorStop(0.5, '#1c1917');
      grad.addColorStop(1, '#451a03');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glow decorativo no topo e rodapé
    const accentColor =
      cardTheme === 'dark' ? '#10b981' : cardTheme === 'blue' ? '#38bdf8' : '#f59e0b';
    const radial = ctx.createRadialGradient(width * 0.85, height * 0.15, 20, width * 0.85, height * 0.15, 480);
    radial.addColorStop(0, accentColor + '38');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Borda interna sutil
    ctx.strokeStyle = accentColor + '45';
    ctx.lineWidth = 4;
    ctx.strokeRect(44, 44, width - 88, height - 88);

    // Barra superior de destaque
    ctx.fillStyle = accentColor;
    ctx.fillRect(44, 44, width - 88, 14);

    const padX = 96;
    let curY = cardAspect === 'square' ? 140 : 220;

    // 2. Cabeçalho: Badge de Contratação Imediata
    ctx.fillStyle = accentColor + '25';
    ctx.beginPath();
    ctx.roundRect(padX, curY, 520, 62, 31);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(
      language === 'es' ? '⚡ CONTRATACIÓN INMEDIATA' : '⚡ CONTRATAÇÃO IMEDIATA',
      padX + 34,
      curY + 41
    );

    // Brand tag à direita
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('MCS INDUSTRIAL EUROPE', width - padX, curY + 41);
    ctx.textAlign = 'left';

    curY += cardAspect === 'square' ? 130 : 190;

    // 3. Título Principal da Função (quebra automática de linha se for longo)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 72px Inter, system-ui, sans-serif';
    const words = (roleTitle || 'VACANTE INDUSTRIAL').toUpperCase().split(' ');
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width - padX * 2 && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    lines.slice(0, 3).forEach(l => {
      ctx.fillText(l, padX, curY);
      curY += 86;
    });

    curY += 16;

    // 4. Pill de Quantidade + Localização
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(padX, curY, 270, 68, 16);
    ctx.fill();

    ctx.fillStyle = '#090d16';
    ctx.font = '900 32px Inter, system-ui, sans-serif';
    ctx.fillText(
      `${quantity} ${language === 'es' ? 'VACANTES' : 'VAGAS'}`,
      padX + 34,
      curY + 45
    );

    // Localização ao lado
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(padX + 290, curY, width - padX * 2 - 290, 68, 16);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px Inter, system-ui, sans-serif';
    const locTrunc = location.length > 28 ? location.slice(0, 28) + '...' : location;
    ctx.fillText(`📍 ${locTrunc}`, padX + 320, curY + 45);

    curY += cardAspect === 'square' ? 120 : 180;

    // 5. Bloco de Condições / Benefícios
    ctx.fillStyle = '#1e293b99';
    const boxHeight = cardAspect === 'square' ? 270 : 440;
    ctx.beginPath();
    ctx.roundRect(padX, curY, width - padX * 2, boxHeight, 24);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(
      language === 'es' ? 'CONDICIONES Y BENEFICIOS:' : 'CONDIÇÕES E BENEFÍCIOS:',
      padX + 40,
      curY + 56
    );

    const benefitItems = [
      ...benefits.split('•').map(s => s.trim()).filter(Boolean),
      ...requirements.split('•').map(s => s.trim()).filter(Boolean),
    ].slice(0, cardAspect === 'square' ? 4 : 6);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    let itemY = curY + 110;
    benefitItems.forEach(item => {
      const cleanItem = item.length > 48 ? item.slice(0, 48) + '...' : item;
      ctx.fillText(`✔  ${cleanItem}`, padX + 40, itemY);
      itemY += cardAspect === 'square' ? 44 : 56;
    });

    // 6. Rodapé CTA (WhatsApp)
    const footerY = height - (cardAspect === 'square' ? 210 : 300);
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(padX, footerY, width - padX * 2, 120, 24);
    ctx.fill();

    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(
      language === 'es'
        ? 'ENVÍA TU CURRÍCULUM POR WHATSAPP:'
        : 'ENVIE SEU CURRÍCULO PELO WHATSAPP:',
      padX + 44,
      footerY + 46
    );

    ctx.font = '900 44px Inter, system-ui, sans-serif';
    ctx.fillText(`📲 ${recruiterPhone}`, padX + 44, footerY + 98);
  }, [
    roleTitle,
    quantity,
    location,
    benefits,
    requirements,
    recruiterPhone,
    language,
    cardTheme,
    cardAspect,
    isOpen,
  ]);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(customText);
    setCopiedText(true);
    toast.success('Texto do anúncio copiado para a área de transferência!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const slug = roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    a.href = url;
    a.download = `vaga_${slug}_${cardAspect}.png`;
    a.click();
    toast.success('Arte PNG baixada com sucesso!');
  };

  const handleCopyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Falha ao gerar imagem');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      toast.success('Imagem copiada! Agora basta dar Ctrl+V no WhatsApp Web ou Facebook.');
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.error(err);
      handleDownloadCard();
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(customText)}`;
    window.open(url, '_blank');
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !newChannelUrl.trim()) return;
    try {
      const created = await contratacaoRecruitmentService.createBroadcastChannel({
        name: newChannelName.trim(),
        platform: newChannelPlatform,
        category: newChannelCategory.trim() || 'Geral',
        url: newChannelUrl.trim(),
        members_estimate: null,
        notes: null,
      });
      setChannels(prev => [created, ...prev]);
      setNewChannelName('');
      setNewChannelCategory('');
      setNewChannelUrl('');
      setIsAddingChannel(false);
      toast.success('Grupo/Canal salvo na lista de divulgação!');
    } catch (err: any) {
      toast.error('Erro ao salvar grupo: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      await contratacaoRecruitmentService.deleteBroadcastChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      toast.success('Grupo removido.');
    } catch (err: any) {
      toast.error('Erro ao remover grupo.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[1120px] max-h-[92vh] overflow-y-auto p-0 gap-0 bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="p-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Central de Divulgação de Vagas (WhatsApp & Facebook)
                  {initialData?.pedidoCodigo && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {initialData.pedidoCodigo}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gere textos persuasivos e artes em PNG (Feed e Status) prontos para postar em grupos de emprego.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={language === 'es' ? 'default' : 'outline'}
                onClick={() => setLanguage('es')}
                className="text-xs h-8"
              >
                🇪🇸 Español
              </Button>
              <Button
                type="button"
                size="sm"
                variant={language === 'pt' ? 'default' : 'outline'}
                onClick={() => setLanguage('pt')}
                className="text-xs h-8"
              >
                🇵🇹/🇧🇷 Português
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda (7 cols): Configuração + Texto Formatado + Grupos */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Dados da Vaga para Divulgação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Função / Perfil Procurado</Label>
                  <Input
                    value={roleTitle}
                    onChange={e => setRoleTitle(e.target.value)}
                    placeholder="Ex: SOLDADOR TIG (GTAW)"
                    className="h-9 text-sm font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs">Qtd. Vagas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value) || 1)}
                    className="h-9 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Localização / País da Obra</Label>
                  <Input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: Pontevedra, España"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Previsão de Início</Label>
                  <Input
                    value={startDateText}
                    onChange={e => setStartDateText(e.target.value)}
                    placeholder="Ex: Incorporación Inmediata"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">WhatsApp do Recrutador (c/ DDI)</Label>
                  <Input
                    value={recruiterPhone}
                    onChange={e => setRecruiterPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Link do Formulário de Captura de CV</Label>
                  <Input
                    value={captureFormUrl}
                    onChange={e => setCaptureFormUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Requisitos (separados por •)</Label>
                  <Input
                    value={requirements}
                    onChange={e => setRequirements(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Benefícios Oferecidos (separados por •)</Label>
                  <Input
                    value={benefits}
                    onChange={e => setBenefits(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Texto Gerado */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatformTab('whatsapp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      platformTab === 'whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Modelo Grupos WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatformTab('facebook')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      platformTab === 'facebook'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Modelo Grupos Facebook / LinkedIn
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyText}
                    className="h-8 text-xs gap-1.5"
                  >
                    {copiedText ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedText ? 'Texto Copiado!' : 'Copiar Texto'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Enviar no WhatsApp
                  </Button>
                </div>
              </div>

              <textarea
                rows={10}
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Atalhos de Grupos de WhatsApp / Facebook */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Meus Grupos de Divulgação (Facebook & WhatsApp)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Salve os links dos grupos onde você divulga vagas para abrir com 1 clique e colar o anúncio.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingChannel(prev => !prev)}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Grupo
                </Button>
              </div>

              {isAddingChannel && (
                <form
                  onSubmit={handleAddChannel}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2"
                >
                  <Input
                    placeholder="Nome do Grupo (Ex: Soldadores España)"
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                  <select
                    value={newChannelPlatform}
                    onChange={e => setNewChannelPlatform(e.target.value as any)}
                    className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs"
                  >
                    <option value="facebook">Facebook Grupo</option>
                    <option value="whatsapp">WhatsApp Grupo</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                  <Input
                    placeholder="Link (https://...)"
                    value={newChannelUrl}
                    onChange={e => setNewChannelUrl(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 text-white">
                    Salvar Grupo
                  </Button>
                </form>
              )}

              {channels.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Nenhum grupo cadastrado ainda. Clique em "+ Adicionar Grupo" para salvar seus grupos favoritos de Facebook e WhatsApp.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {channels.map(ch => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0">
                            {ch.platform}
                          </Badge>
                          <span className="text-xs font-semibold truncate">{ch.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(ch.url, '_blank')}
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 gap-1"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita (5 cols): Gerador Automático de Arte PNG */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Arte Automática em PNG (Feed & Status)
                  </h3>
                </div>
              </div>

              {/* Seletores de Tema e Proporção */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCardTheme('dark')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      cardTheme === 'dark'
                        ? 'bg-slate-900 text-emerald-400 border-emerald-500'
                        : 'bg-slate-100 text-slate-600 border-transparent'
                    }`}
                  >
                    Industrial Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardTheme('blue')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      cardTheme === 'blue'
                        ? 'bg-blue-950 text-sky-400 border-sky-500'
                        : 'bg-slate-100 text-slate-600 border-transparent'
                    }`}
                  >
                    MCS Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardTheme('amber')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      cardTheme === 'amber'
                        ? 'bg-amber-950 text-amber-400 border-amber-500'
                        : 'bg-slate-100 text-slate-600 border-transparent'
                    }`}
                  >
                    Urgente
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCardAspect('square')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border ${
                      cardAspect === 'square'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-transparent'
                    }`}
                  >
                    <Square className="w-3 h-3" /> Feed (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardAspect('story')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border ${
                      cardAspect === 'story'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-transparent'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> Status (9:16)
                  </button>
                </div>
              </div>

              {/* Preview do Canvas */}
              <div className="flex justify-center bg-slate-950/90 rounded-xl p-3 border border-slate-800">
                <canvas
                  ref={canvasRef}
                  className={`rounded-lg shadow-2xl border border-slate-700 ${
                    cardAspect === 'square' ? 'w-full max-w-[340px] aspect-square' : 'w-full max-w-[240px] aspect-[9/16]'
                  }`}
                />
              </div>

              {/* Botões de Download e Cópia da Arte */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyImageToClipboard}
                  className="w-full text-xs gap-1.5 h-10 font-semibold border-emerald-300 dark:border-emerald-800"
                >
                  {copiedImage ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                  )}
                  {copiedImage ? 'Imagem Copiada!' : 'Copiar Arte (Ctrl+V)'}
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadCard}
                  className="w-full text-xs gap-1.5 h-10 font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4" />
                  Baixar PNG Alta Res.
                </Button>
              </div>
              <p className="text-[11px] text-center text-slate-400">
                Dica: Clique em <strong>"Copiar Arte (Ctrl+V)"</strong> e cole direto na conversa do WhatsApp Web ou no post do Facebook!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
