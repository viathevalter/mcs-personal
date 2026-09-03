import { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  AlertCircle, 
  Tag, 
  Building2,
  CalendarDays
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  isBefore, 
  startOfToday,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { ptBR, es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface ScheduleCallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onConfirm: (scheduledDateIso: string, formattedNotes: string, priority: 'high' | 'normal' | 'low') => void;
  isSubmitting?: boolean;
}

const POPULAR_TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const QUICK_TAGS = [
  'Decisor em reunião',
  'Pediu ligar após o almoço',
  'Parada técnica prevista',
  'Aguardando aprovação de compras',
  'Ligar direto para celular do engenheiro',
  'Interessado em soldadores TIG/MIG'
];

export function ScheduleCallbackModal({
  isOpen,
  onClose,
  lead,
  onConfirm,
  isSubmitting = false,
}: ScheduleCallbackModalProps) {
  // Calendar selection state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('high');

  // Rich Text Editor State (contentEditable)
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorHtml, setEditorHtml] = useState<string>(
    '<div><strong>Retorno agendado:</strong> Decisor estará disponível neste horário para avaliar proposta técnica.</div>'
  );

  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [isOpen]);

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 (Sun) to 6 (Sat)
  // Shift for Monday start (0: Mon, ..., 6: Sun)
  const startOffset = (startDayOfWeek + 6) % 7;

  const handleApplyQuickSlot = (daysAhead: number, timeStr: string) => {
    const target = addDays(new Date(), daysAhead);
    setSelectedDate(target);
    setSelectedTime(timeStr);
    setCurrentMonth(target);
  };

  const handleFormatCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const handleHighlightColor = (bgColor: string, textColor: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.info('Selecione o texto que deseja destacar com cor.');
      return;
    }
    document.execCommand('backColor', false, bgColor);
    document.execCommand('foreColor', false, textColor);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const handleInsertTag = (tagText: string) => {
    if (editorRef.current) {
      const tagHtml = `<span style="background-color: #3b82f620; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f640; margin-right: 4px;">#${tagText}</span> `;
      document.execCommand('insertHTML', false, tagHtml);
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const handleSave = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const combinedIso = new Date(`${dateStr}T${selectedTime}:00`).toISOString();
    const finalContent = editorRef.current?.innerHTML || editorHtml;

    onConfirm(combinedIso, finalContent, priority);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  Agendar Retorno Comercial (Callback)
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
                    Prioridade SDR
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {lead ? `Empresa: ${lead.company_name || lead.name} • ${lead.city || 'Espanha'}` : 'Selecione a data e os detalhes do compromisso'}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Interactive Calendar & Time Slots (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Atalhos Rápidos de Agendamento</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(0, '15:30')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Hoje à tarde
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(1, '09:30')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Amanhã 09:30
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(1, '15:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Amanhã 15:00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(2, '10:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Em 2 Dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(3, '11:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Em 3 Dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(7, '10:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  Próxima Semana
                </Button>
              </div>
            </div>

            {/* Visual Month Calendar */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              {/* Calendar Month Navigation */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day Headers (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty offset padding */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {daysInMonth.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isDayToday = isToday(day);
                  const isPast = isBefore(day, startOfToday());

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(day)}
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-105'
                          : isDayToday
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                          : isPast
                          ? 'text-muted-foreground/30 cursor-not-allowed'
                          : 'text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Horário do Compromisso
                </Label>
                <div className="w-24">
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    className="h-8 text-xs font-mono font-bold text-center bg-background border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {POPULAR_TIMES.map(timeStr => {
                  const isTimeSelected = selectedTime === timeStr;
                  return (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => setSelectedTime(timeStr)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-mono font-semibold text-center border transition-all ${
                        isTimeSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                          : 'bg-background hover:bg-muted text-muted-foreground border-input'
                      }`}
                    >
                      {timeStr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Rich Text Editor & Priorities (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Appointment Priority Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Nível de Prioridade do Retorno
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    priority === 'high'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  Máxima Prioridade
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    priority === 'normal'
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Normal
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('low')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    priority === 'low'
                      ? 'bg-slate-500/15 border-slate-500 text-slate-600 dark:text-slate-400 shadow-sm'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span>⏳ Baixa</span>
                </button>
              </div>
            </div>

            {/* Rich Text Editor Toolbar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Descrição & Instruções do Agendamento (Rich Text)
                </Label>
              </div>

              <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
                {/* Formatting Toolbar */}
                <div className="p-2 border-b border-border bg-muted/40 flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatCommand('bold')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Negrito (Ctrl+B)"
                  >
                    <Bold className="w-3.5 h-3.5 font-bold" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatCommand('italic')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Itálico (Ctrl+I)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatCommand('underline')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Sublinhado"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatCommand('insertUnorderedList')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Lista com Marcadores"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Color Highlighters */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleHighlightColor('#fef08a', '#854d0e')}
                      className="w-5 h-5 rounded-full bg-yellow-300 border border-yellow-500 hover:scale-110 transition-transform"
                      title="Destacar Amarelo"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightColor('#bbf7d0', '#166534')}
                      className="w-5 h-5 rounded-full bg-emerald-300 border border-emerald-500 hover:scale-110 transition-transform"
                      title="Destacar Verde"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightColor('#fecdd3', '#9f1239')}
                      className="w-5 h-5 rounded-full bg-rose-300 border border-rose-500 hover:scale-110 transition-transform"
                      title="Destacar Vermelho / Urgente"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightColor('#bfdbfe', '#1e40af')}
                      className="w-5 h-5 rounded-full bg-blue-300 border border-blue-500 hover:scale-110 transition-transform"
                      title="Destacar Azul"
                    />
                  </div>
                </div>

                {/* Editable Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={() => {
                    if (editorRef.current) setEditorHtml(editorRef.current.innerHTML);
                  }}
                  className="p-4 min-h-[140px] max-h-[220px] overflow-y-auto text-xs text-foreground leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Tags Palette */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Tag className="w-3 h-3" /> Inserir Tag Rápida:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tText) => (
                  <button
                    key={tText}
                    type="button"
                    onClick={() => handleInsertTag(tText)}
                    className="px-2 py-1 rounded-md bg-muted/60 hover:bg-muted text-[11px] text-foreground border border-border hover:border-indigo-500/50 transition-colors"
                  >
                    + {tText}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Resumo do Horário Selecionado</span>
                <p className="font-bold text-foreground">
                  📅 {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                </p>
              </div>
              <Badge className="bg-indigo-600 text-white text-[11px]">
                {priority === 'high' ? '🔥 Urgente' : 'Normal'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-input"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 gap-2 shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            Confirmar Agendamento Prioritário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
