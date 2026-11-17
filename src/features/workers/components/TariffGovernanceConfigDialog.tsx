import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Settings2, UserCheck, Mail, Star, Trash2, Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listSystemUsers,
    listTariffAuthorizers,
    saveTariffAuthorizer,
    setDefaultTariffAuthorizer,
    deleteTariffAuthorizer,
    getTariffGovernanceSettings,
    updateTariffGovernanceSettings,
    DEFAULT_EMAIL_SUBJECT,
    DEFAULT_EMAIL_BODY,
    DEFAULT_EMAIL_SUBJECT_ES,
    DEFAULT_EMAIL_BODY_ES,
    type TariffAuthorizer
} from '../api/tariffGovernanceApi';
import { useAuth } from '@/app/providers/AuthProvider';

interface TariffGovernanceConfigDialogProps {
    trigger?: React.ReactNode;
}

const TEMPLATE_VARIABLES = [
    { key: '{{gerente}}', desc: 'Nome do autorizador' },
    { key: '{{solicitante}}', desc: 'Nome de quem solicitou' },
    { key: '{{vigencia}}', desc: 'Mês/Ano de vigência' },
    { key: '{{codigo}}', desc: 'Código do termo (TAR-...)' },
    { key: '{{itens}}', desc: 'Lista de trabalhadores e tarifas' },
    { key: '{{justificativa}}', desc: 'Motivo informado' },
    { key: '{{link}}', desc: 'Link direto para assinatura' },
];

export function TariffGovernanceConfigDialog({ trigger }: TariffGovernanceConfigDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [savingAuth, setSavingAuth] = useState(false);

    const [emailLangTab, setEmailLangTab] = useState<'pt' | 'es'>('pt');
    const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_EMAIL_SUBJECT);
    const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_EMAIL_BODY);
    const [subjectTemplateEs, setSubjectTemplateEs] = useState(DEFAULT_EMAIL_SUBJECT_ES);
    const [bodyTemplateEs, setBodyTemplateEs] = useState(DEFAULT_EMAIL_BODY_ES);
    const [savingEmail, setSavingEmail] = useState(false);

    const { data: systemUsers = [] } = useQuery({
        queryKey: ['system-users-for-tariffs'],
        queryFn: listSystemUsers,
        enabled: open,
        refetchOnWindowFocus: false
    });

    const { data: authorizers = [], isLoading: loadingAuthorizers, refetch: refetchAuthorizers } = useQuery({
        queryKey: ['tariff-authorizers', 'all'],
        queryFn: () => listTariffAuthorizers(false),
        enabled: open,
        refetchOnWindowFocus: false
    });

    const { data: settings } = useQuery({
        queryKey: ['tariff-governance-settings'],
        queryFn: getTariffGovernanceSettings,
        enabled: open,
        refetchOnWindowFocus: false
    });

    useEffect(() => {
        if (settings) {
            setSubjectTemplate(settings.email_subject_template || DEFAULT_EMAIL_SUBJECT);
            setBodyTemplate(settings.email_body_template || DEFAULT_EMAIL_BODY);
            setSubjectTemplateEs(settings.email_subject_template_es || DEFAULT_EMAIL_SUBJECT_ES);
            setBodyTemplateEs(settings.email_body_template_es || DEFAULT_EMAIL_BODY_ES);
        }
    }, [settings]);

    const handleAddAuthorizer = async () => {
        if (!selectedUserId) {
            toast.error('Selecione um usuário do sistema para adicionar como autorizador.');
            return;
        }
        const matched = systemUsers.find(u => u.id === selectedUserId || u.email === selectedUserId);
        if (!matched || !matched.email) {
            toast.error('Usuário selecionado não possui e-mail cadastrado.');
            return;
        }

        setSavingAuth(true);
        try {
            await saveTariffAuthorizer({
                user_id: matched.id,
                email: matched.email,
                nome: matched.nome,
                phone: matched.phone || null,
                is_default: authorizers.length === 0,
                active: true
            });
            setSelectedUserId('');
            await refetchAuthorizers();
            queryClient.invalidateQueries({ queryKey: ['tariff-authorizers'] });
            toast.success(`${matched.nome} adicionado como autorizador de tarifas.`);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao adicionar autorizador.');
        } finally {
            setSavingAuth(false);
        }
    };

    const handleSetDefault = async (auth: TariffAuthorizer) => {
        try {
            await setDefaultTariffAuthorizer(auth.id);
            await refetchAuthorizers();
            queryClient.invalidateQueries({ queryKey: ['tariff-authorizers'] });
            toast.success(`${auth.nome} definido como autorizador padrão (pré-selecionado).`);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao definir padrão.');
        }
    };

    const handleDeleteAuthorizer = async (auth: TariffAuthorizer) => {
        try {
            await deleteTariffAuthorizer(auth.id);
            await refetchAuthorizers();
            queryClient.invalidateQueries({ queryKey: ['tariff-authorizers'] });
            toast.success(`${auth.nome} removido dos autorizadores.`);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao remover autorizador.');
        }
    };

    const handleSaveEmailTemplate = async () => {
        if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
            toast.error('Assunto e corpo do e-mail em Português não podem ficar vazios.');
            return;
        }
        setSavingEmail(true);
        try {
            await updateTariffGovernanceSettings({
                email_subject_template: subjectTemplate.trim(),
                email_body_template: bodyTemplate.trim(),
                email_subject_template_es: subjectTemplateEs.trim() || DEFAULT_EMAIL_SUBJECT_ES,
                email_body_template_es: bodyTemplateEs.trim() || DEFAULT_EMAIL_BODY_ES,
                updated_by_email: user?.email || undefined
            });
            queryClient.invalidateQueries({ queryKey: ['tariff-governance-settings'] });
            toast.success('Modelos de e-mail (PT e ES) salvos com sucesso!');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao salvar modelo de e-mail.');
        } finally {
            setSavingEmail(false);
        }
    };

    const existingEmails = new Set(authorizers.map(a => a.email.toLowerCase()));
    const availableUserOptions = systemUsers
        .filter(u => u.email && !existingEmails.has(u.email.toLowerCase()))
        .map(u => ({
            value: u.id,
            label: `${u.nome} (${u.email})`
        }));

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)} className="inline-block">
                    {trigger}
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-semibold gap-1.5"
                    onClick={() => setOpen(true)}
                >
                    <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                    Configurar Autorizadores & E-mail
                </Button>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                            <Settings2 className="w-5 h-5" />
                            Configurações de Governança de Tarifas
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Defina quem pode autorizar alterações de tarifa (e quem vem pré-selecionado) e personalize o e-mail enviado automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="authorizers" className="mt-2">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="authorizers" className="text-xs gap-1.5">
                                <UserCheck className="w-3.5 h-3.5" />
                                Autorizadores ({authorizers.length})
                            </TabsTrigger>
                            <TabsTrigger value="email" className="text-xs gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                Modelo de E-mail
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="authorizers" className="space-y-4 pt-3">
                            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 space-y-2.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Adicionar Pessoa Autorizadora (Usuário do Sistema)
                                </Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Combobox
                                            options={availableUserOptions}
                                            value={selectedUserId}
                                            onChange={setSelectedUserId}
                                            placeholder="Selecione um usuário (ex: Cauã, Brenda, Sílvio)..."
                                            searchPlaceholder="Buscar por nome ou e-mail..."
                                            emptyText="Nenhum usuário disponível."
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-1"
                                        disabled={savingAuth || !selectedUserId}
                                        onClick={handleAddAuthorizer}
                                    >
                                        {savingAuth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        Adicionar
                                    </Button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Apenas os usuários listados abaixo aparecerão como opção de Autorizador ao solicitar alteração de tarifa.
                                </p>
                            </div>

                            <div className="border rounded-lg divide-y">
                                {loadingAuthorizers ? (
                                    <div className="p-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando autorizadores...
                                    </div>
                                ) : authorizers.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-muted-foreground">
                                        Nenhum autorizador configurado ainda. Adicione acima os responsáveis (ex: Cauã, Brenda, Sílvio).
                                    </div>
                                ) : (
                                    authorizers.map(auth => (
                                        <div key={auth.id} className="p-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                        {auth.nome}
                                                    </span>
                                                    {auth.is_default && (
                                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] hover:bg-amber-100">
                                                            Pré-selecionado (Padrão)
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {auth.email}{auth.phone ? ` • ${auth.phone}` : ''}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {!auth.is_default && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[11px] gap-1"
                                                        onClick={() => handleSetDefault(auth)}
                                                        title="Definir como pré-selecionado"
                                                    >
                                                        <Star className="w-3 h-3 text-amber-500" />
                                                        Tornar Padrão
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => handleDeleteAuthorizer(auth)}
                                                    title="Remover autorizador"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="email" className="space-y-4 pt-3">
                            <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Idioma do Modelo:
                                </span>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={emailLangTab === 'pt' ? 'default' : 'outline'}
                                        className={`h-7 text-xs ${emailLangTab === 'pt' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                        onClick={() => setEmailLangTab('pt')}
                                    >
                                        Português (PT)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={emailLangTab === 'es' ? 'default' : 'outline'}
                                        className={`h-7 text-xs ${emailLangTab === 'es' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                        onClick={() => setEmailLangTab('es')}
                                    >
                                        Espanhol (ES)
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Variáveis Disponíveis (clique para inserir no corpo)</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {TEMPLATE_VARIABLES.map(v => (
                                        <button
                                            key={v.key}
                                            type="button"
                                            onClick={() => {
                                                if (emailLangTab === 'pt') {
                                                    setBodyTemplate(prev => `${prev} ${v.key}`);
                                                } else {
                                                    setBodyTemplateEs(prev => `${prev} ${v.key}`);
                                                }
                                            }}
                                            className="px-2 py-1 rounded border bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-[11px] font-mono transition-colors"
                                            title={v.desc}
                                        >
                                            {v.key} <span className="font-sans text-[10px] text-slate-500">({v.desc})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">
                                    Assunto do E-mail ({emailLangTab === 'pt' ? 'Português' : 'Espanhol'})
                                </Label>
                                <Input
                                    value={emailLangTab === 'pt' ? subjectTemplate : subjectTemplateEs}
                                    onChange={(e) =>
                                        emailLangTab === 'pt'
                                            ? setSubjectTemplate(e.target.value)
                                            : setSubjectTemplateEs(e.target.value)
                                    }
                                    className="text-xs"
                                    placeholder="Assunto do e-mail..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">
                                    Corpo do E-mail (HTML - {emailLangTab === 'pt' ? 'Português' : 'Espanhol'})
                                </Label>
                                <Textarea
                                    value={emailLangTab === 'pt' ? bodyTemplate : bodyTemplateEs}
                                    onChange={(e) =>
                                        emailLangTab === 'pt'
                                            ? setBodyTemplate(e.target.value)
                                            : setBodyTemplateEs(e.target.value)
                                    }
                                    className="min-h-[200px] font-mono text-xs leading-relaxed"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => {
                                        if (emailLangTab === 'pt') {
                                            setSubjectTemplate(DEFAULT_EMAIL_SUBJECT);
                                            setBodyTemplate(DEFAULT_EMAIL_BODY);
                                        } else {
                                            setSubjectTemplateEs(DEFAULT_EMAIL_SUBJECT_ES);
                                            setBodyTemplateEs(DEFAULT_EMAIL_BODY_ES);
                                        }
                                    }}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restaurar Padrão ({emailLangTab.toUpperCase()})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1.5 font-semibold"
                                    disabled={savingEmail}
                                    onClick={handleSaveEmailTemplate}
                                >
                                    {savingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Salvar Modelos de E-mail
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}
