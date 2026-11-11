import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Wrench,
  CheckSquare,
  Square,
  PlusCircle,
  AlertTriangle,
  Video,
  PhoneForwarded,
  Users
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SalesScript } from '../types/dialerTypes';
import { useComercialLanguage } from '../utils/comercialI18n';
import {
  COMMERCIAL_PLAYBOOK_BY_LANG,
  resolveScriptPlaybookLang,
  type PlaybookLang
} from '../data/commercialPlaybookData';

interface SalesScriptCardProps {
  script?: SalesScript | null;
  allScripts?: SalesScript[];
  onSelectScript?: (scriptId: string) => void;
  companyName?: string;
  contactName?: string;
  activeOperatorLang?: string | null;
  onAppendToCallNotes?: (snippet: string) => void;
  isExpandedLayout?: boolean;
  onToggleExpandLayout?: () => void;
}

const UI_LABELS: Record<
  PlaybookLang,
  {
    subtitle: string;
    tabOpening: string;
    tabSpecialties: string;
    tabQuestions: string;
    tabObjections: string;
    tabClosing: string;
    suggestedSpeech: string;
    copyBtn: string;
    copiedToast: string;
    addedToNotesToast: string;
    sendToNotesBtn: string;
    badOrderLabel: string;
    goodOrderLabel: string;
    questionsToAskLabel: string;
    commonProjectTitle: string;
    specificQuestionsTitle: string;
    pillarRulesTitle: string;
    objectionsAccordionTitle: string;
    recommendedReply: string;
    closingPitchTitle: string;
    fiveContactsTitle: string;
    finalCheckTitle: string;
    postSaleTitle: string;
    selectSpecialtyHint: string;
    expandScript: string;
    collapseScript: string;
    switchScriptPlaceholder: string;
  }
> = {
  es: {
    subtitle: 'Procedimiento Comercial v0.17 • Guía Interactiva y Especialidades Técnicas',
    tabOpening: 'Apertura',
    tabSpecialties: 'Perfiles Técnicos',
    tabQuestions: 'Proyecto (7)',
    tabObjections: 'Objeciones y Reglas',
    tabClosing: 'Cierre y Control',
    suggestedSpeech: 'Discurso Principal con el Cliente',
    copyBtn: 'Copiar',
    copiedToast: '¡Copiado al portapapeles!',
    addedToNotesToast: '¡Checklist técnico añadido a las Notas de la Llamada!',
    sendToNotesBtn: 'Pasar a Notas de Llamada',
    badOrderLabel: '❌ Pedido Insuficiente (NO aceptar así)',
    goodOrderLabel: '✅ Pedido Bien Definido (Estándar Oficial)',
    questionsToAskLabel: 'Preguntas Obligatorias al Cliente (marca lo confirmado):',
    commonProjectTitle: 'Datos Comunes Obligatorios en TODOS los Proyectos',
    specificQuestionsTitle: 'Preguntas de Cualificación Comercial y Viabilidad',
    pillarRulesTitle: 'Reglas Operativas Clave (Turnos, EPIs, CVs y Coordinación)',
    objectionsAccordionTitle: 'Manejo de Objeciones y Respuestas Rápidas',
    recommendedReply: 'Argumento Recomendado:',
    closingPitchTitle: 'Cierre de Llamada y Siguiente Acción',
    fiveContactsTitle: '5 Contactos Obligatorios del Expediente',
    finalCheckTitle: 'Comprobación Final antes de Pasar Pedido',
    postSaleTitle: 'Guiones de Seguimiento (5–6h, Mensual, Sustituciones y Traslados)',
    selectSpecialtyHint: 'Selecciona el oficio que menciona el cliente para ver qué preguntar:',
    expandScript: 'Ampliar Guion',
    collapseScript: 'Vista Normal',
    switchScriptPlaceholder: 'Cambiar guion...',
  },
  fr: {
    subtitle: 'Procédure Commerciale v0.17 • Guide Interactif & Profils Techniques',
    tabOpening: 'Ouverture',
    tabSpecialties: 'Métiers (10)',
    tabQuestions: 'Projet (7)',
    tabObjections: 'Objections & Règles',
    tabClosing: 'Clôture & Suivi',
    suggestedSpeech: 'Discours Principal avec le Client',
    copyBtn: 'Copier',
    copiedToast: 'Copié dans le presse-papiers !',
    addedToNotesToast: 'Checklist technique ajoutée aux Notes d’Appel !',
    sendToNotesBtn: 'Ajouter aux Notes d’Appel',
    badOrderLabel: '❌ Demande Insuffisante (À proscrire)',
    goodOrderLabel: '✅ Demande Bien Définie (Standard Officiel)',
    questionsToAskLabel: 'Questions Techniques Obligatoires (cochez les points validés) :',
    commonProjectTitle: 'Informations Communes Obligatoires pour TOUS les Projets',
    specificQuestionsTitle: 'Questions de Qualification Commerciale & Viabilité',
    pillarRulesTitle: 'Règles Opérationnelles Clés (Nuit, EPI, CV & Coordination)',
    objectionsAccordionTitle: 'Traitement des Objections & Réponses Rapides',
    recommendedReply: 'Réponse Recommandée :',
    closingPitchTitle: 'Conclusion de l’Appel & Prochaine Étape',
    fiveContactsTitle: 'Les 5 Contacts Clés de la Commande',
    finalCheckTitle: 'Vérification Finale avant Validation',
    postSaleTitle: 'Scripts de Suivi (5–6h, Mensuel, Remplacements & Transferts)',
    selectSpecialtyHint: 'Cliquez sur le métier demandé par le client pour afficher les questions :',
    expandScript: 'Agrandir Script',
    collapseScript: 'Vue Normale',
    switchScriptPlaceholder: 'Changer de script...',
  },
  it: {
    subtitle: 'Procedura Commerciale v0.17 • Guida Interattiva & Profili Tecnici',
    tabOpening: 'Apertura',
    tabSpecialties: 'Profili Tecnici',
    tabQuestions: 'Commessa (7)',
    tabObjections: 'Obiezioni & Regole',
    tabClosing: 'Chiusura & Controllo',
    suggestedSpeech: 'Discorso Principale con il Cliente',
    copyBtn: 'Copia',
    copiedToast: 'Copiato negli appunti!',
    addedToNotesToast: 'Checklist tecnica aggiunta alle Note della Chiamata!',
    sendToNotesBtn: 'Inserisci nelle Note Chiamata',
    badOrderLabel: '❌ Richiesta Insufficiente (NON accettare così)',
    goodOrderLabel: '✅ Richiesta Ben Definita (Standard Ufficiale)',
    questionsToAskLabel: 'Domande Tecniche Obbligatorie (spunta i punti confermati):',
    commonProjectTitle: 'Dati Comuni Obbligatori per TUTTE le Commesse',
    specificQuestionsTitle: 'Domande di Qualifica Commerciale & Fattibilità',
    pillarRulesTitle: 'Regole Operative Chiave (Notturno, DPI, CV & Coordinamento)',
    objectionsAccordionTitle: 'Gestione Obiezioni & Risposte Rapide',
    recommendedReply: 'Risposta Consigliata:',
    closingPitchTitle: 'Chiusura Chiamata & Prossimo Passo',
    fiveContactsTitle: 'I 5 Referenti Obbligatori dell’Ordine',
    finalCheckTitle: 'Controllo Finale prima del Rilascio Ordine',
    postSaleTitle: 'Script Post-Vendita (5–6h, Mensile, Sostituzioni & Spostamenti)',
    selectSpecialtyHint: 'Seleziona la qualifica richiesta dal cliente per vedere cosa chiedere:',
    expandScript: 'Espandi Guida',
    collapseScript: 'Vista Normale',
    switchScriptPlaceholder: 'Cambia script...',
  },
};

export function SalesScriptCard({
  script,
  allScripts = [],
  onSelectScript,
  companyName = 'su empresa',
  contactName = 'Responsable',
  activeOperatorLang,
  onAppendToCallNotes,
  isExpandedLayout = false,
  onToggleExpandLayout,
}: SalesScriptCardProps) {
  const { lang: uiLang } = useComercialLanguage(activeOperatorLang);

  const playbookLang: PlaybookLang = useMemo(
    () => resolveScriptPlaybookLang(script?.sector, script?.title, activeOperatorLang || uiLang),
    [script?.sector, script?.title, activeOperatorLang, uiLang]
  );

  const playbook = COMMERCIAL_PLAYBOOK_BY_LANG[playbookLang];
  const labels = UI_LABELS[playbookLang];

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('soldador');
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [checkedFinalItems, setCheckedFinalItems] = useState<Record<number, boolean>>({});
  const [openObjectionIndex, setOpenObjectionIndex] = useState<number | null>(0);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const selectedSpecialty = useMemo(
    () => playbook.specialties.find(s => s.id === selectedSpecialtyId) || playbook.specialties[0],
    [playbook.specialties, selectedSpecialtyId]
  );

  const replaceVars = (text: string) =>
    (text || '')
      .replace(/\{empresa\}/gi, companyName)
      .replace(/\{\{company_name\}\}/gi, companyName)
      .replace(/\{contato\}/gi, contactName)
      .replace(/\{contacto\}/gi, contactName);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(labels.copiedToast);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSpecialtyQuestion = (qKey: string) => {
    setCheckedQuestions(prev => ({ ...prev, [qKey]: !prev[qKey] }));
  };

  const handleSendSpecialtyToNotes = () => {
    const selectedQs = selectedSpecialty.questions.filter((_, idx) => checkedQuestions[`${selectedSpecialty.id}-${idx}`]);
    const listToExport = selectedQs.length > 0 ? selectedQs : selectedSpecialty.questions;
    const formatted = `[${selectedSpecialty.title}]\n` + listToExport.map(q => `• ${q}`).join('\n');

    if (onAppendToCallNotes) {
      onAppendToCallNotes(formatted);
      toast.success(labels.addedToNotesToast);
    } else {
      handleCopy(formatted, `spec-notes-${selectedSpecialty.id}`);
    }
  };

  const formattedOpening = script?.pitch_opening
    ? replaceVars(script.pitch_opening)
    : replaceVars(playbook.openingVariants.gatekeeperPitch);

  const heroImageUrl = script?.image_url || selectedSpecialty.imageUrl || '/assets/images/luminous/hero-welder.jpg';

  const questionsList = useMemo(() => {
    if (script?.qualifying_questions && script.qualifying_questions.length > 0) {
      return script.qualifying_questions;
    }
    return [
      {
        question:
          playbookLang === 'fr'
            ? 'Avez-vous des chantiers, pics d’activité ou arrêts techniques prévus sur les prochaines semaines ?'
            : playbookLang === 'it'
            ? 'Avete commesse, picchi produttivi o fermate tecniche previste nelle prossime settimane?'
            : '¿Tenéis obras, picos de taller o paradas técnicas previstas para las próximas semanas?',
        goal: playbookLang === 'fr' ? 'Identifier la demande' : playbookLang === 'it' ? 'Mappare domanda' : 'Detectar demanda real',
      },
      {
        question:
          playbookLang === 'fr'
            ? 'Quels métiers précis recherchez-vous (soudeurs TIG/MIG, tuyauteurs, chaudronniers, usineurs CNC) ?'
            : playbookLang === 'it'
            ? 'Quali profili tecnici utilizzate maggiormente (saldatori TIG/MIG, tubisti, carpentieri, operatori CNC)?'
            : '¿Qué perfiles soléis reforzar más: soldadores TIG/MIG, tuberos, caldereros, montadores o mecanizado CNC?',
        goal: playbookLang === 'fr' ? 'Cibler le métier' : playbookLang === 'it' ? 'Qualificare profilo' : 'Clasificar especialidad',
      },
      {
        question:
          playbookLang === 'fr'
            ? 'Qui valide techniquement les CV et les propositions tarifaires dans votre organisation ?'
            : playbookLang === 'it'
            ? 'Chi valida tecnicamente i CV e i preventivi all’interno della vostra azienda?'
            : '¿Quién aprueba en vuestro equipo las subcontratas, los presupuestos y la validación técnica de los currículos?',
        goal: playbookLang === 'fr' ? 'Identifier décideur' : playbookLang === 'it' ? 'Individuare decisore' : 'Confirmar decisor',
      },
    ];
  }, [script?.qualifying_questions, playbookLang]);

  const objectionsList = useMemo(() => {
    if (script?.objections_guide && script.objections_guide.length > 0) {
      return script.objections_guide;
    }
    if (playbookLang === 'fr') {
      return [
        {
          objection: 'Nous travaillons déjà avec nos fournisseurs / agences habituels',
          response:
            'C’est parfait. Notre objectif n’est pas de remplacer vos partenaires actuels, mais d’être référencés comme solution technique spécialisée lorsque vous avez besoin de soudeurs qualifiés, tuyauteurs ou tourneurs CNC avec hébergement et mobilité gérés à 100%.',
        },
        {
          objection: 'Quels sont vos tarifs horaires ? (Jour / Nuit)',
          response:
            'Nos tarifs horaires tout compris (salaire, charges, logement, transport et EPI standards) s’adaptent au métier et à l’autonomie exigée. Pour le travail de nuit, la majoration standard est de +1,50 €/h. Dès que nous précisons le métier exact, je vous prépare un chiffrage sur mesure.',
        },
        {
          objection: 'Pouvez-vous me bloquer ces CV pour dans deux semaines ?',
          response:
            'Nos meilleurs profils étant très sollicités, leur disponibilité évolue chaque jour. Je vous envoie les CV immédiatement pour validation sous 24h (suivi max 48h), et nous reconfirmons leur disponibilité dès votre accord.',
        },
      ];
    }
    if (playbookLang === 'it') {
      return [
        {
          objection: 'Collaboriamo già con altri fornitori abituali',
          response:
            'Ottimo. Non vogliamo sostituire i vostri partner attuali, ma affiancarvi come fornitore tecnico specializzato quando vi servono saldatori qualificati, tubisti, carpentieri o tornitori CNC già attrezzati con alloggio e trasporto inclusi.',
        },
        {
          objection: 'Quali sono le vostre tariffe orarie? (Diurno / Notturno)',
          response:
            'La tariffa oraria tutto incluso (retribuzione, contributi, alloggio, trasporti e DPI base) dipende dalla qualifica tecnica richiesta. Per il turno notturno si applica +1,50 €/h come regola generale. Se definiamo i requisiti tecnici, le invio subito un preventivo preciso.',
        },
        {
          objection: 'Potete tenermi bloccati i profili per la prossima settimana?',
          response:
            'La disponibilità dei tecnici specializzati cambia rapidamente: inviamo subito i CV chiedendo un riscontro entro 24 ore (massimo 48 ore) senza promessa di blocco, e riconfermiamo subito la disponibilità appena approvati.',
        },
      ];
    }
    return [
      {
        objection: 'Ya trabajamos con otros proveedores o ETT habituales',
        response:
          'Excelente. No buscamos sustituir a vuestros proveedores actuales, sino estar homologados como vuestro respaldo especialista cuando tengáis un pico exigente de soldadores TIG/MIG, tuberos de isométrico, caldereros o CNC con alojamiento y transporte ya resueltos.',
      },
      {
        objection: '¿Cuáles son vuestras tarifas por hora y recargo nocturno?',
        response:
          'La tarifa todo incluido (personal en plantilla, Seguridad Social, alojamiento, transporte y EPIs básicos) depende de la especialidad y autonomía real. En turno de noche se aplica +1,50 €/h como norma general (ej. 27,00€ → 28,50€). Si concretamos el perfil técnico, te preparo presupuesto exacto hoy mismo.',
      },
      {
        objection: 'Solo mándame precio genérico para “un soldador / un montador”',
        response:
          'Para darte la tarifa justa y acertar a la primera sin sustituciones, necesito confirmar en 1 minuto proceso, material/espesor y tareas reales. Así Contratación selecciona exactamente el oficial que encaja en tu taller u obra.',
      },
      {
        objection: '¿Me podéis reservar estos currículos varios días mientras lo pensamos?',
        response:
          'La disponibilidad de los oficiales cualificados cambia a diario, por lo que no podemos prometer reserva sin confirmación. Os enviamos los CVs hoy mismo para revisarlos en 24h (máximo 48h) y, en cuanto los aprobéis, reconfirmamos disponibilidad inmediata.',
      },
    ];
  }, [script?.objections_guide, playbookLang]);

  return (
    <div className="rounded-2xl bg-card border border-border shadow-md overflow-hidden flex flex-col h-full">
      {/* Visual Hero Header with Industrial Photography */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 dark:opacity-30 transition-all duration-500"
          style={{ backgroundImage: `url('${heroImageUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-indigo-950/85 to-slate-900/80" />

        <div className="relative z-10 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  {script?.title ||
                    (playbookLang === 'fr'
                      ? 'Script Officiel — Prospection & Profils Techniques'
                      : playbookLang === 'it'
                      ? 'Script Ufficiale — Prospezione & Profili Tecnici'
                      : 'Guion Oficial — Prospección & Perfiles Técnicos')}
                </h3>
                <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[10px] font-bold">
                  {playbook.dailyGoalBadge}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300 truncate">{labels.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {allScripts.length > 1 && onSelectScript && (
              <select
                value={script?.id || ''}
                onChange={e => e.target.value && onSelectScript(e.target.value)}
                className="h-8 rounded-lg bg-slate-900/90 border border-slate-600 text-white text-xs px-2.5 font-semibold max-w-[230px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                title={labels.switchScriptPlaceholder}
              >
                {allScripts.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title}
                  </option>
                ))}
              </select>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImageZoomOpen(true)}
              className="h-8 px-2.5 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
            </Button>

            {onToggleExpandLayout && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleExpandLayout}
                className="h-8 px-2.5 text-[11px] font-bold bg-indigo-500/30 hover:bg-indigo-500/50 text-white border-indigo-400/40 gap-1.5"
              >
                {isExpandedLayout ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">{labels.collapseScript}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">{labels.expandScript}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs defaultValue="opening" className="flex-1 flex flex-col">
        <div className="px-3 pt-2.5 pb-2 border-b border-border bg-muted/30">
          <TabsList className="grid grid-cols-5 bg-muted/80 border border-border p-1 rounded-xl h-auto gap-1">
            <TabsTrigger
              value="opening"
              className="py-2 px-2 text-xs font-bold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.tabOpening}</span>
            </TabsTrigger>

            <TabsTrigger
              value="specialties"
              className="py-2 px-2 text-xs font-bold rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.tabSpecialties}</span>
            </TabsTrigger>

            <TabsTrigger
              value="questions"
              className="py-2 px-2 text-xs font-bold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.tabQuestions}</span>
            </TabsTrigger>

            <TabsTrigger
              value="objections"
              className="py-2 px-2 text-xs font-bold rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.tabObjections}</span>
            </TabsTrigger>

            <TabsTrigger
              value="closing"
              className="py-2 px-2 text-xs font-bold rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.tabClosing}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: APERTURA & FLUJO DE CONVERSACIÓN                             */}
        {/* =================================================================== */}
        <TabsContent value="opening" className="p-4 lg:p-5 flex-1 overflow-y-auto space-y-4 m-0 max-h-[72vh]">
          {/* Core Golden Principle Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 leading-snug">
              {playbook.corePrinciple}
            </p>
          </div>

          {/* Main Pitch Speech Card */}
          <div className="p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/5 border-2 border-indigo-500/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                🎙️ {labels.suggestedSpeech}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(formattedOpening, 'opening')}
                className="h-7 text-xs border-indigo-500/30 hover:bg-indigo-500/10 gap-1 font-semibold"
              >
                {copiedKey === 'opening' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {labels.copyBtn}
              </Button>
            </div>

            <p className="text-sm lg:text-[15px] text-foreground leading-relaxed font-medium select-text">
              “{formattedOpening}”
            </p>

            <div className="pt-2 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>💡 {playbook.openingVariants.decisorNote}</span>
              <button
                type="button"
                onClick={() => setShowGatekeeper(prev => !prev)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <PhoneForwarded className="w-3 h-3" />
                {playbook.openingVariants.gatekeeperTitle}
                {showGatekeeper ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showGatekeeper && (
              <div className="p-3 rounded-xl bg-background/90 border border-border text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {playbook.openingVariants.gatekeeperTitle}
                </span>
                <p className="text-foreground italic leading-relaxed">
                  “{replaceVars(playbook.openingVariants.gatekeeperPitch)}”
                </p>
              </div>
            )}
          </div>

          {/* Client with Doubts -> Video Call Option */}
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                {playbook.openingVariants.videoCallTitle}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(playbook.openingVariants.videoCallPitch, 'videocall')}
                className="h-6 text-[11px] text-teal-700 dark:text-teal-300"
              >
                {copiedKey === 'videocall' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 mr-1" />}
                {labels.copyBtn}
              </Button>
            </div>
            <p className="text-xs text-foreground/90 italic leading-relaxed">
              “{playbook.openingVariants.videoCallPitch}”
            </p>
          </div>

          {/* 3-Phase Visual Workflow Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {playbook.workflowPhases.map((phase, i) => {
              const colorStyles =
                phase.color === 'blue'
                  ? 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300'
                  : phase.color === 'amber'
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
                  : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';

              return (
                <div key={i} className={`p-3.5 rounded-xl border ${colorStyles} space-y-2`}>
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-85">{phase.step}</div>
                  <div className="text-xs font-bold text-foreground">{phase.title}</div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    {phase.items.map((it, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="font-bold text-foreground">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: CATÁLOGO INTERACTIVO DE 10 PERFILES TÉCNICOS                 */}
        {/* =================================================================== */}
        <TabsContent value="specialties" className="p-4 lg:p-5 flex-1 overflow-y-auto space-y-4 m-0 max-h-[72vh]">
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              {labels.selectSpecialtyHint}
            </span>

            {/* Visual Grid of 10 Industrial Profiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {playbook.specialties.map(spec => {
                const isSelected = spec.id === selectedSpecialty.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSelectedSpecialtyId(spec.id)}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-[1.01] font-bold'
                        : 'bg-muted/40 hover:bg-muted text-foreground border-border font-semibold'
                    }`}
                  >
                    <span className="text-base shrink-0">{spec.emoji}</span>
                    <span className="text-[11px] leading-tight line-clamp-2">{spec.title.split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Specialty Illustrated Card */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-card overflow-hidden shadow-sm">
            {/* Specialty Banner with Photo */}
            <div className="relative h-24 overflow-hidden flex items-end p-4">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${selectedSpecialty.imageUrl}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-900/40" />
              <div className="relative z-10 flex items-center justify-between w-full gap-3">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <span>{selectedSpecialty.emoji}</span>
                    <span>{selectedSpecialty.title}</span>
                  </h4>
                  <p className="text-xs text-amber-200 font-medium">{selectedSpecialty.shortDesc}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendSpecialtyToNotes}
                  className="h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 shrink-0 shadow-md"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {labels.sendToNotesBtn}
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Bad vs Good Request Visual Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 block">
                    {labels.badOrderLabel}
                  </span>
                  <p className="text-xs text-foreground font-medium italic">{selectedSpecialty.badExample}</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                    {labels.goodOrderLabel}
                  </span>
                  <p className="text-xs text-foreground font-semibold">{selectedSpecialty.goodExample}</p>
                </div>
              </div>

              {/* Interactive Checklist of Questions for this Profile */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-foreground block">
                  {labels.questionsToAskLabel}
                </span>
                <div className="space-y-1.5">
                  {selectedSpecialty.questions.map((qText, idx) => {
                    const qKey = `${selectedSpecialty.id}-${idx}`;
                    const isChecked = !!checkedQuestions[qKey];
                    return (
                      <div
                        key={qKey}
                        onClick={() => toggleSpecialtyQuestion(qKey)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground'
                            : 'bg-muted/30 hover:bg-muted/60 border-border text-foreground'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs leading-relaxed font-medium">{qText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Critical Operational Rule for this Specialty */}
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200 leading-relaxed">
                  {selectedSpecialty.criticalRule}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: DATOS COMUNES DE PROYECTO (7) & CUALIFICACIÓN                */}
        {/* =================================================================== */}
        <TabsContent value="questions" className="p-4 lg:p-5 flex-1 overflow-y-auto space-y-5 m-0 max-h-[72vh]">
          {/* 7 Mandatory Common Project Data */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              📋 {labels.commonProjectTitle}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {playbook.commonProjectFields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors space-y-1"
                >
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>{field.icon}</span>
                    <span>{field.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{field.question}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Specific Qualifying Questions */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              🎯 {labels.specificQuestionsTitle}
            </h4>
            <div className="space-y-2">
              {questionsList.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-start justify-between gap-3"
                >
                  <span className="text-xs sm:text-[13px] font-bold text-foreground leading-snug">
                    {idx + 1}. {q.question}
                  </span>
                  <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] shrink-0">
                    {q.goal}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: OBJECIONES & REGLAS OPERATIVAS (NOCHE, EPIS, CVS)            */}
        {/* =================================================================== */}
        <TabsContent value="objections" className="p-4 lg:p-5 flex-1 overflow-y-auto space-y-5 m-0 max-h-[72vh]">
          {/* 4 Operational Pillar Cards */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              ⚡ {labels.pillarRulesTitle}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {playbook.pillarRules.map(rule => {
                const cardStyle =
                  rule.colorClass === 'indigo'
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : rule.colorClass === 'amber'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : rule.colorClass === 'rose'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30';

                return (
                  <div key={rule.id} className={`p-3.5 rounded-xl border ${cardStyle} space-y-2`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <span>{rule.emoji}</span>
                        <span>{rule.title}</span>
                      </span>
                      <Badge className="bg-background/90 text-foreground border border-border text-[10px] font-bold">
                        {rule.highlight}
                      </Badge>
                    </div>
                    <ul className="space-y-1 text-[11px] text-foreground/90">
                      {rule.bullets.map((b, idx) => (
                        <li key={idx} className="leading-snug flex items-start gap-1.5">
                          <span className="font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objections Accordion */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              🛡️ {labels.objectionsAccordionTitle}
            </h4>
            {objectionsList.map((obj, idx) => {
              const isOpen = openObjectionIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-muted/40 border border-border overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenObjectionIndex(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-2 text-xs sm:text-[13px] font-bold text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      “{obj.objection}”
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="p-3.5 pt-2 border-t border-border/60 bg-background/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400">
                          {labels.recommendedReply}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(obj.response, `obj-${idx}`)}
                          className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                        >
                          {copiedKey === `obj-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {labels.copyBtn}
                        </Button>
                      </div>
                      <p className="text-xs sm:text-[13px] text-foreground leading-relaxed font-medium">
                        “{obj.response}”
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 5: CIERRE, 5 CONTACTOS, CHECKLIST FINAL Y POST-VENTA            */}
        {/* =================================================================== */}
        <TabsContent value="closing" className="p-4 lg:p-5 flex-1 overflow-y-auto space-y-5 m-0 max-h-[72vh]">
          {/* Main Closing Pitch */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                🎯 {labels.closingPitchTitle}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopy(
                    replaceVars(
                      script?.closing_pitch ||
                        'Con estos datos técnicos paso ahora mismo la solicitud a Contratación para enviarte los currículos y el presupuesto detallado. Recuerda que en cuanto nos confirmes los perfiles en 24h dejamos coordinada la incorporación.'
                    ),
                    'closing'
                  )
                }
                className="h-7 text-xs text-emerald-700 dark:text-emerald-300 gap-1"
              >
                {copiedKey === 'closing' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {labels.copyBtn}
              </Button>
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              “
              {replaceVars(
                script?.closing_pitch ||
                  'Con estos datos técnicos paso ahora mismo la solicitud a Contratación para enviarte los currículos y el presupuesto detallado. Recuerda que en cuanto nos apruebes los CVs (idealmente en 24h) reconfirmamos disponibilidad y activamos la incorporación.'
              )}
              ”
            </p>
          </div>

          {/* 5 Mandatory Order Contacts */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              {labels.fiveContactsTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {playbook.orderContacts.map((ct, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-muted/40 border border-border space-y-0.5">
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{ct.role}</div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{ct.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final 5-Point Commercial Verification Checklist */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              ✅ {labels.finalCheckTitle}
            </h4>
            <div className="space-y-1.5">
              {playbook.finalChecklist.map((chk, idx) => {
                const done = !!checkedFinalItems[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => setCheckedFinalItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    className="flex items-start gap-2 cursor-pointer text-xs text-foreground hover:opacity-90"
                  >
                    {done ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span className={done ? 'line-through opacity-75' : 'font-medium'}>{chk}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Post-Sale, Substitutions & Transfers Quick Scripts */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              🔄 {labels.postSaleTitle}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                {
                  key: 'ps-1',
                  title: playbook.postSaleScripts.firstDayTitle,
                  body: replaceVars(playbook.postSaleScripts.firstDayDesc),
                },
                {
                  key: 'ps-2',
                  title: playbook.postSaleScripts.monthlyTitle,
                  body: replaceVars(playbook.postSaleScripts.monthlyScript),
                },
                {
                  key: 'ps-3',
                  title: playbook.postSaleScripts.substitutionTitle,
                  body: replaceVars(playbook.postSaleScripts.substitutionScript),
                },
                {
                  key: 'ps-4',
                  title: playbook.postSaleScripts.transferTitle,
                  body: replaceVars(playbook.postSaleScripts.transferScript),
                },
              ].map(card => (
                <div key={card.key} className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-foreground">{card.title}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(card.body, card.key)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                    >
                      {copiedKey === card.key ? '✓' : labels.copyBtn}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Custom Rich HTML stored in DB */}
          {script?.rich_content_html && (
            <div className="pt-2 border-t border-border">
              <div
                className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-foreground leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: script.rich_content_html }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lightbox Modal for Support Image */}
      <Dialog open={isImageZoomOpen} onOpenChange={setIsImageZoomOpen}>
        <DialogContent className="sm:max-w-4xl bg-card border-border text-foreground p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">{script?.title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{labels.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl overflow-hidden bg-muted/40 border border-border flex items-center justify-center p-2 max-h-[75vh]">
            <img src={heroImageUrl} alt="Support Material" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
