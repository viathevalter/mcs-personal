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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-300">Nenhum script configurado para este lote.</p>
        <p className="text-xs text-slate-500">
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
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-xl overflow-hidden flex flex-col h-full">
      {/* Script Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">{script.title}</h3>
            <p className="text-[11px] text-slate-400">Guia de Abordagem & Quebra de Objeções</p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {script.sector || 'Industrial'}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="opening" className="flex-1 flex flex-col">
        <div className="px-4 pt-3 border-b border-slate-800 bg-slate-950/40">
          <TabsList className="grid grid-cols-4 bg-slate-900 border border-slate-800 p-0.5 rounded-xl h-9">
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
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Roteiro de Ligação (Fala Sugerida)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(formattedOpening, 'opening')}
                className="h-7 text-xs text-slate-400 hover:text-white gap-1"
              >
                {copiedKey === 'opening' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'opening' ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans select-text">
              "{formattedOpening}"
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-xs text-indigo-200/90 space-y-1">
            <p className="font-semibold text-indigo-300">💡 Dica de SDR:</p>
            <p>Seja direto e seguro nos primeiros 10 segundos. O objetivo não é vender na hora, mas sim descobrir se têm obras ou picos para orçar.</p>
          </div>
        </TabsContent>

        {/* Tab 2: Perguntas de Qualificação */}
        <TabsContent value="questions" className="p-4 flex-1 overflow-y-auto space-y-3 m-0">
          {(script.qualifying_questions || []).map((q, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-indigo-400">#{idx + 1}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {q.goal}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-200 leading-relaxed">
                "{q.question}"
              </p>
            </div>
          ))}
        </TabsContent>

        {/* Tab 3: Quebra de Objeções */}
        <TabsContent value="objections" className="p-4 flex-1 overflow-y-auto space-y-3 m-0">
          {(script.objections_guide || []).map((item, idx) => {
            const isOpen = openObjectionIndex === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl bg-slate-950/70 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenObjectionIndex(isOpen ? null : idx)}
                  className="w-full p-3 text-left flex items-center justify-between gap-2 hover:bg-slate-900/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-amber-300/90 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {item.objection}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="p-3 pt-0 text-xs text-slate-200 border-t border-slate-850 bg-slate-900/40 space-y-2">
                    <p className="leading-relaxed mt-2 text-slate-300">
                      <strong>Argumento:</strong> "{item.response}"
                    </p>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item.response, `obj_${idx}`)}
                        className="h-6 text-[11px] text-slate-400 hover:text-white gap-1"
                      >
                        {copiedKey === `obj_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copiar resposta
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Tab 4: Fechamento */}
        <TabsContent value="closing" className="p-4 flex-1 overflow-y-auto space-y-4 m-0">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Proposta de Próximo Passo
            </span>
            <p className="text-sm text-slate-200 leading-relaxed">
              "{script.closing_pitch || '¿Le parece bien si le enviamos una propuesta / estimación personalizada con los perfiles exactos y coordinamos una breve videollamada esta semana?'}"
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">Gatilhos de Fechamento:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Ofereça um orçamento sem compromisso para a próxima parada técnica.</li>
              <li>Pegue o e-mail direto do responsável pelas contratações ou compras.</li>
              <li>Confirme número de WhatsApp para envio do portfólio institucional.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
