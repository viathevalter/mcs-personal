import React, { useRef, useEffect, useState } from 'react';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Palette, Sparkles, RotateCcw, Plus, X, Globe, Type
} from 'lucide-react';
import { toast } from 'sonner';

interface PremiumRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export interface PresetClause {
    id: string;
    lang: 'pt' | 'es' | 'it' | 'fr';
    title: string;
    text: string;
}

const DEFAULT_CLAUSES: PresetClause[] = [
    // --- PORTUGUÊS (PT) ---
    { id: 'pt-1', lang: 'pt', title: '🔒 Confidencialidade', text: 'As partes comprometem-se a manter sigilo absoluto sobre todas as informações operacionais e comerciais compartilhadas durante a vigência do contrato.' },
    { id: 'pt-2', lang: 'pt', title: '💰 Pagamento (30 Dias)', text: 'O pagamento será efetuado em até 30 (trinta) dias após a emissão da correspondente fatura e validação da medição dos serviços.' },
    { id: 'pt-3', lang: 'pt', title: '⚖️ Foro Competente', text: 'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da Comarca de Lisboa, com renúncia a qualquer outro.' },
    { id: 'pt-4', lang: 'pt', title: '⏱️ Cronograma de Execução', text: 'Os serviços deverão ser executados estritamente dentro do cronograma acordado, respeitando as normas vigentes de segurança e conformidade.' },

    // --- ESPANHOL (ES) ---
    { id: 'es-1', lang: 'es', title: '🔒 Confidencialidad', text: 'Las partes se comprometen a mantener la máxima confidencialidad sobre toda la información operativa y comercial compartida durante la vigencia del contrato.' },
    { id: 'es-2', lang: 'es', title: '💰 Pago (30 Días)', text: 'El pago se efectuará dentro de los 30 (treinta) días siguientes a la emisión de la factura correspondiente y la validación de los servicios prestados.' },
    { id: 'es-3', lang: 'es', title: '⚖️ Jurisdicción y Foro', text: 'Para la resolución de cualquier controversia derivada del presente contrato, las partes se someten expresamente a la jurisdicción de los Juzgados y Tribunales de Madrid.' },
    { id: 'es-4', lang: 'es', title: '⏱️ Plazo de Ejecución', text: 'Los trabajos se ejecutarán estrictamente conforme al calendario acordado, cumpliendo plenamente las normativas vigentes de prevención de riesgos y seguridad laboral.' },

    // --- ITALIANO (IT) ---
    { id: 'it-1', lang: 'it', title: '🔒 Riservatezza', text: 'Le parti si impegnano a mantenere la massima riservatezza su tutte le informazioni operative e commerciali scambiate durante la validità del presente contratto.' },
    { id: 'it-2', lang: 'it', title: '💰 Pagamento (30 Giorni)', text: 'Il pagamento sarà effettuato entro 30 (trenta) giorni dalla data di emissione della fattura previa approvazione dello stato di avanzamento dei lavori.' },
    { id: 'it-3', lang: 'it', title: '⚖️ Foro Competente', text: 'Per qualsiasi controversia derivante dal presente contratto sarà esclusivamente competente il Foro di Milano.' },
    { id: 'it-4', lang: 'it', title: '⏱️ Tempi di Esecuzione', text: 'I servizi saranno eseguiti nel rigoroso rispetto delle tempistiche concordate e della normativa vigente in materia di sicurezza sul lavoro.' },

    // --- FRANCÊS (FR) ---
    { id: 'fr-1', lang: 'fr', title: '🔒 Confidentialité', text: 'Les parties s\'engagent à maintenir une stricte confidentialité concernant toutes les informations opérationnelles et commerciales échangées.' },
    { id: 'fr-2', lang: 'fr', title: '💰 Paiement (30 Jours)', text: 'Le paiement sera effectué dans un délai de 30 (trente) jours à compter de la date d\'émission de la facture et de la validation des prestations.' },
    { id: 'fr-3', lang: 'fr', title: '⚖️ Attribution de Juridiction', text: 'En cas de litige relatif à l\'interprétation ou à l\'exécution du présent contrat, les tribunaux de Paris seront seuls compétents.' },
    { id: 'fr-4', lang: 'fr', title: '⏱️ Calendrier d\'Exécution', text: 'Les prestations seront exécutées selon le calendrier convenu, dans le respect des normes de sécurité et de conformité en vigueur.' }
];

const FONT_FAMILIES = [
    { label: 'Padrão (Sans-serif)', value: 'sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' }
];

const FONT_SIZES = [
    { label: '10px (Pequeno)', size: '1', px: '10px' },
    { label: '12px (Normal)', size: '2', px: '12px' },
    { label: '14px (Médio)', size: '3', px: '14px' },
    { label: '16px (Grande)', size: '4', px: '16px' },
    { label: '18px (Título)', size: '5', px: '18px' },
    { label: '24px (Destaque)', size: '6', px: '24px' }
];

const COLOR_PRESETS = [
    { label: 'Escuro Padrão', value: '#0f172a' },
    { label: 'Azul Premium', value: '#2563eb' },
    { label: 'Verde Esmeralda', value: '#059669' },
    { label: 'Vermelho Destaque', value: '#dc2626' },
    { label: 'Roxo Elegante', value: '#7c3aed' },
    { label: 'Cinza Neutro', value: '#64748b' }
];

export const PremiumRichTextEditor: React.FC<PremiumRichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite o texto livre, cláusulas especiais ou observações contratuais...'
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [selectedLang, setSelectedLang] = useState<'pt' | 'es' | 'it' | 'fr'>('es');
    const [clauses, setClauses] = useState<PresetClause[]>(() => {
        try {
            const saved = localStorage.getItem('mcs_custom_preset_clauses');
            return saved ? JSON.parse(saved) : DEFAULT_CLAUSES;
        } catch {
            return DEFAULT_CLAUSES;
        }
    });

    const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newText, setNewText] = useState('');

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
        const formattedClause = `<p style="margin-top: 8px; margin-bottom: 8px;"><strong>Nota / Cláusula Especial:</strong> ${clauseText}</p>`;
        const newHtml = currentHtml && currentHtml !== '<br>'
            ? `${currentHtml}${formattedClause}`
            : formattedClause;
        
        editorRef.current.innerHTML = newHtml;
        onChange(newHtml);
        toast.success('Cláusula adicionada ao documento!');
    };

    const handleAddCustomClause = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newText.trim()) return;

        const newClause: PresetClause = {
            id: `custom-${Date.now()}`,
            lang: selectedLang,
            title: newTitle.trim(),
            text: newText.trim()
        };

        const updated = [...clauses, newClause];
        setClauses(updated);
        try {
            localStorage.setItem('mcs_custom_preset_clauses', JSON.stringify(updated));
        } catch (e) {
            console.error('Error saving custom clause:', e);
        }

        setNewTitle('');
        setNewText('');
        setIsAddingModalOpen(false);
        toast.success(`Cláusula cadastrada para o idioma ${selectedLang.toUpperCase()}!`);
    };

    const activeClauses = clauses.filter(c => c.lang === selectedLang);

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            {/* Main Toolbar */}
            <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                {/* Font Family Selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                    <Type size={13} className="text-slate-400" />
                    <select
                        onChange={(e) => execCmd('fontName', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        defaultValue="sans-serif"
                    >
                        {FONT_FAMILIES.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-400">Tamanho:</span>
                    <select
                        onChange={(e) => execCmd('fontSize', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        defaultValue="3"
                    >
                        {FONT_SIZES.map(s => (
                            <option key={s.size} value={s.size}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Format buttons */}
                <div className="flex items-center gap-0.5 border-r border-l border-slate-200 dark:border-slate-800 px-1.5">
                    <button
                        type="button"
                        onClick={() => execCmd('bold')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold"
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
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
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
                <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
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
                <div className="flex items-center gap-1">
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
                className="p-3.5 min-h-[120px] max-h-[220px] overflow-y-auto text-xs text-slate-900 dark:text-slate-100 focus:outline-none leading-relaxed"
                data-placeholder={placeholder}
            />

            {/* Multi-Language Preset Clauses Bar */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1">
                            <Globe size={13} className="text-blue-500" /> Idioma das Cláusulas:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedLang('es')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${selectedLang === 'es' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                            🇪🇸 Espanhol
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLang('pt')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${selectedLang === 'pt' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                            🇵🇹 Português
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLang('it')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${selectedLang === 'it' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                            🇮🇹 Italiano
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLang('fr')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${selectedLang === 'fr' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                            🇫🇷 Francês
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsAddingModalOpen(true)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-1 transition-all"
                    >
                        <Plus size={13} /> Cadastrar Nova Cláusula ({selectedLang.toUpperCase()})
                    </button>
                </div>

                {/* Preset Buttons Grid */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {activeClauses.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Nenhuma cláusula cadastrada para este idioma ainda.</span>
                    ) : (
                        activeClauses.map(preset => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => insertPresetClause(preset.text)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs"
                                title={preset.text}
                            >
                                <Sparkles size={11} className="text-amber-500 flex-shrink-0" />
                                <span>{preset.title}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Cadastrar Nova Cláusula */}
            {isAddingModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus size={16} className="text-blue-500" /> Cadastrar Cláusula ({selectedLang.toUpperCase()})
                            </h3>
                            <button onClick={() => setIsAddingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCustomClause} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                                    Título da Cláusula *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: 📜 Garantia de Serviço"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                                    Texto da Cláusula *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Digite o texto da cláusula que será inserido ao clicar no botão..."
                                    value={newText}
                                    onChange={e => setNewText(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-sans"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                                >
                                    Salvar Cláusula
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
