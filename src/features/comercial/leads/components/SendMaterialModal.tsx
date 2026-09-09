import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface SendMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onConfirm: (materialSent: string, emailUsed: string, notes: string) => void;
  isSubmitting?: boolean;
}

const MATERIALS_LIST = [
  {
    id: 'dossier_geral',
    title: 'Dossier Institucional MCS Soldadores & Montadores (PDF)',
    description: 'Apresentação corporativa, especialidades (TIG, MIG, Tubistas, Caldeireiros), projetos executados na Europa.',
    link: 'https://mcspersonal.com/dossier-tecnico-mcs.pdf',
  },
  {
    id: 'tarifas_geral',
    title: 'Tabela de Tarifas Horárias Espanha & França 2026',
    description: 'Valores hora padrão com transporte, alojamento e EPIs inclusos para cotação rápida.',
    link: 'https://mcspersonal.com/tarifas-solda-2026.pdf',
  },
  {
    id: 'certificados_iso',
    title: 'Dossiê de Qualificações ISO 9606 & Procedimentos ASME',
    description: 'Certificações de soldadores homologados e normas europeias atendidas pela MCS.',
    link: 'https://mcspersonal.com/homologaciones-iso.pdf',
  },
];

export function SendMaterialModal({
  isOpen,
  onClose,
  lead,
  onConfirm,
  isSubmitting = false,
}: SendMaterialModalProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('dossier_geral');
  const [recipientEmail, setRecipientEmail] = useState<string>(lead?.email || '');
  const [copied, setCopied] = useState(false);

  const selectedMaterial = MATERIALS_LIST.find(m => m.id === selectedMaterialId) || MATERIALS_LIST[0];

  const emailSubject = `MCS Servicios Industriales — Información y Dossier Técnico para ${lead?.company_name || lead?.name || 'su empresa'}`;
  
  const emailBody = `Estimado/a ${lead?.name || 'Responsable de Compras/Producción'},

Siguiendo nuestra conversación telefónica, le adjunto la información de MCS Servicios Industriales respecto a nuestra disponibilidad de personal técnico cualificado (soldadores homologados TIG/MIG/MAG, tuberos y montadores industriales).

Material solicitado: ${selectedMaterial.title}
Enlace directo al documento: ${selectedMaterial.link}

Quedamos a su entera disposición para cualquier cotización o refuerzo de personal en sus próximas obras y proyectos.

Un cordial saludo,
Equipo Comercial MCS Servicios Industriales
info@mcspersonal.com | +34 900 000 000`;

  const handleOpenMailto = () => {
    if (!recipientEmail) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Cliente de e-mail aberto!');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`${emailSubject}\n\n${emailBody}`);
    setCopied(true);
    toast.success('Texto e links copiados para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!lead?.phone) {
      toast.error('Lead não possui telefone cadastrado');
      return;
    }
    const cleanNumber = lead.phone.replace(/\D/g, '');
    const waText = encodeURIComponent(
      `Hola ${lead.name || ''}, le comparto el dossier técnico y catálogo de soldadores homologados de MCS Servicios Industriales: ${selectedMaterial.link}\nQuedamos a su disposición para cotizar cualquier demanda.`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${waText}`, '_blank');
  };

  const handleFinish = () => {
    const notesSummary = `Material enviado: ${selectedMaterial.title} para o e-mail: ${recipientEmail || 'N/A'}`;
    onConfirm(selectedMaterial.title, recipientEmail, notesSummary);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                Enviar Material Comercial por E-mail
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">
                  Interesse / Follow-up
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {lead ? `Empresa: ${lead.company_name || lead.name} • Contato: ${lead.name || 'Decisor'}` : 'Selecione o catálogo e envie o e-mail'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">E-mail do Decisor</Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="exemplo@empresa.es"
              className="bg-background border-input text-foreground text-xs h-9 font-medium"
            />
          </div>

          {/* Select Material */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Selecione o Material a Enviar:</Label>
            <div className="space-y-2">
              {MATERIALS_LIST.map(mat => {
                const isSelected = selectedMaterialId === mat.id;
                return (
                  <div
                    key={mat.id}
                    onClick={() => setSelectedMaterialId(mat.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm'
                        : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        {mat.title}
                      </h4>
                      {isSelected && <Badge className="bg-blue-600 text-white text-[10px]">Selecionado</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{mat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Prévia do Texto:</Label>
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
                    <MessageSquare className="w-3.5 h-3.5" /> Enviar no WhatsApp
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-sans leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
              {emailBody}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-input text-xs"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenMailto}
              className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 text-xs font-semibold gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Meu E-mail
            </Button>

            <Button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Check className="w-4 h-4" /> Registrar Envio e Avançar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
