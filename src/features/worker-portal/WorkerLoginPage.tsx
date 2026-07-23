import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers';

export function WorkerLoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    
    // Forçar o tema light no portal do trabalhador independentemente da preferência do sistema
    useEffect(() => {
        setTheme('light');
    }, [setTheme]);

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
            toast.error(t('workerPortal.login.error.emptyFields'));
            return;
        }

        try {
            setLoading(true);

            // Call the SECURITY DEFINER RPC in the public schema to verify credentials securely without exposing RLS
            const { data, error } = await supabase.rpc('authenticate_worker', {
                p_nome: formData.nome,
                p_pasaporte: formData.pasaporte
            });

            if (error || !data || data.length === 0) {
                console.error('Login error:', error);
                toast.error(t('workerPortal.login.error.invalidCredentials'));
                return;
            }

            // Map returned database rows to valid profiles structure
            const validProfiles = data.map((d: any) => ({
                id: d.id,
                cod_colab: d.cod_colab,
                nome: d.nome,
                pasaporte: d.pasaporte,
                status_trabajador: d.status_trabajador,
                empresa_id: d.empresa_id,
                data_ingresso: d.data_ingresso,
                data_baixa: d.data_baixa
            }));

            // Save basic worker info plus ALL matching profiles to localStorage
            const mainProfile = validProfiles[0];
            const sessionData = {
                ...mainProfile,
                profiles: validProfiles
            };
            localStorage.setItem('worker_session', JSON.stringify(sessionData));

            toast.success(t('workerPortal.login.success', { name: mainProfile.nome.split(' ')[0] }));
            navigate('/portal/dashboard');

        } catch (err) {
            console.error('Unexpected error:', err);
            toast.error(t('workerPortal.login.error.generic'));
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
                    {t('workerPortal.login.title')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t('workerPortal.login.subtitle')}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <Card>
                    <form onSubmit={handleLogin}>
                        <CardHeader>
                            <CardTitle>{t('workerPortal.login.cardTitle')}</CardTitle>
                            <CardDescription>
                                {t('workerPortal.login.cardDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">{t('workerPortal.login.nameLabel')}</Label>
                                <Input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    placeholder={t('workerPortal.login.namePlaceholder')}
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    autoCapitalize="words"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pasaporte">{t('workerPortal.login.passportLabel')}</Label>
                                <Input
                                    id="pasaporte"
                                    name="pasaporte"
                                    type="text"
                                    placeholder={t('workerPortal.login.passportPlaceholder')}
                                    value={formData.pasaporte}
                                    onChange={handleChange}
                                    required
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? t('workerPortal.login.btnEntering') : t('workerPortal.login.btnEnter')}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
