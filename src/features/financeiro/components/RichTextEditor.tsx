import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Keep track of internal content to avoid infinite cursors reset
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (editorRef.current) {
            // Only set innerHTML on first load or if the value is completely different
            if (isFirstLoad.current || editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '<p><br></p>';
                isFirstLoad.current = false;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const executeCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const fontSizes = [
        { label: 'Normal', value: '3' },
        { label: 'Pequeno', value: '2' },
        { label: 'Médio', value: '4' },
        { label: 'Grande', value: '5' },
        { label: 'Título', value: '6' }
    ];

    const colors = [
        { name: 'Padrão', value: '#0f172a' }, // Slate 900
        { name: 'Azul', value: '#2563eb' },    // Blue 600
        { name: 'Verde', value: '#16a34a' },   // Green 600
        { name: 'Vermelho', value: '#dc2626' }, // Red 600
        { name: 'Laranja', value: '#ea580c' },  // Orange 600
        { name: 'Roxo', value: '#9333ea' }     // Purple 600
    ];

    return (
        <div className="w-full border rounded-lg overflow-hidden bg-background flex flex-col focus-within:ring-2 focus-within:ring-primary/20">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-950 border-b select-none">
                <TooltipProvider>
                    {/* Basic Formatting */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('bold')}
                            >
                                <Bold className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Negrito</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('italic')}
                            >
                                <Italic className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Itálico</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('underline')}
                            >
                                <Underline className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sublinhado</TooltipContent>
                    </Tooltip>

                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                    {/* Alignment */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('justifyLeft')}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Alinhar à Esquerda</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('justifyCenter')}
                            >
                                <AlignCenter className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Centralizar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                                onClick={() => executeCommand('justifyRight')}
                            >
                                <AlignRight className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Alinhar à Direita</TooltipContent>
                    </Tooltip>

                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                    {/* Font Size Selector */}
                    <div className="flex items-center gap-1">
                        <Type className="w-4 h-4 text-muted-foreground mr-1" />
                        <select
                            onChange={(e) => executeCommand('fontSize', e.target.value)}
                            defaultValue="3"
                            className="text-xs h-8 rounded border bg-background px-1.5 focus:outline-none"
                        >
                            {fontSizes.map((size) => (
                                <option key={size.value} value={size.value}>
                                    {size.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                    {/* Text Color Selector */}
                    <div className="flex items-center gap-1">
                        <Palette className="w-4 h-4 text-muted-foreground mr-1" />
                        <div className="flex gap-1">
                            {colors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => executeCommand('foreColor', c.value)}
                                    className="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 flex-1 sm:flex-none" />

                    {/* Reset Formatting */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-slate-800 ml-auto"
                                onClick={() => executeCommand('removeFormat')}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Limpar Formatação</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Editable Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="w-full min-h-[380px] p-4 text-xs focus:outline-none overflow-y-auto bg-background text-slate-800 dark:text-slate-200 font-sans leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                style={{ outline: 'none' }}
            />
        </div>
    );
};
