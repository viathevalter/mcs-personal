import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { User, FileText, Lock, HelpCircle, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers';

export function WorkerLoginPage() {
    const { t } = useTranslation();
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nome.trim() || !formData.pasaporte.trim()) {
            toast.error('Por favor, informe seu nome completo e passaporte.');
            return;
        }

        try {
            setLoading(true);

            // Chamada RPC SECURITY DEFINER para autenticar o trabalhador
            const { data, error } = await supabase.rpc('authenticate_worker', {
                p_nome: formData.nome.trim(),
                p_pasaporte: formData.pasaporte.trim()
            });

            if (error || !data || data.length === 0) {
                console.error('Login error:', error);
                toast.error('Credenciais inválidas. Verifique seu nome e passaporte exatamente como no contrato.');
                return;
            }

            // Mapear perfis retornados
            const validProfiles = data.map((d: any) => ({
                id: d.id,
                cod_colab: d.cod_colab,
                nome: d.nome,
                pasaporte: d.pasaporte,
                status_trabajador: d.status_trabajador,
                empresa_id: d.empresa_id,
                empresa_nome: d.empresa_nome || d.contratante,
                contratante: d.contratante || d.empresa_nome,
                funcion: d.funcion,
                email: d.email,
                telefono: d.telefono,
                movil: d.telefono,
                niss: d.niss,
                nif: d.nif,
                nie: d.nie,
                dni: d.dni,
                iban: d.iban,
                cliente: d.cliente,
                data_ingresso: d.data_ingresso,
                data_baixa: d.data_baixa
            }));

            const mainProfile = validProfiles[0];
            const sessionData = {
                ...mainProfile,
                profiles: validProfiles
            };

            localStorage.setItem('worker_session', JSON.stringify(sessionData));

            if (rememberMe) {
                localStorage.setItem('worker_remember_login', JSON.stringify({
                    nome: formData.nome.trim(),
                    pasaporte: formData.pasaporte.trim()
                }));
            } else {
                localStorage.removeItem('worker_remember_login');
            }

            toast.success(`Olá, ${mainProfile.nome.split(' ')[0]}! Acesso concedido.`);
            navigate('/portal/dashboard');

        } catch (err: any) {
            console.error('Unexpected error:', err);
            toast.error(err.message || 'Erro ao realizar login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-white overflow-hidden">
            {/* Foto de Fundo com Overlay Gradiente Industrial */}
            <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-40 scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url('/assets/images/hero-welder.jpg'), url('/luminous_hero_welder_mkt03.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/50 z-0" />

            {/* Conteúdo Central */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
                {/* Logo e Boas-vindas */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-4">
                        <img 
                            src="/logo_mcs_transparent.png" 
                            alt="MCS MultiCompany System" 
                            className="h-10 w-auto object-contain brightness-0 invert"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                        <span className="font-extrabold text-xl tracking-tight ml-2">MCS</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                        Portal do Trabalhador
                    </span>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Bem-vindo
                    </h1>
                    <p className="mt-2 text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                        Registe as suas horas de trabalho de forma rápida, simples e segura.
                    </p>
                </div>

                {/* Formulário de Login */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 border border-white/20">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Nome Completo */}
                        <div className="space-y-1.5">
                            <Label htmlFor="nome" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Nome Completo
                            </Label>
                            <div className="relative rounded-2xl shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <Input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    placeholder="Ex: Carlos Oliveira"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:border-emerald-600 focus:ring-emerald-600 text-sm"
                                />
                            </div>
                        </div>

                        {/* Passaporte */}
                        <div className="space-y-1.5">
                            <Label htmlFor="pasaporte" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Passaporte ou Documento
                            </Label>
                            <div className="relative rounded-2xl shadow-xs">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <Input
                                    id="pasaporte"
                                    name="pasaporte"
                                    type="text"
                                    placeholder="Ex: AB1234567"
                                    value={formData.pasaporte}
                                    onChange={handleChange}
                                    required
                                    autoComplete="off"
                                    className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 font-mono focus:bg-white focus:border-emerald-600 focus:ring-emerald-600 text-sm uppercase"
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
                                Lembrar neste aparelho
                            </label>

                            <button
                                type="button"
                                onClick={() => setHelpOpen(true)}
                                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                            >
                                <HelpCircle className="h-3.5 w-3.5" />
                                Precisa de ajuda?
                            </button>
                        </div>

                        {/* Botão Entrar */}
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        Entrar no Portal
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Rodapé institucional */}
                <div className="mt-8 text-center text-xs text-slate-400">
                    <p>© {new Date().getFullYear()} MCS MultiCompany System</p>
                    <p className="mt-1 text-[11px] text-slate-500">Acesso exclusivo para trabalhadores autorizados.</p>
                </div>
            </div>

            {/* Modal de Ajuda / Esqueci meus dados */}
            {helpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                            <HelpCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900">Como acessar?</h3>
                        <p className="mt-2 text-xs text-slate-600 text-center leading-relaxed">
                            Para entrar, utilize o seu <strong>Nome Completo</strong> e o número de <strong>Passaporte</strong> cadastrado na sua contratação.
                        </p>
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
                            <p>• Digite o nome exatamente como está no seu contrato.</p>
                            <p>• Se tiver dúvidas, procure o seu <strong>encarregado de obra</strong> ou o <strong>RH da Mastercorp</strong>.</p>
                        </div>
                        <Button
                            onClick={() => setHelpOpen(false)}
                            className="mt-5 w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm"
                        >
                            Entendi
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
