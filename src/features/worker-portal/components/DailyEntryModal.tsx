import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Clock, MapPin, ChevronLeft, ChevronRight, X, Trash2, Check, Building2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useTranslation } from 'react-i18next';
import type { TimesheetDayEntry } from '../services/timesheetPdfService';

interface DailyEntryModalProps {
    isOpen: boolean;
    dayNumber: number;
    month: number;
    year: number;
    initialEntry?: TimesheetDayEntry | null;
    defaultObra?: string;
    availableObras?: Array<{ id: string; name: string }>;
    clientName?: string;
    onClose: () => void;
    onSave: (entry: TimesheetDayEntry) => Promise<void>;
    onDelete?: (dayNumber: number) => Promise<void>;
    onNavigateDay?: (targetDay: number) => void;
    maxDaysInMonth: number;
}

export function DailyEntryModal({
    isOpen,
    dayNumber,
    month,
    year,
    initialEntry,
    defaultObra = '',
    availableObras = [],
    clientName = '',
    onClose,
    onSave,
    onDelete,
    onNavigateDay,
    maxDaysInMonth
}: DailyEntryModalProps) {
    const { t, i18n } = useTranslation();
    if (!isOpen) return null;

    const isSpanish = (i18n.language || '').toLowerCase().startsWith('es');
    const parsedDay = typeof dayNumber === 'object' && dayNumber !== null
        ? Number((dayNumber as any).dia ?? (dayNumber as any).day ?? 1)
        : Number(dayNumber);
    const validDay = Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 1;

    const dateObj = new Date(year, month - 1, validDay);
    const locale = isSpanish ? 'es-ES' : 'pt-PT';
    const weekdayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });
    const monthName = dateObj.toLocaleDateString(locale, { month: 'long' });

    const isEdit = initialEntry && (
        Number(initialEntry.totalHoras || 0) > 0 || 
        initialEntry.obs === 'Descanso' || 
        initialEntry.obs === 'Folga' ||
        initialEntry.obs?.toLowerCase().includes('descanso')
    );

    // Estado do formulário
    const [turno, setTurno] = useState<'diurno' | 'noturno'>('diurno');
    const [totalHoras, setTotalHoras] = useState<number>(8.0);
    const [entrada, setEntrada] = useState<string>('08:00');
    const [saida, setSaida] = useState<string>('17:00');
    
    // Obra selecionada com higienização estrita (NUNCA assume o nome da empresa cliente como obra)
    const sanitizeObraChoice = useCallback((target?: string) => {
        const clean = (target || '').trim();
        const clientNameClean = (clientName || '').trim().toLowerCase();
        const isClient = clientNameClean && clean.toLowerCase() === clientNameClean;

        if (availableObras.length > 0) {
            if (isClient || !clean) {
                const def = defaultObra && availableObras.some(s => s.name.trim().toLowerCase() === defaultObra.trim().toLowerCase())
                    ? defaultObra
                    : availableObras[0].name;
                return def;
            }
            const match = availableObras.find(s => s.name.trim().toLowerCase() === clean.toLowerCase());
            if (match) return match.name;
            return availableObras[0].name;
        }
        return isClient ? '' : clean;
    }, [availableObras, defaultObra, clientName]);

    const initialObraValue = sanitizeObraChoice(initialEntry?.obra || defaultObra);
    const [obra, setObra] = useState<string>(initialObraValue);
    const [obs, setObs] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Carregar dados iniciais ao abrir ou mudar dia
    useEffect(() => {
        const preferredObra = sanitizeObraChoice(initialEntry?.obra || defaultObra);
        if (initialEntry) {
            const tot = Number(initialEntry.totalHoras || 0);
            const not = Number(initialEntry.horasNoturnas || 0);
            setTotalHoras(tot);
            setTurno(not > 0 ? 'noturno' : 'diurno');
            setEntrada(initialEntry.entrada || (not > 0 ? '22:00' : '08:00'));
            setSaida(initialEntry.saida || (not > 0 ? '06:00' : '17:00'));
            setObra(preferredObra);
            setObs(initialEntry.obs || '');
        } else {
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            setTotalHoras(isWeekend ? 0 : 8.0);
            setTurno('diurno');
            setEntrada(isWeekend ? '' : '08:00');
            setSaida(isWeekend ? '' : '17:00');
            setObra(preferredObra);
            setObs(isWeekend ? (isSpanish ? 'Descanso' : 'Descanso') : '');
        }
    }, [validDay, initialEntry, defaultObra, availableObras, sanitizeObraChoice]);

    // Atalhos de horas
    const handleQuickHours = (hrs: number) => {
        setTotalHoras(hrs);
        if (hrs === 0) {
            setObs(isSpanish ? 'Descanso/Festivo' : 'Folga/Descanso');
            setEntrada('');
            setSaida('');
        } else {
            if (obs.toLowerCase().includes('descanso') || obs.toLowerCase().includes('folga')) {
                setObs('');
            }
            if (turno === 'diurno') {
                setEntrada('08:00');
                const endH = 8 + hrs + (hrs >= 5 ? 1 : 0);
                setSaida(`${String(endH).padStart(2, '0')}:00`);
            } else {
                setEntrada('22:00');
                const endH = (22 + hrs + 1) % 24;
                setSaida(`${String(endH).padStart(2, '0')}:00`);
            }
        }
    };

    // Incrementar / Decrementar
    const adjustHours = (delta: number) => {
        setTotalHoras(prev => {
            const next = Math.max(0, Math.min(24, Math.round((prev + delta) * 2) / 2));
            if (next === 0) setObs(isSpanish ? 'Descanso' : 'Descanso');
            else if (obs.toLowerCase().includes('descanso') || obs.toLowerCase().includes('folga')) setObs('');
            return next;
        });
    };

    // Submeter
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const isNoturno = turno === 'noturno';
            const normais = isNoturno ? 0 : totalHoras;
            const noturnas = isNoturno ? totalHoras : 0;

            const finalObra = sanitizeObraChoice(obra || defaultObra);
            const matchedSite = availableObras.find(s => s.name.trim().toLowerCase() === finalObra.trim().toLowerCase());

            const entryToSave: TimesheetDayEntry = {
                dia: validDay,
                entrada: entrada.trim(),
                saida: saida.trim(),
                horasNormais: normais,
                horasNoturnas: noturnas,
                totalHoras: totalHoras,
                obra: finalObra,
                obra_id: matchedSite?.id || (initialEntry as any)?.obra_id || '',
                obs: obs.trim()
            };

            await onSave(entryToSave);
            onClose();
        } catch (err) {
            console.error('Erro ao salvar apontamento:', err);
        } finally {
            setSaving(false);
        }
    };

    // Eliminar / Limpar
    const handleDeleteClick = async () => {
        if (!onDelete) return;
        try {
            setSaving(true);
            await onDelete(validDay);
            onClose();
        } catch (err) {
            console.error('Erro ao eliminar:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                {/* Cabeçalho Compacto */}
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
                        title={t('common.cancel', 'Voltar')}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <h2 className="text-sm font-bold text-slate-900">
                        {isEdit ? t('workerPortal.dailyModal.editTitle', 'Editar Apontamento') : t('workerPortal.dailyModal.newTitle', 'Novo Apontamento')}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 -mr-1 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Formulário com corpo rolável e footer sticky */}
                <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5">
                        {/* 1. Navegação de Data Compacta */}
                        <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100/80 rounded-xl px-3 py-1.5 text-emerald-950 shadow-2xs">
                            <button
                                type="button"
                                disabled={validDay <= 1}
                                onClick={() => onNavigateDay && onNavigateDay(validDay - 1)}
                                className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="text-center">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 block capitalize">
                                    {weekdayName}
                                </span>
                                <span className="text-sm font-black text-slate-900 leading-tight">
                                    {String(validDay).padStart(2, '0')} {monthName} {year}
                                </span>
                            </div>

                            <button
                                type="button"
                                disabled={validDay >= maxDaysInMonth}
                                onClick={() => onNavigateDay && onNavigateDay(validDay + 1)}
                                className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* 2. Seletor de Turno Compacto */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {t('workerPortal.dailyModal.workShift', 'Turno de Trabalho')}
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTurno('diurno')}
                                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all ${
                                        turno === 'diurno'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <Sun className="h-3.5 w-3.5" />
                                    <div>
                                        <span className="block leading-none">{t('workerPortal.dailyModal.dayShift', 'Diurno')}</span>
                                        <span className={`text-[9px] font-normal block mt-0.5 ${turno === 'diurno' ? 'text-emerald-100' : 'text-slate-400'}`}>06:00 – 18:00</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTurno('noturno')}
                                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all ${
                                        turno === 'noturno'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <Moon className="h-3.5 w-3.5" />
                                    <div>
                                        <span className="block leading-none">{t('workerPortal.dailyModal.nightShift', 'Noturno')}</span>
                                        <span className={`text-[9px] font-normal block mt-0.5 ${turno === 'noturno' ? 'text-indigo-100' : 'text-slate-400'}`}>18:00 – 06:00</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 3. Obra / Local de Trabalho (Conectado às Obras Reais do Cliente) */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="obra" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-emerald-600" />
                                    {t('workerPortal.dailyModal.siteLabel', 'Obra / Local de Trabalho')}
                                </Label>
                                {clientName && (
                                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[180px]">
                                        {clientName}
                                    </span>
                                )}
                            </div>

                            {availableObras.length > 1 ? (
                                <div className="space-y-1.5">
                                    {/* Botões rápidos para alternar obra com 1 toque */}
                                    {availableObras.length <= 4 && (
                                        <div className="grid grid-cols-2 gap-1.5 mb-1">
                                            {availableObras.map((site) => {
                                                const isSelected = obra.trim().toLowerCase() === site.name.trim().toLowerCase();
                                                return (
                                                    <button
                                                        key={site.id}
                                                        type="button"
                                                        onClick={() => setObra(site.name)}
                                                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                                                            isSelected
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span className="truncate">{site.name}</span>
                                                        {isSelected && <Check className="h-3 w-3 shrink-0 ml-1" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <select
                                            id="obra"
                                            value={obra}
                                            onChange={(e) => setObra(e.target.value)}
                                            className="w-full h-9 pl-3 pr-8 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:bg-white focus:outline-emerald-500 cursor-pointer"
                                        >
                                            {availableObras.map((site) => (
                                                <option key={site.id} value={site.name}>
                                                    {site.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : availableObras.length === 1 ? (
                                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                            {availableObras[0].name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                                        Obra Vinculada
                                    </span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        id="obra"
                                        type="text"
                                        value={obra}
                                        onChange={(e) => setObra(e.target.value)}
                                        placeholder={t('workerPortal.dailyModal.sitePlaceholder', 'Nome da obra ou planta')}
                                        className="h-9 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900 text-xs focus:bg-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 4. BLOCO CENTRAL: TOTAL DE HORAS COM STEPPER - / + (COMPACTO) */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center shadow-2xs">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                {t('workerPortal.dailyModal.totalDayHours', 'Total de Horas do Dia')}
                            </span>

                            <div className="flex items-center justify-center gap-4 my-1.5">
                                <button
                                    type="button"
                                    onClick={() => adjustHours(-0.5)}
                                    className="h-10 w-10 rounded-full bg-white border border-slate-300 shadow-2xs flex items-center justify-center text-xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all select-none"
                                >
                                    –
                                </button>

                                <div className="min-w-[100px]">
                                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                                        {totalHoras.toFixed(1).replace('.', ',')}
                                    </span>
                                    <span className="text-base font-bold text-slate-400 ml-1">h</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => adjustHours(0.5)}
                                    className="h-10 w-10 rounded-full bg-white border border-slate-300 shadow-2xs flex items-center justify-center text-xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all select-none"
                                >
                                    +
                                </button>
                            </div>

                            {/* Atalhos de 1 toque */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                                {[8, 9, 10, 12].map(hrs => (
                                    <button
                                        key={hrs}
                                        type="button"
                                        onClick={() => handleQuickHours(hrs)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                                            totalHoras === hrs
                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {hrs}h
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => handleQuickHours(0)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                                        totalHoras === 0
                                            ? 'bg-slate-800 text-white shadow-2xs'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {t('workerPortal.dailyModal.restShortcut', 'Folga/Descanso')}
                                </button>
                            </div>
                        </div>

                        {/* 5. Horários Entrada e Saída (Secundários / Opcionais) */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="space-y-0.5">
                                <Label htmlFor="entrada" className="text-[10px] font-bold text-slate-400 uppercase">
                                    {t('workerPortal.dailyModal.entryOptional', 'Entrada (opcional)')}
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        id="entrada"
                                        type="time"
                                        value={entrada}
                                        onChange={(e) => setEntrada(e.target.value)}
                                        className="pl-8 h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-0.5">
                                <Label htmlFor="saida" className="text-[10px] font-bold text-slate-400 uppercase">
                                    {t('workerPortal.dailyModal.exitOptional', 'Saída (opcional)')}
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        id="saida"
                                        type="time"
                                        value={saida}
                                        onChange={(e) => setSaida(e.target.value)}
                                        className="pl-8 h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 6. Observações */}
                        <div className="space-y-0.5">
                            <Label htmlFor="obs" className="text-[10px] font-bold text-slate-400 uppercase">
                                {t('workerPortal.dailyModal.obsOptional', 'Observações (opcional)')}
                            </Label>
                            <Input
                                id="obs"
                                type="text"
                                value={obs}
                                onChange={(e) => setObs(e.target.value)}
                                placeholder={t('workerPortal.dailyModal.obsPlaceholder', 'Ex: Parada técnica, manutenção, etc.')}
                                className="h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    {/* 7. RODAPÉ FIXO / STICKY: BOTÃO SALVAR SEMPRE VISÍVEL! */}
                    <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center gap-2 sticky bottom-0 z-20 shadow-md">
                        {isEdit && onDelete && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDeleteClick}
                                disabled={saving}
                                className="h-11 px-3 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs"
                                title={t('workerPortal.dailyModal.btnDelete', 'Eliminar')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}

                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                            <Check className="h-4 w-4" />
                            {saving 
                                ? t('workerPortal.dailyModal.btnSaving', 'A guardar...') 
                                : t('workerPortal.dailyModal.btnSave', 'Guardar Apontamento')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
