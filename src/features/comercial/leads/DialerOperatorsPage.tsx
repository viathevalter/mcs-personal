import { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  HelpCircle, 
  Save, 
  Loader2,
  FileText,
  Image as ImageIcon,
  Code,
  Eye,
  Mail,
  Building2,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useSalespeople, type Salesperson } from './hooks/useLeads';
import { useSalesScripts, useMutateDialer } from './hooks/useDialer';
import { useComercialLanguage } from './utils/comercialI18n';
import { supabase } from '@/shared/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SalesScript, ObjectionItem, QualifyingQuestion } from './types/dialerTypes';

export function DialerOperatorsPage() {
  const { tr } = useComercialLanguage();
  const { data: salespeople = [] } = useSalespeople();
  const { data: scripts = [] } = useSalesScripts();
  const { saveSalesScript, isSavingSalesScript, deleteSalesScript } = useMutateDialer();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'operators' | 'scripts'>('operators');

  // Operator M365 Config Modal State
  const [isM365ModalOpen, setIsM365ModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Salesperson | null>(null);
  const [operatorCommercialEmail, setOperatorCommercialEmail] = useState('');
  const [operatorCommercialName, setOperatorCommercialName] = useState('');
  const [operatorCommercialPhone, setOperatorCommercialPhone] = useState('');
  const [savingOperator, setSavingOperator] = useState(false);

  const handleOpenM365Config = (sp: Salesperson) => {
    setSelectedOperator(sp);
    setOperatorCommercialEmail(sp.commercial_email || '');
    setOperatorCommercialName(sp.commercial_name || sp.display_name || '');
    setOperatorCommercialPhone(sp.commercial_phone || '');
    setIsM365ModalOpen(true);
  };

  const handleSaveOperatorM365 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator?.id) return;
    try {
      setSavingOperator(true);
      const { error } = await supabase
        .from('mcs_users')
        .update({
          commercial_email: operatorCommercialEmail.trim() || null,
          commercial_name: operatorCommercialName.trim() || null,
          commercial_phone: operatorCommercialPhone.trim() || null,
        })
        .eq('id', selectedOperator.id);

      if (error) throw error;
      toast.success(
        tr(
          `Configuração M365 de ${selectedOperator.display_name} salva com sucesso!`,
          `¡Configuración M365 de ${selectedOperator.display_name} guardada con éxito!`,
          `Configuration M365 de ${selectedOperator.display_name} enregistrée avec succès !`
        )
      );
      queryClient.invalidateQueries({ queryKey: ['salespeople_users'] });
      setIsM365ModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar configuração de remetente M365:', err);
      toast.error(
        err.message ||
          tr(
            'Falha ao salvar configuração M365.',
            'Error al guardar la configuración M365.',
            'Erreur lors de l\'enregistrement de la configuration M365.'
          )
      );
    } finally {
      setSavingOperator(false);
    }
  };

  // Script Edit Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [modalSubTab, setModalSubTab] = useState<'general' | 'questions' | 'objections' | 'visual' | 'preview'>('general');

  const [editingScript, setEditingScript] = useState<Partial<SalesScript>>({
    title: '',
    sector: 'metalurgico_es',
    pitch_opening: '',
    closing_pitch: '',
    image_url: '',
    rich_content_html: '',
    qualifying_questions: [],
    objections_guide: [],
  });

  const handleOpenNewScript = () => {
    setEditingScript({
      title: '',
      sector: 'industrial_es',
      pitch_opening: 'Buenos días. Le llamo de MCS Servicios Industriales respecto a disponibilidad inmediata de soldadores homologados TIG/MIG y montadores para {empresa}. ¿Me podría comunicar con el responsable de producción o compras?',
      closing_pitch: '¿Podemos enviarles una propuesta formal con nuestras tarifas horarias para que comparen en su próxima obra?',
      image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80',
      rich_content_html: `<div style="padding: 10px; border-radius: 8px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2);">
  <h4 style="font-weight: bold; margin-bottom: 6px;">Especialidades Destacadas MCS:</h4>
  <ul style="list-style-type: disc; padding-left: 20px; font-size: 12px;">
    <li>Soldadores Homologados 6G TIG / Electrodo / MIG-MAG (Tuberías y Estructuras)</li>
    <li>Caldereros y Montadores de Estructuras Pesadas</li>
    <li>Tuberos Industriales con lectura de Isométricos</li>
    <li>Equipos con alojamiento y transporte 100% gestionados por MCS</li>
  </ul>
</div>`,
      qualifying_questions: [
        { question: '¿Tienen obras o paradas técnicas programadas para los próximos meses?', goal: 'Mapear demanda y picos de obra' },
        { question: '¿Suelen contratar refuerzo de soldadores homologados o montadores externos?', goal: 'Validar subcontratación' },
        { question: '¿Con quién deberíamos coordinar para el envío de nuestro catálogo y tarifas?', goal: 'Identificar decisor técnico' }
      ],
      objections_guide: [
        { 
          objection: 'Ya tenemos proveedores habituales de personal', 
          response: 'Excelente. No buscamos sustituir a sus colaboradores actuales, sino estar homologados como su opción de respaldo para cuando ellos no tengan soldadores con las certificaciones necesarias.' 
        },
        { 
          objection: 'En este momento no tenemos obras ni demanda', 
          response: 'Comprendo perfectamente. Le dejamos nuestro contacto y dosier para que tengan referencia de tarifas competitivas cuando surja la próxima licitación.' 
        },
        { 
          objection: '¿Cuáles son sus tarifas por hora?', 
          response: 'Nuestras tarifas para soldadores homologados en España rondan entre 26€ y 31€/hora todo incluido (desplazamiento, alojamiento y EPIs). Si me dice qué perfiles precisan, le preparo una propuesta a medida hoy mismo.' 
        }
      ],
    });
    setModalSubTab('general');
    setIsScriptModalOpen(true);
  };

  const handleOpenEditScript = (script: SalesScript) => {
    setEditingScript({
      ...script,
      qualifying_questions: script.qualifying_questions || [],
      objections_guide: script.objections_guide || [],
    });
    setModalSubTab('general');
    setIsScriptModalOpen(true);
  };

  const handleDeleteScript = async (id: string) => {
    if (
      !confirm(
        tr(
          'Deseja realmente excluir este roteiro de vendas?',
          '¿Desea realmente eliminar este guión de ventas?',
          'Voulez-vous vraiment supprimer ce script de vente ?'
        )
      )
    )
      return;
    try {
      await deleteSalesScript(id);
      toast.success(
        tr('Roteiro excluído com sucesso!', '¡Guión eliminado con éxito!', 'Script supprimé avec succès !')
      );
    } catch {
      toast.error(tr('Erro ao excluir roteiro', 'Error al eliminar el guión', 'Erreur lors de la suppression'));
    }
  };

  const handleAddQuestion = () => {
    setEditingScript(prev => ({
      ...prev,
      qualifying_questions: [
        ...(prev.qualifying_questions || []),
        { question: '', goal: tr('Qualificar perfil', 'Cualificar perfil', 'Qualifier le profil') }
      ]
    }));
  };

  const handleUpdateQuestion = (index: number, field: keyof QualifyingQuestion, value: string) => {
    setEditingScript(prev => {
      const updated = [...(prev.qualifying_questions || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, qualifying_questions: updated };
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setEditingScript(prev => ({
      ...prev,
      qualifying_questions: (prev.qualifying_questions || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddObjection = () => {
    setEditingScript(prev => ({
      ...prev,
      objections_guide: [
        ...(prev.objections_guide || []),
        { objection: '', response: '' }
      ]
    }));
  };

  const handleUpdateObjection = (index: number, field: keyof ObjectionItem, value: string) => {
    setEditingScript(prev => {
      const updated = [...(prev.objections_guide || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, objections_guide: updated };
    });
  };

  const handleRemoveObjection = (index: number) => {
    setEditingScript(prev => ({
      ...prev,
      objections_guide: (prev.objections_guide || []).filter((_, i) => i !== index)
    }));
  };

  const handleInsertTagInPitch = (tag: string) => {
    setEditingScript(prev => ({
      ...prev,
      pitch_opening: (prev.pitch_opening || '') + ` ${tag} `
    }));
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript.title || !editingScript.pitch_opening) {
      toast.error(
        tr(
          'Preencha o título e a fala de abertura do script',
          'Complete el título y el discurso de apertura del guión',
          'Remplissez le titre et le discours d\'ouverture du script'
        )
      );
      return;
    }

    try {
      await saveSalesScript({
        ...editingScript,
        title: editingScript.title!,
        pitch_opening: editingScript.pitch_opening!,
        qualifying_questions: editingScript.qualifying_questions || [],
        objections_guide: editingScript.objections_guide || [],
      });
      toast.success(
        tr(
          'Roteiro de vendas salvo com sucesso!',
          '¡Guión de ventas guardado con éxito!',
          'Script de vente enregistré avec succès !'
        )
      );
      setIsScriptModalOpen(false);
    } catch (err: any) {
      toast.error(
        err.message ||
          tr('Erro ao salvar script', 'Error al guardar el guión', 'Erreur lors de l\'enregistrement du script')
      );
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              {tr(
                'Operadores & Scripts de Abordagem',
                'Operadores y Guiones de Abordaje',
                'Opérateurs & Scripts d\'Approche'
              )}
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs">
                {tr('Depto. Comercial', 'Depto. Comercial', 'Dépt. Commercial')}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {tr(
                'Configure os comerciais ativos do departamento Comercial e os roteiros de vendas do Power Dialer.',
                'Configure los comerciales activos del departamento Comercial y los guiones de ventas del Power Dialer.',
                'Configurez les commerciaux actifs du département Commercial et les scripts de vente du Power Dialer.'
              )}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
          <TabsList className="bg-muted/60 border border-border p-0.5 rounded-xl h-9">
            <TabsTrigger value="operators" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5">
              <Users className="w-3.5 h-3.5" />{' '}
              {tr('Comerciais Ativos', 'Comerciales Activos', 'Commerciaux Actifs')} ({salespeople.length})
            </TabsTrigger>
            <TabsTrigger value="scripts" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />{' '}
              {tr('Roteiros & Scripts', 'Guiones y Scripts', 'Scripts de Vente')} ({scripts.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab 1: Scripts Management */}
      {activeTab === 'scripts' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {tr(
                  'Biblioteca de Roteiros Comerciais',
                  'Biblioteca de Guiones Comerciales',
                  'Bibliothèque de Scripts Commerciaux'
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tr(
                  'Roteiros completos exibidos no Cockpit do Discador com perguntas BANT, objeções prontas e material de apoio visual.',
                  'Guiones completos mostrados en el Cockpit del Discador con preguntas de cualificación, objeciones y material visual.',
                  'Scripts complets affichés dans le Cockpit d\'Appels avec questions de qualification, objections et support visuel.'
                )}
              </p>
            </div>

            <Button
              onClick={handleOpenNewScript}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />{' '}
              {tr('Criar Novo Roteiro', 'Crear Nuevo Guión', 'Créer un Nouveau Script')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scripts.map(sc => (
              <div 
                key={sc.id}
                className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-bold text-foreground">{sc.title}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {tr('Setor:', 'Sector:', 'Secteur :')} {sc.sector || 'Industrial'}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {sc.sector || tr('Geral', 'General', 'Général')}
                    </span>
                  </div>

                  {sc.image_url && (
                    <div className="relative h-28 w-full rounded-xl overflow-hidden border border-border bg-muted">
                      <img 
                        src={sc.image_url} 
                        alt={sc.title} 
                        className="w-full h-full object-cover" 
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/70 text-white px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-indigo-400" />{' '}
                        {tr('Material Visual Anexo', 'Material Visual Adjunto', 'Support Visuel Joint')}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-foreground/90 line-clamp-3 italic bg-muted/30 p-3 rounded-xl border border-border">
                    "{sc.pitch_opening}"
                  </p>
                </div>

                <div className="space-y-3 text-xs pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                      {tr('Perguntas:', 'Preguntas:', 'Questions :')}{' '}
                      <strong>{(sc.qualifying_questions || []).length}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      {tr('Objeções:', 'Objeciones:', 'Objections :')}{' '}
                      <strong>{(sc.objections_guide || []).length}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScript(sc.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-rose-500 gap-1 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {tr('Excluir', 'Eliminar', 'Supprimer')}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenEditScript(sc)}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />{' '}
                      {tr('Editar Configurações', 'Editar Configuración', 'Modifier le Script')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Operators Management */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {tr(
                  'Operadores Comerciais Ativos (Departamento Comercial)',
                  'Operadores Comerciales Activos (Departamento Comercial)',
                  'Opérateurs Commerciaux Actifs (Département Commercial)'
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tr(
                  'Somente os comerciais ativos do departamento Comercial com públicos, campanhas e filas isoladas.',
                  'Únicamente los comerciales activos del departamento Comercial con públicos, campañas y colas aisladas.',
                  'Uniquement les commerciaux actifs du département Commercial avec audiences, campagnes et files isolées.'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salespeople.map(sp => (
              <div 
                key={sp.id}
                className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-purple-500/50 transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      {sp.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <span>{sp.flag || '🇪🇸'}</span>
                        <span>{sp.display_name}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">{sp.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sp.empresaName && (
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] gap-1">
                        <Building2 className="w-3 h-3" /> {sp.empresaName} ({sp.commercial_country || 'ES'})
                      </Badge>
                    )}
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                      {tr('Ativo', 'Activo', 'Actif')}
                    </Badge>
                  </div>
                </div>

                {/* M365 Email Remetente Mapping */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      {tr(
                        'Remetente M365 (Discador):',
                        'Remitente M365 (Discador):',
                        'Expéditeur M365 (Power Dialer) :'
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenM365Config(sp)}
                      className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-semibold"
                    >
                      {tr('Configurar', 'Configurar', 'Configurer')}
                    </Button>
                  </div>
                  <p className="font-mono text-xs font-bold text-foreground truncate">
                    {sp.commercial_email || (
                      <span className="text-muted-foreground italic font-normal text-[11px]">
                        {tr('E-mail padrão da empresa', 'Correo estándar de la empresa', 'E-mail par défaut de l\'entreprise')}
                      </span>
                    )}
                  </p>
                  {sp.commercial_name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {tr('Assinatura:', 'Firma:', 'Signature :')}{' '}
                      <strong className="text-foreground font-medium">{sp.commercial_name}</strong>
                    </p>
                  )}
                  {sp.commercial_phone && (
                    <p className="text-[11px] text-muted-foreground truncate font-mono">
                      Tel: {sp.commercial_phone}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    {tr('Mercado:', 'Mercado:', 'Marché :')}{' '}
                    <strong>
                      {sp.commercial_country === 'FR'
                        ? tr('França (FR)', 'Francia (FR)', 'France (FR)')
                        : tr('Espanha (ES)', 'España (ES)', 'Espagne (ES)')}
                    </strong>
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    {tr('Comercial Ativo', 'Comercial Activo', 'Commercial Actif')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal de Configuração do Remetente M365 do Operador */}
          <Dialog open={isM365ModalOpen} onOpenChange={setIsM365ModalOpen}>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 shadow-2xl overflow-hidden">
              <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      {tr(
                        'Configurar Remetente M365',
                        'Configurar Remitente M365',
                        'Configurer l\'Expéditeur M365'
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {tr('Comercial:', 'Comercial:', 'Commercial :')}{' '}
                      <strong className="text-foreground">{selectedOperator?.display_name}</strong> ({selectedOperator?.email})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleSaveOperatorM365} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tr(
                      'E-mail Corporativo M365 (Saída para Clientes)',
                      'Correo Corporativo M365 (Salida para Clientes)',
                      'E-mail Corporatif M365 (Sortie Clients)'
                    )}
                  </Label>
                  <Input
                    type="email"
                    value={operatorCommercialEmail}
                    onChange={e => setOperatorCommercialEmail(e.target.value)}
                    placeholder="Ex: comercial1@mail.luminousalley.com"
                    className="h-9 text-xs bg-background font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {tr(
                      'Caixa oficial do Microsoft 365 da qual sairão os catálogos e orçamentos enviados por este comercial.',
                      'Buzón oficial de Microsoft 365 desde el cual saldrán los catálogos y presupuestos enviados por este comercial.',
                      'Boîte officielle Microsoft 365 utilisée pour l\'envoi des catalogues et devis de ce commercial.'
                    )}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tr(
                      'Nome Comercial na Assinatura',
                      'Nombre Comercial en la Firma',
                      'Nom Commercial dans la Signature'
                    )}
                  </Label>
                  <Input
                    value={operatorCommercialName}
                    onChange={e => setOperatorCommercialName(e.target.value)}
                    placeholder="Ex: Alex | Depto. Comercial"
                    className="h-9 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tr(
                      'Telefone / WhatsApp Comercial (Assinatura)',
                      'Teléfono / WhatsApp Comercial (Firma)',
                      'Téléphone / WhatsApp Commercial (Signature)'
                    )}
                  </Label>
                  <Input
                    value={operatorCommercialPhone}
                    onChange={e => setOperatorCommercialPhone(e.target.value)}
                    placeholder="Ex: +34 600 000 000"
                    className="h-9 text-xs bg-background font-mono"
                  />
                </div>

                <DialogFooter className="pt-3 border-t border-border flex justify-between items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsM365ModalOpen(false)}
                    disabled={savingOperator}
                    className="text-xs"
                  >
                    {tr('Cancelar', 'Cancelar', 'Annuler')}
                  </Button>

                  <Button
                    type="submit"
                    disabled={savingOperator}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    {savingOperator ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {tr('Salvar Configuração', 'Guardar Configuración', 'Enregistrer')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Advanced Full Script Configurator Modal */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    {editingScript.id
                      ? tr('Configurar Roteiro de Vendas', 'Configurar Guión de Ventas', 'Configurer le Script de Vente')
                      : tr('Novo Roteiro de Vendas (Power Dialer)', 'Nuevo Guión de Ventas (Power Dialer)', 'Nouveau Script de Vente (Power Dialer)')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {tr(
                      'Configure a fala de abertura, perguntas de qualificação, quebra de objeções e materiais visuais de apoio.',
                      'Configure el discurso de apertura, preguntas de cualificación, manejo de objeciones y materiales visuales.',
                      'Configurez le discours d\'ouverture, les questions de qualification, les objections et les supports visuels.'
                    )}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Tabs value={modalSubTab} onValueChange={(v: any) => setModalSubTab(v)}>
                <TabsList className="grid grid-cols-5 bg-muted/70 border border-border p-0.5 rounded-xl h-9">
                  <TabsTrigger value="general" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <FileText className="w-3.5 h-3.5" /> {tr('Abertura & Dados', 'Apertura y Datos', 'Ouverture & Données')}
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> {tr('Perguntas', 'Preguntas', 'Questions')} ({(editingScript.qualifying_questions || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="objections" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> {tr('Objeções', 'Objeciones', 'Objections')} ({(editingScript.objections_guide || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> {tr('Imagem & HTML', 'Imagen y HTML', 'Image & HTML')}
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <Eye className="w-3.5 h-3.5" /> {tr('Pré-Visualização', 'Vista Previa', 'Aperçu')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveScript}>
            <div className="p-6">
              {modalSubTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        {tr('Título do Roteiro', 'Título del Guión', 'Titre du Script')}
                      </Label>
                      <Input
                        value={editingScript.title || ''}
                        onChange={e => setEditingScript(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Script Calderería & Estructuras"
                        required
                        className="bg-background border-input text-foreground text-xs h-9 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        {tr('Setor / Mercado Alvo', 'Sector / Mercado Objetivo', 'Secteur / Marché Cible')}
                      </Label>
                      <Input
                        value={editingScript.sector || ''}
                        onChange={e => setEditingScript(prev => ({ ...prev, sector: e.target.value }))}
                        placeholder="Ex: metalurgico_es / naval / petroquimico"
                        className="bg-background border-input text-foreground text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {tr(
                          'Fala de Abertura (Pitch Inicial de 10 Segundos)',
                          'Discurso de Apertura (Pitch Inicial de 10 Segundos)',
                          'Discours d\'Ouverture (Pitch Initial de 10 Secondes)'
                        )}
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Tags:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsertTagInPitch('{empresa}')}
                          className="h-6 text-[10px] px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                        >
                          + {'{empresa}'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsertTagInPitch('{contato}')}
                          className="h-6 text-[10px] px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                        >
                          + {'{contato}'}
                        </Button>
                      </div>
                    </div>

                    <Textarea
                      value={editingScript.pitch_opening || ''}
                      onChange={e => setEditingScript(prev => ({ ...prev, pitch_opening: e.target.value }))}
                      rows={5}
                      required
                      className="bg-background border-input text-foreground text-xs leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {tr(
                        'Gatilho de Fechamento / Próximo Passo',
                        'Cierre / Próximo Paso',
                        'Conclusion / Prochaine Étape'
                      )}
                    </Label>
                    <Textarea
                      value={editingScript.closing_pitch || ''}
                      onChange={e => setEditingScript(prev => ({ ...prev, closing_pitch: e.target.value }))}
                      rows={3}
                      className="bg-background border-input text-foreground text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {modalSubTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {tr('Perguntas de Diagnóstico (BANT)', 'Preguntas de Diagnóstico (BANT)', 'Questions de Diagnostic (BANT)')}
                      </h4>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddQuestion}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> {tr('Adicionar Pergunta', 'Añadir Pregunta', 'Ajouter une Question')}
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {(editingScript.qualifying_questions || []).map((q, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            #{idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-8 space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                              {tr('Pergunta:', 'Pregunta:', 'Question :')}
                            </Label>
                            <Input
                              value={q.question}
                              onChange={e => handleUpdateQuestion(idx, 'question', e.target.value)}
                              className="bg-background border-input text-xs h-8"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                              {tr('Objetivo:', 'Objetivo:', 'Objectif :')}
                            </Label>
                            <Input
                              value={q.goal}
                              onChange={e => handleUpdateQuestion(idx, 'goal', e.target.value)}
                              className="bg-background border-input text-xs h-8 font-semibold text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalSubTab === 'objections' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {tr('Quebra de Objeções', 'Manejo de Objeciones', 'Traitement des Objections')}
                      </h4>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddObjection}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> {tr('Adicionar Objeção', 'Añadir Objeción', 'Ajouter une Objection')}
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {(editingScript.objections_guide || []).map((obj, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> #{idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveObjection(idx)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                            {tr('Objeção do Cliente:', 'Objeción del Cliente:', 'Objection du Client :')}
                          </Label>
                          <Input
                            value={obj.objection}
                            onChange={e => handleUpdateObjection(idx, 'objection', e.target.value)}
                            className="bg-background border-input text-xs h-8 font-semibold text-foreground"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                            {tr('Resposta Recomendada:', 'Respuesta Recomendada:', 'Réponse Recommandée :')}
                          </Label>
                          <Textarea
                            value={obj.response}
                            onChange={e => handleUpdateObjection(idx, 'response', e.target.value)}
                            rows={2}
                            className="bg-background border-input text-xs leading-relaxed"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalSubTab === 'visual' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">URL</Label>
                        <Input
                          value={editingScript.image_url || ''}
                          onChange={e => setEditingScript(prev => ({ ...prev, image_url: e.target.value }))}
                          className="bg-background border-input text-foreground text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-indigo-500" />
                          HTML (Opcional)
                        </Label>
                        <Textarea
                          value={editingScript.rich_content_html || ''}
                          onChange={e => setEditingScript(prev => ({ ...prev, rich_content_html: e.target.value }))}
                          rows={4}
                          className="bg-background border-input font-mono text-[11px] leading-normal"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {editingScript.image_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 shadow-inner group">
                          <img 
                            src={editingScript.image_url} 
                            alt="Preview" 
                            className="w-full max-h-56 object-contain mx-auto"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {modalSubTab === 'preview' && (
                <div className="space-y-4">
                  <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{editingScript.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{editingScript.sector || 'General'}</p>
                      </div>
                      <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">
                        Preview
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                      <p className="text-xs text-foreground leading-relaxed italic">
                        "{(editingScript.pitch_opening || '').replace(/{empresa}/gi, 'Empresa Modelo SL').replace(/{contato}/gi, 'Sr. Carlos')}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScriptModalOpen(false)}
                className="border-input text-xs"
              >
                {tr('Cancelar', 'Cancelar', 'Annuler')}
              </Button>

              <Button
                type="submit"
                disabled={isSavingSalesScript}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 gap-1.5 shadow-md shadow-indigo-600/20"
              >
                {isSavingSalesScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {tr('Salvar Roteiro', 'Guardar Guión', 'Enregistrer le Script')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
