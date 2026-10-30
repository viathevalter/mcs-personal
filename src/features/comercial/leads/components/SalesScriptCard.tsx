import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Maximize2,
  Code
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SalesScript } from '../types/dialerTypes';
import { useComercialLanguage } from '../utils/comercialI18n';

interface SalesScriptCardProps {
  script?: SalesScript | null;
  companyName?: string;
  contactName?: string;
}

export function SalesScriptCard({ script, companyName = 'Empresa', contactName = 'Responsable' }: SalesScriptCardProps) {
  const { tr } = useComercialLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openObjectionIndex, setOpenObjectionIndex] = useState<number | null>(0);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(
      tr(
        'Copiado para a área de transferência!',
        '¡Copiado al portapapeles!',
        'Copié dans le presse-papiers !'
      )
    );
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!script) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3">
        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-medium text-foreground">
          {tr(
            'Nenhum script configurado para este lote.',
            'Ningún guion configurado para este lote.',
            'Aucun script configuré pour ce lot.'
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {tr(
            'Apresente a MCS como fornecedora especializada em soldadores homologados, tubistas e montadores industriais para Espanha e França.',
            'Presente a MCS como proveedor especializado en soldadores homologados, tuberos y montadores industriales para España y Francia.',
            'Présentez MCS comme fournisseur spécialisé de soudeurs qualifiés, tuyauteurs et monteurs industriels pour l’Espagne et la France.'
          )}
        </p>
      </div>
    );
  }

  // Format pitch with dynamic company name
  const formattedOpening = script.pitch_opening
    .replace(/{empresa}/gi, companyName)
    .replace(/{contato}/gi, contactName);

  const questionsCount = (script.qualifying_questions || []).length;
  const objectionsCount = (script.objections_guide || []).length;
  const hasVisualMaterial = !!script.image_url || !!script.rich_content_html;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col h-full">
      {/* Script Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">{script.title}</h3>
            <p className="text-[11px] text-muted-foreground">
              {tr(
                'Guia de Abordagem & Quebra de Objeções',
                'Guía de Abordaje y Manejo de Objeciones',
                'Guide d’Approche & Traitement des Objections'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {script.image_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImageZoomOpen(true)}
              className="h-7 px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 gap-1"
              title={tr('Expandir Imagem de Apoio', 'Ampliar Imagen de Apoyo', 'Agrandir l’Image de Support')}
            >
              <ImageIcon className="w-3 h-3" /> {tr('Ver Imagem', 'Ver Imagen', 'Voir Image')}
            </Button>
          )}

          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {script.sector || tr('Industrial', 'Industrial', 'Industriel')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="opening" className="flex-1 flex flex-col">
        <div className="px-4 pt-3 border-b border-border bg-muted/10">
          <TabsList className={`grid ${hasVisualMaterial ? 'grid-cols-5' : 'grid-cols-4'} bg-muted/60 border border-border p-0.5 rounded-xl h-9`}>
            <TabsTrigger value="opening" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1 truncate">
              <BookOpen className="w-3.5 h-3.5 shrink-0" /> {tr('Abertura', 'Apertura', 'Ouverture')}
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1 truncate">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" /> {tr('Perguntas', 'Preguntas', 'Questions')} ({questionsCount})
            </TabsTrigger>
            <TabsTrigger value="objections" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1 truncate">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {tr('Objeções', 'Objeciones', 'Objections')} ({objectionsCount})
            </TabsTrigger>
            <TabsTrigger value="closing" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {tr('Fechamento', 'Cierre', 'Conclusion')}
            </TabsTrigger>
            {hasVisualMaterial && (
              <TabsTrigger value="visual" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1 truncate">
                <ImageIcon className="w-3.5 h-3.5 shrink-0 text-amber-400" /> {tr('Material Visual', 'Material Visual', 'Support Visuel')}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Tab 1: Pitch de Abertura */}
        <TabsContent value="opening" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {tr('Roteiro de Ligação (Fala Sugerida)', 'Guion de Llamada (Discurso Sugerido)', 'Script d’Appel (Discours Suggéré)')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(formattedOpening, 'opening')}
                className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
              >
                {copiedKey === 'opening' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {tr('Copiar', 'Copiar', 'Copier')}
              </Button>
            </div>

            <p className="text-xs text-foreground leading-relaxed font-sans select-text">
              "{formattedOpening}"
            </p>
          </div>

          {/* Quick Image preview thumbnail if available */}
          {script.image_url && (
            <div 
              onClick={() => setIsImageZoomOpen(true)}
              className="p-2 rounded-xl bg-muted/30 border border-border hover:border-indigo-500/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-9 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                  <img src={script.image_url} alt="Material" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {tr('Material Visual Anexo', 'Material Visual Adjunto', 'Support Visuel Joint')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tr('Clique para expandir tabela / certificados', 'Haga clic para ampliar tabla / certificados', 'Cliquez pour agrandir le tableau / certificats')}
                  </p>
                </div>
              </div>
              <Maximize2 className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 mr-2" />
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              💡 {tr('Dica de SDR:', 'Consejo SDR:', 'Conseil SDR :')}
            </p>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80">
              {tr(
                'Seja direto e seguro nos primeiros 10 segundos. O objetivo não é vender na hora, mas sim descobrir se têm obras ou picos para orçar.',
                'Sea directo y seguro en los primeros 10 segundos. El objetivo no es vender al instante, sino descubrir si tienen obras o picos de trabajo para presupuestar.',
                'Soyez direct et assuré dès les 10 premières secondes. L’objectif est d’identifier leurs chantiers ou pics d’activité à chiffrer.'
              )}
            </p>
          </div>
        </TabsContent>

        {/* Tab 2: Perguntas de Qualificação */}
        <TabsContent value="questions" className="p-4 flex-1 overflow-y-auto space-y-3 m-0">
          {(script.qualifying_questions || []).map((q, idx) => (
            <div 
              key={idx} 
              className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-foreground">
                  {idx + 1}. {q.question}
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded shrink-0">
                  {q.goal}
                </span>
              </div>
            </div>
          ))}

          {questionsCount === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {tr(
                'Nenhuma pergunta de qualificação cadastrada neste script.',
                'Ninguna pregunta de cualificación registrada en este guion.',
                'Aucune question de qualification enregistrée dans ce script.'
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Quebra de Objeções (Accordion) */}
        <TabsContent value="objections" className="p-4 flex-1 overflow-y-auto space-y-2.5 m-0">
          {(script.objections_guide || []).map((obj, idx) => {
            const isOpen = openObjectionIndex === idx;
            return (
              <div 
                key={idx} 
                className="rounded-xl bg-muted/40 border border-border overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenObjectionIndex(isOpen ? null : idx)}
                  className="w-full p-3 text-left flex items-center justify-between gap-2 text-xs font-bold text-foreground hover:bg-muted/60 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    "{obj.objection}"
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="p-3 pt-0 border-t border-border/50 bg-background/50 space-y-2">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                        {tr('Resposta Recomendada:', 'Respuesta Recomendada:', 'Réponse Recommandée :')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(obj.response, `obj-${idx}`)}
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === `obj-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {tr('Copiar', 'Copiar', 'Copier')}
                      </Button>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed italic">
                      "{obj.response}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {objectionsCount === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {tr(
                'Nenhuma quebra de objeção cadastrada neste script.',
                'Ningún manejo de objeción registrado en este guion.',
                'Aucun traitement d’objection enregistré dans ce script.'
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Fechamento */}
        <TabsContent value="closing" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {tr('Gatilho de Fechamento / Próximo Passo', 'Cierre / Próximo Paso', 'Déclencheur de Conclusion / Prochaine Étape')}
            </span>
            <p className="text-xs text-foreground leading-relaxed">
              "{script.closing_pitch || tr(
                '¿Les parece si les preparo una cotización rápida sin compromiso para que comparen tarifas?',
                '¿Les parece si les preparo una cotización rápida sin compromiso para que comparen tarifas?',
                'Souhaitez-vous que je vous prépare un devis rapide sans engagement pour comparer nos tarifs ?'
              )}"
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
            <p className="font-bold">🎯 {tr('Objetivo da Chamada:', 'Objetivo de la Llamada:', 'Objectif de l’Appel :')}</p>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-200/80">
              {tr(
                'Conquistar o envio de uma proposta técnica preliminar ou agendar uma conversa com o diretor de compras/operações.',
                'Lograr el envío de una propuesta técnica preliminar o agendar una conversación con el director de compras/operaciones.',
                'Obtenir l’envoi d’une proposition technique préliminaire ou planifier un échange avec le responsable achats/opérations.'
              )}
            </p>
          </div>
        </TabsContent>

        {/* Tab 5: Material Visual & HTML Complementar */}
        {hasVisualMaterial && (
          <TabsContent value="visual" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
            {script.image_url && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    {tr('Material / Imagem de Apoio Técnico', 'Material / Imagen de Apoyo Técnico', 'Support / Image Technique')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImageZoomOpen(true)}
                    className="h-6 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-muted gap-1"
                  >
                    <Maximize2 className="w-3 h-3" /> {tr('Expandir', 'Ampliar', 'Agrandir')}
                  </Button>
                </div>

                <div 
                  onClick={() => setIsImageZoomOpen(true)}
                  className="rounded-xl overflow-hidden border border-border bg-muted/30 cursor-pointer shadow-sm group relative"
                >
                  <img 
                    src={script.image_url} 
                    alt="Material" 
                    className="w-full max-h-56 object-contain mx-auto group-hover:scale-[1.02] transition-transform" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                    <Maximize2 className="w-4 h-4" /> {tr('Clique para ver em tamanho ampliado', 'Haga clic para ver en tamaño ampliado', 'Cliquez pour agrandir')}
                  </div>
                </div>
              </div>
            )}

            {script.rich_content_html && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-indigo-500" />
                  {tr('Especificações / Conteúdo Técnico', 'Especificaciones / Contenido Técnico', 'Spécifications / Contenu Technique')}
                </span>
                <div 
                  className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: script.rich_content_html }}
                />
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modal: Fullscreen Image Zoom */}
      {script.image_url && (
        <Dialog open={isImageZoomOpen} onOpenChange={setIsImageZoomOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden bg-card border-border text-foreground p-4 shadow-2xl flex flex-col">
            <DialogHeader className="pb-2 border-b border-border flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  {script.title} — {tr('Material de Apoio Técnico', 'Material de Apoyo Técnico', 'Support Technique')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {tr(
                    'Visualize tabelas de tarifas, normas técnicas ou certificados em alta resolução.',
                    'Visualice tablas de tarifas, normas técnicas o certificados en alta resolución.',
                    'Visualisez les grilles tarifaires, normes techniques ou certificats en haute résolution.'
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-muted/20 rounded-xl my-2">
              <img 
                src={script.image_url} 
                alt="Zoom" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
