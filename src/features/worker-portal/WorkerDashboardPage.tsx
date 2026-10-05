import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import type { WorkerHour } from '../../shared/types/corePersonal';
import { toast } from 'sonner';
import { UploadComponent } from './UploadComponent';
import { WorkerTimesheetEditor } from './WorkerTimesheetEditor';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    UploadCloud,
    AlertCircle,
    Edit3,
    FileCheck,
    Sun,
    Moon,
    FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadTimesheetPdf, type TimesheetPdfData } from './services/timesheetPdfService';

export function WorkerDashboardPage() {
    const { t, i18n } = useTranslation();
    const { workerAuth } = useOutletContext<{ workerAuth: any }>();
    const [pendingMonths, setPendingMonths] = useState<WorkerHour[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<WorkerHour | null>(null);
    const [viewMode, setViewMode] = useState<'editor' | 'upload'>('editor');

    useEffect(() => {
        if (workerAuth) {
            fetchPendingHours();
        }
    }, [workerAuth]);

    const fetchPendingHours = async () => {
        try {
            setLoading(true);
            const profiles = workerAuth.profiles && workerAuth.profiles.length > 0 ? workerAuth.profiles : [workerAuth];
            const workerIds = profiles.map((p: any) => p.id);

            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .select('*')
                .in('worker_id', workerIds)
                .order('period_year', { ascending: false })
                .order('period_month', { ascending: false });

            if (error) throw error;

            // Fetch workers data (ingresso and baixa dates) as a fallback if not in the session profiles
            const { data: dbWorkers } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('id, data_ingresso, data_baixa, status_trabajador')
                .in('id', workerIds);

            // Verify if there is a record for the current month and previous month.
            const now = new Date();
            const currentMonth = now.getMonth() + 1; // 1-12
            const currentYear = now.getFullYear();

            let prevMonth = currentMonth - 1;
            let prevYear = currentYear;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear--;
            }

            let allRecords = data || [];

            // For each profile, evaluate if they are 'ativo'. If so, ensure current and prev month exist for THAT profile.
            for (const profile of profiles) {
                const dbWorker = dbWorkers?.find((w) => w.id === profile.id);
                const dataIngresso = profile.data_ingresso || dbWorker?.data_ingresso;
                const dataBaixa = profile.data_baixa || dbWorker?.data_baixa;
                const statusTrabajador = profile.status_trabajador || dbWorker?.status_trabajador || 'Ativo';

                const isAtivo =
                    statusTrabajador?.toLowerCase().includes('at') ||
                    statusTrabajador?.toLowerCase().includes('ac');

                let isEligibleCurrent = isAtivo;
                let isEligiblePrev = isAtivo;

                if (!isAtivo && dataBaixa) {
                    const baixaDate = new Date(dataBaixa + 'T00:00:00');
                    const baixaYear = baixaDate.getFullYear();
                    const baixaMonth = baixaDate.getMonth() + 1;

                    if (baixaYear > currentYear || (baixaYear === currentYear && baixaMonth >= currentMonth)) {
                        isEligibleCurrent = true;
                    }
                    if (baixaYear > prevYear || (baixaYear === prevYear && baixaMonth >= prevMonth)) {
                        isEligiblePrev = true;
                    }
                }

                if (isEligibleCurrent || isEligiblePrev) {
                    const profileRecords = allRecords.filter(
                        (r) => r.worker_id === profile.id && r.empresa_id === profile.empresa_id
                    );

                    // Fetch allocations for this worker to generate cards by client
                    const { data: allocations } = await supabase
                        .schema('core_personal')
                        .from('vw_worker_allocations')
                        .select('cliente_nombre, fechainiciopedido, fechafinpedido, fechasalidatrabajador')
                        .eq('cod_colab', profile.cod_colab);

                    const getClientsForPeriod = (yr: number, mo: number) => {
                        const start = new Date(yr, mo - 1, 1);
                        const end = new Date(yr, mo, 0);

                        const activeAllocations = (allocations || []).filter((alloc) => {
                            const allocStart = alloc.fechainiciopedido ? new Date(alloc.fechainiciopedido) : null;
                            const allocEnd = alloc.fechafinpedido ? new Date(alloc.fechafinpedido) : null;
                            const exitDate = alloc.fechasalidatrabajador ? new Date(alloc.fechasalidatrabajador) : null;

                            const actualEnd = exitDate || allocEnd;

                            const isAfterStart = !allocStart || allocStart <= end;
                            const isBeforeEnd = !actualEnd || actualEnd >= start;

                            return isAfterStart && isBeforeEnd;
                        });

                        if (activeAllocations.length === 0) {
                            return [profile.cliente_nombre || 'NÃO DEFINIDO'];
                        }

                        return Array.from(new Set(activeAllocations.map((a) => a.cliente_nombre).filter(Boolean)));
                    };

                    const toInsert = [];

                    if (isEligibleCurrent) {
                        const currentClients = getClientsForPeriod(currentYear, currentMonth);
                        for (const client of currentClients) {
                            const hasRecord = profileRecords.some(
                                (r) =>
                                    r.period_year === currentYear &&
                                    r.period_month === currentMonth &&
                                    (r.cliente_nombre === client || r.cliente_nombre === 'NÃO DEFINIDO')
                            );

                            let shouldHave = true;
                            if (dataIngresso) {
                                const admissionDate = new Date(dataIngresso);
                                const admissionYear = admissionDate.getFullYear();
                                const admissionMonth = admissionDate.getMonth() + 1;
                                shouldHave =
                                    admissionYear < currentYear ||
                                    (admissionYear === currentYear && admissionMonth <= currentMonth);
                            }
                            if (currentYear === 2026 && (currentMonth === 3 || currentMonth === 4)) {
                                shouldHave = false;
                            }

                            if (!hasRecord && shouldHave) {
                                toInsert.push({
                                    empresa_id: profile.empresa_id,
                                    worker_id: profile.id,
                                    period_year: currentYear,
                                    period_month: currentMonth,
                                    status: 'pendente',
                                    cliente_nombre: client
                                });
                            }
                        }
                    }

                    if (isEligiblePrev) {
                        const prevClients = getClientsForPeriod(prevYear, prevMonth);
                        for (const client of prevClients) {
                            const hasRecord = profileRecords.some(
                                (r) =>
                                    r.period_year === prevYear &&
                                    r.period_month === prevMonth &&
                                    (r.cliente_nombre === client || r.cliente_nombre === 'NÃO DEFINIDO')
                            );

                            let shouldHave = true;
                            if (dataIngresso) {
                                const admissionDate = new Date(dataIngresso);
                                const admissionYear = admissionDate.getFullYear();
                                const admissionMonth = admissionDate.getMonth() + 1;
                                shouldHave =
                                    admissionYear < prevYear ||
                                    (admissionYear === prevYear && admissionMonth <= prevMonth);
                            }
                            if (prevYear === 2026 && (prevMonth === 3 || prevMonth === 4)) {
                                shouldHave = false;
                            }

                            if (!hasRecord && shouldHave) {
                                toInsert.push({
                                    empresa_id: profile.empresa_id,
                                    worker_id: profile.id,
                                    period_year: prevYear,
                                    period_month: prevMonth,
                                    status: 'pendente',
                                    cliente_nombre: client
                                });
                            }
                        }
                    }

                    if (toInsert.length > 0) {
                        const { data: insertedRecords, error: insertError } = await supabase
                            .schema('core_personal')
                            .from('worker_hours')
                            .insert(toInsert)
                            .select();

                        if (!insertError && insertedRecords) {
                            allRecords = [...insertedRecords, ...allRecords];
                        }
                    }
                }
            }

            // Filtrar duplicatas geradas pela concorrência do React Strict Mode
            const statusWeight: Record<string, number> = {
                validado: 6,
                assinado_encarregado: 5,
                aguardando_assinatura: 4,
                processado: 3,
                enviado: 2,
                em_andamento: 1.5,
                pendente: 1
            };
            const uniqueRecordsMap = new Map<string, WorkerHour>();

            for (const record of allRecords) {
                const key = `${record.period_year}-${record.period_month}-${record.worker_id}-${record.empresa_id}`;
                const existing = uniqueRecordsMap.get(key);

                if (!existing) {
                    uniqueRecordsMap.set(key, record);
                } else {
                    const existingWeight = statusWeight[existing.status] || 0;
                    const newWeight = statusWeight[record.status] || 0;
                    if (newWeight > existingWeight) {
                        uniqueRecordsMap.set(key, record);
                    }
                }
            }

            allRecords = Array.from(uniqueRecordsMap.values());

            // Regra específica: bloquear envio (status pendente) para Março e Abril de 2026 no portal para todos
            allRecords = allRecords.filter((record) => {
                if (
                    record.period_year === 2026 &&
                    (record.period_month === 3 || record.period_month === 4) &&
                    record.status === 'pendente'
                ) {
                    return false;
                }
                return true;
            });

            // Ordenar de forma decrescente
            allRecords.sort((a, b) => {
                if (a.period_year !== b.period_year) return b.period_year - a.period_year;
                return b.period_month - a.period_month;
            });

            setPendingMonths(allRecords);
            setSelectedPeriod((curr) => {
                if (!curr) return null;
                const fresh = allRecords.find((r) => r.id === curr.id);
                return fresh || curr;
            });
        } catch (error) {
            console.error('Error fetching hours:', error);
            toast.error(t('workerPortal.dashboard.errorFetching'));
        } finally {
            setLoading(false);
        }
    };

    const handleUploadSuccess = () => {
        setSelectedPeriod(null);
        fetchPendingHours();
    };

    const getMonthName = (month: number) => {
        const date = new Date(2000, month - 1, 1);
        const locale = i18n.language.startsWith('es') ? 'es-ES' : 'pt-PT';
        return date.toLocaleString(locale, { month: 'long' }).toUpperCase();
    };

    const profiles = workerAuth.profiles && workerAuth.profiles.length > 0 ? workerAuth.profiles : [workerAuth];

    const handleDownloadQuickPdf = (period: WorkerHour) => {
        const profile = profiles.find((p: any) => p.id === period.worker_id) || workerAuth;
        const pdfData: TimesheetPdfData = {
            empresaNome: profile.empresa_nome || 'MCS Personal',
            empresaNif: profile.empresa_nif,
            workerNome: profile.nome,
            workerDoc: profile.pasaporte || profile.nie || 'N/A',
            workerFuncion: profile.funcion,
            clienteNome: period.cliente_nombre,
            mes: period.period_month,
            ano: period.period_year,
            apontamentos: (period.apontamentos_diarios as any[]) || [],
            totalNormais: Number(period.total_horas_normais || 0),
            totalNoturnas: Number(period.total_horas_noturnas || 0),
            totalGeral: Number(period.horas_totais || 0),
            encarregadoNome: period.encarregado_nome,
            signedAt: period.signed_at,
            signedIp: period.signed_ip,
            signatureImageUrl: period.signature_image_url
        };
        downloadTimesheetPdf(pdfData);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {t('workerPortal.dashboard.title')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('workerPortal.dashboard.subtitle')}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : selectedPeriod ? (
                viewMode === 'editor' ? (
                    <WorkerTimesheetEditor
                        worker={profiles.find((p: any) => p.id === selectedPeriod.worker_id) || workerAuth}
                        period={selectedPeriod}
                        onBack={() => setSelectedPeriod(null)}
                        onSaved={(updatedPeriod?: WorkerHour) => {
                            if (updatedPeriod) {
                                setSelectedPeriod(updatedPeriod);
                            }
                            fetchPendingHours();
                        }}
                        onSwitchToUpload={() => setViewMode('upload')}
                    />
                ) : (
                    <UploadComponent
                        worker={profiles.find((p: any) => p.id === selectedPeriod.worker_id) || workerAuth}
                        period={selectedPeriod}
                        onCancel={() => {
                            setViewMode('editor');
                            setSelectedPeriod(null);
                        }}
                        onSuccess={handleUploadSuccess}
                    />
                )
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {pendingMonths.map((period) => {
                        const totalNormais = Number(period.total_horas_normais || 0);
                        const totalNoturnas = Number(period.total_horas_noturnas || 0);
                        const totalGeral = Number(period.horas_totais || totalNormais + totalNoturnas);

                        const isPending = period.status === 'pendente';
                        const isDraft = period.status === 'em_andamento';
                        const isAwaitingSig = period.status === 'aguardando_assinatura';
                        const isSigned = period.status === 'assinado_encarregado';

                        return (
                            <Card
                                key={period.id}
                                className={`border transition-shadow hover:shadow-md ${
                                    isPending
                                        ? 'border-amber-200 bg-amber-50/20'
                                        : isSigned
                                        ? 'border-emerald-200 bg-emerald-50/10'
                                        : 'border-slate-200'
                                }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                                                <CalendarDays className="h-5 w-5 text-blue-600" />
                                                {getMonthName(period.period_month)} {period.period_year}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                {t('workerPortal.dashboard.clientLabel')} {period.cliente_nombre || 'N/A'}
                                            </CardDescription>
                                        </div>
                                        <StatusBadge status={period.status} />
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    {/* Hours Counter mini-grid */}
                                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-0.5">
                                                <Sun className="h-3 w-3 text-amber-500" /> Diurnas
                                            </span>
                                            <span className="text-sm font-bold text-slate-800">{totalNormais.toFixed(1)}h</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-sky-700 font-medium flex items-center justify-center gap-0.5">
                                                <Moon className="h-3 w-3 text-sky-600" /> Nocturnas
                                            </span>
                                            <span className="text-sm font-bold text-sky-900">{totalNoturnas.toFixed(1)}h</span>
                                        </div>
                                        <div className="bg-white rounded border border-slate-200">
                                            <span className="text-[10px] text-emerald-700 font-bold block">TOTAL</span>
                                            <span className="text-sm font-black text-emerald-900">{totalGeral.toFixed(1)}h</span>
                                        </div>
                                    </div>

                                    {/* Status Info Messages */}
                                    {isPending && (
                                        <p className="text-xs text-amber-800 bg-amber-100/60 p-2 border border-amber-200 rounded-md flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                            {t('workerPortal.dashboard.statusInfo.pending')}
                                        </p>
                                    )}
                                    {isDraft && (
                                        <p className="text-xs text-blue-800 bg-blue-100/60 p-2 border border-blue-200 rounded-md flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                            Rascunho gravado. Você pode continuar apontando as suas horas.
                                        </p>
                                    )}
                                    {isAwaitingSig && (
                                        <p className="text-xs text-purple-800 bg-purple-100/60 p-2 border border-purple-200 rounded-md flex items-center gap-1.5">
                                            <FileCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                            Link enviado ao encarregado. Aguardando assinatura com o código OTP.
                                        </p>
                                    )}
                                    {isSigned && (
                                        <p className="text-xs text-emerald-800 bg-emerald-100/60 p-2 border border-emerald-200 rounded-md flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                            Validado e assinado digitalmente pelo encarregado ({period.encarregado_nome || 'Supervisor'}).
                                        </p>
                                    )}
                                </CardContent>

                                <CardFooter className="pt-2 gap-2 flex-wrap">
                                    <Button
                                        onClick={() => {
                                            setViewMode('editor');
                                            setSelectedPeriod(period);
                                        }}
                                        className="flex-1 gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        {isSigned || period.status === 'validado' ? 'Ver Apontamentos' : 'Apontar / Editar Horas'}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDownloadQuickPdf(period)}
                                        title="Baixar Folha em PDF"
                                        className="h-9 w-9 border-slate-300"
                                    >
                                        <FileText className="h-4 w-4 text-slate-600" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}

                    {pendingMonths.length === 0 && (
                        <div className="col-span-full text-center py-16 px-4 border border-dashed rounded-xl bg-white shadow-sm">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-slate-800">
                                {t('workerPortal.dashboard.empty.title')}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                {t('workerPortal.dashboard.empty.desc')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'pendente':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                    <Clock className="h-3 w-3" /> Pendente
                </span>
            );
        case 'em_andamento':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                    <Clock className="h-3 w-3" /> Rascunho
                </span>
            );
        case 'aguardando_assinatura':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 border border-purple-200">
                    <Clock className="h-3 w-3" /> Aguard. Assinatura
                </span>
            );
        case 'assinado_encarregado':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Assinado
                </span>
            );
        case 'enviado':
        case 'processado':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                    <CheckCircle2 className="h-3 w-3" /> Enviado
                </span>
            );
        case 'validado':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Validado
                </span>
            );
        default:
            return null;
    }
}
