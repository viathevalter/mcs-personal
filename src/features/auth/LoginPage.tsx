import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/shared/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, TrendingUp, Users } from 'lucide-react';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
    email: z.string().email({ message: 'E-mail inválido.' }),
    password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });

        setLoading(false);

        if (error) {
            toast.error('Erro ao fazer login', {
                description: error.message,
            });
        } else {
            // Redirect to Hub instead of Dashboard
            navigate('/hub');
        }
    };

    return (
        <div className="flex min-h-screen w-full">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 p-12 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-900 to-black pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 font-bold text-2xl tracking-tight mb-12">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                            M
                        </div>
                        MasterCorp
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6">
                        Gestão Integrada de<br/>
                        <span className="text-emerald-400">Processos</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md">
                        O hub central para gerenciar Operações, Faturamento, RH e Comercial em uma única plataforma segura e ágil.
                    </p>
                </div>

                <div className="relative z-10 grid gap-6 mt-12">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 p-3 rounded-full">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-200">Segurança de Nível Militar</h3>
                            <p className="text-sm text-slate-400">Acesso controlado e isolamento de dados (RLS)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 p-3 rounded-full">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-200">Alta Performance</h3>
                            <p className="text-sm text-slate-400">Arquitetura reativa de ponta</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 p-3 rounded-full">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-200">Multi-Empresas</h3>
                            <p className="text-sm text-slate-400">Gerencie múltiplas marcas em um só lugar</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-slate-500 mt-12">
                    &copy; {new Date().getFullYear()} MasterCorp. Todos os direitos reservados.
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-24 bg-white dark:bg-slate-950">
                <div className="w-full max-w-sm mx-auto space-y-8">
                    <div className="text-center lg:text-left space-y-2">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-2xl">
                                M
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Bem-vindo</h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Entre com suas credenciais para acessar o hub.
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 dark:text-slate-300">E-mail Corporativo</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="usuario@mastercorp.com" 
                                                className="h-12 bg-slate-50 dark:bg-slate-900"
                                                autoComplete="email"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-slate-700 dark:text-slate-300">Senha</FormLabel>
                                            <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                                                Esqueceu a senha?
                                            </a>
                                        </div>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                className="h-12 bg-slate-50 dark:bg-slate-900"
                                                autoComplete="current-password"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : null}
                                Acessar Sistema
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
