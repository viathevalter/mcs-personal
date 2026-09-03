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
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesScript } from '../types/dialerTypes';

interface SalesScriptCardProps {
  script?: SalesScript | null;
  companyName?: string;
  contactName?: string;
}

export function SalesScriptCard({ script, companyName = 'Empresa', contactName = 'Responsable' }: SalesScriptCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openObjectionIndex, setOpenObjectionIndex] = useState<number | null>(0);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!script) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3">
        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-medium text-foreground">Nenhum script configurado para este lote.</p>
        <p className="text-xs text-muted-foreground">
          Apresente a MCS como fornecedora especializada em soldadores homologados, tubistas e montadores industriais para Espanha e França.
        </p>
      </div>
    );
  }

  // Format pitch with dynamic company name
  const formattedOpening = script.pitch_opening
    .replace(/{empresa}/gi, companyName)
    .replace(/{contato}/gi, contactName);

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
            <p className="text-[11px] text-muted-foreground">Guia de Abordagem & Quebra de Objeções</p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          {script.sector || 'Industrial'}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="opening" className="flex-1 flex flex-col">
        <div className="px-4 pt-3 border-b border-border bg-muted/10">
          <TabsList className="grid grid-cols-4 bg-muted/60 border border-border p-0.5 rounded-xl h-9">
            <TabsTrigger value="opening" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Abertura
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Perguntas
            </TabsTrigger>
            <TabsTrigger value="objections" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Objeções
            </TabsTrigger>
            <TabsTrigger value="closing" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fechamento
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Pitch de Abertura */}
        <TabsContent value="opening" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Roteiro de Ligação (Fala Sugerida)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(formattedOpening, 'opening')}
                className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
              >
                {copiedKey === 'opening' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar
              </Button>
            </div>

            <p className="text-xs text-foreground leading-relaxed font-sans select-text">
              "{formattedOpening}"
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              💡 Dica de SDR:
            </p>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80">
              Seja direto e seguro nos primeiros 10 segundos. O objetivo não é vender na hora, mas sim descobrir se têm obras ou picos para orçar.
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
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Resposta Recomendada:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(obj.response, `obj-${idx}`)}
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey === `obj-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copiar
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
        </TabsContent>

        {/* Tab 4: Fechamento */}
        <TabsContent value="closing" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Gatilho de Fechamento / Próximo Passo
            </span>
            <p className="text-xs text-foreground leading-relaxed">
              "{script.closing_pitch || '¿Les parece si les preparo una cotización rápida sin compromiso para que comparen tarifas?'}"
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
            <p className="font-bold">🎯 Objetivo da Chamada:</p>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-200/80">
              Conquistar o envio de uma proposta técnica ou o agendamento de uma visita/reunião online com o diretor de operações.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
