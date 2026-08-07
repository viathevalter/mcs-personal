import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, FileText, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionWithJobFunction {
  jobFunctionId: string;
  jobFunctionName: string;
  questionId: string;
  questionText: string;
  questionType: 'short_text' | 'long_text' | 'number' | 'date' | 'boolean' | 'single_choice' | 'multi_choice';
  required: boolean;
  options: string[];
}

type SupportedLang = 'es' | 'pt' | 'en' | 'fr' | 'it';

const translations: Record<SupportedLang, {
  title: string;
  proposalCode: string;
  hello: string;
  introText: string;
  subIntroText: string;
  projectSummary: string;
  startDate: string;
  endDate: string;
  profiles: string;
  notSpecified: string;
  profileLabel: string;
  otherPlaceholder: string;
  booleanDetailsPlaceholder: string;
  submitBtn: string;
  submittingBtn: string;
  requiredError: string;
  successTitle: string;
  successHello: string;
  successBody1: string;
  successBody2: string;
  langLabel: string;
  technicalOfficial: string;
  selectDefault: string;
  yesOption: string;
  noOption: string;
}> = {
  pt: {
    title: 'Formulário Técnico de Requisitos',
    proposalCode: 'Proposta Comercial',
    hello: 'Olá',
    introText: 'Para darmos continuidade no processo de contratação dos profissionais relacionados aos perfis solicitados, por favor, responda a este formulário técnico para que possa nos passar todas as informações necessárias.',
    subIntroText: 'Com esses detalhes, nossa equipe de Recursos Humanos e Seleção buscará os profissionais com a qualificação perfeita para o seu projeto.',
    projectSummary: 'Resumo do Projeto',
    startDate: 'Data de Início Prevista',
    endDate: 'Data de Fim Prevista',
    profiles: 'Perfis Requeridos',
    notSpecified: 'Não especificado',
    profileLabel: 'Perfil',
    otherPlaceholder: 'Especifique a outra opção...',
    booleanDetailsPlaceholder: 'Descreva os detalhes e requisitos adicionais...',
    submitBtn: 'Enviar Respostas do Formulário',
    submittingBtn: 'Enviando Respostas...',
    requiredError: 'Por favor, responda à pergunta obrigatória: "{text}"',
    successTitle: 'Respostas Enviadas com Sucesso!',
    successHello: 'Olá {name}, agradecemos imensamente a sua colaboração.',
    successBody1: 'As especificações técnicas dos perfis solicitados foram salvas. Nossa equipe operacional de contratação já está trabalhando na busca dos profissionais perfeitos para o seu projeto.',
    successBody2: 'Você já pode fechar esta aba do seu navegador.',
    langLabel: 'Idioma',
    technicalOfficial: 'Formulário Técnico Oficial',
    selectDefault: 'Selecione uma opção...',
    yesOption: 'Sim',
    noOption: 'Não'
  },
  es: {
    title: 'Formulario Técnico de Requisitos',
    proposalCode: 'Propuesta Comercial',
    hello: 'Hola',
    introText: 'Para continuar con el proceso de contratación de los profesionales relacionados con los perfiles solicitados, por favor complete este formulario técnico para que pueda brindarnos toda la información necesaria.',
    subIntroText: 'Con estos detalles, nuestro equipo de Recursos Humanos y Selección buscará a los profesionales con la calificación perfecta para su proyecto.',
    projectSummary: 'Resumen del Proyecto',
    startDate: 'Fecha de Inicio Prevista',
    endDate: 'Fecha de Fin Prevista',
    profiles: 'Perfiles Requeridos',
    notSpecified: 'No especificado',
    profileLabel: 'Perfil',
    otherPlaceholder: 'Especifique la otra opción...',
    booleanDetailsPlaceholder: 'Describa los detalles y requisitos adicionales...',
    submitBtn: 'Enviar Respuestas del Formulario',
    submittingBtn: 'Enviando Respuestas...',
    requiredError: 'Por favor, responda a la pregunta obligatoria: "{text}"',
    successTitle: '¡Respuestas Enviadas con Éxito!',
    successHello: 'Hola {name}, agradecemos mucho su colaboración.',
    successBody1: 'Las especificaciones técnicas de los perfiles solicitados han sido guardadas. Nuestro equipo operativo de contratación ya está trabajando en la búsqueda de los profesionales perfectos para su proyecto.',
    successBody2: 'Ya puede cerrar esta pestaña de su navegador.',
    langLabel: 'Idioma',
    technicalOfficial: 'Formulario Técnico Oficial',
    selectDefault: 'Seleccione una opción...',
    yesOption: 'Sí',
    noOption: 'No'
  },
  en: {
    title: 'Technical Requirements Form',
    proposalCode: 'Commercial Proposal',
    hello: 'Hello',
    introText: 'To continue with the recruitment process for the professionals related to the requested profiles, please fill out this technical form so you can provide us with all the necessary details.',
    subIntroText: 'With these details, our Human Resources and Selection team will search for professionals with the perfect qualifications for your project.',
    projectSummary: 'Project Summary',
    startDate: 'Expected Start Date',
    endDate: 'Expected End Date',
    profiles: 'Required Profiles',
    notSpecified: 'Not specified',
    profileLabel: 'Profile',
    otherPlaceholder: 'Specify the other option...',
    booleanDetailsPlaceholder: 'Describe the details and additional requirements...',
    submitBtn: 'Submit Form Answers',
    submittingBtn: 'Submitting Answers...',
    requiredError: 'Please answer the required question: "{text}"',
    successTitle: 'Answers Submitted Successfully!',
    successHello: 'Hello {name}, thank you very much for your cooperation.',
    successBody1: 'The technical specifications for the requested profiles have been saved. Our operational recruitment team is already working to find the perfect professionals for your project.',
    successBody2: 'You can now close this browser tab.',
    langLabel: 'Language',
    technicalOfficial: 'Official Technical Form',
    selectDefault: 'Select an option...',
    yesOption: 'Yes',
    noOption: 'No'
  },
  fr: {
    title: 'Formulaire Technique d\'Exigences',
    proposalCode: 'Proposition Commerciale',
    hello: 'Bonjour',
    introText: 'Afin de poursuivre le processus de recrutement des professionnels correspondant aux profils demandés, veuillez remplir ce formulaire technique afin de nous fournir toutes les informations nécessaires.',
    subIntroText: 'Grâce à ces détails, notre équipe de Ressources Humaines et de Sélection recherchera les professionnels ayant la qualification parfaite pour votre projet.',
    projectSummary: 'Résumé du Projet',
    startDate: 'Date de Début Prévue',
    endDate: 'Date de Fin Prévue',
    profiles: 'Profils Requis',
    notSpecified: 'Non spécifié',
    profileLabel: 'Profil',
    otherPlaceholder: 'Précisez l\'autre option...',
    booleanDetailsPlaceholder: 'Décrivez les détails et exigences supplémentaires...',
    submitBtn: 'Envoyer les Réponses du Formulaire',
    submittingBtn: 'Envoi des Réponses...',
    requiredError: 'Veuillez répondre à la question obligatoire : "{text}"',
    successTitle: 'Réponses Envoyées avec Succès !',
    successHello: 'Bonjour {name}, nous vous remercions vivement pour votre collaboration.',
    successBody1: 'Les spécifications techniques des profils demandés ont été enregistrées. Notre équipe opérationnelle de recrutement travaille déjà à la recherche des professionnels parfaits pour votre projet.',
    successBody2: 'Vous pouvez maintenant fermer cet onglet de votre navigateur.',
    langLabel: 'Langue',
    technicalOfficial: 'Formulaire Technique Officiel',
    selectDefault: 'Sélectionnez une option...',
    yesOption: 'Oui',
    noOption: 'Non'
  },
  it: {
    title: 'Modulo Tecnico dei Requisiti',
    proposalCode: 'Offerta Commerciale',
    hello: 'Buongiorno',
    introText: 'Per proseguire con il processo di reclutamento dei professionisti relativi ai profili richiesti, La preghiamo di compilare questo modulo tecnico in modo da fornirci tutte le informazioni necessarie.',
    subIntroText: 'Grazie a questi dettagli, il nostro team di Risorse Umane e Selezione cercherà i professionisti con la qualifica perfetta per il Suo progetto.',
    projectSummary: 'Riepilogo del Progetto',
    startDate: 'Data di Inizio Prevista',
    endDate: 'Data di Fine Prevista',
    profiles: 'Profili Richiesti',
    notSpecified: 'Non specificato',
    profileLabel: 'Profilo',
    otherPlaceholder: 'Specificare l\'altra opzione...',
    booleanDetailsPlaceholder: 'Descrivere i dettagli e i requisiti aggiuntivi...',
    submitBtn: 'Invia le Risposte del Modulo',
    submittingBtn: 'Invio delle Risposte in corso...',
    requiredError: 'Si prega di rispondere alla domanda obbligatoria: "{text}"',
    successTitle: 'Risposte Inviate con Successo!',
    successHello: 'Buongiorno {name}, La ringraziamo molto per la Sua collaborazione.',
    successBody1: 'Le specifiche tecniche dei profili richiesti sono state salvate. Il nostro team operativo di reclutamento sta già lavorando alla ricerca dei professionisti perfetti per il Suo progetto.',
    successBody2: 'È possibile chiudere questa scheda del browser.',
    langLabel: 'Lingua',
    technicalOfficial: 'Modulo Tecnico Ufficiale',
    selectDefault: 'Selezionare un\'opzione...',
    yesOption: 'Sì',
    noOption: 'No'
  }
};

const translationDict: Record<string, { fr: string; pt: string; en: string; it: string }> = {
  // Question texts
  "¿Qué categoría necesita para este perfil?": {
    fr: "Quelle catégorie demandez-vous pour ce profil ?",
    pt: "Qual categoria você precisa para este perfil?",
    en: "What category do you need for this profile?",
    it: "Quale categoria è richiesta per questo profilo?"
  },
  "¿Qué material soldará principalmente?": {
    fr: "Quel matériau soudera-t-il principalement ?",
    pt: "Qual material soldará principalmente?",
    en: "What material will they weld mainly?",
    it: "Quale materiale salderà principalmente?"
  },
  "¿Qué fabricará o montará principalmente?": {
    fr: "Que fabriquerá ou montera-t-il principalement ?",
    pt: "O que fabricará ou montará principalmente?",
    en: "What will they fabricate or assemble mainly?",
    it: "Cosa fabbricherà o monterà principalmente?"
  },
  "¿Qué tipo de tubería realizará?": {
    fr: "Quel type de tuyauterie réalisera-t-il ?",
    pt: "Que tipo de tubulação executará?",
    en: "What type of piping will they work on?",
    it: "Che tipo di tubazioni eseguirà?"
  },
  "¿Desea indicar algún requisito o conocimiento adicional?": {
    fr: "Souhaitez-vous indiquer une exigence ou connaissance supplémentaire ?",
    pt: "Deseja indicar algum requisito ou conhecimento adicional?",
    en: "Would you like to indicate any additional requirements or skills?",
    it: "Desidera indicare requisiti o competenze aggiuntive?"
  },
  "¿Qué tipo de trabajo realizará?": {
    fr: "Quel type de travail réalisera-t-il ?",
    pt: "Qual tipo de trabalho realizará?",
    en: "What type of work will they perform?",
    it: "Che tipo di lavoro eseguirà?"
  },
  "¿Dónde desarrollará su trabajo?": {
    fr: "Où réalisera-t-il son travail ?",
    pt: "Onde desenvolverá o seu trabalho?",
    en: "Where will they work?",
    it: "Dove svolgerà il proprio lavoro?"
  },
  "¿En qué entorno trabajará?": {
    fr: "Dans quel environnement travaillera-t-il ?",
    pt: "Em qual ambiente trabalhará?",
    en: "In which environment will they work?",
    it: "In quale ambiente lavorerà?"
  },
  "¿Qué proceso de soldadura utilizará principalmente?": {
    fr: "Quel procédé de soudage utilisera-t-il principalement ?",
    pt: "Qual processo de soldagem utilizará principalmente?",
    en: "What welding process will they use mainly?",
    it: "Quale procedimento di saldatura utilizzerà principalmente?"
  },
  "¿Qué tipo de instalación realizará?": {
    fr: "Quel type d'installation réalisera-t-il ?",
    pt: "Qual tipo de instalação realizará?",
    en: "What type of installation will they perform?",
    it: "Che tipo di installazione eseguirà?"
  },
  "¿Sobre qué equipos trabajará principalmente?": {
    fr: "Sur quels équipements travaillera-t-il principalement ?",
    pt: "Em quais equipamentos trabalhará principalmente?",
    en: "Which equipment will they work on mainly?",
    it: "Su quali apparecchiature lavorerà principalmente?"
  },
  "¿Sobre qué trabajará principalmente?": {
    fr: "Sur quoi travaillera-t-il principalement ?",
    pt: "Em que trabalhará principalmente?",
    en: "What will they work on mainly?",
    it: "Su cosa lavorerà principalmente?"
  },
  "¿Qué conocimientos básicos necesita?": {
    fr: "Quelles connaissances de base sont requises ?",
    pt: "Quais conhecimentos básicos necessita?",
    en: "What basic knowledge is required?",
    it: "Quali conoscenze di base sono richieste?"
  },
  "¿Qué tipo de tubería soldará?": {
    fr: "Quel type de tuyauterie soudera-t-il ?",
    pt: "Que tipo de tubulação soldará?",
    en: "What type of piping will they weld?",
    it: "Che tipo di tubazioni salderà?"
  },
  "¿Qué tipo de encofrado realizará?": {
    fr: "Quel type de coffrage réalisera-t-il ?",
    pt: "Que tipo de cofragem realizará?",
    en: "What type of formwork will they perform?",
    it: "Che tipo di casseforme realizzerà?"
  },
  "¿Qué tipo de estructura montará?": {
    fr: "Quel type de structure montera-t-il ?",
    pt: "Que tipo de estrutura montará?",
    en: "What type of structure will they assemble?",
    it: "Che tipo di struttura monterà?"
  },
  "¿Qué tipo de piezas fabricará?": {
    fr: "Quel type de pièces fabriquerá-t-il ?",
    pt: "Que tipo de peças fabricará?",
    en: "What type of parts will they fabricate?",
    it: "Che tipo di pezzi fabbricherà?"
  },
  "¿Qué tipo de piezas soldará?": {
    fr: "Quel type de pièces soudera-t-il ?",
    pt: "Que tipo de peças soldará?",
    en: "What type of parts will they weld?",
    it: "Che tipo di pezzi salderà?"
  },
  "¿Qué tipo de plataforma utilizará?": {
    fr: "Quel type de plateforme utilisera-t-il ?",
    pt: "Que tipo de plataforma utilizará?",
    en: "What type of platform will they use?",
    it: "Che tipo di piattaforma utilizzerà?"
  },
  "¿Qué tipo de maquinaria utilizará?": {
    fr: "Quel type de machine utilisera-t-il ?",
    pt: "Que tipo de maquinário utilizará?",
    en: "What type of machinery will they use?",
    it: "Che tipo di macchinario utilizzerà?"
  },

  // Option choices
  "De primera": { fr: "Première / Qualifié(e)", pt: "De primeira", en: "First Class / Senior", it: "Specializzato / Di prima categoria" },
  "Ayudante": { fr: "Aide / Assistant(e)", pt: "Ajudante", en: "Helper / Junior", it: "Aiutante / Manovale" },
  "Oficial": { fr: "Ouvrier qualifié", pt: "Oficial", en: "Skilled worker", it: "Operaio qualificato" },
  "Acero inoxidable": { fr: "Acier inoxydable", pt: "Aço inoxidável", en: "Stainless steel", it: "Acciaio inossidabile" },
  "Acero al carbono": { fr: "Acier au carbone", pt: "Aço carbono", en: "Carbon steel", it: "Acciaio al carbonio" },
  "Aluminio": { fr: "Aluminium", pt: "Alumínio", en: "Aluminum", it: "Alluminio" },
  "Titanio": { fr: "Titane", pt: "Titânio", en: "Titanium", it: "Titanio" },
  "Fabricación": { fr: "Fabrication", pt: "Fabricação", en: "Fabrication", it: "Fabbricazione" },
  "Montaje": { fr: "Montage", pt: "Montagem", en: "Assembly", it: "Montaggio" },
  "Mantenimiento": { fr: "Maintenance", pt: "Manutenção", en: "Maintenance", it: "Manutenzione" },
  "Reparación": { fr: "Réparation", pt: "Reparação", en: "Repair", it: "Riparazione" },
  "Proceso": { fr: "Procédé / Process", pt: "Processo", en: "Process", it: "Processo / Impianto" },
  "Servicios": { fr: "Services / Utilités", pt: "Serviços", en: "Services", it: "Servizi / Utilities" },
  "Alta presión": { fr: "Haute pression", pt: "Alta pressão", en: "High pressure", it: "Alta pressione" },
  "Alimentaria": { fr: "Agroalimentaire", pt: "Alimentícia", en: "Food grade", it: "Alimentare" },
  "Farmacéutica": { fr: "Pharmaceutique", pt: "Farmacêutica", en: "Pharmaceutical", it: "Farmaceutico" },
  "Industrial": { fr: "Industrielle", pt: "Industrial", en: "Industrial", it: "Industriale" },
  "Taller": { fr: "Atelier", pt: "Oficina", en: "Workshop", it: "Officina" },
  "Obra": { fr: "Chantier", pt: "Obra", en: "Job site", it: "Cantiere" },
  "Instalaciones del cliente": { fr: "Installations du client", pt: "Instalações do cliente", en: "Client facilities", it: "Impianti del cliente" },
  "Oficinas": { fr: "Bureaux", pt: "Escritórios", en: "Offices", it: "Uffici" },
  "Estructuras metálicas": { fr: "Structures métalliques", pt: "Estruturas metálicas", en: "Metallic structures", it: "Carpenteria metallica / Strutture metalliche" },
  "Tuberías": { fr: "Tuyauteries", pt: "Tubulações", en: "Piping", it: "Tubazioni" },
  "Depósitos": { fr: "Réservoirs / Cuves", pt: "Tanques / Depósitos", en: "Tanks / Vessels", it: "Serbatoi di stoccaggio" },
  "Cuadros eléctricos": { fr: "Armoires électriques", pt: "Quadros elétricos", en: "Electrical panels", it: "Quadri elettrici" },
  "Cableado y bandejas": { fr: "Câblage et chemins de câbles", pt: "Cabeamento e calhas", en: "Wiring and trays", it: "Cablaggio e canaline" },
  "Motores y equipos": { fr: "Moteurs et équipements", pt: "Motores e equipamentos", en: "Motors and equipment", it: "Motori e apparecchiature" },
  "Electrodo": { fr: "Électrode", pt: "Eletrodo", en: "Electrode", it: "Elettrodo" },
  "Electrodos": { fr: "Électrodes", pt: "Eletrodos", en: "Electrodes", it: "Elettrodi" },
  "Otros": { fr: "Autres", pt: "Outros", en: "Others", it: "Altro" },
  "Otras": { fr: "Autres", pt: "Outras", en: "Others", it: "Altro" }
};

function translateText(text: string, targetLang: SupportedLang): string {
  if (!text || targetLang === 'es') return text;
  const match = translationDict[text.trim()];
  if (match && match[targetLang]) {
    return match[targetLang];
  }
  return text;
}

function isOtherOption(opt: string): boolean {
  if (!opt) return false;
  return /^(otros|otras|autres|autre|outros|outras|others|other|altro|altri)$/i.test(opt.trim());
}

function formatDateString(dateStr: string, lang: SupportedLang) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (lang === 'en') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function PublicTechnicalFormPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [estimacion, setEstimacion] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionWithJobFunction[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Set default language based on estimate or browser
  const [lang, setLang] = useState<SupportedLang>('es');

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setErrorMsg('ID do formulário não fornecido.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch estimate publically
        const { data: est, error: estError } = await supabase
          .schema('core_comercial')
          .from('estimaciones')
          .select(`
            *,
            versions:estimacion_versions!estimacion_versions_estimacion_id_fkey(
              *,
              items:estimacion_items(
                *,
                job_function:job_functions(id, code, name)
              )
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (estError) throw estError;
        if (!est) {
          setErrorMsg('Proposta comercial ou orçamento não encontrado.');
          setLoading(false);
          return;
        }

        setEstimacion(est);
        
        // Match default language (including FR and IT)
        const estLang = (est.document_language || 'es').toLowerCase();
        if (estLang === 'it' || estLang === 'italiano' || estLang === 'italian') {
          setLang('it');
        } else if (estLang === 'fr' || estLang === 'francais' || estLang === 'frances' || estLang === 'french') {
          setLang('fr');
        } else if (estLang === 'pt' || estLang === 'portugues') {
          setLang('pt');
        } else if (estLang === 'en' || estLang === 'english') {
          setLang('en');
        } else {
          setLang('es');
        }

        // Fetch client or lead details
        if (est.client_id) {
          const { data: cl } = await supabase.schema('core_common').from('clients').select('id, trade_name, legal_name, email').eq('id', est.client_id).maybeSingle();
          setClient(cl);
        }
        if (est.lead_id) {
          const { data: ld } = await supabase.schema('core_comercial').from('leads').select('id, name, company_name, email').eq('id', est.lead_id).maybeSingle();
          setLead(ld);
        }

        // Get active version items
        const activeVersion = est.versions?.find((v: any) => v.id === est.current_version_id) || est.versions?.[0];
        if (!activeVersion || !activeVersion.items || activeVersion.items.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch unique job function questions
        const uniqueJobFunctionIds = Array.from(new Set(activeVersion.items.map((item: any) => item.job_function_id))) as string[];
        
        const allQuestions: QuestionWithJobFunction[] = [];
        for (const jfId of uniqueJobFunctionIds) {
          const { data: jfQuestions } = await supabase
            .schema('core_comercial')
            .from('job_function_questions')
            .select('*')
            .eq('job_function_id', jfId)
            .eq('empresa_id', est.empresa_id)
            .neq('status', 'archived')
            .order('sort_order', { ascending: true });

          const jfName = activeVersion.items.find((item: any) => item.job_function_id === jfId)?.job_function?.name || 'Perfil';

          jfQuestions?.forEach((q: any) => {
            allQuestions.push({
              jobFunctionId: jfId,
              jobFunctionName: jfName,
              questionId: q.id,
              questionText: q.question_text,
              questionType: (q.question_type as any) || 'short_text',
              required: !!q.is_required,
              options: q.options || [],
            });
          });
        }

        setQuestions(allQuestions);

        // Pre-populate with existing answers if any
        const initialAnswers: Record<string, string> = {};
        allQuestions.forEach(q => {
          initialAnswers[q.questionId] = est.client_technical_answers?.[q.questionId] || (q.questionType === 'boolean' ? 'No' : '');
        });
        setAnswers(initialAnswers);

      } catch (err: any) {
        console.error('Error loading technical form:', err);
        setErrorMsg('Ocorreu um erro ao carregar os dados do formulário.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleToggleMultiChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const currentVal = prev[questionId] || '';
      const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
      let newList: string[];
      if (checked) {
        const alreadyHas = currentList.some(item => 
          item === option || 
          (isOtherOption(option) && (isOtherOption(item) || item.includes(':')))
        );
        if (!alreadyHas) {
          newList = [...currentList, option];
        } else {
          newList = currentList;
        }
      } else {
        newList = currentList.filter(item => 
          !(item === option || 
            (isOtherOption(option) && (isOtherOption(item) || item.includes(':'))))
        );
      }
      return {
        ...prev,
        [questionId]: newList.join(', '),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = translations[lang];

    // Validate required questions
    for (const q of questions) {
      const displayQuestionText = translateText(q.questionText, lang);
      const answerVal = answers[q.questionId];

      if (q.required && (!answerVal || answerVal.trim() === '')) {
        toast.error(t.requiredError.replace('{text}', displayQuestionText));
        return;
      }
    }

    setSubmitting(true);
    try {
      // Call public DDF function using rpc (public schema wrapper)
      const { error } = await supabase.rpc('save_client_technical_answers', {
        p_estimacion_id: id,
        p_answers: answers
      });

      if (error) throw error;
      setSuccess(true);
      toast.success(
        lang === 'it' ? 'Modulo tecnico inviato!' :
        lang === 'fr' ? 'Formulaire technique envoyé !' :
        lang === 'pt' ? 'Questionário técnico enviado!' :
        lang === 'en' ? 'Form submitted!' :
        '¡Formulario enviado!'
      );
    } catch (err: any) {
      console.error('Error submitting technical questions:', err);
      toast.error(
        lang === 'it' ? 'Errore durante l\'invio.' :
        lang === 'fr' ? 'Erreur lors de l\'envoi.' :
        lang === 'pt' ? 'Erro ao enviar respostas.' :
        lang === 'en' ? 'Submission error.' :
        'Error al enviar.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading form...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-800 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50 mb-2">Error</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const t = translations[lang];
  const clientName = client?.trade_name || client?.legal_name || lead?.company_name || lead?.name || 'Cliente';

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="inline-flex p-3 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 mb-2">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">{t.successTitle}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {t.successHello.replace('{name}', clientName)}
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {t.successBody1}
          </p>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-400">{t.successBody2}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-slate-50 to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Branding & Language Switcher */}
        <div className="flex items-center justify-between border-b pb-6 border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-wide">MCS</span>
              <span className="text-xs block text-slate-400 font-medium">GRUPO OPERACIONAL</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {(['es', 'pt', 'en', 'fr', 'it'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition duration-150 ${
                    lang === l 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-sm">
              <Globe className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider text-xs">{t.technicalOfficial}</span>
            </div>
          </div>
        </div>

        {/* Introduction & Project Summary Card */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600"></div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">
              {t.title}
            </h1>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {t.proposalCode}: {estimacion?.codigo}
            </p>
          </div>

          {/* Project Summary Grid */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.startDate}</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {estimacion?.expected_start_date ? formatDateString(estimacion.expected_start_date, lang) : t.notSpecified}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.endDate}</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {estimacion?.expected_end_date ? formatDateString(estimacion.expected_end_date, lang) : t.notSpecified}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.profiles}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(() => {
                  const activeVersion = estimacion?.versions?.find((v: any) => v.id === estimacion.current_version_id) || estimacion?.versions?.[0];
                  return (activeVersion?.items || []).map((item: any) => (
                    <span 
                      key={item.id} 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                    >
                      {item.quantity}x {item.job_function?.name}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            <p>{t.hello} <strong>{clientName}</strong>,</p>
            <p>{t.introText}</p>
            <p>{t.subIntroText}</p>
          </div>
        </div>

        {/* Dynamic Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {Array.from(new Set(questions.map(q => q.jobFunctionId))).map(jfId => {
            const jfQuestions = questions.filter(q => q.jobFunctionId === jfId);
            const jfName = jfQuestions[0]?.jobFunctionName;

            return (
              <div key={jfId} className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 p-6 sm:p-8 shadow-xl space-y-6">
                
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 border-b pb-3 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 mr-2.5"></span>
                  {t.profileLabel}: {jfName}
                </h3>
                
                <div className="space-y-6">
                  {jfQuestions.map(q => {
                    const displayQuestionText = translateText(q.questionText, lang);

                    return (
                      <div key={q.questionId} className="space-y-2.5">
                        <Label htmlFor={`q-${q.questionId}`} className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {displayQuestionText} {q.required && <span className="text-red-500 font-extrabold">*</span>}
                        </Label>

                        {q.questionType === 'long_text' ? (
                          <Textarea
                            id={`q-${q.questionId}`}
                            placeholder="..."
                            value={answers[q.questionId] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                            className="min-h-[70px] text-sm"
                          />
                        ) : q.questionType === 'date' ? (
                          <Input
                            id={`q-${q.questionId}`}
                            type="date"
                            value={answers[q.questionId] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                          />
                        ) : q.questionType === 'number' ? (
                          <Input
                            id={`q-${q.questionId}`}
                            type="number"
                            value={answers[q.questionId] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                          />
                        ) : q.questionType === 'boolean' ? (
                          <div className="space-y-2">
                            <select
                              id={`q-${q.questionId}`}
                              value={answers[q.questionId]?.startsWith('Si') ? 'Si' : 'No'}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-900"
                              onChange={e => {
                                const val = e.target.value;
                                setAnswers(prev => ({
                                  ...prev,
                                  [q.questionId]: val === 'Si' ? 'Si - ' : 'No'
                                }));
                              }}
                            >
                              <option value="No">{t.noOption}</option>
                              <option value="Si">{t.yesOption}</option>
                            </select>
                            {answers[q.questionId]?.startsWith('Si') && (
                              <Textarea
                                placeholder={t.booleanDetailsPlaceholder}
                                value={answers[q.questionId].startsWith('Si - ') ? answers[q.questionId].substring(5) : ''}
                                onChange={e => {
                                  const text = e.target.value;
                                  setAnswers(prev => ({
                                    ...prev,
                                    [q.questionId]: `Si - ${text}`
                                  }));
                                }}
                                className="min-h-[70px] text-sm mt-2"
                              />
                            )}
                          </div>
                        ) : q.questionType === 'single_choice' ? (
                          <div className="space-y-2">
                            <select
                              id={`q-${q.questionId}`}
                              value={
                                isOtherOption(answers[q.questionId] || '') ? 'Otros' :
                                (answers[q.questionId] || '')
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-900"
                              onChange={e => {
                                const val = e.target.value;
                                setAnswers(prev => ({
                                  ...prev,
                                  [q.questionId]: isOtherOption(val) ? 'Otros - ' : val
                                }));
                              }}
                            >
                              <option value="" disabled>{t.selectDefault}</option>
                              {(q.options || []).map((opt, idx) => (
                                <option key={idx} value={opt}>
                                  {translateText(opt, lang)}
                                </option>
                              ))}
                            </select>
                            {isOtherOption(answers[q.questionId] || '') && (
                              <Textarea
                                placeholder={t.otherPlaceholder}
                                value={answers[q.questionId]?.includes('- ') ? answers[q.questionId].split('- ')[1] : ''}
                                onChange={e => {
                                  const text = e.target.value;
                                  setAnswers(prev => ({
                                    ...prev,
                                    [q.questionId]: `Otros - ${text}`
                                  }));
                                }}
                                className="min-h-[70px] text-sm mt-2"
                              />
                            )}
                          </div>
                        ) : q.questionType === 'multi_choice' ? (
                          <div className="space-y-2.5 border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            {(q.options || []).map((opt, idx) => {
                              const currentVal = answers[q.questionId] || '';
                              const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
                              const isChecked = currentList.some(item => 
                                item === opt || 
                                (isOtherOption(opt) && (isOtherOption(item) || item.includes(':')))
                              );
                              return (
                                <div key={idx} className="flex items-center space-x-2.5">
                                  <input
                                    type="checkbox"
                                    id={`q-${q.questionId}-opt-${idx}`}
                                    checked={isChecked}
                                    onChange={e => handleToggleMultiChoice(q.questionId, opt, e.target.checked)}
                                    className="h-4 w-4 rounded border border-slate-350 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <label
                                    htmlFor={`q-${q.questionId}-opt-${idx}`}
                                    className="text-sm font-semibold leading-none cursor-pointer text-slate-700 dark:text-slate-300"
                                  >
                                    {translateText(opt, lang)}
                                  </label>
                                </div>
                              );
                            })}
                            {(() => {
                              const currentVal = answers[q.questionId] || '';
                              const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
                              const hasOtros = currentList.some(item => isOtherOption(item) || item.includes(':'));
                              
                              if (hasOtros) {
                                const otrosItem = currentList.find(item => isOtherOption(item) || item.includes(':')) || '';
                                let otrosText = '';
                                if (otrosItem.includes(':')) {
                                  otrosText = otrosItem.split(':')[1].trim();
                                }
                                
                                return (
                                  <Textarea
                                    placeholder={t.otherPlaceholder}
                                    value={otrosText}
                                    onChange={e => {
                                      const text = e.target.value;
                                      
                                      setAnswers(prev => {
                                        const cVal = prev[q.questionId] || '';
                                        const cList = cVal ? cVal.split(',').map(s => s.trim()) : [];
                                        const updatedList = cList.map(item => {
                                          if (isOtherOption(item) || item.includes(':')) {
                                            return text ? `Otros: ${text}` : 'Otros';
                                          }
                                          return item;
                                        });
                                        return { ...prev, [q.questionId]: updatedList.join(', ') };
                                      });
                                    }}
                                    className="min-h-[70px] text-sm mt-2"
                                  />
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <Input
                            id={`q-${q.questionId}`}
                            type="text"
                            placeholder="..."
                            value={answers[q.questionId] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

          {/* Submit Action */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.submittingBtn}
                </>
              ) : (
                t.submitBtn
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
