import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { 
    caixaService, 
    type CaixaDespesa, 
    type MovimentoExtrato 
} from '../financeiro/services/caixaService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    ArrowLeft, 
    Check, 
    Loader2, 
    FileText, 
    Eye, 
    X, 
    ExternalLink,
    Car,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function WorkerFundoCaixaPage() {
    const [searchParams] = useSearchParams();
    const queryCaixaId = searchParams.get('caixaId');
    const navigate = useNavigate();

    const [workerSession, setWorkerSession] = useState<any>(() => {
        const raw = localStorage.getItem('worker_session');
        return raw ? JSON.parse(raw) : null;
    });

    const [caixas, setCaixas] = useState<CaixaDespesa[]>([]);
    const [selectedCaixa, setSelectedCaixa] = useState<CaixaDespesa | null>(null);
    const [extrato, setExtrato] = useState<MovimentoExtrato[]>([]);
    const [coches, setCoches] = useState<{ id: string; matricula: string; marca: string; modelo: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [extratoLoading, setExtratoLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const [formDespesa, setFormDespesa] = useState({
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
        categoria: 'Combustível' as any,
        coche_id: '',
        descricao: '',
        comprovante_url: ''
    });

    useEffect(() => {
        loadWorkerCaixas();
    }, [queryCaixaId]);

    const loadWorkerCaixas = async () => {
        setLoading(true);
        try {
            const allCaixas = await caixaService.getCaixas();
            const cochesList = await caixaService.getCoches();
            setCoches(cochesList);

            let matchingCaixas: CaixaDespesa[] = [];

            // Se veio um caixaId específico via link direto (ex: enviado pelo WhatsApp)
            if (queryCaixaId) {
                const directCaixa = allCaixas.find(c => c.id === queryCaixaId);
                if (directCaixa) {
                    matchingCaixas = [directCaixa];
                }
            }

            // Se o trabalhador está autenticado, cruza por ID, Cod_colab, email ou nome
            if (workerSession) {
                const workerId = workerSession.id?.toString();
                const workerCod = workerSession.cod_colab?.toString() || workerSession.Cod_colab?.toString();
                const workerName = (workerSession.nome || workerSession.Nombre || '').toLowerCase();
                const firstName = workerName.split(' ')[0];

                const userCaixas = allCaixas.filter(c => {
                    const tid = (c.trabajador_id || '').toLowerCase();
                    const cName = (c.nombre || '').toLowerCase();
                    const cTrabName = (c.trabajador?.Nombre || '').toLowerCase();

                    return (
                        (workerId && tid === workerId.toLowerCase()) ||
                        (workerCod && tid === workerCod.toLowerCase()) ||
                        (firstName && cName.includes(firstName)) ||
                        (firstName && cTrabName.includes(firstName))
                    );
                });

                // Junta e remove duplicatas
                const map = new Map<string, CaixaDespesa>();
                matchingCaixas.forEach(c => map.set(c.id, c));
                userCaixas.forEach(c => map.set(c.id, c));
                matchingCaixas = Array.from(map.values());
            }

            // Fallback: se não encontrou nenhum por filtro restrito e temos caixas ativos
            if (matchingCaixas.length === 0 && allCaixas.length > 0) {
                // Se não tem login nem query, exibe o mais recente
                matchingCaixas = allCaixas.filter(c => c.status === 'Ativo');
            }

            setCaixas(matchingCaixas);

            if (matchingCaixas.length > 0) {
                const initial = queryCaixaId 
                    ? matchingCaixas.find(c => c.id === queryCaixaId) || matchingCaixas[0]
                    : matchingCaixas[0];
                setSelectedCaixa(initial);
                await loadExtrato(initial.id);
            }
        } catch (err) {
            console.error('Erro ao carregar caixas do trabalhador:', err);
            toast.error('Erro ao carregar seu fundo de caixa.');
        } finally {
            setLoading(false);
        }
    };

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

    const handleFileUpload = async (file: File) => {
        setUploadingReceipt(true);
        try {
            const url = await caixaService.uploadComprovante(file);
            setFormDespesa(prev => ({ ...prev, comprovante_url: url }));
            toast.success('Foto do comprovante capturada com sucesso!');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao enviar foto do comprovante.');
        } finally {
            setUploadingReceipt(false);
        }
    };

    const handleAddDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;

        const val = parseFloat(formDespesa.valor);
        if (isNaN(val) || val <= 0) {
            toast.error('Informe um valor de gasto válido.');
            return;
        }

        setSubmitting(true);
        try {
            await caixaService.addDespesa({
                caixa_id: selectedCaixa.id,
                valor: val,
                data_despesa: formDespesa.data_despesa,
                categoria: formDespesa.categoria,
                coche_id: formDespesa.coche_id || null,
                descricao: formDespesa.descricao || null,
                comprovante_url: formDespesa.comprovante_url || null
            });

            toast.success('Despesa registrada com sucesso!');
            setIsAddExpenseOpen(false);
            setFormDespesa({
                valor: '',
                data_despesa: new Date().toISOString().split('T')[0],
                categoria: 'Combustível',
                coche_id: '',
                descricao: '',
                comprovante_url: ''
            });

            // Atualiza os dados locais
            await loadWorkerCaixas();
            if (selectedCaixa) {
                await loadExtrato(selectedCaixa.id);
            }
        } catch (err: any) {
            console.error('Erro ao lançar despesa:', err);
            toast.error(err?.message || 'Erro ao registrar despesa.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Carregando seu Fundo de Caixa...</p>
            </div>
        );
    }

    if (caixas.length === 0) {
        return (
            <div className="max-w-md mx-auto p-6 text-center space-y-4 pt-12">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Nenhum Fundo de Caixa Ativo</h2>
                <p className="text-sm text-slate-500">
                    Você ainda não possui um fundo de caixa de viagem vinculado ao seu usuário.
                    Entre em contato com o setor Financeiro para liberar seu adiantamento.
                </p>
                {workerSession && (
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/portal')}
                        className="mt-4 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Voltar ao Portal
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-16">
            {/* Seletor de Caixa (se tiver mais de 1) */}
            {caixas.length > 1 && (
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                        Selecione a Viagem / Fundo de Caixa:
                    </label>
                    <select
                        value={selectedCaixa?.id || ''}
                        onChange={e => {
                            const found = caixas.find(c => c.id === e.target.value);
                            if (found) handleSelectCaixa(found);
                        }}
                        className="w-full text-sm font-semibold h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                    >
                        {caixas.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.nombre} — Saldo: {formatMoney(c.saldo)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Card Principal de Saldo */}
            {selectedCaixa && (
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <Wallet size={160} />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                                    Fundo de Caixa & Adiantamento
                                </span>
                                <h2 className="text-xl font-bold text-white mt-0.5">
                                    {selectedCaixa.nombre}
                                </h2>
                                {selectedCaixa.empresa && (
                                    <span className="text-xs text-slate-400">
                                        Empresa: {selectedCaixa.empresa.nome}
                                    </span>
                                )}
                            </div>
                            <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/40 text-xs">
                                {selectedCaixa.status}
                            </Badge>
                        </div>

                        {/* Grande exibição de saldo */}
                        <div className="pt-2">
                            <span className="text-xs text-slate-400 uppercase font-medium">Saldo Restante Disponível</span>
                            <div className={`text-4xl font-extrabold tracking-tight mt-1 ${
                                selectedCaixa.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {formatMoney(selectedCaixa.saldo)}
                            </div>
                        </div>

                        {/* Totais de Recarga e Gasto */}
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

            {/* Botão de Destaque Mobile: + Registrar Despesa */}
            <Button
                onClick={() => setIsAddExpenseOpen(true)}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
                <Plus className="h-5 w-5" />
                Registrar Gasto / Foto do Recibo
            </Button>

            {/* Extrato / Linha do Tempo das Despesas */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-500" />
                        Histórico de Gastos da Viagem
                    </h3>
                    <span className="text-xs text-slate-400">
                        {extrato.length} lançamento(s)
                    </span>
                </div>

                {extratoLoading ? (
                    <div className="py-10 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span className="text-xs">Atualizando histórico...</span>
                    </div>
                ) : extrato.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        Nenhum gasto registrado ainda nesta viagem.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {extrato.map((m) => (
                            <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                                        m.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                        {m.tipo === 'entrada' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {m.descricao}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                            <span>{m.data}</span>
                                            {m.categoria && (
                                                <span className="font-medium text-slate-600">
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
                                                Restante: {formatMoney(m.runningBalance)}
                                            </span>
                                        )}
                                    </div>

                                    {m.comprovante_url && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-lg text-blue-600 border-blue-200 bg-blue-50"
                                            onClick={() => setLightboxImage(m.comprovante_url || null)}
                                            title="Ver Comprovante"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: Registrar Gasto / Foto do Recibo */}
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogContent className="max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <Camera className="h-5 w-5 text-blue-600" />
                            Registrar Gasto na Viagem
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddDespesa} className="space-y-4 py-2">
                        {/* Valor */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Valor Gasto (€) *
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

                        {/* Categoria */}
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

                        {/* Data */}
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

                        {/* Veículo (se aplicável) */}
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

                        {/* Descrição */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Descrição / Local
                            </label>
                            <Input
                                placeholder="Ex: Abastecimento Autoestrada Milão"
                                value={formDespesa.descricao}
                                onChange={e => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                                className="h-11"
                            />
                        </div>

                        {/* Foto do Comprovante (Câmera do celular) */}
                        <div className="p-3 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                            <label className="cursor-pointer block">
                                <Camera className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                                <span className="text-xs font-bold text-slate-800 block">
                                    Tirar Foto do Recibo ou Selecionar Arquivo
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                    Abra a câmera do celular para fotografar o comprovante
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
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || uploadingReceipt}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Gasto'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* LIGHTBOX: Comprovante */}
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
