import { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  Building2,
  User,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useMarketingTemplates, type MarketingTemplate } from '@/features/comercial/leads/hooks/useMarketing';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface SendMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  queueItemId?: string | null;
  onConfirm: (materialSent: string, emailUsed: string, notes: string) => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  isSubmitting?: boolean;
}

const BUILTIN_MATERIALS = [
  {
    id: 'dossier_geral',
    title: 'Dossier Institucional MCS Soldadores & Montadores (PDF)',
    subject: 'MCS Servicios Industriales — Información y Dossier Técnico',
    description: 'Apresentação corporativa, especialidades (TIG, MIG, Tubistas, Caldeireiros), projetos executados na Europa.',
    link: 'https://mcspersonal.com/dossier-tecnico-mcs.pdf',
    defaultBody: `<p>Estimado/a <strong>{{nome_contato}}</strong>,</p>
<p>Siguiendo nuestra conversación telefónica, le adjunto la información de MCS Servicios Industriales respecto a nuestra disponibilidad de personal técnico cualificado (soldadores homologados TIG/MIG/MAG, tuberos y montadores industriales).</p>
<p><strong>Material solicitado:</strong> Dossier Institucional MCS Soldadores & Montadores (PDF)<br/>
<strong>Enlace directo al documento:</strong> <a href="https://mcspersonal.com/dossier-tecnico-mcs.pdf">Ver Dossier Técnico MCS</a></p>
<p>Quedamos a su entera disposición para cualquier cotización o refuerzo de personal en sus próximas obras y proyectos.</p>
<br/>
<p>Un cordial saludo,<br/>
<strong>{{vendedor_nome}}</strong><br/>
Equipo Comercial MCS Servicios Industriales<br/>
{{vendedor_email}} | {{vendedor_telefone}}</p>`,
  },
  {
    id: 'tarifas_geral',
    title: 'Tabela de Tarifas Horárias Espanha & França 2026',
    subject: 'MCS Servicios Industriales — Tarifas Horarias y Condiciones 2026',
    description: 'Valores hora padrão com transporte, alojamento e EPIs inclusos para cotação rápida.',
    link: 'https://mcspersonal.com/tarifas-solda-2026.pdf',
    defaultBody: `<p>Estimado/a <strong>{{nome_contato}}</strong>,</p>
<p>Conforme acordado telefónicamente, le enviamos las tarifas horarias de referencia para soldadores homologados y montadores industriales en España y Francia.</p>
<p><strong>Material solicitado:</strong> Tabela de Tarifas Horárias Espanha & França 2026<br/>
<strong>Enlace directo al documento:</strong> <a href="https://mcspersonal.com/tarifas-solda-2026.pdf">Consultar Tarifas 2026</a></p>
<p>Nuestras tarifas incluyen gestión laboral completa, EPIs, seguro y logística de desplazamiento.</p>
<br/>
<p>Atentamente,<br/>
<strong>{{vendedor_nome}}</strong><br/>
{{vendedor_email}} | {{vendedor_telefone}}</p>`,
  },
  {
    id: 'certificados_iso',
    title: 'Dossiê de Qualificações ISO 9606 & Procedimentos ASME',
    subject: 'MCS — Dossier de Cualificaciones y Homologaciones de Soldadores',
    description: 'Certificações de soldadores homologados e normas europeias atendidas pela MCS.',
    link: 'https://mcspersonal.com/homologaciones-iso.pdf',
    defaultBody: `<p>Estimado/a <strong>{{nome_contato}}</strong>,</p>
<p>Compartimos el dossier de certificaciones de nuestros equipos de soldadura bajo normas europeas ISO 9606 y directivas ASME.</p>
<p><strong>Material solicitado:</strong> Dossiê de Qualificações ISO 9606 & Procedimentos ASME<br/>
<strong>Enlace directo al documento:</strong> <a href="https://mcspersonal.com/homologaciones-iso.pdf">Ver Certificaciones y Homologaciones</a></p>
<p>Estamos listos para atender visitas técnicas y homologaciones previas en sus instalaciones.</p>
<br/>
<p>Un cordial saludo,<br/>
<strong>{{vendedor_nome}}</strong><br/>
{{vendedor_email}} | {{vendedor_telefone}}</p>`,
  },
];

export function SendMaterialModal({
  isOpen,
  onClose,
  lead,
  queueItemId,
  onConfirm,
  onLeadUpdated,
  isSubmitting = false,
}: SendMaterialModalProps) {
  const { user } = useAuth();
  const { selectedEmpresaId } = useEmpresa();
  const { data: dbTemplates = [] } = useMarketingTemplates();

  // Commercial sender states from mcs_users
  const [commercialUser, setCommercialUser] = useState<{
    commercial_email?: string;
    commercial_name?: string;
    commercial_phone?: string;
    display_name?: string;
  } | null>(null);

  // Form states
  const [selectedSourceType, setSelectedSourceType] = useState<'builtin' | 'template'>('builtin');
  const [selectedId, setSelectedId] = useState<string>('dossier_geral');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [updateLeadEmail, setUpdateLeadEmail] = useState<boolean>(true);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [extraNote, setExtraNote] = useState<string>('');
  
  // UI states
  const [isSendingM365, setIsSendingM365] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Fetch user's commercial identity
  useEffect(() => {
    async function loadSenderProfile() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('mcs_users')
          .select('commercial_email, commercial_name, commercial_phone, display_name')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          setCommercialUser(data);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil comercial do remetente:', err);
      }
    }
    loadSenderProfile();
  }, [user?.id]);

  // Sender email resolution
  const senderEmail = commercialUser?.commercial_email || user?.email || 'comercial@mcspersonal.com';
  const senderName = commercialUser?.commercial_name || commercialUser?.display_name || user?.email || 'MCS Comercial';
  const senderPhone = commercialUser?.commercial_phone || '';

  // 2. Sync recipient email when lead changes or modal opens
  useEffect(() => {
    if (lead) {
      setRecipientEmail(lead.email || '');
    }
  }, [lead, isOpen]);

  // 3. Helper to replace dynamic tags
  const renderTemplateTags = (templateText: string) => {
    const contactName = lead?.name || 'Responsable de Compras/Producción';
    const companyName = lead?.company_name || lead?.legal_name || 'su empresa';
    return templateText
      .replace(/\{\{nome_contato\}\}/gi, contactName)
      .replace(/\{\{nome\}\}/gi, contactName)
      .replace(/\{\{empresa\}\}/gi, companyName)
      .replace(/\{\{vendedor_nome\}\}/gi, senderName)
      .replace(/\{\{vendedor_email\}\}/gi, senderEmail)
      .replace(/\{\{vendedor_telefone\}\}/gi, senderPhone);
  };

  // 4. Update Subject & HTML whenever selected material or lead changes
  useEffect(() => {
    if (selectedSourceType === 'builtin') {
      const mat = BUILTIN_MATERIALS.find(m => m.id === selectedId) || BUILTIN_MATERIALS[0];
      const sub = `${mat.subject} — ${lead?.company_name || lead?.name || 'su empresa'}`;
      setEmailSubject(sub);
      setEmailHtml(renderTemplateTags(mat.defaultBody));
    } else {
      const tmpl = dbTemplates.find(t => t.id === selectedId);
      if (tmpl) {
        setEmailSubject(tmpl.subject ? renderTemplateTags(tmpl.subject) : 'Información Comercial MCS');
        setEmailHtml(renderTemplateTags(tmpl.html_content || ''));
      }
    }
  }, [selectedId, selectedSourceType, lead, senderName, senderEmail, senderPhone, dbTemplates]);

  // Material Title for logging
  const currentMaterialTitle = useMemo(() => {
    if (selectedSourceType === 'builtin') {
      const mat = BUILTIN_MATERIALS.find(m => m.id === selectedId);
      return mat?.title || 'Material Institucional';
    } else {
      const tmpl = dbTemplates.find(t => t.id === selectedId);
      return tmpl?.title || 'Template Comercial';
    }
  }, [selectedSourceType, selectedId, dbTemplates]);

  // 5. Direct Send via Microsoft 365 Edge Function
  const handleSendViaM365 = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Informe um e-mail de destino válido.');
      return;
    }

    try {
      setIsSendingM365(true);

      // Final HTML including extra note if provided
      let finalHtml = emailHtml;
      if (extraNote.trim()) {
        const extraParagraph = `<div style="margin-top: 15px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #3b82f6; font-size: 13px; color: #1e293b;"><p style="margin: 0; font-weight: bold; color: #0f172a;">Nota adicional de nuestra llamada:</p><p style="margin: 4px 0 0 0;">${extraNote.replace(/\n/g, '<br/>')}</p></div>`;
        finalHtml = finalHtml.replace(/<br\s*[\/]?>\s*<p>Un cordial saludo/i, `${extraParagraph}<br/><p>Un cordial saludo`);
        if (!finalHtml.includes(extraParagraph)) {
          finalHtml += extraParagraph;
        }
      }

      const payload = {
        senderEmail,
        senderName,
        recipientEmail: recipientEmail.trim(),
        subject: emailSubject,
        htmlContent: finalHtml,
        leadId: lead?.id,
        queueItemId: queueItemId || null,
        empresaId: selectedEmpresaId,
        updateLeadEmail,
        userId: user?.id,
        materialTitle: currentMaterialTitle,
      };

      const { data, error } = await supabase.functions.invoke('send-commercial-email', {
        body: payload,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Falha ao enviar e-mail via Microsoft Graph');
      }

      toast.success(`E-mail enviado com sucesso via M365 (${senderEmail}) para ${recipientEmail}!`);

      // Se o e-mail mudou e deve atualizar o lead
      if (updateLeadEmail && lead && lead.email !== recipientEmail.trim()) {
        const updated = { ...lead, email: recipientEmail.trim() };
        if (onLeadUpdated) {
          onLeadUpdated(updated);
        }
      }

      const notesSummary = `E-mail M365 enviado: "${currentMaterialTitle}" de ${senderEmail} para ${recipientEmail}.`;
      onConfirm(currentMaterialTitle, recipientEmail, notesSummary);
      onClose();
    } catch (err: any) {
      console.error('Erro ao enviar e-mail comercial via M365:', err);
      toast.error(err.message || 'Erro ao enviar e-mail pelo Microsoft 365. Verifique a caixa do operador.');
    } finally {
      setIsSendingM365(false);
    }
  };

  // 6. External local email client fallback
  const handleOpenMailto = () => {
    if (!recipientEmail) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    const plainTextBody = emailHtml.replace(/<[^>]+>/g, '').replace(/\n\s*\n\s*\n/g, '\n\n');
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextBody)}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Cliente de e-mail local aberto!');
  };

  // 7. Copy text to clipboard
  const handleCopyText = () => {
    const plainTextBody = emailHtml.replace(/<[^>]+>/g, '').replace(/\n\s*\n\s*\n/g, '\n\n');
    navigator.clipboard.writeText(`${emailSubject}\n\n${plainTextBody}`);
    setCopied(true);
    toast.success('Texto copiado com sucesso!');
    setTimeout(() => setCopied(false), 2000);
  };

  // 8. WhatsApp share
  const handleWhatsAppShare = () => {
    if (!lead?.phone) {
      toast.error('Lead não possui telefone cadastrado');
      return;
    }
    const cleanNumber = lead.phone.replace(/\D/g, '');
    const plainTextBody = emailHtml.replace(/<[^>]+>/g, '').slice(0, 300);
    const waText = encodeURIComponent(
      `Hola ${lead.name || ''}, le comparto la información de MCS Servicios Industriales:\n${plainTextBody}...\nQuedamos a su disposición para cotizar cualquier demanda.`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${waText}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isSendingM365 && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 bg-card border-border text-foreground shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Enviar Material Comercial
                  <Badge className="bg-blue-600 text-white border-none text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Microsoft 365 Direto
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {lead ? `Empresa: ${lead.company_name || lead.name} • Contato: ${lead.name || 'Decisor'}` : 'Envie catálogos e dossiês direto pela sua conta M365'}
                </DialogDescription>
              </div>
            </div>

            {/* Remetente Badge */}
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Remetente M365:</span>
              <span className="font-mono font-bold text-foreground text-xs bg-muted/60 px-2 py-0.5 rounded border border-border">
                {senderEmail}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Caixa de Aviso de Remetente no Mobile */}
          <div className="sm:hidden p-2.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Remetente:</span>
            <span className="font-mono font-bold text-foreground text-xs">{senderEmail}</span>
          </div>

          {/* Destinatário & Atualização do Lead */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                E-mail de Destino do Decisor
              </Label>
              {lead?.email && lead.email !== recipientEmail && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                  E-mail alterado na chamada
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-8">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="Ex: laurent.gru@mjmetal.fr ou compras@empresa.es"
                  className="bg-background text-xs h-9 font-medium"
                  required
                />
              </div>

              <div className="md:col-span-4 flex items-center space-x-2">
                <Checkbox
                  id="updateLeadEmail"
                  checked={updateLeadEmail}
                  onCheckedChange={(checked) => setUpdateLeadEmail(Boolean(checked))}
                />
                <label
                  htmlFor="updateLeadEmail"
                  className="text-[11px] font-medium leading-none text-muted-foreground cursor-pointer"
                >
                  Salvar novo e-mail no Lead
                </label>
              </div>
            </div>
          </div>

          {/* Seleção do Tipo de Material / Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Selecione o Modelo de E-mail / Material:
              </Label>

              {dbTemplates.length > 0 && (
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSourceType('builtin');
                      setSelectedId('dossier_geral');
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      selectedSourceType === 'builtin'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Dossiês Padrão ({BUILTIN_MATERIALS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSourceType('template');
                      if (dbTemplates[0]) setSelectedId(dbTemplates[0].id);
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      selectedSourceType === 'template'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Templates Criados ({dbTemplates.length})
                  </button>
                </div>
              )}
            </div>

            {selectedSourceType === 'builtin' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {BUILTIN_MATERIALS.map(mat => {
                  const isSelected = selectedId === mat.id;
                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedId(mat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm ring-1 ring-blue-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{mat.title}</h4>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{mat.description}</p>
                      </div>
                      <a
                        href={mat.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver PDF
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {dbTemplates.map((tmpl: MarketingTemplate) => {
                  const isSelected = selectedId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedId(tmpl.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm ring-1 ring-blue-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{tmpl.title}</h4>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{tmpl.subject || 'Sem assunto'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assunto Editável */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Assunto do E-mail:</Label>
            <Input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              className="text-xs h-9 bg-background font-medium"
            />
          </div>

          {/* Anotação Extra Opcional */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Recado Personalizado Adicional (Opcional - inserido antes da assinatura):
            </Label>
            <Input
              value={extraNote}
              onChange={e => setExtraNote(e.target.value)}
              placeholder="Ex: Conforme conversamos, temos 4 soldadores TIG disponíveis a partir da próxima segunda-feira."
              className="text-xs h-9 bg-background"
            />
          </div>

          {/* Prévia do E-mail */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Pré-visualização do Conteúdo (HTML):
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-7 text-xs border-input gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar Texto
                </Button>
                {lead?.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppShare}
                    className="h-7 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>

            <div 
              className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-sans leading-relaxed max-h-36 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSendingM365}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleOpenMailto}
              disabled={isSendingM365}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Abrir no cliente local Outlook se preferir"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Outlook Local
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleSendViaM365}
            disabled={isSendingM365 || isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2 gap-2 shadow-lg shadow-blue-600/25 transition-all"
          >
            {isSendingM365 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Disparando via M365...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar E-mail Direto (M365) e Avançar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
