import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/shared/supabase/client';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import { useQueryClient } from '@tanstack/react-query';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { 
  FileText, Download, Upload, Trash2, CheckCircle2, 
  XCircle, Clock, ShieldAlert, Loader2, FileCheck2 
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  estimacion: any;
}

export function CustomContractCard({ estimacion }: Props) {
  const queryClient = useQueryClient();
  const { selectedEmpresaId, role } = useEmpresa();
  const { decidirContratoCustomizado, submeterParaRevisao } = useEstimacionMutations();

  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingCustom, setDownloadingCustom] = useState(false);

  const hasCustomContract = !!estimacion.custom_contract_url;
  const isApproved = !!estimacion.is_custom_contract_approved;
  const isDraft = estimacion.status === 'draft';
  const isReview = estimacion.status === 'review';

  // Get file name from path
  const getFileName = (url: string) => {
    if (!url) return '';
    return url.split('/').pop() || 'contrato_customizado.docx';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Download Company Standard Template
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const folderName = estimacion.empresa_id ? 'stocco' : 'stocco'; // default fallback helper
      const docLang = estimacion.document_language || 'pt';
      
      // Standard folders names
      let companyFolderName = 'default';
      if (estimacion.empresa_id) {
        const { data: emp } = await supabase
          .schema('core_common')
          .from('empresas')
          .select('trade_name')
          .eq('id', estimacion.empresa_id)
          .maybeSingle();
        if (emp?.trade_name) {
          companyFolderName = emp.trade_name.toLowerCase().replace(/\s+/g, '_');
        }
      }

      // Tier 1: company/lang/contrato.docx
      let path = `${companyFolderName}/${docLang}/contrato.docx`;
      let { data, error } = await supabase.storage.from('proposal-templates').download(path);
      
      if (error || !data) {
        // Fallback Tier 2: company/contrato.docx
        path = `${companyFolderName}/contrato.docx`;
        const res2 = await supabase.storage.from('proposal-templates').download(path);
        data = res2.data;
        error = res2.error;
      }
      
      if (error || !data) {
        // Fallback Tier 3: default_contrato_{lang}.docx
        const defaultName = docLang === 'pt' ? 'default_contrato.docx' : `default_contrato_${docLang}.docx`;
        const res3 = await supabase.storage.from('proposal-templates').download(defaultName);
        data = res3.data;
        error = res3.error;
      }

      if (error || !data) {
        throw new Error('Não foi possível encontrar o template base de contrato.');
      }
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modelo_contrato_${estimacion.codigo || 'base'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Modelo de contrato baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar modelo de contrato', { description: err.message });
    } finally {
      setDownloading(false);
    }
  };

  // Upload Custom Contract file
  const handleUploadContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Accept only docx
    if (!file.name.endsWith('.docx')) {
      toast.error('Tipo de arquivo inválido', { description: 'Por favor, envie apenas arquivos em formato Word (.docx).' });
      return;
    }
    
    try {
      setUploading(true);
      const filePath = `custom_contracts/${estimacion.id}/contrato_custom_${Date.now()}.docx`;
      
      const { error: uploadErr } = await supabase.storage
        .from('proposal-templates')
        .upload(filePath, file, { upsert: true });
        
      if (uploadErr) throw uploadErr;
      
      // Update database
      const { error: dbErr } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({
          custom_contract_url: filePath,
          is_custom_contract_approved: false, // Reset approval
          custom_contract_uploaded_at: new Date().toISOString(),
          custom_contract_uploaded_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .eq('id', estimacion.id);
        
      if (dbErr) throw dbErr;
      
      toast.success('Contrato customizado carregado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, estimacion.id] });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar contrato', { description: err.message });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Revert/Remove Custom Contract
  const handleRemoveContract = async () => {
    if (!confirm('Deseja realmente remover o contrato customizado e voltar a utilizar o contrato padrão?')) return;
    
    try {
      setUploading(true);
      
      const { error: dbErr } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({
          custom_contract_url: null,
          is_custom_contract_approved: false,
          custom_contract_uploaded_at: null,
          custom_contract_uploaded_by: null
        })
        .eq('id', estimacion.id);
        
      if (dbErr) throw dbErr;
      
      toast.success('Contrato customizado removido. Voltando ao padrão global.');
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, estimacion.id] });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao remover contrato', { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  // Download the uploaded custom contract
  const handleDownloadCustomDoc = async () => {
    if (!estimacion.custom_contract_url) return;
    try {
      setDownloadingCustom(true);
      const { data, error } = await supabase.storage
        .from('proposal-templates')
        .download(estimacion.custom_contract_url);
        
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato_customizado_${estimacion.codigo}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contrato customizado baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao baixar contrato customizado', { description: err.message });
    } finally {
      setDownloadingCustom(false);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base font-semibold">Customização de Contrato</CardTitle>
          </div>
          {hasCustomContract && (
            <Badge className={isApproved 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}>
              {isApproved ? 'Aprovado pelo Gerente' : 'Pendente de Aprovação'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Faça upload de cláusulas sob medida em formato Word (.docx) caso o cliente exija alterações jurídicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {hasCustomContract ? (
          <div className="space-y-4">
            {/* Informações do contrato personalizado */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-3">
              <div className="flex items-start space-x-3">
                <FileText className="h-10 w-10 text-indigo-500 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-250 truncate max-w-xs sm:max-w-md">
                    {getFileName(estimacion.custom_contract_url)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Carregado em: {estimacion.custom_contract_uploaded_at ? formatDate(estimacion.custom_contract_uploaded_at) : '-'}
                  </p>
                </div>
              </div>

              {/* Alerta de aprovação */}
              {!isApproved && (
                <div className="flex items-start space-x-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2.5 rounded">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-semibold">Revisão Pendente:</span> Este contrato foi modificado. Ele precisará ser aprovado pelo gerente antes de ser enviado para o cliente assinar.
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Download e Remoção */}
            <div className="flex flex-wrap gap-2.5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadCustomDoc}
                disabled={downloadingCustom}
                className="flex-1"
              >
                {downloadingCustom ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Baixar Contrato Customizado
              </Button>
              {isDraft && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemoveContract}
                  disabled={uploading}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Reverter para Padrão
                </Button>
              )}
            </div>

            {/* Ações do Gerente (role === 'admin') */}
            {!isApproved && role === 'admin' && (isDraft || isReview) && (
              <div className="pt-2 border-t border-dashed flex space-x-2">
                <Button
                  onClick={() => decidirContratoCustomizado.mutate({ id: estimacion.id, aprovado: true })}
                  disabled={decidirContratoCustomizado.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  size="sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Aprovar Contrato Customizado
                </Button>
                <Button
                  onClick={() => decidirContratoCustomizado.mutate({ id: estimacion.id, aprovado: false })}
                  disabled={decidirContratoCustomizado.isPending}
                  variant="destructive"
                  className="flex-1 text-xs font-semibold"
                  size="sm"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Rejeitar e Reverter
                </Button>
              </div>
            )}

            {/* Ação do Vendedor: Enviar para aprovação se em draft e pendente */}
            {!isApproved && isDraft && role !== 'admin' && (
              <Button
                onClick={() => submeterParaRevisao.mutate(estimacion.id)}
                disabled={submeterParaRevisao.isPending}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {submeterParaRevisao.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldAlert className="h-4 w-4 mr-1.5" />}
                Enviar para Aprovação do Gerente
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contrato padrão utilizado */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-muted-foreground text-center py-6">
              <FileText className="h-8 w-8 text-slate-350 mx-auto mb-2" />
              Esta proposta utilizará o contrato padrão corporativo da empresa configurado no idioma do documento.
            </div>

            {/* Ações de Download do Modelo e Upload */}
            {isDraft && (
              <div className="flex gap-2.5">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="flex-1 text-xs"
                >
                  {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                  Baixar Contrato Modelo para Editar
                </Button>
                
                <div className="flex-1 relative">
                  <input
                    type="file"
                    id="custom-contract-upload"
                    accept=".docx"
                    onChange={handleUploadContract}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50/50 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                    Subir Contrato Alterado (.docx)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
