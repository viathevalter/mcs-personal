import React, { useState, useEffect, useMemo } from 'react';
import { 
    caixaService, 
    MOEDAS_CAIXA,
    formatCurrencyByCode,
    getMoedaInfo,
    type CaixaDespesa, 
    type MovimentoExtrato, 
    type ColaboradorOption 
} from '../services/caixaService';
import {
    MultiCurrencyTransferFields,
    type MultiCurrencyTransferValue
} from '../components/MultiCurrencyTransferFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
    Wallet, 
    TrendingUp, 
    TrendingDown, 
    Plus, 
    Search, 
    RefreshCw, 
    ArrowUpRight, 
    ArrowDownLeft, 
    FileText, 
    Building2, 
    User, 
    Copy, 
    ExternalLink, 
    Eye, 
    Check, 
    Loader2, 
    Clock,
    Trash2,
    Edit2,
    LayoutGrid,
    List,
    CreditCard,
    FileCheck,
    ArrowUpDown,
    MoreHorizontal,
    Download,
    Globe,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchCartoes, fetchCategorias, fetchObras } from '../data/loader';
import type { CartaoCorporativo, FinanceiroCategoria, Obra } from '../types';

export const getEmpresaUuidFromCard = (card: CartaoCorporativo | undefined | null, empresasList: { id: string; nome: string }[]): string | null => {
    if (!card) return null;
    const cardEmpNome = (card.empresa_nome || '').trim();
    if (!cardEmpNome) return null;

    const cleanStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const targetClean = cleanStr(cardEmpNome);

    const directMatch = empresasList.find(e => cleanStr(e.nome) === targetClean);
    if (directMatch) return directMatch.id;

    const partialMatch = empresasList.find(e => {
        const eClean = cleanStr(e.nome);
        return eClean.includes(targetClean) || targetClean.includes(eClean);
    });
    return partialMatch ? partialMatch.id : null;
};

export default function FundoCaixaPage() {
    // Listas principais
    const [caixas, setCaixas] = useState<CaixaDespesa[]>([]);
    const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
    const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
    const [coches, setCoches] = useState<{ id: string; matricula: string; marca: string; modelo: string }[]>([]);
    const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);
    const [cartoes, setCartoes] = useState<CartaoCorporativo[]>([]);
    const [categorias, setCategorias] = useState<FinanceiroCategoria[]>([]);
    const [obras, setObras] = useState<Obra[]>([]);

    // Estados de carregamento
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [extratoLoading, setExtratoLoading] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    // Filtros e abas
    const [activeTab, setActiveTab] = useState<'caixas' | 'historico'>('caixas');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Inativo'>('todos');
    const [empresaFilter, setEmpresaFilter] = useState('todas');
    const [modalidadeFilter, setModalidadeFilter] = useState<'todas' | 'dinheiro' | 'cartao'>('todas');
    const [moedaFilter, setMoedaFilter] = useState<string>('todas');
    const [sortBy, setSortBy] = useState<'recentes' | 'ativos_primeiro' | 'maior_saldo' | 'maior_gasto' | 'nome_asc' | 'colaborador_asc'>('ativos_primeiro');
    const [viewMode, setViewMode] = useState<'cards' | 'lista'>(() => {
        try {
            const saved = localStorage.getItem('fundo_caixa_view_mode');
            return saved === 'lista' || saved === 'cards' ? saved : 'cards';
        } catch {
            return 'cards';
        }
    });

    // Filtros do Extrato Consolidado
    const [histTipoFilter, setHistTipoFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
    const [histCategoriaFilter, setHistCategoriaFilter] = useState<string>('todas');
    const [histMoedaFilter, setHistMoedaFilter] = useState<string>('todas');
    const [histDateFrom, setHistDateFrom] = useState<string>('');
    const [histDateTo, setHistDateTo] = useState<string>('');

    const handleChangeViewMode = (mode: 'cards' | 'lista') => {
        setViewMode(mode);
        try {
            localStorage.setItem('fundo_caixa_view_mode', mode);
        } catch {
            // ignore storage errors
        }
    };

    // Modais e Item Selecionado
    const [selectedCaixa, setSelectedCaixa] = useState<CaixaDespesa | null>(null);
    const [extrato, setExtrato] = useState<MovimentoExtrato[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const [isNovoCaixaOpen, setIsNovoCaixaOpen] = useState(false);
    const [isEditCaixaOpen, setIsEditCaixaOpen] = useState(false);
    const [caixaToEdit, setCaixaToEdit] = useState<CaixaDespesa | null>(null);
    const [isRecargaOpen, setIsRecargaOpen] = useState(false);
    const [isDespesaOpen, setIsDespesaOpen] = useState(false);
    const [isExtratoOpen, setIsExtratoOpen] = useState(false);

    // Modal Fechamento
    const [isFechamentoOpen, setIsFechamentoOpen] = useState(false);
    const [caixaToFechar, setCaixaToFechar] = useState<CaixaDespesa | null>(null);
    const [formFechamento, setFormFechamento] = useState({
        catDespesa: '',
        centroCusto: '',
        numDoc: '',
        observacoes: '',
        incluirTaxasBancarias: true
    });

    // Formulários
    const [formNovoCaixa, setFormNovoCaixa] = useState({
        tipo_fundo: 'cartao' as 'dinheiro' | 'cartao',
        cartao_id: '',
        nombre: '',
        trabajador_id: '',
        id_empresa: '',
        moeda: 'EUR',
        saldo_inicial: '',
        fx: { valorEur: '', taxaBancariaEur: '', valorLocal: '', taxaCambio: '' } as MultiCurrencyTransferValue
    });

    const [formEditCaixa, setFormEditCaixa] = useState({
        nombre: '',
        trabajador_id: '',
        id_empresa: '',
        tipo_fundo: 'cartao' as 'dinheiro' | 'cartao',
        cartao_id: '',
        moeda: 'EUR',
        taxa_cambio: '1',
        status: 'Ativo' as 'Ativo' | 'Inativo'
    });

    const [formRecarga, setFormRecarga] = useState({
        valor: '',
        fx: { valorEur: '', taxaBancariaEur: '', valorLocal: '', taxaCambio: '' } as MultiCurrencyTransferValue,
        data_recarga: new Date().toISOString().split('T')[0],
        observacoes: '',
        gerar_op: true,
        comprovante_url: ''
    });

    const [formDespesa, setFormDespesa] = useState({
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
        categoria: 'Combustível' as any,
        coche_id: '',
        descricao: '',
        comprovante_url: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [caixasData, colabsData, empsData, cochesData, cartoesData, catsData, obrasData] = await Promise.all([
                caixaService.getCaixas(),
                caixaService.getColaboradores(),
                caixaService.getEmpresas(),
                caixaService.getCoches(),
                fetchCartoes(),
                fetchCategorias(),
                fetchObras()
            ]);
            const geralData = await caixaService.getTodosMovimentos(caixasData);

            setCaixas(caixasData);
            setColaboradores(colabsData);
            setEmpresas(empsData);
            setCoches(cochesData);
            setHistoricoGeral(geralData);
            setCartoes(cartoesData);
            setCategorias(catsData);
            setObras(obrasData);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            toast.error('Erro ao carregar dados do Fundo de Caixa.');
        } finally {
            setLoading(false);
        }
    };

    const openRecargaModal = (cx: CaixaDespesa) => {
        setSelectedCaixa(cx);
        setFormRecarga({
            valor: '',
            fx: {
                valorEur: '',
                taxaBancariaEur: '',
                valorLocal: '',
                taxaCambio: cx.moeda !== 'EUR' && cx.taxa_cambio > 0 ? cx.taxa_cambio.toFixed(4) : ''
            },
            data_recarga: new Date().toISOString().split('T')[0],
            observacoes: '',
            gerar_op: true,
            comprovante_url: ''
        });
        setIsRecargaOpen(true);
    };

    // Submissão: Novo Caixa
    const handleCreateCaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formNovoCaixa.nombre.trim() || !formNovoCaixa.trabajador_id) {
            toast.error('Informe o nome da missão/caixa e selecione o colaborador.');
            return;
        }

        if (formNovoCaixa.tipo_fundo === 'cartao' && !formNovoCaixa.cartao_id) {
            toast.error('Por favor, selecione o cartão corporativo para a missão.');
            return;
        }

        const isForeign = formNovoCaixa.moeda !== 'EUR';
        const fxEur = parseFloat(formNovoCaixa.fx.valorEur) || 0;
        const fxFee = parseFloat(formNovoCaixa.fx.taxaBancariaEur) || 0;
        const fxLocal = parseFloat(formNovoCaixa.fx.valorLocal) || 0;
        const fxRate = parseFloat(formNovoCaixa.fx.taxaCambio) || 0;

        if (formNovoCaixa.tipo_fundo === 'dinheiro' && isForeign) {
            if (fxEur > 0 && fxFee >= fxEur) {
                toast.error('A taxa bancária não pode ser maior ou igual ao valor transferido em EUR.');
                return;
            }
            if ((fxEur > 0 && fxLocal <= 0) || (fxLocal > 0 && fxEur <= 0)) {
                toast.error(`Informe o valor transferido em EUR e o valor recebido em ${formNovoCaixa.moeda} (ou a cotação).`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const selectedCard = cartoes.find(c => c.id === formNovoCaixa.cartao_id);
            const resolvedEmpresaId = formNovoCaixa.tipo_fundo === 'dinheiro'
                ? (formNovoCaixa.id_empresa || null)
                : getEmpresaUuidFromCard(selectedCard, empresas);

            const saldoInicialLocal = formNovoCaixa.tipo_fundo === 'dinheiro'
                ? (isForeign ? fxLocal : (Number(formNovoCaixa.saldo_inicial) || 0))
                : 0;

            await caixaService.createCaixa({
                nombre: formNovoCaixa.nombre.trim(),
                trabajador_id: formNovoCaixa.trabajador_id,
                id_empresa: resolvedEmpresaId,
                status: 'Ativo',
                tipo_fundo: formNovoCaixa.tipo_fundo,
                cartao_id: formNovoCaixa.tipo_fundo === 'cartao' ? formNovoCaixa.cartao_id : null,
                moeda: formNovoCaixa.moeda,
                taxa_cambio: isForeign ? (fxRate > 0 ? fxRate : 1) : 1,
                saldo_inicial: saldoInicialLocal,
                saldo_inicial_eur: isForeign ? fxEur : saldoInicialLocal,
                taxa_bancaria_eur: isForeign ? fxFee : 0
            });

            toast.success('Fundo de Caixa criado com sucesso!');
            setIsNovoCaixaOpen(false);
            setFormNovoCaixa({
                tipo_fundo: 'cartao',
                cartao_id: '',
                nombre: '',
                trabajador_id: '',
                id_empresa: '',
                moeda: 'EUR',
                saldo_inicial: '',
                fx: { valorEur: '', taxaBancariaEur: '', valorLocal: '', taxaCambio: '' }
            });
            await loadData();
        } catch (err: any) {
            console.error('Erro ao criar caixa:', err);
            toast.error(err?.message || 'Erro ao criar caixa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Abertura do Modal de Fechamento
    const handleOpenFechamento = (cx: CaixaDespesa) => {
        setCaixaToFechar(cx);
        const despesaCat = categorias.find(c => c.tipo === 'Despesa')?.nome || 'Viagem/Transporte';
        const defaultCC = cx.centro_custo || obras[0]?.nome || 'Central Cars - Frota / Operações Gerais';
        setFormFechamento({
            catDespesa: despesaCat,
            centroCusto: defaultCC,
            numDoc: `FC-${cx.id.slice(0, 6).toUpperCase()}`,
            observacoes: '',
            incluirTaxasBancarias: true
        });
        setIsFechamentoOpen(true);
    };

    // Confirmação do Fechamento de Caixa
    const handleConfirmFechamento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!caixaToFechar) return;

        if (!formFechamento.catDespesa || !formFechamento.centroCusto) {
            toast.error('Preencha a Categoria de Despesa e o Centro de Custo para classificação contábil.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await caixaService.fecharCaixa({
                caixaId: caixaToFechar.id,
                catDespesa: formFechamento.catDespesa,
                centroCusto: formFechamento.centroCusto,
                numDoc: formFechamento.numDoc,
                observacoes: formFechamento.observacoes,
                usuarioNome: 'Financeiro',
                incluirTaxasBancarias: formFechamento.incluirTaxasBancarias
            });

            if (res.success) {
                toast.success(`Fundo de Caixa finalizado com sucesso! Conta a Pagar #${res.contaPagarId || ''} gerada com status 'Pago'.`);
                setIsFechamentoOpen(false);
                setCaixaToFechar(null);
                await loadData();
            } else {
                throw new Error(res.error || 'Erro no fechamento');
            }
        } catch (err: any) {
            console.error('Erro ao fechar caixa:', err);
            toast.error(err?.message || 'Erro ao finalizar caixa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Abertura do Modal de Edição
    const handleOpenEditCaixa = (cx: CaixaDespesa) => {
        setCaixaToEdit(cx);
        setFormEditCaixa({
            nombre: cx.nombre || '',
            trabajador_id: cx.trabajador_id || '',
            id_empresa: cx.id_empresa || getEmpresaUuidFromCard(cx.cartao, empresas) || '',
            tipo_fundo: cx.tipo_fundo || 'dinheiro',
            cartao_id: cx.cartao_id || '',
            moeda: cx.moeda || 'EUR',
            taxa_cambio: cx.taxa_cambio ? cx.taxa_cambio.toFixed(4) : '1',
            status: cx.status || 'Ativo'
        });
        setIsEditCaixaOpen(true);
    };

    // Salvar Edição do Caixa
    const handleSaveEditCaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!caixaToEdit) return;

        if (!formEditCaixa.nombre.trim() || !formEditCaixa.trabajador_id) {
            toast.error('Informe o nome da missão e selecione o colaborador.');
            return;
        }

        if (formEditCaixa.tipo_fundo === 'cartao' && !formEditCaixa.cartao_id) {
            toast.error('Por favor, selecione o cartão corporativo para a missão.');
            return;
        }

        setSubmitting(true);
        try {
            const selectedCard = cartoes.find(c => c.id === formEditCaixa.cartao_id);
            const resolvedEmpresaId = formEditCaixa.tipo_fundo === 'dinheiro'
                ? (formEditCaixa.id_empresa || null)
                : getEmpresaUuidFromCard(selectedCard, empresas);

            const parsedRate = formEditCaixa.moeda === 'EUR' ? 1 : (parseFloat(formEditCaixa.taxa_cambio) || 1);

            await caixaService.updateCaixa(caixaToEdit.id, {
                nombre: formEditCaixa.nombre.trim(),
                trabajador_id: formEditCaixa.trabajador_id,
                id_empresa: resolvedEmpresaId,
                tipo_fundo: formEditCaixa.tipo_fundo,
                cartao_id: formEditCaixa.tipo_fundo === 'cartao' ? formEditCaixa.cartao_id : null,
                moeda: formEditCaixa.moeda,
                taxa_cambio: parsedRate,
                status: formEditCaixa.status
            });

            toast.success('Fundo de Caixa atualizado com sucesso!');
            setIsEditCaixaOpen(false);
            setCaixaToEdit(null);
            await loadData();
        } catch (err: any) {
            console.error('Erro ao atualizar caixa:', err);
            toast.error(err?.message || 'Erro ao atualizar dados do caixa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Exclusão de Caixa
    const handleDeleteCaixa = async (cx: CaixaDespesa) => {
        const confirmMsg = `Deseja realmente excluir o Fundo de Caixa "${cx.nombre}"?\n\nColaborador: ${cx.trabajador?.Nombre || 'Não especificado'}\nTotal de Gastos: ${formatMoney(cx.total_despesas, cx.moeda)}\n\nAtenção: Todas as recargas, despesas e lançamentos vinculados a este caixa também serão excluídos. Esta ação é irreversível.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await caixaService.deleteCaixa(cx.id);
            toast.success(`Fundo de Caixa "${cx.nombre}" excluído com sucesso!`);
            await loadData();
        } catch (err: any) {
            console.error('Erro ao excluir caixa:', err);
            toast.error(err?.message || 'Não foi possível excluir o fundo de caixa.');
        }
    };

    // Submissão: Nova Recarga
    const handleAddRecarga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;

        const isForeign = selectedCaixa.moeda !== 'EUR';
        let valLocal = 0;
        let valEur = 0;
        let feeEur = 0;
        let rate = 1;

        if (isForeign) {
            valEur = parseFloat(formRecarga.fx.valorEur) || 0;
            feeEur = parseFloat(formRecarga.fx.taxaBancariaEur) || 0;
            valLocal = parseFloat(formRecarga.fx.valorLocal) || 0;
            rate = parseFloat(formRecarga.fx.taxaCambio) || 0;

            if (valEur <= 0 || valLocal <= 0) {
                toast.error(`Informe o valor transferido em EUR e o valor recebido em ${selectedCaixa.moeda}.`);
                return;
            }
            if (feeEur >= valEur) {
                toast.error('A taxa bancária deve ser menor que o valor transferido.');
                return;
            }
            if (rate <= 0) {
                rate = valLocal / Math.max(0.01, valEur - feeEur);
            }
        } else {
            valLocal = parseFloat(formRecarga.valor);
            if (isNaN(valLocal) || valLocal <= 0) {
                toast.error('Informe um valor de recarga válido.');
                return;
            }
            valEur = valLocal;
        }

        setSubmitting(true);
        try {
            await caixaService.addRecarga({
                caixa_id: selectedCaixa.id,
                valor: valLocal,
                valor_eur: valEur,
                taxa_bancaria_eur: feeEur,
                taxa_cambio: rate,
                data_recarga: formRecarga.data_recarga,
                observacoes: formRecarga.observacoes || null,
                gerar_op: formRecarga.gerar_op,
                id_empresa: selectedCaixa.id_empresa,
                comprovante_url: formRecarga.comprovante_url || null
            });

            toast.success('Recarga adicionada com sucesso!');
            setIsRecargaOpen(false);
            setFormRecarga({
                valor: '',
                fx: { valorEur: '', taxaBancariaEur: '', valorLocal: '', taxaCambio: '' },
                data_recarga: new Date().toISOString().split('T')[0],
                observacoes: '',
                gerar_op: true,
                comprovante_url: ''
            });
            await loadData();
            if (isExtratoOpen) {
                await openExtrato(selectedCaixa);
            }
        } catch (err: any) {
            console.error('Erro ao adicionar recarga:', err);
            toast.error(err?.message || 'Erro ao adicionar recarga.');
        } finally {
            setSubmitting(false);
        }
    };

    // Submissão: Nova Despesa
    const handleAddDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaixa) return;
        const val = parseFloat(formDespesa.valor);
        if (isNaN(val) || val <= 0) {
            toast.error('Informe um valor de despesa válido.');
            return;
        }

        setSubmitting(true);
        try {
            await caixaService.addDespesa({
                caixa_id: selectedCaixa.id,
                valor: val,
                taxa_cambio: selectedCaixa.taxa_cambio || 1,
                valor_eur: selectedCaixa.moeda === 'EUR' ? val : Number((val / (selectedCaixa.taxa_cambio || 1)).toFixed(2)),
                data_despesa: formDespesa.data_despesa,
                categoria: formDespesa.categoria,
                coche_id: formDespesa.coche_id || null,
                id_empresa: selectedCaixa.id_empresa,
                descricao: formDespesa.descricao || null,
                comprovante_url: formDespesa.comprovante_url || null
            });

            toast.success('Despesa registrada com sucesso!');
            setIsDespesaOpen(false);
            setFormDespesa({
                valor: '',
                data_despesa: new Date().toISOString().split('T')[0],
                categoria: 'Combustível',
                coche_id: '',
                descricao: '',
                comprovante_url: ''
            });
            await loadData();
            if (isExtratoOpen) {
                await openExtrato(selectedCaixa);
            }
        } catch (err: any) {
            console.error('Erro ao adicionar despesa:', err);
            toast.error(err?.message || 'Erro ao adicionar despesa.');
        } finally {
            setSubmitting(false);
        }
    };

    // Abrir Extrato
    const openExtrato = async (caixa: CaixaDespesa) => {
        setSelectedCaixa(caixa);
        setIsExtratoOpen(true);
        setExtratoLoading(true);
        try {
            const data = await caixaService.getExtratoCompleto(caixa.id, caixa);
            setExtrato(data);
        } catch (err) {
            console.error('Erro ao buscar extrato:', err);
            toast.error('Erro ao carregar extrato do caixa.');
        } finally {
            setExtratoLoading(false);
        }
    };

    // Deletar despesa do extrato
    const handleDeleteDespesa = async (despesaId: string) => {
        if (!confirm('Deseja realmente excluir este lançamento de despesa?')) return;
        try {
            await caixaService.deleteDespesa(despesaId);
            toast.success('Despesa excluída.');
            if (selectedCaixa) {
                await openExtrato(selectedCaixa);
            }
            await loadData();
        } catch (err) {
            toast.error('Erro ao excluir despesa.');
        }
    };

    // Upload de arquivo / comprovante
    const handleFileUpload = async (file: File, target: 'recarga' | 'despesa') => {
        setUploadingReceipt(true);
        try {
            const url = await caixaService.uploadComprovante(file);
            if (target === 'recarga') {
                setFormRecarga(prev => ({ ...prev, comprovante_url: url }));
            } else {
                setFormDespesa(prev => ({ ...prev, comprovante_url: url }));
            }
            toast.success('Comprovante anexado com sucesso!');
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao enviar comprovante.');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Copiar Link do Funcionário
    const copyWorkerLink = (caixa: CaixaDespesa) => {
        const link = `${window.location.origin}/meu-caixa?caixaId=${caixa.id}`;
        navigator.clipboard.writeText(link);
        toast.success('Link do Funcionário copiado!', {
            description: `O colaborador pode acessar com login e senha: ${link}`
        });
    };

    // Alternar status do Caixa
    const toggleCaixaStatus = async (caixa: CaixaDespesa) => {
        const nextStatus = caixa.status === 'Ativo' ? 'Inativo' : 'Ativo';
        try {
            await caixaService.updateCaixa(caixa.id, { status: nextStatus });
            toast.success(`Caixa ${nextStatus === 'Ativo' ? 'ativado' : 'encerrado/arquivado'}.`);
            await loadData();
        } catch (err) {
            toast.error('Erro ao alterar status da caixa.');
        }
    };

    const formatMoney = (val: number, moeda?: string) => {
        return formatCurrencyByCode(val, moeda || 'EUR');
    };

    // Filtragem e Ordenação de caixas
    const hasActiveCaixasFilters = Boolean(
        searchTerm.trim() || statusFilter !== 'todos' || empresaFilter !== 'todas' || modalidadeFilter !== 'todas' || moedaFilter !== 'todas'
    );

    const filteredCaixas = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        const list = caixas.filter(c => {
            const matchesSearch = !q ||
                c.nombre.toLowerCase().includes(q) ||
                (c.trabajador?.Nombre && c.trabajador.Nombre.toLowerCase().includes(q)) ||
                (c.empresa?.nome && c.empresa.nome.toLowerCase().includes(q)) ||
                (c.cartao?.nome_cartao && c.cartao.nome_cartao.toLowerCase().includes(q)) ||
                (c.moeda && c.moeda.toLowerCase().includes(q));
            const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
            const matchesEmpresa = empresaFilter === 'todas' || c.id_empresa === empresaFilter;
            const matchesModalidade = modalidadeFilter === 'todas' || (c.tipo_fundo || 'dinheiro') === modalidadeFilter;
            const matchesMoeda = moedaFilter === 'todas' || (c.moeda || 'EUR') === moedaFilter;
            return matchesSearch && matchesStatus && matchesEmpresa && matchesModalidade && matchesMoeda;
        });

        const sorted = [...list];
        sorted.sort((a, b) => {
            switch (sortBy) {
                case 'ativos_primeiro': {
                    if (a.status !== b.status) return a.status === 'Ativo' ? -1 : 1;
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                }
                case 'maior_saldo': {
                    const sA = a.tipo_fundo === 'cartao' ? -Infinity : a.saldo_eur;
                    const sB = b.tipo_fundo === 'cartao' ? -Infinity : b.saldo_eur;
                    return sB - sA;
                }
                case 'maior_gasto':
                    return b.total_despesas_eur - a.total_despesas_eur;
                case 'nome_asc':
                    return a.nombre.localeCompare(b.nombre, 'pt');
                case 'colaborador_asc':
                    return (a.trabajador?.Nombre || '').localeCompare(b.trabajador?.Nombre || '', 'pt');
                case 'recentes':
                default:
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }
        });
        return sorted;
    }, [caixas, searchTerm, statusFilter, empresaFilter, modalidadeFilter, moedaFilter, sortBy]);

    // Filtragem do Extrato Consolidado
    const filteredHistorico = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        return historicoGeral.filter((mov: any) => {
            const matchesSearch = !q ||
                (mov.caixa_nome || '').toLowerCase().includes(q) ||
                (mov.trabalhador_nome || '').toLowerCase().includes(q) ||
                (mov.descricao || '').toLowerCase().includes(q) ||
                (mov.categoria || '').toLowerCase().includes(q) ||
                (mov.moeda || '').toLowerCase().includes(q);
            const matchesTipo = histTipoFilter === 'todos' || mov.tipo === histTipoFilter;
            const matchesCat = histCategoriaFilter === 'todas' || (mov.categoria || '') === histCategoriaFilter;
            const matchesMoeda = histMoedaFilter === 'todas' || (mov.moeda || 'EUR') === histMoedaFilter;
            const matchesFrom = !histDateFrom || (mov.data && mov.data >= histDateFrom);
            const matchesTo = !histDateTo || (mov.data && mov.data <= histDateTo);
            return matchesSearch && matchesTipo && matchesCat && matchesMoeda && matchesFrom && matchesTo;
        });
    }, [historicoGeral, searchTerm, histTipoFilter, histCategoriaFilter, histMoedaFilter, histDateFrom, histDateTo]);

    const exportHistoricoCsv = () => {
        const headers = ['Data', 'Caixa / Viagem', 'Colaborador', 'Empresa', 'Tipo', 'Categoria', 'Descrição', 'Moeda', 'Valor Original', 'Cotação', 'Valor EUR', 'Taxa Bancária EUR'];
        const escapeCsv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = filteredHistorico.map((m: any) => [
            m.data || '',
            m.caixa_nome || '',
            m.trabalhador_nome || '',
            m.empresa_nome || '',
            m.tipo === 'entrada' ? 'Recarga' : 'Despesa',
            m.categoria || '',
            m.descricao || '',
            m.moeda || 'EUR',
            (m.tipo === 'entrada' ? 1 : -1) * Number(m.valor || 0),
            Number(m.taxa_cambio || 1).toFixed(4),
            (m.tipo === 'entrada' ? 1 : -1) * Number(m.valor_eur || m.valor || 0),
            Number(m.taxa_bancaria_eur || 0)
        ]);
        const csv = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows.map(r => r.map(escapeCsv).join(';'))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_fundo_caixa_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exportados ${filteredHistorico.length} registros em CSV.`);
    };

    // Cálculos de KPIs (padronizados em EUR, respeitando filtros ativos e sem somar cartão no saldo custodiado)
    const kpiSource = filteredCaixas;
    const caixasDinheiroAtivas = kpiSource.filter(c => c.status === 'Ativo' && c.tipo_fundo !== 'cartao');
    const totalSaldoCustodiadoEur = caixasDinheiroAtivas.reduce((sum, c) => sum + c.saldo_eur, 0);
    const totalRecarregadoEur = kpiSource.reduce((sum, c) => sum + c.total_recargas_eur, 0);
    const totalTaxasBancariasEur = kpiSource.reduce((sum, c) => sum + c.total_taxas_bancarias_eur, 0);
    const totalGastoEur = kpiSource.reduce((sum, c) => sum + c.total_despesas_eur, 0);
    const totalGastoCartaoAbertoEur = kpiSource
        .filter(c => c.status === 'Ativo' && c.tipo_fundo === 'cartao')
        .reduce((sum, c) => sum + c.total_despesas_eur, 0);
    const caixasAtivas = kpiSource.filter(c => c.status === 'Ativo').length;
    const caixasEstrangeirasCount = kpiSource.filter(c => c.moeda && c.moeda !== 'EUR').length;

    const clearCaixasFilters = () => {
        setSearchTerm('');
        setStatusFilter('todos');
        setEmpresaFilter('todas');
        setModalidadeFilter('todas');
        setMoedaFilter('todas');
    };

    return (
        <div className="h-full flex flex-col p-2 md:p-6 pt-0 md:pt-0 space-y-4 w-full">
            {/* Header */}
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Fundo de Caixa & Adiantamentos
                        </h2>
                        <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">
                            Gestão de caixas para viagens, missões e despesas operacionais dos colaboradores
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={loadData}
                            disabled={loading}
                            className="gap-2 rounded-xl text-xs font-semibold"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            onClick={() => setIsNovoCaixaOpen(true)}
                            className="flex items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 font-semibold transition-all text-xs"
                        >
                            <Plus size={18} /> Novo Fundo de Caixa
                        </Button>
                    </div>
                </div>

                {/* KPIs Row (padronizados em EUR e sensíveis aos filtros) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <Card className="border-l-4 border-l-blue-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Saldo Custodiado (Dinheiro)</span>
                                {hasActiveCaixasFilters && <span className="text-[9px] text-blue-500 normal-case">filtrado</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-black ${totalSaldoCustodiadoEur < 0 ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                                {formatMoney(totalSaldoCustodiadoEur, 'EUR')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Em {caixasDinheiroAtivas.length} adiantamento(s) ativo(s)
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Transferido (€)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {formatMoney(totalRecarregadoEur, 'EUR')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {totalTaxasBancariasEur > 0
                                    ? `Inclui ${formatMoney(totalTaxasBancariasEur, 'EUR')} em taxas bancárias`
                                    : 'Adiantamentos transferidos aos caixas'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Comprovado (Gastos €)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-600 dark:text-red-400">
                                {formatMoney(totalGastoEur, 'EUR')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {totalGastoCartaoAbertoEur > 0
                                    ? `Cartão em aberto: ${formatMoney(totalGastoCartaoAbertoEur, 'EUR')}`
                                    : 'Despesas convertidas em EUR'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Caixas Ativas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {caixasAtivas} <span className="text-sm font-normal text-slate-400">/ {kpiSource.length}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {caixasEstrangeirasCount > 0
                                    ? `${caixasEstrangeirasCount} em moeda estrangeira`
                                    : 'Colaboradores com viagem em andamento'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Abas e Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('caixas')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    activeTab === 'caixas'
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Caixas por Colaborador ({filteredCaixas.length}{hasActiveCaixasFilters ? `/${caixas.length}` : ''})
                            </button>
                            <button
                                onClick={() => setActiveTab('historico')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    activeTab === 'historico'
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Extrato Consolidado ({filteredHistorico.length})
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={activeTab === 'caixas' ? 'Buscar caixa, colaborador, empresa...' : 'Buscar lançamento, caixa, descrição...'}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>

                            {activeTab === 'caixas' ? (
                                /* Toggle Cards vs Lista */
                                <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => handleChangeViewMode('cards')}
                                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                            viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                        title="Visualização em Galeria / Cards"
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Cards</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChangeViewMode('lista')}
                                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                            viewMode === 'lista' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                        title="Visualização em Lista / Tabela"
                                    >
                                        <List className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Lista</span>
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={exportHistoricoCsv}
                                    disabled={filteredHistorico.length === 0}
                                    className="h-9 text-xs font-semibold gap-1.5 rounded-lg"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar CSV
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Barra secundária de filtros e ordenação */}
                    {activeTab === 'caixas' ? (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <select
                                value={statusFilter}
                                onChange={(e: any) => setStatusFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todos">Status: Todos</option>
                                <option value="Ativo">Ativos</option>
                                <option value="Inativo">Fechados / Inativos</option>
                            </select>

                            <select
                                value={modalidadeFilter}
                                onChange={(e: any) => setModalidadeFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todas">Modalidade: Todas</option>
                                <option value="dinheiro">Adiantamento Dinheiro</option>
                                <option value="cartao">Cartão Corporativo</option>
                            </select>

                            <select
                                value={empresaFilter}
                                onChange={e => setEmpresaFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todas">Empresa: Todas</option>
                                {empresas.map(e => (
                                    <option key={e.id} value={e.id}>{e.nome}</option>
                                ))}
                            </select>

                            <select
                                value={moedaFilter}
                                onChange={e => setMoedaFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todas">Moeda: Todas</option>
                                {MOEDAS_CAIXA.map(m => (
                                    <option key={m.code} value={m.code}>{m.flag} {m.code}</option>
                                ))}
                            </select>

                            <div className="flex items-center gap-1.5 ml-auto">
                                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e: any) => setSortBy(e.target.value)}
                                    className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                                >
                                    <option value="ativos_primeiro">Ordenar: Ativos primeiro</option>
                                    <option value="recentes">Ordenar: Mais recentes</option>
                                    <option value="maior_saldo">Ordenar: Maior saldo (€)</option>
                                    <option value="maior_gasto">Ordenar: Maior gasto (€)</option>
                                    <option value="nome_asc">Ordenar: Nome (A–Z)</option>
                                    <option value="colaborador_asc">Ordenar: Colaborador (A–Z)</option>
                                </select>

                                {hasActiveCaixasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearCaixasFilters}
                                        className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 gap-1"
                                    >
                                        <X className="h-3.5 w-3.5" /> Limpar
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <select
                                value={histTipoFilter}
                                onChange={(e: any) => setHistTipoFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todos">Tipo: Todos</option>
                                <option value="entrada">Recargas</option>
                                <option value="saida">Despesas</option>
                            </select>

                            <select
                                value={histCategoriaFilter}
                                onChange={e => setHistCategoriaFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todas">Categoria: Todas</option>
                                <option value="Combustível">Combustível</option>
                                <option value="Viagem/Transporte">Viagem/Transporte</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Alojamento">Alojamento</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Outros">Outros</option>
                            </select>

                            <select
                                value={histMoedaFilter}
                                onChange={e => setHistMoedaFilter(e.target.value)}
                                className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                                <option value="todas">Moeda: Todas</option>
                                {MOEDAS_CAIXA.map(m => (
                                    <option key={m.code} value={m.code}>{m.flag} {m.code}</option>
                                ))}
                            </select>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>De:</span>
                                <Input
                                    type="date"
                                    value={histDateFrom}
                                    onChange={e => setHistDateFrom(e.target.value)}
                                    className="h-8 w-36 text-xs"
                                />
                                <span>Até:</span>
                                <Input
                                    type="date"
                                    value={histDateTo}
                                    onChange={e => setHistDateTo(e.target.value)}
                                    className="h-8 w-36 text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Conteúdo Aba 1: Caixas */}
                {activeTab === 'caixas' && (
                    <div>
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
                                <span>Carregando caixas...</span>
                            </div>
                        ) : filteredCaixas.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <Wallet className="h-10 w-10 mx-auto mb-2 stroke-1 opacity-50" />
                                <p className="font-medium">Nenhum fundo de caixa encontrado.</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {hasActiveCaixasFilters
                                        ? 'Tente ajustar ou limpar os filtros aplicados.'
                                        : 'Clique em "Novo Fundo de Caixa" para criar um novo adiantamento.'}
                                </p>
                            </div>
                        ) : viewMode === 'lista' ? (
                            /* Modo Tabela / Lista */
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                            <TableHead className="cursor-pointer select-none" onClick={() => setSortBy('nome_asc')}>
                                                Caixa / Missão
                                            </TableHead>
                                            <TableHead>Modalidade</TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => setSortBy('colaborador_asc')}>
                                                Funcionário
                                            </TableHead>
                                            <TableHead>Empresa</TableHead>
                                            <TableHead className="text-right cursor-pointer select-none" onClick={() => setSortBy('maior_gasto')}>
                                                Total Gastos
                                            </TableHead>
                                            <TableHead className="text-right cursor-pointer select-none" onClick={() => setSortBy('maior_saldo')}>
                                                Saldo Disponível
                                            </TableHead>
                                            <TableHead className="text-center w-28 cursor-pointer select-none" onClick={() => setSortBy('ativos_primeiro')}>
                                                Status
                                            </TableHead>
                                            <TableHead className="text-center w-56">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCaixas.map(cx => {
                                            const isForeign = cx.moeda && cx.moeda !== 'EUR';
                                            const mInfo = getMoedaInfo(cx.moeda);
                                            return (
                                                <TableRow key={cx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span>{cx.nombre}</span>
                                                            {isForeign && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300">
                                                                    {mInfo.flag} {cx.moeda} · {cx.taxa_cambio.toFixed(4)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {cx.fechado_em && (
                                                            <span className="text-[10px] text-slate-400">
                                                                Fechado em {new Date(cx.fechado_em).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {cx.tipo_fundo === 'cartao' ? (
                                                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 text-[10px] flex items-center gap-1 w-fit">
                                                                <CreditCard className="w-3 h-3" />
                                                                {cx.cartao?.nome_cartao || 'Cartão Corporativo'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-600 text-[10px] flex items-center gap-1 w-fit">
                                                                <Wallet className="w-3 h-3" />
                                                                Adiantamento
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                                                        {cx.trabajador?.Nombre || 'Não especificado'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {cx.empresa?.nome || cx.cartao?.empresa_nome || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs font-semibold text-red-600">
                                                        <div>-{formatMoney(cx.total_despesas, cx.moeda)}</div>
                                                        {isForeign && (
                                                            <div className="text-[10px] text-slate-400 font-normal">
                                                                ≈ -{formatMoney(cx.total_despesas_eur, 'EUR')}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm font-bold">
                                                        {cx.tipo_fundo === 'cartao' ? (
                                                            <span className="text-xs font-normal text-slate-400">Cartão s/ Saldo</span>
                                                        ) : (
                                                            <div>
                                                                <span className={cx.saldo > 0 ? 'text-emerald-600' : cx.saldo < 0 ? 'text-red-600' : 'text-slate-600'}>
                                                                    {formatMoney(cx.saldo, cx.moeda)}
                                                                </span>
                                                                {isForeign && (
                                                                    <div className="text-[10px] text-slate-400 font-normal">
                                                                        ≈ {formatMoney(cx.saldo_eur, 'EUR')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <Badge variant={cx.status === 'Ativo' ? 'default' : 'secondary'} className="text-[10px]">
                                                                {cx.fechado_em ? 'Fechado' : cx.status}
                                                            </Badge>
                                                            {cx.conta_pagar_id && (
                                                                <span className="text-[10px] text-emerald-600 font-mono font-medium">
                                                                    CP #{cx.conta_pagar_id} (Paga)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="h-7 px-2 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                                                                onClick={() => openExtrato(cx)}
                                                                title="Ver Extrato Completo"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1" /> Extrato
                                                            </Button>
                                                            {cx.status === 'Ativo' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs text-red-700 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        setSelectedCaixa(cx);
                                                                        setIsDespesaOpen(true);
                                                                    }}
                                                                    title="Lançar Gasto"
                                                                >
                                                                    <TrendingDown className="h-3.5 w-3.5 mr-1" /> Gasto
                                                                </Button>
                                                            )}
                                                            {cx.status === 'Ativo' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                                    onClick={() => handleOpenFechamento(cx)}
                                                                    title="Finalizar Caixa e Gerar Conta Paga"
                                                                >
                                                                    <FileCheck className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    {cx.tipo_fundo !== 'cartao' && cx.status === 'Ativo' && (
                                                                        <DropdownMenuItem onClick={() => openRecargaModal(cx)} className="text-emerald-700 font-medium">
                                                                            <TrendingUp className="h-3.5 w-3.5 mr-2" /> + Recarregar Saldo
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem onClick={() => copyWorkerLink(cx)}>
                                                                        <Copy className="h-3.5 w-3.5 mr-2 text-blue-600" /> Copiar Link do Funcionário
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleOpenEditCaixa(cx)}>
                                                                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Editar Caixa
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => toggleCaixaStatus(cx)}>
                                                                        <Clock className="h-3.5 w-3.5 mr-2" /> {cx.status === 'Ativo' ? 'Encerrar / Arquivar' : 'Reativar Caixa'}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleDeleteCaixa(cx)} className="text-red-600 focus:text-red-600">
                                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Caixa
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            /* Modo Cards / Galeria */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredCaixas.map(cx => {
                                    const isForeign = cx.moeda && cx.moeda !== 'EUR';
                                    const mInfo = getMoedaInfo(cx.moeda);
                                    const pctUsado = cx.total_recargas > 0
                                        ? Math.min(100, Math.round((cx.total_despesas / cx.total_recargas) * 100))
                                        : 0;
                                    const isOverBudget = cx.total_recargas > 0 && cx.total_despesas > cx.total_recargas;

                                    return (
                                        <div 
                                            key={cx.id} 
                                            className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-400/50 transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                                                                {cx.nombre}
                                                            </h3>
                                                            <Badge variant={cx.status === 'Ativo' ? 'default' : 'secondary'} className="text-[10px]">
                                                                {cx.fechado_em ? 'Fechado' : cx.status}
                                                            </Badge>
                                                        </div>

                                                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                                            {cx.tipo_fundo === 'cartao' ? (
                                                                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 text-[10px] flex items-center gap-1 w-fit">
                                                                    <CreditCard className="w-3 h-3" />
                                                                    {cx.cartao?.nome_cartao || 'Cartão Corporativo'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-slate-600 text-[10px] flex items-center gap-1 w-fit">
                                                                    <Wallet className="w-3 h-3" />
                                                                    Adiantamento
                                                                </Badge>
                                                            )}
                                                            {isForeign && (
                                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300">
                                                                    {mInfo.flag} {cx.moeda} · {cx.taxa_cambio.toFixed(4)}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                                                {cx.trabajador?.Nombre || 'Não especificado'}
                                                            </span>
                                                        </div>
                                                        {(cx.empresa || cx.cartao?.empresa_nome) && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                                                <Building2 className="h-3.5 w-3.5" />
                                                                <span className="truncate">{cx.empresa?.nome || cx.cartao?.empresa_nome}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            onClick={() => handleOpenEditCaixa(cx)}
                                                            title="Editar Fundo de Caixa"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            onClick={() => handleDeleteCaixa(cx)}
                                                            title="Excluir Fundo de Caixa"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Saldo ou Gastos Destaque */}
                                                {cx.tipo_fundo === 'cartao' ? (
                                                    <div className="my-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                        <div className="text-xs text-slate-400 font-medium">Total Gasto na Missão</div>
                                                        <div className="text-2xl font-black mt-0.5 text-red-600 dark:text-red-400">
                                                            {formatMoney(cx.total_despesas, cx.moeda)}
                                                        </div>
                                                        {isForeign && (
                                                            <div className="text-[11px] font-mono text-slate-400">
                                                                ≈ {formatMoney(cx.total_despesas_eur, 'EUR')}
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                            <span className="flex items-center gap-1 text-indigo-600 font-medium truncate max-w-[170px]">
                                                                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                                                {cx.cartao?.nome_cartao || 'Cartão da Empresa'}
                                                            </span>
                                                            <span className="text-slate-400 text-[11px]">Sem saldo fixo</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="my-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-400 font-medium">Saldo Disponível</span>
                                                            {cx.total_recargas > 0 && (
                                                                <span className={`text-[10px] font-semibold ${isOverBudget ? 'text-red-600' : pctUsado >= 80 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                    {pctUsado}% usado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-2xl font-black mt-0.5 ${
                                                            cx.saldo > 0 ? 'text-emerald-600' : cx.saldo < 0 ? 'text-red-600' : 'text-slate-600'
                                                        }`}>
                                                            {formatMoney(cx.saldo, cx.moeda)}
                                                        </div>
                                                        {isForeign && (
                                                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                                                ≈ {formatMoney(cx.saldo_eur, 'EUR')}
                                                                {cx.total_taxas_bancarias_eur > 0 && (
                                                                    <span className="text-slate-400 ml-1">
                                                                        · Taxas: {formatMoney(cx.total_taxas_bancarias_eur, 'EUR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Barra de consumo */}
                                                        {cx.total_recargas > 0 && (
                                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${
                                                                        isOverBudget ? 'bg-red-500' : pctUsado >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                    }`}
                                                                    style={{ width: `${pctUsado}%` }}
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-start text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
                                                            <div>
                                                                <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                    {formatMoney(cx.total_recargas, cx.moeda)}
                                                                </span>
                                                                {isForeign && (
                                                                    <span className="text-[10px] text-slate-400 font-mono block pl-3.5">
                                                                        Env.: {formatMoney(cx.total_recargas_eur, 'EUR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="flex items-center justify-end gap-0.5 text-red-600 font-medium">
                                                                    <ArrowDownLeft className="h-3 w-3" />
                                                                    {formatMoney(cx.total_despesas, cx.moeda)}
                                                                </span>
                                                                {isForeign && (
                                                                    <span className="text-[10px] text-slate-400 font-mono block">
                                                                        ≈ {formatMoney(cx.total_despesas_eur, 'EUR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Informações de Fechamento */}
                                                {cx.fechado_em && (
                                                    <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                                                <FileCheck className="w-3.5 h-3.5" /> Missão Finalizada
                                                            </span>
                                                            {cx.conta_pagar_id && (
                                                                <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                                                    CP #{cx.conta_pagar_id} (Paga)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {cx.cat_despesa && (
                                                            <div className="text-[11px] text-slate-500">
                                                                Classificação: <span className="font-medium text-slate-700 dark:text-slate-300">{cx.cat_despesa}</span> ({cx.centro_custo || 'Geral'})
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Ações */}
                                            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                {cx.status === 'Ativo' && (
                                                    <Button
                                                        size="sm"
                                                        className="w-full text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                        onClick={() => handleOpenFechamento(cx)}
                                                    >
                                                        <FileCheck className="h-3.5 w-3.5" />
                                                        Finalizar Missão & Gerar Conta Paga
                                                    </Button>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    {cx.tipo_fundo !== 'cartao' && cx.status === 'Ativo' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full text-xs font-semibold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                                            onClick={() => openRecargaModal(cx)}
                                                        >
                                                            <TrendingUp className="h-3.5 w-3.5" />
                                                            + Recarregar
                                                        </Button>
                                                    ) : null}

                                                    {cx.status === 'Ativo' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className={`text-xs font-semibold gap-1 text-red-700 hover:text-red-800 hover:bg-red-50 ${
                                                                cx.tipo_fundo === 'cartao' ? 'col-span-2' : ''
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedCaixa(cx);
                                                                setIsDespesaOpen(true);
                                                            }}
                                                        >
                                                            <TrendingDown className="h-3.5 w-3.5" />
                                                            + Lançar Gasto
                                                        </Button>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="flex-1 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                                                        onClick={() => openExtrato(cx)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Ver Extrato
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        title="Copiar Link para o Trabalhador registrar no celular"
                                                        className="text-xs px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => copyWorkerLink(cx)}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title={cx.status === 'Ativo' ? 'Encerrar Caixa' : 'Reativar Caixa'}
                                                        className="text-xs px-2 text-slate-400 hover:text-slate-700"
                                                        onClick={() => toggleCaixaStatus(cx)}
                                                    >
                                                        <Clock className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Conteúdo Aba 2: Histórico Geral */}
                {activeTab === 'historico' && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                    <TableHead className="w-28">Data</TableHead>
                                    <TableHead>Caixa / Viagem</TableHead>
                                    <TableHead>Colaborador</TableHead>
                                    <TableHead>Tipo & Descrição</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-right">Equiv. EUR</TableHead>
                                    <TableHead className="text-center w-20">Recibo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistorico.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                            Nenhum lançamento encontrado para os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistorico.map((mov: any, idx: number) => {
                                        const isForeign = mov.moeda && mov.moeda !== 'EUR';
                                        return (
                                            <TableRow key={mov.id || idx}>
                                                <TableCell className="font-mono text-xs">
                                                    {mov.data}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{mov.caixa_nome}</span>
                                                        {isForeign && (
                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-800 border-amber-300">
                                                                {mov.moeda}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                    {mov.trabalhador_nome}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge 
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                mov.tipo === 'entrada' 
                                                                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50' 
                                                                    : 'text-red-700 border-red-300 bg-red-50'
                                                            }`}
                                                        >
                                                            {mov.tipo === 'entrada' ? 'Recarga' : 'Despesa'}
                                                        </Badge>
                                                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title={mov.descricao}>
                                                            {mov.descricao}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {mov.categoria || '—'}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono text-xs font-bold ${
                                                    mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                    {mov.tipo === 'entrada' ? '+' : '-'}{formatMoney(mov.valor, mov.moeda)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                                                    <div>{mov.tipo === 'entrada' ? '+' : '-'}{formatMoney(mov.valor_eur ?? mov.valor, 'EUR')}</div>
                                                    {mov.taxa_bancaria_eur > 0 && (
                                                        <div className="text-[10px] text-amber-600">
                                                            Taxa: {formatMoney(mov.taxa_bancaria_eur, 'EUR')}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {mov.comprovante_url ? (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                                            onClick={() => setLightboxImage(mov.comprovante_url)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* MODAL 1: Novo Fundo de Caixa */}
            <Dialog open={isNovoCaixaOpen} onOpenChange={setIsNovoCaixaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-600" />
                            Novo Fundo de Caixa
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCaixa} className="space-y-4 py-2">
                        {/* Seletor de Modalidade */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                Modalidade Operacional *
                            </label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFormNovoCaixa(prev => ({ ...prev, tipo_fundo: 'cartao' }))}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                        formNovoCaixa.tipo_fundo === 'cartao'
                                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Cartão Corporativo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormNovoCaixa(prev => ({ ...prev, tipo_fundo: 'dinheiro' }))}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                        formNovoCaixa.tipo_fundo === 'dinheiro'
                                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Wallet className="h-3.5 w-3.5" />
                                    Adiantamento Dinheiro
                                </button>
                            </div>
                        </div>

                        {/* Se Cartão Corporativo: Selecionar o Cartão */}
                        {formNovoCaixa.tipo_fundo === 'cartao' ? (
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Cartão Corporativo / Recarregável *
                                </label>
                                <select
                                    value={formNovoCaixa.cartao_id}
                                    onChange={e => {
                                        const cardId = e.target.value;
                                        const card = cartoes.find(c => c.id === cardId);
                                        const empUuid = getEmpresaUuidFromCard(card, empresas);
                                        setFormNovoCaixa(prev => ({
                                            ...prev,
                                            cartao_id: cardId,
                                            id_empresa: empUuid || ''
                                        }));
                                    }}
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                >
                                    <option value="">Selecione o cartão...</option>
                                    {cartoes.filter(c => c.ativo).map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nome_cartao} — {c.empresa_nome || 'Empresa'} {c.ultimos_digitos ? `(•••• ${c.ultimos_digitos})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Sem transferência para conta pessoal. O cartão físico/recarregável é utilizado na missão.
                                </p>
                            </div>
                        ) : null}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Nome da Missão / Viagem *
                            </label>
                            <Input
                                placeholder="Ex: Viagem Madri - Omar"
                                value={formNovoCaixa.nombre}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, nombre: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Funcionário do Escritório Responsável *
                            </label>
                            <select
                                value={formNovoCaixa.trabajador_id}
                                onChange={e => setFormNovoCaixa(prev => ({ ...prev, trabajador_id: e.target.value }))}
                                required
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Selecione o funcionário do escritório...</option>
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome} ({c.identificador})</option>
                                ))}
                            </select>
                        </div>

                        {formNovoCaixa.tipo_fundo === 'dinheiro' && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Empresa Pagadora / Vinculada
                                        </label>
                                        <select
                                            value={formNovoCaixa.id_empresa}
                                            onChange={e => setFormNovoCaixa(prev => ({ ...prev, id_empresa: e.target.value }))}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                        >
                                            <option value="">Selecione a empresa...</option>
                                            {empresas.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                                            <Globe className="h-3.5 w-3.5 text-amber-600" />
                                            Moeda do Caixa *
                                        </label>
                                        <select
                                            value={formNovoCaixa.moeda}
                                            onChange={e => setFormNovoCaixa(prev => ({
                                                ...prev,
                                                moeda: e.target.value,
                                                fx: { valorEur: '', taxaBancariaEur: '', valorLocal: '', taxaCambio: '' }
                                            }))}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium"
                                        >
                                            {MOEDAS_CAIXA.map(m => (
                                                <option key={m.code} value={m.code}>
                                                    {m.flag} {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {formNovoCaixa.moeda === 'EUR' ? (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Saldo Inicial Adiantado (€)
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formNovoCaixa.saldo_inicial}
                                            onChange={e => setFormNovoCaixa(prev => ({ ...prev, saldo_inicial: e.target.value }))}
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            O valor será lançado como recarga inicial de caixa.
                                        </p>
                                    </div>
                                ) : (
                                    <MultiCurrencyTransferFields
                                        moeda={formNovoCaixa.moeda}
                                        value={formNovoCaixa.fx}
                                        onChange={fx => setFormNovoCaixa(prev => ({ ...prev, fx }))}
                                    />
                                )}
                            </>
                        )}

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsNovoCaixaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Caixa'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: Editar Fundo de Caixa */}
            <Dialog open={isEditCaixaOpen} onOpenChange={setIsEditCaixaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="h-5 w-5 text-blue-600" />
                            Editar Fundo de Caixa
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEditCaixa} className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Modalidade Operacional *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormEditCaixa(prev => ({ ...prev, tipo_fundo: 'cartao' }))}
                                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                        formEditCaixa.tipo_fundo === 'cartao'
                                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                        <CreditCard className="w-4 h-4 text-indigo-600" /> Cartão Corporativo
                                    </div>
                                    <span className="text-[10px] text-slate-500">Cartão de débito/crédito</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormEditCaixa(prev => ({ ...prev, tipo_fundo: 'dinheiro' }))}
                                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                        formEditCaixa.tipo_fundo === 'dinheiro'
                                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                        <Wallet className="w-4 h-4 text-emerald-600" /> Adiantamento
                                    </div>
                                    <span className="text-[10px] text-slate-500">Transferência de saldo</span>
                                </button>
                            </div>
                        </div>

                        {formEditCaixa.tipo_fundo === 'cartao' ? (
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Cartão Corporativo Vinculado *
                                </label>
                                <select
                                    value={formEditCaixa.cartao_id}
                                    onChange={e => {
                                        const cid = e.target.value;
                                        const card = cartoes.find(c => c.id === cid);
                                        const empUuid = getEmpresaUuidFromCard(card, empresas);
                                        setFormEditCaixa(prev => ({
                                            ...prev,
                                            cartao_id: cid,
                                            id_empresa: empUuid || ''
                                        }));
                                    }}
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                >
                                    <option value="">Selecione o cartão...</option>
                                    {cartoes.filter(c => c.ativo || c.id === formEditCaixa.cartao_id).map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nome_cartao} — {c.empresa_nome || 'Empresa'} {c.ultimos_digitos ? `(•••• ${c.ultimos_digitos})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Nome da Missão / Viagem *
                            </label>
                            <Input
                                placeholder="Ex: Viagem Madri - Omar"
                                value={formEditCaixa.nombre}
                                onChange={e => setFormEditCaixa(prev => ({ ...prev, nombre: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Funcionário do Escritório Responsável *
                            </label>
                            <select
                                value={formEditCaixa.trabajador_id}
                                onChange={e => setFormEditCaixa(prev => ({ ...prev, trabajador_id: e.target.value }))}
                                required
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Selecione o funcionário do escritório...</option>
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome} ({c.identificador})</option>
                                ))}
                            </select>
                        </div>

                        {formEditCaixa.tipo_fundo === 'dinheiro' && (
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                        Empresa Pagadora / Vinculada
                                    </label>
                                    <select
                                        value={formEditCaixa.id_empresa}
                                        onChange={e => setFormEditCaixa(prev => ({ ...prev, id_empresa: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                            Moeda do Caixa
                                        </label>
                                        <select
                                            value={formEditCaixa.moeda}
                                            onChange={e => setFormEditCaixa(prev => ({
                                                ...prev,
                                                moeda: e.target.value,
                                                taxa_cambio: e.target.value === 'EUR' ? '1' : prev.taxa_cambio
                                            }))}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                        >
                                            {MOEDAS_CAIXA.map(m => (
                                                <option key={m.code} value={m.code}>{m.flag} {m.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {formEditCaixa.moeda !== 'EUR' && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                                Cotação Ref. (1 EUR = {formEditCaixa.moeda})
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                value={formEditCaixa.taxa_cambio}
                                                onChange={e => setFormEditCaixa(prev => ({ ...prev, taxa_cambio: e.target.value }))}
                                                className="font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Status do Caixa *
                            </label>
                            <select
                                value={formEditCaixa.status}
                                onChange={e => setFormEditCaixa(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo / Encerrado</option>
                            </select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsEditCaixaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: Nova Recarga */}
            <Dialog open={isRecargaOpen} onOpenChange={setIsRecargaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                            Adicionar Recarga de Saldo
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCaixa && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedCaixa.nombre}</p>
                                {selectedCaixa.moeda !== 'EUR' && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                                        {getMoedaInfo(selectedCaixa.moeda).flag} {selectedCaixa.moeda}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-slate-500">Colaborador: {selectedCaixa.trabajador?.Nombre}</p>
                            <p className="text-slate-500 mt-1">
                                Saldo Atual: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(selectedCaixa.saldo, selectedCaixa.moeda)}</strong>
                                {selectedCaixa.moeda !== 'EUR' && (
                                    <span className="text-slate-400 font-mono ml-1.5">
                                        (≈ {formatMoney(selectedCaixa.saldo_eur, 'EUR')})
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleAddRecarga} className="space-y-4 py-2">
                        {selectedCaixa && selectedCaixa.moeda !== 'EUR' ? (
                            <MultiCurrencyTransferFields
                                moeda={selectedCaixa.moeda}
                                value={formRecarga.fx}
                                onChange={fx => setFormRecarga(prev => ({ ...prev, fx }))}
                                required
                                autoFocusEur
                            />
                        ) : (
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Valor da Recarga (€) *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 500.00"
                                    value={formRecarga.valor}
                                    onChange={e => setFormRecarga(prev => ({ ...prev, valor: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Data da Recarga *
                            </label>
                            <Input
                                type="date"
                                value={formRecarga.data_recarga}
                                onChange={e => setFormRecarga(prev => ({ ...prev, data_recarga: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Observações / Descrição
                            </label>
                            <Input
                                placeholder="Ex: Adiantamento para viagem a Milão"
                                value={formRecarga.observacoes}
                                onChange={e => setFormRecarga(prev => ({ ...prev, observacoes: e.target.value }))}
                            />
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formRecarga.gerar_op}
                                    onChange={e => setFormRecarga(prev => ({ ...prev, gerar_op: e.target.checked }))}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                    Gerar Ordem de Pagamento no Financeiro
                                </span>
                            </label>
                            <p className="text-[11px] text-slate-400 mt-1 pl-6">
                                Se marcado, uma OP será criada para a equipe financeira aprovar e efetuar o PIX/Transferência bancária.
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Comprovante de Transferência (Opcional)
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(e.target.files[0], 'recarga');
                                    }
                                }}
                                className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingReceipt && <p className="text-xs text-blue-600 mt-1">Enviando arquivo...</p>}
                            {formRecarga.comprovante_url && (
                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Arquivo anexado com sucesso
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsRecargaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting || uploadingReceipt}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Recarga'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: Nova Despesa */}
            <Dialog open={isDespesaOpen} onOpenChange={setIsDespesaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <TrendingDown className="h-5 w-5" />
                            Lançar Gasto / Despesa
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCaixa && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedCaixa.nombre}</p>
                                {selectedCaixa.moeda !== 'EUR' && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                                        {getMoedaInfo(selectedCaixa.moeda).flag} {selectedCaixa.moeda} · {selectedCaixa.taxa_cambio.toFixed(4)}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-slate-500">Colaborador: {selectedCaixa.trabajador?.Nombre}</p>
                            <p className="text-slate-500 mt-1">
                                Saldo Atual: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(selectedCaixa.saldo, selectedCaixa.moeda)}</strong>
                                {selectedCaixa.moeda !== 'EUR' && (
                                    <span className="text-slate-400 font-mono ml-1.5">
                                        (≈ {formatMoney(selectedCaixa.saldo_eur, 'EUR')})
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleAddDespesa} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Valor do Gasto ({selectedCaixa?.moeda || 'EUR'}) *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 45.00"
                                    value={formDespesa.valor}
                                    onChange={e => setFormDespesa(prev => ({ ...prev, valor: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Data da Despesa *
                                </label>
                                <Input
                                    type="date"
                                    value={formDespesa.data_despesa}
                                    onChange={e => setFormDespesa(prev => ({ ...prev, data_despesa: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {selectedCaixa && selectedCaixa.moeda !== 'EUR' && Number(formDespesa.valor) > 0 && (
                            <div className="px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 text-[11px] flex items-center justify-between text-amber-900 dark:text-amber-200">
                                <span>
                                    Equivalente: <strong className="font-mono">≈ {formatMoney(Number(formDespesa.valor) / (selectedCaixa.taxa_cambio || 1), 'EUR')}</strong>
                                </span>
                                {selectedCaixa.tipo_fundo !== 'cartao' && (
                                    <span>
                                        Saldo após: <strong className="font-mono">{formatMoney(selectedCaixa.saldo - Number(formDespesa.valor), selectedCaixa.moeda)}</strong>
                                    </span>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Categoria do Gasto *
                            </label>
                            <select
                                value={formDespesa.categoria}
                                onChange={e => setFormDespesa(prev => ({ ...prev, categoria: e.target.value as any }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                required
                            >
                                <option value="Combustível">⛽ Combustível / Abastecimento</option>
                                <option value="Viagem/Transporte">🛣️ Pedágio / Transporte / Estacionamento</option>
                                <option value="Alimentação">🍽️ Alimentação / Refeição</option>
                                <option value="Alojamento">🏨 Hotel / Alojamento</option>
                                <option value="Manutenção">🔧 Manutenção do Veículo</option>
                                <option value="Outros">📦 Outros Gastos</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Veículo Envolvido (Opcional)
                            </label>
                            <select
                                value={formDespesa.coche_id}
                                onChange={e => setFormDespesa(prev => ({ ...prev, coche_id: e.target.value }))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="">Sem veículo vinculado</option>
                                {coches.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.matricula} — {c.marca} {c.modelo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Descrição / Justificativa
                            </label>
                            <Input
                                placeholder="Ex: Abastecimento em posto na rodovia de Bolonha"
                                value={formDespesa.descricao}
                                onChange={e => setFormDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Foto do Recibo / Comprovante (Câmera ou Arquivo)
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                capture="environment"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(e.target.files[0], 'despesa');
                                    }
                                }}
                                className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingReceipt && <p className="text-xs text-blue-600 mt-1">Fazendo upload da imagem...</p>}
                            {formDespesa.comprovante_url && (
                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Foto anexada com sucesso
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsDespesaOpen(false)}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting || uploadingReceipt}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar Despesa'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: Extrato Completo do Caixa */}
            <Dialog open={isExtratoOpen} onOpenChange={setIsExtratoOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Extrato: {selectedCaixa?.nombre}
                            </DialogTitle>
                            {selectedCaixa && (
                                <Badge variant={selectedCaixa.status === 'Ativo' ? 'default' : 'secondary'}>
                                    {selectedCaixa.status}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedCaixa && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Colaborador:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedCaixa.trabajador?.Nombre}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Empresa:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedCaixa.empresa?.nome || '—'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block">Saldo Atual ({selectedCaixa.moeda}):</span>
                                    <span className={`text-base font-bold ${selectedCaixa.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatMoney(selectedCaixa.saldo, selectedCaixa.moeda)}
                                    </span>
                                    {selectedCaixa.moeda !== 'EUR' && (
                                        <span className="block text-[11px] font-mono text-slate-500">
                                            ≈ {formatMoney(selectedCaixa.saldo_eur, 'EUR')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedCaixa.moeda !== 'EUR' && (
                                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200">
                                    <span>
                                        {getMoedaInfo(selectedCaixa.moeda).flag} <strong>{selectedCaixa.moeda}</strong> · Câmbio médio: <strong className="font-mono">1 EUR = {selectedCaixa.taxa_cambio.toFixed(4)} {selectedCaixa.moeda}</strong>
                                    </span>
                                    <span className="font-mono">
                                        Enviado: <strong>{formatMoney(selectedCaixa.total_recargas_eur, 'EUR')}</strong>
                                        {selectedCaixa.total_taxas_bancarias_eur > 0 && (
                                            <> · Taxas: <strong>{formatMoney(selectedCaixa.total_taxas_bancarias_eur, 'EUR')}</strong></>
                                        )}
                                        <> · Gasto: <strong>{formatMoney(selectedCaixa.total_despesas_eur, 'EUR')}</strong></>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto mt-2 border border-slate-200 dark:border-slate-800 rounded-xl">
                        {extratoLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-600" />
                                <span>Calculando extrato...</span>
                            </div>
                        ) : extrato.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <p>Nenhum movimento registrado neste caixa.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                        <TableHead className="w-24">Data</TableHead>
                                        <TableHead>Movimento</TableHead>
                                        <TableHead>Categoria / Veículo</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Saldo Acum.</TableHead>
                                        <TableHead className="text-center w-24">Recibo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extrato.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-mono text-xs text-slate-500">
                                                {m.data}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`p-1 rounded-md ${
                                                        m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {m.tipo === 'entrada' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {m.descricao}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {m.categoria ? (
                                                    <div>
                                                        <span>{m.categoria}</span>
                                                        {m.coche && (
                                                            <span className="block text-[11px] text-slate-400 font-mono">
                                                                🚗 {m.coche.matricula}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono text-xs font-bold ${
                                                m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                                <div>{m.tipo === 'entrada' ? '+' : '-'}{formatMoney(m.valor, m.moeda)}</div>
                                                {m.moeda && m.moeda !== 'EUR' && (
                                                    <div className="text-[10px] font-normal text-slate-400">
                                                        ≈ {m.tipo === 'entrada' ? '+' : '-'}{formatMoney(m.valor_eur, 'EUR')}
                                                        {m.taxa_bancaria_eur ? ` (taxa ${formatMoney(m.taxa_bancaria_eur, 'EUR')})` : ''}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <div>{m.runningBalance !== undefined ? formatMoney(m.runningBalance, m.moeda) : '—'}</div>
                                                {m.moeda && m.moeda !== 'EUR' && m.runningBalanceEur !== undefined && (
                                                    <div className="text-[10px] font-normal text-slate-400">
                                                        ≈ {formatMoney(m.runningBalanceEur, 'EUR')}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {m.comprovante_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                                            onClick={() => setLightboxImage(m.comprovante_url || null)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {m.tipo === 'saida' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                                            title="Excluir despesa"
                                                            onClick={() => handleDeleteDespesa(m.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter className="mt-3 flex justify-between sm:justify-between items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 text-blue-600"
                            onClick={() => selectedCaixa && copyWorkerLink(selectedCaixa)}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Link do Trabalhador
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => setIsExtratoOpen(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 5: Fechamento de Fundo de Caixa */}
            <Dialog open={isFechamentoOpen} onOpenChange={setIsFechamentoOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <FileCheck className="h-5 w-5" />
                            Fechamento de Fundo de Caixa
                        </DialogTitle>
                    </DialogHeader>
                    {caixaToFechar && (
                        <form onSubmit={handleConfirmFechamento} className="space-y-4 py-2">
                            {/* Resumo da Missão */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                                <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                                    <span>{caixaToFechar.nombre}</span>
                                    <span className="text-emerald-600 font-mono text-sm font-bold">
                                        {formatMoney(
                                            caixaToFechar.total_despesas_eur + (formFechamento.incluirTaxasBancarias ? caixaToFechar.total_taxas_bancarias_eur : 0),
                                            'EUR'
                                        )}
                                    </span>
                                </div>
                                {caixaToFechar.moeda !== 'EUR' && (
                                    <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>Gastos em {caixaToFechar.moeda}:</span>
                                            <span className="font-mono font-semibold">
                                                {formatMoney(caixaToFechar.total_despesas, caixaToFechar.moeda)} (≈ {formatMoney(caixaToFechar.total_despesas_eur, 'EUR')})
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-amber-700/80 dark:text-amber-300">
                                            <span>Cotação média utilizada:</span>
                                            <span className="font-mono">1 EUR = {caixaToFechar.taxa_cambio.toFixed(4)} {caixaToFechar.moeda}</span>
                                        </div>
                                        {caixaToFechar.total_taxas_bancarias_eur > 0 && (
                                            <label className="flex items-center gap-1.5 pt-1 mt-1 border-t border-amber-200/60 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formFechamento.incluirTaxasBancarias}
                                                    onChange={e => setFormFechamento(prev => ({ ...prev, incluirTaxasBancarias: e.target.checked }))}
                                                    className="rounded border-amber-400 text-emerald-600 h-3.5 w-3.5"
                                                />
                                                <span>
                                                    Incluir taxas bancárias (<strong>{formatMoney(caixaToFechar.total_taxas_bancarias_eur, 'EUR')}</strong>) na Conta a Pagar
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                )}
                                <div className="text-slate-500">
                                    Responsável: <span className="font-medium text-slate-700 dark:text-slate-300">{caixaToFechar.trabajador?.Nombre}</span>
                                </div>
                                <div className="text-slate-500">
                                    Modalidade: <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {caixaToFechar.tipo_fundo === 'cartao' 
                                            ? `Cartão Corporativo (${caixaToFechar.cartao?.nome_cartao || 'Empresa'})` 
                                            : 'Adiantamento em Dinheiro'}
                                    </span>
                                </div>
                                {(caixaToFechar.empresa || caixaToFechar.cartao?.empresa_nome) && (
                                    <div className="text-slate-500">
                                        Empresa Contratante: <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {caixaToFechar.empresa?.nome || caixaToFechar.cartao?.empresa_nome}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                    Categoria de Despesa *
                                </label>
                                <select
                                    value={formFechamento.catDespesa}
                                    onChange={e => setFormFechamento(prev => ({ ...prev, catDespesa: e.target.value }))}
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                >
                                    <option value="">Selecione a categoria contábil...</option>
                                    {categorias
                                        .filter(c => c.tipo === 'Despesa')
                                        .map(cat => (
                                            <option key={cat.id} value={cat.nome}>
                                                {cat.nome} {cat.categoria_dre ? `(${cat.categoria_dre})` : ''}
                                            </option>
                                        ))
                                    }
                                    {/* Opções comuns garantidas */}
                                    <option value="Viagem/Transporte">Viagem/Transporte</option>
                                    <option value="Combustível">Combustível</option>
                                    <option value="Pedágio">Pedágio</option>
                                    <option value="Alimentação">Alimentação</option>
                                    <option value="Alojamento">Alojamento</option>
                                    <option value="Despesas Operacionais">Despesas Operacionais</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                    Centro de Custo / Obra *
                                </label>
                                <select
                                    value={formFechamento.centroCusto}
                                    onChange={e => setFormFechamento(prev => ({ ...prev, centroCusto: e.target.value }))}
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                                >
                                    <option value="">Selecione o centro de custo...</option>
                                    <option value="Central Cars - Frota / Operações Gerais">Central Cars - Frota / Operações Gerais</option>
                                    <option value="Administrativo / Escritório">Administrativo / Escritório</option>
                                    {obras.map(ob => (
                                        <option key={ob.id} value={ob.nome}>{ob.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                    Nº Documento / Referência
                                </label>
                                <Input
                                    value={formFechamento.numDoc}
                                    onChange={e => setFormFechamento(prev => ({ ...prev, numDoc: e.target.value }))}
                                    placeholder="Ex: FC-MADRID-01"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                    Observações do Fechamento
                                </label>
                                <textarea
                                    value={formFechamento.observacoes}
                                    onChange={e => setFormFechamento(prev => ({ ...prev, observacoes: e.target.value }))}
                                    rows={2}
                                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                    placeholder="Observações complementares sobre a prestação de contas..."
                                />
                            </div>

                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                                ✓ Ao confirmar, o fundo de caixa será <b>finalizado</b> e será gerada uma conta a pagar já com status <b>'Pago'</b> no valor total de <b>{formatMoney(caixaToFechar.total_despesas_eur + (formFechamento.incluirTaxasBancarias ? caixaToFechar.total_taxas_bancarias_eur : 0), 'EUR')}</b> consolidada em uma única linha no módulo Contas a Pagar.
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsFechamentoOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileCheck className="h-4 w-4 mr-1" />}
                                    Confirmar Fechamento e Gerar Conta Paga
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL: Visualizador de Comprovante */}
            <Dialog open={Boolean(lightboxImage)} onOpenChange={(open) => { if (!open) setLightboxImage(null); }}>
                <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col bg-slate-900 border-slate-800 text-white overflow-hidden shadow-2xl z-[70] [&>button]:text-white [&>button]:hover:text-slate-200 [&>button]:opacity-90">
                    <DialogHeader className="p-3 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0 pr-12">
                        <DialogTitle className="text-xs font-semibold text-slate-200">
                            Comprovante de Despesa
                        </DialogTitle>
                        {lightboxImage && (
                            <a 
                                href={lightboxImage} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" /> Abrir Original
                            </a>
                        )}
                    </DialogHeader>
                    <div className="p-2 flex items-center justify-center flex-1 overflow-auto bg-slate-950 min-h-[300px]">
                        {lightboxImage ? (
                            lightboxImage.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={lightboxImage} className="w-full h-[70vh] border-0" />
                            ) : (
                                <img src={lightboxImage} alt="Comprovante" className="max-w-full max-h-[75vh] object-contain rounded" />
                            )
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
