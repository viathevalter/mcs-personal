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
    Building2,
    RefreshCw,
    CheckCircle2,
    RotateCcw,
    FileSpreadsheet,
    FileArchive,
    Trash2,
    Pencil
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

import { useWorkersForHolerites } from '../hooks/useWorkersForHolerites';
import { useHoleriteEventos } from '../hooks/useHoleriteEventos';
import { HoleriteLancamentosSheet } from '../components/HoleriteEventoDialog';
import { PreviewHoleriteDialog } from '../components/PreviewHoleriteDialog';
import { EditHoleriteEventoDialog } from '../components/EditHoleriteEventoDialog';
import { EditDiscountDialog } from '../../discounts/components/EditDiscountDialog';
import { useAllDiscounts } from '../../discounts/hooks/useAllDiscounts';
import { useAllHousingBenefits } from '../../benefits/hooks/useAllHousingBenefits';
import { calculateProratedBenefitAmount } from '@/shared/utils/importUtils';
import { ExportHoleritesDialog } from '../components/ExportHoleritesDialog';
import { BatchHoleritesExportDialog } from '../components/BatchHoleritesExportDialog';
import { useUniqueContratantes } from '@/features/workers/hooks/useUniqueContratantes';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDeleteHorasBatch } from '../hooks/useDeleteHorasBatch';
import { useDeleteHoleriteEvento } from '../hooks/useDeleteHoleriteEvento';
import { useDeleteDiscount } from '../../discounts/hooks/useDiscountMutations';
import { isHolding, isHoldingId } from '@/shared/utils/empresaUtils';
import { useHoleritesStatus } from '../hooks/useHoleritesStatus';
import { usePaymentMutations } from '../hooks/usePaymentMutations';
import { PaymentConfirmModal } from '../components/PaymentConfirmModal';
import { exportBankTransferSpreadsheet } from '../utils/exportBankTransfer';
import { normalizeEmpresaName, matchesEmpresaFilter, CANONICAL_EMPRESAS } from '@/shared/utils/empresaNormalizer';

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

function formatDateClean(dateStr?: string | null) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

function formatHoursClean(val: number | string): string {
    const num = Number(val || 0);
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getWorkerStatusBadge(worker: any, mesReferencia: string) {
    if (!mesReferencia) return null;

    const endOfMonthStr = `${mesReferencia}-31`;
    const startOfMonthStr = `${mesReferencia}-01`;
    const baixaDate = worker.data_baixa ? worker.data_baixa.substring(0, 10) : null;

    // 1. If data_baixa is in a FUTURE month relative to mesReferencia:
    // Worker was active throughout mesReferencia!
    if (baixaDate && baixaDate > endOfMonthStr) {
        return null;
    }

    // 2. If data_baixa occurred DURING mesReferencia
    if (baixaDate && baixaDate >= startOfMonthStr && baixaDate <= endOfMonthStr) {
        return (
            <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] py-0 px-1.5 font-semibold">
                Baixa no Mês ({formatDateClean(baixaDate)})
            </Badge>
        );
    }

    // 3. If data_baixa occurred BEFORE mesReferencia
    if (baixaDate && baixaDate < startOfMonthStr) {
        return (
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 text-[10px] py-0 px-1.5 font-semibold" title="Trabalhador inativo em meses anteriores, mas com lançamentos/horas no período">
                Baixa Anterior ({formatDateClean(baixaDate)})
            </Badge>
        );
    }

    // 4. Fallback if worker status is inactive with no date
    if (worker.status_trabajador === 'INATIVO' || worker.status_trabajador === 'Inativo') {
        return (
            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 text-[10px] py-0 px-1.5 font-semibold">
                Inativo
            </Badge>
        );
    }

    return null;
}

export function isDateInCompetence(dateVal: any, mesCompetencia: string): boolean {
    if (!dateVal || !mesCompetencia) return false;
    const str = String(dateVal).trim();
    if (!str) return false;

    // mesCompetencia is formatted as "YYYY-MM" (e.g. "2026-08")
    const [year, month] = mesCompetencia.split('-');
    if (!year || !month) return false;

    // 1. ISO style: 2026-08-xx or 2026-08
    if (str.startsWith(`${year}-${month}`)) return true;

    // 2. Slash style: DD/MM/YYYY or D/M/YYYY
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
        const dMonth = slashParts[1].padStart(2, '0');
        const dYear = slashParts[2].substring(0, 4);
        if (dYear === year && dMonth === month) return true;
    }

    // 3. Dash style: DD-MM-YYYY
    const dashParts = str.split('-');
    if (dashParts.length === 3 && dashParts[0].length <= 2) {
        const dMonth = dashParts[1].padStart(2, '0');
        const dYear = dashParts[2].substring(0, 4);
        if (dYear === year && dMonth === month) return true;
    }

    return false;
}

function isNewWorkerInMonth(worker: any, mesCompetencia: string) {
    if (!mesCompetencia || !worker) return false;
    
    // Priority 1: Official Admission Date (data_ingresso / data_inicio / start_date)
    const primaryDate = worker.data_ingresso || worker.data_inicio || worker.start_date;
    if (primaryDate) {
        return isDateInCompetence(primaryDate, mesCompetencia);
    }

    // Priority 2: Security Alta Date (data_alta_seguridad)
    if (worker.data_alta_seguridad) {
        return isDateInCompetence(worker.data_alta_seguridad, mesCompetencia);
    }

    return false;
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
    const [workerTypeFilter, setWorkerTypeFilter] = useState<'only_hours' | 'new_workers' | 'all'>('only_hours');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pago' | 'pendente'>('all');
    const [seguridadFilter, setSeguridadFilter] = useState<string>('all');
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(25);
    const [sortColumn, setSortColumn] = useState<'nome' | 'cliente_nombre'>('nome');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { mutate: deleteEvento } = useDeleteHoleriteEvento();
    const { mutate: deleteDiscount } = useDeleteDiscount();

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
    const { data: holeritesStatusMap, isLoading: isLoadingStatus } = useHoleritesStatus(mesReferencia);
    const { marcarPagos, isMarcarPagosLoading, estornarPagamento, isEstornarLoading } = usePaymentMutations();
    const { data: contratantesUnicos = [] } = useUniqueContratantes();
    const { mutate: deleteBatch, isPending: isDeletingBatch } = useDeleteHorasBatch();
    const { data: allDiscounts = [] } = useAllDiscounts();
    const { data: allHousingBenefits = [] } = useAllHousingBenefits();

    const handleContratanteChange = (v: string) => {
        const nextVal = v || 'all';
        setContratanteFilter(nextVal);
        if (nextVal && nextVal !== 'all' && empresas) {
            const matched = empresas.find(e => {
                return matchesEmpresaFilter(e.trade_name, nextVal) ||
                       matchesEmpresaFilter(e.nome, nextVal) ||
                       matchesEmpresaFilter(e.legal_name, nextVal);
            });
            if (matched && String(matched.id) !== String(selectedEmpresaId)) {
                setSelectedEmpresaId(String(matched.id));
            }
        } else if (nextVal === 'all') {
            const holdingEmp = empresas?.find(e => isHolding(e));
            if (holdingEmp) {
                setSelectedEmpresaId(String(holdingEmp.id));
            }
        }
    };

    useEffect(() => {
        if (!selectedEmpresaId || selectedEmpresaId === 'all' || isHoldingId(selectedEmpresaId, empresas)) {
            if (contratanteFilter !== 'all') {
                setContratanteFilter('all');
            }
            return;
        }

        if (selectedEmpresaId && empresas) {
            const currentEmpresa = empresas.find(e => String(e.id) === String(selectedEmpresaId));
            if (currentEmpresa) {
                const normCurrent = normalizeEmpresaName(currentEmpresa.trade_name || currentEmpresa.nome);
                if (normCurrent && normCurrent !== contratanteFilter) {
                    setContratanteFilter(normCurrent);
                }
            }
        }
    }, [selectedEmpresaId, empresas, contratanteFilter]);

    // Reset pagination to page 1 whenever filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, clienteFilter, contratanteFilter, seguridadFilter, onlyWithHours, mesReferencia, selectedEmpresaId]);

    // Query total hours recorded in core_finance.horas_trabalhadas + Faturamento pro-forma adjustments
    const { data: dbHoursSummary, refetch: refetchDbHours, isFetching: isFetchingHours } = useQuery({
        queryKey: ['db-hours-summary', selectedEmpresaId || 'all', mesReferencia],
        queryFn: async () => {
            const emptyResult = { 
                sumMap: new Map<string, number>(), 
                rawSumMap: new Map<string, number>(), 
                adjustedWorkerIds: new Set<string>() 
            };

            if (!mesReferencia) return emptyResult;

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
                    .select('id, worker_id, data_trabalho, horas_totais, fatura_id, client_id')
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

            // Fetch companies & clients to map fatura company & client
            const { data: allEmpresas } = await supabase
                .schema('core_common')
                .from('empresas')
                .select('id, trade_name, nome, legal_name');

            const empresaNameMap = new Map<string, string>();
            (allEmpresas || []).forEach((e: any) => {
                const name = (e.trade_name || e.nome || e.legal_name || '').trim();
                empresaNameMap.set(e.id, name);
            });

            const { data: allClients } = await supabase
                .schema('core_common')
                .from('clients')
                .select('id, trade_name, legal_name');

            const clientNameMap = new Map<string, string>();
            (allClients || []).forEach((c: any) => {
                const name = (c.trade_name || c.legal_name || '').trim();
                clientNameMap.set(c.id, name);
            });

            // Fetch client company settings to link client directly to empresa
            const { data: allCcs } = await supabase
                .schema('core_common')
                .from('client_company_settings')
                .select('client_id, empresa_id');

            const clientEmpresaMap = new Map<string, string>();
            (allCcs || []).forEach((ccs: any) => {
                const empName = empresaNameMap.get(ccs.empresa_id);
                if (empName && !clientEmpresaMap.has(ccs.client_id)) {
                    clientEmpresaMap.set(ccs.client_id, empName);
                }
            });

            // Fetch faturas to overlay pro-forma adjustments & map client/company names
            const { data: faturas, error: faturasErr } = await supabase
                .schema('core_finance')
                .from('faturas')
                .select('id, status, client_id, empresa_id, ajustes_json');

            if (faturasErr) {
                console.error("Error fetching faturas for holerites adjustments:", faturasErr);
            }

            const faturaInfoMap = new Map<string, { cliente_nombre: string; contratante: string }>();
            if (faturas) {
                faturas.forEach((f: any) => {
                    const cName = clientNameMap.get(f.client_id) || '';
                    const empName = empresaNameMap.get(f.empresa_id) || '';
                    faturaInfoMap.set(f.id, { cliente_nombre: cName, contratante: empName });
                });
            }

            // Fetch allocations active during mesReferencia as secondary source
            const monthEndIso = `${endDateStr}T23:59:59.999Z`;
            const monthStartIso = `${startDateStr}T00:00:00.000Z`;
            const { data: allocsData } = await supabase
                .schema('core_personal')
                .from('vw_worker_allocations')
                .select('cod_colab, cliente_nombre, contratante, fechainiciopedido, fechasalidatrabajador')
                .lte('fechainiciopedido', monthEndIso)
                .order('fechainiciopedido', { ascending: false });

            const allocsActiveInMonthByCod = new Map<string, any>();
            const allocsByCodAndClient = new Map<string, string>();
            (allocsData || []).forEach((a: any) => {
                if (a.fechasalidatrabajador && a.fechasalidatrabajador < monthStartIso) return;
                if (a.cod_colab && !allocsActiveInMonthByCod.has(a.cod_colab)) {
                    allocsActiveInMonthByCod.set(a.cod_colab, a);
                }
                if (a.cod_colab && a.cliente_nombre && a.contratante) {
                    const k = `${a.cod_colab.toUpperCase()}_${a.cliente_nombre.trim().toUpperCase()}`;
                    if (!allocsByCodAndClient.has(k)) {
                        allocsByCodAndClient.set(k, a.contratante);
                    }
                }
            });

            // Global map of disputed/adjusted hours: key = `${worker_id}_${dateStr}` -> adjusted hours value
            const globalDisputedHours = new Map<string, number>();
            if (faturas) {
                faturas.forEach((f: any) => {
                    const disp = f.ajustes_json?.disputed_hours;
                    if (disp && typeof disp === 'object') {
                        Object.keys(disp).forEach(wId => {
                            const datesObj = disp[wId];
                            if (datesObj && typeof datesObj === 'object') {
                                Object.keys(datesObj).forEach(dateStr => {
                                    const val = Number(datesObj[dateStr]);
                                    globalDisputedHours.set(`${wId}_${dateStr}`, val);
                                });
                            }
                        });
                    }
                });
            }

            const dailyRawMap = new Map<string, number>();
            const dailyEffectiveMap = new Map<string, number>();
            const adjustedWorkerIds = new Set<string>();
            const workerClientsMap = new Map<string, Set<string>>();
            const workerCompanyHoursMap = new Map<string, Map<string, number>>();
            const workerClientHoursMap = new Map<string, Map<string, number>>();
            const workerCompanyClientsMap = new Map<string, Map<string, Map<string, number>>>();
            const workerAllContratantes = new Map<string, Set<string>>();
            const workerAllClients = new Map<string, Set<string>>();

            const workerCodMap = new Map<string, string>();
            const workerContratanteMap = new Map<string, string>();
            (workers || []).forEach(w => {
                if (w.id) {
                    if (w.cod_colab) workerCodMap.set(w.id, w.cod_colab);
                    if (w.contratante) workerContratanteMap.set(w.id, w.contratante);
                }
            });

            allRows.forEach((row: any) => {
                if (row.worker_id && row.data_trabalho) {
                    const dateKey = row.data_trabalho.includes('T') ? row.data_trabalho.split('T')[0] : row.data_trabalho;
                    if (!dateKey.startsWith(mesReferencia)) return;

                    const key = `${row.worker_id}_${dateKey}`;
                    const rawH = Number(row.horas_totais || 0);

                    const prevRaw = dailyRawMap.get(key) || 0;
                    dailyRawMap.set(key, prevRaw + rawH);

                    // Track company and client for worker
                    const fInfo = faturaInfoMap.get(row.fatura_id);
                    const clientName = (fInfo?.cliente_nombre || clientNameMap.get(row.client_id) || '').trim();

                    const cod = workerCodMap.get(row.worker_id) || '';
                    const allocEmp = (cod && clientName) ? allocsByCodAndClient.get(`${cod.toUpperCase()}_${clientName.toUpperCase()}`) : null;
                    const defWorkerEmp = workerContratanteMap.get(row.worker_id) || '';

                    const rawContratante = fInfo?.contratante || allocEmp || clientEmpresaMap.get(row.client_id) || defWorkerEmp;
                    const normContratante = normalizeEmpresaName(rawContratante);

                    if (clientName) {
                        if (!workerAllClients.has(row.worker_id)) workerAllClients.set(row.worker_id, new Set());
                        workerAllClients.get(row.worker_id)!.add(clientName);

                        if (!workerClientsMap.has(row.worker_id)) workerClientsMap.set(row.worker_id, new Set());
                        workerClientsMap.get(row.worker_id)!.add(clientName);

                        if (!workerClientHoursMap.has(row.worker_id)) workerClientHoursMap.set(row.worker_id, new Map());
                        const clMap = workerClientHoursMap.get(row.worker_id)!;
                        clMap.set(clientName, (clMap.get(clientName) || 0) + rawH);
                    }

                    if (normContratante) {
                        if (!workerAllContratantes.has(row.worker_id)) workerAllContratantes.set(row.worker_id, new Set());
                        workerAllContratantes.get(row.worker_id)!.add(normContratante);

                        if (!workerCompanyHoursMap.has(row.worker_id)) workerCompanyHoursMap.set(row.worker_id, new Map());
                        const compMap = workerCompanyHoursMap.get(row.worker_id)!;
                        compMap.set(normContratante, (compMap.get(normContratante) || 0) + rawH);
                    }

                    if (normContratante && clientName) {
                        if (!workerCompanyClientsMap.has(row.worker_id)) workerCompanyClientsMap.set(row.worker_id, new Map());
                        const compMap = workerCompanyClientsMap.get(row.worker_id)!;
                        if (!compMap.has(normContratante)) compMap.set(normContratante, new Map());
                        const clMap = compMap.get(normContratante)!;
                        clMap.set(clientName, (clMap.get(clientName) || 0) + rawH);
                    }
                }
            });

            // 1. Map raw hours and overlay tracking disputed hours where raw hours existed
            dailyRawMap.forEach((rawDayVal, key) => {
                const [wId] = key.split('_');
                let effectiveDayVal = rawDayVal;

                if (globalDisputedHours.has(key)) {
                    effectiveDayVal = globalDisputedHours.get(key)!;
                    if (effectiveDayVal !== rawDayVal) {
                        adjustedWorkerIds.add(wId);
                    }
                }

                dailyEffectiveMap.set(key, effectiveDayVal);
            });

            // 2. ALSO include newly added tracking hours where raw rows did not exist in horas_trabalhadas
            globalDisputedHours.forEach((dispVal, key) => {
                const [wId, dateKey] = key.split('_');
                if (dateKey && dateKey.startsWith(mesReferencia)) {
                    if (!dailyEffectiveMap.has(key)) {
                        dailyEffectiveMap.set(key, dispVal);
                        if (dispVal > 0) {
                            adjustedWorkerIds.add(wId);
                        }
                    }
                }
            });

            const sumMap = new Map<string, number>();
            const rawSumMap = new Map<string, number>();

            dailyRawMap.forEach((rawVal, key) => {
                const [wId] = key.split('_');
                rawSumMap.set(wId, (rawSumMap.get(wId) || 0) + rawVal);
            });

            dailyEffectiveMap.forEach((effVal, key) => {
                const [wId] = key.split('_');
                sumMap.set(wId, (sumMap.get(wId) || 0) + effVal);
            });

            // Calculate dominant month activity and multi-client / multi-company breakdowns
            const workerMonthlyActivityMap = new Map<string, { 
                contratante: string; 
                cliente_nombre: string; 
                allContratantes: Set<string>; 
                allClients: Set<string>;
                clientHoursBreakdown: Array<{ clientName: string; hours: number }>;
                companyHoursBreakdown: Array<{ companyName: string; hours: number }>;
            }>();

            const allActiveWorkerIds = new Set<string>([
                ...Array.from(dailyRawMap.keys()).map(k => k.split('_')[0]),
                ...Array.from(globalDisputedHours.keys()).map(k => k.split('_')[0]),
                ...(workers || []).map(w => w.id)
            ]);

            allActiveWorkerIds.forEach(wId => {
                const compMap = workerCompanyHoursMap.get(wId);
                let topComp = '';
                let maxCompH = -1;
                if (compMap) {
                    compMap.forEach((h, comp) => {
                        if (h > maxCompH) {
                            maxCompH = h;
                            topComp = comp;
                        }
                    });
                }

                const clientMap = workerClientHoursMap.get(wId);
                let topClient = '';
                let maxClientH = -1;
                if (clientMap) {
                    clientMap.forEach((h, cl) => {
                        if (h > maxClientH) {
                            maxClientH = h;
                            topClient = cl;
                        }
                    });
                }

                const clientBreakdown: Array<{ clientName: string; hours: number }> = [];
                if (clientMap) {
                    clientMap.forEach((hours, clientName) => {
                        if (hours > 0) clientBreakdown.push({ clientName, hours });
                    });
                    clientBreakdown.sort((a, b) => b.hours - a.hours);
                }

                const companyBreakdown: Array<{ companyName: string; hours: number }> = [];
                if (compMap) {
                    compMap.forEach((hours, companyName) => {
                        if (hours > 0) companyBreakdown.push({ companyName, hours });
                    });
                    companyBreakdown.sort((a, b) => b.hours - a.hours);
                }

                workerMonthlyActivityMap.set(wId, {
                    contratante: topComp || workerContratanteMap.get(wId) || '-',
                    cliente_nombre: topClient || '-',
                    allContratantes: workerAllContratantes.get(wId) || new Set(),
                    allClients: workerAllClients.get(wId) || new Set(),
                    clientHoursBreakdown: clientBreakdown,
                    companyHoursBreakdown: companyBreakdown
                });
            });

            return { 
                sumMap, 
                rawSumMap, 
                adjustedWorkerIds, 
                workerClientsMap, 
                workerMonthlyActivityMap,
                workerCompanyHoursMap,
                workerClientHoursMap,
                workerCompanyClientsMap,
                allocsActiveInMonthByCod
            };
        },
        enabled: Boolean(mesReferencia),
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
                .eq('status', 'ATIVO')
                .range(0, 4999);

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

    // Helper to resolve effective month activity (company and client based on worked hours/allocations in the competence month)
    const getWorkerEffectiveActivity = React.useCallback((w: any) => {
        const monthAct = dbHoursSummary?.workerMonthlyActivityMap?.get(w.id);
        const codColab = w.cod_colab;
        const allocAct = codColab ? dbHoursSummary?.allocsActiveInMonthByCod?.get(codColab) : null;

        const rawContratante = monthAct?.contratante || allocAct?.contratante || w.contratante || '';
        const contratante = normalizeEmpresaName(rawContratante) || '-';
        const cliente_nombre = monthAct?.cliente_nombre || allocAct?.cliente_nombre || w.cliente_nombre || (w as any).cliente || '-';
        
        const allContratantes = new Set<string>();
        if (contratante !== '-') allContratantes.add(contratante);
        monthAct?.allContratantes?.forEach((c: string) => {
            const norm = normalizeEmpresaName(c);
            if (norm) allContratantes.add(norm);
        });

        const allClients = monthAct?.allClients || new Set([cliente_nombre].filter(Boolean));
        const clientHoursBreakdown = monthAct?.clientHoursBreakdown || [];
        const companyHoursBreakdown = monthAct?.companyHoursBreakdown || [];

        return { contratante, cliente_nombre, allContratantes, allClients, clientHoursBreakdown, companyHoursBreakdown };
    }, [dbHoursSummary]);

    // Derive and sort options based on effective month activity
    const clientesUnicos = React.useMemo(() => {
        const set = new Set<string>();
        workers?.forEach(w => {
            const act = getWorkerEffectiveActivity(w);
            if (act.cliente_nombre && act.cliente_nombre !== '-') set.add(act.cliente_nombre);
            act.allClients.forEach(c => {
                if (c && c !== '-') set.add(c);
            });
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [workers, getWorkerEffectiveActivity]);

    const contratantesUnicosSorted = React.useMemo(() => {
        const set = new Set<string>();
        CANONICAL_EMPRESAS.forEach(c => set.add(c));
        workers?.forEach(w => {
            const act = getWorkerEffectiveActivity(w);
            if (act.contratante && act.contratante !== '-') set.add(normalizeEmpresaName(act.contratante));
            act.allContratantes.forEach(c => {
                const norm = normalizeEmpresaName(c);
                if (norm && norm !== '-') set.add(norm);
            });
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [workers, getWorkerEffectiveActivity]);

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
    function calculateWorkerTally(worker: any, targetEmpresa?: string) {
        if (!eventos) return { proventos: 0, descontos: 0, liquido: 0, totalHoras: 0, beneficiosFixos: [], descontosExtras: [], clientBreakdown: [] };

        const compHoursMap = dbHoursSummary?.workerCompanyHoursMap?.get(worker.id);
        const clientHoursMap = dbHoursSummary?.workerClientHoursMap?.get(worker.id);

        let totalHoras = 0;
        let clientBreakdown: Array<{ clientName: string; hours: number }> = [];

        const targetEmpresaObj = targetEmpresa && targetEmpresa !== 'all' 
            ? empresas?.find(e => matchesEmpresaFilter(e.trade_name || e.nome || e.legal_name, targetEmpresa))
            : null;
        const targetEmpresaId = targetEmpresaObj?.id;

        if (targetEmpresa && compHoursMap) {
            let matchedHours = 0;
            compHoursMap.forEach((hrs, comp) => {
                if (matchesEmpresaFilter(comp, targetEmpresa)) {
                    matchedHours += hrs;
                }
            });
            totalHoras = matchedHours;

            // Extract ONLY clients that correspond to this target company!
            if (dbHoursSummary?.workerCompanyClientsMap) {
                const compClientsMap = dbHoursSummary.workerCompanyClientsMap.get(worker.id);
                if (compClientsMap) {
                    compClientsMap.forEach((clMap, comp) => {
                        if (matchesEmpresaFilter(comp, targetEmpresa)) {
                            clMap.forEach((hrs, clName) => {
                                clientBreakdown.push({ clientName: clName, hours: hrs });
                            });
                        }
                    });
                }
            }
            if (clientBreakdown.length === 0 && clientHoursMap) {
                clientHoursMap.forEach((hrs, clName) => {
                    clientBreakdown.push({ clientName: clName, hours: hrs });
                });
            }
        } else if (contratanteFilter !== 'all' && compHoursMap && compHoursMap.size > 0) {
            let matchedHours = 0;
            compHoursMap.forEach((hrs, comp) => {
                if (matchesEmpresaFilter(comp, contratanteFilter)) {
                    matchedHours += hrs;
                }
            });
            totalHoras = matchedHours > 0 ? matchedHours : (dbHoursSummary?.sumMap?.get(worker.id) || 0);
            if (clientHoursMap) {
                clientHoursMap.forEach((hrs, clName) => {
                    clientBreakdown.push({ clientName: clName, hours: hrs });
                });
            }
        } else if (dbHoursSummary?.sumMap && dbHoursSummary.sumMap.has(worker.id)) {
            totalHoras = dbHoursSummary.sumMap.get(worker.id) || 0;
            if (clientHoursMap) {
                clientHoursMap.forEach((hrs, clName) => {
                    clientBreakdown.push({ clientName: clName, hours: hrs });
                });
            }
        } else {
            totalHoras = (eventos || [])
                .filter(e => e.trabalhador_id === worker.id && e.categoria === 'total_horas')
                .reduce((sum, e) => {
                    let hrs = Number(e.horas_referencia || e.referencia_dias_horas || e.quantidade || 0);
                    if (hrs === 0 && e.descricao) {
                        const match = e.descricao.match(/(\d+(?:\.\d+)?)\s*h/i);
                        if (match) hrs = Number(match[1]);
                    }
                    return sum + hrs;
                }, 0);
        }

        const tarifaHora = Number(worker.worker_beneficios_settings?.tarifa_hora || 0);
        const vencimentoBase = totalHoras * tarifaHora;

        // Filter events for this worker and company
        const workerEvents = (eventos || []).filter(e => {
            if (e.trabalhador_id !== worker.id) return false;
            const isHoldingEvent = !e.empresa_id || isHoldingId(e.empresa_id);
            if (!isHoldingEvent && targetEmpresaId) {
                return String(e.empresa_id) === String(targetEmpresaId);
            }
            if (targetEmpresa && e.descricao) {
                const descUpper = e.descricao.toUpperCase();
                if (descUpper.includes(targetEmpresa.toUpperCase())) return true;
            }
            if (isHoldingEvent && targetEmpresa) {
                const dominantComp = dbHoursSummary?.workerMonthlyActivityMap?.get(worker.id)?.contratante;
                const isDominant = !dominantComp || dominantComp === '-' || matchesEmpresaFilter(dominantComp, targetEmpresa);
                if (!isDominant) return false;
            }
            return true;
        });

        const proventosEventos = workerEvents
            .filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas')
            .reduce((sum, e) => sum + Number(e.valor || 0), 0);

        const descontosEventos = workerEvents
            .filter(e => e.tipo === 'desconto')
            .reduce((sum, e) => sum + Number(e.valor || 0), 0);

        // Monthly Housing Benefits & Proventos from worker_benefit_housing active in mesReferencia
        const workerHousingBenefits = allHousingBenefits.filter((hb: any) => {
            if (hb.worker_id !== worker.id) return false;
            if (hb.status === 'Inativo' || hb.status === 'Pausado') return false;
            if (!hb.start_date) return false;

            const startStr = hb.start_date.substring(0, 10);
            const endStr = hb.end_date ? hb.end_date.substring(0, 10) : null;

            const parts = mesReferencia.split('-').map(Number);
            if (parts.length < 2) return false;
            const year = parts[0];
            const month = parts[1];
            const firstDayOfMonthStr = `${mesReferencia}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const lastDayOfMonthStr = `${mesReferencia}-${String(lastDay).padStart(2, '0')}`;

            if (startStr > lastDayOfMonthStr) return false;
            if (endStr && endStr < firstDayOfMonthStr) return false;

            return true;
        });

        let beneficiosFixosArray: { desc: string; val: number }[] = [];
        let totalBeneficios = 0;

        if (workerHousingBenefits.length > 0) {
            workerHousingBenefits.forEach((hb: any) => {
                const proratedVal = calculateProratedBenefitAmount(hb, mesReferencia);
                totalBeneficios += proratedVal;
                beneficiosFixosArray.push({
                    desc: hb.category || 'Auxílio Moradia',
                    val: proratedVal
                });
            });
        } else {
            // Contract fallback from worker_beneficios_settings ONLY if receives fixed housing or fixed allowances are enabled
            const bSet = worker.worker_beneficios_settings || {};
            const receivesFixedHousing =
                bSet.recebe_auxilio_moradia === true ||
                String(bSet.recebe_auxilio_moradia || '').toLowerCase() === 'sim' ||
                String(bSet.recebe_auxilio_moradia || '').toLowerCase() === 'true';

            if (receivesFixedHousing && Number(bSet.auxilio_moradia_base || 0) > 0) {
                beneficiosFixosArray.push({ desc: 'Auxílio Moradia', val: Number(bSet.auxilio_moradia_base) });
                totalBeneficios += Number(bSet.auxilio_moradia_base);
            }
            if (Number(bSet.subsidio_alimentacao || 0) > 0) {
                beneficiosFixosArray.push({ desc: 'Subsídio Alimentação', val: Number(bSet.subsidio_alimentacao) });
                totalBeneficios += Number(bSet.subsidio_alimentacao);
            }
            if (Number(bSet.bono_produtividade || 0) > 0) {
                beneficiosFixosArray.push({ desc: 'Bônus Produtividade', val: Number(bSet.bono_produtividade) });
                totalBeneficios += Number(bSet.bono_produtividade);
            }
            if (Number(bSet.ajuda_custo || 0) > 0) {
                beneficiosFixosArray.push({ desc: 'Ajuda de Custo', val: Number(bSet.ajuda_custo) });
                totalBeneficios += Number(bSet.ajuda_custo);
            }
            if (Number(bSet.outros_beneficios || 0) > 0) {
                beneficiosFixosArray.push({ desc: 'Outros Benefícios', val: Number(bSet.outros_beneficios) });
                totalBeneficios += Number(bSet.outros_beneficios);
            }
        }

        // Extra Discounts for this month, filtered by company if targetEmpresa is specified
        const workerExtraDiscounts = allDiscounts.filter((d: any) => {
            if (d.worker_id !== worker.id) return false;
            if (!d.reference_date?.startsWith(mesReferencia)) return false;
            const isHoldingDiscount = !d.empresa_id || isHoldingId(d.empresa_id);
            if (!isHoldingDiscount && targetEmpresaId) {
                return String(d.empresa_id) === String(targetEmpresaId);
            }
            if (isHoldingDiscount && targetEmpresa) {
                const dominantComp = dbHoursSummary?.workerMonthlyActivityMap?.get(worker.id)?.contratante;
                const isDominant = !dominantComp || dominantComp === '-' || matchesEmpresaFilter(dominantComp, targetEmpresa);
                if (!isDominant) return false;
            }
            return true;
        });
        const sumDescontosExtras = workerExtraDiscounts.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

        const totalProventos = vencimentoBase + proventosEventos + totalBeneficios;
        const totalDescontos = descontosEventos + sumDescontosExtras;

        return {
            proventos: totalProventos,
            descontos: totalDescontos,
            liquido: totalProventos - totalDescontos,
            totalHoras,
            beneficiosFixos: beneficiosFixosArray,
            descontosExtras: workerExtraDiscounts,
            workerEvents,
            clientBreakdown
        };
    }

    const filteredWorkers = workers?.filter(worker => {
        const act = getWorkerEffectiveActivity(worker);

        const matchesSearch = worker.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              worker.niss?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              worker.cod_colab?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCliente = clienteFilter === 'all' || 
                              act.cliente_nombre === clienteFilter ||
                              act.allClients.has(clienteFilter) ||
                              worker.cliente_nombre === clienteFilter ||
                              worker.cliente === clienteFilter ||
                              (dbHoursSummary?.workerClientsMap?.get(worker.id)?.has(clienteFilter) ?? false);

        const matchesContratante = matchesEmpresaFilter(act.contratante, contratanteFilter) ||
                                  Array.from(act.allContratantes).some(c => matchesEmpresaFilter(c, contratanteFilter)) ||
                                  matchesEmpresaFilter(worker.contratante, contratanteFilter);

        const matchesSeguridad = seguridadFilter === 'all' || worker.status_seguridad === seguridadFilter;

        if (!matchesSearch || !matchesCliente || !matchesContratante || !matchesSeguridad) return false;

        if (paymentStatusFilter !== 'all') {
            const isPago = holeritesStatusMap?.get(worker.id)?.status === 'pago';
            if (paymentStatusFilter === 'pago' && !isPago) return false;
            if (paymentStatusFilter === 'pendente' && isPago) return false;
        }

        if (workerTypeFilter === 'only_hours') {
            const { totalHoras, proventos, descontos } = calculateWorkerTally(worker);
            return totalHoras > 0 || proventos > 0 || descontos > 0;
        }

        if (workerTypeFilter === 'new_workers') {
            return isNewWorkerInMonth(worker, mesReferencia);
        }

        return true;
    });

    // Transform filtered workers into distinct Folha rows (split by company if worker worked for multiple companies)
    const folhaRows = React.useMemo(() => {
        if (!filteredWorkers) return [];

        const rows: any[] = [];

        filteredWorkers.forEach(worker => {
            const effectiveAct = getWorkerEffectiveActivity(worker);
            const isNewWorker = isNewWorkerInMonth(worker, mesReferencia);
            const hasMultiCompany = effectiveAct.companyHoursBreakdown && effectiveAct.companyHoursBreakdown.length > 1;

            if (hasMultiCompany && contratanteFilter === 'all') {
                // Yield a separate folha row for each company!
                effectiveAct.companyHoursBreakdown.forEach(comp => {
                    const empresaName = comp.companyName;
                    const empObj = empresas?.find(e => matchesEmpresaFilter(e.trade_name || e.nome || e.legal_name, empresaName));
                    const empresaId = empObj?.id || worker.empresa_id;

                    const tally = calculateWorkerTally(worker, empresaName);

                    rows.push({
                        rowKey: `${worker.id}_${empresaName}`,
                        workerId: worker.id,
                        worker,
                        empresaName,
                        empresaId,
                        isMultiCompanySplit: true,
                        totalHoras: tally.totalHoras,
                        proventos: tally.proventos,
                        descontos: tally.descontos,
                        liquido: tally.liquido,
                        beneficiosFixos: tally.beneficiosFixos,
                        descontosExtras: tally.descontosExtras,
                        workerEvents: tally.workerEvents,
                        clientHoursBreakdown: tally.clientBreakdown && tally.clientBreakdown.length > 0 ? tally.clientBreakdown : effectiveAct.clientHoursBreakdown,
                        cliente_nombre: (tally.clientBreakdown && tally.clientBreakdown[0]?.clientName) || effectiveAct.cliente_nombre,
                        isNewWorker
                    });
                });
            } else {
                // Single company row
                const empresaName = contratanteFilter !== 'all' ? contratanteFilter : effectiveAct.contratante;
                const empObj = empresas?.find(e => matchesEmpresaFilter(e.trade_name || e.nome || e.legal_name, empresaName));
                const empresaId = empObj?.id || worker.empresa_id;

                const tally = calculateWorkerTally(worker, empresaName !== '-' ? empresaName : undefined);

                rows.push({
                    rowKey: worker.id,
                    workerId: worker.id,
                    worker,
                    empresaName: empresaName !== '-' ? empresaName : (worker.contratante || '-'),
                    empresaId,
                    isMultiCompanySplit: false,
                    totalHoras: tally.totalHoras,
                    proventos: tally.proventos,
                    descontos: tally.descontos,
                    liquido: tally.liquido,
                    beneficiosFixos: tally.beneficiosFixos,
                    descontosExtras: tally.descontosExtras,
                    workerEvents: tally.workerEvents,
                    clientHoursBreakdown: tally.clientBreakdown && tally.clientBreakdown.length > 0 ? tally.clientBreakdown : effectiveAct.clientHoursBreakdown,
                    cliente_nombre: (tally.clientBreakdown && tally.clientBreakdown[0]?.clientName) || effectiveAct.cliente_nombre,
                    isNewWorker
                });
            }
        });

        return rows;
    }, [filteredWorkers, contratanteFilter, eventos, allDiscounts, allHousingBenefits, dbHoursSummary, empresas, mesReferencia, getWorkerEffectiveActivity]);

    const sortedFolhaRows = React.useMemo(() => {
        if (!folhaRows) return [];
        return [...folhaRows].sort((a, b) => {
            let valA = '';
            let valB = '';
            if (sortColumn === 'nome') {
                valA = a.worker.nome || '';
                valB = b.worker.nome || '';
            } else if (sortColumn === 'cliente_nombre') {
                valA = a.cliente_nombre || '';
                valB = b.cliente_nombre || '';
            }
            const res = valA.localeCompare(valB, 'pt-BR');
            return sortDirection === 'asc' ? res : -res;
        });
    }, [folhaRows, sortColumn, sortDirection]);

    const totalLiquidoSum = React.useMemo(() => {
        if (!sortedFolhaRows) return 0;
        return sortedFolhaRows.reduce((acc, r) => acc + r.liquido, 0);
    }, [sortedFolhaRows]);

    const totalHorasSum = React.useMemo(() => {
        if (!sortedFolhaRows) return 0;
        return sortedFolhaRows.reduce((acc, r) => acc + r.totalHoras, 0);
    }, [sortedFolhaRows]);

    const paymentMetrics = React.useMemo(() => {
        if (!sortedFolhaRows) return { totalPago: 0, countPago: 0, totalPendente: 0, countPendente: 0 };
        let totalPago = 0;
        let countPago = 0;
        let totalPendente = 0;
        let countPendente = 0;

        sortedFolhaRows.forEach(r => {
            const isPago = holeritesStatusMap?.get(r.workerId)?.status === 'pago';
            if (isPago) {
                totalPago += r.liquido;
                countPago += 1;
            } else {
                totalPendente += r.liquido;
                countPendente += 1;
            }
        });

        return { totalPago, countPago, totalPendente, countPendente };
    }, [sortedFolhaRows, holeritesStatusMap]);

    const selectedRowsList = React.useMemo(() => {
        if (!sortedFolhaRows || selectedWorkerIds.size === 0) return [];
        return sortedFolhaRows.filter(r => selectedWorkerIds.has(r.rowKey));
    }, [sortedFolhaRows, selectedWorkerIds]);

    const selectedTotalLiquido = React.useMemo(() => {
        return selectedRowsList.reduce((sum, r) => sum + r.liquido, 0);
    }, [selectedRowsList]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedWorkerIds(new Set(paginatedFolhaRows.map(r => r.rowKey)));
        } else {
            setSelectedWorkerIds(new Set());
        }
    };

    const handleSelectAllGlobal = () => {
        if (!sortedFolhaRows) return;
        setSelectedWorkerIds(new Set(sortedFolhaRows.map(r => r.rowKey)));
    };

    const handleToggleWorkerSelect = (rowKey: string) => {
        const next = new Set(selectedWorkerIds);
        if (next.has(rowKey)) {
            next.delete(rowKey);
        } else {
            next.add(rowKey);
        }
        setSelectedWorkerIds(next);
    };

    const handleExportBankTransfer = (customRows?: any[]) => {
        const targetRows = customRows || (selectedRowsList.length > 0 ? selectedRowsList : sortedFolhaRows);
        if (!targetRows || targetRows.length === 0) {
            toast.error('Nenhum trabalhador para exportar.');
            return;
        }

        const items = targetRows.map(r => {
            const bInfo = workerIbansMap?.get(r.workerId);
            return {
                worker: {
                    ...r.worker,
                    contratante: r.empresaName,
                    cliente_nombre: r.cliente_nombre
                },
                valorLiquido: r.liquido,
                iban: bInfo?.iban,
                banco: bInfo?.banco
            };
        });

        exportBankTransferSpreadsheet({
            items,
            mesReferencia,
            empresaNome: contratanteFilter !== 'all' ? contratanteFilter : 'Todas as Empresas'
        });

        toast.success(`Planilha bancária exportada com ${items.length} itens de folha.`);
    };

    const handleMarcarPagosConfirm = (data: { dataPagamento: string; metodoPagamento: string }) => {
        const targetWorkerIds = Array.from(new Set(Array.from(selectedWorkerIds).map(k => k.split('_')[0])));
        if (targetWorkerIds.length === 0) {
            toast.error('Nenhum trabalhador selecionado.');
            return;
        }

        marcarPagos({
            workerIds: targetWorkerIds,
            mesReferencia,
            dataPagamento: data.dataPagamento,
            metodoPagamento: data.metodoPagamento,
            empresaId: selectedEmpresaId || undefined
        }, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setSelectedWorkerIds(new Set());
            }
        });
    };

    const altaCount = React.useMemo(() => {
        if (!sortedFolhaRows) return 0;
        return sortedFolhaRows.filter(r => r.worker.status_seguridad === 'Alta').length;
    }, [sortedFolhaRows]);

    const regCount = React.useMemo(() => {
        if (!sortedFolhaRows) return 0;
        return sortedFolhaRows.filter(r => r.worker.status_seguridad !== 'Alta').length;
    }, [sortedFolhaRows]);

    const totalCount = sortedFolhaRows.length;
    const effectivePageSize = pageSize === 'all' ? (totalCount || 1) : pageSize;
    const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));

    const paginatedFolhaRows = React.useMemo(() => {
        if (pageSize === 'all') return sortedFolhaRows;
        const start = (page - 1) * effectivePageSize;
        return sortedFolhaRows.slice(start, start + effectivePageSize);
    }, [sortedFolhaRows, page, effectivePageSize, pageSize]);

    const eventosMap = React.useMemo(() => {
        const map = new Map<string, { totalProventos: number; totalDescontos: number; valorLiquido: number; totalHoras: number }>();
        if (!workers) return map;

        workers.forEach(w => {
            const { proventos, descontos, liquido, totalHoras } = calculateWorkerTally(w);
            map.set(w.id, { totalProventos: proventos, totalDescontos: descontos, valorLiquido: liquido, totalHoras });
        });
        return map;
    }, [workers, eventos, allDiscounts, allHousingBenefits, dbHoursSummary]);

    const housingBenefitsMap = React.useMemo(() => {
        const map = new Map<string, number>();
        if (!workers) return map;

        workers.forEach(w => {
            const { beneficiosFixos } = calculateWorkerTally(w);
            const sumBeneficios = (beneficiosFixos || []).reduce((s: number, b: any) => s + Number(b.val || 0), 0);
            map.set(w.id, sumBeneficios);
        });
        return map;
    }, [workers, allHousingBenefits, mesReferencia]);

    return (
        <div className="w-full flex flex-col space-y-3 p-0 pb-6">
            {/* Header section */}
            <div className="shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                            <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Gestão de Folhas</h2>
                            <p className="text-xs text-muted-foreground">
                                Controle mensal de descontos e proventos. Selecione o mês de competência para visualizar os trabalhadores.
                            </p>
                        </div>
                    </div>

                    {recentBatches.length > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg px-3 py-1.5 border border-amber-200/60">
                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 shrink-0">
                                <Undo2 className="h-3.5 w-3.5" /> Reverter Lotes:
                            </span>
                            <div className="flex gap-1.5 flex-wrap">
                                {recentBatches.map(b => (
                                    <Button
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white dark:bg-slate-900 h-6 px-2 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 py-0"
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
                    <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-xs hover:shadow-sm transition-all">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Trabalhadores</span>
                                <div className="text-xl font-black text-slate-900 dark:text-white">{totalCount}</div>
                                <span className="text-[10px] text-muted-foreground font-medium">Listados na competência</span>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 shadow-xs hover:shadow-sm transition-all">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Segurança Social</span>
                                <div className="flex items-center gap-1.5 text-lg font-black">
                                    <span className="text-emerald-600 dark:text-emerald-400">{altaCount} Alta</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-sm font-bold">{regCount} Reg.</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">Status contratual atual</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/50 shadow-xs hover:shadow-sm transition-all">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total de Horas</span>
                                <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                                    {formatHoursClean(totalHorasSum)} h
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">Apuradas no período</span>
                            </div>
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 shadow-xs hover:shadow-sm transition-all">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Folha Total (Líquido)</span>
                                <div className="text-xl font-black text-indigo-700 dark:text-indigo-400">
                                    € {totalLiquidoSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                        € {paymentMetrics.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({paymentMetrics.countPago} Pagos)
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                        € {paymentMetrics.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({paymentMetrics.countPendente} Pendentes)
                                    </span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                <Banknote className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Filter & Action Toolbar Section (2 Spacious, Organized Rows) */}
            <Card className="shrink-0 border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-3.5 space-y-3">
                    {/* LINHA 1: TODOS OS FILTROS & BUSCA DO TRABALHADOR */}
                    <div className="flex flex-wrap items-end gap-3 w-full">
                        {/* Mês de Competência */}
                        <div className="w-[170px] shrink-0 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mês de Competência</Label>
                            <Select value={mesReferencia} onValueChange={setMesReferencia}>
                                <SelectTrigger className="w-full h-9 text-xs bg-slate-50/80 dark:bg-slate-800 font-semibold border-slate-200 dark:border-slate-700">
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
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

                        {/* Cliente (Largo e Espaçoso!) */}
                        <div className="min-w-[220px] flex-1 max-w-[320px] space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cliente</Label>
                            <Combobox
                                className="bg-slate-50/80 dark:bg-slate-800 h-9 text-xs font-medium border-slate-200 dark:border-slate-700"
                                options={clienteOptions}
                                value={clienteFilter}
                                onChange={(v) => setClienteFilter(v || 'all')}
                                placeholder="Todos os clientes"
                                emptyText="Nenhum cliente encontrado."
                            />
                        </div>

                        {/* Empresa / Contratante */}
                        <div className="w-[180px] shrink-0 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Empresa</Label>
                            <Combobox
                                className="bg-slate-50/80 dark:bg-slate-800 h-9 text-xs font-medium border-slate-200 dark:border-slate-700"
                                options={contratanteOptions}
                                value={contratanteFilter}
                                onChange={handleContratanteChange}
                                placeholder="Todas as empresas"
                                emptyText="Nenhuma empresa encontrada."
                            />
                        </div>

                        {/* Segurança Social */}
                        <div className="w-[160px] shrink-0 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Segurança</Label>
                            <Combobox
                                className="bg-slate-50/80 dark:bg-slate-800 h-9 text-xs font-medium border-slate-200 dark:border-slate-700"
                                options={seguridadOptions}
                                value={seguridadFilter}
                                onChange={(v) => setSeguridadFilter(v || 'all')}
                                placeholder="Todas as seguranças"
                                emptyText="Nenhum status encontrado."
                            />
                        </div>

                        {/* Exibir Colaboradores */}
                        <div className="w-[200px] shrink-0 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Exibir Colaboradores</Label>
                            <Select value={workerTypeFilter} onValueChange={(v: any) => setWorkerTypeFilter(v)}>
                                <SelectTrigger className="w-full h-9 text-xs bg-slate-50/80 dark:bg-slate-800 font-medium border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="only_hours">Apenas com Horas / Lançamentos</SelectItem>
                                    <SelectItem value="new_workers">Apenas Novos (Admitidos no Mês)</SelectItem>
                                    <SelectItem value="all">Todos os Colaboradores</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Pagamento */}
                        <div className="w-[160px] shrink-0 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status Pagamento</Label>
                            <Select value={paymentStatusFilter} onValueChange={(v: any) => setPaymentStatusFilter(v)}>
                                <SelectTrigger className="w-full h-9 text-xs bg-slate-50/80 dark:bg-slate-800 font-medium border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="pendente">⏳ Pendentes ({paymentMetrics.countPendente})</SelectItem>
                                    <SelectItem value="pago">🟢 Pagos ({paymentMetrics.countPago})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Buscar Trabalhador (Campo Largo e Espaçoso!) */}
                        <div className="min-w-[240px] flex-1 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Buscar Trabalhador</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por Nome, Código ou NISS..."
                                    className="pl-9 h-9 text-xs bg-slate-50/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 font-medium placeholder:text-muted-foreground/70"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* LINHA 2: BOTÕES DE AÇÃO E EXPORTAÇÃO EM DESTAQUE */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 px-3.5 border-amber-300 text-amber-900 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold shadow-2xs transition-all"
                                onClick={async () => {
                                    await refetchDbHours();
                                    toast.success('Horas e ajustes de faturamento sincronizados com sucesso!');
                                }}
                                disabled={isFetchingHours}
                                title="Recarregar ajustes de horas efetuados no módulo de Faturamento"
                            >
                                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-amber-600 ${isFetchingHours ? 'animate-spin' : ''}`} />
                                Sincronizar c/ Faturamento
                            </Button>

                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 px-3.5 border-emerald-300 text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-2xs transition-all"
                                onClick={() => handleExportBankTransfer()}
                                title="Exportar planilha formatada com IBAN e Valor Líquido para o Banco"
                            >
                                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                Planilha Banco
                            </Button>

                            <BatchHoleritesExportDialog
                                workers={filteredWorkers || []}
                                selectedWorkerIds={selectedWorkerIds}
                                mesReferencia={mesReferencia}
                                eventos={eventos || []}
                                dbHoursSummary={dbHoursSummary}
                                workerMonthlyActivityMap={dbHoursSummary?.workerMonthlyActivityMap}
                                housingBenefitsMap={housingBenefitsMap}
                                allDiscounts={allDiscounts}
                            />

                            <ExportHoleritesDialog
                                trigger={
                                    <Button size="sm" variant="outline" className="h-9 px-3.5 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-800 text-xs font-semibold shadow-2xs transition-all">
                                        <DownloadCloud className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                                        Exportar Dados (Excel)
                                    </Button>
                                }
                                workers={filteredWorkers || []}
                                mesReferencia={mesReferencia}
                                dbHoursSummary={dbHoursSummary}
                                workerIbansMap={workerIbansMap}
                                eventosMap={eventosMap}
                                workerMonthlyActivityMap={dbHoursSummary?.workerMonthlyActivityMap}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs">
                                {isLoadingWorkers ? '...' : sortedFolhaRows?.length || 0} de {totalCount} Item(ns) de Folha
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Batch Selection Action Bar */}
            {selectedWorkerIds.size > 0 && (
                <div className="shrink-0 bg-slate-900 text-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 px-2.5 py-1 text-xs font-bold shadow-xs">
                            {selectedWorkerIds.size} selecionado(s)
                        </Badge>
                        <span className="text-xs font-medium text-slate-300">
                            Total Líquido Selecionado: <strong className="text-emerald-400 font-mono text-sm font-bold">€ {selectedTotalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                        {selectedWorkerIds.size < (sortedFolhaRows?.length || 0) && (
                            <Button
                                size="sm"
                                variant="link"
                                onClick={handleSelectAllGlobal}
                                className="text-xs text-indigo-400 hover:text-indigo-300 p-0 h-auto font-medium underline"
                            >
                                Selecionar todos os {sortedFolhaRows?.length} da lista
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <BatchHoleritesExportDialog
                            trigger={
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 shadow-xs"
                                >
                                    <FileArchive className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
                                    Gerar Holerites ({selectedWorkerIds.size})
                                </Button>
                            }
                            workers={filteredWorkers || []}
                            selectedWorkerIds={selectedWorkerIds}
                            mesReferencia={mesReferencia}
                            eventos={eventos || []}
                            dbHoursSummary={dbHoursSummary}
                            workerMonthlyActivityMap={dbHoursSummary?.workerMonthlyActivityMap}
                            housingBenefitsMap={housingBenefitsMap}
                            allDiscounts={allDiscounts}
                        />
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleExportBankTransfer(selectedWorkersList)}
                            className="h-8 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600"
                        >
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            Gerar Planilha Banco ({selectedWorkerIds.size})
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Marcar como Pagos ({selectedWorkerIds.size})
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedWorkerIds(new Set())}
                            className="h-8 text-xs text-slate-400 hover:text-white"
                        >
                            Limpar Seleção
                        </Button>
                        </div>
                    </div>
                )}

                {/* Table & Pagination Container */}
                <div className="flex-1 min-h-0 bg-card rounded-md border shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="flex-1 overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-10 pl-4 pr-1">
                                        <Checkbox
                                            checked={
                                                paginatedFolhaRows && paginatedFolhaRows.length > 0 &&
                                                 paginatedFolhaRows.every(r => selectedWorkerIds.has(r.rowKey))
                                            }
                                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                            aria-label="Selecionar todos os visíveis"
                                        />
                                    </TableHead>
                                    <TableHead className="pl-2 font-semibold cursor-pointer select-none" onClick={() => handleSort('nome')}>
                                        <div className="flex items-center">Trabalhador {renderSortIcon('nome')}</div>
                                    </TableHead>
                                    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => handleSort('cliente_nombre')}>
                                        <div className="flex items-center">Cliente {renderSortIcon('cliente_nombre')}</div>
                                    </TableHead>
                                    <TableHead className="font-semibold select-none">Empresa</TableHead>
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
                                {isLoadingWorkers || isLoadingEventos || isLoadingStatus ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center h-24">Carregando trabalhadores e eventos...</TableCell>
                                    </TableRow>
                                ) : (!paginatedFolhaRows || paginatedFolhaRows.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                                            Nenhum trabalhador ativo ou pendente encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedFolhaRows?.map((row) => {
                                        const { worker, rowKey, empresaName, empresaId, isMultiCompanySplit, totalHoras, proventos, descontos, liquido, beneficiosFixos, descontosExtras, workerEvents, clientHoursBreakdown, cliente_nombre, isNewWorker } = row;
                                        const hasDataForMonth = workerEvents.length > 0 || beneficiosFixos.length > 0 || descontosExtras.length > 0;
                                        const isExpanded = expandedRows.has(rowKey);
                                        const clientStyle = getClientStyle(cliente_nombre);
                                        const ibanInfo = workerIbansMap?.get(row.workerId);

                                        return (
                                            <React.Fragment key={rowKey}>
                                                <TableRow 
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''} ${selectedWorkerIds.has(rowKey) ? 'bg-indigo-50/40 dark:bg-indigo-950/40' : ''}`}
                                                    onClick={() => toggleRow(rowKey)}
                                                >
                                                    <TableCell className="pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedWorkerIds.has(rowKey)}
                                                            onCheckedChange={() => handleToggleWorkerSelect(rowKey)}
                                                            aria-label={`Selecionar ${worker.nome}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pl-2 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-indigo-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                                    <span>{worker.nome}</span>
                                                                    {isNewWorker && (
                                                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] py-0 px-1.5 font-semibold">
                                                                            Novo no Mês
                                                                        </Badge>
                                                                    )}
                                                                    {isMultiCompanySplit && (
                                                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 text-[9px] py-0 px-1 font-bold">
                                                                            Folha {empresaName}
                                                                        </Badge>
                                                                    )}
                                                                    {getWorkerStatusBadge(worker, mesReferencia)}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                                                                    {worker.cod_colab && <span>Cód: {worker.cod_colab}</span>}
                                                                    {worker.data_ingresso && (
                                                                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                                                            • Início: {formatDateClean(worker.data_ingresso)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {clientHoursBreakdown && clientHoursBreakdown.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {clientHoursBreakdown.map((cb: any, idx: number) => (
                                                                    <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getClientStyle(cb.clientName).badge}`}>
                                                                        <Building2 className="h-2.5 w-2.5 mr-1 shrink-0 opacity-70" />
                                                                        {cb.clientName} ({formatHoursClean(cb.hours)}h)
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : cliente_nombre && cliente_nombre !== '-' ? (
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${clientStyle.badge}`}>
                                                                <Building2 className="h-3 w-3 mr-1.5 shrink-0 opacity-70" />
                                                                {cliente_nombre}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                                                            {empresaName || '-'}
                                                        </Badge>
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
                                                        {(() => {
                                                            const hStatus = holeritesStatusMap?.get(row.workerId);
                                                            const isPago = hStatus?.status === 'pago';

                                                            if (isPago) {
                                                                return (
                                                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-0.5 px-2 flex items-center gap-1 w-fit shadow-xs">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Pago
                                                                        {hStatus?.data_pagamento && (
                                                                            <span className="text-[9px] opacity-90 font-normal">
                                                                                ({formatDateClean(hStatus.data_pagamento)})
                                                                            </span>
                                                                        )}
                                                                    </Badge>
                                                                );
                                                            }

                                                            return (
                                                                <Badge variant="outline" className={hasDataForMonth ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold' : 'text-muted-foreground'}>
                                                                    {hasDataForMonth ? 'Valores Lançados' : 'Sem Lançamentos'}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        € {worker.worker_beneficios_settings?.tarifa_hora || '0.00'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">
                                                        {totalHoras > 0 ? (
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center gap-1 font-bold">
                                                                    <span>{formatHoursClean(totalHoras)} h</span>
                                                                    {dbHoursSummary?.adjustedWorkerIds?.has(row.workerId) && (
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className="bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[9px] py-0 px-1 font-extrabold"
                                                                            title={`Ajustado pelo Faturamento`}
                                                                        >
                                                                            Faturamento
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            '-'
                                                        )}
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
                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                            {(() => {
                                                                const hStatus = holeritesStatusMap?.get(row.workerId);
                                                                const isPago = hStatus?.status === 'pago';

                                                                if (isPago) {
                                                                    return (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => estornarPagamento({ workerId: row.workerId, holeriteId: hStatus?.id, mesReferencia })}
                                                                            disabled={isEstornarLoading}
                                                                            className="h-8 px-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                                                            title="Estornar status de pago para rascunho / lançado"
                                                                        >
                                                                            <RotateCcw className="h-3 w-3 mr-1" />
                                                                            Estornar
                                                                        </Button>
                                                                    );
                                                                }

                                                                return (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedWorkerIds(new Set([rowKey]));
                                                                            setIsPaymentModalOpen(true);
                                                                        }}
                                                                        className="h-8 px-2.5 text-[11px] font-bold border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                                                        title="Liquidar / Marcar como Pago individualmente"
                                                                    >
                                                                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                                                        Pagar
                                                                    </Button>
                                                                );
                                                            })()}

                                                            <HoleriteLancamentosSheet
                                                                worker={worker}
                                                                mesReferencia={mesReferencia}
                                                                targetEmpresaName={empresaName}
                                                                targetEmpresaId={empresaId}
                                                                eventosMensais={workerEvents}
                                                                extraDiscounts={descontosExtras}
                                                                onDeleteDiscount={deleteDiscount}
                                                                trigger={
                                                                    <Button size="sm" variant="outline" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 h-8 text-xs font-semibold">
                                                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                                                        Lançamentos
                                                                    </Button>
                                                                }
                                                            />

                                                            <PreviewHoleriteDialog
                                                                worker={worker}
                                                                mesReferencia={mesReferencia}
                                                                eventosMensais={workerEvents}
                                                                fallbackHours={totalHoras}
                                                                workerMonthlyActivity={{
                                                                    contratante: empresaName,
                                                                    cliente_nombre: cliente_nombre,
                                                                    clientHoursBreakdown: clientHoursBreakdown
                                                                }}
                                                                housingBenefitAmount={(beneficiosFixos || []).reduce((s: number, b: any) => s + Number(b.val || 0), 0)}
                                                                extraDiscounts={descontosExtras}
                                                                trigger={
                                                                    <Button size="sm" variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-8 text-xs font-semibold shadow-xs">
                                                                        {i18n.language.startsWith('es') ? 'Nómina' : 'Holerite'} {isMultiCompanySplit ? `(${empresaName})` : ''}
                                                                    </Button>
                                                                }
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {isExpanded && (
                                                    <TableRow className="bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                                        <TableCell colSpan={12} className="p-4 border-b">
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
                                                                                    onClick={(e) => handleCopyIban(row.workerId, ibanInfo.iban, e)}
                                                                                >
                                                                                    {copiedIbanId === row.workerId ? (
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
                                                                                Resumo da Folha ({empresaName} - Competência {mesReferencia})
                                                                            </span>
                                                                            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                                                                                Líquido: € {liquido.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                                            <div>
                                                                                <span className="text-muted-foreground block">Total Horas</span>
                                                                                <span className="font-bold text-slate-800 dark:text-slate-200">{formatHoursClean(totalHoras)} h</span>
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

                                                                        {/* Detalhamento de Horas por Cliente */}
                                                                        {clientHoursBreakdown && clientHoursBreakdown.length > 0 && (
                                                                            <div className="mt-2.5 pt-2.5 border-t text-xs space-y-1.5">
                                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                                                                                    Detalhamento das Obras / Clientes:
                                                                                </span>
                                                                                <div className="space-y-1">
                                                                                    {clientHoursBreakdown.map((cb: any, idx: number) => (
                                                                                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700/60">
                                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cb.clientName}</span>
                                                                                            <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatHoursClean(cb.hours)} h</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Detalhamento dos Lançamentos do Mês */}
                                                                {hasDataForMonth ? (
                                                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
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
                                                                                <TableHead className="text-right w-16">Ação</TableHead>
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
                                                                                    <TableCell className="text-right">
                                                                                        {evento.categoria !== 'total_horas' && (
                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                <EditHoleriteEventoDialog
                                                                                                    evento={evento}
                                                                                                    trigger={
                                                                                                        <Button
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                                                                                            title="Editar lançamento"
                                                                                                        >
                                                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                                                        </Button>
                                                                                                    }
                                                                                                />
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                                                                    onClick={() => {
                                                                                                        if (confirm(`Deseja remover o lançamento "${evento.categoria}" no valor de € ${Number(evento.valor).toFixed(2)} da folha deste colaborador?`)) {
                                                                                                            deleteEvento(evento.id, {
                                                                                                                onSuccess: () => toast.success('Lançamento removido da folha com sucesso!')
                                                                                                            });
                                                                                                        }
                                                                                                    }}
                                                                                                    title="Excluir lançamento da folha"
                                                                                                >
                                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        )}
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
                                                                                    <TableCell className="text-right text-muted-foreground text-[10px]">-</TableCell>
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
                                                                                    <TableCell className="text-right">
                                                                                        <div className="flex items-center justify-end gap-1">
                                                                                            <EditDiscountDialog
                                                                                                discount={d}
                                                                                                trigger={
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="icon"
                                                                                                        className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                                                                                        title="Editar desconto"
                                                                                                    >
                                                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                                                    </Button>
                                                                                                }
                                                                                            />
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                                                                onClick={() => {
                                                                                                    if (confirm(`Deseja remover o desconto "${d.category}" no valor de € ${Number(d.amount).toFixed(2)} deste colaborador?`)) {
                                                                                                        deleteDiscount(d.id, {
                                                                                                            onSuccess: () => toast.success('Desconto removido com sucesso!')
                                                                                                        });
                                                                                                    }
                                                                                                }}
                                                                                                title="Excluir desconto"
                                                                                            >
                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </TableCell>
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

            {/* Payment Confirmation Modal */}
            <PaymentConfirmModal
                open={isPaymentModalOpen}
                onOpenChange={setIsPaymentModalOpen}
                workerCount={selectedWorkerIds.size}
                totalAmount={selectedTotalLiquido}
                mesReferencia={mesReferencia}
                onConfirm={handleMarcarPagosConfirm}
                isLoading={isMarcarPagosLoading}
            />
        </div>
    );
}
