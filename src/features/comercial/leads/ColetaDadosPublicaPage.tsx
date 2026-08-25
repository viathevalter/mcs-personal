import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Building, User, Mail, Phone, MapPin, CheckCircle, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

const translations = {
  pt: {
    back: 'Voltar',
    optOutTitle: 'Subscrição Cancelada',
    optOutDesc: 'O seu endereço de e-mail foi removido da lista.',
    optOutInfo: 'Não receberá mais e-mails das nossas campanhas de marketing. Se isto foi um erro, entre em contato com nossa equipe.',
    successTitle: 'Obrigado!',
    successDesc: 'As suas informações foram salvas com sucesso.',
    successInfo: 'Nossa equipe comercial já recebeu os dados atualizados e dará andamento à elaboração de sua proposta e contrato.',
    badgeUpdate: 'Atualização cadastral',
    badgeNew: 'Novo Cadastro',
    titleUpdate: 'Ficha de Cadastro de Cliente',
    titleNew: 'Ficha de Cadastro de Novo Lead',
    descUpdate: (leadName: string, companyName: string) => `Olá, ${leadName}! Confirme ou complete os dados cadastrais da empresa ${companyName} para darmos início ao contrato.`,
    descNew: 'Por favor, preencha os dados abaixo com as informações de sua empresa para gerarmos a proposta comercial.',
    loadingForm: 'Carregando formulário...',
    secIdent: 'Identificação da Empresa',
    lblTradeName: 'Nome Comercial / Fantasia *',
    phTradeName: 'Ex: Mastercorp Portugal',
    lblLegalName: 'Razão Social *',
    phLegalName: 'Ex: Mastercorp S.A.',
    lblTaxId: 'NIF / CIF / CPF (Número Fiscal) *',
    phTaxId: 'Ex: 500123456',
    secContact: 'Contato Principal',
    lblContactName: 'Nome do Ponto de Contato *',
    phContactName: 'Ex: Ana Souza',
    lblContactEmail: 'E-mail de Contato *',
    phContactEmail: 'Ex: ana@empresa.com',
    lblBillingEmail: 'E-mail para Faturamento',
    phBillingEmail: 'Ex: financeiro@empresa.com',
    lblPhone: 'Telefone *',
    phPhone: 'Ex: +351 912 345 678',
    secAddress: 'Endereço de Faturamento',
    lblCountry: 'País',
    lblRegion: 'Região',
    lblProvince: 'Província',
    phProvince: 'Ex: Madrid',
    lblCity: 'Cidade',
    phCity: 'Ex: Lisboa',
    lblPostalCode: 'Código Postal',
    phPostalCode: 'Ex: 1000-001',
    lblAddressLine: 'Logradouro / Avenida / Rua e Número',
    phAddressLine: 'Ex: Avenida da Liberdade, nº 123, 4º Andar',
    btnSubmit: 'Confirmar e Enviar Dados',
    btnSubmitting: 'Enviando Informações...',
    requiredError: 'Por favor, preencha todos os campos obrigatórios.',
    companyError: 'Identificador da empresa do grupo não encontrado.',
    toastSuccess: 'Informações enviadas com sucesso!',
    toastError: 'Erro ao enviar dados. Tente novamente.',
    loadError: 'Não foi possível carregar as informações do formulário.'
  },
  es: {
    back: 'Volver',
    optOutTitle: 'Suscripción Cancelada',
    optOutDesc: 'Su dirección de correo electrónico ha sido dada de baja.',
    optOutInfo: 'Ya no recibirá más correos de nuestras campañas de marketing. Si esto fue un error, por favor póngase en contacto con nuestro equipo comercial.',
    successTitle: '¡Gracias!',
    successDesc: 'Su información ha sido guardada con éxito.',
    successInfo: 'Nuestro equipo comercial ya ha recibido los datos actualizados y procederá con la elaboración de su propuesta y contrato.',
    badgeUpdate: 'Actualización de datos',
    badgeNew: 'Nuevo Registro',
    titleUpdate: 'Ficha de Registro de Cliente',
    titleNew: 'Ficha de Registro de Nuevo Lead',
    descUpdate: (leadName: string, companyName: string) => `¡Hola, ${leadName}! Confirme o complete los datos de registro de la empresa ${companyName} para iniciar el contrato.`,
    descNew: 'Por favor, complete los datos a continuación con la información de su empresa para generar la propuesta comercial.',
    loadingForm: 'Cargando formulario...',
    secIdent: 'Identificación de la Empresa',
    lblTradeName: 'Nombre Comercial / Fantasía *',
    phTradeName: 'Ej: Talleres Metalúrgicos S.L.',
    lblLegalName: 'Razón Social *',
    phLegalName: 'Ej: Metalúrgicas Unidas S.A.',
    lblTaxId: 'NIF / CIF / NIE (Número Fiscal) *',
    phTaxId: 'Ej: B12345678',
    secContact: 'Contacto Principal',
    lblContactName: 'Nombre del Punto de Contacto *',
    phContactName: 'Ej: Juan Pérez',
    lblContactEmail: 'Correo Electrónico de Contacto *',
    phContactEmail: 'Ej: contacto@empresa.com',
    lblBillingEmail: 'Correo Electrónico para Facturación',
    phBillingEmail: 'Ej: financiero@empresa.com',
    lblPhone: 'Teléfono *',
    phPhone: 'Ej: +34 600 000 000',
    secAddress: 'Dirección de Facturación',
    lblCountry: 'País',
    lblRegion: 'Región',
    lblProvince: 'Provincia',
    phProvince: 'Ej: Madrid',
    lblCity: 'Ciudad',
    phCity: 'Ej: Barcelona',
    lblPostalCode: 'Código Postal',
    phPostalCode: 'Ej: 28001',
    lblAddressLine: 'Calle, Avenida o Plaza y Número',
    phAddressLine: 'Ej: Gran Vía, nº 123, 4º Derecha',
    btnSubmit: 'Confirmar y Enviar Datos',
    btnSubmitting: 'Enviando Información...',
    requiredError: 'Por favor, rellene todos los campos obligatorios.',
    companyError: 'Identificador de la empresa del grupo no encontrado.',
    toastSuccess: '¡Información enviada con éxito!',
    toastError: 'Error al enviar los datos. Inténtelo de nuevo.',
    loadError: 'No se pudo cargar la información del formulario.'
  },
  it: {
    back: 'Indietro',
    optOutTitle: 'Iscrizione Annullata',
    optOutDesc: 'Il tuo indirizzo email è stato rimosso dalla lista.',
    optOutInfo: 'Non riceverai più email dalle nostre campagne di marketing. Se si è trattato di un errore, contatta il nostro team commerciale.',
    successTitle: 'Grazie!',
    successDesc: 'Le tue informazioni sono state salvate con successo.',
    successInfo: 'Il nostro team commerciale ha già ricevuto i dati aggiornati e procederà con la stesura della proposta e del contratto.',
    badgeUpdate: 'Aggiornamento dati',
    badgeNew: 'Nuovo Profilo',
    titleUpdate: 'Scheda di Registrazione Cliente',
    titleNew: 'Scheda di Registrazione Nuovo Lead',
    descUpdate: (leadName: string, companyName: string) => `Ciao, ${leadName}! Conferma o completa i dati di registrazione dell'azienda ${companyName} per avviare il contratto.`,
    descNew: 'Si prega di compilare i dati sottostanti con le informazioni della propria azienda per generare la proposta proposta.',
    loadingForm: 'Caricamento del modulo...',
    secIdent: 'Identificazione dell\'Azienda',
    lblTradeName: 'Nome Commerciale / Insegna *',
    phTradeName: 'Es: Carpenteria Metallica S.R.L.',
    lblLegalName: 'Ragione Sociale *',
    phLegalName: 'Es: Carpenterie Unite S.P.A.',
    lblTaxId: 'Partita IVA / Codice Fiscale *',
    phTaxId: 'Es: IT12345678901',
    secContact: 'Contatto Principale',
    lblContactName: 'Nome del Punto di Contatto *',
    phContactName: 'Es: Mario Rossi',
    lblContactEmail: 'Email di Contatto *',
    phContactEmail: 'Es: contatto@azienda.it',
    lblBillingEmail: 'Email per Fatturazione',
    phBillingEmail: 'Es: amministrazione@azienda.it',
    lblPhone: 'Telefono *',
    phPhone: 'Es: +39 02 1234567',
    secAddress: 'Indirizzo di Fatturazione',
    lblCountry: 'Paese',
    lblRegion: 'Regione',
    lblProvince: 'Provincia',
    phProvince: 'Es: Milano',
    lblCity: 'Città',
    phCity: 'Es: Roma',
    lblPostalCode: 'Codice Postale',
    phPostalCode: 'Es: 20121',
    lblAddressLine: 'Via, Viale o Piazza e Numero Civico',
    phAddressLine: 'Es: Corso Vittorio Emanuele II, n. 123',
    btnSubmit: 'Conferma e Invia Dati',
    btnSubmitting: 'Invio Informazioni in corso...',
    requiredError: 'Si prega di compilare tutti i campi obbligatori.',
    companyError: 'Identificativo dell\'azienda del gruppo non trovato.',
    toastSuccess: 'Informazioni inviate con successo!',
    toastError: 'Errore durante l\'invio dei dati. Riprova.',
    loadError: 'Impossibile caricare le informazioni del modulo.'
  },
  fr: {
    back: 'Retour',
    optOutTitle: 'Désinscription Confirmée',
    optOutDesc: 'Votre adresse e-mail a été supprimée de la liste.',
    optOutInfo: 'Vous ne recevrez plus d\'e-mails de nos campagnes marketing. Si c\'était une erreur, veuillez contacter notre équipe commerciale.',
    successTitle: 'Merci !',
    successDesc: 'Vos informations ont été enregistrées avec succès.',
    successInfo: 'Notre équipe commerciale a bien reçu les données mises à jour et va procéder à la rédaction de votre proposition et de votre contrat.',
    badgeUpdate: 'Mise à jour des données',
    badgeNew: 'Nouveau Fiche',
    titleUpdate: 'Fiche d\'Enregistrement Client',
    titleNew: 'Fiche d\'Enregistrement Nouveau Lead',
    descUpdate: (leadName: string, companyName: string) => `Bonjour, ${leadName} ! Veuillez confirmer ou compléter les données d'enregistrement de l'entreprise ${companyName} pour lancer le contrat.`,
    descNew: 'Veuillez remplir les données ci-dessous avec les informations de votre entreprise afin de générer la proposition commerciale.',
    loadingForm: 'Chargement du formulaire...',
    secIdent: 'Identification de l\'Entreprise',
    lblTradeName: 'Nom Commercial / Enseigne *',
    phTradeName: 'Ex : Chaudronnerie Métallique S.A.S.',
    lblLegalName: 'Raison Sociale *',
    phLegalName: 'Ex : Métallurgie Réunie S.A.',
    lblTaxId: 'Numéro de TVA / SIRET *',
    phTaxId: 'Ex : FR12345678901',
    secContact: 'Contact Principal',
    lblContactName: 'Nom du Point de Contact *',
    phContactName: 'Ex : Jean Dupont',
    lblContactEmail: 'E-mail de Contact *',
    phContactEmail: 'Ex : contact@entreprise.fr',
    lblBillingEmail: 'E-mail de Facturation',
    phBillingEmail: 'Ex : compta@entreprise.fr',
    lblPhone: 'Téléphone *',
    phPhone: 'Ex : +33 1 23 45 67 89',
    secAddress: 'Adresse de Facturation',
    lblCountry: 'Pays',
    lblRegion: 'Région',
    lblProvince: 'Département / Province',
    phProvince: 'Ex : Paris',
    lblCity: 'Ville',
    phCity: 'Ex : Lyon',
    lblPostalCode: 'Code Postal',
    phPostalCode: 'Ex : 75001',
    lblAddressLine: 'Rue, Avenue ou Boulevard et Numéro',
    phAddressLine: 'Ex : Rue de la Paix, nº 123',
    btnSubmit: 'Confirmer et Envoyer les Données',
    btnSubmitting: 'Envoi des Informations...',
    requiredError: 'Veuillez remplir tous les champs obligatoires.',
    companyError: 'Identifiant de l\'entreprise du groupe introuvable.',
    toastSuccess: 'Informations envoyées avec succès !',
    toastError: 'Erreur lors de l\'envoi des données. Veuillez réessayer.',
    loadError: 'Impossible de charger les informations du formulaire.'
  }
};

export function ColetaDadosPublicaPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const empresaIdParam = searchParams.get('empresa_id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOptOut, setIsOptOut] = useState(false);
  const optOutParam = searchParams.get('opt_out');
  
  // Lead info loaded if editing
  const [leadName, setLeadName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [empresaId, setEmpresaId] = useState('');

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
    return 'es'; // Default fallback for European business
  };
  const [lang, setLang] = useState<'es' | 'it' | 'fr' | 'pt'>(getInitialLang);
  const t = translations[lang];

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    legal_name: '',
    tax_id: '',
    billing_email: '',
    country_id: '',
    region_id: '',
    province: '',
    city: '',
    postal_code: '',
    address_line: '',
  });

  useEffect(() => {
    async function loadLeadData() {
      if (!id) {
        // Mode: Create New Lead
        if (empresaIdParam) {
          setEmpresaId(empresaIdParam);
        } else {
          toast.error(t.companyError);
        }
        return;
      }

      // Check if it's an Opt-Out Request
      if (optOutParam === '1') {
        setIsOptOut(true);
        setIsLoading(true);
        try {
          const { data: lead, error: fetchErr } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchErr) throw fetchErr;

          if (lead) {
            const alreadyOptedOut = lead.name?.startsWith('[DESCADASTRADO]') || lead.notes?.includes('[Opt-out]');
            
            if (!alreadyOptedOut) {
              const newName = `[DESCADASTRADO] ${lead.name}`;
              const newNotes = `${lead.notes || ''}\n[Opt-out via e-mail comercial em ${new Date().toLocaleDateString()}]`.trim();
              
              const { data: stage } = await supabase
                .schema('core_comercial')
                .from('kanban_stages')
                .select('id')
                .eq('empresa_id', lead.empresa_id)
                .eq('name', 'Perdido')
                .maybeSingle();

              await supabase
                .schema('core_comercial')
                .from('leads')
                .update({
                  name: newName,
                  notes: newNotes,
                  ...(stage ? { stage_id: stage.id } : {}),
                  updated_at: new Date().toISOString()
                })
                .eq('id', id);
            }
          }
        } catch (err: any) {
          console.error("Opt-out error:", err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Mode: Edit/Update Existing Lead
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setLeadName(data.name || '');
          setCompanyName(data.company_name || '');
          setEmpresaId(data.empresa_id || '');
          
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            company_name: data.company_name || '',
            legal_name: data.legal_name || data.company_name || '',
            tax_id: data.tax_id || '',
            billing_email: data.billing_email || data.email || '',
            country_id: data.country_id || '',
            region_id: data.region_id || '',
            province: data.province || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            address_line: data.address_line || '',
          });

          // Automatically transition to 'E-mail Lido / Clicado' (order_index = 3)
          try {
            const { data: stageData } = await supabase
              .schema('core_comercial')
              .from('kanban_stages')
              .select('id, order_index')
              .eq('empresa_id', data.empresa_id)
              .or('order_index.eq.3,name.ilike.%Lido%,name.ilike.%Clicado%')
              .limit(1)
              .maybeSingle();

            if (stageData) {
              let currentOrderIndex = 0;
              if (data.stage_id) {
                const { data: curStage } = await supabase
                  .schema('core_comercial')
                  .from('kanban_stages')
                  .select('order_index')
                  .eq('empresa_id', data.empresa_id)
                  .eq('id', data.stage_id)
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
                  .eq('id', id);
              }
            }
          } catch (stageErr) {
            console.warn("Failed to automatically update lead stage to read:", stageErr);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    }

    loadLeadData();
  }, [id, empresaIdParam, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name || !formData.legal_name || !formData.tax_id) {
      toast.error(t.requiredError);
      return;
    }

    if (!empresaId) {
      toast.error(t.companyError);
      return;
    }

    setIsLoading(true);
    try {
      if (id) {
        // Update existing lead
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company_name: formData.company_name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            billing_email: formData.billing_email || null,
            country_id: formData.country_id || null,
            region_id: formData.region_id || null,
            province: formData.province || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            address_line: formData.address_line || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Insert new lead
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .insert({
            empresa_id: empresaId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company_name: formData.company_name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            billing_email: formData.billing_email || null,
            country_id: formData.country_id || null,
            region_id: formData.region_id || null,
            province: formData.province || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            address_line: formData.address_line || null,
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

  if (isOptOut) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/5 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="relative w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <CheckCircle className="h-10 w-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">{t.optOutTitle}</h1>
            <p className="text-slate-400 text-lg">
              {t.optOutDesc}
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            {t.optOutInfo}
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.successTitle}</h1>
            <p className="text-slate-600 text-lg">
              {t.successDesc}
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            {t.successInfo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 py-12 text-slate-800">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-300">
        
        {/* Decorative Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
        
        <div className="relative p-8 sm:p-10 space-y-8">
          
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

          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold uppercase tracking-wider">
              {id ? t.badgeUpdate : t.badgeNew}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              {id ? t.titleUpdate : t.titleNew}
            </h1>
            <p className="text-slate-600 text-sm">
              {id 
                ? t.descUpdate(leadName, companyName)
                : t.descNew}
            </p>
          </div>

          {isLoading && !formData.name ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
              <p className="text-slate-500 text-sm">{t.loadingForm}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: Identification */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building className="h-5 w-5 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.secIdent}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name" className="text-xs font-semibold text-slate-800">{t.lblTradeName}</Label>
                    <Input
                      id="company_name"
                      required
                      placeholder={t.phTradeName}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="legal_name" className="text-xs font-semibold text-slate-800">{t.lblLegalName}</Label>
                    <Input
                      id="legal_name"
                      required
                      placeholder={t.phLegalName}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tax_id" className="text-xs font-semibold text-slate-800">{t.lblTaxId}</Label>
                  <Input
                    id="tax_id"
                    required
                    placeholder={t.phTaxId}
                    className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Section 2: Contact */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <User className="h-5 w-5 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.secContact}</h3>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-800">{t.lblContactName}</Label>
                  <Input
                    id="name"
                    required
                    placeholder={t.phContactName}
                    className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-800">{t.lblContactEmail}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder={t.phContactEmail}
                        className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 pl-10 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="billing_email" className="text-xs font-semibold text-slate-800">{t.lblBillingEmail}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="billing_email"
                        type="email"
                        placeholder={t.phBillingEmail}
                        className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 pl-10 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                        value={formData.billing_email}
                        onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-800">{t.lblPhone}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      required
                      placeholder={t.phPhone}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 pl-10 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Address */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <MapPin className="h-5 w-5 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.secAddress}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">{t.lblCountry}</Label>
                    <CountrySelector
                      value={formData.country_id || null}
                      onChange={(val) => setFormData({ ...formData, country_id: val || '', region_id: '' })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">{t.lblRegion}</Label>
                    <RegionSelector
                      countryId={formData.country_id || null}
                      value={formData.region_id || null}
                      onChange={(val) => setFormData({ ...formData, region_id: val || '' })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="province" className="text-xs font-semibold text-slate-800">{t.lblProvince}</Label>
                    <Input
                      id="province"
                      placeholder={t.phProvince}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold text-slate-800">{t.lblCity}</Label>
                    <Input
                      id="city"
                      placeholder={t.phCity}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postal_code" className="text-xs font-semibold text-slate-800">{t.lblPostalCode}</Label>
                    <Input
                      id="postal_code"
                      placeholder={t.phPostalCode}
                      className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address_line" className="text-xs font-semibold text-slate-800">{t.lblAddressLine}</Label>
                  <Input
                    id="address_line"
                    placeholder={t.phAddressLine}
                    className="bg-white border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm h-11 rounded-xl shadow-sm"
                    value={formData.address_line}
                    onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-base py-3 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t.btnSubmitting}
                    </>
                  ) : (
                    t.btnSubmit
                  )}
                </Button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
