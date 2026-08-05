import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, User, Mail, Phone, Calendar, MapPin, Clock, Users, CheckCircle, Loader2, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';

const translations = {
  pt: {
    title: 'Solicitação de Orçamento',
    subtitle: 'Soluções de pessoal qualificado para indústria e construção',
    formHeading: 'Solicitação de Orçamento',
    formDesc: 'Por favor, preencha os detalhes do projeto abaixo para calcularmos uma proposta adequada.',
    secContact: 'Identificação da Empresa',
    lblCompanyName: 'Nome Comercial / Empresa *',
    phCompanyName: 'Ex: Oficina Metalúrgica S.A.',
    lblContactName: 'Pessoa de Contato *',
    phContactName: 'Ex: João Silva',
    lblEmail: 'Correio Eletrônico / E-mail *',
    phEmail: 'Ex: contacto@empresa.com',
    lblPhone: 'Telefone de Contato',
    phPhone: 'Ex: +351 900 000 000',
    secProfiles: 'Perfis Profissionais Requeridos',
    descProfiles: 'Selecione um ou vários perfis de operários que necessita para a sua obra.',
    secProject: 'Detalhes do Projeto / Obra',
    lblStartDate: 'Início do Projeto',
    lblEndDate: 'Fim Estimado / Duração',
    phEndDate: 'Ex: 3 meses / Dez 2026',
    lblWorkAddress: 'Endereço da obra e Código Postal',
    phWorkAddress: 'Ex: Av. da Indústria 14, CP 28050, Lisboa',
    lblDaysHours: 'Dias de trabalho e Horas previstas',
    phDaysHours: 'Ex: Seg a Sex, 8:00 às 17:00 (40h/sem)',
    lblWorkersCount: 'Quantidade de Operários',
    phWorkersCount: 'Ex: 5',
    lblEntryTime: 'Hora de entrada dos operários',
    phEntryTime: 'Ex: 08:00 (Ou o horário de turno)',
    btnSubmit: 'Solicitar Orçamento',
    btnSubmitting: 'Processando solicitação...',
    toastRequired: 'Por favor, preencha os campos obrigatórios do contato.',
    toastCompanyError: 'Não foi possível associar a solicitação com nenhuma empresa do grupo.',
    toastSuccess: 'Solicitação de orçamento enviada com sucesso!',
    toastError: 'Erro ao processar a solicitação.',
    successTitle: 'Solicitação Recebida!',
    successDesc: 'Registramos corretamente os dados do projeto. Nossa equipe comercial entrará em contato em breve para apresentar a proposta de orçamento detalhada.',
    successMetaEmpresa: 'Empresa:',
    successMetaContacto: 'Contato:',
    successMetaPerfiles: 'Perfis:',
    footerCopyright: 'LoginPro © Soluções de pessoal qualificado para indústria e construção',
    footerSecurity: 'Seus dados estão protegidos conforme a política de proteção de dados confidenciais.',
    loadingLead: 'Não foi possível carregar os dados do lead.',
    loadingForm: 'Carregando...',
    notSpecified: 'Não especificado',
    budgetHeader: '--- SOLICITAÇÃO DE ORÇAMENTO ---',
    perfilLabelSoldadores: 'Soldadores (todos os processos)',
    perfilLabelCaldereros: 'Caldeireiros',
    perfilLabelTuberos: 'Tubistas',
    perfilLabelElectricistas: 'Eletricistas',
    perfilLabelObraCivil: 'Construção civil',
    perfilLabelElectromecanicos: 'Eletromecânicos',
    perfilLabelMontadores: 'Montadores',
    perfilLabelOtros: 'Outros perfis'
  },
  es: {
    title: 'Solicitud de Presupuesto',
    subtitle: 'Soluciones de personal cualificado para industria y construcción',
    formHeading: 'Solicitud de Presupuesto',
    formDesc: 'Por favor, complete los detalles del proyecto abajo para que podamos calcular una propuesta ajustada.',
    secContact: 'Identificación de la Empresa',
    lblCompanyName: 'Nombre Comercial / Empresa *',
    phCompanyName: 'Ej: Talleres Metalúrgicos S.L.',
    lblContactName: 'Persona de Contacto *',
    phContactName: 'Ej: Juan Pérez',
    lblEmail: 'Correo Electrónico *',
    phEmail: 'Ej: contacto@empresa.com',
    lblPhone: 'Teléfono de Contacto',
    phPhone: 'Ej: +34 600 000 000',
    secProfiles: 'Perfiles Profesionales Requeridos',
    descProfiles: 'Seleccione uno o varios perfiles de operarios que necesita para su obra.',
    secProject: 'Detalles del Proyecto / Obra',
    lblStartDate: 'Inicio del Proyecto',
    lblEndDate: 'Final Estimado / Duración',
    phEndDate: 'Ej: 3 meses / Dic 2026',
    lblWorkAddress: 'Dirección de la obra y Código Postal',
    phWorkAddress: 'Ej: Av. de la Industria 14, CP 28050, Madrid',
    lblDaysHours: 'Días de trabajo y Horas previstas',
    phDaysHours: 'Ej: Lun a Vie, 8:00 a 17:00 (40h/sem)',
    lblWorkersCount: 'Cantidad de Operarios',
    phWorkersCount: 'Ej: 5',
    lblEntryTime: 'Hora de entrada de los operarios',
    phEntryTime: 'Ej: 08:00 (O el horario de relevo)',
    btnSubmit: 'Solicitar Presupuesto',
    btnSubmitting: 'Procesando solicitud...',
    toastRequired: 'Por favor, rellene los campos obligatorios del contacto.',
    toastCompanyError: 'No se ha podido asociar la solicitud con ninguna empresa del grupo.',
    toastSuccess: '¡Solicitud de presupuesto enviada con éxito!',
    toastError: 'Error al procesar la solicitud.',
    successTitle: '¡Solicitud Recibida!',
    successDesc: 'Hemos registrado correctamente los datos del proyecto. Nuestro equipo comercial se pondrá en contacto con usted a la brevedad para facilitarle la propuesta de presupuesto detallada.',
    successMetaEmpresa: 'Empresa:',
    successMetaContacto: 'Contacto:',
    successMetaPerfiles: 'Perfiles:',
    footerCopyright: 'LoginPro © Soluciones de personal cualificado para industria y construcción',
    footerSecurity: 'Sus datos están protegidos conforme a la política de protección de datos confidenciales.',
    loadingLead: 'No se pudieron cargar los datos del lead.',
    loadingForm: 'Cargando...',
    notSpecified: 'No especificado',
    budgetHeader: '--- SOLICITUD DE PRESUPUESTO ---',
    perfilLabelSoldadores: 'Soldadores (todos los procesos)',
    perfilLabelCaldereros: 'Caldereros',
    perfilLabelTuberos: 'Tuberos',
    perfilLabelElectricistas: 'Electricistas',
    perfilLabelObraCivil: 'Obra civil',
    perfilLabelElectromecanicos: 'Electromecánicos',
    perfilLabelMontadores: 'Montadores',
    perfilLabelOtros: 'Otros perfiles'
  },
  it: {
    title: 'Richiesta di Preventivo',
    subtitle: 'Soluzioni di personale qualificato per l\'industria e l\'edilizia',
    formHeading: 'Richiesta di Preventivo',
    formDesc: 'Si prega di compilare i dettagli del progetto qui sotto per consentirci di calcolare una proposta adeguata.',
    secContact: 'Identificazione dell\'Azienda',
    lblCompanyName: 'Nome Commerciale / Azienda *',
    phCompanyName: 'Es: Carpenteria Metallica S.R.L.',
    lblContactName: 'Persona di Contatto *',
    phContactName: 'Es: Mario Rossi',
    lblEmail: 'Indirizzo E-mail *',
    phEmail: 'Es: contatto@azienda.it',
    lblPhone: 'Telefono di Contatto',
    phPhone: 'Es: +39 02 1234567',
    secProfiles: 'Profili Professionali Richiesti',
    descProfiles: 'Selezionare uno o più profili di operai necessari per il cantiere.',
    secProject: 'Dettagli del Progetto / Cantiere',
    lblStartDate: 'Inizio del Progetto',
    lblEndDate: 'Fine Stimata / Durata',
    phEndDate: 'Es: 3 mesi / Dic 2026',
    lblWorkAddress: 'Indirizzo del cantiere e Codice Postale',
    phWorkAddress: 'Es: Via dell\'Industria 14, CAP 20121, Milano',
    lblDaysHours: 'Giorni di lavoro e Ore previste',
    phDaysHours: 'Es: Lun a Ven, 8:00 alle 17:00 (40h/sett)',
    lblWorkersCount: 'Quantità di Operai',
    phWorkersCount: 'Es: 5',
    lblEntryTime: 'Orario di ingresso degli operai',
    phEntryTime: 'Es: 08:00 (O l\'orario del turno)',
    btnSubmit: 'Richiedi Preventivo',
    btnSubmitting: 'Elaborazione della richiesta in corso...',
    toastRequired: 'Si prega di compilare i campi obbligatori del contatto.',
    toastCompanyError: 'Impossibile associare la richiesta a nessuna azienda del gruppo.',
    toastSuccess: 'Richiesta di preventivo inviata con successo!',
    toastError: 'Errore durante l\'elaborazione della richiesta.',
    successTitle: 'Richiesta Ricevuta!',
    successDesc: 'Abbiamo registrato correttamente i dati del progetto. Il nostro team commerciale vi contatterà al più presto per fornirvi la proposta di preventivo dettagliata.',
    successMetaEmpresa: 'Azienda:',
    successMetaContacto: 'Contatto:',
    successMetaPerfiles: 'Profili:',
    footerCopyright: 'LoginPro © Soluzioni di personale qualificato per l\'industria e l\'edilizia',
    footerSecurity: 'I vostri dati sono protetti in conformità con la politica di protezione dei dati riservati.',
    loadingLead: 'Impossibile caricare i dati del lead.',
    loadingForm: 'Caricamento...',
    notSpecified: 'Non specificato',
    budgetHeader: '--- RICHIESTA DI PREVENTIVO ---',
    perfilLabelSoldadores: 'Saldatori (tutti i processi)',
    perfilLabelCaldereros: 'Calderai',
    perfilLabelTuberos: 'Tubisti',
    perfilLabelElectricistas: 'Elettricisti',
    perfilLabelObraCivil: 'Edilizia civile',
    perfilLabelElectromecanicos: 'Elettromeccanici',
    perfilLabelMontadores: 'Montatori',
    perfilLabelOtros: 'Altri profili'
  },
  fr: {
    title: 'Demande de Devis',
    subtitle: 'Solutions de personnel qualifié pour l\'industrie et le bâtiment',
    formHeading: 'Demande de Devis',
    formDesc: 'Veuillez remplir les détails du projet ci-dessous afin que nous puissions calculer une proposition adaptée.',
    secContact: 'Identification de l\'Entreprise',
    lblCompanyName: 'Nom Commercial / Entreprise *',
    phCompanyName: 'Ex : Chaudronnerie Métallique S.A.S.',
    lblContactName: 'Personne de Contact *',
    phContactName: 'Ex : Jean Dupont',
    lblEmail: 'Adresse E-mail *',
    phEmail: 'Ex : contact@entreprise.fr',
    lblPhone: 'Téléphone de Contact',
    phPhone: 'Ex : +33 1 23 45 67 89',
    secProfiles: 'Profils Professionnels Requis',
    descProfiles: 'Sélectionnez un ou plusieurs profils d\'ouvriers dont vous avez besoin pour votre chantier.',
    secProject: 'Dettails du Projet / Chantier',
    lblStartDate: 'Début du Projet',
    lblEndDate: 'Fin Estimée / Durée',
    phEndDate: 'Ex : 3 mois / Déc 2026',
    lblWorkAddress: 'Adresse du chantier et Code Postal',
    phWorkAddress: 'Ex : Rue de l\'Industrie 14, CP 75001, Paris',
    lblDaysHours: 'Jours de travail et Heures prévues',
    phDaysHours: 'Ex : Lun au Ven, 8h00 à 17h00 (40h/sem)',
    lblWorkersCount: 'Nombre d\'Ouvriers',
    phWorkersCount: 'Ex : 5',
    lblEntryTime: 'Heure d\'arrivée des ouvriers',
    phEntryTime: 'Ex : 08h00 (Ou l\'horaire de l\'équipe)',
    btnSubmit: 'Demander un Devis',
    btnSubmitting: 'Traitement de la demande en cours...',
    toastRequired: 'Veuillez remplir tous les champs de contact obligatoires.',
    toastCompanyError: 'Impossible d\'associer la demande à une entreprise du groupe.',
    toastSuccess: 'Demande de devis envoyée avec succès !',
    toastError: 'Erreur lors du traitement de la demande.',
    successTitle: 'Demande Reçue !',
    successDesc: 'Nous avons bien enregistré les détails du projet. Notre équipe commerciale vous contactera très rapidement pour vous transmettre votre proposition de devis détaillée.',
    successMetaEmpresa: 'Entreprise :',
    successMetaContacto: 'Contact :',
    successMetaPerfiles: 'Profils :',
    footerCopyright: 'LoginPro © Solutions de personnel qualifié pour l\'industrie et le bâtiment',
    footerSecurity: 'Vos données sont protégées conformément à la politique de protection des données confidentielles.',
    loadingLead: 'Impossible de charger les données du lead.',
    loadingForm: 'Chargement...',
    notSpecified: 'Non spécifié',
    budgetHeader: '--- DEMANDE DE DEVIS ---',
    perfilLabelSoldadores: 'Soudeurs (tous procédés)',
    perfilLabelCaldereros: 'Chaudronniers',
    perfilLabelTuberos: 'Tuyauteurs',
    perfilLabelElectricistas: 'Électriciens',
    perfilLabelObraCivil: 'Bâtiment et Génie civil',
    perfilLabelElectromecanicos: 'Électromécaniciens',
    perfilLabelMontadores: 'Monteurs',
    perfilLabelOtros: 'Autres profils'
  }
};

export function SolicitarPresupuestoPage() {
  const [searchParams] = useSearchParams();
  const rawLeadId = searchParams.get('lead_id');
  const rawEmpresaIdParam = searchParams.get('empresa_id');
  const leadId = rawLeadId && rawLeadId !== 'undefined' && rawLeadId !== 'null' ? rawLeadId : null;
  const empresaIdParam = rawEmpresaIdParam && rawEmpresaIdParam !== 'undefined' && rawEmpresaIdParam !== 'null' ? rawEmpresaIdParam : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Language detection logic
  const getInitialLang = (): 'es' | 'it' | 'fr' | 'pt' => {
    const urlLang = searchParams.get('lang')?.toLowerCase();
    if (urlLang === 'pt' || urlLang === 'es' || urlLang === 'it' || urlLang === 'fr') {
      return urlLang as any;
    }
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if (browserLang === 'pt' || browserLang === 'it' || browserLang === 'fr') {
      return browserLang as any;
    }
    return 'es'; // default fallback for European business
  };
  const [lang, setLang] = useState<'es' | 'it' | 'fr' | 'pt'>(getInitialLang);
  const t = translations[lang];

  // Existing lead state
  const [empresaId, setEmpresaId] = useState('');
  const [existingNotes, setExistingNotes] = useState('');

  // Form State
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
  });

  // Project Questionnaire State
  const [projectData, setProjectData] = useState({
    startDate: '',
    endDate: '',
    workAddress: '',
    daysHours: '',
    workersCount: '',
    entryTime: '',
  });

  // Profile checkboxes
  const perfilesList = [
    { key: 'Soldadores (todos los procesos)', translationKey: 'perfilLabelSoldadores' },
    { key: 'Caldereros', translationKey: 'perfilLabelCaldereros' },
    { key: 'Tuberos', translationKey: 'perfilLabelTuberos' },
    { key: 'Electricistas', translationKey: 'perfilLabelElectricistas' },
    { key: 'Obra civil', translationKey: 'perfilLabelObraCivil' },
    { key: 'Electromecánicos', translationKey: 'perfilLabelElectromecanicos' },
    { key: 'Montadores', translationKey: 'perfilLabelMontadores' },
    { key: 'Otros perfiles', translationKey: 'perfilLabelOtros' }
  ] as const;
  
  const [selectedPerfiles, setSelectedPerfiles] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      if (leadId) {
        setIsLoading(true);
        try {
          const { data: lead, error } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .maybeSingle();

          if (lead) {
            setEmpresaId(lead.empresa_id || '');
            setExistingNotes(lead.notes || '');
            setContactData({
              name: lead.name || '',
              email: lead.email || '',
              phone: lead.phone || '',
              company_name: lead.company_name || '',
            });
            // Try to extract existing sector if matched
            if (lead.sector) {
              const matched = perfilesList
                .filter(p => lead.sector?.includes(p.key))
                .map(p => p.key);
              setSelectedPerfiles(matched);
            }

            // Automatically transition to 'E-mail Lido / Clicado' if lead is in a lower stage
            try {
              const { data: stageData } = await supabase
                .schema('core_comercial')
                .from('kanban_stages')
                .select('id, order_index')
                .eq('empresa_id', lead.empresa_id)
                .eq('name', 'E-mail Lido / Clicado')
                .maybeSingle();

              if (stageData) {
                let currentOrderIndex = 0;
                if (lead.stage_id) {
                  const { data: curStage } = await supabase
                    .schema('core_comercial')
                    .from('kanban_stages')
                    .select('order_index')
                    .eq('id', lead.stage_id)
                    .maybeSingle();
                  if (curStage) {
                    currentOrderIndex = curStage.order_index;
                  }
                }

                if (stageData.order_index > currentOrderIndex) {
                  await supabase
                    .schema('core_comercial')
                    .from('leads')
                    .update({
                      stage_id: stageData.id,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', leadId);
                }
              }
            } catch (stageErr) {
              console.warn("Failed to automatically update lead stage to read:", stageErr);
            }
          }
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }

      if (empresaIdParam) {
        setEmpresaId(empresaIdParam);
      } else if (!leadId) {
        // Fallback: load default active company if no empresaIdParam and no leadId
        try {
          const { data: defaultEmp } = await supabase
            .schema('core_common')
            .from('empresas')
            .select('id')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (defaultEmp) {
            setEmpresaId(defaultEmp.id);
          }
        } catch (empErr) {
          console.warn("Failed to fetch default company:", empErr);
        }
      }
    }

    loadInitialData();
  }, [leadId, empresaIdParam, lang]);

  const handleProfileToggle = (perfilKey: string) => {
    setSelectedPerfiles(prev => 
      prev.includes(perfilKey) ? prev.filter(p => p !== perfilKey) : [...prev, perfilKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.name || !contactData.email || !contactData.company_name) {
      toast.error(t.toastRequired);
      return;
    }
    if (!empresaId) {
      toast.error(t.toastCompanyError);
      return;
    }

    setIsLoading(true);

    const selectedLabels = selectedPerfiles.map(key => {
      const p = perfilesList.find(item => item.key === key);
      return p ? t[p.translationKey] : key;
    });

    // Format budget details
    const formattedBudgetDetails = `${t.budgetHeader}
• ${t.secProfiles}: ${selectedLabels.length > 0 ? selectedLabels.join(', ') : t.notSpecified}
• ${t.lblStartDate}: ${projectData.startDate || t.notSpecified}
• ${t.lblEndDate}: ${projectData.endDate || t.notSpecified}
• ${t.lblWorkAddress}: ${projectData.workAddress || t.notSpecified}
• ${t.lblDaysHours}: ${projectData.daysHours || t.notSpecified}
• ${t.lblWorkersCount}: ${projectData.workersCount || t.notSpecified}
• ${t.lblEntryTime}: ${projectData.entryTime || t.notSpecified}
--------------------------------`;

    let targetLeadId = leadId;
    let combinedNotes = existingNotes;

    // If no leadId in URL, try matching by email in core_comercial.leads
    if (!targetLeadId && contactData.email) {
      try {
        const { data: matchedLead } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('id, notes')
          .eq('empresa_id', empresaId)
          .ilike('email', contactData.email.trim())
          .maybeSingle();

        if (matchedLead) {
          targetLeadId = matchedLead.id;
          combinedNotes = matchedLead.notes || '';
        }
      } catch (matchErr) {
        console.warn("Could not match lead by email:", matchErr);
      }
    }

    const finalNotes = combinedNotes 
      ? `${combinedNotes}\n\n${formattedBudgetDetails}`
      : formattedBudgetDetails;

    // Use selected profiles for sector field
    const primarySector = selectedPerfiles.join(', ');

    try {
      if (targetLeadId) {
        // Fetch 'Orçamento Solicitado' stage ID
        let budgetStageId = null;
        try {
          const { data: bStage } = await supabase
            .schema('core_comercial')
            .from('kanban_stages')
            .select('id, order_index')
            .eq('empresa_id', empresaId)
            .eq('name', 'Orçamento Solicitado')
            .maybeSingle();

          if (bStage) {
            budgetStageId = bStage.id;
          }
        } catch (e) {
          console.warn("Could not fetch 'Orçamento Solicitado' stage:", e);
        }

        // Update existing lead with budget request notes and stage
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone || null,
            company_name: contactData.company_name,
            notes: finalNotes,
            sector: primarySector || null,
            address_line: projectData.workAddress || null,
            ...(budgetStageId ? { stage_id: budgetStageId } : {}),
            updated_at: new Date().toISOString()
          })
          .eq('id', targetLeadId);

        if (error) throw error;
      } else {
        // Create new lead with budget request notes
        // Fetch default 'Orçamento Solicitado' stage
        let defaultStageId = null;
        try {
          const { data: stages, error: stageErr } = await supabase
            .schema('core_comercial')
            .from('kanban_stages')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('name', 'Orçamento Solicitado');

          if (!stageErr && stages && stages.length > 0) {
            defaultStageId = stages[0].id;
          } else {
            // Fallback to first stage
            const { data: stages2 } = await supabase
              .schema('core_comercial')
              .from('kanban_stages')
              .select('id')
              .eq('empresa_id', empresaId)
              .order('order_index', { ascending: true })
              .limit(1);
            if (stages2 && stages2.length > 0) {
              defaultStageId = stages2[0].id;
            }
          }
        } catch (stageErr) {
          console.warn('Could not fetch stage for new lead', stageErr);
        }

        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .insert({
            empresa_id: empresaId,
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone || null,
            company_name: contactData.company_name,
            notes: finalNotes,
            sector: primarySector || null,
            address_line: projectData.workAddress || null,
            stage_id: defaultStageId,
          });

        if (error) throw error;
      }

      setIsSubmitted(true);
      toast.success(t.toastSuccess);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t.toastError);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    const selectedLabels = selectedPerfiles.map(key => {
      const p = perfilesList.find(item => item.key === key);
      return p ? t[p.translationKey] : key;
    });

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6 text-slate-900">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          
          {/* Language Selector */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-full p-1 z-10">
            <Globe className="h-3 w-3 text-slate-500 ml-1.5 mr-0.5 shrink-0" />
            {(['es', 'it', 'fr', 'pt'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                  lang === l
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{t.successTitle}</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {t.successDesc}
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between text-slate-600">
              <span>{t.successMetaEmpresa}</span>
              <span className="font-bold text-slate-900">{contactData.company_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.successMetaContacto}</span>
              <span className="font-bold text-slate-900">{contactData.name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.successMetaPerfiles}</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{selectedLabels.join(', ') || t.notSpecified}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{t.footerCopyright}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Header Block reminiscent of the LoginPro Navy Header */}
        <div className="bg-[#061f3d] px-8 py-6 border-b border-slate-200 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />
          
          {/* Language Selector */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/10 backdrop-blur border border-white/20 rounded-full p-1 z-10">
            <Globe className="h-3 w-3 text-slate-300 ml-1.5 mr-0.5 shrink-0" />
            {(['es', 'it', 'fr', 'pt'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                  lang === l
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-200 hover:text-white hover:bg-white/20'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">LoginPro</h1>
          <p className="text-xs text-slate-300 mt-1.5 font-medium tracking-wide">
            {t.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              {t.formHeading}
            </h2>
            <p className="text-xs text-slate-500">
              {t.formDesc}
            </p>
          </div>

          {/* Section 1: Contact Details */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              {t.secContact}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-xs font-semibold text-slate-800">
                  {t.lblCompanyName}
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="company_name"
                    required
                    placeholder={t.phCompanyName}
                    value={contactData.company_name}
                    onChange={e => setContactData({ ...contactData, company_name: e.target.value })}
                    className="pl-9 bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-800">
                  {t.lblContactName}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    required
                    placeholder={t.phContactName}
                    value={contactData.name}
                    onChange={e => setContactData({ ...contactData, name: e.target.value })}
                    className="pl-9 bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-800">
                  {t.lblEmail}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder={t.phEmail}
                    value={contactData.email}
                    onChange={e => setContactData({ ...contactData, email: e.target.value })}
                    className="pl-9 bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-800">
                  {t.lblPhone}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder={t.phPhone}
                    value={contactData.phone}
                    onChange={e => setContactData({ ...contactData, phone: e.target.value })}
                    className="pl-9 bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Profiles checkboxes */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              {t.secProfiles}
            </h3>
            <p className="text-[11px] text-slate-500">{t.descProfiles}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {perfilesList.map(perfil => {
                const isSelected = selectedPerfiles.includes(perfil.key);
                return (
                  <div 
                    key={perfil.key} 
                    onClick={() => handleProfileToggle(perfil.key)}
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-sm' 
                        : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs select-none">{t[perfil.translationKey]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Project specific details */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              {t.secProject}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblStartDate}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={projectData.startDate}
                  onChange={e => setProjectData({ ...projectData, startDate: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblEndDate}
                </Label>
                <Input
                  id="endDate"
                  placeholder={t.phEndDate}
                  value={projectData.endDate}
                  onChange={e => setProjectData({ ...projectData, endDate: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="workAddress" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblWorkAddress}
                </Label>
                <Input
                  id="workAddress"
                  placeholder={t.phWorkAddress}
                  value={projectData.workAddress}
                  onChange={e => setProjectData({ ...projectData, workAddress: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="daysHours" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblDaysHours}
                </Label>
                <Input
                  id="daysHours"
                  placeholder={t.phDaysHours}
                  value={projectData.daysHours}
                  onChange={e => setProjectData({ ...projectData, daysHours: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="workersCount" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblWorkersCount}
                </Label>
                <Input
                  id="workersCount"
                  type="number"
                  placeholder={t.phWorkersCount}
                  value={projectData.workersCount}
                  onChange={e => setProjectData({ ...projectData, workersCount: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="entryTime" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {t.lblEntryTime}
                </Label>
                <Input
                  id="entryTime"
                  placeholder={t.phEntryTime}
                  value={projectData.entryTime}
                  onChange={e => setProjectData({ ...projectData, entryTime: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold py-3 text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                {t.btnSubmitting}
              </>
            ) : (
              t.btnSubmit
            )}
          </Button>
        </form>

        <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 text-center text-[11px] text-slate-500">
          {t.footerSecurity}
        </div>
      </div>
    </div>
  );
}
