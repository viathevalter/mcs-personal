import React, { useState, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link, Heading, Eye, Edit3, Trash2 } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    label?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite aqui a descrição detalhada ou instruções...',
    minHeight = '180px',
    label
}) => {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormat = (prefix: string, suffix: string = '') => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        
        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
        }, 50);
    };

    const insertLinePrefix = (prefix: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = value.substring(0, start);
        const after = value.substring(end);
        const selected = value.substring(start, end) || 'Item da lista';
        
        const formatted = selected.split('\n').map(line => `${prefix}${line}`).join('\n');
        onChange(`${before}\n${formatted}\n${after}`);
    };

    return (
        <div className="space-y-1.5 font-inter">
            {label && (
                <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        {label}
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setMode('write')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                                mode === 'write'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <Edit3 size={12} /> Escrever
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('preview')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                                mode === 'preview'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <Eye size={12} /> Pré-visualizar
                        </button>
                    </div>
                </div>
            )}

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                {/* Toolbar */}
                {mode === 'write' && (
                    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <button
                            type="button"
                            title="Negrito (**texto**)"
                            onClick={() => insertFormat('**', '**')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Bold size={14} />
                        </button>
                        <button
                            type="button"
                            title="Itálico (*texto*)"
                            onClick={() => insertFormat('*', '*')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Italic size={14} />
                        </button>
                        <button
                            type="button"
                            title="Sublinhado (<u>texto</u>)"
                            onClick={() => insertFormat('<u>', '</u>')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Underline size={14} />
                        </button>
                        
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                        <button
                            type="button"
                            title="Título (### Título)"
                            onClick={() => insertFormat('### ')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Heading size={14} />
                        </button>
                        <button
                            type="button"
                            title="Lista com Marcadores (- Item)"
                            onClick={() => insertLinePrefix('• ')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <List size={14} />
                        </button>
                        <button
                            type="button"
                            title="Lista Numerada (1. Item)"
                            onClick={() => insertLinePrefix('1. ')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <ListOrdered size={14} />
                        </button>

                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                        <button
                            type="button"
                            title="Inserir Link ([texto](url))"
                            onClick={() => insertFormat('[', '](https://)')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Link size={14} />
                        </button>

                        {value && (
                            <button
                                type="button"
                                title="Limpar tudo"
                                onClick={() => onChange('')}
                                className="p-1.5 hover:bg-rose-100 text-rose-500 rounded transition-colors ml-auto"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Editor Content */}
                {mode === 'write' ? (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        style={{ minHeight }}
                        className="w-full p-3.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-y font-inter leading-relaxed"
                    />
                ) : (
                    <div
                        style={{ minHeight }}
                        className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert max-w-none font-inter leading-relaxed overflow-y-auto"
                    >
                        {value ? (
                            <RichTextRenderer content={value} />
                        ) : (
                            <span className="text-slate-400 italic">Nenhum conteúdo para visualizar.</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const RichTextRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
    if (!content) return null;

    const renderFormatted = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            if (line.startsWith('### ')) {
                return <h4 key={idx} className="font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100">{line.replace('### ', '')}</h4>;
            }
            if (line.startsWith('## ')) {
                return <h3 key={idx} className="font-bold text-lg mt-3 mb-1 text-slate-900 dark:text-slate-100">{line.replace('## ', '')}</h3>;
            }
            if (line.startsWith('# ')) {
                return <h2 key={idx} className="font-bold text-xl mt-4 mb-2 text-slate-900 dark:text-slate-100">{line.replace('# ', '')}</h2>;
            }

            if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
                const bulletText = line.replace(/^[•\-\*]\s*/, '');
                return (
                    <div key={idx} className="flex items-start gap-2 ml-2 my-0.5">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{formatInlineText(bulletText)}</span>
                    </div>
                );
            }

            if (!line.trim()) {
                return <div key={idx} className="h-2" />;
            }

            return (
                <p key={idx} className="my-1">
                    {formatInlineText(line)}
                </p>
            );
        });
    };

    const formatInlineText = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="italic">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('<u>') && part.endsWith('</u>')) {
                return <u key={i}>{part.slice(3, -4)}</u>;
            }
            if (part.startsWith('[') && part.includes('](')) {
                const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                if (match) {
                    return (
                        <a
                            key={i}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800 transition-colors"
                        >
                            {match[1]}
                        </a>
                    );
                }
            }
            return part;
        });
    };

    return <div className={`space-y-0.5 ${className}`}>{renderFormatted(content)}</div>;
};
