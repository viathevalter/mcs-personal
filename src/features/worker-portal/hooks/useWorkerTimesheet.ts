import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

    const hasAutoSelectedMonthRef = useRef(false);

    const resolveEmpresaId = useCallback((contratanteStr?: string | null, fallbackRecords?: WorkerHour[]): string => {
        const c = (contratanteStr || activeProfile?.contratante || activeProfile?.empresa_nome || '').trim().toLowerCase();
        if (c.includes('luminous') || c.includes('luminus')) return '847796c4-b253-4e53-9e6b-34a127ec7d85';
        if (c.includes('stocco')) return '441f1f5d-aed3-40e3-8c77-7b1217757251';
        if (c.includes('wiseowe')) return 'dae64d51-2181-4510-b14f-e63d2f111a8e';
        if (c.includes('triangulo') || c.includes('triângulo')) return 'a798620a-358a-4c6c-9db2-3a507c583cac';
        if (c.includes('hexagon') || c === 'hex') return '2c944db5-f1d0-4789-a562-8cfa1c0155b7';
        if (c.includes('rosas') || c.includes('kotrik')) return 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf';
        const prevWithHours = fallbackRecords?.find(r => r.empresa_id && r.empresa_id !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d');
        if (prevWithHours?.empresa_id) return prevWithHours.empresa_id;
        return activeProfile?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';
    }, [activeProfile]);

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

            const thisYr = now.getFullYear();
            const thisMo = now.getMonth() + 1;
            const prevMo = thisMo === 1 ? 12 : thisMo - 1;
            const prevYr = thisMo === 1 ? thisYr - 1 : thisYr;

            const resolvedEmpId = resolveEmpresaId(activeProfile.contratante, records);
            const lastKnownClient = records.find(r => r.cliente_nombre && r.cliente_nombre !== 'CLIENTE GERAL' && r.cliente_nombre !== 'NÃO DEFINIDO')?.cliente_nombre;
            const defaultClient = activeProfile.cliente || lastKnownClient || 'CLIENTE GERAL';
            const defaultContratante = activeProfile.contratante || activeProfile.empresa_nome || 'MCS Personal';

            const hasPrev = records.some(
                r => r.period_year === prevYr && r.period_month === prevMo && r.worker_id === activeProfile.id
            );

            if (!hasPrev) {
                const { data: createdPrev, error: prevErr } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .insert({
                        worker_id: activeProfile.id,
                        empresa_id: resolvedEmpId,
                        period_year: prevYr,
                        period_month: prevMo,
                        cliente_nombre: defaultClient,
                        contratante: defaultContratante,
                        status: 'pendente',
                        apontamentos_diarios: []
                    })
                    .select()
                    .single();

                if (!prevErr && createdPrev) {
                    records = [createdPrev, ...records];
                }
            }

            const hasCurrent = records.some(
                r => r.period_year === thisYr && r.period_month === thisMo && r.worker_id === activeProfile.id
            );

            if (!hasCurrent) {
                const { data: created, error: createErr } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .insert({
                        worker_id: activeProfile.id,
                        empresa_id: resolvedEmpId,
                        period_year: thisYr,
                        period_month: thisMo,
                        cliente_nombre: defaultClient,
                        contratante: defaultContratante,
                        status: 'pendente',
                        apontamentos_diarios: []
                    })
                    .select()
                    .single();

                if (!createErr && created) {
                    records = [created, ...records];
                }
            }

            if (!hasAutoSelectedMonthRef.current) {
                hasAutoSelectedMonthRef.current = true;
                const prevRecords = records.filter(r => r.period_year === prevYr && r.period_month === prevMo && r.worker_id === activeProfile.id);
                const currRecords = records.filter(r => r.period_year === thisYr && r.period_month === thisMo && r.worker_id === activeProfile.id);

                const prevSubmittedOrValidated = prevRecords.some(r =>
                    r.status === 'validado' ||
                    r.status === 'enviado' ||
                    r.status === 'processado' ||
                    r.status === 'assinado_encarregado' ||
                    r.status === 'aguardando_assinatura' ||
                    Boolean(r.file_url)
                );
                const currHasHours = currRecords.some(r =>
                    Number(r.horas_totais || 0) > 0 ||
                    (Array.isArray(r.apontamentos_diarios) && r.apontamentos_diarios.some((d: any) => Number(d.totalHoras ?? d.total_horas ?? 0) > 0))
                );

                if (now.getDate() <= 10 && !prevSubmittedOrValidated && !currHasHours) {
                    setCurrentYear(prevYr);
                    setCurrentMonth(prevMo);
                }
            }

            setAllPeriods(records);
        } catch (err: any) {
            console.error('Erro ao carregar apontamentos:', err);
            toast.error('Erro ao carregar dados de horas.');
        } finally {
            setLoading(false);
        }
    }, [activeProfile, profiles, now, resolveEmpresaId]);

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
            const match = allPeriods.find(
                p => p.id === selectedPeriodId && p.period_year === currentYear && p.period_month === currentMonth
            );
            if (match) return match;
        }
        const candidates = allPeriods.filter(
            p => p.period_year === currentYear && p.period_month === currentMonth && p.worker_id === activeProfile.id
        );
        if (candidates.length > 0) {
            const targetCli = (activeProfile.cliente || activeProfile.cliente_nombre || '').trim().toLowerCase();
            candidates.sort((a, b) => {
                const aHas = Number((a as any).horas_totais || 0) > 0 || (Array.isArray(a.apontamentos_diarios) && a.apontamentos_diarios.length > 0) ? 1 : 0;
                const bHas = Number((b as any).horas_totais || 0) > 0 || (Array.isArray(b.apontamentos_diarios) && b.apontamentos_diarios.length > 0) ? 1 : 0;
                if (aHas !== bHas) return bHas - aHas;
                const aCli = targetCli && (a.cliente_nombre || '').trim().toLowerCase() === targetCli ? 1 : 0;
                const bCli = targetCli && (b.cliente_nombre || '').trim().toLowerCase() === targetCli ? 1 : 0;
                return bCli - aCli;
            });
            return candidates[0];
        }
        return null;
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
        const targetYear = selectedPeriod?.period_year ?? currentYear;
        const targetMonth = selectedPeriod?.period_month ?? currentMonth;
        const numDays = new Date(targetYear, targetMonth, 0).getDate();
        
        let existing: any[] = [];
        const raw = selectedPeriod?.apontamentos_diarios;
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
            const dateObj = new Date(targetYear, targetMonth - 1, d);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            if (found) {
                const norm = Number(found.horasNormais ?? found.horas_normais ?? 0);
                const not = Number(found.horasNoturnas ?? found.horas_noturnas ?? 0);
                const tot = Number(found.totalHoras ?? found.total_horas ?? (norm + not));
                const entryObra = sanitizeObra(found.obra);
                const matchedSite = availableObras.find(s => s.name.trim().toLowerCase() === entryObra.trim().toLowerCase());

                result.push({
                    dia: d,
                    entrada: tot > 0 ? (found.entrada || found.inicio || '08:00') : '',
                    saida: tot > 0 ? (found.saida || found.fim || '17:00') : '',
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
                    entrada: '',
                    saida: '',
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
    }, [selectedPeriod, currentYear, currentMonth, availableObras, workerAuth?.cliente]);

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

    // SALVAR APONTAMENTO DIÁRIO (permitido em todos os dias do mês corrente)
    const saveDayEntry = async (entry: TimesheetDayEntry) => {
        if (!selectedPeriod) {
            toast.error('Nenhum período selecionado.');
            return;
        }

        if (selectedPeriod.status === 'validado') {
            toast.error('Esta folha de horas já foi validada e está bloqueada para alterações.');
            return;
        }

        const targetDia = Number(entry.dia);

        const cleanEntry: TimesheetDayEntry = {
            ...entry,
            dia: targetDia,
            entrada: Number(entry.totalHoras || 0) > 0 ? (entry.entrada || '') : '',
            saida: Number(entry.totalHoras || 0) > 0 ? (entry.saida || '') : ''
        };

        // Atualizar lista local de dias
        const updatedDays = days.map(d => Number(d.dia) === targetDia ? cleanEntry : d);
        
        // Calcular totais
        const normais = updatedDays.reduce((acc, d) => acc + Number(d.horasNormais || 0), 0);
        const noturnas = updatedDays.reduce((acc, d) => acc + Number(d.horasNoturnas || 0), 0);
        const totais = updatedDays.reduce((acc, d) => acc + Number(d.totalHoras || 0), 0);

        const formattedPayload = updatedDays.map(d => {
            const siteMatch = availableObras.find(s => s.name.trim().toLowerCase() === (d.obra || '').trim().toLowerCase());
            const dayTot = Number(d.totalHoras || 0);
            return {
                dia: d.dia,
                day: d.dia,
                entrada: dayTot > 0 ? (d.entrada || '') : '',
                saida: dayTot > 0 ? (d.saida || '') : '',
                horasNormais: Number(d.horasNormais || 0),
                horas_normais: Number(d.horasNormais || 0),
                horasNoturnas: Number(d.horasNoturnas || 0),
                horas_noturnas: Number(d.horasNoturnas || 0),
                totalHoras: dayTot,
                total_horas: dayTot,
                obra: d.obra || '',
                obra_id: d.obra_id || siteMatch?.id || '',
                obs: d.obs || ''
            };
        });

        try {
            const nextStatus = (selectedPeriod.status === 'pendente' || (selectedPeriod.status === 'processado' && !selectedPeriod.file_url))
                ? 'em_andamento'
                : selectedPeriod.status;

            const resolvedCliente = (!selectedPeriod.cliente_nombre || selectedPeriod.cliente_nombre === 'CLIENTE GERAL' || selectedPeriod.cliente_nombre === 'NÃO DEFINIDO')
                ? (activeProfile.cliente || activeProfile.cliente_nombre || selectedPeriod.cliente_nombre)
                : selectedPeriod.cliente_nombre;

            const resolvedContratante = selectedPeriod.contratante || activeProfile.contratante || activeProfile.empresa_nome || null;

            // Atualizar banco via Supabase
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({
                    apontamentos_diarios: formattedPayload,
                    total_horas_normais: normais,
                    total_horas_noturnas: noturnas,
                    horas_totais: totais,
                    status: nextStatus,
                    cliente_nombre: resolvedCliente,
                    contratante: resolvedContratante,
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
                        status: nextStatus,
                        cliente_nombre: resolvedCliente,
                        contratante: resolvedContratante,
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

    // MUDAR MÊS / ANO (bloqueia meses futuros)
    const setMonthYear = (month: number, year: number) => {
        const realNow = new Date();
        const realYear = realNow.getFullYear();
        const realMonth = realNow.getMonth() + 1;

        if (year > realYear || (year === realYear && month > realMonth)) {
            toast.warning('Não é permitido visualizar ou lançar horas em meses futuros.');
            return;
        }

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
