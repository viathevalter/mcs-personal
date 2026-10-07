import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, MapPin, ChevronLeft, ChevronRight, X, Trash2, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import type { TimesheetDayEntry } from '../services/timesheetPdfService';

interface DailyEntryModalProps {
    isOpen: boolean;
    dayNumber: number;
    month: number;
    year: number;
    initialEntry?: TimesheetDayEntry | null;
    defaultObra?: string;
    onClose: () => void;
    onSave: (entry: TimesheetDayEntry) => Promise<void>;
    onDelete?: (dayNumber: number) => Promise<void>;
    onNavigateDay?: (targetDay: number) => void;
    maxDaysInMonth: number;
}

const MONTH_NAMES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES_PT = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function DailyEntryModal({
    isOpen,
    dayNumber,
    month,
    year,
    initialEntry,
    defaultObra = '',
    onClose,
    onSave,
    onDelete,
    onNavigateDay,
    maxDaysInMonth
}: DailyEntryModalProps) {
    if (!isOpen) return null;

    const dateObj = new Date(year, month - 1, dayNumber);
    const weekdayName = WEEKDAY_NAMES_PT[dateObj.getDay()];
    const monthName = MONTH_NAMES_PT[month - 1];

    const isEdit = initialEntry && (Number(initialEntry.totalHoras || 0) > 0 || initialEntry.obs === 'Descanso' || initialEntry.obs === 'Folga');

    // Estado do formulário
    const [turno, setTurno] = useState<'diurno' | 'noturno'>('diurno');
    const [totalHoras, setTotalHoras] = useState<number>(8.0);
    const [entrada, setEntrada] = useState<string>('08:00');
    const [saida, setSaida] = useState<string>('17:00');
    const [obra, setObra] = useState<string>(defaultObra);
    const [obs, setObs] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Carregar dados iniciais ao abrir ou mudar dia
    useEffect(() => {
        if (initialEntry) {
            const tot = Number(initialEntry.totalHoras || 0);
            const not = Number(initialEntry.horasNoturnas || 0);
            setTotalHoras(tot);
            setTurno(not > 0 ? 'noturno' : 'diurno');
            setEntrada(initialEntry.entrada || (turno === 'noturno' ? '22:00' : '08:00'));
            setSaida(initialEntry.saida || (turno === 'noturno' ? '06:00' : '17:00'));
            setObra(initialEntry.obra || defaultObra);
            setObs(initialEntry.obs || '');
        } else {
            // Padrão para dia vazio
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            setTotalHoras(isWeekend ? 0 : 8.0);
            setTurno('diurno');
            setEntrada(isWeekend ? '' : '08:00');
            setSaida(isWeekend ? '' : '17:00');
            setObra(defaultObra);
            setObs(isWeekend ? 'Descanso' : '');
        }
    }, [dayNumber, initialEntry, defaultObra]);

    // Atalhos de horas
    const handleQuickHours = (hrs: number) => {
        setTotalHoras(hrs);
        if (hrs === 0) {
            setObs('Folga/Descanso');
            setEntrada('');
            setSaida('');
        } else {
            if (obs === 'Folga/Descanso' || obs === 'Descanso') setObs('');
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
            if (next === 0) setObs('Descanso');
            else if (obs === 'Descanso') setObs('');
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

            const entryToSave: TimesheetDayEntry = {
                dia: dayNumber,
                entrada: entrada.trim(),
                saida: saida.trim(),
                horasNormais: normais,
                horasNoturnas: noturnas,
                totalHoras: totalHoras,
                obra: obra.trim() || defaultObra,
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
            await onDelete(dayNumber);
            onClose();
        } catch (err) {
            console.error('Erro ao eliminar:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                {/* Cabeçalho */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    <h2 className="text-base font-bold text-slate-900">
                        {isEdit ? 'Editar Apontamento' : 'Novo Apontamento'}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Conteúdo com rolagem suave */}
                <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Navegação de Data */}
                    <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100/80 rounded-2xl px-4 py-3 text-emerald-950 shadow-2xs">
                        <button
                            type="button"
                            disabled={dayNumber <= 1}
                            onClick={() => onNavigateDay && onNavigateDay(dayNumber - 1)}
                            className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="text-center">
                            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 block">
                                {weekdayName}
                            </span>
                            <span className="text-base font-black text-slate-900 leading-tight">
                                {String(dayNumber).padStart(2, '0')} de {monthName} de {year}
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled={dayNumber >= maxDaysInMonth}
                            onClick={() => onNavigateDay && onNavigateDay(dayNumber + 1)}
                            className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Seletor de Turno */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Turno de Trabalho
                        </Label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setTurno('diurno')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-sm font-bold transition-all ${
                                    turno === 'diurno'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <Sun className="h-4 w-4" />
                                <div>
                                    <span className="block leading-none">Diurno</span>
                                    <span className={`text-[10px] font-normal block mt-0.5 ${turno === 'diurno' ? 'text-emerald-100' : 'text-slate-400'}`}>06:00 – 18:00</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTurno('noturno')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-sm font-bold transition-all ${
                                    turno === 'noturno'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <Moon className="h-4 w-4" />
                                <div>
                                    <span className="block leading-none">Noturno</span>
                                    <span className={`text-[10px] font-normal block mt-0.5 ${turno === 'noturno' ? 'text-indigo-100' : 'text-slate-400'}`}>18:00 – 06:00</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Obra / Local de Trabalho */}
                    <div className="space-y-1.5">
                        <Label htmlFor="obra" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Obra / Local de Trabalho
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                            <Input
                                id="obra"
                                type="text"
                                value={obra}
                                onChange={(e) => setObra(e.target.value)}
                                placeholder="Nome da obra ou planta"
                                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold text-slate-900 text-sm focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* BLOCO CENTRAL EM DESTAQUE: TOTAL DE HORAS COM STEPPER - / + */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-5 text-center shadow-inner">
                        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                            Total de Horas do Dia
                        </span>

                        <div className="flex items-center justify-center gap-6 my-3">
                            <button
                                type="button"
                                onClick={() => adjustHours(-0.5)}
                                className="h-12 w-12 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-2xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all select-none"
                            >
                                –
                            </button>

                            <div className="min-w-[120px]">
                                <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                                    {totalHoras.toFixed(1).replace('.', ',')}
                                </span>
                                <span className="text-lg font-bold text-slate-400 ml-1">h</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => adjustHours(0.5)}
                                className="h-12 w-12 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-2xl font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all select-none"
                            >
                                +
                            </button>
                        </div>

                        {/* Atalhos de 1 toque */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            {[8, 9, 10, 12].map(hrs => (
                                <button
                                    key={hrs}
                                    type="button"
                                    onClick={() => handleQuickHours(hrs)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                                        totalHoras === hrs
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {hrs}h
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => handleQuickHours(0)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                                    totalHoras === 0
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Folga/Descanso
                            </button>
                        </div>
                    </div>

                    {/* Horários Entrada e Saída (Secundários / Opcionais) */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                            <Label htmlFor="entrada" className="text-[11px] font-bold text-slate-500 uppercase">
                                Entrada (opcional)
                            </Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    id="entrada"
                                    type="time"
                                    value={entrada}
                                    onChange={(e) => setEntrada(e.target.value)}
                                    className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="saida" className="text-[11px] font-bold text-slate-500 uppercase">
                                Saída (opcional)
                            </Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    id="saida"
                                    type="time"
                                    value={saida}
                                    onChange={(e) => setSaida(e.target.value)}
                                    className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-1">
                        <Label htmlFor="obs" className="text-[11px] font-bold text-slate-500 uppercase">
                            Observações (opcional)
                        </Label>
                        <Input
                            id="obs"
                            type="text"
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            placeholder="Ex: Parada técnica, manutenção, etc."
                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium text-slate-800"
                        />
                    </div>

                    {/* Botões de Ação no Rodapé */}
                    <div className="pt-2 flex items-center gap-2">
                        {isEdit && onDelete && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDeleteClick}
                                disabled={saving}
                                className="h-12 px-4 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                            </Button>
                        )}

                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
