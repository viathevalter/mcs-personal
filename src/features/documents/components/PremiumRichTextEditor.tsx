import React, { useRef, useEffect } from 'react';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Palette, Sparkles, RotateCcw
} from 'lucide-react';

interface PremiumRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const COLOR_PRESETS = [
    { label: 'Escuro Padrao', value: '#0f172a' },
    { label: 'Azul Premium', value: '#2563eb' },
    { label: 'Verde Esmeralda', value: '#059669' },
    { label: 'Vermelho Destaque', value: '#dc2626' },
    { label: 'Roxo Elegante', value: '#7c3aed' },
    { label: 'Cinza Neutro', value: '#64748b' }
];

const PRESET_CLAUSES = [
    { title: '🔒 Confidencialidade', text: 'As partes comprometem-se a manter sigilo absoluto sobre todas as informações operacionais e comerciais compartilhadas durante a vigência do contrato.' },
    { title: '💰 Condições de Pagamento', text: 'O pagamento será efetuado em até 30 (trinta) dias após a emissão da correspondente fatura e validação da medição dos serviços.' },
    { title: '⚖️ Foro Competente', text: 'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da Comarca de Madrid, com renúncia expressa a qualquer outro.' },
    { title: '⏱️ Prazo de Execução', text: 'Os serviços deverão ser executados estritamente dentro do cronograma acordado, respeitando as normas vigentes de segurança e conformidade.' }
];

export const PremiumRichTextEditor: React.FC<PremiumRichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite o texto livre, cláusulas especiais ou observações contratuais...'
}) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const execCmd = (command: string, val: string | undefined = undefined) => {
        document.execCommand(command, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertPresetClause = (clauseText: string) => {
        if (!editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;
        const newHtml = currentHtml && currentHtml !== '<br>'
            ? `${currentHtml}<p><strong>Nota / Cláusula Especial:</strong> ${clauseText}</p>`
            : `<p><strong>Nota / Cláusula Especial:</strong> ${clauseText}</p>`;
        
        editorRef.current.innerHTML = newHtml;
        onChange(newHtml);
    };

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            {/* Toolbar */}
            <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1">
                {/* Format buttons */}
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                    <button
                        type="button"
                        onClick={() => execCmd('bold')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Negrito (Ctrl+B)"
                    >
                        <Bold size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('italic')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Itálico (Ctrl+I)"
                    >
                        <Italic size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('underline')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Sublinhado (Ctrl+U)"
                    >
                        <Underline size={15} />
                    </button>
                </div>

                {/* Alignment buttons */}
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                    <button
                        type="button"
                        onClick={() => execCmd('justifyLeft')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Alinhar à Esquerda"
                    >
                        <AlignLeft size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyCenter')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Centralizar"
                    >
                        <AlignCenter size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyRight')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Alinhar à Direita"
                    >
                        <AlignRight size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyFull')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Justificar"
                    >
                        <AlignJustify size={15} />
                    </button>
                </div>

                {/* List buttons */}
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                    <button
                        type="button"
                        onClick={() => execCmd('insertUnorderedList')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Lista com Marcadores"
                    >
                        <List size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('insertOrderedList')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Lista Numerada"
                    >
                        <ListOrdered size={15} />
                    </button>
                </div>

                {/* Color Palettes */}
                <div className="flex items-center gap-1 pr-1.5">
                    <Palette size={14} className="text-slate-400 ml-1" />
                    {COLOR_PRESETS.map(c => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => execCmd('foreColor', c.value)}
                            style={{ backgroundColor: c.value }}
                            className="w-4 h-4 rounded-full border border-white/40 shadow-xs hover:scale-110 transition-transform"
                            title={c.label}
                        />
                    ))}
                </div>

                {/* Clear Formatting */}
                <button
                    type="button"
                    onClick={() => execCmd('removeFormat')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-auto rounded-lg"
                    title="Limpar Formatação"
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* Editable Content Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-3.5 min-h-[110px] max-h-[220px] overflow-y-auto text-xs text-slate-900 dark:text-slate-100 focus:outline-none leading-relaxed"
                data-placeholder={placeholder}
            />

            {/* Quick Cláusulas Prontas Footer */}
            <div className="px-3 py-2 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px]">
                <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 flex-shrink-0">
                    <Sparkles size={12} /> Modelos Prontos:
                </span>
                {PRESET_CLAUSES.map(preset => (
                    <button
                        key={preset.title}
                        type="button"
                        onClick={() => insertPresetClause(preset.text)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md font-semibold transition-all flex-shrink-0"
                    >
                        {preset.title}
                    </button>
                ))}
            </div>
        </div>
    );
};
