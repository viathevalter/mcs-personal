import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../shared/supabase/client';
import type { WorkerHour } from '../../../shared/types/corePersonal';
import type { TimesheetDayEntry } from '../services/timesheetPdfService';
import { toast } from 'sonner';

export interface WeekBreakdown {
    weekNumber: number;
    label: string;
    startDateStr: string;
    endDateStr: string;
    days: TimesheetDayEntry[];
    totalHours: number;
    daysWorked: number;
    pendingDays: number;
}

export function useWorkerTimesheet(workerAuth: any) {
    const [allPeriods, setAllPeriods] = useState<WorkerHour[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Ano e Mês selecionados (padrão: mês corrente)
    const [now, setNow] = useState<Date>(() => new Date());
    const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
    
    // Semana selecionada (padrão: semana atual de 0 a N dentro do mês ou offset)
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

    const profiles = useMemo(() => {
        if (!workerAuth) return [];
        return workerAuth.profiles && workerAuth.profiles.length > 0 ? workerAuth.profiles : [workerAuth];
    }, [workerAuth]);

    const activeProfile = useMemo(() => {
        return profiles[0] || workerAuth;
    }, [profiles, workerAuth]);

    // Carregar registros do banco
    const loadPeriods = useCallback(async () => {
        if (!activeProfile?.id) return;
        try {
            setLoading(true);
            const workerIds = profiles.map((p: any) => p.id);

            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .select('*')
                .in('worker_id', workerIds)
                .order('period_year', { ascending: false })
                .order('period_month', { ascending: false });

            if (error) throw error;

            let records = data || [];

            // Garantir que exista um registro para o mês corrente
            const thisYr = now.getFullYear();
            const thisMo = now.getMonth() + 1;

            const hasCurrent = records.some(
                r => r.period_year === thisYr && r.period_month === thisMo && r.worker_id === activeProfile.id
            );

            if (!hasCurrent) {
                const { data: created, error: createErr } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .insert({
                        worker_id: activeProfile.id,
                        empresa_id: activeProfile.empresa_id,
                        period_year: thisYr,
                        period_month: thisMo,
                        cliente_nombre: activeProfile.cliente || 'CLIENTE GERAL',
                        contratante: activeProfile.contratante || activeProfile.empresa_nome || 'MCS Personal',
                        status: 'pendente',
                        apontamentos_diarios: []
                    })
                    .select()
                    .single();

                if (!createErr && created) {
                    records = [created, ...records];
                }
            }

            setAllPeriods(records);
        } catch (err: any) {
            console.error('Erro ao carregar apontamentos:', err);
            toast.error('Erro ao carregar dados de horas.');
        } finally {
            setLoading(false);
        }
    }, [activeProfile, profiles]);

    useEffect(() => {
        loadPeriods();
    }, [loadPeriods]);

    // Ouvintes de ciclo de vida para dispositivos móveis (especialmente iPhone / iOS Safari)
    // Garante que ao desbloquear o ecrã ou voltar ao navegador os dados e data actual sejam recalculados
    useEffect(() => {
        const handleSync = () => {
            const fresh = new Date();
            setNow(fresh);
            loadPeriods();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleSync();
            }
        };

        const handlePageShow = () => {
            handleSync();
        };

        const handleFocus = () => {
            setNow(new Date());
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('focus', handleFocus);

        // Timer leve a cada 30s para atualizar o relógio interno caso fique aberto
        const intervalTimer = setInterval(() => {
            setNow(new Date());
        }, 30000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('focus', handleFocus);
            clearInterval(intervalTimer);
        };
    }, [loadPeriods]);

    // Período selecionado
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

    const selectedPeriod = useMemo(() => {
        if (selectedPeriodId) {
            const match = allPeriods.find(p => p.id === selectedPeriodId);
            if (match) return match;
        }
        return allPeriods.find(
            p => p.period_year === currentYear && p.period_month === currentMonth && p.worker_id === activeProfile.id
        ) || allPeriods[0] || null;
    }, [allPeriods, selectedPeriodId, currentYear, currentMonth, activeProfile]);

    // Obras / Locais de Trabalho do cliente selecionado
    const [availableObras, setAvailableObras] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingObras, setLoadingObras] = useState(false);

    useEffect(() => {
        if (!selectedPeriod?.cliente_nombre && !selectedPeriod?.empresa_id) {
            setAvailableObras([]);
            return;
        }

        const fetchSites = async () => {
            try {
                setLoadingObras(true);
                const { data, error } = await supabase.rpc('get_client_sites_portal', {
                    p_cliente_nombre: selectedPeriod.cliente_nombre || null,
                    p_empresa_id: selectedPeriod.empresa_id || null,
                    p_cliente_id: (selectedPeriod as any).cliente_id || null
                });

                if (!error && data?.sites && Array.isArray(data.sites)) {
                    const seen = new Set<string>();
                    const deduplicated = data.sites.filter((site: any) => {
                        const key = (site.name || '').trim().toLowerCase();
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    setAvailableObras(deduplicated);
                } else {
                    setAvailableObras([]);
                }
            } catch (err) {
                console.warn('Erro ao carregar obras do cliente:', err);
                setAvailableObras([]);
            } finally {
                setLoadingObras(false);
            }
        };

        fetchSites();
    }, [selectedPeriod?.cliente_nombre, selectedPeriod?.empresa_id, (selectedPeriod as any)?.cliente_id]);

    const defaultObra = useMemo(() => {
        if (availableObras.length > 0) return availableObras[0].name;
        return '';
    }, [availableObras]);

    // Parse dos dias do mês com saneamento rigoroso de obras
    const days = useMemo<TimesheetDayEntry[]>(() => {
        if (!selectedPeriod) return [];
        const numDays = new Date(selectedPeriod.period_year, selectedPeriod.period_month, 0).getDate();
        
        let existing: any[] = [];
        const raw = selectedPeriod.apontamentos_diarios;
        if (Array.isArray(raw)) existing = raw;
        else if (typeof raw === 'string') {
            try { existing = JSON.parse(raw); } catch { existing = []; }
        }

        const fallbackObra = availableObras.length > 0 ? availableObras[0].name : '';

        // Função para garantir que o NOME DO CLIENTE corporativo NUNCA seja exibido como obra
        const sanitizeObra = (rawObra?: string) => {
            const clean = (rawObra || '').trim();
            const clientNameClean = (selectedPeriod?.cliente_nombre || workerAuth?.cliente || '').trim().toLowerCase();
            const isClientName = clientNameClean && clean.toLowerCase() === clientNameClean;

            if (availableObras.length > 0) {
                // Se a obra armazenada era o nome do cliente ou vazia, substitui pela primeira obra real
                if (isClientName || !clean) {
                    return availableObras[0].name;
                }
                const match = availableObras.find(s => s.name.trim().toLowerCase() === clean.toLowerCase());
                if (match) return match.name;
                return availableObras[0].name;
            }
            return isClientName ? '' : clean;
        };

        const result: TimesheetDayEntry[] = [];
        for (let d = 1; d <= numDays; d++) {
            const found = existing.find(item => Number(item.dia ?? item.day) === d);
            const dateObj = new Date(selectedPeriod.period_year, selectedPeriod.period_month - 1, d);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            if (found) {
                const norm = Number(found.horasNormais ?? found.horas_normais ?? 0);
                const not = Number(found.horasNoturnas ?? found.horas_noturnas ?? 0);
                const tot = Number(found.totalHoras ?? found.total_horas ?? (norm + not));
                const entryObra = sanitizeObra(found.obra);
                const matchedSite = availableObras.find(s => s.name.trim().toLowerCase() === entryObra.trim().toLowerCase());

                result.push({
                    dia: d,
                    entrada: found.entrada || found.inicio || (isWeekend ? '' : '08:00'),
                    saida: found.saida || found.fim || (isWeekend ? '' : '17:00'),
                    horasNormais: norm,
                    horasNoturnas: not,
                    totalHoras: tot,
                    obra: entryObra,
                    obra_id: found.obra_id || matchedSite?.id || '',
                    obs: found.obs || (isWeekend && tot === 0 ? 'Descanso' : '')
                });
            } else {
                const matchedSite = availableObras.find(s => s.name.trim().toLowerCase() === fallbackObra.trim().toLowerCase());
                result.push({
                    dia: d,
                    entrada: isWeekend ? '' : '08:00',
                    saida: isWeekend ? '' : '17:00',
                    horasNormais: 0,
                    horasNoturnas: 0,
                    totalHoras: 0,
                    obra: fallbackObra,
                    obra_id: matchedSite?.id || '',
                    obs: isWeekend ? 'Descanso' : ''
                });
            }
        }
        return result;
    }, [selectedPeriod, availableObras, workerAuth?.cliente]);

    // Dia de Hoje
    const todayDayNumber = now.getFullYear() === currentYear && (now.getMonth() + 1) === currentMonth ? now.getDate() : null;
    const todayEntry = useMemo(() => {
        if (!todayDayNumber) return null;
        return days.find(d => d.dia === todayDayNumber) || null;
    }, [days, todayDayNumber]);

    const todayIsFilled = useMemo(() => {
        if (!todayEntry) return false;
        return Number(todayEntry.totalHoras || 0) > 0 || todayEntry.obs === 'Descanso' || todayEntry.obs === 'Folga';
    }, [todayEntry]);

    // Agrupamento por Semanas (Segunda a Domingo)
    const weeks = useMemo<WeekBreakdown[]>(() => {
        if (!selectedPeriod || days.length === 0) return [];
        const numDays = days.length;
        const result: WeekBreakdown[] = [];

        let currentWeekDays: TimesheetDayEntry[] = [];
        let weekCounter = 1;

        for (let i = 0; i < numDays; i++) {
            const entry = days[i];
            const dateObj = new Date(selectedPeriod.period_year, selectedPeriod.period_month - 1, entry.dia);
            const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.

            currentWeekDays.push(entry);

            // Domingo ou último dia do mês fecha a semana
            if (dayOfWeek === 0 || i === numDays - 1) {
                const firstD = currentWeekDays[0].dia;
                const lastD = currentWeekDays[currentWeekDays.length - 1].dia;
                
                // Calcular semana do ano
                const startOfYear = new Date(selectedPeriod.period_year, 0, 1);
                const pastDaysOfYear = (dateObj.getTime() - startOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

                const totalH = currentWeekDays.reduce((acc, d) => acc + Number(d.totalHoras || 0), 0);
                const workedDays = currentWeekDays.filter(d => Number(d.totalHoras || 0) > 0).length;

                // Dias pendentes na semana (dias úteis passados com 0 horas)
                const pendingDays = currentWeekDays.filter(d => {
                    const dObj = new Date(selectedPeriod.period_year, selectedPeriod.period_month - 1, d.dia);
                    const isWknd = dObj.getDay() === 0 || dObj.getDay() === 6;
                    const isPast = dObj <= now;
                    return !isWknd && isPast && Number(d.totalHoras || 0) === 0 && d.obs !== 'Descanso' && d.obs !== 'Folga';
                }).length;

                result.push({
                    weekNumber: weekNum || weekCounter,
                    label: `Semana ${weekNum || weekCounter}`,
                    startDateStr: `${String(firstD).padStart(2, '0')}/${String(selectedPeriod.period_month).padStart(2, '0')}`,
                    endDateStr: `${String(lastD).padStart(2, '0')}/${String(selectedPeriod.period_month).padStart(2, '0')}`,
                    days: [...currentWeekDays],
                    totalHours: totalH,
                    daysWorked: workedDays,
                    pendingDays
                });

                currentWeekDays = [];
                weekCounter++;
            }
        }

        return result;
    }, [selectedPeriod, days, now]);

    // Semana atual selecionada
    useEffect(() => {
        if (weeks.length > 0 && todayDayNumber) {
            const idx = weeks.findIndex(w => w.days.some(d => d.dia === todayDayNumber));
            if (idx !== -1) {
                setSelectedWeekIndex(idx);
            }
        }
    }, [weeks, todayDayNumber]);

    const activeWeek = useMemo(() => {
        if (weeks.length === 0) return null;
        const validIdx = Math.max(0, Math.min(selectedWeekIndex, weeks.length - 1));
        return weeks[validIdx];
    }, [weeks, selectedWeekIndex]);

    // Estatísticas Mensais
    const monthlyStats = useMemo(() => {
        const totalHours = days.reduce((acc, d) => acc + Number(d.totalHoras || 0), 0);
        const totalNormais = days.reduce((acc, d) => acc + Number(d.horasNormais || 0), 0);
        const totalNoturnas = days.reduce((acc, d) => acc + Number(d.horasNoturnas || 0), 0);
        const daysWorked = days.filter(d => Number(d.totalHoras || 0) > 0).length;

        // Pendentes: dias úteis passados com 0 horas
        const pendingDays = days.filter(d => {
            if (!selectedPeriod) return false;
            const dObj = new Date(selectedPeriod.period_year, selectedPeriod.period_month - 1, d.dia);
            const isWknd = dObj.getDay() === 0 || dObj.getDay() === 6;
            const isPast = dObj <= now;
            return !isWknd && isPast && Number(d.totalHoras || 0) === 0 && d.obs !== 'Descanso' && d.obs !== 'Folga';
        }).length;

        return {
            totalHours,
            totalNormais,
            totalNoturnas,
            daysWorked,
            pendingDays
        };
    }, [days, selectedPeriod, now]);

    // Primeiro dia pendente antes de hoje (para o banner de alerta)
    const firstPendingDay = useMemo<number | null>(() => {
        if (!selectedPeriod) return null;
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        const pastPending = days.filter(d => {
            const dObj = new Date(selectedPeriod.period_year, selectedPeriod.period_month - 1, d.dia);
            const isWknd = dObj.getDay() === 0 || dObj.getDay() === 6;
            return !isWknd && dObj <= yesterday && Number(d.totalHoras || 0) === 0 && d.obs !== 'Descanso' && d.obs !== 'Folga';
        });

        if (pastPending.length === 0) return null;
        // Retornar o número do dia mais recente pendente
        return Number(pastPending[pastPending.length - 1].dia);
    }, [days, selectedPeriod, now]);

    // SALVAR APONTAMENTO DIÁRIO
    const saveDayEntry = async (entry: TimesheetDayEntry) => {
        if (!selectedPeriod) return;

        const targetDia = Number(entry.dia);
        const cleanEntry: TimesheetDayEntry = {
            ...entry,
            dia: targetDia
        };

        // Atualizar lista local de dias
        const updatedDays = days.map(d => Number(d.dia) === targetDia ? cleanEntry : d);
        
        // Calcular totais
        const normais = updatedDays.reduce((acc, d) => acc + Number(d.horasNormais || 0), 0);
        const noturnas = updatedDays.reduce((acc, d) => acc + Number(d.horasNoturnas || 0), 0);
        const totais = updatedDays.reduce((acc, d) => acc + Number(d.totalHoras || 0), 0);

        const formattedPayload = updatedDays.map(d => {
            const siteMatch = availableObras.find(s => s.name.trim().toLowerCase() === (d.obra || '').trim().toLowerCase());
            return {
                dia: d.dia,
                day: d.dia,
                entrada: d.entrada || '',
                saida: d.saida || '',
                horasNormais: Number(d.horasNormais || 0),
                horas_normais: Number(d.horasNormais || 0),
                horasNoturnas: Number(d.horasNoturnas || 0),
                horas_noturnas: Number(d.horasNoturnas || 0),
                totalHoras: Number(d.totalHoras || 0),
                total_horas: Number(d.totalHoras || 0),
                obra: d.obra || '',
                obra_id: d.obra_id || siteMatch?.id || '',
                obs: d.obs || ''
            };
        });

        try {
            // Atualizar banco via Supabase
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({
                    apontamentos_diarios: formattedPayload,
                    total_horas_normais: normais,
                    total_horas_noturnas: noturnas,
                    horas_totais: totais,
                    status: selectedPeriod.status === 'pendente' ? 'em_andamento' : selectedPeriod.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPeriod.id);

            if (error) throw error;

            // Atualizar estado em memória
            setAllPeriods(prev => prev.map(p => {
                if (p.id === selectedPeriod.id) {
                    return {
                        ...p,
                        apontamentos_diarios: formattedPayload,
                        total_horas_normais: normais,
                        total_horas_noturnas: noturnas,
                        horas_totais: totais,
                        status: p.status === 'pendente' ? 'em_andamento' : p.status,
                        updated_at: new Date().toISOString()
                    };
                }
                return p;
            }));

            toast.success(`${entry.totalHoras > 0 ? `${entry.totalHoras} h salvas` : 'Dia registrado'} com sucesso!`);
        } catch (err: any) {
            console.error('Erro ao salvar dia:', err);
            toast.error(err.message || 'Erro ao gravar apontamento.');
        }
    };

    // ELIMINAR / ZERAR DIA
    const deleteDayEntry = async (dia: number) => {
        const fallbackSite = availableObras.length > 0 ? availableObras[0].name : '';
        const cleared: TimesheetDayEntry = {
            dia,
            entrada: '',
            saida: '',
            horasNormais: 0,
            horasNoturnas: 0,
            totalHoras: 0,
            obra: fallbackSite,
            obra_id: availableObras.find(s => s.name === fallbackSite)?.id || '',
            obs: ''
        };
        await saveDayEntry(cleared);
    };

    // MUDAR MÊS / ANO
    const setMonthYear = (month: number, year: number) => {
        setSelectedPeriodId(null);
        setCurrentMonth(month);
        setCurrentYear(year);
        setSelectedWeekIndex(0);
    };

    return {
        allPeriods,
        selectedPeriod,
        selectedPeriodId,
        setSelectedPeriodId,
        loading,
        currentYear,
        currentMonth,
        days,
        weeks,
        activeWeek,
        selectedWeekIndex,
        setSelectedWeekIndex,
        todayDayNumber,
        todayEntry,
        todayIsFilled,
        monthlyStats,
        firstPendingDay,
        saveDayEntry,
        deleteDayEntry,
        setMonthYear,
        availableObras,
        defaultObra,
        loadingObras,
        reload: loadPeriods
    };
}
