import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, pt } from 'date-fns/locale';
import {
    CalendarIcon,
    Search,
    Plus,
    DownloadCloud,
    Calculator,
    Undo2,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Users,
    ShieldAlert,
    Clock,
    Banknote,
    Copy,
    Check,
    CreditCard,
    Building2
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Combobox } from '@/components/ui/combobox';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

import { useWorkersForHolerites } from '../hooks/useWorkersForHolerites';
import { useHoleriteEventos } from '../hooks/useHoleriteEventos';
import { HoleriteLancamentosSheet } from '../components/HoleriteEventoDialog';
import { PreviewHoleriteDialog } from '../components/PreviewHoleriteDialog';
import { useAllDiscounts } from '../../discounts/hooks/useAllDiscounts';
import { ImportHorasDialog } from '../components/ImportHorasDialog';
import { useUniqueContratantes } from '@/features/workers/hooks/useUniqueContratantes';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDeleteHorasBatch } from '../hooks/useDeleteHorasBatch';

const PASTEL_CLIENT_STYLES = [
    { badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/70' },
    { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/70' },
    { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/70' },
    { badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/70' },
    { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/70' },
    { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/70' },
    { badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/70' },
    { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/70' },
];

function getClientStyle(clientName: string | null) {
    if (!clientName || clientName === '-') return PASTEL_CLIENT_STYLES[0];
    let hash = 0;
    for (let i = 0; i < clientName.length; i++) {
        hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PASTEL_CLIENT_STYLES.length;
    return PASTEL_CLIENT_STYLES[index];
}

function formatIban(iban: string) {
    if (!iban) return '';
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function HoleritesPage() {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language.startsWith('pt') ? pt : es;
    const { selectedEmpresaId, setSelectedEmpresaId, empresas } = useEmpresa();

    // Default to current month
    const [mesReferencia, setMesReferencia] = useState(format(new Date(), 'yyyy-MM'));
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilter, setClienteFilter] = useState<string>('all');
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');
    const [onlyWithHours, setOnlyWithHours] = useState<boolean>(true);
    const [seguridadFilter, setSeguridadFilter] = useState<string>('all');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(25);
    const [sortColumn, setSortColumn] = useState<'nome' | 'cliente_nombre'>('nome');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (col: 'nome' | 'cliente_nombre') => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (col: 'nome' | 'cliente_nombre') => {
        if (sortColumn !== col) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />;
        return sortDirection === 'asc' 
            ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-indigo-600" />
            : <ArrowDown className="ml-1 h-3.5 w-3.5 text-indigo-600" />;
    };

    const { data: workers, isLoading: isLoadingWorkers } = useWorkersForHolerites(selectedEmpresaId || undefined);
    const { data: eventos, isLoading: isLoadingEventos } = useHoleriteEventos(mesReferencia);
    const { data: contratantesUnicos = [] } = useUniqueContratantes();
    const { mutate: deleteBatch, isPending: isDeletingBatch } = useDeleteHorasBatch();
    const { data: allDiscounts = [] } = useAllDiscounts();

    const handleContratanteChange = (v: string) => {
        const nextVal = v || 'all';
        setContratanteFilter(nextVal);
        if (nextVal && nextVal !== 'all') {
            const matched = empresas?.find(e => 
                nextVal.toLowerCase().includes(e.codigo.toLowerCase()) || 
                e.codigo.toLowerCase().includes(nextVal.toLowerCase()) ||
                e.nome.toLowerCase().includes(nextVal.toLowerCase()) ||
                nextVal.toLowerCase().includes(e.nome.toLowerCase())
            );
            if (matched && matched.id !== selectedEmpresaId) {
                setSelectedEmpresaId(matched.id);
            }
        }
    };

    useEffect(() => {
        if (selectedEmpresaId && empresas && contratantesUnicos.length > 0) {
            const currentEmpresa = empresas.find(e => e.id === selectedEmpresaId);
            if (currentEmpresa) {
                const matchedOption = contratantesUnicos.find(c => 
                    c.toLowerCase().includes(currentEmpresa.codigo.toLowerCase()) ||
                    currentEmpresa.codigo.toLowerCase().includes(c.toLowerCase()) ||
                    currentEmpresa.nome.toLowerCase().includes(c.toLowerCase())
                );
                if (matchedOption && matchedOption !== contratanteFilter) {
                    setContratanteFilter(matchedOption);
                }
            }
        }
    }, [selectedEmpresaId, empresas, contratantesUnicos]);

    // Reset pagination to page 1 whenever filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, clienteFilter, contratanteFilter, seguridadFilter, onlyWithHours, mesReferencia, selectedEmpresaId]);

    // Query total hours recorded in core_finance.horas_trabalhadas across the competence period span
    const { data: dbHoursSummary } = useQuery({
        queryKey: ['db-hours-summary', selectedEmpresaId, mesReferencia],
        queryFn: async () => {
            if (!selectedEmpresaId || !mesReferencia) return new Map<string, number>();

            const year = parseInt(mesReferencia.substring(0, 4), 10);
            const month = parseInt(mesReferencia.substring(5, 7), 10);

            let prevYear = year;
            let prevMonth = month - 1;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear = year - 1;
            }

            const lastDay = new Date(year, month, 0).getDate();
            const startDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            let allRows: any[] = [];
            let pageIndex = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .schema('core_finance')
                    .from('horas_trabalhadas')
                    .select('worker_id, horas_totais')
                    .gte('data_trabalho', startDateStr)
                    .lte('data_trabalho', endDateStr)
                    .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

                if (error) {
                    console.error("Error fetching database hours for holerites:", error);
                    break;
                }

                if (data && data.length > 0) {
                    allRows = [...allRows, ...data];
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        pageIndex++;
                    }
                } else {
                    hasMore = false;
                }
            }

            const sumMap = new Map<string, number>();
            allRows.forEach((row: any) => {
                if (row.worker_id) {
                    const current = sumMap.get(row.worker_id) || 0;
                    sumMap.set(row.worker_id, current + Number(row.horas_totais || 0));
                }
            });
            return sumMap;
        },
        enabled: Boolean(selectedEmpresaId && mesReferencia),
        refetchOnWindowFocus: false,
    });

    // Estado para controlar as linhas expandidas (IDs dos trabalhadores) e cópia de IBAN
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

    const toggleRow = (workerId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(workerId)) {
            newExpanded.delete(workerId);
        } else {
            newExpanded.add(workerId);
        }
        setExpandedRows(newExpanded);
    };

    const handleCopyIban = (workerId: string, iban: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(iban);
        setCopiedIbanId(workerId);
        setTimeout(() => setCopiedIbanId(null), 2000);
    };

    const { data: workerIbansMap } = useQuery({
        queryKey: ['worker-ibans-map', selectedEmpresaId],
        queryFn: async () => {
            if (!selectedEmpresaId) return new Map<string, { iban: string; banco: string }>();
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .select('worker_id, iban, banco')
                .eq('status', 'ATIVO');

            if (error) {
                console.error("Error fetching active worker ibans:", error);
                return new Map<string, { iban: string; banco: string }>();
            }

            const map = new Map<string, { iban: string; banco: string }>();
            (data || []).forEach((row: any) => {
                if (row.worker_id && row.iban) {
                    map.set(row.worker_id, { iban: row.iban, banco: row.banco || '' });
                }
            });
            return map;
        },
        enabled: Boolean(selectedEmpresaId)
    });

    const handleUndoBatch = (batchId: string) => {
        if (confirm('Atenção: Você está prestes a excluir TODAS as horas importadas neste lote. Continuar?')) {
            deleteBatch(batchId);
        }
    };

    const recentBatches = React.useMemo(() => {
        if (!eventos) return [];

        const map = new Map<string, { time: number, count: number }>();
        eventos.forEach(e => {
            if (e.import_batch_id && e.categoria === 'total_horas') {
                const time = new Date(e.created_at || Date.now()).getTime();
                const existing = map.get(e.import_batch_id);
                if (!existing) {
                    map.set(e.import_batch_id, { time, count: 1 });
                } else {
                    map.set(e.import_batch_id, { time: Math.max(existing.time, time), count: existing.count + 1 });
                }
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 3)
            .map(([id, data]) => ({ id, count: data.count, date: new Date(data.time) }));
    }, [eventos]);

    // List of last 12 months for the selector
    const monthOptions = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return format(d, 'yyyy-MM');
    });

    // Derive and sort options
    const clientesUnicos = (Array.from(new Set(workers?.map(w => w.cliente_nombre).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));
    const contratantesUnicosSorted = [...contratantesUnicos].sort((a, b) => a.localeCompare(b));
    const seguridadUnica = (Array.from(new Set(workers?.map(w => w.status_seguridad).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));

    const clienteOptions = [
        { value: 'all', label: 'Todos os clientes' },
        ...clientesUnicos.map(c => ({ value: c, label: c }))
    ];

    const contratanteOptions = [
        { value: 'all', label: 'Todas as empresas' },
        ...contratantesUnicosSorted.map(c => ({ value: c, label: c }))
    ];

    const seguridadOptions = [
        { value: 'all', label: 'Todas as seguranças' },
        ...seguridadUnica.map(s => ({ value: s, label: s }))
    ];

    // Helper to calc net
    function calculateWorkerTally(worker: any) {
        if (!eventos) return { proventos: 0, descontos: 0, liquido: 0, totalHoras: 0, beneficiosFixos: [], descontosExtras: [] };

        const workerEvents = eventos.filter(e => e.trabalhador_id === worker.id);

        let totalHoras = workerEvents
            .filter(e => e.categoria === 'total_horas')
            .reduce((sum, e) => {
                let hrs = Number(e.horas_referencia || e.referencia_dias_horas || e.quantidade || 0);
                if (hrs === 0 && e.descricao) {
                    const match = e.descricao.match(/(\d+(?:\.\d+)?)\s*h/i);
                    if (match) hrs = Number(match[1]);
                }
                return sum + hrs;
            }, 0);

        if (totalHoras === 0 && dbHoursSummary) {
            totalHoras = dbHoursSummary.get(worker.id) || 0;
        }

        const tarifaHora = Number(worker.worker_beneficios_settings?.tarifa_hora || 0);
        const vencimentoBase = totalHoras * tarifaHora;

        const proventosEventos = workerEvents
            .filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas')
            .reduce((sum, e) => sum + Number(e.valor || 0), 0);

        const descontosEventos = workerEvents
            .filter(e => e.tipo === 'desconto')
            .reduce((sum, e) => sum + Number(e.valor || 0), 0);

        // Fixed Benefits
        const bSet = worker.worker_beneficios_settings || {};
        const sumBeneficiosFixos =
            Number(bSet.auxilio_moradia_base || 0) +
            Number(bSet.subsidio_alimentacao || 0) +
            Number(bSet.bono_produtividade || 0) +
            Number(bSet.ajuda_custo || 0) +
            Number(bSet.outros_beneficios || 0);

        let beneficiosFixosArray = [];
        if (Number(bSet.auxilio_moradia_base || 0) > 0) beneficiosFixosArray.push({ desc: 'Auxílio Moradia', val: Number(bSet.auxilio_moradia_base) });
        if (Number(bSet.subsidio_alimentacao || 0) > 0) beneficiosFixosArray.push({ desc: 'Subsídio Alimentação', val: Number(bSet.subsidio_alimentacao) });
        if (Number(bSet.bono_produtividade || 0) > 0) beneficiosFixosArray.push({ desc: 'Bônus Produtividade', val: Number(bSet.bono_produtividade) });
        if (Number(bSet.ajuda_custo || 0) > 0) beneficiosFixosArray.push({ desc: 'Ajuda de Custo', val: Number(bSet.ajuda_custo) });
        if (Number(bSet.outros_beneficios || 0) > 0) beneficiosFixosArray.push({ desc: 'Outros Benefícios', val: Number(bSet.outros_beneficios) });

        // Extra Discounts for this month
        const descontosExtras = allDiscounts.filter((d: any) => d.worker_id === worker.id && d.reference_date?.startsWith(mesReferencia));
        const sumDescontosExtras = descontosExtras.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

        const totalProventos = vencimentoBase + proventosEventos + sumBeneficiosFixos;
        const totalDescontos = descontosEventos + sumDescontosExtras;

        return {
            proventos: totalProventos,
            descontos: totalDescontos,
            liquido: totalProventos - totalDescontos,
            totalHoras,
            beneficiosFixos: beneficiosFixosArray,
            descontosExtras
        };
    }

    const filteredWorkers = workers?.filter(worker => {
        const matchesSearch = worker.nome.toLowerCase().includes(searchTerm.toLowerCase()) || worker.niss?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCliente = clienteFilter === 'all' || worker.cliente_nombre === clienteFilter;
        const matchesContratante = contratanteFilter === 'all' || worker.contratante === contratanteFilter || (worker.contratante && worker.contratante.includes(contratanteFilter));
        const matchesSeguridad = seguridadFilter === 'all' || worker.status_seguridad === seguridadFilter;

        if (!matchesSearch || !matchesCliente || !matchesContratante || !matchesSeguridad) return false;

        if (onlyWithHours) {
            const { totalHoras, proventos, descontos } = calculateWorkerTally(worker);
            return totalHoras > 0 || proventos > 0 || descontos > 0;
        }

        return true;
    });

    const sortedWorkers = React.useMemo(() => {
        if (!filteredWorkers) return [];
        return [...filteredWorkers].sort((a, b) => {
            let valA = '';
            let valB = '';
            if (sortColumn === 'nome') {
                valA = a.nome || '';
                valB = b.nome || '';
            } else if (sortColumn === 'cliente_nombre') {
                valA = a.cliente_nombre || '';
                valB = b.cliente_nombre || '';
            }
            const res = valA.localeCompare(valB, 'pt-BR');
            return sortDirection === 'asc' ? res : -res;
        });
    }, [filteredWorkers, sortColumn, sortDirection]);

    const totalLiquidoSum = React.useMemo(() => {
        if (!sortedWorkers) return 0;
        return sortedWorkers.reduce((acc, w) => {
            const { liquido } = calculateWorkerTally(w);
            return acc + liquido;
        }, 0);
    }, [sortedWorkers, eventos, allDiscounts, dbHoursSummary]);

    const totalHorasSum = React.useMemo(() => {
        if (!sortedWorkers) return 0;
        return sortedWorkers.reduce((acc, w) => {
            const { totalHoras } = calculateWorkerTally(w);
            return acc + totalHoras;
        }, 0);
    }, [sortedWorkers, eventos, dbHoursSummary]);

    const altaCount = React.useMemo(() => {
        if (!sortedWorkers) return 0;
        return sortedWorkers.filter(w => w.status_seguridad === 'Alta').length;
    }, [sortedWorkers]);

    const regCount = React.useMemo(() => {
        if (!sortedWorkers) return 0;
        return sortedWorkers.filter(w => w.status_seguridad !== 'Alta').length;
    }, [sortedWorkers]);

    const totalCount = sortedWorkers.length;
    const effectivePageSize = pageSize === 'all' ? (totalCount || 1) : pageSize;
    const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));

    const paginatedWorkers = React.useMemo(() => {
        if (pageSize === 'all') return sortedWorkers;
        const start = (page - 1) * effectivePageSize;
        return sortedWorkers.slice(start, start + effectivePageSize);
    }, [sortedWorkers, page, effectivePageSize, pageSize]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 p-6 overflow-hidden">
            {/* Header section */}
            <div className="shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2">
                            <Calculator className="h-7 w-7 text-indigo-500" />
                            <h2 className="text-2xl font-bold tracking-tight">Gestão de Folhas</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Controle mensal de descontos e proventos. Selecione o mês de competência para visualizar os trabalhadores.
                        </p>
                    </div>

                    {recentBatches.length > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50/50 rounded-lg p-2 border border-amber-100/60">
                            <span className="text-xs font-medium text-amber-900 flex items-center gap-1.5 shrink-0">
                                <Undo2 className="h-3.5 w-3.5" /> Reverter Lotes:
                            </span>
                            <div className="flex gap-2 flex-wrap">
                                {recentBatches.map(b => (
                                    <Button
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white h-7 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-0"
                                        onClick={() => handleUndoBatch(b.id)}
                                        disabled={isDeletingBatch}
                                    >
                                        {format(b.date, 'dd/MM HH:mm')} ({b.count} itens)
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Top KPI Cards Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trabalhadores</span>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
                                <span className="text-[10px] text-muted-foreground">Listados na competência</span>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Segurança Social</span>
                                <div className="flex items-center gap-1.5 text-lg font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">{altaCount} Alta</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold">{regCount} Reg.</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">Status contratual atual</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/50 shadow-sm">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total de Horas</span>
                                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {totalHorasSum.toLocaleString('pt-BR')} h
                                </div>
                                <span className="text-[10px] text-muted-foreground">Apuradas no período</span>
                            </div>
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Folha Total (Líquido)</span>
                                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
                                    € {totalLiquidoSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-muted-foreground">Previsão líquida a pagar</span>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                <Banknote className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Filter Section */}
            <Card className="shrink-0 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Mês de Competência</Label>
                                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                                    <SelectTrigger className="w-full h-9 text-xs bg-white dark:bg-slate-900">
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                        <SelectValue placeholder="Selecione o mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map(month => (
                                            <SelectItem key={month} value={month}>
                                                {format(new Date(month + '-02'), 'MMMM yyyy', { locale: currentLocale }).toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Cliente</Label>
                                <Combobox
                                    className="bg-white dark:bg-slate-900 h-9 text-xs"
                                    options={clienteOptions}
                                    value={clienteFilter}
                                    onChange={(v) => setClienteFilter(v || 'all')}
                                    placeholder="Buscar cliente..."
                                    emptyText="Nenhum cliente encontrado."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Empresa</Label>
                                <Combobox
                                    className="bg-white dark:bg-slate-900 h-9 text-xs"
                                    options={contratanteOptions}
                                    value={contratanteFilter}
                                    onChange={handleContratanteChange}
                                    placeholder="Buscar empresa..."
                                    emptyText="Nenhuma empresa encontrada."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Segurança</Label>
                                <Combobox
                                    className="bg-white dark:bg-slate-900 h-9 text-xs"
                                    options={seguridadOptions}
                                    value={seguridadFilter}
                                    onChange={(v) => setSeguridadFilter(v || 'all')}
                                    placeholder="Buscar segurança..."
                                    emptyText="Nenhum status encontrado."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Buscar Trabalhador</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Nome ou NISS..."
                                        className="pl-8 h-9 text-xs bg-white dark:bg-slate-900"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-0.5">
                                    <input
                                        type="checkbox"
                                        id="only_with_hours"
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={onlyWithHours}
                                        onChange={(e) => setOnlyWithHours(e.target.checked)}
                                    />
                                    <Label htmlFor="only_with_hours" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                                        Filtrar apenas colaboradores com horas/lançamentos
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <ImportHorasDialog
                                mesReferencia={mesReferencia}
                                workers={workers || []}
                                trigger={
                                    <Button size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-xs">
                                        <DownloadCloud className="mr-1.5 h-3.5 w-3.5" />
                                        Importar Horas (Excel)
                                    </Button>
                                }
                            />
                            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                                {isLoadingWorkers ? '...' : totalCount} Trabalhador(es)
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table & Pagination Container */}
            <div className="flex-1 min-h-0 bg-card rounded-md border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                            <TableRow>
                                <TableHead className="pl-6 font-semibold cursor-pointer select-none" onClick={() => handleSort('nome')}>
                                    <div className="flex items-center">Trabalhador {renderSortIcon('nome')}</div>
                                </TableHead>
                                <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('cliente_nombre')}>
                                    <div className="flex items-center">Cliente {renderSortIcon('cliente_nombre')}</div>
                                </TableHead>
                                <TableHead>Segurança</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Tarifa (H)</TableHead>
                                <TableHead className="text-right">Total Horas</TableHead>
                                <TableHead className="text-right">Proventos (Mês)</TableHead>
                                <TableHead className="text-right">Descontos (Mês)</TableHead>
                                <TableHead className="text-right text-indigo-700 dark:text-indigo-400 font-bold">Valor Líquido</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingWorkers || isLoadingEventos ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center h-24">Carregando trabalhadores e eventos...</TableCell>
                                </TableRow>
                            ) : (!workers || workers.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                        Nenhum trabalhador ativo ou pendente encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : paginatedWorkers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                        Nenhum trabalhador correspondente na busca.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedWorkers?.map((worker) => {
                                    const workerEvents = eventos?.filter(e => e.trabalhador_id === worker.id) || [];
                                    const { proventos, descontos, liquido, totalHoras, beneficiosFixos, descontosExtras } = calculateWorkerTally(worker);
                                    const hasDataForMonth = workerEvents.length > 0 || beneficiosFixos.length > 0 || descontosExtras.length > 0;
                                    const isExpanded = expandedRows.has(worker.id);
                                    const clientStyle = getClientStyle(worker.cliente_nombre);
                                    const ibanInfo = workerIbansMap?.get(worker.id);

                                    return (
                                        <React.Fragment key={worker.id}>
                                            <TableRow 
                                                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}
                                                onClick={() => toggleRow(worker.id)}
                                            >
                                                <TableCell className="pl-6 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-indigo-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                {worker.nome}
                                                            </div>
                                                            {worker.cod_colab && (
                                                                <span className="text-[11px] text-muted-foreground font-mono">Cód: {worker.cod_colab}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {worker.cliente_nombre ? (
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${clientStyle.badge}`}>
                                                            <Building2 className="h-3 w-3 mr-1.5 shrink-0 opacity-70" />
                                                            {worker.cliente_nombre}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={worker.status_seguridad === 'Alta' ? 'default' : 'secondary'}
                                                        className={worker.status_seguridad === 'Alta' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 text-slate-700'}
                                                    >
                                                        {worker.status_seguridad || 'Desconhecido'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={hasDataForMonth ? 'border-indigo-500 text-indigo-500 bg-indigo-50/50' : 'text-muted-foreground'}>
                                                        {hasDataForMonth ? 'Valores Lançados' : 'Sem Lançamentos'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    € {worker.worker_beneficios_settings?.tarifa_hora || '0.00'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">
                                                    {totalHoras > 0 ? `${totalHoras} h` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600 dark:text-green-500 font-medium">
                                                    {proventos > 0 ? `+ € ${proventos.toFixed(2)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 dark:text-red-500 font-medium">
                                                    {descontos > 0 ? `- € ${descontos.toFixed(2)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-indigo-700 dark:text-indigo-400 font-bold text-base">
                                                    € {liquido.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <HoleriteLancamentosSheet
                                                            worker={worker}
                                                            mesReferencia={mesReferencia}
                                                            eventosMensais={eventos?.filter(e => e.trabalhador_id === worker.id) || []}
                                                            trigger={
                                                                <Button size="sm" variant="outline" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                                                    <Plus className="mr-1 h-4 w-4" />
                                                                    Lançamentos
                                                                </Button>
                                                            }
                                                        />
                                                        <PreviewHoleriteDialog
                                                            worker={worker}
                                                            mesReferencia={mesReferencia}
                                                            eventosMensais={eventos?.filter(e => e.trabalhador_id === worker.id) || []}
                                                            fallbackHours={dbHoursSummary?.get(worker.id) || 0}
                                                            trigger={
                                                                <Button size="sm" variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                                                    {i18n.language.startsWith('es') ? 'Nóminas' : 'Holerite'}
                                                                </Button>
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                                    <TableCell colSpan={10} className="p-4 border-b">
                                                        <div className="space-y-4 pl-4 sm:pl-8 pr-4">
                                                            {/* Premium Worker Summary Cards */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Bank Details / IBAN Card */}
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-3">
                                                                    <div className="flex items-center justify-between pb-2 border-b">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                            <CreditCard className="h-4 w-4 text-indigo-500" />
                                                                            Dados de Transferência Bancária
                                                                        </span>
                                                                        {ibanInfo?.iban && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-medium"
                                                                                onClick={(e) => handleCopyIban(worker.id, ibanInfo.iban, e)}
                                                                            >
                                                                                {copiedIbanId === worker.id ? (
                                                                                    <>
                                                                                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copiado!
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Copy className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Copiar IBAN
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                    </div>

                                                                    {ibanInfo?.iban ? (
                                                                        <div className="space-y-2">
                                                                            <div>
                                                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">IBAN para Pagamento</span>
                                                                                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                                                                                    {formatIban(ibanInfo.iban)}
                                                                                </span>
                                                                            </div>
                                                                            {ibanInfo.banco && (
                                                                                <div className="flex items-center gap-2 pt-1 text-xs">
                                                                                    <span className="text-muted-foreground font-medium">Banco:</span>
                                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{ibanInfo.banco}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-lg border border-amber-200/60 flex items-center justify-between">
                                                                            <span>Nenhum IBAN ativo cadastrado para este colaborador.</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Financial Breakdown Card */}
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-2">
                                                                    <div className="flex items-center justify-between pb-2 border-b">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                            <Banknote className="h-4 w-4 text-emerald-500" />
                                                                            Resumo da Folha (Competência {mesReferencia})
                                                                        </span>
                                                                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                                                                            Líquido: € {liquido.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Total Horas</span>
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200">{totalHoras} h</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Tarifa por Hora</span>
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200">€ {worker.worker_beneficios_settings?.tarifa_hora || '0.00'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Proventos + Benefícios</span>
                                                                            <span className="font-bold text-emerald-600">+ € {proventos.toFixed(2)}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Descontos Extras</span>
                                                                            <span className="font-bold text-red-600">- € {descontos.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Detailed Events Table */}
                                                            {hasDataForMonth ? (
                                                                <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
                                                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                                            Detalhamento dos Lançamentos do Mês
                                                                        </span>
                                                                    </div>
                                                                    <Table>
                                                                        <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
                                                                            <TableRow>
                                                                                <TableHead className="whitespace-nowrap">Data</TableHead>
                                                                                <TableHead>Categoria</TableHead>
                                                                                <TableHead>Descrição</TableHead>
                                                                                <TableHead className="text-right">Horas/Dias Ref.</TableHead>
                                                                                <TableHead className="text-right font-medium text-emerald-600 dark:text-emerald-500">Provento</TableHead>
                                                                                <TableHead className="text-right font-medium text-red-600 dark:text-red-500">Desconto</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {workerEvents.map((evento) => (
                                                                                <TableRow key={evento.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                                                                    <TableCell className="text-muted-foreground whitespace-nowrap">{evento.created_at ? format(new Date(evento.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
                                                                                    <TableCell className="font-medium">
                                                                                        {evento.categoria === 'total_horas' ? 'Total Horas' : 
                                                                                         evento.categoria === 'dieta' ? 'Dieta' : 
                                                                                         evento.categoria === 'alojamiento' ? 'Alojamento' : 
                                                                                         evento.categoria}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-muted-foreground">
                                                                                        {evento.descricao || '-'}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {evento.quantidade ? evento.quantidade : '-'}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">
                                                                                        {evento.tipo === 'provento' ? `€ ${Number(evento.valor).toFixed(2)}` : '-'}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-red-600 dark:text-red-500">
                                                                                        {evento.tipo === 'desconto' ? `€ ${Number(evento.valor).toFixed(2)}` : '-'}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                            {beneficiosFixos.map((b: any, idx: number) => (
                                                                                <TableRow key={`fixed-${idx}`}>
                                                                                    <TableCell className="text-muted-foreground">-</TableCell>
                                                                                    <TableCell className="font-medium">{b.desc}</TableCell>
                                                                                    <TableCell className="text-muted-foreground">Valor Fixo Mensal</TableCell>
                                                                                    <TableCell className="text-right">-</TableCell>
                                                                                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">€ {Number(b.val).toFixed(2)}</TableCell>
                                                                                    <TableCell className="text-right font-medium text-red-600 dark:text-red-500">-</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                            {descontosExtras.map((d: any, idx: number) => (
                                                                                <TableRow key={`desc-${idx}`}>
                                                                                    <TableCell className="text-muted-foreground whitespace-nowrap">{d.reference_date ? format(new Date(d.reference_date), 'dd/MM/yyyy') : '-'}</TableCell>
                                                                                    <TableCell className="font-medium">{d.category}</TableCell>
                                                                                    <TableCell className="text-muted-foreground">{d.description || 'Desconto extra do mês'}</TableCell>
                                                                                    <TableCell className="text-right">-</TableCell>
                                                                                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">-</TableCell>
                                                                                    <TableCell className="text-right font-medium text-red-600 dark:text-red-500">€ {Number(d.amount).toFixed(2)}</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-muted-foreground text-center py-2 bg-white dark:bg-slate-900 border rounded-xl">
                                                                    Sem lançamentos adicionais registrados para este mês.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="h-12 border-t px-4 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                            Página <strong>{page}</strong> de <strong>{totalPages}</strong> (Total: {totalCount} trabalhador(es))
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-muted-foreground font-medium">Exibir:</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(val) => {
                                    setPageSize(val === 'all' ? 'all' : Number(val));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-7 w-[90px] text-xs bg-white dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                    <SelectItem value="all">Todos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={page <= 1 || pageSize === 'all'}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={page >= totalPages || pageSize === 'all'}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Próximo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
