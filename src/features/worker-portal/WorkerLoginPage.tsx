import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export function WorkerLoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        pasaporte: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nome.trim() || !formData.pasaporte.trim()) {
            toast.error('Preencha o Nome e o Número do Passaporte');
            return;
        }

        try {
            setLoading(true);

            // Search in the database for the worker
            // Using ilike for case-insensitive name match
            // @ts-ignore - Supabase types might mark schema as protected depending on the generatord version
            const query = supabase.schema('core_personal').from('workers');
            const { data, error } = await query
                .select('id, empresa_id, cod_colab, nome, pasaporte, status_trabajador, cliente_nombre')
                .ilike('nome', `%${formData.nome.trim()}%`)
                .eq('pasaporte', formData.pasaporte.trim());

            if (error || !data || data.length === 0) {
                console.error('Login error:', error);
                toast.error('Credenciais inválidas. Verifique seu nome e passaporte.');
                return;
            }

            // Save basic worker info plus ALL matching profiles to localStorage
            const mainProfile = data[0];
            const sessionData = {
                ...mainProfile,
                profiles: data
            };
            localStorage.setItem('worker_session', JSON.stringify(sessionData));

            toast.success(`Bem-vindo, ${mainProfile.nome.split(' ')[0]}!`);
            navigate('/portal/dashboard');

        } catch (err) {
            console.error('Unexpected error:', err);
            toast.error('Ocorreu um erro ao tentar fazer login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="rounded-full bg-blue-100 p-3">
                        <Briefcase className="h-10 w-10 text-blue-600" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Portal do Trabalhador
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Acesso exclusivo para envio de folhas de horas
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <Card>
                    <form onSubmit={handleLogin}>
                        <CardHeader>
                            <CardTitle>Acessar sua conta</CardTitle>
                            <CardDescription>
                                Informe seu Nome Completo e o número do seu Passaporte para entrar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome Completo</Label>
                                <Input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    placeholder="Ex: João da Silva"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pasaporte">Número do Passaporte</Label>
                                <Input
                                    id="pasaporte"
                                    name="pasaporte"
                                    type="text"
                                    placeholder="Digite o número exato"
                                    value={formData.pasaporte}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Entrando...' : 'Entrar no Portal'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
