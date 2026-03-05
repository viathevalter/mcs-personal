import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import type { WorkerHour } from '../../shared/types/corePersonal';
import { toast } from 'sonner';
import { UploadComponent } from './UploadComponent';
import { CalendarDays, CheckCircle2, Clock, UploadCloud, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WorkerDashboardPage() {
    const { t, i18n } = useTranslation();
    const { workerAuth } = useOutletContext<{ workerAuth: any }>();
    const [pendingMonths, setPendingMonths] = useState<WorkerHour[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<WorkerHour | null>(null);

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

            // Verify if there is a record for the current month and previous month.
            // If not, we generate a pending record.
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
                const isAtivo = profile.status_trabajador?.toLowerCase().includes('at') ||
                    profile.status_trabajador?.toLowerCase().includes('ac');

                if (isAtivo) {
                    const profileRecords = allRecords.filter(r => r.worker_id === profile.id);
                    const hasCurrentMonth = profileRecords.some(r => r.period_year === currentYear && r.period_month === currentMonth);
                    const hasPrevMonth = profileRecords.some(r => r.period_year === prevYear && r.period_month === prevMonth);

                    const toInsert = [];
                    if (!hasCurrentMonth) {
                        toInsert.push({ empresa_id: profile.empresa_id, worker_id: profile.id, period_year: currentYear, period_month: currentMonth, status: 'pendente' });
                    }
                    if (!hasPrevMonth) {
                        toInsert.push({ empresa_id: profile.empresa_id, worker_id: profile.id, period_year: prevYear, period_month: prevMonth, status: 'pendente' });
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
            // Mantendo os registros com o status mais avançado se houver confusão.
            const statusWeight: Record<string, number> = { 'validado': 3, 'enviado': 2, 'pendente': 1 };
            const uniqueRecordsMap = new Map<string, WorkerHour>();

            for (const record of allRecords) {
                const key = `${record.period_year}-${record.period_month}-${record.worker_id}`;
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

            // Ordenar de forma decrescente (mais recente primeiro)
            allRecords.sort((a, b) => {
                if (a.period_year !== b.period_year) return b.period_year - a.period_year;
                return b.period_month - a.period_month;
            });

            setPendingMonths(allRecords);
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
        const locale = i18n.language.startsWith('es') ? 'es-ES' : 'pt-BR';
        return date.toLocaleString(locale, { month: 'long' }).toUpperCase();
    };

    const profiles = workerAuth.profiles && workerAuth.profiles.length > 0 ? workerAuth.profiles : [workerAuth];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('workerPortal.dashboard.title')}</h1>
                <p className="text-muted-foreground mt-1">
                    {t('workerPortal.dashboard.subtitle')}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : selectedPeriod ? (
                <UploadComponent
                    worker={profiles.find((p: any) => p.id === selectedPeriod.worker_id) || workerAuth}
                    period={selectedPeriod}
                    onCancel={() => setSelectedPeriod(null)}
                    onSuccess={handleUploadSuccess}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {pendingMonths.map((period) => (
                        <Card key={period.id} className={period.status === 'pendente' ? 'border-amber-200 bg-amber-50/30' : ''}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                                            {getMonthName(period.period_month)} {period.period_year}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('workerPortal.dashboard.clientLabel')} {profiles.find((p: any) => p.id === period.worker_id)?.cliente_nombre || 'N/A'}
                                        </CardDescription>
                                    </div>
                                    <StatusBadge status={period.status} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {period.status === 'pendente' && (
                                    <p className="text-sm text-amber-700 bg-amber-100/50 p-2 border border-amber-200 rounded-md flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {t('workerPortal.dashboard.statusInfo.pending')}
                                    </p>
                                )}
                                {period.status === 'enviado' && (
                                    <p className="text-sm text-blue-700 bg-blue-100/50 p-2 border border-blue-200 rounded-md flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {t('workerPortal.dashboard.statusInfo.sent')}
                                    </p>
                                )}
                                {period.status === 'validado' && (
                                    <p className="text-sm text-green-700 bg-green-100/50 p-2 border border-green-200 rounded-md gap-2 flex items-center">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {t('workerPortal.dashboard.statusInfo.validated')}
                                    </p>
                                )}
                            </CardContent>
                            {period.status === 'pendente' && (
                                <CardFooter>
                                    <Button onClick={() => setSelectedPeriod(period)} className="w-full gap-2">
                                        <UploadCloud className="h-4 w-4" /> {t('workerPortal.dashboard.btnUpload')}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))}

                    {pendingMonths.length === 0 && (
                        <div className="col-span-full text-center py-12 px-4 border border-dashed rounded-lg bg-slate-50">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <h3 className="text-lg font-medium">{t('workerPortal.dashboard.empty.title')}</h3>
                            <p className="text-muted-foreground">{t('workerPortal.dashboard.empty.desc')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    switch (status) {
        case 'pendente':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                    <Clock className="h-3 w-3" /> {t('workerPortal.dashboard.badge.pending')}
                </span>
            );
        case 'enviado':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
                    <CheckCircle2 className="h-3 w-3" /> {t('workerPortal.dashboard.badge.sent')}
                </span>
            );
        case 'validado':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
                    <CheckCircle2 className="h-3 w-3" /> {t('workerPortal.dashboard.badge.validated')}
                </span>
            );
        default:
            return null;
    }
}
