import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Users, Tags, Building2 } from 'lucide-react';
import { CategoriaSettings } from '../components/CategoriaSettings';
import { BancoSettings } from '../components/BancoSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Settings = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showForceOption, setShowForceOption] = useState(false);

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
            <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>

            <Tabs defaultValue="categorias" className="w-full">
                <TabsList className="mb-6 bg-white border border-gray-200">
                    <TabsTrigger value="categorias" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white">
                        <Tags className="w-4 h-4 mr-2" />
                        Categorias de Receitas/Despesas
                    </TabsTrigger>
                    <TabsTrigger value="bancos" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white">
                        <Building2 className="w-4 h-4 mr-2" />
                        Contas Bancárias
                    </TabsTrigger>
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-brand-primary data-[state=active]:text-white">
                        <Users className="w-4 h-4 mr-2" />
                        Usuários
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categorias">
                    <CategoriaSettings />
                </TabsContent>

                <TabsContent value="bancos">
                    <BancoSettings />
                </TabsContent>

                <TabsContent value="usuarios">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Gerenciamento de Usuários</h2>

                        <div className="max-w-xl">
                            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                                Convidar novo usuário
                            </label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <div className="relative flex-grow focus-within:z-10">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="email"
                                        name="invite-email"
                                        id="invite-email"
                                        className="focus:ring-brand-action focus:border-brand-action block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-gray-300 py-2.5"
                                        placeholder="usuario@exemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleInvite}
                                    disabled={loading || !email}
                                    className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-action focus:border-brand-action disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    ) : (
                                        <Send className="h-5 w-5 text-gray-400" />
                                    )}
                                    <span>Convidar</span>
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                O usuário receberá um e-mail com instruções para definir sua senha.
                            </p>

                            {message && (
                                <div className={`mt-4 rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            {message.type === 'success' ? (
                                                <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                                {message.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showForceOption && (
                                <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                                    <p className="text-sm text-yellow-800 mb-2">
                                        Deseja excluir o usuário existente e enviar um novo convite?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleInvite(undefined, true)}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Sim, excluir e reenviar convite
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
