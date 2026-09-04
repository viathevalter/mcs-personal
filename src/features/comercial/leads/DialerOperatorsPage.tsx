import { useState, useRef } from 'react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  HelpCircle, 
  Save, 
  Loader2,
  FileText,
  Building,
  Image as ImageIcon,
  Code,
  Eye,
  Bold,
  Italic,
  Underline,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useSalespeople } from './hooks/useLeads';
import { useSalesScripts, useMutateDialer } from './hooks/useDialer';
import { toast } from 'sonner';
import type { SalesScript, ObjectionItem, QualifyingQuestion } from './types/dialerTypes';

export function DialerOperatorsPage() {
  const { data: salespeople = [], isLoading: loadingSalespeople } = useSalespeople();
  const { data: scripts = [], isLoading: loadingScripts } = useSalesScripts();
  const { saveSalesScript, isSavingSalesScript, deleteSalesScript, isDeletingSalesScript } = useMutateDialer();

  const [activeTab, setActiveTab] = useState<'operators' | 'scripts'>('scripts');

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
  <h4 style="font-weight: bold; margin-bottom: 6px;">Especialidades em Destaque MCS:</h4>
  <ul style="list-style-type: disc; padding-left: 20px; font-size: 12px;">
    <li>Soldadores Homologados 6G TIG / Eletrodo / MIG-MAG (Tubulações e Estruturas)</li>
    <li>Caldeireiros e Montadores de Estruturas Pesadas</li>
    <li>Tubistas Industriais com leitura de Isométricos</li>
    <li>Equipes com alojamento e transporte 100% geridos pela MCS</li>
  </ul>
</div>`,
      qualifying_questions: [
        { question: '¿Tienen obras o paradas técnicas programadas para los próximos meses?', goal: 'Mapear demanda e picos de obra' },
        { question: '¿Suelen contratar refuerzo de soldadores homologados o montadores externos?', goal: 'Validar terceirização' },
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
          response: 'Nuestras tarifas para soldadores homologados en España rondan entre 26€ y 31€/hora todo incluido (desplazamiento, alojamiento y epis). Si me dice qué perfiles precisan, le preparo una propuesta a medida hoy mismo.' 
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
    if (!confirm('Deseja realmente excluir este roteiro de vendas?')) return;
    try {
      await deleteSalesScript(id);
      toast.success('Roteiro excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir roteiro');
    }
  };

  // Questions dynamic handlers
  const handleAddQuestion = () => {
    setEditingScript(prev => ({
      ...prev,
      qualifying_questions: [
        ...(prev.qualifying_questions || []),
        { question: '', goal: 'Qualificar perfil' }
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

  // Objections dynamic handlers
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

  // Insert tag into pitch
  const handleInsertTagInPitch = (tag: string) => {
    setEditingScript(prev => ({
      ...prev,
      pitch_opening: (prev.pitch_opening || '') + ` ${tag} `
    }));
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript.title || !editingScript.pitch_opening) {
      toast.error('Preencha o título e a fala de abertura do script');
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
      toast.success('Roteiro de vendas salvo com sucesso!');
      setIsScriptModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar script');
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
              Operadores & Scripts de Abordagem
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs">
                Configurações
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure roteiros de vendas completos, perguntas de qualificação, quebra de objeções e imagens de apoio.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
          <TabsList className="bg-muted/60 border border-border p-0.5 rounded-xl h-9">
            <TabsTrigger value="scripts" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Roteiros & Scripts ({scripts.length})
            </TabsTrigger>
            <TabsTrigger value="operators" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5">
              <Users className="w-3.5 h-3.5" /> Equipe de Operadores ({salespeople.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab 1: Scripts Management */}
      {activeTab === 'scripts' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Biblioteca de Roteiros Comerciais</h3>
              <p className="text-xs text-muted-foreground">
                Roteiros completos exibidos no Cockpit do Discador com perguntas BANT, objeções prontas e material de apoio visual.
              </p>
            </div>

            <Button
              onClick={handleOpenNewScript}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Novo Roteiro
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
                      <p className="text-[11px] text-muted-foreground font-mono">Setor: {sc.sector || 'Industrial'}</p>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {sc.sector || 'Geral'}
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
                        <ImageIcon className="w-3 h-3 text-indigo-400" /> Material Visual Anexo
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
                      Perguntas: <strong>{(sc.qualifying_questions || []).length}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      Objeções: <strong>{(sc.objections_guide || []).length}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScript(sc.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-rose-500 gap-1 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenEditScript(sc)}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar Configurações
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
              <h3 className="text-sm font-bold text-foreground">Operadores Comerciais Ativos</h3>
              <p className="text-xs text-muted-foreground">
                Usuários com permissão para receber filas de prospecção outbound e registrar atendimentos no Power Dialer.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <h4 className="text-sm font-bold text-foreground">{sp.display_name}</h4>
                      <p className="text-xs text-muted-foreground">{sp.email}</p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                    Ativo
                  </Badge>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Perfil: <strong>{sp.role || 'Vendedor Comercial'}</strong></span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">Telemarketing Ativo</span>
                </div>
              </div>
            ))}
          </div>
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
                    {editingScript.id ? 'Configurar Roteiro de Vendas' : 'Novo Roteiro de Vendas (Power Dialer)'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Configure a fala de abertura, perguntas de qualificação, quebra de objeções e materiais visuais de apoio.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Sub-Tabs inside Modal */}
            <div className="pt-4">
              <Tabs value={modalSubTab} onValueChange={(v: any) => setModalSubTab(v)}>
                <TabsList className="grid grid-cols-5 bg-muted/70 border border-border p-0.5 rounded-xl h-9">
                  <TabsTrigger value="general" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <FileText className="w-3.5 h-3.5" /> Abertura & Dados
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Perguntas ({(editingScript.qualifying_questions || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="objections" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Objeções ({(editingScript.objections_guide || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Imagem & HTML
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
                    <Eye className="w-3.5 h-3.5" /> Pré-Visualização
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveScript}>
            <div className="p-6">
              {/* Sub-Tab 1: Dados Gerais & Abertura */}
              {modalSubTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Título do Roteiro</Label>
                      <Input
                        value={editingScript.title || ''}
                        onChange={e => setEditingScript(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Script Calderería & Estructuras (Espanha)"
                        required
                        className="bg-background border-input text-foreground text-xs h-9 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Setor / Mercado Alvo</Label>
                      <Input
                        value={editingScript.sector || ''}
                        onChange={e => setEditingScript(prev => ({ ...prev, sector: e.target.value }))}
                        placeholder="Ex: metalurgico_es / naval / petroquimico"
                        className="bg-background border-input text-foreground text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Dynamic Tags Toolbar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Fala de Abertura (Pitch Inicial de 10 Segundos)
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Inserir tags:</span>
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
                      placeholder="Buenos días. Le llamo de MCS Servicios Industriales respecto a disponibilidade de soldadores para {empresa}..."
                      rows={5}
                      required
                      className="bg-background border-input text-foreground text-xs leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dica: Use <strong>{'{empresa}'}</strong> para que o sistema substitua automaticamente pelo nome da empresa do lead durante a chamada.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Gatilho de Fechamento / Próximo Passo
                    </Label>
                    <Textarea
                      value={editingScript.closing_pitch || ''}
                      onChange={e => setEditingScript(prev => ({ ...prev, closing_pitch: e.target.value }))}
                      placeholder="¿Podemos enviarles una propuesta técnica preliminar para que comparen tarifas con sus proveedores?"
                      rows={3}
                      className="bg-background border-input text-foreground text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Perguntas de Qualificação */}
              {modalSubTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Perguntas de Diagnóstico (BANT)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Guia para o operador descobrir picos de obra, paradas técnicas e volume de soldadores necessários.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddQuestion}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
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
                            Pergunta #{idx + 1}
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
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Pergunta a ser feita pelo operador:</Label>
                            <Input
                              value={q.question}
                              onChange={e => handleUpdateQuestion(idx, 'question', e.target.value)}
                              placeholder="Ex: ¿Tienen obras o paradas técnicas programadas este trimestre?"
                              className="bg-background border-input text-xs h-8"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Objetivo / Meta da Pergunta:</Label>
                            <Input
                              value={q.goal}
                              onChange={e => handleUpdateQuestion(idx, 'goal', e.target.value)}
                              placeholder="Ex: Mapear demanda de solda"
                              className="bg-background border-input text-xs h-8 font-semibold text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(editingScript.qualifying_questions || []).length === 0 && (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border space-y-2">
                        <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-xs text-muted-foreground">Nenhuma pergunta cadastrada. Clique no botão acima para adicionar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Guia de Objeções & Respostas */}
              {modalSubTab === 'objections' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Quebra de Objeções (Objection Buster)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Respostas prontas que o operador pode ler ou copiar com 1 clique para contornar recusas.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddObjection}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Objeção
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
                            <ShieldAlert className="w-3.5 h-3.5" /> Objeção #{idx + 1}
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
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold">O que o cliente diz (Objeção):</Label>
                          <Input
                            value={obj.objection}
                            onChange={e => handleUpdateObjection(idx, 'objection', e.target.value)}
                            placeholder="Ex: Ya tenemos proveedores habituales de personal"
                            className="bg-background border-input text-xs h-8 font-semibold text-foreground"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Resposta recomendada do SDR:</Label>
                          <Textarea
                            value={obj.response}
                            onChange={e => handleUpdateObjection(idx, 'response', e.target.value)}
                            placeholder="Ex: Entendido. Actuamos como refuerzo cuando sus proveedores no tienen disponibilidad..."
                            rows={2}
                            className="bg-background border-input text-xs leading-relaxed"
                          />
                        </div>
                      </div>
                    ))}

                    {(editingScript.objections_guide || []).length === 0 && (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border space-y-2">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-xs text-muted-foreground">Nenhuma objeção cadastrada. Clique no botão acima para adicionar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Imagem & HTML Complementar */}
              {modalSubTab === 'visual' && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Material Visual de Apoio (Imagem & Tabela de Tarifas)</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Anexe uma imagem (infográfico de soldadores, tabela de preços, certificados ISO) que aparecerá no card do cockpit do discador para apoio do vendedor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {/* Image URL Input & File Upload */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">URL da Imagem / Banner do Script</Label>
                        <Input
                          value={editingScript.image_url || ''}
                          onChange={e => setEditingScript(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://exemplo.com/tabela-tarifas-soldadores.jpg"
                          className="bg-background border-input text-foreground text-xs h-9"
                        />
                      </div>

                      {/* File Upload to Data URL */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Ou faça upload de arquivo local (JPG/PNG):</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditingScript(prev => ({ ...prev, image_url: reader.result as string }));
                                toast.success('Imagem carregada!');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="bg-background border-input text-xs"
                        />
                      </div>

                      {/* HTML Complementary Code */}
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-indigo-500" />
                          Conteúdo Complementar em HTML (Opcional)
                        </Label>
                        <Textarea
                          value={editingScript.rich_content_html || ''}
                          onChange={e => setEditingScript(prev => ({ ...prev, rich_content_html: e.target.value }))}
                          placeholder="<div>Tabela de tarifas ou lista de especificações técnicas...</div>"
                          rows={4}
                          className="bg-background border-input font-mono text-[11px] leading-normal"
                        />
                      </div>
                    </div>

                    {/* Live Image Preview */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Pré-Visualização da Imagem:</Label>
                      {editingScript.image_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 shadow-inner group">
                          <img 
                            src={editingScript.image_url} 
                            alt="Prévia" 
                            className="w-full max-h-56 object-contain mx-auto"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setEditingScript(prev => ({ ...prev, image_url: '' }))}
                            className="absolute top-2 right-2 h-7 text-[10px] gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </Button>
                        </div>
                      ) : (
                        <div className="h-44 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-2 p-4 text-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                          <span>Nenhuma imagem informada ainda. Cole a URL ou envie um arquivo acima.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 5: Live Preview */}
              {modalSubTab === 'preview' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>Esta é a visão exata que o operador/SDR terá durante a ligação com o cliente no Cockpit do Discador.</span>
                  </div>

                  <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{editingScript.title || 'Título do Roteiro'}</h4>
                        <p className="text-[11px] text-muted-foreground">Setor: {editingScript.sector || 'Geral'}</p>
                      </div>
                      <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">
                        Preview
                      </Badge>
                    </div>

                    {editingScript.image_url && (
                      <div className="rounded-xl overflow-hidden border border-border">
                        <img src={editingScript.image_url} alt="Material" className="w-full max-h-48 object-cover" />
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Fala Sugerida:</span>
                      <p className="text-xs text-foreground leading-relaxed italic">
                        "{(editingScript.pitch_opening || '').replace(/{empresa}/gi, 'Empresa Modelo SL').replace(/{contato}/gi, 'Sr. Carlos')}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Perguntas de Qualificação:</span>
                      {(editingScript.qualifying_questions || []).map((q, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs flex justify-between gap-2">
                          <span>{i + 1}. {q.question}</span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{q.goal}</span>
                        </div>
                      ))}
                    </div>

                    {editingScript.closing_pitch && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Fechamento:</span>
                        "{editingScript.closing_pitch}"
                      </div>
                    )}
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
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSavingSalesScript}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 gap-1.5 shadow-md shadow-indigo-600/20"
              >
                {isSavingSalesScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Roteiro de Vendas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
