import React, { useRef, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Palette, Highlighter, RemoveFormatting, AlignLeft,
  AlignCenter, CheckSquare
} from 'lucide-react';

interface VisualWysiwygEditorProps {
  value: string;
  onChange: (htmlValue: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const VisualWysiwygEditor: React.FC<VisualWysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escreva a pauta da reunião...',
  minHeight = '220px',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Estados de cores
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);

  // Sincronizar o conteúdo externo com o contentEditable quando mudar de fora
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        // Se o valor estiver em markdown ou texto simples com listas, converter para HTML limpo
        let htmlVal = value || '';
        let converted = false;

        if (htmlVal.includes('###') || htmlVal.includes('**') || /^\d+[\.\)]\s/m.test(htmlVal) || /\n\d+[\.\)]\s/.test(htmlVal)) {
          htmlVal = htmlVal
            .replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 800; color: #1e293b; margin: 8px 0;">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 style="font-size: 17px; font-weight: 800; color: #1e293b; margin: 10px 0;">$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(?:^|\n)(\d+)[\.\)]\s+(.*?)(?=\n\d+[\.\)]|\n[*-]|\n\n|$)/gs, '<p><strong>$1.</strong> $2</p>')
            .replace(/(?:^|\n)[*-]\s+(.*?)(?=\n[*-]|\n\d+[\.\)]|\n\n|$)/gs, '<li>$1</li>')
            .replace(/\n/g, '<br/>');
          converted = true;
        }

        editorRef.current.innerHTML = htmlVal;
        if (converted) {
          onChange(htmlVal);
        }
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
  };

  // Cores de Texto
  const textColors = [
    { label: 'Padrão', value: '#1e293b' },
    { label: 'Azul MCS', value: '#2563eb' },
    { label: 'Verde Sucesso', value: '#16a34a' },
    { label: 'Laranja / Alerta', value: '#ea580c' },
    { label: 'Vermelho Crítico', value: '#dc2626' },
    { label: 'Roxo Estratégico', value: '#9333ea' }
  ];

  // Cores de Marca-Texto
  const highlightColors = [
    { label: 'Sem destaque', value: 'transparent' },
    { label: 'Amarelo', value: '#fef08a' },
    { label: 'Azul Claro', value: '#bfdbfe' },
    { label: 'Verde Claro', value: '#bbf7d0' },
    { label: 'Rosa Claro', value: '#fbcfe8' },
    { label: 'Laranja Claro', value: '#fed7aa' }
  ];

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xs ${className}`}>
      
      {/* Barra de Ferramentas WYSIWYG Visual */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 select-none text-slate-700 dark:text-slate-200">
        
        {/* Títulos */}
        <button
          type="button"
          onClick={() => exec('formatBlock', '<h3>')}
          title="Título de Seção (H3)"
          className="px-2 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
        >
          <Heading3 size={15} />
          <span>Título</span>
        </button>

        <button
          type="button"
          onClick={() => exec('formatBlock', '<p>')}
          title="Parágrafo Normal"
          className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Normal
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

        {/* Formatação Básica */}
        <button
          type="button"
          onClick={() => exec('bold')}
          title="Negrito (Ctrl+B)"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Bold size={15} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => exec('italic')}
          title="Itálico (Ctrl+I)"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onClick={() => exec('underline')}
          title="Sublinhado (Ctrl+U)"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Underline size={15} />
        </button>

        <button
          type="button"
          onClick={() => exec('strikeThrough')}
          title="Tachado"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Strikethrough size={15} />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

        {/* Listas */}
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          title="Lista com Marcadores"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <List size={16} />
        </button>

        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          title="Lista Numerada"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ListOrdered size={16} />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

        {/* Seletor de Cor do Texto */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightColorPicker(false);
            }}
            title="Cor da Fonte"
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-0.5"
          >
            <Palette size={15} />
            <div className="w-2.5 h-1 bg-blue-600 rounded-full" />
          </button>

          {showTextColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex items-center gap-1.5">
              {textColors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    exec('foreColor', c.value);
                    setShowTextColorPicker(false);
                  }}
                  title={c.label}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 transition-transform hover:scale-125"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Seletor de Marca-Texto / Destaque */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightColorPicker(!showHighlightColorPicker);
              setShowTextColorPicker(false);
            }}
            title="Cor de Destaque / Marca-Texto"
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-0.5"
          >
            <Highlighter size={15} />
            <div className="w-2.5 h-1 bg-amber-400 rounded-full" />
          </button>

          {showHighlightColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex items-center gap-1.5">
              {highlightColors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    exec('hiliteColor', c.value);
                    setShowHighlightColorPicker(false);
                  }}
                  title={c.label}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 transition-transform hover:scale-125"
                  style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
                >
                  {c.value === 'transparent' && <span className="text-[10px] text-slate-400">∅</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

        {/* Limpar Formatação */}
        <button
          type="button"
          onClick={() => exec('removeFormat')}
          title="Limpar Formatação"
          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
        >
          <RemoveFormatting size={15} />
        </button>
      </div>

      {/* Área Editável Visual (contentEditable Real) */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="p-4 outline-none text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans prose prose-slate dark:prose-invert max-w-none focus:ring-0 [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-slate-400 [&:empty]:before:pointer-events-none [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
      />
    </div>
  );
};
