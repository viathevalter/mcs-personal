import React, { useRef } from 'react';
import { Bold, Italic, AlertTriangle, Lightbulb, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextObservationInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichTextObservationInput({
    value,
    onChange,
    placeholder = 'Digite aqui as observações, justificativas ou ocorrências...',
    minHeight = 'min-h-[120px]'
}: RichTextObservationInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormatting = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        let replacement = '';
        if (selectedText.length > 0) {
            replacement = `${prefix}${selectedText}${suffix}`;
        } else {
            replacement = `${prefix}${suffix}`;
        }

        const newValue = value.substring(0, start) + replacement + value.substring(end);
        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            const cursorPosition = start + prefix.length + (selectedText.length || 0);
            textarea.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
    };

    return (
        <div className="border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all bg-background">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-1.5 bg-muted/40 border-b border-input text-xs">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-muted font-bold"
                    onClick={() => insertFormatting('<b>', '</b>')}
                    title="Negrito <b>...</b>"
                >
                    <Bold className="h-3.5 w-3.5 mr-1" /> Negrito
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-muted italic"
                    onClick={() => insertFormatting('<i>', '</i>')}
                    title="Itálico <i>...</i>"
                >
                    <Italic className="h-3.5 w-3.5 mr-1" /> Itálico
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                    onClick={() => insertFormatting('<alert>', '</alert>')}
                    title="Inserir alerta de Ocorrência Crítica"
                >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> ⚠️ Ocorrência Crítica
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold"
                    onClick={() => insertFormatting('<highlight>', '</highlight>')}
                    title="Inserir Destaque de Atenção"
                >
                    <Lightbulb className="h-3.5 w-3.5 mr-1" /> 💡 Destaque
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-muted"
                    onClick={() => insertFormatting('• ')}
                    title="Marcador de Lista"
                >
                    <List className="h-3.5 w-3.5 mr-1" /> Lista
                </Button>
            </div>

            {/* Input Area */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full p-3 text-sm bg-transparent outline-none resize-y ${minHeight}`}
            />
        </div>
    );
}

/**
 * Função utilitária para renderizar o texto formatado com tags <alert>, <highlight>, <b>, <i> com segurança
 */
export function RenderFormattedObservation({ content }: { content: string | null | undefined }) {
    if (!content) return <span className="text-muted-foreground/60 italic text-xs">Sem observações registradas.</span>;

    // Se o texto tiver tags customizadas como <alert> ou <highlight>, formatar com JSX seguro
    const parts = content.split(/(<alert>.*?<\/alert>|<highlight>.*?<\/highlight>|<b>.*?<\/b>|<i>.*?<\/i>|\n)/g);

    return (
        <span className="whitespace-pre-wrap leading-relaxed text-sm">
            {parts.map((part, index) => {
                if (!part) return null;

                if (part.startsWith('<alert>') && part.endsWith('</alert>')) {
                    const text = part.slice(7, -8);
                    return (
                        <span key={index} className="inline-flex items-start gap-1 my-0.5 px-2 py-1 rounded bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300 font-semibold text-xs shadow-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                            <span>{text}</span>
                        </span>
                    );
                }

                if (part.startsWith('<highlight>') && part.endsWith('</highlight>')) {
                    const text = part.slice(11, -12);
                    return (
                        <span key={index} className="inline-flex items-start gap-1 my-0.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 font-medium text-xs">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <span>{text}</span>
                        </span>
                    );
                }

                if (part.startsWith('<b>') && part.endsWith('</b>')) {
                    const text = part.slice(3, -4);
                    return <strong key={index} className="font-bold text-foreground">{text}</strong>;
                }

                if (part.startsWith('<i>') && part.endsWith('</i>')) {
                    const text = part.slice(3, -4);
                    return <em key={index} className="italic text-foreground">{text}</em>;
                }

                if (part === '\n') {
                    return <br key={index} />;
                }

                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}
