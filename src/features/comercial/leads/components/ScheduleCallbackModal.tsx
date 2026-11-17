import { useState, useRef, useEffect, useMemo } from 'react';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  startOfToday,
  parseISO,
} from 'date-fns';
import { es, fr, it, ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  Tag,
  Plus,
  X,
  Globe2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Lead } from '../../estimaciones/types';
import type { GlobalLeadAppointment } from '../types/dialerTypes';
import { extractTagsFromAppointment } from '../hooks/useDialer';
import { RichTextNotesEditor } from './RichTextNotesEditor';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';

interface ScheduleCallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  existingAppointment?: GlobalLeadAppointment | null;
  initialCallNotes?: string;
  overrideLang?: SupportedComercialLang | null;
  onConfirm: (
    scheduledDateIso: string,
    formattedNotes: string,
    priority: 'high' | 'normal' | 'low',
    tags: string[]
  ) => void;
  isSubmitting?: boolean;
}

const POPULAR_TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

const CUSTOM_TAGS_STORAGE_KEY = 'mcs_dialer_custom_callback_tags';

export function ScheduleCallbackModal({
  isOpen,
  onClose,
  lead,
  existingAppointment,
  initialCallNotes,
  overrideLang,
  onConfirm,
  isSubmitting = false,
}: ScheduleCallbackModalProps) {
  const { tr, lang } = useComercialLanguage(overrideLang);
  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : lang === 'es' ? es : ptBR;

  const quickTags = useMemo(
    () => [
      tr('Decisor em reunião', 'Decisor en reunión', 'Décideur en réunion', 'Decisore in riunione'),
      tr('Ligar à tarde', 'Llamar por la tarde', 'Appeler l’après-midi', 'Chiamare nel pomeriggio'),
      tr('Parada técnica', 'Parada técnica', 'Arrêt technique', 'Fermata tecnica'),
      tr('Aguardando compras', 'Esperando compras', 'En attente achats', 'In attesa acquisti'),
      tr('Pediu orçamento', 'Pidió presupuesto', 'A demandé un devis', 'Ha chiesto preventivo'),
      tr('Soldadores TIG/MIG', 'Soldadores TIG/MIG', 'Soudeurs TIG/MIG', 'Saldatori TIG/MIG'),
      tr('Tubistas / Montadores', 'Tuberos / Montadores', 'Tuyauteurs / Monteurs', 'Tubisti / Montatori'),
      tr('Urgente Obra', 'Urgente Obra', 'Urgent Chantier', 'Urgente Cantiere'),
    ],
    [tr]
  );

  // Calendar selection state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('high');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [savedCustomTags, setSavedCustomTags] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Rich Text Editor State
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorSessionId, setEditorSessionId] = useState<number>(0);
  const [editorHtml, setEditorHtml] = useState<string>('');

  const hasActiveExisting =
    Boolean(existingAppointment?.scheduled_for) && existingAppointment?.status === 'scheduled';

  // Hydrate all fields whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (existingAppointment?.scheduled_for) {
      try {
        const parsed = parseISO(existingAppointment.scheduled_for);
        setSelectedDate(parsed);
        setCurrentMonth(parsed);
        setSelectedTime(format(parsed, 'HH:mm'));
      } catch {
        const tomorrow = addDays(new Date(), 1);
        setSelectedDate(tomorrow);
        setCurrentMonth(tomorrow);
        setSelectedTime('10:00');
      }
      setPriority(existingAppointment.priority || 'high');
      setSelectedTags(
        extractTagsFromAppointment(existingAppointment.tags, existingAppointment.scheduled_notes)
      );
    } else {
      const tomorrow = addDays(new Date(), 1);
      setSelectedDate(tomorrow);
      setCurrentMonth(tomorrow);
      setSelectedTime('10:00');
      setPriority('high');
      setSelectedTags([]);
    }

    const baseExistingHtml = (existingAppointment?.scheduled_notes || '').trim();
    const cleanNewCallNote = (initialCallNotes || '').trim();

    let hydratedHtml = '';
    if (baseExistingHtml && cleanNewCallNote) {
      hydratedHtml = `${baseExistingHtml}<br/><div>${cleanNewCallNote.replace(/\n/g, '<br/>')}</div>`;
    } else if (baseExistingHtml) {
      hydratedHtml = baseExistingHtml;
    } else if (cleanNewCallNote) {
      hydratedHtml = `<div>${cleanNewCallNote.replace(/\n/g, '<br/>')}</div>`;
    } else {
      hydratedHtml = '';
    }

    setEditorHtml(hydratedHtml);
    setEditorSessionId((prev) => prev + 1);
  }, [isOpen, lead?.id]);

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const startOffset = (startDayOfWeek + 6) % 7;

  const handleApplyQuickSlot = (daysAhead: number, timeStr: string) => {
    const target = addDays(new Date(), daysAhead);
    setSelectedDate(target);
    setSelectedTime(timeStr);
    setCurrentMonth(target);
  };

  const handleInsertTag = (tagText: string) => {
    const cleanTag = `#${tagText.replace(/^#+/, '').trim()}`;
    setSelectedTags((prev) =>
      prev.includes(cleanTag) ? prev.filter((t) => t !== cleanTag) : [...prev, cleanTag]
    );
    if (editorRef.current && !editorRef.current.innerHTML.includes(cleanTag)) {
      const tagHtml = `<span style="background-color: #3b82f620; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f640; margin-right: 4px;">${cleanTag}</span> `;
      editorRef.current.innerHTML = `${tagHtml}${editorRef.current.innerHTML}`;
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const handleAddCustomTag = () => {
    const raw = customTagInput.replace(/^#+/, '').trim();
    if (!raw) return;
    const cleanTag = `#${raw}`;
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags((prev) => [...prev, cleanTag]);
    }
    if (!quickTags.includes(raw) && !savedCustomTags.includes(raw)) {
      const nextCustom = [...savedCustomTags, raw];
      setSavedCustomTags(nextCustom);
      try {
        localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(nextCustom));
      } catch {
        // ignore storage errors
      }
    }
    if (editorRef.current && !editorRef.current.innerHTML.includes(cleanTag)) {
      const tagHtml = `<span style="background-color: #3b82f620; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f640; margin-right: 4px;">${cleanTag}</span> `;
      editorRef.current.innerHTML = `${tagHtml}${editorRef.current.innerHTML}`;
      setEditorHtml(editorRef.current.innerHTML);
    }
    setCustomTagInput('');
    toast.success(
      tr(
        `Tag ${cleanTag} adicionada ao agendamento!`,
        `¡Etiqueta ${cleanTag} añadida al agendamiento!`,
        `Tag ${cleanTag} ajouté au rendez-vous !`,
        `Tag ${cleanTag} aggiunto all'appuntamento!`
      )
    );
  };

  const handleSave = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const combinedIso = new Date(`${dateStr}T${selectedTime}:00`).toISOString();
    const liveHtml = editorRef.current ? editorRef.current.innerHTML : editorHtml;
    const finalContent = liveHtml.trim();

    onConfirm(combinedIso, finalContent, priority, selectedTags);
  };

  const dayHeaders = useMemo(
    () => [
      tr('Seg', 'Lun', 'Lun', 'Lun'),
      tr('Ter', 'Mar', 'Mar', 'Mar'),
      tr('Qua', 'Mié', 'Mer', 'Mer'),
      tr('Qui', 'Jue', 'Jeu', 'Gio'),
      tr('Sex', 'Vie', 'Ven', 'Ven'),
      tr('Sáb', 'Sáb', 'Sam', 'Sab'),
      tr('Dom', 'Dom', 'Dim', 'Dom'),
    ],
    [tr]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                  {hasActiveExisting
                    ? tr(
                        'Atualizar Agendamento Global do Cliente',
                        'Actualizar Agendamiento Global del Cliente',
                        'Mettre à Jour le Rendez-vous Global du Client',
                        'Aggiorna Appuntamento Globale del Cliente'
                      )
                    : tr(
                        'Agendar Retorno Comercial (Global)',
                        'Agendar Llamada de Seguimiento (Global)',
                        'Planifier un Rappel Commercial (Global)',
                        'Pianifica Richiamo Commerciale (Globale)'
                      )}
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs gap-1">
                    <Globe2 className="w-3 h-3" />
                    {tr('Agendamento Único por Cliente', 'Cita Única por Cliente', 'RDV Unique par Client', 'Appuntamento Unico per Cliente')}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {lead
                    ? `${lead.company_name || lead.name} • ${lead.city || lead.province || ''}`
                    : tr(
                        'Selecione a data e registre as observações do compromisso',
                        'Seleccione la fecha y registre las observaciones de la cita',
                        'Sélectionnez la date et notez les instructions du rendez-vous',
                        "Seleziona la data e inserisci le note dell'appuntamento"
                      )}
                </DialogDescription>
              </div>
            </div>
          </div>

          {hasActiveExisting && existingAppointment && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5">
              <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {tr(
                    'Este cliente já possui um agendamento ativo! Ao confirmar, este mesmo agendamento será atualizado sem duplicar na Agenda.',
                    '¡Este cliente ya tiene un agendamiento activo! Al confirmar, se actualizará esta única cita sin duplicarse en la Agenda.',
                    'Ce client a déjà un rendez-vous actif ! En confirmant, cet unique rendez-vous sera mis à jour sans doublon.',
                    "Questo cliente ha già un appuntamento attivo! Confermando, verrà aggiornato quest'unico appuntamento senza creare duplicati."
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {tr('Atual:', 'Actual:', 'Actuel :', 'Attuale:')}{' '}
                  <strong>
                    {format(parseISO(existingAppointment.scheduled_for), 'dd/MM/yyyy HH:mm')}
                  </strong>
                  {existingAppointment.origin_campaign_title
                    ? ` • ${existingAppointment.origin_campaign_title}`
                    : ''}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Content Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Interactive Calendar & Time Slots (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                {tr(
                  'Atalhos Rápidos de Agendamento',
                  'Atajos Rápidos de Agendamiento',
                  'Raccourcis Rapides',
                  'Scorciatoie Rapide'
                )}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(0, '15:30')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Hoje à tarde', 'Hoy tarde', 'Cet après-midi', 'Oggi pomeriggio')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(1, '09:30')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Amanhã 09:30', 'Mañana 09:30', 'Demain 09:30', 'Domani 09:30')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(1, '15:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Amanhã 15:00', 'Mañana 15:00', 'Demain 15:00', 'Domani 15:00')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(2, '10:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Em 2 Dias', 'En 2 Días', 'Dans 2 Jours', 'Tra 2 Giorni')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(3, '11:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Em 3 Dias', 'En 3 Días', 'Dans 3 Jours', 'Tra 3 Giorni')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyQuickSlot(7, '10:00')}
                  className="h-8 text-[11px] bg-background border-input hover:bg-muted font-medium truncate"
                >
                  {tr('Próxima Semana', 'Próxima Semana', 'Semaine Prochaine', 'Prossima Settimana')}
                </Button>
              </div>
            </div>

            {/* Visual Month Calendar */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                {dayHeaders.map((dh, idx) => (
                  <span key={idx}>{dh}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
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
                  {tr('Horário do Compromisso', 'Horario de la Cita', 'Heure du Rendez-vous', "Orario dell'Appuntamento")}
                </Label>
                <div className="w-24">
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="h-8 text-xs font-mono font-bold text-center bg-background border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {POPULAR_TIMES.map((timeStr) => {
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
                {tr(
                  'Nível de Prioridade do Retorno',
                  'Nivel de Prioridad del Seguimiento',
                  'Niveau de Priorité du Rappel',
                  'Livello di Priorità del Richiamo'
                )}
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
                  {tr('Máxima', 'Máxima', 'Maximale', 'Massima')}
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
                  {tr('Normal', 'Normal', 'Normale', 'Normale')}
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
                  <span>⏳ {tr('Baixa', 'Baja', 'Basse', 'Bassa')}</span>
                </button>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {tr(
                  'Descrição & Instruções do Agendamento (Rich Text)',
                  'Descripción e Instrucciones de la Cita (Rich Text)',
                  'Description & Instructions du Rendez-vous (Rich Text)',
                  "Descrizione e Istruzioni dell'Appuntamento (Rich Text)"
                )}
              </Label>

              <RichTextNotesEditor
                editorKey={`schedule-modal-${lead?.id || 'none'}-${editorSessionId}`}
                initialHtml={editorHtml}
                onChange={setEditorHtml}
                editorRef={editorRef}
                overrideLang={overrideLang}
                placeholder={tr(
                  'Escreva o que combinou com o cliente (ex: falar com o responsável técnico sobre soldadores TIG)...',
                  'Escriba lo acordado con el cliente (ej: hablar con el responsable técnico sobre soldadores TIG)...',
                  'Notez ce qui a été convenu avec le client (ex : rappeler le responsable technique)...',
                  'Scrivi quanto concordato con il cliente (es: richiamare il responsabile tecnico)...'
                )}
              />
            </div>

            {/* Quick Tags Palette + Custom Tag Creator */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />{' '}
                  {tr(
                    'Tags do Agendamento (Filtro na Agenda):',
                    'Etiquetas de la Cita (Filtro en Agenda):',
                    'Tags du RDV (Filtre Agenda) :',
                    'Tag Appuntamento (Filtro Agenda):'
                  )}
                </span>
                {selectedTags.length > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedTags.length} {tr('selecionada(s)', 'seleccionada(s)', 'sélectionné(s)', 'selezionato/i')}
                  </span>
                )}
              </div>

              {/* Create Custom Tag Input */}
              <div className="flex items-center gap-1.5">
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder={tr(
                    'Criar nova tag (ex: Obra Bilbao, Ligar Sexta...)',
                    'Crear etiqueta (ej: Obra Bilbao, Llamar Viernes...)',
                    'Créer un tag (ex : Chantier Lyon, Rappeler Vendredi...)',
                    'Crea tag (es: Cantiere Milano, Richiamare Venerdì...)'
                  )}
                  className="h-8 text-xs bg-background border-input"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                  className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tr('Criar Tag', 'Crear', 'Créer', 'Crea')}
                </Button>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-indigo-600 text-white hover:bg-indigo-500 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                      onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                    >
                      {tag}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Quick & Saved Custom Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[...quickTags, ...savedCustomTags].map((tText) => {
                  const cleanTag = `#${tText.replace(/^#+/, '').trim()}`;
                  const isActive = selectedTags.includes(cleanTag);
                  return (
                    <button
                      key={tText}
                      type="button"
                      onClick={() => handleInsertTag(tText)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500 font-bold'
                          : 'bg-background hover:bg-muted text-foreground border-border hover:border-indigo-500/50'
                      }`}
                    >
                      {isActive ? `✓ ${cleanTag}` : `+ #${tText}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                  {tr('Resumo do Horário Selecionado', 'Resumen del Horario', 'Résumé du Créneau', 'Riepilogo Orario')}
                </span>
                <p className="font-bold text-foreground capitalize">
                  📅 {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: dateLocale })} • {selectedTime}
                </p>
              </div>
              <Badge className="bg-indigo-600 text-white text-[11px] shrink-0">
                {priority === 'high'
                  ? `🔥 ${tr('Urgente', 'Urgente', 'Urgent', 'Urgente')}`
                  : tr('Normal', 'Normal', 'Normal', 'Normale')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <Button type="button" variant="outline" onClick={onClose} className="border-input text-xs">
            {tr('Cancelar', 'Cancelar', 'Annuler', 'Annulla')}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 gap-2 shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            {hasActiveExisting
              ? tr(
                  'Atualizar Agendamento Global',
                  'Actualizar Cita Global',
                  'Mettre à Jour le RDV Global',
                  'Aggiorna Appuntamento Globale'
                )
              : tr(
                  'Confirmar Agendamento Global',
                  'Confirmar Cita Global',
                  'Confirmer le RDV Global',
                  'Conferma Appuntamento Globale'
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
