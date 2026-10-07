import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { User, FileText, Lock, HelpCircle, Check, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers';

export function WorkerLoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [helpOpen, setHelpOpen] = useState(false);

    // Forçar tema light no portal do trabalhador
    useEffect(() => {
        setTheme('light');
    }, [setTheme]);

    const [formData, setFormData] = useState({
        nome: '',
        pasaporte: ''
    });

    // Auto-preencher credenciais salvas se o trabalhador marcou "Lembrar"
    useEffect(() => {
        const saved = localStorage.getItem('worker_remember_login');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.nome && parsed.pasaporte) {
                    setFormData({ nome: parsed.nome, pasaporte: parsed.pasaporte });
                    setRememberMe(true);
                }
            } catch (_) {}
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const toggleLanguage = () => {
        const nextLang = (i18n.language || '').startsWith('es') ? 'pt' : 'es';
        i18n.changeLanguage(nextLang);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nome.trim() || !formData.pasaporte.trim()) {
            toast.error(t('workerPortal.login.errorEmpty', 'Por favor, informe seu nome completo e passaporte.'));
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.rpc('authenticate_worker', {
                p_nome: formData.nome.trim(),
                p_pasaporte: formData.pasaporte.trim()
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error(t('workerPortal.login.errorEmpty', 'Trabalhador não encontrado com estes dados. Verifique a ortografia do seu nome e passaporte.'));
                return;
            }

            const current = data[0];
            const primaryWorker = {
                ...current,
                profiles: data,
                empresa_nome: current.contratante || current.empresa_nome,
                contratante: current.contratante || current.empresa_nome
            };

            // Salvar sessão
            localStorage.setItem('worker_session', JSON.stringify(primaryWorker));

            // Salvar para preenchimento futuro se optou por lembrar
            if (rememberMe) {
                localStorage.setItem('worker_remember_login', JSON.stringify({
                    nome: formData.nome.trim(),
                    pasaporte: formData.pasaporte.trim()
                }));
            } else {
                localStorage.removeItem('worker_remember_login');
            }

            toast.success(`Bem-vindo, ${primaryWorker.nome.split(' ')[0]}!`);
            navigate('/portal');
        } catch (err: any) {
            console.error('Erro de autenticação:', err);
            toast.error(err.message || t('workerPortal.login.errorGeneric', 'Erro ao realizar login.'));
        } finally {
            setLoading(false);
        }
    };

    const currentLang = (i18n.language || '').startsWith('es') ? 'ES' : 'PT';

    return (
        <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-white overflow-hidden">
            {/* Foto de Fundo Mais Clara com Overlay Industrial Suave */}
            <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-75 scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url('/assets/images/hero-welder.jpg'), url('/luminous_hero_welder_mkt03.jpg')` }}
            />
            {/* Overlay gradiente mais claro para valorizar o ambiente industrial da solda */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-slate-900/25 z-0" />

            {/* Barra superior de idioma */}
            <div className="relative z-20 flex justify-end p-4 max-w-md mx-auto w-full">
                <button
                    type="button"
                    onClick={toggleLanguage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:bg-black/60 active:scale-95 transition-all shadow-md"
                >
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{currentLang === 'ES' ? '🇪🇸 Español' : '🇵🇹 Português'}</span>
                </button>
            </div>

            {/* Conteúdo Central */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-4 max-w-md mx-auto w-full">
                {/* Logo e Boas-vindas */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl mb-3">
                        <img 
                            src="/logo_mcs_transparent.png" 
                            alt="MCS MultiCompany System" 
                            className="h-9 w-auto object-contain brightness-0 invert"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                        <span className="font-extrabold text-xl tracking-tight ml-2">MCS</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-extrabold block mb-1">
                        {t('workerPortal.login.portalName', 'Portal do Trabalhador')}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                        {t('workerPortal.login.welcomeTitle', 'Bem-vindo')}
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-200 max-w-xs mx-auto leading-relaxed drop-shadow-xs">
                        {t('workerPortal.login.welcomeSubtitle', 'Registe as suas horas de trabalho de forma rápida, simples e segura.')}
                    </p>
                </div>

                {/* Formulário de Login */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 border border-white/20">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Nome Completo */}
                        <div className="space-y-1">
                            <Label htmlFor="nome" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                {t('workerPortal.login.nameLabel', 'Nome Completo')}
                            </Label>
                            <div className="relative rounded-2xl shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <User className="h-4 w-4" />
                                </div>
                                <Input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    placeholder={t('workerPortal.login.namePlaceholder', 'Como consta no seu documento')}
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:border-emerald-600 focus:ring-emerald-600 text-xs sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Passaporte */}
                        <div className="space-y-1">
                            <Label htmlFor="pasaporte" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                {t('workerPortal.login.passportLabel', 'Passaporte ou Documento')}
                            </Label>
                            <div className="relative rounded-2xl shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <Input
                                    id="pasaporte"
                                    name="pasaporte"
                                    type="text"
                                    placeholder={t('workerPortal.login.passportPlaceholder', 'Número do passaporte, NIE ou DNI')}
                                    value={formData.pasaporte}
                                    onChange={handleChange}
                                    required
                                    autoComplete="off"
                                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 font-mono focus:bg-white focus:border-emerald-600 focus:ring-emerald-600 text-xs sm:text-sm uppercase"
                                />
                            </div>
                        </div>

                        {/* Lembrar-me */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                {t('workerPortal.login.rememberMe', 'Lembrar neste aparelho')}
                            </label>
                        </div>

                        {/* Botão de Entrar */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{t('workerPortal.login.btnLoggingIn', 'A verificar...')}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t('workerPortal.login.btnLogin', 'Entrar no Portal')}</span>
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Ajuda */}
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                        <button
                            type="button"
                            onClick={() => setHelpOpen(true)}
                            className="text-xs text-slate-500 hover:text-emerald-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                            {t('workerPortal.login.needHelp', 'Precisa de ajuda para aceder?')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Rodapé institucional */}
            <div className="relative z-10 py-3 text-center text-[11px] text-slate-400 font-medium max-w-md mx-auto w-full">
                <span>MCS MultiCompany System &bull; &copy; {new Date().getFullYear()}</span>
            </div>

            {/* Modal de Ajuda */}
            {helpOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-base flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-emerald-600" />
                                {t('workerPortal.login.helpTitle', 'Ajuda e Suporte')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setHelpOpen(false)}
                                className="text-slate-400 hover:text-slate-700 text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {t('workerPortal.login.helpDesc', 'Se tiver dificuldades para aceder ao portal, contacte a equipa de RH ou o seu encarregado de obra.')}
                        </p>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
                            <p className="font-semibold text-emerald-800">Dica:</p>
                            <p>{t('workerPortal.login.helpDocTip', 'Certifique-se de digitar o nome exatamente como no contrato e o mesmo número de passaporte/NIE cadastrado.')}</p>
                        </div>
                        <Button
                            onClick={() => setHelpOpen(false)}
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                        >
                            {t('workerPortal.login.close', 'Entendido / Fechar')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
