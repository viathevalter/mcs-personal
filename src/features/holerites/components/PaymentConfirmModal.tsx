import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    CheckCircle2,
    Calendar,
    CreditCard,
    Loader2,
    Landmark,
    Paperclip,
    Upload,
    FileText,
    Image as ImageIcon,
    ExternalLink,
    X,
    Copy,
    Check,
    User,
    Building2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import type { HoleriteStatusInfo } from '../hooks/useHoleritesStatus';

export interface SelectedWorkerPaymentSummary {
    id: string;
    nome: string;
    cod_colab?: string;
    empresaName?: string;
    liquido: number;
    iban?: string;
    banco?: string;
}

export interface PaymentConfirmData {
    dataPagamento: string;
    metodoPagamento: string;
    bancoId?: string | null;
    bancoPagamento?: string | null;
    comprovanteUrl?: string | null;
    comprovanteNome?: string | null;
    comprovanteSize?: number | null;
    comprovanteMime?: string | null;
    observacaoPagamento?: string | null;
}

interface PaymentConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerCount: number;
    totalAmount: number;
    mesReferencia: string;
    selectedWorkersInfo?: SelectedWorkerPaymentSummary[];
    defaultEmpresaName?: string;
    initialPaymentInfo?: HoleriteStatusInfo | null;
    onConfirm: (data: PaymentConfirmData) => void;
    isLoading?: boolean;
}

interface RegisteredBank {
    id: string;
    empresa_id: number;
    empresa_nome: string;
    nome_banco: string;
    agencia?: string | null;
    conta?: string | null;
    iban?: string | null;
    ativo: boolean;
}

async function uploadHoleritePaymentReceipt(file: File, mesReferencia: string): Promise<{
    url: string;
    name: string;
    size: number;
    mime: string;
}> {
    const ext = file.name.split('.').pop() || 'pdf';
    const safeBase = file.name
        .replace(/\.[^/.]+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 45);
    const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBase}.${ext}`;
    const filePath = `holerites/${mesReferencia}/${cleanName}`;

    const candidateBuckets = ['comprovantes-financeiro', 'financeiro-anexos', 'documents', 'alojamentos'];

    for (const bucket of candidateBuckets) {
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (!uploadError) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (data?.publicUrl) {
                return {
                    url: data.publicUrl,
                    name: file.name,
                    size: file.size || 102400,
                    mime: file.type || 'application/pdf'
                };
            }
        }
    }

    throw new Error('Não foi possível enviar o comprovante de pagamento para o servidor.');
}

function matchesCompanyLabel(bankCompany: string, targetCompany?: string): boolean {
    if (!bankCompany || !targetCompany || targetCompany === '-' || targetCompany === 'all') return false;
    const a = bankCompany.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const b = targetCompany.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (a.includes(b) || b.includes(a)) return true;
    const firstWordB = b.split(/[\s,&-]+/)[0];
    return Boolean(firstWordB && firstWordB.length >= 3 && a.includes(firstWordB));
}

function formatIbanDisplay(iban?: string | null) {
    if (!iban) return '';
    return iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

export function PaymentConfirmModal({
    open,
    onOpenChange,
    workerCount,
    totalAmount,
    mesReferencia,
    selectedWorkersInfo = [],
    defaultEmpresaName,
    initialPaymentInfo,
    onConfirm,
    isLoading = false,
}: PaymentConfirmModalProps) {
    const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [metodoPagamento, setMetodoPagamento] = useState('Transferência Bancária');
    const [selectedBancoId, setSelectedBancoId] = useState<string>('none');
    const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
    const [comprovanteNome, setComprovanteNome] = useState<string | null>(null);
    const [comprovanteSize, setComprovanteSize] = useState<number | null>(null);
    const [comprovanteMime, setComprovanteMime] = useState<string | null>(null);
    const [observacaoPagamento, setObservacaoPagamento] = useState<string>('');
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [copiedIban, setCopiedIban] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Fetch active banks from public.bancos and public.empresas
    const { data: registeredBanks = [], isLoading: isLoadingBanks } = useQuery({
        queryKey: ['registered-company-banks-for-holerites'],
        queryFn: async (): Promise<RegisteredBank[]> => {
            const [bancosRes, empresasRes] = await Promise.all([
                supabase.from('bancos').select('*').order('nome_banco'),
                supabase.from('empresas').select('id, nombre_comercial, razon_social')
            ]);

            const empMap = new Map<number, string>();
            (empresasRes.data || []).forEach((e: any) => {
                empMap.set(Number(e.id), e.nombre_comercial || e.razon_social || `Empresa #${e.id}`);
            });

            return (bancosRes.data || [])
                .filter((b: any) => b.ativo !== false)
                .map((b: any) => ({
                    id: String(b.id),
                    empresa_id: Number(b.empresa_id),
                    empresa_nome: empMap.get(Number(b.empresa_id)) || 'Geral',
                    nome_banco: b.nome_banco || 'Banco',
                    agencia: b.agencia,
                    conta: b.conta,
                    iban: b.iban,
                    ativo: b.ativo !== false
                }));
        },
        staleTime: 5 * 60 * 1000
    });

    const singleWorker = selectedWorkersInfo.length === 1 ? selectedWorkersInfo[0] : null;
    const effectiveEmpresaContext = useMemo(() => {
        if (singleWorker?.empresaName && singleWorker.empresaName !== '-') {
            return singleWorker.empresaName;
        }
        const uniqueCompanies = Array.from(
            new Set(selectedWorkersInfo.map(w => w.empresaName).filter(Boolean))
        );
        if (uniqueCompanies.length === 1 && uniqueCompanies[0] !== '-') {
            return uniqueCompanies[0]!;
        }
        return defaultEmpresaName && defaultEmpresaName !== 'all' ? defaultEmpresaName : '';
    }, [singleWorker, selectedWorkersInfo, defaultEmpresaName]);

    // Sort banks so the current company's banks appear first
    const sortedBanks = useMemo(() => {
        return [...registeredBanks].sort((a, b) => {
            const aMatches = matchesCompanyLabel(a.empresa_nome, effectiveEmpresaContext);
            const bMatches = matchesCompanyLabel(b.empresa_nome, effectiveEmpresaContext);
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            const empCmp = a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR');
            if (empCmp !== 0) return empCmp;
            return a.nome_banco.localeCompare(b.nome_banco, 'pt-BR');
        });
    }, [registeredBanks, effectiveEmpresaContext]);

    // Initialize modal state whenever opened
    useEffect(() => {
        if (!open) return;

        if (initialPaymentInfo) {
            setDataPagamento(
                initialPaymentInfo.data_pagamento
                    ? initialPaymentInfo.data_pagamento.substring(0, 10)
                    : format(new Date(), 'yyyy-MM-dd')
            );
            setMetodoPagamento(initialPaymentInfo.metodo_pagamento || 'Transferência Bancária');
            setSelectedBancoId(initialPaymentInfo.banco_id || 'none');
            setComprovanteUrl(initialPaymentInfo.comprovante_url || null);
            setComprovanteNome(initialPaymentInfo.comprovante_nome || null);
            setObservacaoPagamento(initialPaymentInfo.observacao_pagamento || '');
        } else {
            setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
            setMetodoPagamento('Transferência Bancária');
            setComprovanteUrl(null);
            setComprovanteNome(null);
            setComprovanteSize(null);
            setComprovanteMime(null);
            setObservacaoPagamento('');

            // Pre-select first matching bank for the company if available
            const matchingBank = sortedBanks.find(b =>
                matchesCompanyLabel(b.empresa_nome, effectiveEmpresaContext)
            );
            setSelectedBancoId(matchingBank ? matchingBank.id : 'none');
        }
    }, [open, initialPaymentInfo, effectiveEmpresaContext, sortedBanks.length]);

    // Also match bank by name if initialPaymentInfo had banco_pagamento but no banco_id
    useEffect(() => {
        if (open && initialPaymentInfo?.banco_pagamento && (!selectedBancoId || selectedBancoId === 'none')) {
            const found = sortedBanks.find(
                b =>
                    b.nome_banco.toLowerCase() === initialPaymentInfo.banco_pagamento?.toLowerCase() ||
                    `${b.nome_banco} (${b.empresa_nome})`.toLowerCase() === initialPaymentInfo.banco_pagamento?.toLowerCase()
            );
            if (found) setSelectedBancoId(found.id);
        }
    }, [open, initialPaymentInfo, sortedBanks, selectedBancoId]);

    const requiresBankSelection =
        metodoPagamento === 'Transferência Bancária' ||
        metodoPagamento === 'PIX / Instantâneo' ||
        metodoPagamento === 'Cheque' ||
        metodoPagamento === 'Cartão Corporativo';

    const selectedBankObj = useMemo(
        () => sortedBanks.find(b => b.id === selectedBancoId) || null,
        [sortedBanks, selectedBancoId]
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingReceipt(true);
        try {
            const uploaded = await uploadHoleritePaymentReceipt(file, mesReferencia);
            setComprovanteUrl(uploaded.url);
            setComprovanteNome(uploaded.name);
            setComprovanteSize(uploaded.size);
            setComprovanteMime(uploaded.mime);
            toast.success('Comprovante anexado com sucesso!');
        } catch (err: any) {
            console.error('Erro ao enviar comprovante:', err);
            toast.error(err?.message || 'Erro ao anexar comprovante de pagamento.');
        } finally {
            setIsUploadingReceipt(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCopyWorkerIban = (iban: string) => {
        navigator.clipboard.writeText(iban);
        setCopiedIban(true);
        toast.success('IBAN copiado para a área de transferência!');
        setTimeout(() => setCopiedIban(false), 2000);
    };

    const handleConfirm = () => {
        if (requiresBankSelection && (!selectedBancoId || selectedBancoId === 'none')) {
            toast.error('Por favor, selecione o banco utilizado para o pagamento.');
            return;
        }

        const bancoLabel = selectedBankObj
            ? `${selectedBankObj.nome_banco} (${selectedBankObj.empresa_nome})`
            : initialPaymentInfo?.banco_pagamento || null;

        onConfirm({
            dataPagamento,
            metodoPagamento,
            bancoId: selectedBankObj ? selectedBankObj.id : null,
            bancoPagamento: requiresBankSelection ? bancoLabel : null,
            comprovanteUrl,
            comprovanteNome,
            comprovanteSize,
            comprovanteMime,
            observacaoPagamento: observacaoPagamento.trim() || null
        });
    };

    const ext = (comprovanteNome || comprovanteUrl || '').split('.').pop()?.toLowerCase() || '';
    const isImageReceipt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                        {initialPaymentInfo?.status === 'pago'
                            ? 'Dados do Pagamento e Comprovante'
                            : 'Consolidar Pagamento da Folha'}
                    </DialogTitle>
                    <DialogDescription>
                        Informe a data, a forma de pagamento, o banco pagador e anexe o comprovante na competência{' '}
                        <strong>{mesReferencia}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Summary box */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                                Total a Liquidar
                            </span>
                            <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                € {totalAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Colaboradores</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {workerCount} {workerCount === 1 ? 'trabalhador' : 'trabalhadores'}
                            </span>
                        </div>
                    </div>

                    {/* Single Worker Destination Bank Card */}
                    {singleWorker && (
                        <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <User className="h-4 w-4 text-indigo-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {singleWorker.nome}
                                    </span>
                                    {singleWorker.cod_colab && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                            {singleWorker.cod_colab}
                                        </Badge>
                                    )}
                                </div>
                                {singleWorker.empresaName && singleWorker.empresaName !== '-' && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        {singleWorker.empresaName}
                                    </Badge>
                                )}
                            </div>

                            {singleWorker.iban ? (
                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                                    <div className="min-w-0">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                                            Conta Destino do Trabalhador {singleWorker.banco ? `(${singleWorker.banco})` : ''}
                                        </span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                                            {formatIbanDisplay(singleWorker.iban)}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] shrink-0"
                                        onClick={() => handleCopyWorkerIban(singleWorker.iban!)}
                                    >
                                        {copiedIban ? (
                                            <>
                                                <Check className="h-3 w-3 mr-1 text-emerald-600" />
                                                Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3 mr-1 text-indigo-500" />
                                                Copiar IBAN
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 border-t border-slate-200/60">
                                    Colaborador sem IBAN ativo cadastrado.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Grid: Data do Pagamento & Forma de Pagamento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                            <Label htmlFor="data-pagamento" className="text-xs font-semibold flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                Data do Pagamento
                            </Label>
                            <Input
                                id="data-pagamento"
                                type="date"
                                value={dataPagamento}
                                onChange={(e) => setDataPagamento(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="metodo-pagamento" className="text-xs font-semibold flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                                Forma / Método de Pagamento
                            </Label>
                            <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                                <SelectTrigger id="metodo-pagamento" className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione o método" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Transferência Bancária" className="text-xs">
                                        Transferência Bancária (SEPA / IBAN)
                                    </SelectItem>
                                    <SelectItem value="PIX / Instantâneo" className="text-xs">
                                        Transferência Instantânea / MBWay / Bizum
                                    </SelectItem>
                                    <SelectItem value="Dinheiro" className="text-xs">
                                        Dinheiro / Em Mãos
                                    </SelectItem>
                                    <SelectItem value="Cheque" className="text-xs">
                                        Cheque Bancário
                                    </SelectItem>
                                    <SelectItem value="Cartão Corporativo" className="text-xs">
                                        Cartão Corporativo
                                    </SelectItem>
                                    <SelectItem value="Outro" className="text-xs">
                                        Outro
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Seleção do Banco Pagador (Cadastro de Bancos) */}
                    {requiresBankSelection && (
                        <div className="space-y-1.5 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="banco-pagador" className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Landmark className="h-3.5 w-3.5 text-indigo-600" />
                                    Banco Pagador (Cadastro de Bancos) *
                                </Label>
                                {effectiveEmpresaContext && (
                                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                        Empresa da Folha: {effectiveEmpresaContext}
                                    </span>
                                )}
                            </div>

                            <Select value={selectedBancoId} onValueChange={setSelectedBancoId}>
                                <SelectTrigger id="banco-pagador" className="h-9 text-xs bg-white dark:bg-slate-900">
                                    <SelectValue placeholder={isLoadingBanks ? 'Carregando bancos cadastrados...' : 'Selecione por qual banco foi pago'} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[280px]">
                                    <SelectItem value="none" className="text-xs text-muted-foreground">
                                        -- Selecione o banco pagador --
                                    </SelectItem>
                                    {sortedBanks.map((bank) => {
                                        const isCompanyMatch = matchesCompanyLabel(bank.empresa_nome, effectiveEmpresaContext);
                                        return (
                                            <SelectItem key={bank.id} value={bank.id} className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                                        {bank.nome_banco}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                        isCompanyMatch
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {bank.empresa_nome}
                                                    </span>
                                                    {bank.iban && (
                                                        <span className="text-[10px] font-mono text-muted-foreground">
                                                            ({bank.iban.slice(-6)})
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                                Os bancos listados acima vêm diretamente do Cadastro de Contas Bancárias do Financeiro.
                            </p>
                        </div>
                    )}

                    {/* Anexo de Comprovante de Pagamento */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
                                Comprovante de Pagamento
                            </Label>
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                                Salva no Holerite e no Trabalhador
                            </Badge>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isLoading || isUploadingReceipt}
                        />

                        {comprovanteUrl ? (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900 text-emerald-600 shrink-0">
                                        {isImageReceipt ? (
                                            <ImageIcon className="w-4 h-4" />
                                        ) : (
                                            <FileText className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={comprovanteNome || 'Comprovante anexado'}>
                                                {comprovanteNome || 'Comprovante de Pagamento'}
                                            </span>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        </div>
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                            Anexado — será arquivado automaticamente na pasta digital do trabalhador
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 pl-2 shrink-0">
                                    <a
                                        href={comprovanteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 transition-colors shadow-xs"
                                        title="Visualizar comprovante em nova aba"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Abrir
                                    </a>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingReceipt || isLoading}
                                    >
                                        {isUploadingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Trocar'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                        onClick={() => {
                                            setComprovanteUrl(null);
                                            setComprovanteNome(null);
                                            setComprovanteSize(null);
                                            setComprovanteMime(null);
                                        }}
                                        title="Remover comprovante"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => !isLoading && !isUploadingReceipt && fileInputRef.current?.click()}
                                className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors ${
                                    isLoading || isUploadingReceipt ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                        {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            {isUploadingReceipt
                                                ? 'Enviando comprovante...'
                                                : 'Clique para anexar o comprovante bancário deste pagamento'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            PDF ou Imagem (JPG, PNG) • Salvo no holerite e no Arquivo Digital do trabalhador
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isLoading || isUploadingReceipt}
                                    className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100/60 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                                    {isUploadingReceipt ? 'Enviando...' : 'Anexar Comprovante'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Observação opcional */}
                    <div className="space-y-1.5">
                        <Label htmlFor="obs-pagamento" className="text-xs font-semibold text-muted-foreground">
                            Observação / Referência Bancária (Opcional)
                        </Label>
                        <Input
                            id="obs-pagamento"
                            placeholder="Ex: Lote SEPA #04, pago via conta principal..."
                            value={observacaoPagamento}
                            onChange={(e) => setObservacaoPagamento(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading || isUploadingReceipt}
                        className="text-xs"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading || isUploadingReceipt}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Consolidando...
                            </>
                        ) : initialPaymentInfo?.status === 'pago' ? (
                            'Salvar Dados do Pagamento'
                        ) : (
                            `Confirmar Pagamento (${workerCount})`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
