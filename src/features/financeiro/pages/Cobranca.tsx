import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Phone, Mail, Clock, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, Scale, Users, X, Paperclip, FileUp, ArrowUpDown, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { fetchEnrichedData, updateContaReceber, saveObservacao, fetchModernEmpresas, createContaReceber } from '../data/loader';
import type { EnrichedTitulo, ContasReceber } from '../types';
import { ReceberCobroModal } from '../components/ReceberCobroModal';
import { ObservacoesModal } from '../components/ObservacoesModal';
import { CobroDetalhesSheet } from '../components/CobroDetalhesSheet';
import { CobroFormSheet } from '../components/CobroFormSheet';
import { RichTextEditor } from '../components/RichTextEditor';
import { MultiSelect } from '@/components/ui/multi-select';
import { NegotiationModal } from '../components/NegotiationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

export const Cobranca = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('cobranca_searchTerm') || '');
    const [data, setData] = useState<EnrichedTitulo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Advanced Filtering States
    const [filterEmpresas, setFilterEmpresas] = useState<string[]>(() => {
        try {
            const val = sessionStorage.getItem('cobranca_filterEmpresas');
            return val ? JSON.parse(val) : [];
        } catch {
            return [];
        }
    });
    const [filterBancos, setFilterBancos] = useState<string[]>(() => {
        try {
            const val = sessionStorage.getItem('cobranca_filterBancos');
            return val ? JSON.parse(val) : [];
        } catch {
            return [];
        }
    });
    const [filterPeriodosFat, setFilterPeriodosFat] = useState<string[]>(() => {
        try {
            const val = sessionStorage.getItem('cobranca_filterPeriodosFat');
            return val ? JSON.parse(val) : [];
        } catch {
            return [];
        }
    });
    const [filterPeriodoEmissao, setFilterPeriodoEmissao] = useState(() => sessionStorage.getItem('cobranca_filterPeriodoEmissao') || 'all');
    const [startDateEmissao, setStartDateEmissao] = useState(() => sessionStorage.getItem('cobranca_startDateEmissao') || '');
    const [endDateEmissao, setEndDateEmissao] = useState(() => sessionStorage.getItem('cobranca_endDateEmissao') || '');
    const [filterPeriodoVencimento, setFilterPeriodoVencimento] = useState(() => sessionStorage.getItem('cobranca_filterPeriodoVencimento') || 'this-month');
    const [startDateVencimento, setStartDateVencimento] = useState(() => sessionStorage.getItem('cobranca_startDateVencimento') || '');
    const [endDateVencimento, setEndDateVencimento] = useState(() => sessionStorage.getItem('cobranca_endDateVencimento') || '');
    const [filterPeriodoAlteracao, setFilterPeriodoAlteracao] = useState(() => sessionStorage.getItem('cobranca_filterPeriodoAlteracao') || 'all');
    const [startDateAlteracao, setStartDateAlteracao] = useState(() => sessionStorage.getItem('cobranca_startDateAlteracao') || '');
    const [endDateAlteracao, setEndDateAlteracao] = useState(() => sessionStorage.getItem('cobranca_endDateAlteracao') || '');

    // Temporary/Draft states for Popover Form
    const [tempFilterEmpresas, setTempFilterEmpresas] = useState<string[]>(filterEmpresas);
    const [tempFilterBancos, setTempFilterBancos] = useState<string[]>(filterBancos);
    const [tempFilterPeriodosFat, setTempFilterPeriodosFat] = useState<string[]>(filterPeriodosFat);
    const [tempFilterPeriodoEmissao, setTempFilterPeriodoEmissao] = useState(filterPeriodoEmissao);
    const [tempStartDateEmissao, setTempStartDateEmissao] = useState(startDateEmissao);
    const [tempEndDateEmissao, setTempEndDateEmissao] = useState(endDateEmissao);
    const [tempFilterPeriodoVencimento, setTempFilterPeriodoVencimento] = useState(filterPeriodoVencimento);
    const [tempStartDateVencimento, setTempStartDateVencimento] = useState(startDateVencimento);
    const [tempEndDateVencimento, setTempEndDateVencimento] = useState(endDateVencimento);
    const [tempFilterPeriodoAlteracao, setTempFilterPeriodoAlteracao] = useState(filterPeriodoAlteracao);
    const [tempStartDateAlteracao, setTempStartDateAlteracao] = useState(startDateAlteracao);
    const [tempEndDateAlteracao, setTempEndDateAlteracao] = useState(endDateAlteracao);

    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<'atraso' | 'alerta' | 'judicial' | 'negociado'>(() => (sessionStorage.getItem('cobranca_activeTab') as any) || 'atraso');

    // Modals
    const [isReceberOpen, setIsReceberOpen] = useState(false);
    const [isObsOpen, setIsObsOpen] = useState(false);
    const [selectedTitulo, setSelectedTitulo] = useState<EnrichedTitulo | null>(null);

    // Zoom Detail Sheet State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDetailTitulo, setSelectedDetailTitulo] = useState<EnrichedTitulo | null>(null);

    // Form editing states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCobro, setEditingCobro] = useState<ContasReceber | null>(null);

    // Email Modal
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState<'friendly' | 'overdue' | 'legal' | 'negotiation'>('friendly');
    const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'fr' | 'it'>('pt');
    const [negotiationParams, setNegotiationParams] = useState<{
        selectedTitles: EnrichedTitulo[];
        originalTotal: number;
        discount: number;
        discountedTotal: number;
        paymentType: 'single' | 'installments';
        dueDate: string;
        installmentsCount: number;
        firstInstallmentDate: string;
    } | null>(null);
    const [emailDestinatario, setEmailDestinatario] = useState('');
    const [emailRemetente, setEmailRemetente] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailAttachment, setEmailAttachment] = useState<{ name: string; contentType: string; contentBytes: string } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [currentUser, setCurrentUser] = useState('Usuário Desconhecido');
    const [empresas, setEmpresas] = useState<{ id: string; nome: string; billing_email?: string | null; cobranca_email?: string | null; email?: string | null }[]>([]);
    const [globalConfigEmail, setGlobalConfigEmail] = useState('cobranca@kotrik.com');

    useEffect(() => {
        loadData();
        fetchUser();
        const loadEmpresas = async () => {
            const data = await fetchModernEmpresas();
            setEmpresas(data);
        };
        loadEmpresas();

        const loadGlobalConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('cobranca_configuracoes')
                    .select('email_remetente')
                    .limit(1)
                    .single();
                if (data && data.email_remetente) {
                    setGlobalConfigEmail(data.email_remetente);
                }
            } catch (err) {
                console.error('Error fetching global billing email:', err);
            }
        };
        loadGlobalConfig();
    }, []);

    // Save states to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('cobranca_searchTerm', searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterEmpresas', JSON.stringify(filterEmpresas));
    }, [filterEmpresas]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterBancos', JSON.stringify(filterBancos));
    }, [filterBancos]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterPeriodosFat', JSON.stringify(filterPeriodosFat));
    }, [filterPeriodosFat]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterPeriodoEmissao', filterPeriodoEmissao);
    }, [filterPeriodoEmissao]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_startDateEmissao', startDateEmissao);
    }, [startDateEmissao]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_endDateEmissao', endDateEmissao);
    }, [endDateEmissao]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterPeriodoVencimento', filterPeriodoVencimento);
    }, [filterPeriodoVencimento]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_startDateVencimento', startDateVencimento);
    }, [startDateVencimento]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_endDateVencimento', endDateVencimento);
    }, [endDateVencimento]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_filterPeriodoAlteracao', filterPeriodoAlteracao);
    }, [filterPeriodoAlteracao]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_startDateAlteracao', startDateAlteracao);
    }, [startDateAlteracao]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_endDateAlteracao', endDateAlteracao);
    }, [endDateAlteracao]);

    // Sync temp states with active states when popover opens
    useEffect(() => {
        if (showFilters) {
            setTempFilterEmpresas(filterEmpresas);
            setTempFilterBancos(filterBancos);
            setTempFilterPeriodosFat(filterPeriodosFat);
            setTempFilterPeriodoEmissao(filterPeriodoEmissao);
            setTempStartDateEmissao(startDateEmissao);
            setTempEndDateEmissao(endDateEmissao);
            setTempFilterPeriodoVencimento(filterPeriodoVencimento);
            setTempStartDateVencimento(startDateVencimento);
            setTempEndDateVencimento(endDateVencimento);
            setTempFilterPeriodoAlteracao(filterPeriodoAlteracao);
            setTempStartDateAlteracao(startDateAlteracao);
            setTempEndDateAlteracao(endDateAlteracao);
        }
    }, [showFilters]);

    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setCurrentUser(session.user.email);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [result, obsResult] = await Promise.all([
                fetchEnrichedData(),
                supabase.from('cobranca_observacoes').select('conta_receber_id, data')
            ]);
            
            // Map last observation date to each title
            const obsMap = new Map<string, string>();
            if (obsResult.data) {
                obsResult.data.forEach((o: any) => {
                    const existing = obsMap.get(o.conta_receber_id);
                    if (!existing || new Date(o.data) > new Date(existing)) {
                        obsMap.set(o.conta_receber_id, o.data);
                    }
                });
            }

            const enrichedWithObs = result.map(item => ({
                ...item,
                lastObsDate: obsMap.get(item.id) ? new Date(obsMap.get(item.id)!) : null
            }));

            setData(enrichedWithObs);
        } catch (err: any) {
            console.error("Error loading data:", err);
            toast.error("Erro ao carregar dados: " + (err.message || String(err)));
        } finally {
            setIsLoading(false);
        }
    };
    // Multilingual Email Content Generator
    const generateAndSetEmailContent = (
        template: 'friendly' | 'overdue' | 'legal' | 'negotiation',
        lang: 'pt' | 'es' | 'fr' | 'it',
        title: EnrichedTitulo,
        params?: typeof negotiationParams
    ) => {
        const clientName = title.Cliente || 'Cliente';
        const docNum = title.Num_doc || 'Fatura';
        const docValue = formatCurrency(title.Valot_total);
        const vencDate = title.Dt_venc ? new Date(title.Dt_venc).toLocaleDateString('pt-PT') : 'N/A';

        const toHtml = (text: string) => {
            return text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
        };

        let subject = '';
        let bodyText = '';

        if (template === 'friendly') {
            const subjects = {
                pt: `Lembrete de Vencimento: Documento ${docNum}`,
                es: `Recordatorio de Vencimiento: Documento ${docNum}`,
                fr: `Rappel d'échéance : Document ${docNum}`,
                it: `Promemoria di Scadenza: Documento ${docNum}`
            };
            const bodies = {
                pt: `Olá, equipe do departamento financeiro da ${clientName}.\n\nGostaríamos de lembrar amigavelmente que o título ${docNum} no valor de ${docValue} vencerá em ${vencDate}.\n\nPor favor, confirme se o pagamento está agendado e envie o comprovativo assim que possível.\n\nAgradecemos a parceria,\nDepartamento Financeiro`,
                es: `Hola, equipo del departamento financiero de ${clientName}.\n\nNos gustaría recordar amigablemente que el título ${docNum} por el valor de ${docValue} vencerá el ${vencDate}.\n\nPor favor, confirme si el pago está programado y envíe el comprobante tan pronto como sea posible.\n\nAgradecemos la cooperación,\nDepartamento Financiero`,
                fr: `Bonjour, l'équipe du département financier de ${clientName}.\n\nNous vous rappelons amicalement que le titre ${docNum} d'un montant de ${docValue} arrivera à échéance le ${vencDate}.\n\nVeuillez confirmer si le paiement est planifié et nous envoyer le justificatif dès que possible.\n\nNous vous remercions pour votre collaboration,\nDépartement Financier`,
                it: `Buongiorno, team del dipartimento finanziario di ${clientName}.\n\nDesideriamo ricordarvi cortesemente che il titolo ${docNum} del valore di ${docValue} scadrà il ${vencDate}.\n\nVi preghiamo di confermare se il pagamento è programmato e di inviarci la ricevuta il prima possibile.\n\nRingraziando per la collaborazione,\nDipartimento Finanziario`
            };
            subject = subjects[lang];
            bodyText = bodies[lang];
        } else if (template === 'overdue') {
            const subjects = {
                pt: `Aviso de Cobrança - Título em Atraso: ${docNum}`,
                es: `Aviso de Cobro - Título en Atraso: ${docNum}`,
                fr: `Avis de Paiement - Titre en Retard : ${docNum}`,
                it: `Avviso di Pagamento - Titolo in Ritardo: ${docNum}`
            };
            const bodies = {
                pt: `Prezados,\n\nConstatamos em nosso sistema que o título ${docNum} no valor de ${docValue}, vencido em ${vencDate}, ainda não foi liquidado.\n\nSolicitamos a gentileza de verificar a pendência financeira e efetuar o pagamento. Caso já tenha realizado o depósito, por favor ignore este e-mail e nos envie o comprovativo.\n\nAtenciosamente,\nDepartamento de Cobrança`,
                es: `Estimados,\n\nConstatamos en nuestro sistema que el título ${docNum} por el valor de ${docValue}, vencido el ${vencDate}, aún no ha sido liquidado.\n\nSolicitamos la amabilidad de verificar la situación financeira y realizar el pago. Si ya ha realizado el depósito, por favor ignore este correo y envíenos el comprobante.\n\nAtentamente,\nDepartamento de Cobro`,
                fr: `Chers clients,\n\nNous constatons dans notre système que le titre ${docNum} d'un montant de ${docValue}, échu le ${vencDate}, n'a pas encore été réglé.\n\nNous vous demandons de bien vouloir vérifier cette situation financière et de procéder au paiement. Si vous avez déjà effectué le virement, veuillez ignorer cet e-mail et nous envoyer le justificatif.\n\nCordialement,\nDépartement de Recouvrement`,
                it: `Gentili signori,\n\nAbbiamo riscontrato nel nostro sistema che il titolo ${docNum} dell'importo di ${docValue}, scaduto il ${vencDate}, non è ancora stato liquidato.\n\nVi chiediamo cortesemente di verificare la pendenza finanziaria ed effettuare il pagamento. Se avete già provveduto al bonifico, vi preghiamo di ignorare questa e-mail e di inviarci la ricevuta.\n\nCordiali saluti,\nDipartimento di Recupero Crediti`
            };
            subject = subjects[lang];
            bodyText = bodies[lang];
        } else if (template === 'legal') {
            const subjects = {
                pt: `NOTIFICAÇÃO EXTRAJUDICIAL - Cobrança Urgente: Título ${docNum}`,
                es: `NOTIFICACIÓN EXTRAJUDICIAL - Cobro Urgente: Título ${docNum}`,
                fr: `MISE EN DEMEURE - Recouvrement Urgent : Titre ${docNum}`,
                it: `NOTIFICA STRAGIUDIZIALE - Sollecito Urgente: Titolo ${docNum}`
            };
            const bodies = {
                pt: `Prezada Direção da ${clientName},\n\nApesar de nossas tentativas anteriores de negociação, o título ${docNum} no valor de ${docValue} (vencido desde ${vencDate}) permanece em aberto.\n\nEsta notificação serve como aviso formal de que, caso a liquidação do valor não ocorra no prazo de 48 horas, seremos obrigados a encaminhar esta pendência ao nosso Departamento Jurídico para as devidas cobranças judiciais.\n\nEvite maiores encargos e processos legais entrando em contato imediatamente.\n\nAtenciosamente,\nDiretoria Financeira`,
                es: `Estimada Dirección de ${clientName},\n\nA pesar de nuestros intentos anteriores de negociación, el título ${docNum} por el valor de ${docValue} (vencido desde el ${vencDate}) permanece pendiente.\n\nEsta notificación sirve como aviso formal de que, si la liquidación del valor no se realiza en un plazo de 48 horas, nos veremos obligados a remitir este asunto a nuestro Departamento Jurídico para iniciar las acciones de cobro judicial correspondientes.\n\nEvite cargos adicionales y procesos legales poniéndose en contacto de inmediato.\n\nAtentamente,\nDirección Financiera`,
                fr: `Chère Direction de ${clientName},\n\nMalgré nos précédentes tentatives de négociation, le titre ${docNum} d'un montant de ${docValue} (échu depuis le ${vencDate}) demeure impayé.\n\nCette notification constitue une mise en demeure formelle. À défaut de règlement sous 48 heures, nous serons contraints de transmettre ce dossier à notre Département Juridique afin d'engager des poursuites judiciaires.\n\nÉvitez des frais supplémentaires et des procédures judiciaires en nous contactant immédiatement.\n\nCordialement,\nDirection Financière`,
                it: `Spettabile Direzione di ${clientName},\n\nNonostante i nostri precedenti tentativi di accordo, il titolo ${docNum} del valore di ${docValue} (scaduto dal ${vencDate}) risulta ancora insoluto.\n\nLa presente notifica costituisce sollecito formale: in mancanza di pagamento entro 48 ore, saremo costretti a trasmettere la pratica al nostro Ufficio Legale per l'avvio delle azioni giudiziarie.\n\nEvitate ulteriori spese e procedimenti legali contattandoci immediatamente.\n\nCordiali saluti,\nDirezione Finanziaria`
            };
            subject = subjects[lang];
            bodyText = bodies[lang];
        } else if (template === 'negotiation' && params) {
            const subjects = {
                pt: `Proposta de Acordo e Relação de Títulos Pendentes - ${clientName}`,
                es: `Propuesta de Acuerdo y Relación de Títulos Pendientes - ${clientName}`,
                fr: `Proposition d'Accord et Relevé de Titres Impayés - ${clientName}`,
                it: `Proposta di Accordo e Prospetto dei Titoli Insoluti - ${clientName}`
            };

            const headers = {
                pt: `Prezada equipe financeira da ${clientName},\n\nSeguindo nossa política de monitoramento de créditos, listamos abaixo os títulos pendentes em aberto:\n\n`,
                es: `Estimado equipo financiero de ${clientName},\n\nSiguiendo nuestra política de control de créditos, detallamos a continuación los títulos pendientes de pago:\n\n`,
                fr: `Chère équipe financière de ${clientName},\n\nConformément à notre politique de suivi des crédits, vous trouverez ci-dessous la liste des titres en attente de règlement :\n\n`,
                it: `Gentile team finanziario di ${clientName},\n\nIn linea con la nossa politica di monitoraggio dei crediti, elenchiamo di seguito i titoli in sospeso:\n\n`
            };

            const docListText = params.selectedTitles.map(t => {
                const docVenc = t.Dt_venc ? new Date(t.Dt_venc).toLocaleDateString('pt-PT') : 'N/A';
                const docVal = formatCurrency(t.Saldo_a_pagar);
                const formats = {
                    pt: `- Doc: ${t.Num_doc} | Vencido em: ${docVenc} | Valor: ${docVal}`,
                    es: `- Doc: ${t.Num_doc} | Vencido el: ${docVenc} | Importe: ${docVal}`,
                    fr: `- Doc : ${t.Num_doc} | Échu le : ${docVenc} | Montant : ${docVal}`,
                    it: `- Doc: ${t.Num_doc} | Scaduto il: ${docVenc} | Importo: ${docVal}`
                };
                return formats[lang];
            }).join('\n');

            const totalLabels = {
                pt: `Valor total original em atraso: ${formatCurrency(params.originalTotal)}`,
                es: `Importe total original vencido: ${formatCurrency(params.originalTotal)}`,
                fr: `Montant total d'origine en retard : ${formatCurrency(params.originalTotal)}`,
                it: `Valore totale originale in ritardo: ${formatCurrency(params.originalTotal)}`
            };

            let body = headers[lang] + docListText + '\n\n' + totalLabels[lang] + '\n';

            if (params.discount > 0) {
                const discountTexts = {
                    pt: `Com a nossa proposta de negociação activa de ${params.discount}% de desconto, o valor líquido total será de ${formatCurrency(params.discountedTotal)}.`,
                    es: `Con nuestra propuesta de negociación activa de ${params.discount}% de descuento, el valor neto total será de ${formatCurrency(params.discountedTotal)}.`,
                    fr: `Avec notre proposition de négociation active de ${params.discount}% de remise, le montant net total sera de ${formatCurrency(params.discountedTotal)}.`,
                    it: `Con la nostra proposta di accordo attiva del ${params.discount}% de sconto, il valore netto totale sarà di ${formatCurrency(params.discountedTotal)}.`
                };
                body += discountTexts[lang] + '\n';
            }

            if (params.paymentType === 'single') {
                const singleTexts = {
                    pt: `Proposta para pagamento integral em parcela única com vencimento em: ${new Date(params.dueDate).toLocaleDateString('pt-PT')}.`,
                    es: `Propuesta para pago integral en cuota única con vencimiento el: ${new Date(params.dueDate).toLocaleDateString('pt-PT')}.`,
                    fr: `Proposition pour un paiement intégral en une seule fois avec échéance le : ${new Date(params.dueDate).toLocaleDateString('pt-PT')}.`,
                    it: `Proposta di pagamento in un'unica soluzione con scadenza il: ${new Date(params.dueDate).toLocaleDateString('pt-PT')}.`
                };
                body += singleTexts[lang] + '\n\n';
            } else {
                const instVal = formatCurrency(params.discountedTotal / params.installmentsCount);
                const instDate = new Date(params.firstInstallmentDate).toLocaleDateString('pt-PT');
                const installmentsTexts = {
                    pt: `Proposta para parcelamento do saldo em ${params.installmentsCount} parcelas de ${instVal} cada, iniciando em ${instDate}.`,
                    es: `Propuesta para fraccionamiento del saldo en ${params.installmentsCount} plazos de ${instVal} cada uno, comenzando el: ${instDate}.`,
                    fr: `Proposition de paiement échelonné en ${params.installmentsCount} mensualités de ${instVal} chacune, débutant le : ${instDate}.`,
                    it: `Proposta per la rateizzazione del saldo in ${params.installmentsCount} rate da ${instVal} ciascuna, a partire dal: ${instDate}.`
                };
                body += installmentsTexts[lang] + '\n\n';
            }

            const footers = {
                pt: `Ficamos no aguardo da vossa confirmação por este canal para formalizarmos o plano de pagamentos.\n\nAtenciosamente,\nAssessoria de Cobrança`,
                es: `Quedamos a la espera de su confirmación por esta vía para formalizar el plan de pagos.\n\nAtentamente,\nAsesoría de Cobro`,
                fr: `Dans l'attente de votre confirmation par ce canal pour officialiser le plan de règlement.\n\nCordialement,\nService de Recouvrement`,
                it: `In attesa di un vostro riscontro per formalizzare il piano di rientro.\n\nCordiali saluti,\nUfficio Recupero Crediti`
            };

            body += footers[lang];
            
            subject = subjects[lang];
            bodyText = body;
        }

        setEmailSubject(subject);
        setEmailBody(toHtml(bodyText));
    };

    const handleTemplateChange = (template: 'friendly' | 'overdue' | 'legal' | 'negotiation', title: EnrichedTitulo) => {
        setEmailTemplate(template);
        generateAndSetEmailContent(template, emailLanguage, title, negotiationParams);
    };

    const handleLanguageChange = (lang: 'pt' | 'es' | 'fr' | 'it') => {
        setEmailLanguage(lang);
        if (selectedTitulo) {
            generateAndSetEmailContent(emailTemplate, lang, selectedTitulo, negotiationParams);
        }
    };

    const openEmailModal = (
        titulo: EnrichedTitulo, 
        templateKey: 'friendly' | 'overdue' | 'legal' | 'negotiation' = 'friendly',
        params?: typeof negotiationParams
    ) => {
        setSelectedTitulo(titulo);
        setEmailTemplate(templateKey);
        setNegotiationParams(params || null);
        setEmailLanguage('pt'); // default to Portuguese

        setEmailDestinatario(titulo.clienteInfo?.EmailCobros || '');
        
        // Match company sender email robustly (checking trade_name, nome, codigo, partials)
        const cleanEmpName = (titulo.Empresa || '').trim().toLowerCase();
        let matchedEmp = empresas.find(e => (e.trade_name || '').trim().toLowerCase() === cleanEmpName);
        if (!matchedEmp) matchedEmp = empresas.find(e => e.nome.trim().toLowerCase() === cleanEmpName);
        if (!matchedEmp) matchedEmp = empresas.find(e => e.codigo.trim().toLowerCase() === cleanEmpName);
        if (!matchedEmp) {
            matchedEmp = empresas.find(e => {
                const name = e.nome.toLowerCase();
                const trade = (e.trade_name || '').toLowerCase();
                return name.includes(cleanEmpName) || cleanEmpName.includes(name) || (trade && (trade.includes(cleanEmpName) || cleanEmpName.includes(trade)));
            });
        }

        const senderEmail = globalConfigEmail || matchedEmp?.cobranca_email || matchedEmp?.billing_email || matchedEmp?.email || 'financeiro@kotrik.com';
        setEmailRemetente(senderEmail);
        setEmailAttachment(null);

        // Generate content dynamically
        generateAndSetEmailContent(templateKey, 'pt', titulo, params);
        setIsEmailOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedTitulo) return;
        setIsSendingEmail(true);
        try {
            // Match company sender email robustly to get its ID
            const cleanEmpName = (selectedTitulo.Empresa || '').trim().toLowerCase();
            let matchedEmp = empresas.find(e => (e.trade_name || '').trim().toLowerCase() === cleanEmpName);
            if (!matchedEmp) matchedEmp = empresas.find(e => e.nome.trim().toLowerCase() === cleanEmpName);
            if (!matchedEmp) matchedEmp = empresas.find(e => e.codigo.trim().toLowerCase() === cleanEmpName);
            if (!matchedEmp) {
                matchedEmp = empresas.find(e => {
                    const name = e.nome.toLowerCase();
                    const trade = (e.trade_name || '').toLowerCase();
                    return name.includes(cleanEmpName) || cleanEmpName.includes(name) || (trade && (trade.includes(cleanEmpName) || cleanEmpName.includes(trade)));
                });
            }
            const matchedEmpresaId = matchedEmp?.id;

            const toEmails = emailDestinatario.split(/[,;]/).map(e => e.trim()).filter(Boolean);
            if (toEmails.length === 0) {
                toast.error(t('financeiro.email_modal.err_no_recipient', 'Por favor, informe pelo menos um destinatário de e-mail.'));
                setIsSendingEmail(false);
                return;
            }

            // Trigger Edge Function to send email via MS Graph (Outlook) and save to Sent Items
            const { error: functionErr } = await supabase.functions.invoke('send-order-notification', {
                body: {
                    empresa_id: matchedEmpresaId,
                    to_emails: toEmails,
                    email_subject: emailSubject,
                    email_body: emailBody, // HTML body from Editor
                    is_faturamento: false,
                    client_name: selectedTitulo.Cliente,
                    custom_attachments: emailAttachment ? [emailAttachment] : []
                }
            });

            if (functionErr) {
                console.error('Error invoking send-order-notification:', functionErr);
                throw new Error(functionErr.message);
            }

            // Save action in timelines table
            const attachmentText = emailAttachment ? `\nAnexo: ${emailAttachment.name}` : '';
            const obsToSave = {
                conta_receber_id: selectedTitulo.id,
                usuario: currentUser,
                tipo: 'E-mail de Cobrança',
                descricao: `Enviado e-mail de cobrança (${emailTemplate === 'friendly' ? 'Lembrete Amigável' : emailTemplate === 'overdue' ? 'Aviso de Atraso' : emailTemplate === 'legal' ? 'Notificação Pré-Jurídica' : 'Proposta de Negociação'}) para ${emailDestinatario || 'cliente'} de ${emailRemetente}. Assunto: "${emailSubject}"${attachmentText}`,
                data: new Date().toISOString()
            };

            await saveObservacao(obsToSave);
            toast.success(t('financeiro.email_modal.msg_email_sent', 'E-mail de cobrança enviado com sucesso!'), {
                description: t('financeiro.email_modal.msg_email_log', 'O log do envio foi registrado na linha do tempo do cobro.')
            });
            setIsEmailOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(t('financeiro.email_modal.err_email_log', 'Erro ao registrar envio de e-mail: ') + err.message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleSendToLegal = async (titulo: EnrichedTitulo) => {
        if (window.confirm(`Deseja encaminhar o título ${titulo.Num_doc} da ${titulo.Cliente} para o setor Jurídico?\nO status será alterado para Judicial.`)) {
            try {
                // Update status to Judicial
                const updateRes = await updateContaReceber(titulo.id, { Status: 'Judicial' });
                if (!updateRes.success) throw updateRes.error;

                // Log in timeline
                const obsToSave = {
                    conta_receber_id: titulo.id,
                    usuario: currentUser,
                    tipo: 'Encaminhamento Judicial',
                    descricao: `Título encaminhado para cobrança extrajudicial/judicial via assessoria de advocacia.`,
                    data: new Date().toISOString()
                };
                await saveObservacao(obsToSave);

                toast.success('Título enviado para o Jurídico!', {
                    description: `O status foi alterado para Judicial e o log foi adicionado ao histórico.`
                });
                loadData();
            } catch (err: any) {
                toast.error('Erro ao encaminhar para jurídico: ' + err.message);
            }
        }
    };

    const openZoom = (item: EnrichedTitulo) => {
        setSelectedDetailTitulo(item);
        setIsDetailOpen(true);
    };

    const openEditForm = (item: EnrichedTitulo) => {
        setEditingCobro(item);
        setIsFormOpen(true);
    };

    const handleSave = async (formData: Partial<ContasReceber>) => {
        if (editingCobro) {
            const updateRes = await updateContaReceber(editingCobro.id, formData);
            if (!updateRes.success) {
                toast.error('Erro ao atualizar: ' + (updateRes.error?.message || 'Erro desconhecido'));
                return;
            }
        }
        toast.success('Cobro salvo com sucesso!');
        await loadData();
    };

    // Helper functions
    const isOverdue = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago' || item.Status === 'Judicial' || item.Status === 'Negociado') return false;
        return item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0));
    };

    const isDueSoon = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago' || item.Status === 'Judicial' || item.Status === 'Negociado' || isOverdue(item)) return false;
        if (!item.Dt_venc) return false;
        const now = new Date();
        const next7Days = new Date();
        next7Days.setDate(now.getDate() + 7);
        const itemDate = new Date(item.Dt_venc);
        return itemDate >= new Date(now.setHours(0,0,0,0)) && itemDate <= next7Days;
    };

    const formatDateInput = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const getAlteracaoDate = (item: EnrichedTitulo): Date | null => {
        const dates: Date[] = [];
        if (item.Modificado) dates.push(new Date(item.Modificado));
        if (item.Creado) dates.push(new Date(item.Creado));
        if (item.lastObsDate) dates.push(new Date(item.lastObsDate));
        if (item.pagamentos_reais && item.pagamentos_reais.length > 0) {
            item.pagamentos_reais.forEach((p: any) => {
                if (p.data_recebimento) {
                    dates.push(new Date(p.data_recebimento));
                }
            });
        }
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates.map(d => d.getTime())));
    };

    // Extract unique lists
    const uniqueEmpresas = Array.from(new Set(data.map(i => i.Empresa).filter(Boolean)));
    const uniqueBancos = Array.from(new Set(data.map(i => i.Banco).filter(Boolean)));
    const uniquePeriodosFat = Array.from(new Set(data.map(i => i.periodo_fat).filter(Boolean))).sort();

    // Filters and tabs
    const kpiData = data.filter(item => {
        // Search search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (item.Cliente?.toLowerCase() || '').includes(searchLower) ||
            (item.Num_doc?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;

        // Empresa filter
        if (filterEmpresas.length > 0 && !filterEmpresas.includes(item.Empresa)) return false;

        // Banco filter
        if (filterBancos.length > 0 && !filterBancos.includes(item.Banco)) return false;

        // Periodo Fat filter
        if (filterPeriodosFat.length > 0 && !filterPeriodosFat.includes(item.periodo_fat)) return false;

        // Periodo Emissao filter
        if (filterPeriodoEmissao !== 'all') {
            const itemDate = item.Data_emissao ? new Date(item.Data_emissao) : null;
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoEmissao === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoEmissao === 'past-30') {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoEmissao === 'custom') {
                if (startDateEmissao && new Date(itemDate) < new Date(startDateEmissao)) return false;
                if (endDateEmissao && new Date(itemDate) > new Date(endDateEmissao)) return false;
            }
        }

        // Periodo Vencimento filter
        if (filterPeriodoVencimento !== 'all') {
            const itemDate = item.Dt_venc ? new Date(item.Dt_venc) : null;
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoVencimento === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoVencimento === 'next-30') {
                const start = new Date(now.setHours(0,0,0,0));
                const end = new Date();
                end.setDate(start.getDate() + 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoVencimento === 'custom') {
                if (startDateVencimento && new Date(itemDate) < new Date(startDateVencimento)) return false;
                if (endDateVencimento && new Date(itemDate) > new Date(endDateVencimento)) return false;
            }
        }

        // Periodo Alteracao filter
        if (filterPeriodoAlteracao !== 'all') {
            const itemDate = getAlteracaoDate(item);
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoAlteracao === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoAlteracao === 'past-30') {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoAlteracao === 'custom') {
                if (startDateAlteracao && new Date(itemDate) < new Date(startDateAlteracao)) return false;
                if (endDateAlteracao && new Date(itemDate) > new Date(endDateAlteracao)) return false;
            }
        }

        return true;
    });

    // KPIs Calculations
    const kpis = {
        atrasoVal: kpiData.filter(i => isOverdue(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        atrasoCount: kpiData.filter(i => isOverdue(i)).length,

        alertaVal: kpiData.filter(i => isDueSoon(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        alertaCount: kpiData.filter(i => isDueSoon(i)).length,

        judicialVal: kpiData.filter(i => i.Status === 'Judicial').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        judicialCount: kpiData.filter(i => i.Status === 'Judicial').length,

        negociadoVal: kpiData.filter(i => i.Status === 'Negociado').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        negociadoCount: kpiData.filter(i => i.Status === 'Negociado').length,
        negociadoClientsCount: new Set(kpiData.filter(i => i.Status === 'Negociado').map(i => i.CodCliente || i.Cliente)).size,

        totalVal: kpiData.filter(i => i.Status !== 'Pago' && i.Status !== 'Negociado').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        totalCount: kpiData.filter(i => i.Status !== 'Pago' && i.Status !== 'Negociado').length,
    };

    const filteredData = kpiData.filter(item => {
        // Tab filter
        if (activeTab === 'atraso' && !isOverdue(item)) return false;
        if (activeTab === 'alerta' && !isDueSoon(item)) return false;
        if (activeTab === 'judicial' && item.Status !== 'Judicial') return false;
        if (activeTab === 'negociado' && item.Status !== 'Negociado') return false;
        return true;
    });

    const activeFiltersCount = [
        filterEmpresas.length > 0,
        filterBancos.length > 0,
        filterPeriodosFat.length > 0,
        filterPeriodoEmissao !== 'all',
        filterPeriodoVencimento !== 'all',
        filterPeriodoAlteracao !== 'all'
    ].filter(Boolean).length;

    // Sorting States
    const [sortField, setSortField] = useState<string>(() => sessionStorage.getItem('cobranca_sortField') || 'Dt_venc');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => (sessionStorage.getItem('cobranca_sortDirection') as 'asc' | 'desc') || 'desc');

    useEffect(() => {
        sessionStorage.setItem('cobranca_sortField', sortField);
    }, [sortField]);

    useEffect(() => {
        sessionStorage.setItem('cobranca_sortDirection', sortDirection);
    }, [sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedData = [...filteredData].sort((a, b) => {
        let valA: any = a[sortField as keyof EnrichedTitulo];
        let valB: any = b[sortField as keyof EnrichedTitulo];

        // Special handling for calculated properties
        if (sortField === 'Saldo_a_pagar') {
            valA = a.Saldo_a_pagar;
            valB = b.Saldo_a_pagar;
        }

        // Keep null/undefined at the bottom
        if (valA === undefined || valA === null) return sortDirection === 'asc' ? 1 : -1;
        if (valB === undefined || valB === null) return sortDirection === 'asc' ? -1 : 1;

        // String collation
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirection === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        }

        // Date sorting for fields containing dates (both strings and objects)
        if (sortField === 'Dt_venc' || sortField === 'Data_emissao') {
            const timeA = new Date(valA).getTime();
            const timeB = new Date(valB).getTime();
            // Handle invalid dates
            const isAValid = !isNaN(timeA);
            const isBValid = !isNaN(timeB);
            if (!isAValid && !isBValid) return 0;
            if (!isAValid) return sortDirection === 'asc' ? 1 : -1;
            if (!isBValid) return sortDirection === 'asc' ? -1 : 1;
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }

        // Numeric or default fallback
        return sortDirection === 'asc'
            ? (valA < valB ? -1 : valA > valB ? 1 : 0)
            : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });

    const renderSortHeader = (label: string, field: string, textAlignment: string = 'text-left') => {
        const isCurrent = sortField === field;
        return (
            <div 
                onClick={(e) => {
                    e.stopPropagation();
                    handleSort(field);
                }}
                className={`flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none ${textAlignment === 'text-right' ? 'justify-end' : textAlignment === 'text-center' ? 'justify-center' : ''}`}
            >
                <span>{label}</span>
                {isCurrent ? (
                    sortDirection === 'asc' ? <ArrowUp size={12} className="text-primary shrink-0 animate-in fade-in zoom-in-75 duration-200" /> : <ArrowDown size={12} className="text-primary shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                ) : (
                    <ArrowUpDown size={12} className="text-muted-foreground/40 hover:text-muted-foreground/80 shrink-0 transition-colors" />
                )}
            </div>
        );
    };

    // Negotiation States
    const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
    const [selectedNegotiationTitulo, setSelectedNegotiationTitulo] = useState<EnrichedTitulo | null>(null);

    const openNegotiationModal = (titulo: EnrichedTitulo) => {
        setSelectedNegotiationTitulo(titulo);
        setIsNegotiationOpen(true);
    };

    const openReceber = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsReceberOpen(true);
    };

    const openObs = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsObsOpen(true);
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 pt-0 md:pt-0 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ShieldAlert className="w-8 h-8 text-destructive" />
                            {t('financeiro.title_cobranca', 'Gestão de Cobrança / Inadimplência')}
                        </h2>
                        <p className="text-muted-foreground mt-1">{t('financeiro.subtitle_cobranca', 'Monitore clientes inadimplentes, emita lembretes e encaminhe títulos para cobrança jurídica.')}</p>
                    </div>
                </div>

                {/* KPI Premium Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'atraso' ? 'border-l-destructive bg-destructive/5 dark:bg-destructive/20' : 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30'}`}
                        onClick={() => setActiveTab('atraso')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-destructive uppercase tracking-wider">{t('financeiro.kpis.title_overdue', 'Em Atraso (Vencidos)')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-destructive">{formatCurrency(kpis.atrasoVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.atrasoCount} {kpis.atrasoCount === 1 ? t('financeiro.kpis.pending_titles_singular', 'título pendente') : t('financeiro.kpis.pending_titles_plural', 'títulos pendentes')}</p>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'alerta' ? 'border-l-amber-500 bg-amber-50/10 dark:bg-amber-950/20' : 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30'}`}
                        onClick={() => setActiveTab('alerta')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{t('financeiro.kpis.title_due_soon', 'A Vencer (Próximos 7 Dias)')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-amber-500">{formatCurrency(kpis.alertaVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.alertaCount} {kpis.alertaCount === 1 ? t('financeiro.kpis.pending_titles_singular', 'título pendente') : t('financeiro.kpis.pending_titles_plural', 'títulos pendentes')}</p>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'judicial' ? 'border-l-red-800 bg-red-900/5 dark:bg-red-950/20' : 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30'}`}
                        onClick={() => setActiveTab('judicial')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-red-800 uppercase tracking-wider">{t('financeiro.kpis.title_judicial', 'Setor Judicial')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-red-800">{formatCurrency(kpis.judicialVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.judicialCount} {kpis.judicialCount === 1 ? t('financeiro.kpis.active_processes_singular', 'processo') : t('financeiro.kpis.active_processes_plural', 'processos ativos')}</p>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'negociado' ? 'border-l-indigo-650 bg-indigo-50/10 dark:bg-indigo-950/20' : 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30'}`}
                        onClick={() => setActiveTab('negociado')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">{t('financeiro.kpis.title_negotiated', 'Negociados')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">{formatCurrency(kpis.negociadoVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {kpis.negociadoCount} {kpis.negociadoCount === 1 ? t('financeiro.kpis.title_singular', 'fatura') : t('financeiro.kpis.titles_plural', 'faturas')} ({kpis.negociadoClientsCount} {kpis.negociadoClientsCount === 1 ? t('financeiro.kpis.client_singular', 'cliente') : t('financeiro.kpis.clients_plural', 'clientes')})
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-slate-600 bg-slate-100/50 dark:bg-slate-900/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('financeiro.kpis.title_total', 'Total Sob Cobrança')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(kpis.totalVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.totalCount} {kpis.totalCount === 1 ? t('financeiro.kpis.pending_titles_singular', 'título pendente') : t('financeiro.kpis.pending_titles_plural', 'títulos pendentes')}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm mt-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative flex-1 w-full md:max-w-2xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder={t('financeiro.filters.search_placeholder_cobranca', 'Buscar por cliente, documento...')}
                                className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative">
                                <Button 
                                    variant={activeFiltersCount > 0 ? "default" : "outline"} 
                                    onClick={() => setShowFilters(!showFilters)} 
                                    className="flex items-center gap-2 w-full md:w-auto"
                                >
                                    <Filter size={16} /> {t('financeiro.filters.btn_filter', 'Filtros')} {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                                </Button>

                                {showFilters && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-[300px] sm:w-[600px] md:w-[680px] bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl p-5 space-y-4 text-left">
                                        <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">{t('financeiro.filters.title_popover', 'Filtrar Lançamentos')}</h3>
                                            <button 
                                                onClick={() => setShowFilters(false)}
                                                className="text-muted-foreground hover:text-slate-850 dark:hover:text-slate-100"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[380px] overflow-y-auto pr-1">
                                            {/* Coluna 1 - Filtros Gerais */}
                                            <div className="space-y-3">
                                                {/* Empresa Filter */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.empresa', 'Empresa')}</label>
                                                    <MultiSelect
                                                        options={uniqueEmpresas.map(emp => ({ value: emp, label: emp }))}
                                                        selected={tempFilterEmpresas}
                                                        onChange={setTempFilterEmpresas}
                                                        placeholder={t('financeiro.filters.all_companies', 'Todas as Empresas')}
                                                    />
                                                </div>

                                                {/* Banco Filter */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.banco', 'Banco')}</label>
                                                    <MultiSelect
                                                        options={uniqueBancos.map(b => ({ value: b, label: b }))}
                                                        selected={tempFilterBancos}
                                                        onChange={setTempFilterBancos}
                                                        placeholder={t('financeiro.filters.all_banks', 'Todos os Bancos')}
                                                    />
                                                </div>

                                                {/* Mês de Faturamento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.periodo_fat', 'Mês de Faturamento')}</label>
                                                    <MultiSelect
                                                        options={uniquePeriodosFat.map(pf => ({ value: pf, label: pf }))}
                                                        selected={tempFilterPeriodosFat}
                                                        onChange={setTempFilterPeriodosFat}
                                                        placeholder={t('financeiro.filters.all_months', 'Todos os Meses')}
                                                    />
                                                </div>
                                            </div>

                                            {/* Coluna 2 - Períodos */}
                                            <div className="space-y-3 sm:border-l sm:pl-4 dark:border-slate-800">
                                                {/* Período de Emissão */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.periodo_emissao', 'Período de Emissão')}</label>
                                                    <select
                                                        value={tempFilterPeriodoEmissao}
                                                        onChange={(e) => setTempFilterPeriodoEmissao(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">{t('financeiro.filters.all_periods', 'Todo o Período')}</option>
                                                        <option value="this-month">{t('financeiro.filters.this_month', 'Este Mês')}</option>
                                                        <option value="past-30">{t('financeiro.filters.past_30', 'Últimos 30 Dias')}</option>
                                                        <option value="custom">{t('financeiro.filters.custom', 'Personalizado...')}</option>
                                                    </select>
                                                </div>

                                                {/* Custom Emissao dates */}
                                                {tempFilterPeriodoEmissao === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_from', 'DE')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateEmissao}
                                                                onChange={(e) => setTempStartDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_to', 'ATÉ')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateEmissao}
                                                                onChange={(e) => setTempEndDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Vencimento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.periodo_vencimento', 'Período de Vencimento')}</label>
                                                    <select
                                                        value={tempFilterPeriodoVencimento}
                                                        onChange={(e) => setTempFilterPeriodoVencimento(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">{t('financeiro.filters.all_periods', 'Todo o Período')}</option>
                                                        <option value="this-month">{t('financeiro.filters.this_month', 'Este Mês')}</option>
                                                        <option value="next-30">{t('financeiro.filters.next_30', 'Próximos 30 Dias')}</option>
                                                        <option value="custom">{t('financeiro.filters.custom', 'Personalizado...')}</option>
                                                    </select>
                                                </div>

                                                {/* Custom Vencimento dates */}
                                                {tempFilterPeriodoVencimento === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_from', 'DE')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateVencimento}
                                                                onChange={(e) => setTempStartDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_to', 'ATÉ')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateVencimento}
                                                                onChange={(e) => setTempEndDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Alteração */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('financeiro.filters.periodo_alteracao', 'Período de Alteração')}</label>
                                                    <select
                                                        value={tempFilterPeriodoAlteracao}
                                                        onChange={(e) => setTempFilterPeriodoAlteracao(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">{t('financeiro.filters.all_periods', 'Todo o Período')}</option>
                                                        <option value="this-month">{t('financeiro.filters.this_month', 'Este Mês')}</option>
                                                        <option value="past-30">{t('financeiro.filters.past_30', 'Últimos 30 Dias')}</option>
                                                        <option value="custom">{t('financeiro.filters.custom', 'Personalizado...')}</option>
                                                    </select>
                                                </div>

                                                {/* Custom Alteracao dates */}
                                                {tempFilterPeriodoAlteracao === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_from', 'DE')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateAlteracao}
                                                                onChange={(e) => setTempStartDateAlteracao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">{t('financeiro.filters.date_to', 'ATÉ')}</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateAlteracao}
                                                                onChange={(e) => setTempEndDateAlteracao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex justify-between items-center pt-3 border-t dark:border-slate-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Clear temporary
                                                    setTempFilterEmpresas([]);
                                                    setTempFilterBancos([]);
                                                    setTempFilterPeriodosFat([]);
                                                    setTempFilterPeriodoEmissao('all');
                                                    setTempStartDateEmissao('');
                                                    setTempEndDateEmissao('');
                                                    setTempFilterPeriodoVencimento('all');
                                                    setTempStartDateVencimento('');
                                                    setTempEndDateVencimento('');
                                                    setTempFilterPeriodoAlteracao('all');
                                                    setTempStartDateAlteracao('');
                                                    setTempEndDateAlteracao('');

                                                    // Clear active
                                                    setFilterEmpresas([]);
                                                    setFilterBancos([]);
                                                    setFilterPeriodosFat([]);
                                                    setFilterPeriodoEmissao('all');
                                                    setStartDateEmissao('');
                                                    setEndDateEmissao('');
                                                    setFilterPeriodoVencimento('all');
                                                    setStartDateVencimento('');
                                                    setEndDateVencimento('');
                                                    setFilterPeriodoAlteracao('all');
                                                    setStartDateAlteracao('');
                                                    setEndDateAlteracao('');

                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-semibold h-8"
                                            >
                                                {t('financeiro.filters.btn_clear', 'Limpar')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    // Apply filters
                                                    setFilterEmpresas(tempFilterEmpresas);
                                                    setFilterBancos(tempFilterBancos);
                                                    setFilterPeriodosFat(tempFilterPeriodosFat);
                                                    setFilterPeriodoEmissao(tempFilterPeriodoEmissao);
                                                    setStartDateEmissao(tempStartDateEmissao);
                                                    setEndDateEmissao(tempEndDateEmissao);
                                                    setFilterPeriodoVencimento(tempFilterPeriodoVencimento);
                                                    setStartDateVencimento(tempStartDateVencimento);
                                                    setEndDateVencimento(tempEndDateVencimento);
                                                    setFilterPeriodoAlteracao(tempFilterPeriodoAlteracao);
                                                    setStartDateAlteracao(tempStartDateAlteracao);
                                                    setEndDateAlteracao(tempEndDateAlteracao);

                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-bold h-8 text-white bg-primary hover:bg-primary/95"
                                            >
                                                {t('financeiro.filters.btn_apply', 'Aplicar Filtros')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(filterEmpresas.length > 0 || filterBancos.length > 0 || filterPeriodosFat.length > 0 || filterPeriodoEmissao !== 'all' || filterPeriodoVencimento !== 'all' || filterPeriodoAlteracao !== 'all' || searchTerm !== '') && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setFilterEmpresas([]);
                                        setFilterBancos([]);
                                        setFilterPeriodosFat([]);
                                        setFilterPeriodoEmissao('all');
                                        setStartDateEmissao('');
                                        setEndDateEmissao('');
                                        setFilterPeriodoVencimento('all');
                                        setStartDateVencimento('');
                                        setEndDateVencimento('');
                                        setFilterPeriodoAlteracao('all');
                                        setStartDateAlteracao('');
                                        setEndDateAlteracao('');
                                        setSearchTerm('');
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    {t('financeiro.filters.btn_clear', 'Limpar')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {(filterEmpresas.length > 0 || filterBancos.length > 0 || filterPeriodosFat.length > 0 || filterPeriodoEmissao !== 'all' || filterPeriodoVencimento !== 'all' || filterPeriodoAlteracao !== 'all') && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">{t('financeiro.filters.active_filters', 'Filtros ativos:')}</span>
                            
                            {/* Empresa Filter */}
                            {filterEmpresas.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Empresa: {filterEmpresas.join(', ')}</span>
                                    <button 
                                        onClick={() => setFilterEmpresas([])} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Banco Filter */}
                            {filterBancos.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Banco: {filterBancos.join(', ')}</span>
                                    <button 
                                        onClick={() => setFilterBancos([])} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Fat Filter */}
                            {filterPeriodosFat.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Fat: {filterPeriodosFat.join(', ')}</span>
                                    <button 
                                        onClick={() => setFilterPeriodosFat([])} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Emissao Filter */}
                            {filterPeriodoEmissao !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Emissão: {filterPeriodoEmissao === 'custom' ? `${formatDateInput(startDateEmissao)} a ${formatDateInput(endDateEmissao)}` : filterPeriodoEmissao.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoEmissao('all');
                                            setStartDateEmissao('');
                                            setEndDateEmissao('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Vencimento Filter */}
                            {filterPeriodoVencimento !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Venc: {filterPeriodoVencimento === 'custom' ? `${formatDateInput(startDateVencimento)} a ${formatDateInput(endDateVencimento)}` : filterPeriodoVencimento.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoVencimento('all');
                                            setStartDateVencimento('');
                                            setEndDateVencimento('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Alteracao Filter */}
                            {filterPeriodoAlteracao !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Alteração: {filterPeriodoAlteracao === 'custom' ? `${formatDateInput(startDateAlteracao)} a ${formatDateInput(endDateAlteracao)}` : filterPeriodoAlteracao.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoAlteracao('all');
                                            setStartDateAlteracao('');
                                            setEndDateAlteracao('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>

             {/* List Table Container */}
             <Card className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4 shadow-md">
                <CardHeader className="border-b py-3 px-4 bg-slate-50 dark:bg-slate-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-primary" />
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {activeTab === 'atraso' ? t('financeiro.table.list_debtors', 'Lista de Devedores em Atraso') : activeTab === 'alerta' ? t('financeiro.table.alerts_soon', 'Alertas de Vencimentos Próximos') : activeTab === 'judicial' ? t('financeiro.table.judicial_portfolio', 'Carteira Jurídico / Processos') : t('financeiro.table.negotiated_portfolio', 'Carteira de Acordos / Negociados')}
                            </CardTitle>
                            <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                {filteredData.length}
                            </span>
                        </div>

                        {/* Navigation Tabs buttons */}
                        <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-lg border max-w-fit text-xs font-semibold">
                            <button
                                onClick={() => setActiveTab('atraso')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'atraso' ? 'bg-white dark:bg-slate-800 text-destructive shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('financeiro.kpis.tab_overdue', 'Em Atraso')} ({kpis.atrasoCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('alerta')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'alerta' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('financeiro.kpis.tab_due_soon', 'A Vencer')} ({kpis.alertaCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('judicial')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'judicial' ? 'bg-white dark:bg-slate-800 text-red-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('financeiro.kpis.tab_judicial', 'Jurídico')} ({kpis.judicialCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('negociado')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'negociado' ? 'bg-white dark:bg-slate-800 text-indigo-650 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('financeiro.kpis.tab_negotiated', 'Negociados')} ({kpis.negociadoCount})
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-380px)] flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{renderSortHeader(t('financeiro.table.client_doc', 'Cliente / Doc'), 'Cliente')}</TableHead>
                                <TableHead>{renderSortHeader(t('financeiro.table.company', 'Empresa'), 'Empresa')}</TableHead>
                                <TableHead>{renderSortHeader(t('financeiro.table.bank', 'Banco'), 'Banco')}</TableHead>
                                <TableHead>{renderSortHeader(t('financeiro.table.billing_month', 'Mês Fat.'), 'periodo_fat')}</TableHead>
                                <TableHead>{renderSortHeader(t('financeiro.table.issued', 'Emissão'), 'Data_emissao')}</TableHead>
                                <TableHead>{renderSortHeader(t('financeiro.table.due', 'Vencimento'), 'Dt_venc')}</TableHead>
                                <TableHead className="text-right">{renderSortHeader(t('financeiro.table.value', 'Valor'), 'Valot_total', 'text-right')}</TableHead>
                                <TableHead className="text-right">{renderSortHeader(t('financeiro.table.balance', 'Saldo'), 'Saldo_a_pagar', 'text-right')}</TableHead>
                                <TableHead className="text-center">{renderSortHeader(t('financeiro.table.status', 'Status'), 'Status', 'text-center')}</TableHead>
                                <TableHead className="text-center">{t('financeiro.table.situation', 'Situação')}</TableHead>
                                <TableHead className="text-right px-6">{t('financeiro.table.actions', 'Ações de Cobrança')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        {t('financeiro.table.loading_data', 'Carregando dados...')}
                                    </TableCell>
                                </TableRow>
                            ) : sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground font-medium">
                                        {t('financeiro.table.no_pending_titles', 'Excelente! Nenhum título pendente nesta categoria.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((item) => {
                                    const delayDays = item.Dt_venc ? Math.floor((new Date().getTime() - new Date(item.Dt_venc).getTime()) / (1000 * 3600 * 24)) : 0;
                                    return (
                                        <TableRow key={item.id} className="group hover:bg-slate-50/50 cursor-pointer transition-colors duration-150" onClick={() => openZoom(item)}>
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate" title={item.Cliente || 'Sem Nome'}>
                                                    {item.Cliente || 'Sem Nome'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">{item.Num_doc}</div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-semibold">{item.Empresa || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-medium">{item.Banco || 'Não Definido'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-medium">{item.periodo_fat || '-'}</TableCell>
                                            <TableCell>{formatDate(item.Data_emissao)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{formatDate(item.Dt_venc)}</div>
                                                {(activeTab === 'atraso' || activeTab === 'negociado') && delayDays > 0 && (
                                                    <span className="text-[10px] text-destructive font-bold uppercase tracking-wider block">
                                                        ({delayDays} {delayDays === 1 ? t('financeiro.table.delay_day', 'dia de atraso') : t('financeiro.table.delay_days', 'dias de atraso')})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold">{formatCurrency(item.Valot_total)}</TableCell>
                                            <TableCell className="text-right font-extrabold text-brand-primary" onClick={(e) => e.stopPropagation()}>
                                                {formatCurrency(item.Saldo_a_pagar)}
                                            </TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                {item.Status === 'Pago' ? (
                                                     <Badge variant="default">{t('financeiro.status.paid', 'Pago')}</Badge>
                                                 ) : (item.Status === 'Negociado' || (item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0)))) ? (
                                                     <Badge variant="destructive">{t('financeiro.status.overdue', 'Vencido')}</Badge>
                                                 ) : (
                                                     <Badge variant="secondary" className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold">{t('financeiro.status.due_soon', 'A vencer')}</Badge>
                                                 )}
                                            </TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                {item.Status === 'Parcial' ? (
                                                     <TooltipProvider>
                                                         <Tooltip>
                                                             <TooltipTrigger className="cursor-help">
                                                                 <Badge variant="warning" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">{t('financeiro.status.partial', 'Parcial')}</Badge>
                                                             </TooltipTrigger>
                                                             <TooltipContent className="bg-white dark:bg-slate-900 border shadow-xl p-3 text-slate-800 dark:text-slate-100 text-xs max-w-[250px]">
                                                                 <p className="font-semibold text-brand-primary border-b pb-1 mb-1.5">{t('financeiro.tooltip.partial_receipt', 'Recebimento Parcial:')}</p>
                                                                 <div className="space-y-1 font-medium">
                                                                     <div className="flex justify-between"><span>{t('financeiro.tooltip.total_value', 'Valor Total:')}</span><span>{formatCurrency(item.Valot_total)}</span></div>
                                                                     <div className="flex justify-between text-green-600"><span>{t('financeiro.tooltip.paid_value', 'Valor Pago:')}</span><span>{formatCurrency(item.Valot_total - item.Saldo_a_pagar)}</span></div>
                                                                     <div className="flex justify-between text-destructive"><span>{t('financeiro.tooltip.remaining_balance', 'Saldo Restante:')}</span><span>{formatCurrency(item.Saldo_a_pagar)}</span></div>
                                                                 </div>
                                                             </TooltipContent>
                                                         </Tooltip>
                                                     </TooltipProvider>
                                                 ) : item.Status === 'Judicial' ? (
                                                     <TooltipProvider>
                                                         <Tooltip>
                                                             <TooltipTrigger className="cursor-help">
                                                                 <Badge variant="outline" className="border-red-600 text-red-600 bg-red-50 hover:bg-red-100 font-bold dark:bg-red-950/20 dark:text-red-400 dark:border-red-500">{t('financeiro.status.judicial', 'Jurídico')}</Badge>
                                                             </TooltipTrigger>
                                                             <TooltipContent className="bg-white dark:bg-slate-900 border shadow-xl p-3 text-slate-800 dark:text-slate-100 text-xs max-w-[250px]">
                                                                 <p className="font-semibold text-red-600 border-b pb-1 mb-1.5">{t('financeiro.tooltip.judicial_collection', 'Cobrança Jurídica:')}</p>
                                                                 <p className="font-medium">{t('financeiro.tooltip.judicial_desc', 'Este título foi encaminhado ao departamento jurídico para cobrança judicial.')}</p>
                                                             </TooltipContent>
                                                         </Tooltip>
                                                     </TooltipProvider>
                                                 ) : (item.Status === 'Negociado' || item.Integral_parcial === 'Negociado') ? (
                                                     <Badge variant="outline" className="border-indigo-600 text-indigo-650 bg-indigo-50 hover:bg-indigo-100 font-bold dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-500">{t('financeiro.status.negotiated', 'Negociado')}</Badge>
                                                 ) : (
                                                     <span className="text-muted-foreground">-</span>
                                                 )}
                                            </TableCell>
                                            <TableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Cobrar Email */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        title={t('financeiro.actions.btn_cobrar', 'Cobrar')}
                                                        onClick={() => openEmailModal(item)}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 text-xs font-semibold"
                                                    >
                                                        <Mail size={14} className="mr-1" /> {t('financeiro.actions.btn_cobrar', 'Cobrar')}
                                                    </Button>
                                                    
                                                    {/* Negociacoes Observacoes */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        title={t('financeiro.actions.btn_historico', 'Histórico')}
                                                        onClick={() => openObs(item)}
                                                        className="text-slate-600 hover:text-slate-700 hover:bg-slate-100 h-8 text-xs font-semibold"
                                                    >
                                                        <Clock size={14} className="mr-1" /> {t('financeiro.actions.btn_historico', 'Histórico')}
                                                    </Button>

                                                    {/* Negociar */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        title={t('financeiro.actions.btn_negociar', 'Negociar')}
                                                        onClick={() => openNegotiationModal(item)}
                                                        className="text-indigo-600 hover:text-indigo-750 hover:bg-indigo-50 border-indigo-200 h-8 text-xs font-semibold"
                                                    >
                                                        <Users size={14} className="mr-1" /> {t('financeiro.actions.btn_negociar', 'Negociar')}
                                                    </Button>

                                                    {/* Marcar Pago */}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title={t('financeiro.actions.btn_receber', 'Receber')}
                                                        onClick={() => openReceber(item)}
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Email Template Modal Dialog */}
            <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
                <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600">
                            <Mail className="w-5 h-5" />
                            {t('financeiro.email_modal.modal_title', 'Enviar E-mail de Cobrança')}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {t('financeiro.email_modal.modal_desc', 'Selecione um modelo de texto pré-pronto, valide o destinatário de faturamento e edite se necessário.')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTitulo && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-3 text-xs font-medium text-slate-700 dark:text-slate-350">
                            {/* Left Column: Configs */}
                            <div className="md:col-span-2 space-y-4">
                                {/* Templates Selection Tabs */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.modal_title', 'Modelo de E-mail')}</Label>
                                    <div className="flex flex-col gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => handleTemplateChange('friendly', selectedTitulo)}
                                            className={`py-1.5 px-3 text-left rounded-md font-bold transition-all text-xs ${emailTemplate === 'friendly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t('financeiro.email_modal.tab_friendly', 'Lembrete Amigável')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTemplateChange('overdue', selectedTitulo)}
                                            className={`py-1.5 px-3 text-left rounded-md font-bold transition-all text-xs ${emailTemplate === 'overdue' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t('financeiro.email_modal.tab_overdue', 'Aviso de Atraso')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTemplateChange('legal', selectedTitulo)}
                                            className={`py-1.5 px-3 text-left rounded-md font-bold transition-all text-xs ${emailTemplate === 'legal' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t('financeiro.email_modal.tab_legal', 'Notificação Pré-Jurídica')}
                                        </button>
                                        {negotiationParams && (
                                            <button
                                                type="button"
                                                onClick={() => handleTemplateChange('negotiation', selectedTitulo)}
                                                className={`py-1.5 px-3 text-left rounded-md font-bold transition-all text-xs ${emailTemplate === 'negotiation' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {t('financeiro.email_modal.tab_negotiation', 'Proposta de Acordo')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Language Selection */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.language_label', 'Idioma do E-mail')}</Label>
                                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => handleLanguageChange('pt')}
                                            className={`py-1 rounded-md font-bold transition-all text-xs text-center flex items-center justify-center gap-1 ${emailLanguage === 'pt' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span>🇵🇹</span> <span>PT</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLanguageChange('es')}
                                            className={`py-1 rounded-md font-bold transition-all text-xs text-center flex items-center justify-center gap-1 ${emailLanguage === 'es' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span>🇪🇸</span> <span>ES</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLanguageChange('fr')}
                                            className={`py-1 rounded-md font-bold transition-all text-xs text-center flex items-center justify-center gap-1 ${emailLanguage === 'fr' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span>🇫🇷</span> <span>FR</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLanguageChange('it')}
                                            className={`py-1 rounded-md font-bold transition-all text-xs text-center flex items-center justify-center gap-1 ${emailLanguage === 'it' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span>🇮🇹</span> <span>IT</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Sender Email */}
                                <div className="space-y-1">
                                    <Label htmlFor="emailRemetente" className="text-[10px] text-muted-foreground font-bold uppercase flex justify-between">
                                        <span>{t('financeiro.email_modal.label_sender', 'Remetente (Empresa: {{empresa}})', { empresa: selectedTitulo.Empresa })}</span>
                                        <span className="text-[9px] text-brand-primary lowercase font-normal italic">{t('financeiro.email_modal.sender_config_tip', 'Configurado em Cadastros > Empresas')}</span>
                                    </Label>
                                    <Input
                                        id="emailRemetente"
                                        type="email"
                                        value={emailRemetente}
                                        onChange={e => setEmailRemetente(e.target.value)}
                                        placeholder="financeiro@empresa.com"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Recipient Email */}
                                <div className="space-y-1">
                                    <Label htmlFor="emailDestinatario" className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.label_recipient', 'Destinatário (E-mail de Cobros do Cliente)')}</Label>
                                    <Input
                                        id="emailDestinatario"
                                        type="email"
                                        value={emailDestinatario}
                                        onChange={e => setEmailDestinatario(e.target.value)}
                                        placeholder="financeiro@cliente.com"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Subject */}
                                <div className="space-y-1">
                                    <Label htmlFor="emailSubject" className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.label_subject', 'Assunto')}</Label>
                                    <Input
                                        id="emailSubject"
                                        type="text"
                                        value={emailSubject}
                                        onChange={e => setEmailSubject(e.target.value)}
                                        className="h-9 text-xs font-semibold"
                                    />
                                </div>

                                {/* Attachment Section */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.label_attachment', 'Anexar Documento')}</Label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    const base64String = (reader.result as string).split(',')[1];
                                                    setEmailAttachment({
                                                        name: file.name,
                                                        contentType: file.type || 'application/octet-stream',
                                                        contentBytes: base64String
                                                    });
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                            className="hidden"
                                        />
                                        {!emailAttachment ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-9 flex items-center justify-center gap-2 border-dashed border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650"
                                            >
                                                <FileUp className="w-4 h-4 text-slate-500" />
                                                <span>{t('financeiro.email_modal.btn_add_attachment', 'Selecionar Arquivo...')}</span>
                                            </Button>
                                        ) : (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold truncate">
                                                    <Paperclip className="w-3.5 h-3.5 flex-none" />
                                                    <span className="truncate text-[11px]">{emailAttachment.name}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEmailAttachment(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="w-6 h-6 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Editor */}
                            <div className="md:col-span-3 space-y-2 flex flex-col h-full min-h-[480px]">
                                <Label className="text-[10px] text-muted-foreground font-bold uppercase">{t('financeiro.email_modal.label_message', 'Mensagem de Cobrança')}</Label>
                                <RichTextEditor value={emailBody} onChange={setEmailBody} />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t dark:border-slate-800 pt-3">
                        <Button variant="outline" onClick={() => setIsEmailOpen(false)} disabled={isSendingEmail}>
                            {t('financeiro.email_modal.btn_cancel', 'Cancelar')}
                        </Button>
                        <Button 
                            onClick={handleSendEmail} 
                            disabled={isSendingEmail || !emailDestinatario}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                            {isSendingEmail ? t('financeiro.email_modal.btn_sending', 'Enviando...') : t('financeiro.email_modal.btn_send', 'Enviar e Registrar no Histórico')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedTitulo && (
                <>
                    <ReceberCobroModal
                        titulo={selectedTitulo}
                        isOpen={isReceberOpen}
                        onClose={() => setIsReceberOpen(false)}
                        onSuccess={() => { loadData(); }}
                    />
                    <ObservacoesModal
                        titulo={selectedTitulo}
                        isOpen={isObsOpen}
                        onClose={() => setIsObsOpen(false)}
                    />
                </>
            )}

            {selectedDetailTitulo && (
                <CobroDetalhesSheet
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    titulo={selectedDetailTitulo}
                    onOpenEdit={openEditForm}
                    onOpenReceber={openReceber}
                    onOpenEmail={openEmailModal}
                    onRefresh={loadData}
                />
            )}

            <CobroFormSheet
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                initialData={editingCobro}
            />

            {selectedNegotiationTitulo && (
                <NegotiationModal
                    isOpen={isNegotiationOpen}
                    onClose={() => setIsNegotiationOpen(false)}
                    titulo={selectedNegotiationTitulo}
                    allTitles={data}
                    currentUser={currentUser}
                    onRefresh={loadData}
                    onOpenEmail={openEmailModal}
                />
            )}
        </div>
    );
};
