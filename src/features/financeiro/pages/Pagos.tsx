import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/shared/supabase/client';
import { formatCurrency, formatDate, normalizeEmpresaName } from '../lib/utils';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    CornerDownRight,
    Filter,
    Eye,
    CheckSquare,
    Square,
    Plus,
    Wallet,
    Trash2,
    ClipboardList,
    Activity,
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    Clock,
    FileSpreadsheet,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Paperclip,
    Building2,
    Users,
    Layers,
    FileText,
    Edit2,
    Send,
    MessageSquare,
    ExternalLink,
    Copy,
    Calendar,
    DollarSign,
    Landmark
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    fetchContasPagar,
    createContaPagar,
    updateContaPagar,
    deleteContaPagar,
    savePagamento,
    savePagamentoLote
} from '../data/loader';
import type { ContasPagar } from '../types';
import { RichTextEditor } from '../components/RichTextEditor';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

const ALL_STATUSES = ['A vencer', 'Vencido', 'Parcial', 'Pago'];

export interface PagoTimelineNote {
    id: string;
    data: string;
    usuario: string;
    tipo: string;
    descricao: string;
}

export interface EnrichedContaPagar extends ContasPagar {
    resolvedEmpresa: string;
    resolvedProvedor: string;
    resolvedObra: string;
    resolvedOrigem: 'OP' | 'FC' | 'Manual';
    resolvedOrigemLabel: string;
    effectiveStatus: 'Pago' | 'Vencido' | 'Parcial' | 'A vencer';
    isOverdue: boolean;
    isDueToday: boolean;
    isDueSoon7d: boolean;
    delayDays: number;
    daysUntilDue: number | null;
    resolvedAnexoUrl: string | null;
    resolvedDescricao: string;
    ibanInfo: string | null;
    notesList: PagoTimelineNote[];
}

const parseTimelineNotes = (rawComentarios?: string | null, rawObs?: string | null, criado?: Date | null, criadoPor?: string | null): PagoTimelineNote[] => {
    const notes: PagoTimelineNote[] = [];
    if (rawComentarios) {
        try {
            const parsed = JSON.parse(rawComentarios);
            if (Array.isArray(parsed)) {
                parsed.forEach((item: any, idx: number) => {
                    if (item && item.descricao) {
                        notes.push({
                            id: item.id || `note-${idx}`,
                            data: item.data || new Date().toISOString(),
                            usuario: item.usuario || 'Sistema',
                            tipo: item.tipo || 'Anotação Manual',
                            descricao: item.descricao
                        });
                    }
                });
            } else if (typeof rawComentarios === 'string' && rawComentarios.trim()) {
                notes.push({
                    id: 'legacy-comment',
                    data: criado ? criado.toISOString() : new Date().toISOString(),
                    usuario: criadoPor || 'Sistema',
                    tipo: 'Comentário',
                    descricao: rawComentarios.trim()
                });
            }
        } catch {
            if (rawComentarios.trim()) {
                notes.push({
                    id: 'legacy-comment',
                    data: criado ? criado.toISOString() : new Date().toISOString(),
                    usuario: criadoPor || 'Sistema',
                    tipo: 'Observação',
                    descricao: rawComentarios.trim()
                });
            }
        }
    }
    return notes;
};

const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

export const Pagos = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Search & View Mode
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('pagos_searchTerm') || '');
    const [viewMode, setViewMode] = useState<'title' | 'supplier'>(() => (sessionStorage.getItem('pagos_viewMode') as 'title' | 'supplier') || 'title');
    const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

    // Active KPI Quick Filter
    const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'ordem_pago' | 'a_vencer' | 'vencendo_hoje' | 'vencido' | 'pago'>(
        () => (sessionStorage.getItem('pagos_activeKpiFilter') as any) || 'all'
    );

    // Advanced Filters State
    const [filterEmpresas, setFilterEmpresas] = useState<string[]>(() => {
        try {
            const v = sessionStorage.getItem('pagos_filterEmpresas');
            return v ? JSON.parse(v) : [];
        } catch { return []; }
    });
    const [filterFornecedores, setFilterFornecedores] = useState<string[]>(() => {
        try {
            const v = sessionStorage.getItem('pagos_filterFornecedores');
            return v ? JSON.parse(v) : [];
        } catch { return []; }
    });
    const [filterObras, setFilterObras] = useState<string[]>(() => {
        try {
            const v = sessionStorage.getItem('pagos_filterObras');
            return v ? JSON.parse(v) : [];
        } catch { return []; }
    });
    const [filterOrigens, setFilterOrigens] = useState<string[]>(() => {
        try {
            const v = sessionStorage.getItem('pagos_filterOrigens');
            return v ? JSON.parse(v) : [];
        } catch { return []; }
    });
    const [filterStatuses, setFilterStatuses] = useState<string[]>(() => {
        try {
            const v = sessionStorage.getItem('pagos_filterStatuses');
            return v ? JSON.parse(v) : [];
        } catch { return []; }
    });

    const [filterPeriodoVencimento, setFilterPeriodoVencimento] = useState(() => sessionStorage.getItem('pagos_filterPeriodoVencimento') || 'all');
    const [startDateVencimento, setStartDateVencimento] = useState(() => sessionStorage.getItem('pagos_startDateVencimento') || '');
    const [endDateVencimento, setEndDateVencimento] = useState(() => sessionStorage.getItem('pagos_endDateVencimento') || '');

    const [filterPeriodoEmissao, setFilterPeriodoEmissao] = useState(() => sessionStorage.getItem('pagos_filterPeriodoEmissao') || 'all');
    const [startDateEmissao, setStartDateEmissao] = useState(() => sessionStorage.getItem('pagos_startDateEmissao') || '');
    const [endDateEmissao, setEndDateEmissao] = useState(() => sessionStorage.getItem('pagos_endDateEmissao') || '');

    const [filterPeriodoPagamento, setFilterPeriodoPagamento] = useState(() => sessionStorage.getItem('pagos_filterPeriodoPagamento') || 'all');
    const [startDatePagamento, setStartDatePagamento] = useState(() => sessionStorage.getItem('pagos_startDatePagamento') || '');
    const [endDatePagamento, setEndDatePagamento] = useState(() => sessionStorage.getItem('pagos_endDatePagamento') || '');

    // Popover Draft States
    const [showFilters, setShowFilters] = useState(false);
    const [tempFilterEmpresas, setTempFilterEmpresas] = useState<string[]>(filterEmpresas);
    const [tempFilterFornecedores, setTempFilterFornecedores] = useState<string[]>(filterFornecedores);
    const [tempFilterObras, setTempFilterObras] = useState<string[]>(filterObras);
    const [tempFilterOrigens, setTempFilterOrigens] = useState<string[]>(filterOrigens);
    const [tempFilterStatuses, setTempFilterStatuses] = useState<string[]>(filterStatuses);
    const [tempFilterPeriodoVencimento, setTempFilterPeriodoVencimento] = useState(filterPeriodoVencimento);
    const [tempStartDateVencimento, setTempStartDateVencimento] = useState(startDateVencimento);
    const [tempEndDateVencimento, setTempEndDateVencimento] = useState(endDateVencimento);
    const [tempFilterPeriodoEmissao, setTempFilterPeriodoEmissao] = useState(filterPeriodoEmissao);
    const [tempStartDateEmissao, setTempStartDateEmissao] = useState(startDateEmissao);
    const [tempEndDateEmissao, setTempEndDateEmissao] = useState(endDateEmissao);
    const [tempFilterPeriodoPagamento, setTempFilterPeriodoPagamento] = useState(filterPeriodoPagamento);
    const [tempStartDatePagamento, setTempStartDatePagamento] = useState(startDatePagamento);
    const [tempEndDatePagamento, setTempEndDatePagamento] = useState(endDatePagamento);

    // Sync temporary popover states
    useEffect(() => {
        setTempFilterEmpresas(filterEmpresas);
        setTempFilterFornecedores(filterFornecedores);
        setTempFilterObras(filterObras);
        setTempFilterOrigens(filterOrigens);
        setTempFilterStatuses(filterStatuses);
        setTempFilterPeriodoVencimento(filterPeriodoVencimento);
        setTempStartDateVencimento(startDateVencimento);
        setTempEndDateVencimento(endDateVencimento);
        setTempFilterPeriodoEmissao(filterPeriodoEmissao);
        setTempStartDateEmissao(startDateEmissao);
        setTempEndDateEmissao(endDateEmissao);
        setTempFilterPeriodoPagamento(filterPeriodoPagamento);
        setTempStartDatePagamento(startDatePagamento);
        setTempEndDatePagamento(endDatePagamento);
    }, [
        showFilters,
        filterEmpresas,
        filterFornecedores,
        filterObras,
        filterOrigens,
        filterStatuses,
        filterPeriodoVencimento,
        startDateVencimento,
        endDateVencimento,
        filterPeriodoEmissao,
        startDateEmissao,
        endDateEmissao,
        filterPeriodoPagamento,
        startDatePagamento,
        endDatePagamento
    ]);

    // Persist Filters to sessionStorage
    useEffect(() => { sessionStorage.setItem('pagos_searchTerm', searchTerm); }, [searchTerm]);
    useEffect(() => { sessionStorage.setItem('pagos_viewMode', viewMode); }, [viewMode]);
    useEffect(() => { sessionStorage.setItem('pagos_activeKpiFilter', activeKpiFilter); }, [activeKpiFilter]);
    useEffect(() => { sessionStorage.setItem('pagos_filterEmpresas', JSON.stringify(filterEmpresas)); }, [filterEmpresas]);
    useEffect(() => { sessionStorage.setItem('pagos_filterFornecedores', JSON.stringify(filterFornecedores)); }, [filterFornecedores]);
    useEffect(() => { sessionStorage.setItem('pagos_filterObras', JSON.stringify(filterObras)); }, [filterObras]);
    useEffect(() => { sessionStorage.setItem('pagos_filterOrigens', JSON.stringify(filterOrigens)); }, [filterOrigens]);
    useEffect(() => { sessionStorage.setItem('pagos_filterStatuses', JSON.stringify(filterStatuses)); }, [filterStatuses]);
    useEffect(() => { sessionStorage.setItem('pagos_filterPeriodoVencimento', filterPeriodoVencimento); }, [filterPeriodoVencimento]);
    useEffect(() => { sessionStorage.setItem('pagos_startDateVencimento', startDateVencimento); }, [startDateVencimento]);
    useEffect(() => { sessionStorage.setItem('pagos_endDateVencimento', endDateVencimento); }, [endDateVencimento]);
    useEffect(() => { sessionStorage.setItem('pagos_filterPeriodoEmissao', filterPeriodoEmissao); }, [filterPeriodoEmissao]);
    useEffect(() => { sessionStorage.setItem('pagos_startDateEmissao', startDateEmissao); }, [startDateEmissao]);
    useEffect(() => { sessionStorage.setItem('pagos_endDateEmissao', endDateEmissao); }, [endDateEmissao]);
    useEffect(() => { sessionStorage.setItem('pagos_filterPeriodoPagamento', filterPeriodoPagamento); }, [filterPeriodoPagamento]);
    useEffect(() => { sessionStorage.setItem('pagos_startDatePagamento', startDatePagamento); }, [startDatePagamento]);
    useEffect(() => { sessionStorage.setItem('pagos_endDatePagamento', endDatePagamento); }, [endDatePagamento]);

    // Sorting States
    const [sortField, setSortField] = useState<string>(() => sessionStorage.getItem('pagos_sortField') || 'Dt_venc');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => (sessionStorage.getItem('pagos_sortDirection') as 'asc' | 'desc') || 'desc');

    useEffect(() => { sessionStorage.setItem('pagos_sortField', sortField); }, [sortField]);
    useEffect(() => { sessionStorage.setItem('pagos_sortDirection', sortDirection); }, [sortDirection]);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
        const saved = sessionStorage.getItem('pagos_itemsPerPage');
        return saved !== null ? Number(saved) : 15;
    });

    useEffect(() => {
        sessionStorage.setItem('pagos_itemsPerPage', String(itemsPerPage));
    }, [itemsPerPage]);

    // Selected items for Batch actions
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Modal state for manual creation / editing
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EnrichedContaPagar | null>(null);
    const [empresaId, setEmpresaId] = useState('');
    const [fornecedorId, setFornecedorId] = useState('');
    const [fornecedorCustom, setFornecedorCustom] = useState('');
    const [obraId, setObraId] = useState('');
    const [obraCustom, setObraCustom] = useState('');
    const [valorTotal, setValorTotal] = useState('');
    const [dataEmissao, setDataEmissao] = useState('');
    const [dtVenc, setDtVenc] = useState('');
    const [numDoc, setNumDoc] = useState('');
    const [catDespesa, setCatDespesa] = useState('');
    const [obsLancamento, setObsLancamento] = useState('');
    const [anexoUrl, setAnexoUrl] = useState('');

    // Modal state for Single Payment
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payingItem, setPayingItem] = useState<EnrichedContaPagar | null>(null);
    const [payValor, setPayValor] = useState('');
    const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [payForm, setPayForm] = useState('Transferência Bancária');
    const [payBank, setPayBank] = useState('');

    // Modal state for Batch Payment
    const [isBatchPayOpen, setIsBatchPayOpen] = useState(false);
    const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [batchForm, setBatchForm] = useState('Transferência Bancária');
    const [batchBank, setBatchBank] = useState('');

    // Modal state for Observations & Timeline Details
    const [isObsOpen, setIsObsOpen] = useState(false);
    const [selectedPagoObs, setSelectedPagoObs] = useState<EnrichedContaPagar | null>(null);
    const [novaObs, setNovaObs] = useState('');
    const [isSavingObs, setIsSavingObs] = useState(false);

    // Data Queries
    const { data: payables = [], isLoading } = useQuery({
        queryKey: ['contas_pagar'],
        queryFn: fetchContasPagar
    });

    const { data: ordens = [] } = useQuery({
        queryKey: ['ordens_pagamento_lookup'],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_finance')
                .from('ordens_pagamento')
                .select('id, cod_orden_pago, descricao, fornecedor_id, cod_provedor, id_empresa, departamento_origem, observaciones, anexos, comprovante_geral');
            if (error) return [];
            return data || [];
        }
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers_list'],
        queryFn: async () => {
            const { data, error } = await supabase.schema('core_common').from('suppliers').select('*').eq('status', 'active').order('trade_name');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: companies = [] } = useQuery({
        queryKey: ['companies_list'],
        queryFn: async () => {
            const { data, error } = await supabase.schema('core_common').from('empresas').select('*').eq('is_active', true).order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: obras = [] } = useQuery({
        queryKey: ['obras_list'],
        queryFn: async () => {
            const { data, error } = await supabase.from('obras').select('*').order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: banks = [] } = useQuery({
        queryKey: ['banks_list'],
        queryFn: async () => {
            const { data, error } = await supabase.from('bancos').select('*').order('nome_banco');
            if (error) {
                const fallback = await supabase.from('bancos').select('*');
                return fallback.data || [];
            }
            return data || [];
        }
    });

    // Enrich Contas a Pagar with Ordens de Pagamento, Suppliers, Companies & Dynamic Overdue Status
    const enrichedPayables: EnrichedContaPagar[] = useMemo(() => {
        const ordensById = new Map<string, any>();
        const ordensByCode = new Map<string, any>();
        ordens.forEach((o: any) => {
            if (o.id) ordensById.set(String(o.id), o);
            if (o.cod_orden_pago) ordensByCode.set(String(o.cod_orden_pago).toUpperCase().trim(), o);
        });

        const suppliersByCode = new Map<string, any>();
        const suppliersById = new Map<string, any>();
        suppliers.forEach((s: any) => {
            if (s.codigo) suppliersByCode.set(String(s.codigo).toUpperCase().trim(), s);
            if (s.id) suppliersById.set(String(s.id), s);
        });

        const companiesById = new Map<string, any>();
        companies.forEach((c: any) => {
            if (c.id) companiesById.set(String(c.id), c);
        });

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const todayTime = todayMidnight.getTime();
        const next7dTime = todayTime + 7 * 24 * 60 * 60 * 1000;

        return (payables || []).map((item) => {
            const docUpper = (item.Num_doc || '').toUpperCase().trim();
            const linkedOp = (item.ordem_pagamento_id && ordensById.get(String(item.ordem_pagamento_id))) ||
                (docUpper.startsWith('OP-') ? ordensByCode.get(docUpper) : null);

            // 1. Resolve Empresa
            let rawEmp = (item.Empresa || '').trim();
            if ((!rawEmp || rawEmp === 'Empresa ' || rawEmp.startsWith('Empresa ')) && linkedOp?.id_empresa) {
                const comp = companiesById.get(String(linkedOp.id_empresa));
                if (comp) rawEmp = comp.trade_name || comp.nome || rawEmp;
            }
            // If rawEmp is a UUID, resolve from companiesById
            if (rawEmp && /^[0-9a-fA-F-]{36}$/.test(rawEmp.replace(/^Empresa\s+/i, ''))) {
                const uuid = rawEmp.replace(/^Empresa\s+/i, '');
                const comp = companiesById.get(uuid);
                if (comp) rawEmp = comp.trade_name || comp.nome || '';
            }
            const resolvedEmpresa = normalizeEmpresaName(rawEmp) || rawEmp || 'GERAL';

            // 2. Resolve Provedor / Fornecedor
            let resolvedProvedor = (item.Provedor || '').trim();
            if (!resolvedProvedor && item.CodProvedor) {
                const s = suppliersByCode.get(item.CodProvedor.toUpperCase().trim()) || suppliersById.get(item.CodProvedor);
                if (s) resolvedProvedor = s.trade_name || s.legal_name || item.CodProvedor;
            }
            if (!resolvedProvedor && linkedOp) {
                if (linkedOp.fornecedor_id && suppliersById.has(String(linkedOp.fornecedor_id))) {
                    const s = suppliersById.get(String(linkedOp.fornecedor_id));
                    resolvedProvedor = s.trade_name || s.legal_name || '';
                }
                if (!resolvedProvedor && linkedOp.cod_provedor && linkedOp.cod_provedor !== 'Identificado nos itens') {
                    const s = suppliersByCode.get(String(linkedOp.cod_provedor).toUpperCase().trim());
                    resolvedProvedor = s ? (s.trade_name || s.legal_name) : linkedOp.cod_provedor;
                }
                if (!resolvedProvedor && linkedOp.observaciones) {
                    const titMatch = String(linkedOp.observaciones).match(/(?:TITULAR|FAVORECIDO|PROVEDOR):?\s*([^\n\r|]+)/i);
                    if (titMatch) resolvedProvedor = titMatch[1].trim();
                }
                if (!resolvedProvedor && linkedOp.descricao) {
                    resolvedProvedor = linkedOp.descricao;
                }
            }
            if (!resolvedProvedor && item.Obs) {
                resolvedProvedor = item.Obs.split('|')[0].trim();
            }
            if (!resolvedProvedor) {
                resolvedProvedor = 'Fornecedor / Geral';
            }

            // 3. Resolve Obra / Centro de Custo
            const resolvedObra = (item.Obra || item.centro_custo || linkedOp?.departamento_origem || '-').trim();

            // 4. Resolve Origem (OP, FC, Manual)
            let resolvedOrigem: 'OP' | 'FC' | 'Manual' = 'Manual';
            let resolvedOrigemLabel = 'Lançamento Manual';
            if (docUpper.startsWith('OP-') || item.ordem_pagamento_id || (item.origem || '').toLowerCase().includes('ordem')) {
                resolvedOrigem = 'OP';
                resolvedOrigemLabel = 'Ordem de Pagamento';
            } else if (docUpper.startsWith('FC-') || (item.Provedor || '').toLowerCase().includes('fundo de caixa') || (item.origem || '').toLowerCase().includes('caixa')) {
                resolvedOrigem = 'FC';
                resolvedOrigemLabel = 'Fundo de Caixa';
            }

            // 5. Resolve Effective Status & Overdue Math
            const isPaid = item.Status === 'Pago' || (item.Valor_total > 0 && item.saldo_a_pagar <= 0);
            let dueTime: number | null = null;
            if (item.Dt_venc) {
                const d = new Date(item.Dt_venc);
                if (!isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0);
                    dueTime = d.getTime();
                }
            }

            const isOverdue = !isPaid && dueTime !== null && dueTime < todayTime;
            const isDueToday = !isPaid && dueTime !== null && dueTime === todayTime;
            const isDueSoon7d = !isPaid && dueTime !== null && dueTime >= todayTime && dueTime <= next7dTime;

            const delayDays = isOverdue && dueTime !== null
                ? Math.max(1, Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24)))
                : 0;

            const daysUntilDue = !isPaid && !isOverdue && dueTime !== null
                ? Math.max(0, Math.floor((dueTime - todayTime) / (1000 * 60 * 60 * 24)))
                : null;

            let effectiveStatus: 'Pago' | 'Vencido' | 'Parcial' | 'A vencer' = 'A vencer';
            if (isPaid) {
                effectiveStatus = 'Pago';
            } else if (item.Status === 'Parcial' || (item.saldo_a_pagar > 0 && item.saldo_a_pagar < item.Valor_total)) {
                effectiveStatus = isOverdue ? 'Vencido' : 'Parcial';
            } else if (isOverdue || item.Status === 'Vencido') {
                effectiveStatus = 'Vencido';
            } else {
                effectiveStatus = 'A vencer';
            }

            // 6. Resolve Anexo, Descrição & IBAN
            const resolvedAnexoUrl = item.anexo_url || linkedOp?.comprovante_geral || linkedOp?.anexos || null;
            const resolvedDescricao = item.Obs || linkedOp?.descricao || item.cat_despesa || '';

            const textForIban = `${item.Obs || ''} ${item.comentarios || ''} ${linkedOp?.observaciones || ''}`;
            const ibanMatch = textForIban.match(/(?:IBAN:?\s*)?([A-Z]{2}[0-9]{2}(?:[\s\-]?[0-9]{4}){4,6}(?:[\s\-]?[0-9]{1,4})?)/i);
            const ibanInfo = ibanMatch ? ibanMatch[1].replace(/[\t\r\n]+/g, ' ').trim() : null;

            const notesList = parseTimelineNotes(item.comentarios, item.Obs, item.Creado, item.Creado_por);

            return {
                ...item,
                ordem_pagamento_id: item.ordem_pagamento_id || linkedOp?.id || null,
                resolvedEmpresa,
                resolvedProvedor,
                resolvedObra,
                resolvedOrigem,
                resolvedOrigemLabel,
                effectiveStatus,
                isOverdue,
                isDueToday,
                isDueSoon7d,
                delayDays,
                daysUntilDue,
                resolvedAnexoUrl,
                resolvedDescricao,
                ibanInfo,
                notesList
            };
        });
    }, [payables, ordens, suppliers, companies]);

    // Keep selectedPagoObs synced when query refreshes
    useEffect(() => {
        if (selectedPagoObs) {
            const updated = enrichedPayables.find(p => p.id === selectedPagoObs.id);
            if (updated) setSelectedPagoObs(updated);
        }
    }, [enrichedPayables]);

    // Unique Options for MultiSelect Filters
    const uniqueEmpresas = useMemo(() => {
        const set = new Set<string>();
        enrichedPayables.forEach(p => { if (p.resolvedEmpresa) set.add(p.resolvedEmpresa); });
        companies.forEach((c: any) => {
            const norm = normalizeEmpresaName(c.nome || c.trade_name);
            if (norm) set.add(norm);
        });
        return Array.from(set).sort();
    }, [enrichedPayables, companies]);

    const uniqueFornecedores = useMemo(() => {
        const set = new Set<string>();
        enrichedPayables.forEach(p => { if (p.resolvedProvedor) set.add(p.resolvedProvedor); });
        suppliers.forEach((s: any) => { if (s.trade_name) set.add(s.trade_name.trim()); });
        return Array.from(set).sort();
    }, [enrichedPayables, suppliers]);

    const uniqueObras = useMemo(() => {
        const set = new Set<string>();
        enrichedPayables.forEach(p => { if (p.resolvedObra && p.resolvedObra !== '-') set.add(p.resolvedObra); });
        obras.forEach((o: any) => { if (o.nome) set.add(o.nome.trim()); });
        return Array.from(set).sort();
    }, [enrichedPayables, obras]);

    // Filter Logic (Base KPI Dataset - before applying activeKpiFilter)
    const kpiData = useMemo(() => {
        return enrichedPayables.filter(item => {
            // 1. Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matches =
                    item.resolvedProvedor.toLowerCase().includes(term) ||
                    item.resolvedEmpresa.toLowerCase().includes(term) ||
                    item.resolvedObra.toLowerCase().includes(term) ||
                    (item.Num_doc || '').toLowerCase().includes(term) ||
                    (item.prev_pag || '').toLowerCase().includes(term) ||
                    item.resolvedDescricao.toLowerCase().includes(term) ||
                    (item.cat_despesa || '').toLowerCase().includes(term);
                if (!matches) return false;
            }

            // 2. Empresa filter
            if (filterEmpresas.length > 0 && !filterEmpresas.includes(item.resolvedEmpresa)) return false;

            // 3. Fornecedor filter
            if (filterFornecedores.length > 0 && !filterFornecedores.includes(item.resolvedProvedor)) return false;

            // 4. Obra / CC filter
            if (filterObras.length > 0 && !filterObras.includes(item.resolvedObra)) return false;

            // 5. Origem filter
            if (filterOrigens.length > 0 && !filterOrigens.includes(item.resolvedOrigem)) return false;

            // 6. Status filter
            if (filterStatuses.length > 0 && !filterStatuses.includes(item.effectiveStatus)) return false;

            // 7. Período de Vencimento
            if (filterPeriodoVencimento !== 'all') {
                const itemDate = item.Dt_venc ? new Date(item.Dt_venc) : null;
                if (!itemDate || isNaN(itemDate.getTime())) return false;
                const d = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                if (filterPeriodoVencimento === 'today') {
                    if (d.getTime() !== today.getTime()) return false;
                } else if (filterPeriodoVencimento === 'next-7') {
                    const end = new Date(today);
                    end.setDate(today.getDate() + 7);
                    if (d < today || d > end) return false;
                } else if (filterPeriodoVencimento === 'this-month') {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    if (d < start || d > end) return false;
                } else if (filterPeriodoVencimento === 'next-30') {
                    const end = new Date(today);
                    end.setDate(today.getDate() + 30);
                    if (d < today || d > end) return false;
                } else if (filterPeriodoVencimento === 'past-30') {
                    const start = new Date(today);
                    start.setDate(today.getDate() - 30);
                    if (d < start || d > today) return false;
                } else if (filterPeriodoVencimento === 'custom') {
                    if (startDateVencimento && d < new Date(startDateVencimento + 'T00:00:00')) return false;
                    if (endDateVencimento && d > new Date(endDateVencimento + 'T23:59:59')) return false;
                }
            }

            // 8. Período de Emissão / Geração
            if (filterPeriodoEmissao !== 'all') {
                const itemDate = item.Data_emissao ? new Date(item.Data_emissao) : (item.Creado ? new Date(item.Creado) : null);
                if (!itemDate || isNaN(itemDate.getTime())) return false;
                const now = new Date();
                if (filterPeriodoEmissao === 'this-month') {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    if (itemDate < start || itemDate > end) return false;
                } else if (filterPeriodoEmissao === 'past-30') {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    start.setHours(0, 0, 0, 0);
                    if (itemDate < start || itemDate > end) return false;
                } else if (filterPeriodoEmissao === 'custom') {
                    if (startDateEmissao && itemDate < new Date(startDateEmissao + 'T00:00:00')) return false;
                    if (endDateEmissao && itemDate > new Date(endDateEmissao + 'T23:59:59')) return false;
                }
            }

            // 9. Período de Pagamento / Liquidação
            if (filterPeriodoPagamento !== 'all') {
                const itemDate = item.dt_pagamento ? new Date(item.dt_pagamento) : null;
                if (!itemDate || isNaN(itemDate.getTime())) return false;
                const now = new Date();
                if (filterPeriodoPagamento === 'this-month') {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    if (itemDate < start || itemDate > end) return false;
                } else if (filterPeriodoPagamento === 'past-30') {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    start.setHours(0, 0, 0, 0);
                    if (itemDate < start || itemDate > end) return false;
                } else if (filterPeriodoPagamento === 'custom') {
                    if (startDatePagamento && itemDate < new Date(startDatePagamento + 'T00:00:00')) return false;
                    if (endDatePagamento && itemDate > new Date(endDatePagamento + 'T23:59:59')) return false;
                }
            }

            return true;
        });
    }, [
        enrichedPayables,
        searchTerm,
        filterEmpresas,
        filterFornecedores,
        filterObras,
        filterOrigens,
        filterStatuses,
        filterPeriodoVencimento,
        startDateVencimento,
        endDateVencimento,
        filterPeriodoEmissao,
        startDateEmissao,
        endDateEmissao,
        filterPeriodoPagamento,
        startDatePagamento,
        endDatePagamento
    ]);

    const countUniqueSuppliers = (list: EnrichedContaPagar[]) => {
        return new Set(list.map(i => i.resolvedProvedor).filter(Boolean)).size;
    };

    // Strategic KPIs Calculation
    const kpis = useMemo(() => {
        const allItems = kpiData;
        const opItems = kpiData.filter(i => i.resolvedOrigem === 'OP');
        const pagoItems = kpiData.filter(i => i.effectiveStatus === 'Pago');
        const vencidoItems = kpiData.filter(i => i.effectiveStatus !== 'Pago' && i.isOverdue);
        const aVencerItems = kpiData.filter(i => i.effectiveStatus !== 'Pago' && !i.isOverdue);
        const urgenteItems = kpiData.filter(i => i.effectiveStatus !== 'Pago' && (i.isDueToday || i.isDueSoon7d));
        const hojeItems = kpiData.filter(i => i.effectiveStatus !== 'Pago' && i.isDueToday);

        const totalVal = allItems.reduce((acc, i) => acc + (Number(i.Valor_total) || 0), 0);
        const pendenteTotalVal = allItems.filter(i => i.effectiveStatus !== 'Pago').reduce((acc, i) => acc + (Number(i.saldo_a_pagar) || 0), 0);

        const opVal = opItems.reduce((acc, i) => acc + (Number(i.Valor_total) || 0), 0);
        const opPendenteCount = opItems.filter(i => i.effectiveStatus !== 'Pago').length;

        const pagoVal = pagoItems.reduce((acc, i) => acc + (Number(i.Valor_total) || 0), 0);
        const vencidoVal = vencidoItems.reduce((acc, i) => acc + (Number(i.saldo_a_pagar) || 0), 0);
        const aVencerVal = aVencerItems.reduce((acc, i) => acc + (Number(i.saldo_a_pagar) || 0), 0);
        const urgenteVal = urgenteItems.reduce((acc, i) => acc + (Number(i.saldo_a_pagar) || 0), 0);
        const hojeVal = hojeItems.reduce((acc, i) => acc + (Number(i.saldo_a_pagar) || 0), 0);

        return {
            totalVal,
            pendenteTotalVal,
            totalCount: allItems.length,
            totalSuppliers: countUniqueSuppliers(allItems),

            opVal,
            opCount: opItems.length,
            opPendenteCount,
            opSuppliers: countUniqueSuppliers(opItems),

            pagoVal,
            pagoCount: pagoItems.length,
            pagoSuppliers: countUniqueSuppliers(pagoItems),

            vencidoVal,
            vencidoCount: vencidoItems.length,
            vencidoSuppliers: countUniqueSuppliers(vencidoItems),

            aVencerVal,
            aVencerCount: aVencerItems.length,
            aVencerSuppliers: countUniqueSuppliers(aVencerItems),

            urgenteVal,
            urgenteCount: urgenteItems.length,
            urgenteSuppliers: countUniqueSuppliers(urgenteItems),
            hojeVal,
            hojeCount: hojeItems.length
        };
    }, [kpiData]);

    const taxaLiquidacao = kpis.totalVal > 0 ? (kpis.pagoVal / kpis.totalVal) * 100 : 0;
    const taxaAtraso = kpis.totalVal > 0 ? (kpis.vencidoVal / kpis.totalVal) * 100 : 0;
    const taxaAVencer = kpis.totalVal > 0 ? (kpis.aVencerVal / kpis.totalVal) * 100 : 0;

    const topCredorPendente = useMemo(() => {
        const map: Record<string, number> = {};
        kpiData.filter(i => i.effectiveStatus !== 'Pago').forEach(i => {
            map[i.resolvedProvedor] = (map[i.resolvedProvedor] || 0) + (Number(i.saldo_a_pagar) || 0);
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], total: sorted[0][1] } : null;
    }, [kpiData]);

    const topObraCusto = useMemo(() => {
        const map: Record<string, number> = {};
        kpiData.forEach(i => {
            if (i.resolvedObra && i.resolvedObra !== '-') {
                map[i.resolvedObra] = (map[i.resolvedObra] || 0) + (Number(i.Valor_total) || 0);
            }
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], total: sorted[0][1] } : null;
    }, [kpiData]);

    // Recent observations for Ticker
    const recentObservations = useMemo(() => {
        const list: Array<{ doc: string; provedor: string; texto: string }> = [];
        kpiData.slice(0, 15).forEach(item => {
            if (item.notesList.length > 0) {
                list.push({
                    doc: item.Num_doc || item.prev_pag || 'Pago',
                    provedor: item.resolvedProvedor,
                    texto: stripHtml(item.notesList[0].descricao).slice(0, 70)
                });
            } else if (item.resolvedDescricao) {
                list.push({
                    doc: item.Num_doc || item.prev_pag || 'Pago',
                    provedor: item.resolvedProvedor,
                    texto: stripHtml(item.resolvedDescricao).slice(0, 70)
                });
            }
        });
        return list.slice(0, 4);
    }, [kpiData]);

    // Apply Active KPI Quick Filter
    const filteredData = useMemo(() => {
        return kpiData.filter(item => {
            if (activeKpiFilter === 'ordem_pago') return item.resolvedOrigem === 'OP';
            if (activeKpiFilter === 'pago') return item.effectiveStatus === 'Pago';
            if (activeKpiFilter === 'vencido') return item.effectiveStatus !== 'Pago' && item.isOverdue;
            if (activeKpiFilter === 'a_vencer') return item.effectiveStatus !== 'Pago' && !item.isOverdue;
            if (activeKpiFilter === 'vencendo_hoje') return item.effectiveStatus !== 'Pago' && (item.isDueToday || item.isDueSoon7d);
            return true;
        });
    }, [kpiData, activeKpiFilter]);

    // Sorting Logic
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            let valA: any;
            let valB: any;

            switch (sortField) {
                case 'Num_doc':
                    valA = a.Num_doc || a.prev_pag || '';
                    valB = b.Num_doc || b.prev_pag || '';
                    break;
                case 'Provedor':
                    valA = a.resolvedProvedor;
                    valB = b.resolvedProvedor;
                    break;
                case 'Empresa':
                    valA = a.resolvedEmpresa;
                    valB = b.resolvedEmpresa;
                    break;
                case 'Obra':
                    valA = a.resolvedObra;
                    valB = b.resolvedObra;
                    break;
                case 'Data_emissao':
                    valA = a.Data_emissao ? new Date(a.Data_emissao).getTime() : NaN;
                    valB = b.Data_emissao ? new Date(b.Data_emissao).getTime() : NaN;
                    if (isNaN(valA) && isNaN(valB)) return 0;
                    if (isNaN(valA)) return 1;
                    if (isNaN(valB)) return -1;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'Dt_venc':
                    valA = a.Dt_venc ? new Date(a.Dt_venc).getTime() : NaN;
                    valB = b.Dt_venc ? new Date(b.Dt_venc).getTime() : NaN;
                    if (isNaN(valA) && isNaN(valB)) return 0;
                    if (isNaN(valA)) return 1;
                    if (isNaN(valB)) return -1;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'Valor_total':
                    valA = Number(a.Valor_total) || 0;
                    valB = Number(b.Valor_total) || 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'saldo_a_pagar':
                    valA = Number(a.saldo_a_pagar) || 0;
                    valB = Number(b.saldo_a_pagar) || 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'Status':
                    valA = a.effectiveStatus;
                    valB = b.effectiveStatus;
                    break;
                default:
                    valA = (a as any)[sortField] || '';
                    valB = (b as any)[sortField] || '';
            }

            if (valA === '' || valA === null || valA === undefined) return 1;
            if (valB === '' || valB === null || valB === undefined) return -1;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDirection === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
        });
    }, [filteredData, sortField, sortDirection]);

    // Grouped by Supplier (Fornecedor) Mode
    const groupedSuppliers = useMemo(() => {
        const map = new Map<string, {
            supplierKey: string;
            supplierName: string;
            codProvedor: string;
            titles: EnrichedContaPagar[];
        }>();

        sortedData.forEach(item => {
            const key = item.resolvedProvedor.toUpperCase().trim() || item.id;
            if (!map.has(key)) {
                map.set(key, {
                    supplierKey: key,
                    supplierName: item.resolvedProvedor,
                    codProvedor: item.CodProvedor || '',
                    titles: []
                });
            }
            map.get(key)!.titles.push(item);
        });

        const groups = Array.from(map.values()).map(g => {
            const empresas = Array.from(new Set(g.titles.map(t => t.resolvedEmpresa).filter(Boolean)));
            const obrasList = Array.from(new Set(g.titles.map(t => t.resolvedObra).filter(o => o && o !== '-')));
            const totalValor = g.titles.reduce((acc, t) => acc + (Number(t.Valor_total) || 0), 0);
            const totalSaldo = g.titles.reduce((acc, t) => acc + (Number(t.saldo_a_pagar) || 0), 0);
            const overdueCount = g.titles.filter(t => t.isOverdue).length;
            const paidCount = g.titles.filter(t => t.effectiveStatus === 'Pago').length;
            const opCount = g.titles.filter(t => t.resolvedOrigem === 'OP').length;

            const validVenc = g.titles
                .map(t => (t.Dt_venc ? new Date(t.Dt_venc) : null))
                .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
                .sort((a, b) => a.getTime() - b.getTime());

            return {
                ...g,
                empresas,
                obrasList,
                totalValor,
                totalSaldo,
                overdueCount,
                paidCount,
                opCount,
                oldestVencimento: validVenc[0] || null,
                latestVencimento: validVenc[validVenc.length - 1] || null
            };
        });

        groups.sort((a, b) => {
            if (sortField === 'Provedor') {
                return sortDirection === 'asc'
                    ? a.supplierName.localeCompare(b.supplierName)
                    : b.supplierName.localeCompare(a.supplierName);
            }
            if (sortField === 'Valor_total') {
                return sortDirection === 'asc' ? a.totalValor - b.totalValor : b.totalValor - a.totalValor;
            }
            if (sortField === 'saldo_a_pagar') {
                return sortDirection === 'asc' ? a.totalSaldo - b.totalSaldo : b.totalSaldo - a.totalSaldo;
            }
            return b.totalSaldo - a.totalSaldo;
        });

        return groups;
    }, [sortedData, sortField, sortDirection]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchTerm,
        viewMode,
        activeKpiFilter,
        filterEmpresas,
        filterFornecedores,
        filterObras,
        filterOrigens,
        filterStatuses,
        filterPeriodoVencimento,
        startDateVencimento,
        endDateVencimento,
        filterPeriodoEmissao,
        startDateEmissao,
        endDateEmissao,
        filterPeriodoPagamento,
        startDatePagamento,
        endDatePagamento,
        itemsPerPage
    ]);

    // Complete Gallery Pagination Math
    const totalItems = viewMode === 'supplier' ? groupedSuppliers.length : sortedData.length;
    const effectivePageSize = itemsPerPage > 0 ? itemsPerPage : Math.max(1, totalItems);
    const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize;
    const endIndex = totalItems === 0 ? 0 : Math.min(startIndex + effectivePageSize, totalItems);

    const paginatedData = useMemo(() => {
        if (itemsPerPage <= 0) return sortedData;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, itemsPerPage, startIndex, endIndex]);

    const paginatedSupplierGroups = useMemo(() => {
        if (itemsPerPage <= 0) return groupedSuppliers;
        return groupedSuppliers.slice(startIndex, endIndex);
    }, [groupedSuppliers, itemsPerPage, startIndex, endIndex]);

    const getVisiblePageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        if (safeCurrentPage > 3) pages.push('ellipsis');
        const start = Math.max(2, safeCurrentPage - 1);
        const end = Math.min(totalPages - 1, safeCurrentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (safeCurrentPage < totalPages - 2) pages.push('ellipsis');
        pages.push(totalPages);
        return pages;
    };

    const toggleSupplierExpand = (key: string) => {
        setExpandedSuppliers(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Selections
    const toggleSelection = (id: string) => {
        setSelectedItems(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
    };

    const toggleAll = () => {
        if (paginatedData.length === 0) return;
        const pageIds = paginatedData.map(i => i.id);
        const allSelected = pageIds.every(id => selectedItems.includes(id));
        if (allSelected) {
            setSelectedItems(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedItems(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    // Active Filters Count
    const activeFiltersCount = [
        filterEmpresas.length > 0,
        filterFornecedores.length > 0,
        filterObras.length > 0,
        filterOrigens.length > 0,
        filterStatuses.length > 0,
        filterPeriodoVencimento !== 'all',
        filterPeriodoEmissao !== 'all',
        filterPeriodoPagamento !== 'all'
    ].filter(Boolean).length;

    const getPeriodoLabel = (val: string) => {
        switch (val) {
            case 'today': return 'Hoje';
            case 'next-7': return 'Próximos 7 Dias';
            case 'this-month': return 'Este Mês';
            case 'past-30': return 'Últimos 30 Dias';
            case 'next-30': return 'Próximos 30 Dias';
            default: return val;
        }
    };

    const clearAllFilters = () => {
        setFilterEmpresas([]);
        setFilterFornecedores([]);
        setFilterObras([]);
        setFilterOrigens([]);
        setFilterStatuses([]);
        setFilterPeriodoVencimento('all');
        setStartDateVencimento('');
        setEndDateVencimento('');
        setFilterPeriodoEmissao('all');
        setStartDateEmissao('');
        setEndDateEmissao('');
        setFilterPeriodoPagamento('all');
        setStartDatePagamento('');
        setEndDatePagamento('');
        setSearchTerm('');
        setActiveKpiFilter('all');
    };

    // Export to Excel (.xlsx)
    const handleExportExcel = () => {
        try {
            const rows = sortedData.map(item => ({
                'Doc / Registro': item.Num_doc || 'Manual',
                'Código Pago': item.prev_pag || '-',
                'Origem': item.resolvedOrigemLabel,
                'Fornecedor / Favorecido': item.resolvedProvedor,
                'Empresa': item.resolvedEmpresa,
                'Obra / Centro de Custo': item.resolvedObra,
                'Categoria': item.cat_despesa || '-',
                'Emissão': item.Data_emissao ? formatDate(item.Data_emissao) : '-',
                'Vencimento': item.Dt_venc ? formatDate(item.Dt_venc) : '-',
                'Dias em Atraso': item.delayDays || 0,
                'Valor Total (€)': Number(item.Valor_total || 0),
                'Saldo a Pagar (€)': Number(item.saldo_a_pagar || 0),
                'Status': item.effectiveStatus,
                'Data Pagamento': item.dt_pagamento ? formatDate(item.dt_pagamento) : '-',
                'Forma Pagamento': item.obs_pagamento || item.form_pag || '-',
                'Observações': item.resolvedDescricao || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar');
            XLSX.writeFile(wb, `Pagos_Contas_a_Pagar_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Relatório Excel exportado (${rows.length} registros)!`);
        } catch (err: any) {
            toast.error('Erro ao exportar Excel: ' + err.message);
        }
    };

    // Open Create / Edit Modal
    const openNewModal = () => {
        setEditingItem(null);
        setEmpresaId('');
        setFornecedorId('');
        setFornecedorCustom('');
        setObraId('');
        setObraCustom('');
        setValorTotal('');
        setDataEmissao(new Date().toISOString().split('T')[0]);
        setDtVenc('');
        setNumDoc('');
        setCatDespesa('');
        setObsLancamento('');
        setAnexoUrl('');
        setIsCreateOpen(true);
    };

    const openEditModal = (item: EnrichedContaPagar) => {
        setEditingItem(item);
        const matchedComp = companies.find((c: any) =>
            normalizeEmpresaName(c.nome) === item.resolvedEmpresa || c.nome === item.Empresa
        );
        const matchedSupp = suppliers.find((s: any) =>
            s.codigo === item.CodProvedor || s.trade_name === item.resolvedProvedor
        );
        const matchedObra = obras.find((o: any) =>
            o.id === item.obra_id || o.nome === item.resolvedObra
        );

        setEmpresaId(matchedComp?.id || '');
        setFornecedorId(matchedSupp?.id || '');
        setFornecedorCustom(matchedSupp ? '' : item.resolvedProvedor);
        setObraId(matchedObra?.id || '');
        setObraCustom(matchedObra ? '' : (item.resolvedObra !== '-' ? item.resolvedObra : ''));
        setValorTotal(String(item.Valor_total || ''));
        setDataEmissao(item.Data_emissao ? new Date(item.Data_emissao).toISOString().split('T')[0] : '');
        setDtVenc(item.Dt_venc ? new Date(item.Dt_venc).toISOString().split('T')[0] : '');
        setNumDoc(item.Num_doc || '');
        setCatDespesa(item.cat_despesa || '');
        setObsLancamento(item.Obs || '');
        setAnexoUrl(item.anexo_url || '');
        setIsCreateOpen(true);
    };

    const openObsModal = (item: EnrichedContaPagar) => {
        setSelectedPagoObs(item);
        setNovaObs('');
        setIsObsOpen(true);
    };

    // Save Observation Note in Timeline
    const handleAddObservation = async () => {
        if (!selectedPagoObs) return;
        const hasContent = novaObs.includes('<img') || stripHtml(novaObs).length > 0;
        if (!hasContent) return;

        setIsSavingObs(true);
        try {
            const newNote: PagoTimelineNote = {
                id: `obs-${Date.now()}`,
                data: new Date().toISOString(),
                usuario: user?.email || 'Sistema',
                tipo: 'Anotação Financeira',
                descricao: novaObs
            };
            const updatedNotes = [newNote, ...selectedPagoObs.notesList];
            const res = await updateContaPagar(selectedPagoObs.id, {
                comentarios: JSON.stringify(updatedNotes),
                Obs: selectedPagoObs.Obs || stripHtml(novaObs).slice(0, 180)
            });

            if (!res.success) throw res.error;
            setNovaObs('');
            toast.success('Observação registrada no histórico do pago!');
            queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
        } catch (err: any) {
            toast.error('Erro ao salvar observação: ' + (err?.message || String(err)));
        } finally {
            setIsSavingObs(false);
        }
    };

    // Mutations
    const savePayableMutation = useMutation({
        mutationFn: async () => {
            const selectedComp = companies?.find((c: any) => c.id === empresaId);
            const selectedSupp = suppliers?.find((s: any) => s.id === fornecedorId);
            const selectedObra = obras?.find((o: any) => o.id === obraId);

            const payload: Partial<ContasPagar> = {
                Empresa: selectedComp?.nome || editingItem?.Empresa || 'GERAL',
                CodProvedor: selectedSupp?.codigo || editingItem?.CodProvedor || '',
                Provedor: selectedSupp?.trade_name || fornecedorCustom || editingItem?.Provedor || '',
                Obra: selectedObra?.nome || obraCustom || editingItem?.Obra || '',
                centro_custo: selectedObra?.nome || obraCustom || editingItem?.centro_custo || '',
                Num_doc: numDoc,
                cat_despesa: catDespesa,
                Obs: obsLancamento,
                Data_emissao: dataEmissao ? new Date(dataEmissao) : null,
                Dt_venc: dtVenc ? new Date(dtVenc) : null,
                Valor_total: Number(valorTotal) || 0,
                obra_id: obraId || null,
                anexo_url: anexoUrl || null
            };

            if (editingItem) {
                return updateContaPagar(editingItem.id, payload);
            } else {
                payload.saldo_a_pagar = Number(valorTotal) || 0;
                payload.Status = 'A vencer';
                payload.Creado_por = user?.email || 'sistema';
                return createContaPagar(payload);
            }
        },
        onSuccess: (res) => {
            if (res.success) {
                toast.success(editingItem ? 'Título atualizado com sucesso!' : 'Conta a pagar registrada com sucesso!');
                setIsCreateOpen(false);
                setEditingItem(null);
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error('Falha ao salvar título a pagar.');
            }
        }
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            if (!payingItem) return;
            const payload = {
                conta_pagar_id: payingItem.id,
                valor: Number(payValor) || 0,
                data_pagamento: payDate || new Date().toISOString().split('T')[0],
                forma_pagamento: payForm,
                tipo_pagamento: Number(payValor) >= payingItem.saldo_a_pagar ? 'Total' : 'Parcial',
                banco_id: payBank || null,
                criado_por: user?.email || 'sistema'
            };
            return savePagamento(payload);
        },
        onSuccess: (res) => {
            if (res?.success) {
                toast.success('Pagamento liquidado com sucesso!');
                setIsPayOpen(false);
                setPayingItem(null);
                setPayValor('');
                setPayBank('');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error('Erro ao registrar pagamento.');
            }
        }
    });

    const batchPayMutation = useMutation({
        mutationFn: async () => {
            if (selectedItems.length === 0) return;
            return savePagamentoLote(
                selectedItems,
                batchBank,
                batchDate || new Date().toISOString().split('T')[0],
                batchForm,
                user?.email || 'sistema'
            );
        },
        onSuccess: (res) => {
            if (res?.success) {
                toast.success(`Liquidação em lote efetuada para ${selectedItems.length} títulos!`);
                setIsBatchPayOpen(false);
                setSelectedItems([]);
                setBatchBank('');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error('Erro ao efetuar o pagamento em lote.');
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => deleteContaPagar(id),
        onSuccess: (res) => {
            if (res.success) {
                toast.success('Título a pagar excluído!');
                queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
            } else {
                toast.error('Erro ao excluir título.');
            }
        }
    });

    const renderSortHeader = (label: string, field: string, textAlignment: string = 'text-left') => {
        const isCurrent = sortField === field;
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    handleSort(field);
                }}
                className={`flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none ${
                    textAlignment === 'text-right' ? 'justify-end' : textAlignment === 'text-center' ? 'justify-center' : ''
                }`}
            >
                <span>{label}</span>
                {isCurrent ? (
                    sortDirection === 'asc' ? (
                        <ArrowUp size={12} className="text-primary shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                    ) : (
                        <ArrowDown size={12} className="text-primary shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                    )
                ) : (
                    <ArrowUpDown size={12} className="text-muted-foreground/40 hover:text-muted-foreground/80 shrink-0 transition-colors" />
                )}
            </div>
        );
    };

    const renderStatusBadge = (item: EnrichedContaPagar) => {
        if (item.effectiveStatus === 'Pago') {
            return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Pago</Badge>;
        }
        if (item.effectiveStatus === 'Vencido') {
            return <Badge variant="destructive" className="font-bold">Vencido</Badge>;
        }
        if (item.effectiveStatus === 'Parcial') {
            return <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold">Parcial</Badge>;
        }
        if (item.isDueToday) {
            return <Badge variant="outline" className="border-amber-500 bg-amber-500 text-white font-bold animate-pulse">Vence Hoje</Badge>;
        }
        return (
            <Badge variant="secondary" className="bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold">
                A Vencer
            </Badge>
        );
    };

    const renderTickerSet = (keyPrefix: string) => (
        <div className="flex items-center gap-6 px-4 shrink-0" key={keyPrefix}>
            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('vencido')}
                title="Filtrar Vencidos"
            >
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px] uppercase">Vencidos</span>
                <span className="font-mono font-bold text-rose-300">{formatCurrency(kpis.vencidoVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.vencidoCount} docs • {taxaAtraso.toFixed(1)}%)</span>
            </div>

            <div className="h-3 w-px bg-slate-800 shrink-0" />

            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('vencendo_hoje')}
                title="Filtrar Vencendo Hoje e Próximos 7 Dias"
            >
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">Alerta 7 Dias / Hoje</span>
                <span className="font-mono font-bold text-amber-300">{formatCurrency(kpis.urgenteVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.urgenteCount} docs • Hoje: {formatCurrency(kpis.hojeVal)})</span>
            </div>

            <div className="h-3 w-px bg-slate-800 shrink-0" />

            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('a_vencer')}
                title="Filtrar Pagos A Vencer"
            >
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px] uppercase">A Vencer</span>
                <span className="font-mono font-bold text-blue-300">{formatCurrency(kpis.aVencerVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.aVencerCount} docs • {taxaAVencer.toFixed(1)}%)</span>
            </div>

            <div className="h-3 w-px bg-slate-800 shrink-0" />

            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('ordem_pago')}
                title="Filtrar Ordens de Pagamento (OP)"
            >
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase">Ordens de Pago (OP)</span>
                <span className="font-mono font-bold text-indigo-300">{formatCurrency(kpis.opVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.opCount} docs • {kpis.opPendenteCount} pend.)</span>
            </div>

            <div className="h-3 w-px bg-slate-800 shrink-0" />

            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('pago')}
                title="Filtrar Liquidados"
            >
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">Liquidados</span>
                <span className="font-mono font-bold text-emerald-300">{formatCurrency(kpis.pagoVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.pagoCount} docs • {taxaLiquidacao.toFixed(1)}%)</span>
            </div>

            {topCredorPendente && (
                <>
                    <div className="h-3 w-px bg-slate-800 shrink-0" />
                    <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-200 font-bold text-[10px] uppercase">Maior Credor Pendente</span>
                        <span className="font-semibold text-slate-200 max-w-[160px] truncate" title={topCredorPendente.name}>
                            {topCredorPendente.name}
                        </span>
                        <span className="font-mono font-bold text-rose-300">{formatCurrency(topCredorPendente.total)}</span>
                    </div>
                </>
            )}

            {topObraCusto && (
                <>
                    <div className="h-3 w-px bg-slate-800 shrink-0" />
                    <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] uppercase">Top Centro Custo</span>
                        <span className="font-semibold text-slate-200 max-w-[160px] truncate" title={topObraCusto.name}>
                            {topObraCusto.name}
                        </span>
                        <span className="font-mono font-bold text-sky-300">{formatCurrency(topObraCusto.total)}</span>
                    </div>
                </>
            )}

            {recentObservations.map((obs, idx) => (
                <React.Fragment key={`${keyPrefix}-obs-${idx}`}>
                    <div className="h-3 w-px bg-slate-800 shrink-0" />
                    <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase">
                            Obs • {obs.doc}
                        </span>
                        <span className="text-slate-300 font-medium max-w-[220px] truncate" title={`${obs.provedor}: ${obs.texto}`}>
                            {obs.provedor}: &ldquo;{obs.texto}&rdquo;
                        </span>
                    </div>
                </React.Fragment>
            ))}

            <div className="h-3 w-px bg-slate-800 shrink-0" />

            <div
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveKpiFilter('all')}
                title="Carteira Total de Pagos"
            >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase">Carteira Total</span>
                <span className="font-mono font-bold text-slate-100">{formatCurrency(kpis.totalVal)}</span>
                <span className="text-[11px] text-slate-400">({kpis.totalCount} docs)</span>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-2 md:p-6 pt-0 md:pt-0 space-y-4 w-full">
            <div className="flex-none space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                            <Wallet className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                            <span>Contas a Pagar (Pagos)</span>
                        </h2>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Controle ordens de pagamento aprovadas, vencimentos por fornecedor, liquidações bancárias e histórico de observações.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {selectedItems.length > 0 && (
                            <Button
                                onClick={() => setIsBatchPayOpen(true)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                            >
                                <CheckCircle2 size={16} />
                                <span>Liquidar em Lote ({selectedItems.length})</span>
                            </Button>
                        )}
                        <Button onClick={openNewModal} className="flex items-center gap-2 shadow-sm font-semibold">
                            <Plus size={18} /> Novo Lançamento
                        </Button>
                    </div>
                </div>

                {/* Wall Street / Home Broker Live Financial Ticker Tape for Pagos */}
                <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-md">
                    <div className="flex items-center">
                        <div className="flex items-center gap-2 bg-slate-950/95 border-r border-slate-800 px-3.5 py-2.5 z-20 shrink-0 font-bold text-[11px] uppercase tracking-wider text-slate-200 shadow-md">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                            </span>
                            <span className="font-mono font-semibold text-blue-400 tracking-wide flex items-center gap-1.5">
                                <Activity size={13} /> RADAR DE PAGOS
                            </span>
                        </div>

                        <div className="overflow-hidden flex-1 relative mask-linear-gradient">
                            <div className="animate-ticker py-2 text-xs whitespace-nowrap select-none flex">
                                {renderTickerSet('set-1')}
                                {renderTickerSet('set-2')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Interactive KPIs Row (6 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                    {/* 1. Total Geral / Carteira */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'all'
                                ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700 ring-2 ring-brand-primary/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        onClick={() => setActiveKpiFilter('all')}
                    >
                        <div className={`h-1.5 w-full ${activeKpiFilter === 'all' ? 'bg-brand-primary' : 'bg-slate-400'}`} />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeKpiFilter === 'all' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Carteira Total
                                </span>
                                <div className={`p-1.5 rounded-lg ${activeKpiFilter === 'all' ? 'bg-slate-800 text-brand-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                    <TrendingUp size={15} />
                                </div>
                            </div>
                            <div>
                                <div className={`text-xl lg:text-2xl font-extrabold tracking-tight font-mono ${activeKpiFilter === 'all' ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {formatCurrency(kpis.totalVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className={activeKpiFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}>
                                        {kpis.totalCount} {kpis.totalCount === 1 ? 'título' : 'títulos'}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${activeKpiFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                        {kpis.totalSuppliers} fornec.
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Ordens de Pago (OP) */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'ordem_pago'
                                ? 'bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                        }`}
                        onClick={() => setActiveKpiFilter(activeKpiFilter === 'ordem_pago' ? 'all' : 'ordem_pago')}
                    >
                        <div className="h-1.5 w-full bg-indigo-500" />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Ordens de Pago (OP)
                                </span>
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                    <FileText size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(kpis.opVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {kpis.opCount} OPs ({kpis.opSuppliers} forn.)
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                        {kpis.opPendenteCount} em aberto
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Pagos A Vencer */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'a_vencer'
                                ? 'bg-blue-950/40 border-blue-500/50 ring-2 ring-blue-500/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                        }`}
                        onClick={() => setActiveKpiFilter(activeKpiFilter === 'a_vencer' ? 'all' : 'a_vencer')}
                    >
                        <div className="h-1.5 w-full bg-blue-500" />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    Pagos A Vencer
                                </span>
                                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                    <Clock size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono text-blue-600 dark:text-blue-400">
                                    {formatCurrency(kpis.aVencerVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {kpis.aVencerCount} tít. ({kpis.aVencerSuppliers} forn.)
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                        {taxaAVencer.toFixed(1)}% previsto
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Vencendo Hoje / 7 Dias */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'vencendo_hoje'
                                ? 'bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                        }`}
                        onClick={() => setActiveKpiFilter(activeKpiFilter === 'vencendo_hoje' ? 'all' : 'vencendo_hoje')}
                    >
                        <div className="h-1.5 w-full bg-amber-500" />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                    Hoje / Próx. 7 Dias
                                </span>
                                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                    <Calendar size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono text-amber-600 dark:text-amber-400">
                                    {formatCurrency(kpis.urgenteVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {kpis.urgenteCount} tít. ({kpis.urgenteSuppliers} forn.)
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        Hoje: {formatCurrency(kpis.hojeVal)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Vencidos (Em Atraso) */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'vencido'
                                ? 'bg-rose-950/40 border-rose-500/50 ring-2 ring-rose-500/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
                        }`}
                        onClick={() => setActiveKpiFilter(activeKpiFilter === 'vencido' ? 'all' : 'vencido')}
                    >
                        <div className="h-1.5 w-full bg-rose-500" />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    Vencidos (Atraso)
                                </span>
                                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                                    <AlertTriangle size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono text-rose-600 dark:text-rose-400">
                                    {formatCurrency(kpis.vencidoVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {kpis.vencidoCount} tít. ({kpis.vencidoSuppliers} forn.)
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                        {taxaAtraso.toFixed(1)}% taxa
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 6. Pago / Liquidado */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            activeKpiFilter === 'pago'
                                ? 'bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/50 shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                        }`}
                        onClick={() => setActiveKpiFilter(activeKpiFilter === 'pago' ? 'all' : 'pago')}
                    >
                        <div className="h-1.5 w-full bg-emerald-500" />
                        <CardContent className="p-3.5 pt-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Pago (Liquidado)
                                </span>
                                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(kpis.pagoVal)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {kpis.pagoCount} tít. ({kpis.pagoSuppliers} forn.)
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        {taxaLiquidacao.toFixed(1)}% do total
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search, View Mode & Advanced Filters Bar (Cobros Standard) */}
                <div className="flex flex-col gap-3 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 w-full lg:max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por fornecedor, empresa, nº doc (OP-0001), obra ou observação..."
                                className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Right Controls: View Mode + Export + Advanced Filter Popover */}
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                            {/* View Mode Toggle: Por Título vs Por Fornecedor */}
                            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('title')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        viewMode === 'title'
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <FileText size={13} />
                                    <span>Por Título</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('supplier')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        viewMode === 'supplier'
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <Layers size={13} />
                                    <span>Por Fornecedor</span>
                                </button>
                            </div>

                            {/* Export Excel Button */}
                            <Button
                                variant="outline"
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300"
                            >
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                <span>Exportar Excel</span>
                            </Button>

                            {/* Filter Popover Button */}
                            <div className="relative">
                                <Button
                                    variant={activeFiltersCount > 0 ? 'default' : 'outline'}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2"
                                >
                                    <Filter size={16} />
                                    <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                                </Button>

                                {showFilters && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-[320px] sm:w-[620px] md:w-[700px] bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl p-5 space-y-4 text-left">
                                        <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Filtrar Contas a Pagar (Pagos)
                                            </h3>
                                            <button
                                                onClick={() => setShowFilters(false)}
                                                className="text-muted-foreground hover:text-slate-850 dark:hover:text-slate-100"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[420px] overflow-y-auto pr-1">
                                            {/* Coluna 1 - Empresa, Fornecedor, Obra, Origem, Status */}
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Empresa Devedora
                                                    </label>
                                                    <MultiSelect
                                                        options={uniqueEmpresas.map(emp => ({ value: emp, label: emp }))}
                                                        selected={tempFilterEmpresas}
                                                        onChange={setTempFilterEmpresas}
                                                        placeholder="Todas as Empresas"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Fornecedor / Credor
                                                    </label>
                                                    <MultiSelect
                                                        options={uniqueFornecedores.map(f => ({ value: f, label: f }))}
                                                        selected={tempFilterFornecedores}
                                                        onChange={setTempFilterFornecedores}
                                                        placeholder="Todos os Fornecedores"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Obra / Centro de Custo
                                                    </label>
                                                    <MultiSelect
                                                        options={uniqueObras.map(o => ({ value: o, label: o }))}
                                                        selected={tempFilterObras}
                                                        onChange={setTempFilterObras}
                                                        placeholder="Todas as Obras / Centros de Custo"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Origem do Lançamento
                                                    </label>
                                                    <MultiSelect
                                                        options={[
                                                            { value: 'OP', label: 'Ordem de Pagamento (OP)' },
                                                            { value: 'FC', label: 'Fundo de Caixa (FC)' },
                                                            { value: 'Manual', label: 'Lançamento Manual' }
                                                        ]}
                                                        selected={tempFilterOrigens}
                                                        onChange={setTempFilterOrigens}
                                                        placeholder="Todas as Origens"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Status do Pago
                                                    </label>
                                                    <MultiSelect
                                                        options={ALL_STATUSES.map(s => ({ value: s, label: s }))}
                                                        selected={tempFilterStatuses}
                                                        onChange={setTempFilterStatuses}
                                                        placeholder="Todos os Status"
                                                    />
                                                </div>
                                            </div>

                                            {/* Coluna 2 - Períodos (Vencimento, Emissão, Pagamento) */}
                                            <div className="space-y-3 sm:border-l sm:pl-4 dark:border-slate-800">
                                                {/* Período de Vencimento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Período de Vencimento
                                                    </label>
                                                    <select
                                                        value={tempFilterPeriodoVencimento}
                                                        onChange={(e) => setTempFilterPeriodoVencimento(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="today">Vencendo Hoje</option>
                                                        <option value="next-7">Próximos 7 Dias</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="next-30">Próximos 30 Dias</option>
                                                        <option value="past-30">Últimos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {tempFilterPeriodoVencimento === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateVencimento}
                                                                onChange={(e) => setTempStartDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateVencimento}
                                                                onChange={(e) => setTempEndDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Emissão / Geração */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Período de Emissão / Geração
                                                    </label>
                                                    <select
                                                        value={tempFilterPeriodoEmissao}
                                                        onChange={(e) => setTempFilterPeriodoEmissao(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="past-30">Últimos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {tempFilterPeriodoEmissao === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateEmissao}
                                                                onChange={(e) => setTempStartDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateEmissao}
                                                                onChange={(e) => setTempEndDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Liquidação / Pagamento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Período de Liquidação (Data Pago)
                                                    </label>
                                                    <select
                                                        value={tempFilterPeriodoPagamento}
                                                        onChange={(e) => setTempFilterPeriodoPagamento(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="past-30">Últimos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {tempFilterPeriodoPagamento === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDatePagamento}
                                                                onChange={(e) => setTempStartDatePagamento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDatePagamento}
                                                                onChange={(e) => setTempEndDatePagamento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t dark:border-slate-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    clearAllFilters();
                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-semibold h-8"
                                            >
                                                Limpar Tudo
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setFilterEmpresas(tempFilterEmpresas);
                                                    setFilterFornecedores(tempFilterFornecedores);
                                                    setFilterObras(tempFilterObras);
                                                    setFilterOrigens(tempFilterOrigens);
                                                    setFilterStatuses(tempFilterStatuses);
                                                    setFilterPeriodoVencimento(tempFilterPeriodoVencimento);
                                                    setStartDateVencimento(tempStartDateVencimento);
                                                    setEndDateVencimento(tempEndDateVencimento);
                                                    setFilterPeriodoEmissao(tempFilterPeriodoEmissao);
                                                    setStartDateEmissao(tempStartDateEmissao);
                                                    setEndDateEmissao(tempEndDateEmissao);
                                                    setFilterPeriodoPagamento(tempFilterPeriodoPagamento);
                                                    setStartDatePagamento(tempStartDatePagamento);
                                                    setEndDatePagamento(tempEndDatePagamento);
                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-bold h-8 text-white bg-primary hover:bg-primary/95"
                                            >
                                                Aplicar Filtros
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(activeFiltersCount > 0 || activeKpiFilter !== 'all' || searchTerm !== '') && (
                                <Button
                                    variant="ghost"
                                    onClick={clearAllFilters}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Badges Row */}
                    {(activeKpiFilter !== 'all' || activeFiltersCount > 0) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtros ativos:</span>

                            {activeKpiFilter !== 'all' && (
                                <Badge variant="secondary" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                                    <span>
                                        Visão: {
                                            activeKpiFilter === 'ordem_pago' ? 'Ordens de Pago (OP)' :
                                            activeKpiFilter === 'a_vencer' ? 'Pagos A Vencer' :
                                            activeKpiFilter === 'vencendo_hoje' ? 'Vencendo Hoje / 7d' :
                                            activeKpiFilter === 'vencido' ? 'Vencidos' : 'Liquidados'
                                        }
                                    </span>
                                    <button onClick={() => setActiveKpiFilter('all')} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterEmpresas.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>Empresa: {filterEmpresas.join(', ')}</span>
                                    <button onClick={() => setFilterEmpresas([])} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterFornecedores.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>Fornecedor: {filterFornecedores.join(', ')}</span>
                                    <button onClick={() => setFilterFornecedores([])} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterObras.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>Obra/CC: {filterObras.join(', ')}</span>
                                    <button onClick={() => setFilterObras([])} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterOrigens.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>Origem: {filterOrigens.join(', ')}</span>
                                    <button onClick={() => setFilterOrigens([])} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterStatuses.length > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>Status: {filterStatuses.join(', ')}</span>
                                    <button onClick={() => setFilterStatuses([])} className="p-0.5 rounded-full hover:bg-black/10">
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterPeriodoVencimento !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>
                                        Vencimento: {filterPeriodoVencimento === 'custom' ? `${formatDate(startDateVencimento)} a ${formatDate(endDateVencimento)}` : getPeriodoLabel(filterPeriodoVencimento)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setFilterPeriodoVencimento('all');
                                            setStartDateVencimento('');
                                            setEndDateVencimento('');
                                        }}
                                        className="p-0.5 rounded-full hover:bg-black/10"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterPeriodoEmissao !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>
                                        Emissão: {filterPeriodoEmissao === 'custom' ? `${formatDate(startDateEmissao)} a ${formatDate(endDateEmissao)}` : getPeriodoLabel(filterPeriodoEmissao)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setFilterPeriodoEmissao('all');
                                            setStartDateEmissao('');
                                            setEndDateEmissao('');
                                        }}
                                        className="p-0.5 rounded-full hover:bg-black/10"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {filterPeriodoPagamento !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1">
                                    <span>
                                        Liquidação: {filterPeriodoPagamento === 'custom' ? `${formatDate(startDatePagamento)} a ${formatDate(endDatePagamento)}` : getPeriodoLabel(filterPeriodoPagamento)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setFilterPeriodoPagamento('all');
                                            setStartDatePagamento('');
                                            setEndDatePagamento('');
                                        }}
                                        className="p-0.5 rounded-full hover:bg-black/10"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Paginated Data Gallery / Table Card */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border shadow-sm">
                <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-370px)] flex-1">
                    {viewMode === 'title' ? (
                        <Table>
                            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="px-4 w-12">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                            checked={paginatedData.length > 0 && paginatedData.every(i => selectedItems.includes(i.id))}
                                            onChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>{renderSortHeader('Doc / Registro', 'Num_doc')}</TableHead>
                                    <TableHead>{renderSortHeader('Fornecedor / Favorecido', 'Provedor')}</TableHead>
                                    <TableHead>{renderSortHeader('Empresa', 'Empresa')}</TableHead>
                                    <TableHead>{renderSortHeader('Obra / Centro Custo', 'Obra')}</TableHead>
                                    <TableHead>{renderSortHeader('Vencimento', 'Dt_venc')}</TableHead>
                                    <TableHead className="text-right">{renderSortHeader('Total', 'Valor_total', 'text-right')}</TableHead>
                                    <TableHead className="text-right">{renderSortHeader('Saldo Restante', 'saldo_a_pagar', 'text-right')}</TableHead>
                                    <TableHead className="text-center">{renderSortHeader('Status', 'Status', 'text-center')}</TableHead>
                                    <TableHead className="text-right px-5">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                            Carregando títulos de contas a pagar...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 py-6">
                                                <ClipboardList size={36} className="opacity-20" />
                                                <p className="font-semibold">Nenhum título a pagar encontrado para os filtros aplicados.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => openObsModal(item)}
                                            className="group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                />
                                            </TableCell>

                                            {/* Col 1: Doc / Registro + Origem Badge */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                                        {item.Num_doc || 'S/N'}
                                                    </span>
                                                    {item.resolvedOrigem === 'OP' && item.ordem_pagamento_id && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/financeiro/titulos/${item.ordem_pagamento_id}`);
                                                            }}
                                                            title="Abrir Ordem de Pagamento vinculada"
                                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                                        >
                                                            <ExternalLink size={12} />
                                                        </button>
                                                    )}
                                                    {item.resolvedAnexoUrl && (
                                                        <a
                                                            href={item.resolvedAnexoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Visualizar comprovante / documento anexo"
                                                            className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 transition-colors"
                                                        >
                                                            <Paperclip size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                                        item.resolvedOrigem === 'OP'
                                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                                            : item.resolvedOrigem === 'FC'
                                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {item.resolvedOrigem}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono uppercase">
                                                        {item.prev_pag || 'Manual'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Col 2: Fornecedor + Observação Preview */}
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 max-w-[260px] truncate" title={item.resolvedProvedor}>
                                                    {item.resolvedProvedor}
                                                </div>
                                                {(item.resolvedDescricao || item.notesList.length > 0) && (
                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 max-w-[260px] truncate mt-0.5" title={stripHtml(item.notesList[0]?.descricao || item.resolvedDescricao)}>
                                                        <MessageSquare size={10} className="text-blue-500 shrink-0" />
                                                        <span className="truncate">{stripHtml(item.notesList[0]?.descricao || item.resolvedDescricao)}</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Col 3: Empresa */}
                                            <TableCell>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                                    {item.resolvedEmpresa}
                                                </span>
                                            </TableCell>

                                            {/* Col 4: Obra / Centro de Custo */}
                                            <TableCell className="text-slate-600 dark:text-slate-400 text-xs font-medium max-w-[200px] truncate" title={item.resolvedObra}>
                                                {item.resolvedObra}
                                            </TableCell>

                                            {/* Col 5: Vencimento + Atraso/Prazo */}
                                            <TableCell>
                                                <div className="font-medium text-xs text-slate-800 dark:text-slate-200">
                                                    {formatDate(item.Dt_venc)}
                                                </div>
                                                {item.effectiveStatus !== 'Pago' && (
                                                    item.isOverdue ? (
                                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider block">
                                                            {item.delayDays} {item.delayDays === 1 ? 'dia vencido' : 'dias vencidos'}
                                                        </span>
                                                    ) : item.isDueToday ? (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                                                            Vence hoje!
                                                        </span>
                                                    ) : item.daysUntilDue !== null && item.daysUntilDue <= 7 ? (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                                                            Vence em {item.daysUntilDue}d
                                                        </span>
                                                    ) : null
                                                )}
                                                {item.effectiveStatus === 'Pago' && item.dt_pagamento && (
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                                                        Pago: {formatDate(item.dt_pagamento)}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Col 6: Valor Total */}
                                            <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(item.Valor_total)}
                                            </TableCell>

                                            {/* Col 7: Saldo Restante + Tooltip de Pagamentos */}
                                            <TableCell className="text-right font-mono font-bold text-blue-600 dark:text-blue-400" onClick={(e) => e.stopPropagation()}>
                                                {item.pagamentos_reais && item.pagamentos_reais.length > 0 ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger className="cursor-help border-b border-dashed border-blue-500/50">
                                                                {formatCurrency(item.saldo_a_pagar)}
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-white dark:bg-slate-900 border shadow-xl p-3 text-slate-800 dark:text-slate-100 text-xs max-w-[260px]">
                                                                <p className="font-bold mb-1.5 text-blue-600 border-b pb-1">Histórico de Liquidações:</p>
                                                                <div className="space-y-1">
                                                                    {item.pagamentos_reais.map((p, idx) => (
                                                                        <div key={idx} className="flex justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-1">
                                                                            <span className="text-slate-500">{formatDate(p.data_pagamento)}</span>
                                                                            <span className="font-mono font-bold text-emerald-600">{formatCurrency(p.valor)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    formatCurrency(item.saldo_a_pagar)
                                                )}
                                            </TableCell>

                                            {/* Col 8: Status */}
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                {renderStatusBadge(item)}
                                            </TableCell>

                                            {/* Col 9: Ações */}
                                            <TableCell className="text-right px-5" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {item.effectiveStatus !== 'Pago' && (
                                                        <Button
                                                            onClick={() => {
                                                                setPayingItem(item);
                                                                setPayValor(item.saldo_a_pagar.toString());
                                                                setPayDate(new Date().toISOString().split('T')[0]);
                                                                setIsPayOpen(true);
                                                            }}
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-[11px] font-bold rounded-lg"
                                                        >
                                                            Pagar
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Observações e Linha do Tempo"
                                                        onClick={() => openObsModal(item)}
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 relative"
                                                    >
                                                        <Clock size={15} />
                                                        {item.notesList.length > 0 && (
                                                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Editar título"
                                                        onClick={() => openEditModal(item)}
                                                        className="h-8 w-8 text-slate-500 hover:text-primary"
                                                    >
                                                        <Edit2 size={15} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Excluir título"
                                                        onClick={() => {
                                                            if (confirm('Deseja realmente excluir este título a pagar?')) {
                                                                deleteMutation.mutate(item.id);
                                                            }
                                                        }}
                                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        /* Grouped By Supplier View */
                        <Table>
                            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead>{renderSortHeader('Fornecedor / Credor', 'Provedor')}</TableHead>
                                    <TableHead>Empresas</TableHead>
                                    <TableHead>Obras / Centros de Custo</TableHead>
                                    <TableHead>Vencimentos</TableHead>
                                    <TableHead className="text-right">{renderSortHeader('Total Carteira', 'Valor_total', 'text-right')}</TableHead>
                                    <TableHead className="text-right">{renderSortHeader('Saldo Pendente', 'saldo_a_pagar', 'text-right')}</TableHead>
                                    <TableHead className="text-center">Resumo Status</TableHead>
                                    <TableHead className="text-right px-5">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            Agrupando fornecedores...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedSupplierGroups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            Nenhum fornecedor encontrado para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSupplierGroups.map((group) => {
                                        const isExpanded = expandedSuppliers.has(group.supplierKey);
                                        return (
                                            <React.Fragment key={group.supplierKey}>
                                                <TableRow
                                                    onClick={() => toggleSupplierExpand(group.supplierKey)}
                                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium border-b"
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                                            >
                                                                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                            </button>
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                                                    {group.supplierName}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                                                    <span>{group.titles.length} {group.titles.length === 1 ? 'título' : 'títulos'}</span>
                                                                    {group.opCount > 0 && (
                                                                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">• {group.opCount} OP(s)</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {group.empresas.map(emp => (
                                                                <Badge key={emp} variant="outline" className="text-[10px]">
                                                                    {emp}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate" title={group.obrasList.join(', ')}>
                                                        {group.obrasList.join(', ') || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {group.oldestVencimento ? formatDate(group.oldestVencimento) : '-'}
                                                        {group.latestVencimento && group.oldestVencimento && group.latestVencimento.getTime() !== group.oldestVencimento.getTime() && (
                                                            <span className="text-muted-foreground block text-[10px]">
                                                                até {formatDate(group.latestVencimento)}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold">
                                                        {formatCurrency(group.totalValor)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(group.totalSaldo)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                                            {group.overdueCount > 0 && (
                                                                <Badge variant="destructive" className="text-[10px]">
                                                                    {group.overdueCount} venc.
                                                                </Badge>
                                                            )}
                                                            {group.paidCount > 0 && (
                                                                <Badge variant="default" className="bg-emerald-600 text-[10px]">
                                                                    {group.paidCount} pago(s)
                                                                </Badge>
                                                            )}
                                                            {group.titles.length - group.overdueCount - group.paidCount > 0 && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    {group.titles.length - group.overdueCount - group.paidCount} a vencer
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right px-5" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleSupplierExpand(group.supplierKey)}
                                                            className="h-7 text-xs font-semibold"
                                                        >
                                                            {isExpanded ? 'Recolher' : `Ver ${group.titles.length} título(s)`}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>

                                                {isExpanded && group.titles.map((item) => (
                                                    <TableRow
                                                        key={item.id}
                                                        onClick={() => openObsModal(item)}
                                                        className="bg-slate-50/90 dark:bg-slate-900/60 hover:bg-blue-50/50 border-l-4 border-l-blue-500 cursor-pointer"
                                                    >
                                                        <TableCell className="pl-10">
                                                            <div className="flex items-center gap-2">
                                                                <CornerDownRight size={13} className="text-blue-500 shrink-0" />
                                                                <div>
                                                                    <div className="font-mono font-bold text-xs">{item.Num_doc || 'Manual'}</div>
                                                                    <div className="text-[10px] text-muted-foreground">{item.prev_pag}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-semibold">{item.resolvedEmpresa}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{item.resolvedObra}</TableCell>
                                                        <TableCell className="text-xs">{formatDate(item.Dt_venc)}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(item.Valor_total)}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-bold text-blue-600">{formatCurrency(item.saldo_a_pagar)}</TableCell>
                                                        <TableCell className="text-center">{renderStatusBadge(item)}</TableCell>
                                                        <TableCell className="text-right px-5" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-1">
                                                                {item.effectiveStatus !== 'Pago' && (
                                                                    <Button
                                                                        onClick={() => {
                                                                            setPayingItem(item);
                                                                            setPayValor(item.saldo_a_pagar.toString());
                                                                            setIsPayOpen(true);
                                                                        }}
                                                                        size="sm"
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[10px] font-bold"
                                                                    >
                                                                        Pagar
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openObsModal(item)}
                                                                    className="h-7 w-7 text-blue-600"
                                                                >
                                                                    <Clock size={14} />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>

                {/* Complete Gallery Pagination Footer */}
                {!isLoading && totalItems > 0 && (
                    <div className="border-t bg-slate-50/80 dark:bg-slate-900/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <div>
                                Mostrando{' '}
                                <span className="font-bold text-slate-900 dark:text-slate-100">{startIndex + 1}</span>
                                {'–'}
                                <span className="font-bold text-slate-900 dark:text-slate-100">{endIndex}</span> de{' '}
                                <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span>{' '}
                                {viewMode === 'supplier'
                                    ? `${totalItems === 1 ? 'fornecedor' : 'fornecedores'} (${sortedData.length} ${sortedData.length === 1 ? 'título' : 'títulos'})`
                                    : `${totalItems === 1 ? 'título' : 'títulos'} (${kpis.totalSuppliers} fornecedores)`}
                            </div>

                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground font-medium">Exibir por página:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={0}>Todos</option>
                                </select>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={safeCurrentPage <= 1}
                                    onClick={() => setCurrentPage(1)}
                                    title="Primeira página"
                                >
                                    <ChevronsLeft size={14} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs font-semibold"
                                    disabled={safeCurrentPage <= 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                >
                                    <ChevronLeft size={14} className="mr-0.5" />
                                    <span>Anterior</span>
                                </Button>

                                <div className="flex items-center gap-1 mx-1">
                                    {getVisiblePageNumbers().map((p, idx) =>
                                        p === 'ellipsis' ? (
                                            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setCurrentPage(p)}
                                                className={`h-8 min-w-[32px] px-2 rounded-md text-xs font-bold transition-all border ${
                                                    safeCurrentPage === p
                                                        ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs font-semibold"
                                    disabled={safeCurrentPage >= totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                >
                                    <span>Próxima</span>
                                    <ChevronRight size={14} className="ml-0.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={safeCurrentPage >= totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    title="Última página"
                                >
                                    <ChevronsRight size={14} />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Modal de Observações, Detalhes e Linha do Tempo do Pago */}
            <Dialog open={isObsOpen} onOpenChange={setIsObsOpen}>
                <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border dark:border-slate-800 p-0 rounded-2xl">
                    {selectedPagoObs && (
                        <>
                            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-xs">
                                            {selectedPagoObs.Num_doc || 'Lançamento'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{selectedPagoObs.prev_pag}</span>
                                        {renderStatusBadge(selectedPagoObs)}
                                    </div>
                                    <h3 className="text-lg font-extrabold mt-1.5">{selectedPagoObs.resolvedProvedor}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedPagoObs.ordem_pagamento_id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsObsOpen(false);
                                                navigate(`/financeiro/titulos/${selectedPagoObs.ordem_pagamento_id}`);
                                            }}
                                            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-bold"
                                        >
                                            <ExternalLink size={13} className="mr-1.5" />
                                            Ver Ordem de Pago
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Info Summary Cards */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-950/60 border-b dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Empresa</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">{selectedPagoObs.resolvedEmpresa}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Obra / Centro Custo</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block truncate" title={selectedPagoObs.resolvedObra}>
                                        {selectedPagoObs.resolvedObra}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vencimento</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">{formatDate(selectedPagoObs.Dt_venc)}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Saldo / Valor Total</span>
                                    <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                                        {formatCurrency(selectedPagoObs.saldo_a_pagar)} <span className="text-slate-400 font-normal">/ {formatCurrency(selectedPagoObs.Valor_total)}</span>
                                    </span>
                                </div>
                            </div>

                            {selectedPagoObs.ibanInfo && (
                                <div className="px-5 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b dark:border-slate-800 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <Landmark size={14} className="text-blue-600" />
                                        <span className="font-bold text-slate-600 dark:text-slate-300">IBAN Identificado:</span>
                                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{selectedPagoObs.ibanInfo}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedPagoObs.ibanInfo!);
                                            toast.success('IBAN copiado!');
                                        }}
                                        className="h-7 text-xs font-bold text-blue-600"
                                    >
                                        <Copy size={12} className="mr-1" /> Copiar IBAN
                                    </Button>
                                </div>
                            )}

                            {/* Timeline Body */}
                            <div className="p-6 space-y-6 max-h-[380px] overflow-y-auto">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
                                    Linha do Tempo & Observações do Pago
                                </h4>

                                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
                                    {/* Custom Notes */}
                                    {selectedPagoObs.notesList.map((note) => (
                                        <div key={note.id} className="relative pl-6">
                                            <div className="absolute -left-2 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-blue-600 dark:text-blue-400">{note.tipo}</span>
                                                    <span className="text-[11px] text-slate-400">
                                                        • {new Date(note.data).toLocaleDateString('pt-PT')} às {new Date(note.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} por {note.usuario}
                                                    </span>
                                                </div>
                                                <div
                                                    className="text-sm text-slate-700 dark:text-slate-200 mt-1 prose prose-sm dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: note.descricao }}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Real Payments */}
                                    {selectedPagoObs.pagamentos_reais?.map((pag, idx) => (
                                        <div key={`pag-${idx}`} className="relative pl-6">
                                            <div className="absolute -left-2 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                            <div>
                                                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                                    Liquidação Bancária ({pag.forma_pagamento || 'Transferência'})
                                                </span>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                                                    Pagamento registrado no valor de <span className="font-mono font-bold">{formatCurrency(pag.valor)}</span> em {formatDate(pag.data_pagamento)}.
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Creation / Origin Event */}
                                    <div className="relative pl-6">
                                        <div className="absolute -left-2 top-1 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900" />
                                        <div>
                                            <span className="font-bold text-xs text-slate-600 dark:text-slate-400">
                                                Registro de Conta a Pagar ({selectedPagoObs.resolvedOrigemLabel})
                                            </span>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                                {selectedPagoObs.resolvedDescricao || `Título ${selectedPagoObs.Num_doc || ''} registrado para ${selectedPagoObs.resolvedProvedor} no valor de ${formatCurrency(selectedPagoObs.Valor_total)}.`}
                                            </p>
                                            <span className="text-[11px] text-slate-400 block mt-1">
                                                Criado por: {selectedPagoObs.Creado_por || 'Sistema'} • Emissão: {formatDate(selectedPagoObs.Data_emissao)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Add Observation Editor */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800 space-y-3">
                                <RichTextEditor
                                    value={novaObs}
                                    onChange={setNovaObs}
                                    minHeight="90px"
                                    maxHeight="140px"
                                />
                                <div className="flex justify-between items-center">
                                    <Button variant="outline" size="sm" onClick={() => setIsObsOpen(false)}>
                                        Fechar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleAddObservation}
                                        disabled={isSavingObs || (!novaObs.includes('<img') && stripHtml(novaObs).length === 0)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                    >
                                        <Send size={14} className="mr-1.5" />
                                        {isSavingObs ? 'Salvando...' : 'Adicionar Observação'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Novo / Editar Registro Manual Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-slate-900">
                    <DialogHeader className="border-b pb-3 mb-3">
                        <DialogTitle className="text-xl font-extrabold">
                            {editingItem ? 'Editar Conta a Pagar' : 'Registrar Conta a Pagar'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Preencha os dados da empresa devedora, fornecedor, centro de custo e vencimento.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); savePayableMutation.mutate(); }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Empresa Devedora <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={empresaId}
                                    onChange={e => setEmpresaId(e.target.value)}
                                    required={!editingItem}
                                >
                                    <option value="">Selecione a Empresa</option>
                                    {companies?.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Fornecedor / Credor (Cadastro)
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={fornecedorId}
                                    onChange={e => setFornecedorId(e.target.value)}
                                >
                                    <option value="">Selecione ou digite abaixo...</option>
                                    {suppliers?.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.trade_name} ({s.codigo})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!fornecedorId && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Nome do Fornecedor / Favorecido (Livre)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Digite o nome do favorecido caso não esteja na lista..."
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={fornecedorCustom}
                                    onChange={e => setFornecedorCustom(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Valor do Título (€) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={valorTotal}
                                    onChange={e => setValorTotal(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Vencimento <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={dtVenc}
                                    onChange={e => setDtVenc(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Emissão</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={dataEmissao}
                                    onChange={e => setDataEmissao(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Centro de Custo / Obra
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={obraId}
                                    onChange={e => setObraId(e.target.value)}
                                >
                                    <option value="">Selecione a Obra / CC</option>
                                    {obras?.map((o: any) => (
                                        <option key={o.id} value={o.id}>{o.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Doc / N° Fatura</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    placeholder="Ex: FT-0012/26"
                                    value={numDoc}
                                    onChange={e => setNumDoc(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observação / Descrição</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    placeholder="Detalhes sobre este pagamento..."
                                    value={obsLancamento}
                                    onChange={e => setObsLancamento(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link Anexo URL</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    placeholder="https://..."
                                    value={anexoUrl}
                                    onChange={e => setAnexoUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={savePayableMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                {savePayableMutation.isPending ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Individual Payment Modal */}
            <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900">
                    <DialogHeader className="border-b pb-3 mb-3">
                        <DialogTitle className="text-lg font-extrabold">Confirmar Liquidação Bancária</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }} className="space-y-4">
                        {payingItem && (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border text-xs space-y-1.5">
                                <div><span className="text-slate-400 font-semibold">Título:</span> <span className="font-mono font-bold">{payingItem.Num_doc || 'Lançamento Manual'}</span></div>
                                <div><span className="text-slate-400 font-semibold">Credor:</span> <span className="font-bold">{payingItem.resolvedProvedor}</span></div>
                                <div><span className="text-slate-400 font-semibold">Empresa:</span> {payingItem.resolvedEmpresa}</div>
                                <div><span className="text-slate-400 font-semibold">Saldo Pendente:</span> <span className="font-mono font-bold text-rose-600">{formatCurrency(payingItem.saldo_a_pagar)}</span></div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Pago (€) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payValor}
                                    onChange={e => setPayValor(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data do Pagamento <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payDate}
                                    onChange={e => setPayDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conta Caixa/Banco <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payBank}
                                    onChange={e => setPayBank(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione o Banco</option>
                                    {banks?.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.nome_banco || b.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={payForm}
                                    onChange={e => setPayForm(e.target.value)}
                                >
                                    <option value="Transferência Bancária">Transferência Bancária</option>
                                    <option value="Débito Direto">Débito Direto</option>
                                    <option value="Cartão Corporativo">Cartão Corporativo</option>
                                    <option value="Dinheiro">Dinheiro/Espécie</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={payMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                {payMutation.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Batch Payment Modal */}
            <Dialog open={isBatchPayOpen} onOpenChange={setIsBatchPayOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900">
                    <DialogHeader className="border-b pb-3 mb-3">
                        <DialogTitle className="text-lg font-extrabold">Pagamento em Lote ({selectedItems.length} títulos)</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); batchPayMutation.mutate(); }} className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border text-xs space-y-1.5">
                            <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Títulos Selecionados para Liquidação</div>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-2">
                                {selectedItems.map(id => {
                                    const itemObj = enrichedPayables.find(p => p.id === id);
                                    return (
                                        <div key={id} className="flex justify-between font-medium">
                                            <span className="truncate max-w-[220px]">{itemObj?.Num_doc || 'Lançamento'} ({itemObj?.resolvedProvedor})</span>
                                            <span className="font-mono font-bold text-rose-600">{formatCurrency(itemObj?.saldo_a_pagar || 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t pt-2 flex justify-between font-extrabold">
                                <span>TOTAL A LIQUIDAR:</span>
                                <span className="font-mono text-blue-600">
                                    {formatCurrency(selectedItems.reduce((sum, id) => sum + (enrichedPayables.find(p => p.id === id)?.saldo_a_pagar || 0), 0))}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conta Caixa/Banco <span className="text-red-500">*</span></label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                value={batchBank}
                                onChange={e => setBatchBank(e.target.value)}
                                required
                            >
                                <option value="">Selecione o Banco</option>
                                {banks?.map((b: any) => (
                                    <option key={b.id} value={b.id}>{b.nome_banco || b.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data do Lote <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={batchDate}
                                    onChange={e => setBatchDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Liquidação</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                    value={batchForm}
                                    onChange={e => setBatchForm(e.target.value)}
                                >
                                    <option value="Transferência Bancária">Transferência Bancária</option>
                                    <option value="Débito Direto">Débito Direto</option>
                                    <option value="Cartão Corporativo">Cartão Corporativo</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsBatchPayOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={batchPayMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                {batchPayMutation.isPending ? 'Processando Lote...' : 'Liquidar Lote'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
