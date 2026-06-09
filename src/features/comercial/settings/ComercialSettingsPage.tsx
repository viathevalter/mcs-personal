import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, ShieldAlert, Sliders, FileText, Download, Upload, Trash2, Info, ChevronRight, FileCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Espanhol' },
  { code: 'en', label: 'Inglês' },
  { code: 'it', label: 'Italiano' },
  { code: 'fr', label: 'Francês' },
];

export function ComercialSettingsPage() {
  const { t } = useTranslation();
  const { selectedEmpresaId, role, empresas } = useEmpresa();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    id: '',
    min_margin_percent: 15.00,
    block_debtor_estimations: true,
    ivp_min_threshold: 5.00,
  });

  // Templates state
  const [activeLang, setActiveLang] = useState<string>('pt');
  const [proposalStatus, setProposalStatus] = useState<'default' | 'custom'>('default');
  const [contractStatus, setContractStatus] = useState<'default' | 'custom'>('default');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [uploadingType, setUploadingType] = useState<'proposal' | 'contract' | null>(null);

  const proposalInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const isUserAdmin = role === 'admin' || role === 'super_admin';

  // Get active company info
  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);
  const folderName = selectedEmpresa?.trade_name?.toLowerCase().replace(/\s+/g, '_') || 'default';

  const checkTemplates = async () => {
    if (!selectedEmpresaId || !selectedEmpresa) return;
    try {
      setLoadingTemplates(true);
      const { data: files, error } = await supabase.storage
        .from('proposal-templates')
        .list(`${folderName}/${activeLang}`);
      
      if (error) {
        console.warn(`Error checking templates for folder: ${folderName}/${activeLang}`, error);
        setProposalStatus('default');
        setContractStatus('default');
        return;
      }
      
      const hasProp = files?.some(f => f.name === 'proposta.docx') || false;
      const hasCont = files?.some(f => f.name === 'contrato.docx') || false;
      
      setProposalStatus(hasProp ? 'custom' : 'default');
      setContractStatus(hasCont ? 'custom' : 'default');
    } catch (err) {
      console.error('Failed to list templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      if (!selectedEmpresaId) return;
      try {
        setLoading(true);
        // Query comercial_settings
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .select('*')
          .eq('empresa_id', selectedEmpresaId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            id: data.id,
            min_margin_percent: Number(data.min_margin_percent),
            block_debtor_estimations: !!data.block_debtor_estimations,
            ivp_min_threshold: Number(data.ivp_min_threshold),
          });
        } else {
          // If no row exists, create a default local state to insert later
          setSettings({
            id: '',
            min_margin_percent: 15.00,
            block_debtor_estimations: true,
            ivp_min_threshold: 5.00,
          });
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
        toast.error(t('comercial.settings.toastLoadError'), { description: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (selectedEmpresaId && empresas.length > 0) {
      checkTemplates();
    }
  }, [selectedEmpresaId, empresas, activeLang]);

  const handleSave = async () => {
    if (!selectedEmpresaId) return;
    try {
      setSaving(true);

      const payload = {
        empresa_id: selectedEmpresaId,
        min_margin_percent: settings.min_margin_percent,
        block_debtor_estimations: settings.block_debtor_estimations,
        ivp_min_threshold: settings.ivp_min_threshold,
        updated_at: new Date().toISOString(),
      };

      let error = null;

      if (settings.id) {
        // Update existing row
        const { error: updateError } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .update(payload)
          .eq('id', settings.id);
        error = updateError;
      } else {
        // Insert new row
        const { data: insertData, error: insertError } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .insert(payload)
          .select()
          .single();
        error = insertError;
        if (insertData) {
          setSettings(prev => ({ ...prev, id: insertData.id }));
        }
      }

      if (error) throw error;

      toast.success(t('comercial.settings.toastSaveSuccess'));
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(t('comercial.settings.toastSaveError'), { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (type: 'proposta' | 'contrato') => {
    const isCustom = type === 'proposta' ? proposalStatus === 'custom' : contractStatus === 'custom';
    
    let fileName = "";
    if (isCustom) {
      fileName = `${folderName}/${activeLang}/${type}.docx`;
    } else {
      if (type === 'proposta') {
        fileName = activeLang === 'pt' ? 'default.docx' : `default_${activeLang}.docx`;
      } else {
        fileName = activeLang === 'pt' ? 'default_contrato.docx' : `default_contrato_${activeLang}.docx`;
      }
    }
      
    try {
      const { data, error } = await supabase.storage
        .from('proposal-templates')
        .download(fileName);
        
      if (error) {
        // Fallback para o template padrão global de base (pt) se o específico do idioma não existir no storage
        console.warn(`Default template ${fileName} not found. Trying global default...`);
        const fallbackFileName = type === 'proposta' ? 'default.docx' : 'default_contrato.docx';
        const { data: fbData, error: fbErr } = await supabase.storage
          .from('proposal-templates')
          .download(fallbackFileName);
        
        if (fbErr) throw fbErr;
        triggerFileDownload(fbData, `modelo_padrao_${type}_${activeLang}.docx`);
      } else {
        triggerFileDownload(data, isCustom ? `${selectedEmpresa?.trade_name || 'empresa'}_${activeLang}_${type}.docx` : `modelo_padrao_${type}_${activeLang}.docx`);
      }
    } catch (err: any) {
      console.error('Error downloading template:', err);
      toast.error(t('comercial.settings.downloadError', { defaultValue: 'Erro ao baixar modelo' }), { description: err.message });
    }
  };

  const triggerFileDownload = (data: Blob, name: string) => {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(t('comercial.settings.downloadSuccess', { defaultValue: 'Modelo baixado com sucesso!' }));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'proposta' | 'contrato') => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error(t('comercial.settings.onlyDocx', { defaultValue: 'Por favor, selecione um arquivo no formato Word (.docx).' }));
      return;
    }
    
    const targetType = type === 'proposta' ? 'proposal' : 'contract';
    try {
      setUploadingType(targetType);
      const path = `${folderName}/${activeLang}/${type}.docx`;
      
      const { error } = await supabase.storage
        .from('proposal-templates')
        .upload(path, file, {
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
      if (error) throw error;
      
      toast.success(t('comercial.settings.uploadSuccess', { defaultValue: 'Modelo Word enviado com sucesso!' }));
      checkTemplates();
    } catch (err: any) {
      console.error('Error uploading template:', err);
      toast.error(t('comercial.settings.uploadError', { defaultValue: 'Erro ao enviar o modelo' }), { description: err.message });
    } finally {
      setUploadingType(null);
      if (event.target) event.target.value = '';
    }
  };

  const handleRestore = async (type: 'proposta' | 'contrato') => {
    if (!window.confirm(t('comercial.settings.confirmRestore', { defaultValue: 'Tem certeza que deseja restaurar este modelo para o padrão do sistema?' }))) {
      return;
    }
    try {
      const path = `${folderName}/${activeLang}/${type}.docx`;
      const { error } = await supabase.storage
        .from('proposal-templates')
        .remove([path]);
        
      if (error) throw error;
      
      toast.success(t('comercial.settings.restoreSuccess', { defaultValue: 'Modelo restaurado para o padrão!' }));
      checkTemplates();
    } catch (err: any) {
      console.error('Error restoring template:', err);
      toast.error(t('comercial.settings.restoreError', { defaultValue: 'Erro ao restaurar modelo' }), { description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{t('comercial.settings.loading')}</p>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4 text-center max-w-md mx-auto p-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold">{t('comercial.settings.restrictedAccessTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('comercial.settings.restrictedAccessDesc')}
        </p>
        <Button onClick={() => navigate('/comercial/estimaciones')}>
          {t('comercial.settings.btnBack')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Sliders className="mr-3 h-8 w-8 text-primary" />
          {t('comercial.settings.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('comercial.settings.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('comercial.settings.cardTitle')}</CardTitle>
          <CardDescription>
            {t('comercial.settings.cardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="min_margin" className="text-sm font-semibold">
                {t('comercial.settings.marginLabel')}
              </Label>
              <Input
                id="min_margin"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.min_margin_percent}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    min_margin_percent: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('comercial.settings.marginDesc')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_ivp" className="text-sm font-semibold">
                {t('comercial.settings.ivpLabel')}
              </Label>
              <Input
                id="min_ivp"
                type="number"
                step="0.1"
                min="-50"
                max="100"
                value={settings.ivp_min_threshold}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    ivp_min_threshold: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('comercial.settings.ivpDesc')}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label htmlFor="block_debtor" className="text-sm font-semibold">
                  {t('comercial.settings.debtorLabel')}
                </Label>
                <p className="text-xs text-muted-foreground pr-8">
                  {t('comercial.settings.debtorDesc')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  id="block_debtor"
                  value={settings.block_debtor_estimations ? 'true' : 'false'}
                  className="bg-background border border-input h-9 rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      block_debtor_estimations: e.target.value === 'true',
                    }))
                  }
                >
                  <option value="true">{t('comercial.settings.optionRequire')}</option>
                  <option value="false">{t('comercial.settings.optionDisabled')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/95">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('comercial.settings.btnSaving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('comercial.settings.btnSave')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Modelos de Documentos (Templates) */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <CardTitle>{t('comercial.settings.templatesTitle', { defaultValue: 'Modelos de Documentos (Word)' })}</CardTitle>
          </div>
          <CardDescription>
            {t('comercial.settings.templatesDesc', { 
              defaultValue: 'Gerencie os templates Microsoft Word (.docx) auto preenchíveis para as propostas e contratos desta empresa.' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-indigo-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-indigo-100 dark:border-slate-800 text-sm flex items-start space-x-3">
            <Info className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                Empresa Ativa: <strong className="text-indigo-600 dark:text-indigo-400">{selectedEmpresa?.trade_name || 'Nenhuma'}</strong>
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">
                Selecione o idioma desejado nas abas abaixo para carregar, enviar ou restaurar o modelo Word daquele respectivo idioma.
              </p>
            </div>
          </div>

          {/* Abas de Idioma */}
          <div className="w-full">
            <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
              <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-4">
                {LANGUAGES.map((lang) => (
                  <TabsTrigger 
                    key={lang.code} 
                    value={lang.code} 
                    className="rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all"
                  >
                    {lang.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Template da Proposta */}
            <div className="border rounded-xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-bold text-sm block">Proposta Comercial ({activeLang.toUpperCase()})</span>
                  <p className="text-xs text-muted-foreground font-mono">{folderName}/{activeLang}/proposta.docx</p>
                </div>
                {loadingTemplates ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : proposalStatus === 'custom' ? (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                    Personalizado
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    Padrão Global
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t text-xs">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs" 
                  onClick={() => handleDownload('proposta')}
                  disabled={loadingTemplates}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar Atual
                </Button>
                
                <input 
                  type="file" 
                  ref={proposalInputRef} 
                  className="hidden" 
                  accept=".docx"
                  onChange={(e) => handleUpload(e, 'proposta')}
                />
                <Button 
                  size="sm" 
                  className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium" 
                  onClick={() => proposalInputRef.current?.click()}
                  disabled={uploadingType === 'proposal' || loadingTemplates}
                >
                  {uploadingType === 'proposal' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload Word
                </Button>

                {proposalStatus === 'custom' && (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-950 dark:hover:bg-rose-950/20" 
                    onClick={() => handleRestore('proposta')}
                    title="Restaurar para padrão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Template do Contrato */}
            <div className="border rounded-xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-bold text-sm block">Contrato Comercial ({activeLang.toUpperCase()})</span>
                  <p className="text-xs text-muted-foreground font-mono">{folderName}/{activeLang}/contrato.docx</p>
                </div>
                {loadingTemplates ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : contractStatus === 'custom' ? (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                    Personalizado
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    Padrão Global
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t text-xs">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs" 
                  onClick={() => handleDownload('contrato')}
                  disabled={loadingTemplates}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar Atual
                </Button>
                
                <input 
                  type="file" 
                  ref={contractInputRef} 
                  className="hidden" 
                  accept=".docx"
                  onChange={(e) => handleUpload(e, 'contrato')}
                />
                <Button 
                  size="sm" 
                  className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium" 
                  onClick={() => contractInputRef.current?.click()}
                  disabled={uploadingType === 'contract' || loadingTemplates}
                >
                  {uploadingType === 'contract' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload Word
                </Button>

                {contractStatus === 'custom' && (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-950 dark:hover:bg-rose-950/20" 
                    onClick={() => handleRestore('contrato')}
                    title="Restaurar para padrão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Documentação de Variáveis e Loops */}
          <div className="border rounded-xl overflow-hidden mt-4 bg-white dark:bg-slate-900">
            <details className="group">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150 select-none">
                <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <FileCode className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Guia de Tags e Variáveis dos Templates Word</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <div className="p-5 border-t dark:border-slate-800 text-xs space-y-4 text-slate-700 dark:text-slate-300 max-h-[350px] overflow-y-auto">
                <p>Use chaves duplas <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px] text-indigo-600 font-bold">{"{{"}variavel{"}}"}</code> nos seus arquivos do Word para que o sistema as preencha automaticamente. Veja as tags disponíveis:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1">Orçamento / Proposta</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}proposta_codigo{"}}"}</strong>: ex: PROP-2026-004</li>
                      <li><strong>{"{{"}proposta_data{"}}"}</strong>: Data de emissão (pt-PT)</li>
                      <li><strong>{"{{"}proposta_validade{"}}"}</strong>: Data de expiração</li>
                      <li><strong>{"{{"}proposta_pagamento{"}}"}</strong>: Termos de pagamento</li>
                      <li><strong>{"{{"}proposta_notas{"}}"}</strong>: Notas gerais</li>
                    </ul>

                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1 pt-2">Empresa (Emitente)</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}empresa_nome{"}}"}</strong>: Nome da Empresa</li>
                      <li><strong>{"{{"}empresa_nif{"}}"}</strong>: NIF / CNPJ</li>
                      <li><strong>{"{{"}empresa_telefone{"}}"}</strong>: Contato telefónico</li>
                      <li><strong>{"{{"}empresa_email{"}}"}</strong>: E-mail emissor</li>
                      <li><strong>{"{{"}empresa_morada{"}}"}</strong>: Endereço completo</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1">Cliente / Destinatário</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}cliente_nome{"}}"}</strong>: Nome do responsável</li>
                      <li><strong>{"{{"}cliente_empresa{"}}"}</strong>: Nome corporativo</li>
                      <li><strong>{"{{"}cliente_email{"}}"}</strong>: E-mail de destino</li>
                      <li><strong>{"{{"}cliente_telefone{"}}"}</strong>: Telefone</li>
                      <li><strong>{"{{"}cliente_morada{"}}"}</strong>: Morada</li>
                      <li><strong>{"{{"}cliente_nif{"}}"}</strong>: NIF / CIF</li>
                    </ul>

                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1 pt-2">Serviço e Financeiro</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}obra_morada{"}}"}</strong>: Local da Obra/Serviço</li>
                      <li><strong>{"{{"}data_inicio{"}}"}</strong>: Data prevista de início</li>
                      <li><strong>{"{{"}data_fim{"}}"}</strong>: Data prevista de fim</li>
                      <li><strong>{"{{"}total_receita{"}}"}</strong>: Valor total da Proposta (€)</li>
                      <li><strong>{"{{"}margem_percentual{"}}"}</strong>: Margem líquida (%)</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">Como Criar Tabela de Itens (Perfis/Trabalhadores)</h4>
                  <p className="mb-2">Desenhe uma tabela no Word com um cabeçalho e uma linha de dados. Na primeira célula da linha de dados, inicie o loop e na última termine-o:</p>
                  <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[10.5px] leading-relaxed">
                    Linha de Dados da Tabela:<br />
                    Col 1: <span className="text-emerald-400">{"{#itens}"}</span>{"{{"}funcao{"}}"}<br />
                    Col 2: {"{{"}quantidade{"}}"}<br />
                    Col 3: {"{{"}horas_dia{"}}"}h<br />
                    Col 4: {"{{"}dias_semana{"}}"}d<br />
                    Col 5: {"{{"}total_horas{"}}"}h<br />
                    Col 6: €{"{{"}tarifa_venda{"}}"}/h<br />
                    Col 7: €{"{{"}valor_total{"}}"} <span className="text-emerald-400">{"{/itens}"}</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
