import { useState } from 'react';
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
  Building
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
  const { saveSalesScript, isSavingSalesScript } = useMutateDialer();

  const [activeTab, setActiveTab] = useState<'operators' | 'scripts'>('operators');

  // Script Edit Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Partial<SalesScript>>({
    title: '',
    sector: 'metalurgico_es',
    pitch_opening: '',
    closing_pitch: '',
    qualifying_questions: [],
    objections_guide: [],
  });

  const handleOpenNewScript = () => {
    setEditingScript({
      title: '',
      sector: 'industrial',
      pitch_opening: 'Buenos días. Le llamo de MCS Servicios Industriales respecto a disponibilidad de soldadores homologados y montadores...',
      closing_pitch: '¿Podemos enviarles una propuesta para su próxima obra?',
      qualifying_questions: [
        { question: '¿Tienen paradas técnicas programadas este trimestre?', goal: 'Mapear demanda' }
      ],
      objections_guide: [
        { objection: 'Ya tenemos proveedores', response: 'Entendido, actuamos como refuerzo cuando sus proveedores no tienen disponibilidad.' }
      ],
    });
    setIsScriptModalOpen(true);
  };

  const handleOpenEditScript = (script: SalesScript) => {
    setEditingScript(script);
    setIsScriptModalOpen(true);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Operadores & Scripts de Abordagem
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                Configurações
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Cadastre e gerencie a equipe de prospecção e os roteiros comerciais de quebra de objeções.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
          <TabsList className="bg-card border p-0.5 rounded-xl h-9">
            <TabsTrigger value="operators" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5">
              <Users className="w-3.5 h-3.5" /> Equipe de Operadores
            </TabsTrigger>
            <TabsTrigger value="scripts" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Roteiros & Scripts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab 1: Operators Management */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border flex items-center justify-between">
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
                className="p-5 rounded-2xl bg-card border shadow-sm hover:border-purple-500/50 transition-all space-y-4"
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

                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                    Ativo
                  </Badge>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Perfil: <strong>{sp.role || 'Vendedor Comercial'}</strong></span>
                  <span className="text-purple-400 font-semibold">Telemarketing Ativo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Scripts Management */}
      {activeTab === 'scripts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Roteiros de Abordagem & Objeções</h3>
              <p className="text-xs text-muted-foreground">
                Scripts exibidos na tela do operador durante a chamada para orientar a qualificação técnica e quebra de objeções.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleOpenNewScript}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Script
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scripts.map(sc => (
              <div 
                key={sc.id}
                className="p-5 rounded-2xl bg-card border shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-foreground">{sc.title}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {sc.sector || 'Geral'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 italic">
                    "{sc.pitch_opening}"
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground pt-2 border-t">
                    <span>Perguntas de Qualificação: <strong>{(sc.qualifying_questions || []).length}</strong></span>
                    <span>Guia de Objeções: <strong>{(sc.objections_guide || []).length}</strong></span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditScript(sc)}
                      className="h-8 text-xs gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar Script
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Edit / Create Script */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-slate-800 text-slate-100 p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-slate-800">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              {editingScript.id ? 'Editar Roteiro de Vendas' : 'Novo Roteiro de Vendas'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Personalize o texto de abertura e os argumentos que o operador lerá durante a ligação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveScript} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Título do Script</Label>
                <Input
                  value={editingScript.title || ''}
                  onChange={e => setEditingScript(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Script Calderería Espanha"
                  required
                  className="bg-slate-900 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Setor / Mercado Alvo</Label>
                <Input
                  value={editingScript.sector || ''}
                  onChange={e => setEditingScript(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="Ex: metalurgico_es / naval / quimico"
                  className="bg-slate-900 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold text-indigo-400">
                Fala de Abertura (Pitch Inicial)
              </Label>
              <Textarea
                value={editingScript.pitch_opening || ''}
                onChange={e => setEditingScript(prev => ({ ...prev, pitch_opening: e.target.value }))}
                placeholder="Texto que o operador deve falar nos primeiros 10 segundos da chamada..."
                rows={4}
                required
                className="bg-slate-900 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold text-emerald-400">
                Proposta de Fechamento / Próximo Passo
              </Label>
              <Textarea
                value={editingScript.closing_pitch || ''}
                onChange={e => setEditingScript(prev => ({ ...prev, closing_pitch: e.target.value }))}
                placeholder="Ex: Podemos preparar uma estimativa sem compromisso para a sua próxima obra?"
                rows={2}
                className="bg-slate-900 border-slate-800 text-white text-xs"
              />
            </div>

            <DialogFooter className="p-0 pt-4 border-t border-slate-800 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScriptModalOpen(false)}
                className="bg-slate-900 border-slate-700 text-slate-300 text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSavingSalesScript}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-1.5"
              >
                {isSavingSalesScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Roteiro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
