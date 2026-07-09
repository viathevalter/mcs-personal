import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Users, Tags, Building2 } from 'lucide-react';
import { CategoriaSettings } from '../components/CategoriaSettings';
import { BancoSettings } from '../components/BancoSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export const Settings = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showForceOption, setShowForceOption] = useState(false);

    const [cobrancaEmail, setCobrancaEmail] = useState('');
    const [loadingCobranca, setLoadingCobranca] = useState(false);
    const [savingCobranca, setSavingCobranca] = useState(false);
    const [cobrancaConfigId, setCobrancaConfigId] = useState<string | null>(null);

    useEffect(() => {
        const loadCobrancaConfig = async () => {
            setLoadingCobranca(true);
            try {
                const { data, error } = await supabase
                    .from('cobranca_configuracoes')
                    .select('*')
                    .limit(1)
                    .single();
                if (data) {
                    setCobrancaEmail(data.email_remetente || '');
                    setCobrancaConfigId(data.id);
                }
            } catch (err) {
                console.error('Error loading billing configuration:', err);
            } finally {
                setLoadingCobranca(false);
            }
        };
        loadCobrancaConfig();
    }, []);

    const handleSaveCobranca = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cobrancaEmail.trim()) {
            toast.error('Por favor, insira um e-mail de remetente válido.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cobrancaEmail)) {
            toast.error('O e-mail inserido é inválido.');
            return;
        }

        setSavingCobranca(true);
        try {
            if (cobrancaConfigId) {
                const { error } = await supabase
                    .from('cobranca_configuracoes')
                    .update({ 
                        email_remetente: cobrancaEmail.trim(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', cobrancaConfigId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('cobranca_configuracoes')
                    .insert([{ email_remetente: cobrancaEmail.trim() }])
                    .select()
                    .single();
                if (error) throw error;
                if (data) setCobrancaConfigId(data.id);
            }
            toast.success('Configurações de cobrança salvas com sucesso!');
        } catch (err: any) {
            console.error('Error saving billing config:', err);
            toast.error('Erro ao salvar configurações de cobrança: ' + err.message);
        } finally {
            setSavingCobranca(false);
        }
    };

    const handleInvite = async (e?: React.FormEvent, force: boolean = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        setMessage(null);
        if (!force) setShowForceOption(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('Você precisa estar logado para convidar usuários.');
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    email,
                    force,
                    origin: window.location.origin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.message && (
                    data.message.includes('already been registered') ||
                    data.message.includes('User already registered')
                )) {
                    setMessage({ type: 'error', text: 'Este e-mail já está cadastrado.' });
                    setShowForceOption(true);
                    return;
                }
                throw new Error(data.message || 'Erro ao enviar convite');
            }

            setMessage({ type: 'success', text: `Convite enviado com sucesso para ${email}!` });
            setEmail('');
            setShowForceOption(false);
        } catch (err: any) {
            console.error('Invite error:', err);
            setMessage({ type: 'error', text: err.message || 'Falha ao convidar usuário.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Configurações</h1>

            <Tabs defaultValue="categorias" className="w-full">
                <TabsList className="mb-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <TabsTrigger value="categorias" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white dark:data-[state=active]:bg-brand-primary dark:text-slate-300">
                        <Tags className="w-4 h-4 mr-2" />
                        Categorias de Receitas/Despesas
                    </TabsTrigger>
                    <TabsTrigger value="bancos" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white dark:data-[state=active]:bg-brand-primary dark:text-slate-300">
                        <Building2 className="w-4 h-4 mr-2" />
                        Contas Bancárias
                    </TabsTrigger>
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white dark:data-[state=active]:bg-brand-primary dark:text-slate-300">
                        <Users className="w-4 h-4 mr-2" />
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="cobranca" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white dark:data-[state=active]:bg-brand-primary dark:text-slate-300">
                        <Mail className="w-4 h-4 mr-2" />
                        Cobrança
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categorias">
                    <CategoriaSettings />
                </TabsContent>

                <TabsContent value="bancos">
                    <BancoSettings />
                </TabsContent>

                <TabsContent value="usuarios">
                    <div className="bg-white dark:bg-slate-900/50 border dark:border-slate-800 shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Gerenciamento de Usuários</h2>

                        <div className="max-w-xl">
                            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                                Convidar novo usuário
                            </label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <div className="relative flex-grow focus-within:z-10">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="email"
                                        name="invite-email"
                                        id="invite-email"
                                        className="focus:ring-brand-action focus:border-brand-action block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-gray-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-205 py-2.5"
                                        placeholder="usuario@exemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleInvite}
                                    disabled={loading || !email}
                                    className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-800 text-sm font-medium rounded-r-md text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-action focus:border-brand-action disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    ) : (
                                        <Send className="h-5 w-5 text-gray-400" />
                                    )}
                                    <span>Convidar</span>
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                O usuário receberá um e-mail com instruções para definir sua senha.
                            </p>

                            {message && (
                                <div className={`mt-4 rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            {message.type === 'success' ? (
                                                <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-500" aria-hidden="true" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" aria-hidden="true" />
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                                {message.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showForceOption && (
                                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900/50">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                                        Deseja excluir o usuário existente e enviar um novo convite?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleInvite(undefined, true)}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Sim, excluir e reenviar convite
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="cobranca">
                    <div className="bg-white dark:bg-slate-900/50 border dark:border-slate-800 shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Configurações de Cobrança</h2>
                        <p className="text-xs text-muted-foreground mb-6">Configure as credenciais e parâmetros globais do módulo de Cobrança e Inadimplência.</p>

                        <form onSubmit={handleSaveCobranca} className="max-w-xl space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="cobranca-email" className="block text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider">
                                    E-mail Global de Remetente (Microsoft Tenant)
                                </label>
                                <input
                                    type="email"
                                    id="cobranca-email"
                                    disabled={loadingCobranca || savingCobranca}
                                    className="focus:ring-brand-action focus:border-brand-action block w-full rounded-md sm:text-sm border-gray-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-205 py-2 px-3"
                                    placeholder="cobrancas@empresa.com"
                                    value={cobrancaEmail}
                                    onChange={(e) => setCobrancaEmail(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1.5 leading-normal">
                                    Este e-mail será utilizado como o endereço de envio ("Remetente") padrão para todos os e-mails de notificação, lembretes amigáveis, avisos de atraso e propostas de negociação de todas as empresas do portfólio.
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loadingCobranca || savingCobranca || !cobrancaEmail}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingCobranca ? 'Salvando...' : 'Salvar Configurações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
