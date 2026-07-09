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

            // Search in the database for the worker by passport, DNI, NIE or NIF using clean alphanumeric prefix
            const docInputClean = formData.pasaporte.trim().replace(/[^a-zA-Z0-9]/g, '');
            const docPrefix = docInputClean.substring(0, Math.min(docInputClean.length, 5));
            const docFilter = `${docPrefix}%`;

            // @ts-ignore - Supabase types might mark schema as protected depending on the generator version
            const query = supabase.schema('core_personal').from('workers');
            const { data, error } = await query
                .select('id, cod_colab, nome, pasaporte, dni, nie, nif, status_trabajador, contracts(empresa_id)')
                .or(`pasaporte.ilike.${docFilter},dni.ilike.${docFilter},nie.ilike.${docFilter},nif.ilike.${docFilter}`);

            if (error || !data || data.length === 0) {
                console.error('Login error:', error);
                toast.error(t('workerPortal.login.error.invalidCredentials'));
                return;
            }

            // Verify locally using cleaned alphanumeric strings to avoid formatting differences
            const cleanDocument = (doc: string) => doc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const normalizedPassportInput = cleanDocument(formData.pasaporte);

            // Normalize name: remove extra spaces, accents, hidden chars and convert to lowercase
            const cleanName = (name: string) => {
                return name
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^\x20-\x7E]/g, "")
                    .replace(/\s+/g, " ");
            };
            const normalizedNameInput = cleanName(formData.nome);

            const validProfiles: any[] = [];
            data?.forEach(d => {
                const dbPassport = cleanDocument(d.pasaporte || '');
                const dbDni = cleanDocument(d.dni || '');
                const dbNie = cleanDocument(d.nie || '');
                const dbNif = cleanDocument(d.nif || '');

                const hasMatchingDocument = 
                    dbPassport === normalizedPassportInput ||
                    dbDni === normalizedPassportInput ||
                    dbNie === normalizedPassportInput ||
                    dbNif === normalizedPassportInput;

                const dbName = cleanName(d.nome || '');

                if (hasMatchingDocument && (dbName.includes(normalizedNameInput) || normalizedNameInput.includes(dbName))) {
                    const contracts = (d as any).contracts || [];
                    if (contracts.length > 0) {
                        contracts.forEach((c: any) => {
                            validProfiles.push({
                                id: d.id,
                                cod_colab: d.cod_colab,
                                nome: d.nome,
                                pasaporte: d.pasaporte || d.dni || d.nie || d.nif,
                                status_trabajador: d.status_trabajador,
                                empresa_id: c.empresa_id
                            });
                        });
                    } else {
                        validProfiles.push({
                            id: d.id,
                            cod_colab: d.cod_colab,
                            nome: d.nome,
                            pasaporte: d.pasaporte || d.dni || d.nie || d.nif,
                            status_trabajador: d.status_trabajador,
                            empresa_id: null
                        });
                    }
                }
            });

            if (validProfiles.length === 0) {
                toast.error(t('workerPortal.login.error.invalidCredentials'));
                return;
            }

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
