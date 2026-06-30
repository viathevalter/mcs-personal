import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, ShieldAlert, Sliders, FileText, Download, Upload, Trash2, Info, ChevronRight, FileCode, Plus, Mail } from 'lucide-react';
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
  
  // Notification emails state
  const [notificationEmails, setNotificationEmails] = useState<{ id: string; email: string; event_type: 'pedido' | 'reemplazo' | 'reubicacion' | 'prueba' | 'baja' }[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<('pedido' | 'reemplazo' | 'reubicacion' | 'prueba' | 'baja')[]>(['pedido']);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const fetchNotificationEmails = async () => {
    if (!selectedEmpresaId) return;
    try {
      setLoadingEmails(true);
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('notification_emails')
        .select('*')
        .eq('empresa_id', selectedEmpresaId);
      if (error) throw error;
      setNotificationEmails(data || []);
    } catch (err: any) {
      console.error('Error fetching notification emails:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail || !selectedEmpresaId) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error(t('comercial.settings.invalidEmail', { defaultValue: 'E-mail inválido' }));
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error('Selecione pelo menos um tipo de evento para vincular o e-mail.');
      return;
    }

    try {
      const rows = selectedTypes.map(type => ({
        empresa_id: selectedEmpresaId,
        email: newEmail.trim().toLowerCase(),
        event_type: type
      }));

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('notification_emails')
        .insert(rows)
        .select();

      if (error) throw error;

      if (data) {
        setNotificationEmails(prev => [...prev, ...data]);
      }
      setNewEmail('');
      toast.success(t('comercial.settings.emailAdded', { defaultValue: 'E-mail adicionado com sucesso!' }));
    } catch (err: any) {
      console.error('Error adding email:', err);
      toast.error(t('comercial.settings.emailAddError', { defaultValue: 'Erro ao adicionar e-mail' }), { description: err.message });
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .schema('core_comercial')
        .from('notification_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotificationEmails(prev => prev.filter(e => e.id !== id));
      toast.success(t('comercial.settings.emailDeleted', { defaultValue: 'E-mail removido com sucesso!' }));
    } catch (err: any) {
      console.error('Error deleting email:', err);
      toast.error(t('comercial.settings.emailDeleteError', { defaultValue: 'Erro ao remover e-mail' }), { description: err.message });
    }
  };

  // Settings state
  const [settings, setSettings] = useState({
    id: '',
    min_margin_percent: 15.00,
    block_debtor_estimations: true,
    ivp_min_threshold: 5.00,
    default_hours_weekday: 8.0,
    default_hours_lunes: 8.0,
    default_hours_martes: 8.0,
    default_hours_miercoles: 8.0,
    default_hours_jueves: 8.0,
    default_hours_viernes: 8.0,
    default_hours_sabado: 0.0,
    default_hours_domingo: 0.0,
    default_work_lunes: true,
    default_work_martes: true,
    default_work_miercoles: true,
    default_work_jueves: true,
    default_work_viernes: true,
    default_work_sabado: false,
    default_work_domingo: false,
  });

  const [customWeekdays, setCustomWeekdays] = useState(false);

  // Templates state
  const [activeLang, setActiveLang] = useState<string>('pt');
  const [proposalStatus, setProposalStatus] = useState<'default' | 'custom'>('default');
  const [contractStatus, setContractStatus] = useState<'default' | 'custom'>('default');
  const [pedidoStatus, setPedidoStatus] = useState<'default' | 'custom'>('default');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [uploadingType, setUploadingType] = useState<'proposal' | 'contract' | 'pedido' | null>(null);

  const proposalInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const pedidoInputRef = useRef<HTMLInputElement>(null);

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
        setPedidoStatus('default');
        return;
      }
      
      const hasProp = files?.some(f => f.name === 'proposta.docx') || false;
      const hasCont = files?.some(f => f.name === 'contrato.docx') || false;
      const hasPed = files?.some(f => f.name === 'pedido.docx') || false;
      
      setProposalStatus(hasProp ? 'custom' : 'default');
      setContractStatus(hasCont ? 'custom' : 'default');
      setPedidoStatus(hasPed ? 'custom' : 'default');
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
          const wl = Number(data.default_hours_lunes ?? data.default_hours_weekday ?? 8.0);
          const wt = Number(data.default_hours_martes ?? data.default_hours_weekday ?? 8.0);
          const wq = Number(data.default_hours_miercoles ?? data.default_hours_weekday ?? 8.0);
          const wqi = Number(data.default_hours_jueves ?? data.default_hours_weekday ?? 8.0);
          const wv = Number(data.default_hours_viernes ?? data.default_hours_weekday ?? 8.0);
          const dw = Number(data.default_hours_weekday ?? 8.0);

          setSettings({
            id: data.id,
            min_margin_percent: Number(data.min_margin_percent),
            block_debtor_estimations: !!data.block_debtor_estimations,
            ivp_min_threshold: Number(data.ivp_min_threshold),
            default_hours_weekday: dw,
            default_hours_lunes: wl,
            default_hours_martes: wt,
            default_hours_miercoles: wq,
            default_hours_jueves: wqi,
            default_hours_viernes: wv,
            default_hours_sabado: Number(data.default_hours_sabado ?? 0.0),
            default_hours_domingo: Number(data.default_hours_domingo ?? 0.0),
            default_work_lunes: data.default_work_lunes !== false,
            default_work_martes: data.default_work_martes !== false,
            default_work_miercoles: data.default_work_miercoles !== false,
            default_work_jueves: data.default_work_jueves !== false,
            default_work_viernes: data.default_work_viernes !== false,
            default_work_sabado: !!data.default_work_sabado,
            default_work_domingo: !!data.default_work_domingo,
          });
          setCustomWeekdays(wl !== dw || wt !== dw || wq !== dw || wqi !== dw || wv !== dw);
        } else {
          // If no row exists, create a default local state to insert later
          setSettings({
            id: '',
            min_margin_percent: 15.00,
            block_debtor_estimations: true,
            ivp_min_threshold: 5.00,
            default_hours_weekday: 8.0,
            default_hours_lunes: 8.0,
            default_hours_martes: 8.0,
            default_hours_miercoles: 8.0,
            default_hours_jueves: 8.0,
            default_hours_viernes: 8.0,
            default_hours_sabado: 0.0,
            default_hours_domingo: 0.0,
            default_work_lunes: true,
            default_work_martes: true,
            default_work_miercoles: true,
            default_work_jueves: true,
            default_work_viernes: true,
            default_work_sabado: false,
            default_work_domingo: false,
          });
          setCustomWeekdays(false);
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
        toast.error(t('comercial.settings.toastLoadError'), { description: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
    fetchNotificationEmails();
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
        default_hours_weekday: settings.default_hours_weekday,
        default_hours_lunes: customWeekdays ? settings.default_hours_lunes : settings.default_hours_weekday,
        default_hours_martes: customWeekdays ? settings.default_hours_martes : settings.default_hours_weekday,
        default_hours_miercoles: customWeekdays ? settings.default_hours_miercoles : settings.default_hours_weekday,
        default_hours_jueves: customWeekdays ? settings.default_hours_jueves : settings.default_hours_weekday,
        default_hours_viernes: customWeekdays ? settings.default_hours_viernes : settings.default_hours_weekday,
        default_hours_sabado: settings.default_hours_sabado,
        default_hours_domingo: settings.default_hours_domingo,
        default_work_lunes: settings.default_work_lunes,
        default_work_martes: settings.default_work_martes,
        default_work_miercoles: settings.default_work_miercoles,
        default_work_jueves: settings.default_work_jueves,
        default_work_viernes: settings.default_work_viernes,
        default_work_sabado: settings.default_work_sabado,
        default_work_domingo: settings.default_work_domingo,
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

  const handleDownload = async (type: 'proposta' | 'contrato' | 'pedido') => {
    const isCustom = type === 'proposta' 
      ? proposalStatus === 'custom' 
      : type === 'contrato' 
        ? contractStatus === 'custom' 
        : pedidoStatus === 'custom';
    
    let fileName = "";
    if (isCustom) {
      fileName = `${folderName}/${activeLang}/${type}.docx`;
    } else {
      if (type === 'proposta') {
        fileName = activeLang === 'pt' ? 'default.docx' : `default_${activeLang}.docx`;
      } else if (type === 'contrato') {
        fileName = activeLang === 'pt' ? 'default_contrato.docx' : `default_contrato_${activeLang}.docx`;
      } else {
        fileName = activeLang === 'pt' ? 'default_pedido.docx' : `default_pedido_${activeLang}.docx`;
      }
    }
      
    try {
      const { data, error } = await supabase.storage
        .from('proposal-templates')
        .download(fileName);
        
      if (error) {
        // Fallback para o template padrão global de base (pt) se o específico do idioma não existir no storage
        console.warn(`Default template ${fileName} not found. Trying global default...`);
        const fallbackFileName = type === 'proposta' 
          ? 'default.docx' 
          : type === 'contrato' 
            ? 'default_contrato.docx' 
            : 'default_pedido.docx';
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'proposta' | 'contrato' | 'pedido') => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error(t('comercial.settings.onlyDocx', { defaultValue: 'Por favor, selecione um arquivo no formato Word (.docx).' }));
      return;
    }
    
    const targetType = type === 'proposta' ? 'proposal' : type === 'contrato' ? 'contract' : 'pedido';
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

  const handleRestore = async (type: 'proposta' | 'contrato' | 'pedido') => {
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
    <div className="flex flex-col space-y-6 p-4 max-w-7xl mx-auto">
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
                    <div className="border-t pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('comercial.settings.defaultScheduleTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('comercial.settings.defaultScheduleSubtitle')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Mon-Fri Card */}
              <div className="lg:col-span-6 border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{t('comercial.stepGeneral.weekdaysLabel')}</span>
                    <button
                      type="button"
                      onClick={() => setCustomWeekdays(!customWeekdays)}
                      className="text-[11px] text-left text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 font-semibold mt-1"
                    >
                      {customWeekdays ? t('comercial.stepGeneral.unifiedWeekdays') : t('comercial.stepGeneral.customizeWeekdays')}
                    </button>
                  </div>             </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      id="default_work_weekdays"
                      checked={settings.default_work_lunes}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSettings(prev => ({
                          ...prev,
                          default_work_lunes: val,
                          default_work_martes: val,
                          default_work_miercoles: val,
                          default_work_jueves: val,
                          default_work_viernes: val,
                        }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="default_work_weekdays" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel')}</Label>
                  </div>
                </div>

                {!customWeekdays ? (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="default_hours_weekday" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel')}</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!settings.default_work_lunes}
                        onClick={() => setSettings(prev => {
                          const newHours = Math.max(1, prev.default_hours_weekday - 1);
                          return {
                            ...prev,
                            default_hours_weekday: newHours,
                            default_hours_lunes: newHours,
                            default_hours_martes: newHours,
                            default_hours_miercoles: newHours,
                            default_hours_jueves: newHours,
                            default_hours_viernes: newHours,
                          };
                        })}
                      >
                        -
                      </Button>
                      <Input
                        id="default_hours_weekday"
                        type="number"
                        min="1"
                        max="24"
                        disabled={!settings.default_work_lunes}
                        value={settings.default_hours_weekday}
                        onChange={(e) => {
                          const newHours = parseFloat(e.target.value) || 8;
                          setSettings(prev => ({
                            ...prev,
                            default_hours_weekday: newHours,
                            default_hours_lunes: newHours,
                            default_hours_martes: newHours,
                            default_hours_miercoles: newHours,
                            default_hours_jueves: newHours,
                            default_hours_viernes: newHours,
                          }));
                        }}
                        className="h-8 text-center text-xs font-semibold w-16"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!settings.default_work_lunes}
                        onClick={() => setSettings(prev => {
                          const newHours = Math.min(24, prev.default_hours_weekday + 1);
                          return {
                            ...prev,
                            default_hours_weekday: newHours,
                            default_hours_lunes: newHours,
                            default_hours_martes: newHours,
                            default_hours_miercoles: newHours,
                            default_hours_jueves: newHours,
                            default_hours_viernes: newHours,
                          };
                        })}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {[
                      { key: 'lunes', label: t('comercial.stepGeneral.monday'), activeKey: 'default_work_lunes', hoursKey: 'default_hours_lunes' },
                      { key: 'martes', label: t('comercial.stepGeneral.tuesday'), activeKey: 'default_work_martes', hoursKey: 'default_hours_martes' },
                      { key: 'miercoles', label: t('comercial.stepGeneral.wednesday'), activeKey: 'default_work_miercoles', hoursKey: 'default_hours_miercoles' },
                      { key: 'jueves', label: t('comercial.stepGeneral.thursday'), activeKey: 'default_work_jueves', hoursKey: 'default_hours_jueves' },
                      { key: 'viernes', label: t('comercial.stepGeneral.friday'), activeKey: 'default_work_viernes', hoursKey: 'default_hours_viernes' },
                    ].map(day => {
                      const isActive = (settings as any)[day.activeKey];
                      const hours = (settings as any)[day.hoursKey] ?? 8;
                      return (
                        <div key={day.key} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100/30 dark:border-slate-800/30 last:border-0">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`check_${day.key}`}
                              checked={isActive}
                              onChange={(e) => setSettings(prev => ({ ...prev, [day.activeKey]: e.target.checked }))}
                              className="h-3.5 w-3.5 rounded border-gray-305 text-indigo-650 focus:ring-indigo-500"
                            />
                            <Label htmlFor={`check_${day.key}`} className="text-xs font-semibold">{day.label}</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!isActive}
                              onClick={() => setSettings(prev => ({ ...prev, [day.hoursKey]: Math.max(1, ((prev as any)[day.hoursKey] ?? 8) - 1) }))}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              disabled={!isActive}
                              value={hours}
                              onChange={(e) => setSettings(prev => ({ ...prev, [day.hoursKey]: parseFloat(e.target.value) || 8 }))}
                              className="h-7 text-center text-xs font-semibold w-12 p-0"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!isActive}
                              onClick={() => setSettings(prev => ({ ...prev, [day.hoursKey]: Math.min(24, ((prev as any)[day.hoursKey] ?? 8) + 1) }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Saturday Card */}
              <div className={`lg:col-span-3 border rounded-xl p-4 transition-colors space-y-3 ${settings.default_work_sabado ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200' : 'bg-slate-50/50 dark:bg-slate-900/40'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">{t('comercial.stepGeneral.saturdayLabel')}</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      id="default_work_sabado"
                      checked={settings.default_work_sabado}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_work_sabado: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="default_work_sabado" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel')}</Label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default_hours_sabado" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel')}</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!settings.default_work_sabado}
                      onClick={() => setSettings(prev => ({ ...prev, default_hours_sabado: Math.max(0, prev.default_hours_sabado - 1) }))}
                    >
                      -
                    </Button>
                    <Input
                      id="default_hours_sabado"
                      type="number"
                      min="0"
                      max="24"
                      disabled={!settings.default_work_sabado}
                      value={settings.default_hours_sabado}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_hours_sabado: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-center text-xs font-semibold w-16"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!settings.default_work_sabado}
                      onClick={() => setSettings(prev => ({ ...prev, default_hours_sabado: Math.min(24, prev.default_hours_sabado + 1) }))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sunday Card */}
              <div className={`lg:col-span-3 border rounded-xl p-4 transition-colors space-y-3 ${settings.default_work_domingo ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200' : 'bg-slate-50/50 dark:bg-slate-900/40'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">{t('comercial.stepGeneral.sundayLabel')}</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      id="default_work_domingo"
                      checked={settings.default_work_domingo}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_work_domingo: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="default_work_domingo" className="text-xs font-medium cursor-pointer">{t('comercial.stepGeneral.activeLabel')}</Label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default_hours_domingo" className="text-xs font-semibold">{t('comercial.stepGeneral.hoursLabel')}</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!settings.default_work_domingo}
                      onClick={() => setSettings(prev => ({ ...prev, default_hours_domingo: Math.max(0, prev.default_hours_domingo - 1) }))}
                    >
                      -
                    </Button>
                    <Input
                      id="default_hours_domingo"
                      type="number"
                      min="0"
                      max="24"
                      disabled={!settings.default_work_domingo}
                      value={settings.default_hours_domingo}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_hours_domingo: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-center text-xs font-semibold w-16"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!settings.default_work_domingo}
                      onClick={() => setSettings(prev => ({ ...prev, default_hours_domingo: Math.min(24, prev.default_hours_domingo + 1) }))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
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

      {/* Seção de Configuração de E-mails de Notificação */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            <CardTitle>E-mails de Notificação</CardTitle>
          </div>
          <CardDescription>
            Gerencie os grupos de e-mails que receberão as notificações para cada tipo de evento (pedido, reemplazo, reubicacion).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5 animate-fadeIn">
                <Label htmlFor="notification_email" className="text-xs font-semibold">Endereço de E-mail</Label>
                <Input
                  id="notification_email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <Button onClick={handleAddEmail} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-10 px-5 shadow-sm transition-all hover:translate-y-[-1px]">
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>

            <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Vincular aos Eventos</Label>
              <div className="flex flex-wrap gap-6 pt-1">
                {[
                  { key: 'pedido', label: 'Envio de Pedido' },
                  { key: 'reemplazo', label: 'Reemplazo' },
                  { key: 'reubicacion', label: 'Reubicación' },
                  { key: 'prueba', label: 'Prueba (Teste Técnico)' },
                  { key: 'baja', label: 'Baja' },
                ].map(item => {
                  const isChecked = selectedTypes.includes(item.key as any);
                  return (
                    <label key={item.key} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedTypes(prev => [...prev, item.key as any]);
                          } else {
                            setSelectedTypes(prev => prev.filter(t => t !== item.key));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
            {(['pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja'] as const).map(type => {
              const emailsOfType = notificationEmails.filter(e => e.event_type === type);
              const label = type === 'pedido' 
                ? 'Envio de Pedido' 
                : type === 'reemplazo' 
                  ? 'Reemplazo' 
                  : type === 'reubicacion' 
                    ? 'Reubicación' 
                    : type === 'prueba'
                      ? 'Prueba'
                      : 'Baja';
              const badgeColor = type === 'pedido' 
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900' 
                : type === 'reemplazo' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900' 
                  : type === 'reubicacion'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900'
                    : type === 'prueba'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
              
              return (
                <div key={type} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/20 dark:bg-slate-950/10 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-850 dark:text-slate-200">{label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
                      {emailsOfType.length}
                    </span>
                  </div>
                  {loadingEmails ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  ) : emailsOfType.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 font-medium">Nenhum e-mail cadastrado.</p>
                  ) : (
                    <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {emailsOfType.map(email => (
                        <li key={email.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2 hover:shadow-sm transition-all">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2" title={email.email}>
                            {email.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmail(email.id)}
                            className="text-rose-500 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 flex-shrink-0 transition-colors"
                            title="Remover e-mail"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
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
                {t('comercial.settings.activeCompanyLabel')} <strong className="text-indigo-600 dark:text-indigo-400">{selectedEmpresa?.trade_name || 'Nenhuma'}</strong>
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">
                {t('comercial.settings.selectLanguageHelp')}
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
                    {t('comercial.stepGeneral.languages.' + lang.code, { defaultValue: lang.label })}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Template da Proposta */}
            <div className="border rounded-xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-bold text-sm block">{t('comercial.settings.proposalTemplateTitle')} ({activeLang.toUpperCase()})</span>
                  <p className="text-xs text-muted-foreground font-mono">{folderName}/{activeLang}/proposta.docx</p>
                </div>
                {loadingTemplates ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : proposalStatus === 'custom' ? (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {t('comercial.settings.customBadge')}
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {t('comercial.settings.globalDefaultBadge')}
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

            {/* Template do Pedido Operacional */}
            <div className="border rounded-xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-bold text-sm block">Pedido Operacional ({activeLang.toUpperCase()})</span>
                  <p className="text-xs text-muted-foreground font-mono">{folderName}/{activeLang}/pedido.docx</p>
                </div>
                {loadingTemplates ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : pedidoStatus === 'custom' ? (
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
                  onClick={() => handleDownload('pedido')}
                  disabled={loadingTemplates}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar Atual
                </Button>
                
                <input 
                  type="file" 
                  ref={pedidoInputRef} 
                  className="hidden" 
                  accept=".docx"
                  onChange={(e) => handleUpload(e, 'pedido')}
                />
                <Button 
                  size="sm" 
                  className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium" 
                  onClick={() => pedidoInputRef.current?.click()}
                  disabled={uploadingType === 'pedido' || loadingTemplates}
                >
                  {uploadingType === 'pedido' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload Word
                </Button>

                {pedidoStatus === 'custom' && (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-950 dark:hover:bg-rose-950/20" 
                    onClick={() => handleRestore('pedido')}
                    title="Restaurar para padrão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Documentação de Variáveis e Loops */}
          <div className="border rounded-xl overflow-hidden mt-4 bg-white dark:bg-slate-900 font-sans">
            <details className="group">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150 select-none">
                <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <FileCode className="h-4.5 w-4.5 text-indigo-500" />
                  <span>{t('comercial.settings.guideTitle')}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <div className="p-5 border-t dark:border-slate-800 text-xs space-y-4 text-slate-700 dark:text-slate-300 max-h-[350px] overflow-y-auto">
                <p>{t('comercial.settings.guideDesc')}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1">{t('comercial.settings.guideProposalHeader')}</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}proposta_codigo{"}}"}</strong>: ex: PROP-2026-004</li>
                      <li><strong>{"{{"}proposta_data{"}}"}</strong>: Data de emissão (pt-PT)</li>
                      <li><strong>{"{{"}proposta_validade{"}}"}</strong>: Data de expiração</li>
                      <li><strong>{"{{"}proposta_pagamento{"}}"}</strong>: Termos de pagamento</li>
                      <li><strong>{"{{"}proposta_notas{"}}"}</strong>: Notas gerais</li>
                    </ul>

                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1 pt-2">{t('comercial.settings.guideCompanyHeader')}</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}empresa_nome{"}}"}</strong>: Nome da Empresa</li>
                      <li><strong>{"{{"}empresa_nif{"}}"}</strong>: NIF / CNPJ</li>
                      <li><strong>{"{{"}empresa_telefone{"}}"}</strong>: Contato telefónico</li>
                      <li><strong>{"{{"}empresa_email{"}}"}</strong>: E-mail emissor</li>
                      <li><strong>{"{{"}empresa_morada{"}}"}</strong>: Endereço completo</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1">{t('comercial.settings.guideClientHeader')}</h4>
                    <ul className="space-y-1 font-mono text-[11px] list-disc pl-4">
                      <li><strong>{"{{"}cliente_nome{"}}"}</strong>: Nome do responsável</li>
                      <li><strong>{"{{"}cliente_empresa{"}}"}</strong>: Nome corporativo</li>
                      <li><strong>{"{{"}cliente_email{"}}"}</strong>: E-mail de destino</li>
                      <li><strong>{"{{"}cliente_telefone{"}}"}</strong>: Telefone</li>
                      <li><strong>{"{{"}cliente_morada{"}}"}</strong>: Morada</li>
                      <li><strong>{"{{"}cliente_nif{"}}"}</strong>: NIF / CIF</li>
                    </ul>

                    <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b pb-1 pt-2">{t('comercial.settings.guideServiceHeader')}</h4>
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
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">{t('comercial.settings.guideTableTitle')}</h4>
                  <p className="mb-2">{t('comercial.settings.guideTableDesc')}</p>
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
