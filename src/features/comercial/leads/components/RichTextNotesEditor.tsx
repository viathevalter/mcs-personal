import React, { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';

interface RichTextNotesEditorProps {
  /** Unique key per modal session / target record so initialHtml hydrates cleanly on mount without resetting cursor while typing */
  editorKey: string;
  initialHtml: string;
  onChange: (html: string) => void;
  editorRef?: React.MutableRefObject<HTMLDivElement | null>;
  placeholder?: string;
  minHeightClass?: string;
  maxHeightClass?: string;
  overrideLang?: SupportedComercialLang | null;
}

export function RichTextNotesEditor({
  editorKey,
  initialHtml,
  onChange,
  editorRef: externalRef,
  placeholder,
  minHeightClass = 'min-h-[140px]',
  maxHeightClass = 'max-h-[240px]',
  overrideLang,
}: RichTextNotesEditorProps) {
  const { tr } = useComercialLanguage(overrideLang);
  const internalRef = useRef<HTMLDivElement | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);
  const initialHtmlRef = useRef<string>(initialHtml);
  initialHtmlRef.current = initialHtml;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (externalRef) {
        externalRef.current = node;
      }
      if (node && hydratedKeyRef.current !== editorKey) {
        node.innerHTML = initialHtmlRef.current || '';
        hydratedKeyRef.current = editorKey;
      }
    },
    [editorKey, externalRef]
  );

  // Hydrate if editorKey changes while node is already mounted
  useEffect(() => {
    const node = internalRef.current;
    if (node && hydratedKeyRef.current !== editorKey) {
      node.innerHTML = initialHtmlRef.current || '';
      hydratedKeyRef.current = editorKey;
    }
  }, [editorKey]);

  const syncHtml = useCallback(() => {
    if (internalRef.current) {
      onChange(internalRef.current.innerHTML);
    }
  }, [onChange]);

  const handleFormatCommand = (command: string, value?: string) => {
    const node = internalRef.current;
    if (!node) return;
    node.focus();
    document.execCommand(command, false, value);
    syncHtml();
  };

  const handleHighlightColor = (bgColor: string, textColor: string) => {
    const node = internalRef.current;
    if (!node) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.info(
        tr(
          'Selecione o texto que deseja destacar com cor.',
          'Seleccione el texto que desea resaltar con color.',
          'Sélectionnez le texte que vous souhaitez surligner.',
          'Seleziona il testo che desideri evidenziare con il colore.'
        )
      );
      return;
    }
    node.focus();
    document.execCommand('backColor', false, bgColor);
    document.execCommand('foreColor', false, textColor);
    syncHtml();
  };

  return (
    <div
      dir="ltr"
      translate="no"
      className="notranslate rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col"
    >
      {/* Formatting Toolbar — onMouseDown preventDefault preserves editor selection & caret */}
      <div className="p-2 border-b border-border bg-muted/40 flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleFormatCommand('bold')}
          className="h-7 w-7 p-0 text-foreground hover:bg-muted"
          title={tr('Negrito (Ctrl+B)', 'Negrita (Ctrl+B)', 'Gras (Ctrl+B)', 'Grassetto (Ctrl+B)')}
        >
          <Bold className="w-3.5 h-3.5 font-bold" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleFormatCommand('italic')}
          className="h-7 w-7 p-0 text-foreground hover:bg-muted"
          title={tr('Itálico (Ctrl+I)', 'Cursiva (Ctrl+I)', 'Italique (Ctrl+I)', 'Corsivo (Ctrl+I)')}
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleFormatCommand('underline')}
          className="h-7 w-7 p-0 text-foreground hover:bg-muted"
          title={tr('Sublinhado', 'Subrayado', 'Souligné', 'Sottolineato')}
        >
          <Underline className="w-3.5 h-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleFormatCommand('insertUnorderedList')}
          className="h-7 w-7 p-0 text-foreground hover:bg-muted"
          title={tr('Lista com Marcadores', 'Lista con Viñetas', 'Liste à Puces', 'Elenco Puntato')}
        >
          <List className="w-3.5 h-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleFormatCommand('removeFormat')}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          title={tr('Limpar Formatação', 'Limpiar Formato', 'Effacer le Format', 'Rimuovi Formattazione')}
        >
          <Eraser className="w-3.5 h-3.5" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Color Highlighters */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleHighlightColor('#fef08a', '#854d0e')}
            className="w-5 h-5 rounded-full bg-yellow-300 border border-yellow-500 hover:scale-110 transition-transform"
            title={tr('Destacar Amarelo', 'Resaltar Amarillo', 'Surligner Jaune', 'Evidenzia Giallo')}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleHighlightColor('#bbf7d0', '#166534')}
            className="w-5 h-5 rounded-full bg-emerald-300 border border-emerald-500 hover:scale-110 transition-transform"
            title={tr('Destacar Verde', 'Resaltar Verde', 'Surligner Vert', 'Evidenzia Verde')}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleHighlightColor('#fecdd3', '#9f1239')}
            className="w-5 h-5 rounded-full bg-rose-300 border border-rose-500 hover:scale-110 transition-transform"
            title={tr('Destacar Vermelho / Urgente', 'Resaltar Rojo / Urgente', 'Surligner Rouge / Urgent', 'Evidenzia Rosso / Urgente')}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleHighlightColor('#bfdbfe', '#1e40af')}
            className="w-5 h-5 rounded-full bg-blue-300 border border-blue-500 hover:scale-110 transition-transform"
            title={tr('Destacar Azul', 'Resaltar Azul', 'Surligner Bleu', 'Evidenzia Blu')}
          />
        </div>
      </div>

      {/* Uncontrolled LTR Editable Surface — immune to React cursor-jump & Chrome Translate RTL mutation */}
      <div
        ref={setRefs}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        translate="no"
        spellCheck
        data-placeholder={placeholder || ''}
        onInput={syncHtml}
        onBlur={syncHtml}
        onKeyUp={syncHtml}
        style={{
          direction: 'ltr',
          unicodeBidi: 'normal',
          textAlign: 'left',
        }}
        className={`notranslate p-3.5 ${minHeightClass} ${maxHeightClass} overflow-y-auto text-xs text-foreground leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60`}
      />
    </div>
  );
}
