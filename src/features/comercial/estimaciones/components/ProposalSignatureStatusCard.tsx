import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/shared/supabase/client';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import { 
  FileText, Send, CheckCircle2, Clock, Copy, 
  ExternalLink, Lock, Mail, RefreshCw, Download, 
  Check, ShieldCheck, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  estimacion: any;
}

export function ProposalSignatureStatusCard({ estimacion }: Props) {
  const { enviarProposta } = useEstimacionMutations();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const sig = estimacion.proposal_signature;
  const status = sig?.status || 'draft';

  // Gerar o link de assinatura
  const origin = window.location.origin;
  const signingLink = sig?.signature_token ? `${origin}/assinar-proposta/${sig.signature_token}` : '';

  const handleCopyLink = () => {
    if (!signingLink) return;
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    toast.success('Link copiado!', { description: 'O link de assinatura foi copiado para a área de transferência.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendOrRecreate = () => {
    enviarProposta.mutate(estimacion.id);
  };

  const handleDownloadDoc = async () => {
    if (!sig?.document_url) return;
    try {
      setDownloading(true);
      const { data, error } = await supabase.storage
        .from('proposal-signatures')
        .download(sig.document_url);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${estimacion.codigo || 'comercial'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Documento baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar documento', { description: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render para Rascunho / Não Enviada
  if (status === 'draft') {
    return (
      <Card className="border-dashed bg-slate-50/50 dark:bg-slate-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-base font-semibold">Proposta Comercial</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Não Enviada
            </Badge>
          </div>
          <CardDescription>
            Gere a proposta em formato Microsoft Word baseada neste orçamento e envie o link de assinatura para o cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm mb-4">
            <p className="text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-indigo-500" />
              O e-mail será disparado para: <strong className="text-slate-900 dark:text-slate-200">{estimacion.contact_email || estimacion.client?.email || estimacion.lead?.email || 'Nenhum e-mail cadastrado'}</strong>
            </p>
            {!estimacion.contact_email && !estimacion.client?.email && !estimacion.lead?.email && (
              <p className="text-rose-500 text-xs mt-2 font-medium">
                * Cadastre um e-mail de contato nos detalhes da estimativa ou cliente para permitir o disparo.
              </p>
            )}
          </div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            onClick={handleSendOrRecreate}
            disabled={enviarProposta.isPending || (!estimacion.contact_email && !estimacion.client?.email && !estimacion.lead?.email)}
          >
            {enviarProposta.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando Proposta...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Gerar e Enviar Proposta
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render para Aguardando Assinatura
  if (status === 'pending_signature') {
    return (
      <Card className="border-amber-200 bg-amber-50/10 dark:border-amber-950/20 dark:bg-amber-950/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-semibold">Proposta Comercial</CardTitle>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
              Aguardando Assinatura
            </Badge>
          </div>
          <CardDescription>
            A proposta foi gerada e enviada ao cliente. O link está ativo aguardando a assinatura eletrônica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {/* Caixa de Informações da Proposta */}
          <div className="space-y-3 bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
            <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-dashed">
              <span>Enviado em: {sig.sent_at ? formatDate(sig.sent_at) : '-'}</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Código OTP: {sig.otp_code}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Link de Assinatura do Cliente</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  readOnly 
                  value={signingLink} 
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border px-3 py-1.5 rounded text-xs outline-none text-slate-600 dark:text-slate-400 font-mono"
                />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleCopyLink} title="Copiar link para o cliente">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8" asChild title="Abrir em nova aba">
                  <a href={signingLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5">
              <Mail className="h-3 w-3 text-indigo-400" />
              E-mail de destino: <strong className="text-slate-800 dark:text-slate-200">{estimacion.contact_email || estimacion.client?.email || estimacion.lead?.email}</strong>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={handleDownloadDoc}
              disabled={downloading}
            >
              {downloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar Documento
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={handleSendOrRecreate}
              disabled={enviarProposta.isPending}
            >
              {enviarProposta.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar Proposta
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render para Assinada
  if (status === 'signed') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
              <CardTitle className="text-base font-semibold">Proposta Comercial</CardTitle>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900">
              Assinada Digitalmente
            </Badge>
          </div>
          <CardDescription>
            O cliente revisou e assinou eletronicamente a proposta comercial, ativando as operações associadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {/* Box de Log de Auditoria */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-dashed">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Assinado em: {sig.signed_at ? formatDate(sig.signed_at) : '-'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs mt-2">
              <div>
                <span className="text-slate-500 block font-medium">Assinante verificado</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 break-all">
                  {estimacion.contact_email || estimacion.client?.email || estimacion.lead?.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">IP de Assinatura</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
                  {sig.proposal_audit_logs?.[0]?.ip_address || 'Registrado em Auditoria'}
                </span>
              </div>
            </div>

            {sig.document_url && (
              <div className="pt-2">
                <span className="text-[10px] text-slate-500 block">
                  * Assinatura com validade eIDAS armazenada com carimbo de integridade no Supabase Storage.
                </span>
              </div>
            )}
          </div>

          <Button 
            variant="outline"
            className="w-full"
            onClick={handleDownloadDoc}
            disabled={downloading}
          >
            {downloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar Cópia da Proposta Assinada (.docx)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
