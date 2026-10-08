import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { 
    caixaService, 
    type CaixaDespesa, 
    type MovimentoExtrato 
} from '../../financeiro/services/caixaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { 
    Wallet, 
    Plus, 
    Camera, 
    TrendingDown, 
    TrendingUp, 
    Check, 
    Loader2, 
    FileText, 
    Eye, 
    X, 
    ExternalLink,
    Lock,
    Mail,
    LogOut,
    Car,
    Clock,
    AlertCircle,
    UserCheck,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function MeuCaixaPage() {
    const [searchParams] = useSearchParams();
    const queryCaixaId = searchParams.get('caixaId');
    const navigate = useNavigate();
    const { user, loading: authLoading, signOut } = useAuth();

    // Estado do formulário de login (se não autenticado)
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Estados dos caixas e extrato
    const [caixas, setCaixas] = useState<CaixaDespesa[]>([]);
    const [selectedCaixa, setSelectedCaixa] = useState<CaixaDespesa | null>(null);
    const [extrato, setExtrato] = useState<MovimentoExtrato[]>([]);
    const [coches, setCoches] = useState<{ id: string; matricula: string; marca: string; modelo: string }[]>([]);

    const [loadingData, setLoadingData] = useState(false);
    const [extratoLoading, setExtratoLoading] = useState(false);
    const [submittingExpense, setSubmittingExpense] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Formulário de Despesa
    const [formDespesa, setFormDespesa] = useState({
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
        categoria: 'Combustível' as any,
        coche_id: '',
        descricao: '',
        comprovante_url: ''
    });

    useEffect(() => {
        if (user) {
            loadUserCaixas(user);
        }
    }, [user, queryCaixaId]);

    // Login direto na página
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword) {
            toast.error('Informe seu email e senha.');
            return;
        }

        setLoginLoading(true);
        try {
            let emailToUse = loginEmail.trim().toLowerCase();
            // Suporta @gestaologin.pro redirecionando para @gestaologinpro.com
            if (emailToUse.endsWith('@gestaologin.pro')) {
                emailToUse = emailToUse.replace('@gestaologin.pro', '@gestaologinpro.com');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password: loginPassword
            });

            if (error) {
                // Tenta fallback com o email digitado originalmente
                const retry = await supabase.auth.signInWithPassword({
                    email: loginEmail.trim().toLowerCase(),
                    password: loginPassword
                });
                if (retry.error) throw retry.error;
            }

            toast.success('Login efetuado com sucesso!');
        } catch (err: any) {
            console.error('Erro no login:', err);
            toast.error(err?.message || 'Falha ao autenticar. Verifique email e senha.');
        } finally {
            setLoginLoading(false);
        }
    };

    // Carregar caixas do funcionário logado
    const loadUserCaixas = async (currentUser: any) => {
        setLoadingData(true);
        try {
            const [userCaixas, cochesList] = await Promise.all([
                caixaService.getCaixasDoFuncionario(currentUser.id, currentUser.email),
                caixaService.getCoches()
            ]);

            setCoches(cochesList);
            setCaixas(userCaixas);

            if (userCaixas.length > 0) {
                const target = queryCaixaId 
                    ? userCaixas.find(c => c.id === queryCaixaId) || userCaixas[0]
                    : userCaixas[0];
                setSelectedCaixa(target);
                await loadExtrato(target.id);
            } else {
                setSelectedCaixa(null);
                setExtrato([]);
            }
        } catch (err) {
            console.error('Erro ao buscar caixas do usuário:', err);
            toast.error('Erro ao carregar seus fundos de caixa.');
        } finally {
            setLoadingData(false);
        }
    };

    // Carregar extrato do caixa ativo
    const loadExtrato = async (caixaId: string) => {
        setExtratoLoading(true);
        try {
            const data = await caixaService.getExtratoCompleto(caixaId);
            setExtrato(data);
        } catch (err) {
            console.error('Erro ao carregar extrato:', err);
        } finally {
            setExtratoLoading(false);
        }
    };

    const handleSelectCaixa = async (caixa: CaixaDespesa) => {
        setSelectedCaixa(caixa);
        await loadExtrato(caixa.id);
    };

    // Upload de comprovante
    const handleFileUpload = async (file: File) => {
        setUploadingReceipt(true);
        try {
            const url = await caixaService.uploadComprovante(file);
            setFormDespesa(prev => ({ ...prev, comprovante_url: url }));
            toast.success('Foto do comprovante anexada!');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao enviar foto do comprovante.');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Lançar despesa
    const handleAddDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;

        const val = parseFloat(formDespesa.valor);
        if (isNaN(val) || val <= 0) {
            toast.error('Informe um valor de gasto válido.');
            return;
        }

        setSubmittingExpense(true);
        try {
            await caixaService.addDespesa({
                caixa_id: selectedCaixa.id,
                valor: val,
                data_despesa: formDespesa.data_despesa,
                categoria: formDespesa.categoria,
                coche_id: formDespesa.coche_id || null,
                id_empresa: selectedCaixa.id_empresa,
                descricao: formDespesa.descricao || null,
                comprovante_url: formDespesa.comprovante_url || null
            });

            toast.success('Gasto registrado com sucesso!');
            setIsAddExpenseOpen(false);
            setFormDespesa({
                valor: '',
                data_despesa: new Date().toISOString().split('T')[0],
                categoria: 'Combustível',
                coche_id: '',
                descricao: '',
                comprovante_url: ''
            });

            if (user) {
                await loadUserCaixas(user);
            }
        } catch (err: any) {
            console.error('Erro ao lançar despesa:', err);
            toast.error(err?.message || 'Erro ao registrar despesa.');
        } finally {
            setSubmittingExpense(false);
        }
    };

    // Deletar despesa
    const handleDeleteDespesa = async (despesaId: string) => {
        if (!confirm('Deseja realmente excluir este lançamento de despesa?')) return;
        try {
            await caixaService.deleteDespesa(despesaId);
            toast.success('Despesa excluída.');
            if (user) {
                await loadUserCaixas(user);
            }
        } catch (err) {
            toast.error('Erro ao excluir despesa.');
        }
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-500 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Verificando sessão...</p>
            </div>
        );
    }

    // TELA 1: LOGIN SE NÃO ESTIVER AUTENTICADO
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-200 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
                            <Wallet className="h-7 w-7" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Meu Fundo de Caixa
                        </h1>
                        <p className="text-xs text-slate-500">
                            Acesso exclusivo para funcionários do escritório e viagens corporativas
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                Email Corporativo
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="email"
                                    placeholder="omar@gestaologinpro.com"
                                    value={loginEmail}
                                    onChange={e => setLoginEmail(e.target.value)}
                                    required
                                    className="pl-10 h-12 rounded-xl text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="password"
                                    placeholder="Sua senha"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    className="pl-10 h-12 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20"
                        >
                            {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar no Meu Caixa'}
                        </Button>
                    </form>

                    <div className="pt-2 text-center text-xs text-slate-400">
                        MCS CentralCars & Gestão LoginPro
                    </div>
                </div>
            </div>
        );
    }

    // TELA 2: FUNCIONÁRIO AUTENTICADO
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Bar do Funcionário */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-900 block leading-tight">
                                Meu Fundo de Caixa
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[180px] sm:max-w-xs">
                                {user.email}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => signOut()}
                            className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sair</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-20">
                {loadingData ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                        <span className="text-xs">Carregando seus fundos de caixa...</span>
                    </div>
                ) : caixas.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 shadow-xs">
                        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto stroke-1" />
                        <h2 className="text-lg font-bold text-slate-800">Nenhum Fundo de Caixa Ativo</h2>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Não foi localizado nenhum fundo de caixa vinculado ao seu usuário ({user.email}).
                            Solicite ao setor financeiro a criação do seu fundo de viagem.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Seletor de Caixa (se tiver mais de 1 viagem) */}
                        {caixas.length > 1 && (
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                                    Selecione a Viagem / Fundo de Caixa:
                                </label>
                                <select
                                    value={selectedCaixa?.id || ''}
                                    onChange={e => {
                                        const found = caixas.find(c => c.id === e.target.value);
                                        if (found) handleSelectCaixa(found);
                                    }}
                                    className="w-full text-sm font-semibold h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                                >
                                    {caixas.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre} — Saldo: {formatMoney(c.saldo)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Card Destaque de Saldo */}
                        {selectedCaixa && (
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute right-[-15px] top-[-15px] opacity-10">
                                    <Wallet size={150} />
                                </div>

                                <div className="relative z-10 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
                                                Fundo de Viagem Ativo
                                            </span>
                                            <h2 className="text-xl font-bold text-white mt-0.5">
                                                {selectedCaixa.nombre}
                                            </h2>
                                            {selectedCaixa.empresa && (
                                                <span className="text-xs text-slate-400 block mt-0.5">
                                                    Empresa: {selectedCaixa.empresa.nome}
                                                </span>
                                            )}
                                        </div>
                                        <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/40 text-xs">
                                            {selectedCaixa.status}
                                        </Badge>
                                    </div>

                                    {/* Saldo Restante */}
                                    <div className="pt-2">
                                        <span className="text-xs text-slate-400 uppercase font-medium">Saldo Restante Disponível</span>
                                        <div className={`text-4xl font-black tracking-tight mt-1 ${
                                            selectedCaixa.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {formatMoney(selectedCaixa.saldo)}
                                        </div>
                                    </div>

                                    {/* Sub-indicadores */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/60 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Total Recebido</span>
                                                <span className="font-semibold text-white">
                                                    {formatMoney(selectedCaixa.total_recargas)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                                                <TrendingDown className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Total Gasto</span>
                                                <span className="font-semibold text-white">
                                                    {formatMoney(selectedCaixa.total_despesas)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botão de Destaque: Registrar Gasto */}
                        <Button
                            onClick={() => setIsAddExpenseOpen(true)}
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                        >
                            <Camera className="h-5 w-5" />
                            Registrar Gasto / Foto do Recibo
                        </Button>

                        {/* Linha do Tempo e Extrato */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-slate-500" />
                                    Histórico de Lançamentos da Viagem
                                </h3>
                                <span className="text-xs text-slate-400">
                                    {extrato.length} registro(s)
                                </span>
                            </div>

                            {extratoLoading ? (
                                <div className="py-10 text-center text-slate-400">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                                    <span className="text-xs">Atualizando extrato...</span>
                                </div>
                            ) : extrato.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 text-xs">
                                    Nenhum gasto registrado ainda nesta viagem.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {extrato.map((m) => (
                                        <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                                    m.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {m.tipo === 'entrada' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {m.descricao}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                        <span>{m.data}</span>
                                                        {m.categoria && (
                                                            <span className="font-medium text-slate-700">
                                                                • {m.categoria}
                                                            </span>
                                                        )}
                                                        {m.coche && (
                                                            <span className="text-slate-400">
                                                                • {m.coche.matricula}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0 flex items-center gap-2">
                                                <div>
                                                    <span className={`font-mono font-bold text-sm block ${
                                                        m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                                                    }`}>
                                                        {m.tipo === 'entrada' ? '+' : '-'}{formatMoney(m.valor)}
                                                    </span>
                                                    {m.runningBalance !== undefined && (
                                                        <span className="text-[10px] text-slate-400 block font-mono">
                                                            Saldo: {formatMoney(m.runningBalance)}
                                                        </span>
                                                    )}
                                                </div>

                                                {m.comprovante_url && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 rounded-lg text-blue-600 border-blue-200 bg-blue-50"
                                                        onClick={() => setLightboxImage(m.comprovante_url || null)}
                                                        title="Ver Foto do Comprovante"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {m.tipo === 'saida' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-300 hover:text-red-600"
                                                        title="Excluir despesa"
                                                        onClick={() => handleDeleteDespesa(m.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* MODAL: REGISTRAR GASTO COM FOTO DO RECIBO */}
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogContent className="max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <Camera className="h-5 w-5 text-blue-600" />
                            Registrar Gasto na Viagem
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddDespesa} className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Valor do Gasto (€) *
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formDespesa.valor}
                                onChange={e => setFormDespesa(prev => ({ ...prev, valor: e.target.value }))}
                                required
                                autoFocus
                                className="text-xl font-bold h-12"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Categoria do Gasto *
                            </label>
                            <select
                                value={formDespesa.categoria}
                                onChange={e => setFormDespesa(prev => ({ ...prev, categoria: e.target.value as any }))}
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                                required
                            >
                                <option value="Combustível">⛽ Combustível / Abastecimento</option>
                                <option value="Viagem/Transporte">🛣️ Pedágio / Estacionamento / Transporte</option>
                                <option value="Alimentação">🍽️ Refeição / Alimentação</option>
                                <option value="Alojamento">🏨 Hotel / Hospedagem</option>
                                <option value="Manutenção">🔧 Manutenção do Carro</option>
                                <option value="Outros">📦 Outros Gastos</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Data do Gasto *
                            </label>
                            <Input
                                type="date"
                                value={formDespesa.data_despesa}
                                onChange={e => setFormDespesa(prev => ({ ...prev, data_despesa: e.target.value }))}
                                required
                                className="h-11"
                            />
                        </div>

                        {coches.length > 0 && (
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Veículo Utilizado (Opcional)
                                </label>
                                <select
                                    value={formDespesa.coche_id}
                                    onChange={e => setFormDespesa(prev => ({ ...prev, coche_id: e.target.value }))}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                                >
                                    <option value="">Nenhum / Não vinculado</option>
                                    {coches.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.matricula} — {c.marca} {c.modelo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Descrição / Local
                            </label>
                            <Input
                                placeholder="Ex: Abastecimento em posto na rodovia de Milão"
                                value={formDespesa.descricao}
                                onChange={e => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                                className="h-11"
                            />
                        </div>

                        {/* Foto do Recibo com Câmera */}
                        <div className="p-3 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                            <label className="cursor-pointer block">
                                <Camera className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                                <span className="text-xs font-bold text-slate-800 block">
                                    Tirar Foto do Recibo ou Selecionar Arquivo
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                    Acione a câmera do celular para fotografar o cupom
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    capture="environment"
                                    onChange={e => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileUpload(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>

                            {uploadingReceipt && (
                                <div className="mt-2 text-xs text-blue-600 flex items-center justify-center gap-1 font-medium">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Fazendo upload da foto...
                                </div>
                            )}

                            {formDespesa.comprovante_url && (
                                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                    Foto anexada com sucesso!
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddExpenseOpen(false)}
                                disabled={submittingExpense}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingExpense || uploadingReceipt}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5"
                            >
                                {submittingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Gasto'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* LIGHTBOX: FOTO DO COMPROVANTE */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 bg-slate-900 text-white">
                            <span className="text-xs font-bold">Comprovante de Despesa</span>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={lightboxImage} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Abrir Original
                                </a>
                                <button 
                                    onClick={() => setLightboxImage(null)}
                                    className="p-1 hover:bg-slate-800 rounded-md"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto bg-slate-950">
                            {lightboxImage.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={lightboxImage} className="w-full h-[60vh]" />
                            ) : (
                                <img src={lightboxImage} alt="Comprovante" className="max-w-full max-h-[70vh] object-contain rounded" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
