import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import {
    Loader2,
    ShieldCheck,
    Copy,
    Check,
    Send,
    Bold,
    List,
    Heading,
    Sparkles,
    Calendar,
    Mail,
    CheckCircle2,
    AlertTriangle,
    ClipboardList,
    Languages,
    ChevronDown,
    ChevronUp,
    RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Worker } from '@/shared/types/corePersonal';
import {
    createTariffAuthorizationRequest,
    listSystemUsers,
    listTariffAuthorizers,
    getTariffGovernanceSettings,
    buildTariffEmailFromTemplate,
    getCurrentYearMonth,
    formatMesVigenciaLabel,
    type TariffItemRequest,
} from '../api/tariffGovernanceApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

interface TariffAuthorizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workers: (Worker & { worker_beneficios_settings?: any })[];
    onSuccess?: () => void;
}

export function TariffAuthorizationModal({ open, onOpenChange, workers, onSuccess }: TariffAuthorizationModalProps) {
    const { user } = useAuth();
    const { selectedEmpresaId } = useEmpresa();
    const queryClient = useQueryClient();

    const { data: systemUsers = [] } = useQuery({
        queryKey: ['system-users-for-tariffs'],
        queryFn: listSystemUsers,
        enabled: open,
        refetchOnWindowFocus: false
    });

    const { data: authorizers = [], isLoading: loadingAuthorizers } = useQuery({
        queryKey: ['tariff-authorizers', 'active'],
        queryFn: () => listTariffAuthorizers(true),
        enabled: open,
        refetchOnWindowFocus: false
    });

    const { data: governanceSettings } = useQuery({
        queryKey: ['tariff-governance-settings'],
        queryFn: getTariffGovernanceSettings,
        enabled: open,
        refetchOnWindowFocus: false
    });

    const [solicitanteNome, setSolicitanteNome] = useState('');
    const [solicitanteEmail, setSolicitanteEmail] = useState('');
    const [selectedAuthorizerEmail, setSelectedAuthorizerEmail] = useState('');
    const [mesVigencia, setMesVigencia] = useState<string>(getCurrentYearMonth());
    const [motivoAlteracao, setMotivoAlteracao] = useState('');

    // Email language & customization
    const [emailLang, setEmailLang] = useState<'pt' | 'es'>('pt');
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [emailEditedManually, setEmailEditedManually] = useState(false);
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');

    // Map of worker_id -> proposed new tariff
    const [proposedTariffs, setProposedTariffs] = useState<Record<string, string>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<{
        token: string;
        url: string;
        codigoTermo: string;
        taskCreated: boolean;
        emailSent: boolean;
        emailError?: string;
        gerenteNome: string;
        gerenteEmail: string;
        gerentePhone?: string;
        mesVigencia: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user?.email) {
            const currentEmail = user.email.toLowerCase();
            setSolicitanteEmail(currentEmail);
            const matched = systemUsers.find(u => u.email.toLowerCase() === currentEmail);
            setSolicitanteNome(matched?.nome || user.user_metadata?.full_name || user.email);
        }
    }, [user, systemUsers]);

    // Pre-select default authorizer when modal opens
    useEffect(() => {
        if (open && authorizers.length > 0) {
            const alreadyValid = authorizers.some(a => a.email.toLowerCase() === selectedAuthorizerEmail.toLowerCase());
            if (!alreadyValid) {
                const defaultAuth = authorizers.find(a => a.is_default) || authorizers[0];
                if (defaultAuth) {
                    setSelectedAuthorizerEmail(defaultAuth.email);
                }
            }
        }
    }, [open, authorizers, selectedAuthorizerEmail]);

    useEffect(() => {
        if (open && workers && workers.length > 0) {
            const initialMap: Record<string, string> = {};
            workers.forEach(w => {
                const current = w.worker_beneficios_settings?.tarifa_hora ?? 0;
                initialMap[w.id] = Number(current).toFixed(2);
            });
            setProposedTariffs(initialMap);
            setMesVigencia(getCurrentYearMonth());
            setMotivoAlteracao('');
            setEmailLang('pt');
            setEmailEditedManually(false);
            setShowEmailEditor(false);
        }
    }, [open, workers]);

    const selectedAuthorizer = authorizers.find(
        a => a.email.toLowerCase() === selectedAuthorizerEmail.toLowerCase()
    );

    const buildPreviewItems = React.useCallback((): TariffItemRequest[] => {
        return (workers || []).map(w => {
            const currentTariff = Number(w.worker_beneficios_settings?.tarifa_hora || 0);
            const rawProposed = proposedTariffs[w.id] || '0';
            const newTariff = parseFloat(rawProposed.replace(',', '.')) || 0;
            return {
                worker_id: w.id,
                worker_nome: w.nome,
                cod_colab: w.cod_colab,
                cliente_nombre: w.cliente_nombre,
                tarifa_anterior: currentTariff,
                tarifa_nova: newTariff
            };
        });
    }, [workers, proposedTariffs]);

    const syncEmailFromTemplate = React.useCallback((langOverride?: 'pt' | 'es') => {
        if (!governanceSettings) return;
        const rendered = buildTariffEmailFromTemplate({
            lang: langOverride || emailLang,
            settings: governanceSettings,
            gerenteNome: selectedAuthorizer?.nome || '{{gerente}}',
            solicitanteNome: solicitanteNome || '{{solicitante}}',
            mesVigencia,
            codigoTermo: '{{codigo}}',
            itens: buildPreviewItems(),
            justificativa: motivoAlteracao || '-',
            signingUrl: '{{link}}'
        });
        setCustomSubject(rendered.subject);
        setCustomBody(rendered.body);
    }, [governanceSettings, emailLang, selectedAuthorizer, solicitanteNome, mesVigencia, buildPreviewItems, motivoAlteracao]);

    useEffect(() => {
        if (open && !emailEditedManually && governanceSettings) {
            syncEmailFromTemplate();
        }
    }, [open, emailEditedManually, governanceSettings, syncEmailFromTemplate]);

    const handleTariffChange = (workerId: string, value: string) => {
        setProposedTariffs(prev => ({
            ...prev,
            [workerId]: value
        }));
    };

    const insertFormatting = (prefix: string, suffix: string = '') => {
        setMotivoAlteracao(prev => {
            if (!prev) return `${prefix}Justificativa...${suffix}`;
            return `${prev}\n${prefix}${suffix}`;
        });
    };

    const handleGenerateRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!solicitanteNome.trim() || !solicitanteEmail.trim()) {
            toast.error('Não foi possível identificar o usuário solicitante logado.');
            return;
        }

        if (!selectedAuthorizer) {
            toast.error('Selecione o gerente autorizador (configure os autorizadores se a lista estiver vazia).');
            return;
        }

        if (!mesVigencia || !/^\d{4}-\d{2}$/.test(mesVigencia)) {
            toast.error('Informe o mês de início da vigência.');
            return;
        }

        if (!motivoAlteracao.trim()) {
            toast.error('Informe a justificativa do reajuste de tarifa.');
            return;
        }

        const items: TariffItemRequest[] = workers.map(w => {
            const currentTariff = Number(w.worker_beneficios_settings?.tarifa_hora || 0);
            const rawProposed = proposedTariffs[w.id] || '0';
            const newTariff = parseFloat(rawProposed.replace(',', '.')) || 0;

            return {
                worker_id: w.id,
                worker_nome: w.nome,
                cod_colab: w.cod_colab,
                cliente_nombre: w.cliente_nombre,
                tarifa_anterior: currentTariff,
                tarifa_nova: newTariff
            };
        });

        setIsSubmitting(true);
        try {
            const result = await createTariffAuthorizationRequest({
                solicitanteId: user?.id,
                solicitanteNome,
                solicitanteEmail,
                gerenteUserId: selectedAuthorizer.user_id || undefined,
                gerenteNome: selectedAuthorizer.nome,
                gerenteEmail: selectedAuthorizer.email,
                gerentePhone: selectedAuthorizer.phone || undefined,
                mesVigencia,
                motivoAlteracao,
                itens: items,
                empresaId: selectedEmpresaId || null,
                emailLanguage: emailLang,
                customEmailSubject: customSubject,
                customEmailBody: customBody
            });

            setGeneratedResult({
                token: result.token,
                url: result.url,
                codigoTermo: result.request.codigo_termo,
                taskCreated: result.taskCreated,
                emailSent: result.emailSent,
                emailError: result.emailError,
                gerenteNome: selectedAuthorizer.nome,
                gerenteEmail: selectedAuthorizer.email,
                gerentePhone: selectedAuthorizer.phone || undefined,
                mesVigencia
            });

            queryClient.invalidateQueries({ queryKey: ['worker-tariff-status-badges'] });
            queryClient.invalidateQueries({ queryKey: ['tariff-authorization-requests'] });

            toast.success('Termo gerado e enviado para autorização!');
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Error creating tariff authorization request:', err);
            toast.error(err?.message || 'Erro ao gerar termo de autorização.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyLink = () => {
        if (!generatedResult) return;
        navigator.clipboard.writeText(generatedResult.url);
        setCopied(true);
        toast.success('Link de autorização copiado!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            setGeneratedResult(null);
        }
        onOpenChange(newOpen);
    };

    const authorizerOptions = authorizers.map(a => ({
        value: a.email,
        label: `${a.nome} (${a.email})${a.is_default ? ' ★ Padrão' : ''}`
    }));

    if (!workers || workers.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        Solicitar Termo de Autorização de Tarifa
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        A alteração de tarifa só passa a valer após a assinatura eletrônica do autorizador e respeitará o mês de início da vigência.
                    </DialogDescription>
                </DialogHeader>

                {generatedResult ? (
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-lg space-y-2 text-center">
                            <Badge className="bg-emerald-600 text-white font-mono text-xs">
                                Termo Gerado: {generatedResult.codigoTermo}
                            </Badge>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                Solicitação Enviada para Autorização!
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Vigência programada: <strong>{formatMesVigenciaLabel(generatedResult.mesVigencia)}</strong> • Autorizador: <strong>{generatedResult.gerenteNome}</strong> ({generatedResult.gerenteEmail})
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${generatedResult.taskCreated ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                                <ClipboardList className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold">Tarefa na Super Gaveta</div>
                                    <div className="text-[11px] opacity-85">
                                        {generatedResult.taskCreated
                                            ? `Tarefa criada e atribuída para ${generatedResult.gerenteNome}.`
                                            : 'Não foi possível criar a tarefa automaticamente.'}
                                    </div>
                                </div>
                            </div>

                            <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${generatedResult.emailSent ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                                {generatedResult.emailSent ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                )}
                                <div>
                                    <div className="font-semibold">Notificação por E-mail</div>
                                    <div className="text-[11px] opacity-85">
                                        {generatedResult.emailSent
                                            ? `E-mail enviado para ${generatedResult.gerenteEmail}.`
                                            : `Falha no envio automático (${generatedResult.emailError || 'verifique o servidor de e-mail'}). Use o link abaixo.`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Link de Assinatura Eletrônica:
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={generatedResult.url}
                                    className="text-xs font-mono bg-slate-50 dark:bg-slate-900"
                                />
                                <Button size="sm" onClick={handleCopyLink} variant="outline" className="shrink-0 gap-1.5 text-xs">
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => handleClose(false)}
                                className="h-10 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold px-6"
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleGenerateRequest} className="space-y-4 py-2">
                        {/* Solicitante, Autorizador e Vigência */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Solicitante (Logado)</Label>
                                <Input
                                    readOnly
                                    value={`${solicitanteNome} (${solicitanteEmail})`}
                                    className="h-9 text-xs bg-slate-50 dark:bg-slate-900 text-slate-600"
                                />
                                <p className="text-[10px] text-muted-foreground">O e-mail será enviado em nome deste usuário.</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Autorizador Responsável *</Label>
                                {loadingAuthorizers ? (
                                    <div className="h-9 border rounded-md px-3 flex items-center text-xs text-muted-foreground gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
                                    </div>
                                ) : authorizers.length === 0 ? (
                                    <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[11px]">
                                        Nenhum autorizador configurado. Use <strong>Configurar Autorizadores</strong> na tela de Tarifas.
                                    </div>
                                ) : (
                                    <Combobox
                                        className="w-full h-9 text-xs bg-white dark:bg-slate-900"
                                        options={authorizerOptions}
                                        value={selectedAuthorizerEmail}
                                        onChange={setSelectedAuthorizerEmail}
                                        placeholder="Selecione o autorizador..."
                                        emptyText="Nenhum autorizador encontrado."
                                    />
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    Início da Vigência (Folha) *
                                </Label>
                                <Input
                                    type="month"
                                    value={mesVigencia}
                                    onChange={(e) => setMesVigencia(e.target.value)}
                                    className="h-9 text-xs font-semibold"
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Ex: <strong>12/2026</strong> não altera as horas de novembro.
                                </p>
                            </div>
                        </div>

                        {/* Workers Table with Proposed Tariffs */}
                        <div className="space-y-1.5 pt-1">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Definir Novas Tarifas Propostas ({workers.length} Colaborador(es)):
                            </Label>
                            <div className="border rounded-md max-h-52 overflow-y-auto bg-white dark:bg-slate-900">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold py-2">Trabalhador</TableHead>
                                            <TableHead className="text-xs font-bold py-2">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold py-2 text-right">Tarifa Atual</TableHead>
                                            <TableHead className="text-xs font-bold py-2 text-right w-[140px] text-indigo-700 dark:text-indigo-400">Nova Tarifa (€)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workers.map(w => {
                                            const currentTariff = Number(w.worker_beneficios_settings?.tarifa_hora || 0);

                                            return (
                                                <TableRow key={w.id} className="text-xs">
                                                    <TableCell className="py-2 font-medium">
                                                        <div>{w.nome}</div>
                                                        {w.cod_colab && <span className="text-[10px] text-muted-foreground font-mono">Cód: {w.cod_colab}</span>}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-muted-foreground">{w.cliente_nombre || '-'}</TableCell>
                                                    <TableCell className="py-2 text-right font-mono">€ {currentTariff.toFixed(2)}</TableCell>
                                                    <TableCell className="py-2 text-right">
                                                        <div className="relative inline-block w-28">
                                                            <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-mono">€</span>
                                                            <Input
                                                                type="text"
                                                                className="pl-6 h-8 text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 text-right"
                                                                value={proposedTariffs[w.id] ?? '0.00'}
                                                                onChange={(e) => handleTariffChange(w.id, e.target.value)}
                                                                autoFocus={workers.length === 1}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Justification */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    Justificativa / Motivo do Reajuste *
                                </Label>
                                <div className="flex gap-1">
                                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => insertFormatting('### ')}>
                                        <Heading className="w-3 h-3 mr-1" /> Título
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => insertFormatting('**', '**')}>
                                        <Bold className="w-3 h-3 mr-1" /> Negrito
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => insertFormatting('• ')}>
                                        <List className="w-3 h-3 mr-1" /> Tópico
                                    </Button>
                                </div>
                            </div>

                            <Textarea
                                rows={4}
                                value={motivoAlteracao}
                                onChange={(e) => setMotivoAlteracao(e.target.value)}
                                placeholder="Descreva aqui o motivo detalhado do reajuste de tarifa (ex: Aditivo contratual com o cliente, reajuste por mérito/função...)"
                                className="text-xs bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 leading-relaxed font-sans"
                                required
                            />
                        </div>

                        {/* Email Language & Inline Customization */}
                        <div className="border rounded-lg p-3 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Languages className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        Idioma do E-mail:
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={emailLang === 'pt' ? 'default' : 'outline'}
                                            className={`h-7 text-[11px] px-2.5 ${emailLang === 'pt' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                            onClick={() => {
                                                setEmailLang('pt');
                                                setEmailEditedManually(false);
                                                syncEmailFromTemplate('pt');
                                            }}
                                        >
                                            Português
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={emailLang === 'es' ? 'default' : 'outline'}
                                            className={`h-7 text-[11px] px-2.5 ${emailLang === 'es' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                            onClick={() => {
                                                setEmailLang('es');
                                                setEmailEditedManually(false);
                                                syncEmailFromTemplate('es');
                                            }}
                                        >
                                            Espanhol
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px] text-indigo-700 hover:bg-indigo-100/60 gap-1"
                                    onClick={() => setShowEmailEditor(v => !v)}
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    {showEmailEditor ? 'Ocultar Texto do E-mail' : 'Visualizar / Alterar E-mail'}
                                    {showEmailEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                            </div>

                            {showEmailEditor && (
                                <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-semibold">Assunto do E-mail</Label>
                                        {emailEditedManually && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[10px] gap-1 text-slate-600"
                                                onClick={() => {
                                                    setEmailEditedManually(false);
                                                    syncEmailFromTemplate();
                                                }}
                                            >
                                                <RotateCcw className="w-3 h-3" /> Restaurar do modelo
                                            </Button>
                                        )}
                                    </div>
                                    <Input
                                        value={customSubject}
                                        onChange={(e) => {
                                            setEmailEditedManually(true);
                                            setCustomSubject(e.target.value);
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                    />

                                    <Label className="text-[11px] font-semibold block">Corpo do E-mail (HTML)</Label>
                                    <Textarea
                                        rows={6}
                                        value={customBody}
                                        onChange={(e) => {
                                            setEmailEditedManually(true);
                                            setCustomBody(e.target.value);
                                        }}
                                        className="text-[11px] font-mono bg-white dark:bg-slate-900 leading-relaxed"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        As variáveis <code>{'{{codigo}}'}</code> e <code>{'{{link}}'}</code> serão substituídas automaticamente ao enviar.
                                    </p>
                                </div>
                            )}

                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3 text-indigo-500" />
                                Ao clicar em <strong>Enviar</strong>, será criada a tarefa na Super Gaveta e enviado o e-mail para <strong>{selectedAuthorizer?.email || 'o autorizador'}</strong>.
                            </p>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="h-9 text-xs">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || authorizers.length === 0 || !selectedAuthorizer}
                                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar para Autorização
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
