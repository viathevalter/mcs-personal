import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/shared/supabase/client';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import { 
  FileText, Send, CheckCircle2, Clock, Copy, 
  ExternalLink, Lock, Mail, RefreshCw, Download, 
  Check, ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  estimacion: any;
}

export function ProposalSignatureStatusCard({ estimacion }: Props) {
  const { enviarProposta } = useEstimacionMutations();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);
  const [downloadingSignedContract, setDownloadingSignedContract] = useState(false);

  const initialEmail = estimacion.contact_email || estimacion.client?.email || estimacion.lead?.email || '';
  const [emailInput, setEmailInput] = useState(initialEmail);

  React.useEffect(() => {
    setEmailInput(initialEmail);
  }, [initialEmail]);

  const [includeProposal, setIncludeProposal] = useState(true);
  const [includeContract, setIncludeContract] = useState(true);

  const sig = estimacion.proposal_signature;
  let status = sig?.status || 'draft';
  if (status === 'expired' || status === 'cancelled' || status === 'rejected' || estimacion.status === 'draft') {
    status = 'draft';
  }

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
    enviarProposta.mutate({ 
      estimacionId: estimacion.id, 
      email: emailInput,
      includeProposal,
      includeContract
    });
  };

  const handleDownloadDoc = async () => {
    if (!sig?.document_url) return;
    try {
      setDownloading(true);
      const pdfPath = sig.document_url.replace(/\.docx$/i, '.pdf');
      let data;
      let isPdf = true;

      // Tenta baixar o PDF primeiro
      const pdfRes = await supabase.storage
        .from('proposal-signatures')
        .download(pdfPath);

      if (pdfRes.error) {
        console.warn("[PDF Download] Proposal PDF not found, falling back to DOCX:", pdfRes.error.message);
        const docxRes = await supabase.storage
          .from('proposal-signatures')
          .download(sig.document_url);

        if (docxRes.error) throw docxRes.error;
        data = docxRes.data;
        isPdf = false;
      } else {
        data = pdfRes.data;
      }

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = isPdf 
        ? `proposta_${estimacion.codigo || 'comercial'}.pdf`
        : `proposta_${estimacion.codigo || 'comercial'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(isPdf ? 'Proposta em PDF baixada com sucesso!' : 'Documento baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar documento', { description: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!sig?.contract_document_url) return;
    try {
      setDownloadingContract(true);
      const pdfPath = sig.contract_document_url.replace(/\.docx$/i, '.pdf');
      let data;
      let isPdf = true;

      // Tenta baixar o PDF primeiro
      const pdfRes = await supabase.storage
        .from('proposal-signatures')
        .download(pdfPath);

      if (pdfRes.error) {
        console.warn("[PDF Download] Contract PDF not found, falling back to DOCX:", pdfRes.error.message);
        const docxRes = await supabase.storage
          .from('proposal-signatures')
          .download(sig.contract_document_url);

        if (docxRes.error) throw docxRes.error;
        data = docxRes.data;
        isPdf = false;
      } else {
        data = pdfRes.data;
      }

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = isPdf
        ? `contrato_${estimacion.codigo || 'comercial'}.pdf`
        : `contrato_${estimacion.codigo || 'comercial'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(isPdf ? 'Contrato em PDF baixado com sucesso!' : 'Contrato baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar contrato', { description: err.message });
    } finally {
      setDownloadingContract(false);
    }
  };

  const handleDownloadSignedContract = async () => {
    const docUrl = sig?.contract_document_url || sig?.contract_signed_document_url;
    if (!docUrl) return;
    try {
      setDownloadingSignedContract(true);
      const pdfPath = docUrl.replace(/\.docx$/i, '.pdf');
      let data;
      let isPdf = true;

      // Tenta baixar o PDF primeiro
      const pdfRes = await supabase.storage
        .from('proposal-signatures')
        .download(pdfPath);

      if (pdfRes.error) {
        console.warn("[PDF Download] Signed Contract PDF not found, falling back to DOCX:", pdfRes.error.message);
        const docxRes = await supabase.storage
          .from('proposal-signatures')
          .download(docUrl);

        if (docxRes.error) throw docxRes.error;
        data = docxRes.data;
        isPdf = false;
      } else {
        data = pdfRes.data;
      }

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = isPdf
        ? `contrato_assinado_${estimacion.codigo || 'comercial'}.pdf`
        : `contrato_assinado_${estimacion.codigo || 'comercial'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(isPdf ? 'Contrato assinado em PDF baixado com sucesso!' : 'Contrato assinado baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar contrato assinado', { description: err.message });
    } finally {
      setDownloadingSignedContract(false);
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
    const hasUnapprovedContract = !!estimacion.custom_contract_url && !estimacion.is_custom_contract_approved;
    const isUnderReview = estimacion.status === 'review';

    return (
      <Card className="border-dashed bg-slate-50/50 dark:bg-slate-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-base font-semibold">Proposta Comercial</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {isUnderReview ? 'Em Revisão' : 'Não Enviada'}
            </Badge>
          </div>
          <CardDescription>
            {isUnderReview 
              ? 'Este orçamento está sob análise do gerente comercial. O envio de propostas estará disponível após a aprovação.' 
              : hasUnapprovedContract 
              ? 'O contrato deste orçamento foi customizado. É necessário que o gerente aprove as alterações jurídicas na seção de customização de contrato antes do envio.' 
              : 'Gere a proposta em formato Microsoft Word baseada neste orçamento e envie o link de assinatura para o cliente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
              <Mail className="h-4 w-4 text-indigo-500" />
              <span className="font-semibold">E-mail de Envio:</span>
            </div>
            <input
              type="email"
              placeholder="E-mail do cliente (opcional para gerar apenas o link)"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded text-xs outline-none text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {!emailInput && (
              <p className="text-amber-500 text-[11px] font-medium leading-relaxed">
                * Nenhum e-mail informado. A proposta será gerada e o processo avançará, permitindo copiar o link de assinatura para enviar por WhatsApp.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
              Documentos a Incluir:
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-proposal-draft" 
                  checked={includeProposal} 
                  onCheckedChange={(checked: boolean) => {
                    if (!checked && !includeContract) return;
                    setIncludeProposal(checked);
                  }}
                />
                <label
                  htmlFor="include-proposal-draft"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Propuesta Comercial (Pressuposto)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-contract-draft" 
                  checked={includeContract} 
                  onCheckedChange={(checked: boolean) => {
                    if (!checked && !includeProposal) return;
                    setIncludeContract(checked);
                  }}
                />
                <label
                  htmlFor="include-contract-draft"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Contrato Comercial
                </label>
              </div>
            </div>
          </div>
          
          {isUnderReview ? (
            <Button 
              className="w-full bg-slate-250 dark:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
              disabled={true}
            >
              <Clock className="mr-2 h-4 w-4 animate-spin text-amber-500" />
              Aguardando Aprovação do Gerente
            </Button>
          ) : hasUnapprovedContract ? (
            <Button 
              className="w-full bg-slate-250 dark:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
              disabled={true}
            >
              <Lock className="mr-2 h-4 w-4 text-amber-500" />
              Envio Bloqueado (Requer Aprovação do Contrato)
            </Button>
          ) : (
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={handleSendOrRecreate}
              disabled={enviarProposta.isPending}
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
          )}
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

            <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                E-mail do Destinatário:
              </label>
              <input
                type="email"
                placeholder="E-mail do cliente (opcional)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded text-xs outline-none text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              {!emailInput && (
                <p className="text-amber-500 text-[10px] font-medium leading-relaxed">
                  * Sem e-mail cadastrado. O reenvio atualizará o link de assinatura, mas não enviará o e-mail automático.
                </p>
              )}
            </div>

            <div className="space-y-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500">
                Documentos a Incluir no Reenvio:
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-proposal-pending" 
                    checked={includeProposal} 
                    onCheckedChange={(checked: boolean) => {
                      if (!checked && !includeContract) return;
                      setIncludeProposal(checked);
                    }}
                  />
                  <label
                    htmlFor="include-proposal-pending"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    Propuesta Comercial (Pressuposto)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-contract-pending" 
                    checked={includeContract} 
                    onCheckedChange={(checked: boolean) => {
                      if (!checked && !includeProposal) return;
                      setIncludeContract(checked);
                    }}
                  />
                  <label
                    htmlFor="include-contract-pending"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    Contrato Comercial
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex space-x-3">
              {sig?.document_url && (
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadDoc}
                  disabled={downloading}
                >
                  {downloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Baixar Proposta
                </Button>
              )}
              {sig?.contract_document_url && (
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadContract}
                  disabled={downloadingContract}
                >
                  {downloadingContract ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Baixar Contrato
                </Button>
              )}
            </div>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
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

          <div className="flex flex-col gap-2.5">
            {sig?.document_url && (
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleDownloadDoc}
                disabled={downloading}
              >
                {downloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Baixar Cópia da Proposta Assinada (PDF)
              </Button>
            )}
            {(sig?.contract_document_url || sig?.contract_signed_document_url) && (
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleDownloadSignedContract}
                disabled={downloadingSignedContract}
              >
                {downloadingSignedContract ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="mr-2 h-4 w-4" />}
                Baixar Cópia do Contrato Assinado (PDF)
              </Button>
            )}
          </div>

          {/* Seção para Emitir / Reenviar Proposta da Nova Versão */}
          <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-900/50 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                E-mail do Destinatário (Nova Assinatura):
              </label>
              <input
                type="email"
                placeholder="E-mail do cliente"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded text-xs outline-none text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-proposal-signed" 
                  checked={includeProposal} 
                  onCheckedChange={(checked: boolean) => {
                    if (!checked && !includeContract) return;
                    setIncludeProposal(checked);
                  }}
                />
                <label
                  htmlFor="include-proposal-signed"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Propuesta Comercial (Pressuposto)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-contract-signed" 
                  checked={includeContract} 
                  onCheckedChange={(checked: boolean) => {
                    if (!checked && !includeProposal) return;
                    setIncludeContract(checked);
                  }}
                />
                <label
                  htmlFor="include-contract-signed"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Contrato Comercial
                </label>
              </div>
            </div>

            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
              onClick={handleSendOrRecreate}
              disabled={enviarProposta.isPending}
            >
              {enviarProposta.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando e Enviando Nova Versão...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Emitir e Enviar Nova Versão para Assinatura
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
