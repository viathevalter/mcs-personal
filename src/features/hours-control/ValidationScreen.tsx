import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Save, X, Sparkles, ZoomIn, ZoomOut, Maximize, Clock, Building2, Briefcase, User, Wrench, Calendar, CheckCircle2, FileText, Smartphone, RefreshCw, Sun, Moon } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../shared/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';

interface ValidationScreenProps {
    workerName?: string;
    workerCode?: string;
    workerFunction?: string;
    fileUrl?: string;
    fileName?: string;
    filePath?: string;
    workerId: string;
    recordId: string;
    contratante?: string;
    clienteNome?: string;
    empresaId: string;
    year: number;
    month: number;
    onClose?: () => void;
    onSuccess?: () => void;
}

interface DayRecord {
    day: number;
    weekday: string;
    inicio: string;
    fim: string;
    horasNormais: string;
    horasNoturnas: string;
    obra: string;
    totalHoras: string;
    dbRecordId?: string;
    isWeekend?: boolean;
}

const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const parseTimeToMinutes = (t: string): number | null => {
        const cleaned = t.trim().replace(':', '.');
        const parts = cleaned.split('.');
        if (parts.length === 1) {
            const hr = parseFloat(parts[0]);
            if (!isNaN(hr)) return hr * 60;
        } else if (parts.length === 2) {
            const hr = parseInt(parts[0], 10);
            const min = parseInt(parts[1], 10);
            if (!isNaN(hr) && !isNaN(min)) {
                return hr * 60 + min;
            }
        }
        return null;
    };

    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);
    
    if (startMin === null || endMin === null) return 0;
    
    let diffMin = endMin - startMin;
    if (diffMin < 0) {
        diffMin += 24 * 60; // spans midnight
    }
    
    return Math.round((diffMin / 60) * 100) / 100;
};

export function ValidationScreen({
    workerName = 'Trabalhador',
    workerCode,
    workerFunction,
    fileUrl,
    fileName,
    filePath,
    workerId,
    recordId,
    contratante,
    clienteNome,
    empresaId,
    year,
    month,
    onClose,
    onSuccess
}: ValidationScreenProps) {
    const { i18n } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    
    const [clientId, setClientId] = useState<string | null>(null);
    const [clientSites, setClientSites] = useState<{ id: string; name: string }[]>([]);
    const [loadingSites, setLoadingSites] = useState(true);
    const [workerFuncId, setWorkerFuncId] = useState<string | null>(null);
    const [jobFunctions, setJobFunctions] = useState<{ id: string; name: string }[]>([]);
    const [ocrSnapshot, setOcrSnapshot] = useState<Record<number, { inicio: string; fim: string; totalHoras: string }>>({});
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [portalDrafts, setPortalDrafts] = useState<any[]>([]);
    const [leftTab, setLeftTab] = useState<'document' | 'portal'>('document');
    const [supervisorSignature, setSupervisorSignature] = useState<{
        signedAt: string | null;
        signedIp: string | null;
        encarregadoNome: string | null;
        signatureImageUrl: string | null;
        status: string | null;
    } | null>(null);
    
    // For Setup Obra modal
    const [newSiteOpen, setNewSiteOpen] = useState(false);
    const [newSiteName, setNewSiteName] = useState('');
    const [creatingSite, setCreatingSite] = useState(false);
    const [setupRowDay, setSetupRowDay] = useState<number | null>(null);

    const isPdf = fileName?.toLowerCase().endsWith('.pdf') || fileUrl?.toLowerCase().includes('.pdf');
    
    const [records, setRecords] = useState<DayRecord[]>([]);

    useEffect(() => {
        if (clienteNome && empresaId) {
            loadClientAndSites();
        }
    }, [clienteNome, empresaId]);

    const loadClientAndSites = async () => {
        setLoadingSites(true);
        try {
            // 1. Fetch clients globally and find a match client-side
            const { data: allClients, error: clientErr } = await supabase
                .schema('core_common')
                .from('clients')
                .select('id, legal_name, trade_name');

            if (clientErr) throw clientErr;

            const normalizeName = (name?: string | null) => {
                if (!name) return '';
                return name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '')
                    .replace(/(s[alr]u?|lda|unipessoal|su)$/g, '');
            };

            const normTarget = normalizeName(clienteNome);
            const targetLower = clienteNome.trim().toLowerCase();

            // 1. Try exact trade_name or legal_name match first (case-insensitive)
            let matched = allClients?.find(c => c.trade_name?.trim().toLowerCase() === targetLower) ||
                          allClients?.find(c => c.legal_name?.trim().toLowerCase() === targetLower);

            // 2. Try normalized trade_name match, then normalized legal_name match
            if (!matched) {
                matched = allClients?.find(c => normalizeName(c.trade_name) === normTarget) ||
                          allClients?.find(c => normalizeName(c.legal_name) === normTarget);
            }

            // 3. If no exact/normalized match, try partial match fallback (trade_name first, then legal_name)
            if (!matched) {
                matched = allClients?.find(c => {
                    const normTrade = normalizeName(c.trade_name);
                    return (normTrade.length > 3 && normTarget.includes(normTrade)) ||
                           (normTarget.length > 3 && normTrade.includes(normTarget));
                }) || allClients?.find(c => {
                    const normLegal = normalizeName(c.legal_name);
                    return (normLegal.length > 3 && normTarget.includes(normLegal)) ||
                           (normTarget.length > 3 && normLegal.includes(normTarget));
                });
            }

            if (!matched) {
                const { data: newClient, error: insertError } = await supabase
                    .schema('core_common')
                    .from('clients')
                    .insert({
                        trade_name: clienteNome,
                        legal_name: clienteNome
                    })
                    .select('id, trade_name')
                    .single();

                if (insertError) {
                    console.error("Erro ao auto-criar cliente no ValidationScreen:", insertError);
                    throw insertError;
                }

                const { error: settingsError } = await supabase
                    .schema('core_common')
                    .from('client_company_settings')
                    .insert({
                        client_id: newClient.id,
                        empresa_id: empresaId,
                        status: 'active'
                    });

                if (settingsError) {
                    console.error("Erro ao auto-criar configurações de cliente no ValidationScreen:", settingsError);
                    throw settingsError;
                }

                matched = newClient;
            }

            const cId = matched.id;
            setClientId(cId);

            // Fetch job functions from core_comercial
            const { data: jobFuncs, error: jfErr } = await supabase
                .schema('core_comercial')
                .from('job_functions')
                .select('id, name')
                .eq('status', 'active')
                .order('name');
            
            if (jfErr) throw jfErr;
            const fetchedJobFuncs = jobFuncs || [];
            setJobFunctions(fetchedJobFuncs);

            // 2. Resolve job function ID for the worker (exact or case-insensitive/partial match)
            if (workerFunction && fetchedJobFuncs.length > 0) {
                const exactMatch = fetchedJobFuncs.find(jf => jf.name === workerFunction);
                if (exactMatch) {
                    setWorkerFuncId(exactMatch.id);
                } else {
                    const matchedFunc = fetchedJobFuncs.find(jf => 
                        jf.name.toLowerCase() === workerFunction.toLowerCase() ||
                        jf.name.toLowerCase().includes(workerFunction.toLowerCase()) ||
                        workerFunction.toLowerCase().includes(jf.name.toLowerCase())
                    );
                    if (matchedFunc) {
                        setWorkerFuncId(matchedFunc.id);
                    }
                }
            }

             // 3. Fetch sites
            const { data: sites, error: sitesErr } = await supabase
                .schema('core_common')
                .from('client_sites')
                .select('id, name')
                .eq('client_id', cId)
                .eq('empresa_id', empresaId)
                .neq('status', 'archived')
                .order('name');

            if (sitesErr) throw sitesErr;

            let finalSites = sites || [];

            // 4. If no sites, create "Taller" automatically
            if (finalSites.length === 0) {
                const { data: defaultSite, error: createErr } = await supabase
                    .schema('core_common')
                    .from('client_sites')
                    .insert({
                        empresa_id: empresaId,
                        client_id: cId,
                        name: 'Taller',
                        status: 'active'
                    })
                    .select('id, name')
                    .single();

                if (createErr) {
                    console.error("Erro ao criar obra padrão 'Taller':", createErr);
                } else if (defaultSite) {
                    finalSites = [defaultSite];
                    toast.info("Obra padrão 'Taller' criada automaticamente para este cliente.");
                }
            }

            setClientSites(finalSites);

            // 5. Load existing hours for this period
            const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

            const { data: existingHours, error: loadErr } = await supabase
                .schema('core_finance')
                .from('horas_trabalhadas')
                .select('*')
                .eq('worker_id', workerId)
                .eq('client_id', cId)
                .gte('data_trabalho', startDateStr)
                .lte('data_trabalho', endDateStr);

            if (loadErr) throw loadErr;

            // 5.1 Load worker_hours metadata (draft entries & supervisor digital signature)
            let workerHourRec: any = null;
            if (recordId) {
                const { data: whData } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .select('id, apontamentos_diarios, signed_at, signed_ip, encarregado_nome, signature_image_url, status, total_horas_normais, total_horas_noturnas, horas_totais')
                    .eq('id', recordId)
                    .maybeSingle();
                
                workerHourRec = whData;
            }
            if (!workerHourRec && workerId) {
                const { data: whData } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .select('id, apontamentos_diarios, signed_at, signed_ip, encarregado_nome, signature_image_url, status, total_horas_normais, total_horas_noturnas, horas_totais')
                    .eq('worker_id', workerId)
                    .eq('period_year', year)
                    .eq('period_month', month)
                    .maybeSingle();
                
                workerHourRec = whData;
            }

            if (workerHourRec) {
                setSupervisorSignature({
                    signedAt: workerHourRec.signed_at,
                    signedIp: workerHourRec.signed_ip,
                    encarregadoNome: workerHourRec.encarregado_nome,
                    signatureImageUrl: workerHourRec.signature_image_url,
                    status: workerHourRec.status
                });
            }

            let draftsList: any[] = [];
            if (Array.isArray(workerHourRec?.apontamentos_diarios)) {
                draftsList = workerHourRec.apontamentos_diarios;
            } else if (typeof workerHourRec?.apontamentos_diarios === 'string') {
                try {
                    draftsList = JSON.parse(workerHourRec.apontamentos_diarios);
                } catch {
                    draftsList = [];
                }
            }
            setPortalDrafts(draftsList);
            if (!fileUrl && draftsList.length > 0) {
                setLeftTab('portal');
            }

            // Generate days of month
            const numDays = new Date(year, month, 0).getDate();
            const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'pt-BR';

            const initialRecords = Array.from({ length: numDays }, (_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(year, month - 1, dayNum);
                const dayOfWeek = dateObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
                const weekdayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });
                const weekdayFormatted = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

                // Find existing db record in core_finance.horas_trabalhadas
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dbRec = existingHours?.find(h => h.data_trabalho === dayStr);

                // Fallback to worker portal draft entry if not yet inserted into horas_trabalhadas
                const draftRec = draftsList.find((d: any) => Number(d.day ?? d.dia) === dayNum);

                // Apply pre-selection logic for obra: if exactly 1 site exists, always pre-select it
                let initialObra = '';
                if (finalSites.length === 1) {
                    initialObra = finalSites[0].id;
                } else if (dbRec?.obra_id) {
                    initialObra = dbRec.obra_id;
                } else if (draftRec?.obra_id) {
                    initialObra = draftRec.obra_id;
                }

                const inicioVal = dbRec?.hora_inicio 
                    ? dbRec.hora_inicio.substring(0, 5) 
                    : (draftRec?.inicio || draftRec?.entrada || '');

                const fimVal = dbRec?.hora_fim 
                    ? dbRec.hora_fim.substring(0, 5) 
                    : (draftRec?.fim || draftRec?.saida || '');

                const rawNormais = draftRec?.horasNormais ?? draftRec?.horas_normais;
                const rawNoturnas = draftRec?.horasNoturnas ?? draftRec?.horas_noturnas;
                const rawTotal = draftRec?.totalHoras ?? draftRec?.total_horas;

                const normaisVal = dbRec?.horas_normais !== undefined && dbRec?.horas_normais !== null
                    ? String(dbRec.horas_normais)
                    : (rawNormais !== undefined && rawNormais !== null && String(rawNormais) !== ''
                        ? String(rawNormais)
                        : (rawTotal !== undefined && rawTotal !== null && String(rawTotal) !== '' ? String(rawTotal) : ''));

                const noturnasVal = dbRec?.horas_noturnas !== undefined && dbRec?.horas_noturnas !== null
                    ? String(dbRec.horas_noturnas)
                    : (rawNoturnas !== undefined && rawNoturnas !== null && String(rawNoturnas) !== ''
                        ? String(rawNoturnas)
                        : '0');

                const totalHorasVal = dbRec?.horas_totais !== undefined && dbRec?.horas_totais !== null 
                    ? String(dbRec.horas_totais) 
                    : (rawTotal !== undefined && rawTotal !== null && String(rawTotal) !== ''
                        ? String(rawTotal)
                        : (Number(normaisVal || 0) + Number(noturnasVal || 0) > 0 
                            ? String(Number(normaisVal || 0) + Number(noturnasVal || 0)) 
                            : ''));

                return {
                    day: dayNum,
                    weekday: weekdayFormatted,
                    inicio: inicioVal,
                    fim: fimVal,
                    horasNormais: normaisVal,
                    horasNoturnas: noturnasVal,
                    obra: initialObra,
                    totalHoras: totalHorasVal,
                    dbRecordId: dbRec?.id,
                    isWeekend
                };
            });

            setRecords(initialRecords);

            const snapshot: Record<number, { inicio: string; fim: string; totalHoras: string }> = {};
            initialRecords.forEach(r => {
                snapshot[r.day] = { inicio: r.inicio, fim: r.fim, totalHoras: r.totalHoras };
            });
            setOcrSnapshot(snapshot);

        } catch (error: any) {
            console.error("Erro ao carregar dados do cliente e obras:", error);
            toast.error("Erro ao carregar dados adicionais.");
        } finally {
            setLoadingSites(false);
        }
    };

    const handleRecordChange = (day: number, field: keyof DayRecord, value: string) => {
        setRecords(prev => prev.map(r => {
            if (r.day === day) {
                const updated = { ...r, [field]: value };
                if (field === 'inicio' || field === 'fim') {
                    const duration = calculateDuration(updated.inicio, updated.fim);
                    if (duration > 0) {
                        const noturnas = parseFloat(updated.horasNoturnas) || 0;
                        const normais = Math.max(0, Math.round((duration - noturnas) * 100) / 100);
                        updated.horasNormais = String(normais);
                        updated.totalHoras = String(duration);
                    }
                } else if (field === 'horasNormais' || field === 'horasNoturnas') {
                    const normais = parseFloat(field === 'horasNormais' ? value : updated.horasNormais) || 0;
                    const noturnas = parseFloat(field === 'horasNoturnas' ? value : updated.horasNoturnas) || 0;
                    const total = Math.round((normais + noturnas) * 100) / 100;
                    updated.totalHoras = total > 0 ? String(total) : '';
                } else if (field === 'totalHoras') {
                    const total = parseFloat(value) || 0;
                    const noturnas = parseFloat(updated.horasNoturnas) || 0;
                    const normais = Math.max(0, Math.round((total - noturnas) * 100) / 100);
                    updated.horasNormais = String(normais);
                }
                return updated;
            }
            return r;
        }));
    };

    const handleObraChange = (day: number, value: string) => {
        if (value === 'create_new') {
            setSetupRowDay(day);
            setNewSiteOpen(true);
            return;
        }
        handleRecordChange(day, 'obra', value);
    };

    const handleCreateSite = async () => {
        if (!newSiteName.trim() || !clientId || !empresaId) {
            toast.error("Por favor, digite o nome da obra.");
            return;
        }

        setCreatingSite(true);
        try {
            const { data: newSite, error } = await supabase
                .schema('core_common')
                .from('client_sites')
                .insert({
                    empresa_id: empresaId,
                    client_id: clientId,
                    name: newSiteName.trim(),
                    status: 'active'
                })
                .select('id, name')
                .single();

            if (error) throw error;
            if (newSite) {
                setClientSites(prev => [...prev, newSite].sort((a, b) => a.name.localeCompare(b.name)));
                
                if (setupRowDay !== null) {
                    setRecords(prev => prev.map(r => r.day === setupRowDay ? { ...r, obra: newSite.id } : r));
                }
                
                toast.success(`Obra "${newSite.name}" cadastrada com sucesso!`);
                setNewSiteOpen(false);
                setNewSiteName('');
            }
        } catch (error: any) {
            console.error("Erro ao cadastrar obra:", error);
            toast.error(error.message || "Erro ao cadastrar obra.");
        } finally {
            setCreatingSite(false);
        }
    };

    const handleExtract = async () => {
        if (!filePath) {
            toast.error("Nenhum arquivo encontrado para processamento.");
            return;
        }
        setSelectedDays([]);
        setExtracting(true);
        try {
            const isPdfFile = fileName?.toLowerCase().endsWith('.pdf') || filePath.toLowerCase().includes('.pdf');
            const mimeType = isPdfFile ? 'application/pdf' : 'image/jpeg';

            const { data: ocrRes, error: ocrErr } = await supabase.functions.invoke('process-document-ocr', {
                body: {
                    file_path: filePath,
                    document_type: "timesheet",
                    bucket_id: filePath.includes('/') ? 'horas_trabalhadores' : 'extracao-horas',
                    mime_type: mimeType,
                    worker_id: workerId,
                    client_id: clientId
                }
            });

            if (ocrErr) throw ocrErr;
            if (ocrRes && ocrRes.success && ocrRes.data) {
                const extracted = ocrRes.data;
                console.log("Dados extraídos da IA:", extracted);

                if (Array.isArray(extracted.days)) {
                    let newRecords: DayRecord[] = [];
                    setRecords(prev => {
                        const mapped = prev.map(r => {
                            const extDay = extracted.days.find((d: any) => d.day === r.day);
                            if (extDay) {
                                const hrs = parseFloat(extDay.total_horas);
                                const hasNoHours = isNaN(hrs) || hrs === 0;

                                let matchedObraId = '';
                                if (extDay.obra && !hasNoHours) {
                                    const matched = clientSites.find(s => 
                                        s.name.toLowerCase().includes(extDay.obra.toLowerCase()) || 
                                        extDay.obra.toLowerCase().includes(s.name.toLowerCase())
                                    );
                                    if (matched) {
                                        matchedObraId = matched.id;
                                    }
                                } else if (clientSites.length === 1 && !hasNoHours) {
                                    matchedObraId = clientSites[0].id;
                                }

                                // Check if night hours
                                const isNightAnnotation = extDay.obra && /noche|nocturn/i.test(extDay.obra);
                                const isNightTime = extDay.inicio && (extDay.inicio >= '19:00' || extDay.inicio <= '05:00');
                                const isNightType = extDay.tipo_jornada === 'noturna' || (Number(extDay.horas_noturnas) > 0);

                                let normaisStr = '';
                                let noturnasStr = '';
                                if (!hasNoHours) {
                                    if (extDay.horas_noturnas !== undefined && extDay.horas_noturnas !== null && Number(extDay.horas_noturnas) > 0) {
                                        noturnasStr = String(extDay.horas_noturnas);
                                        normaisStr = String(extDay.horas_normais || 0);
                                    } else if (isNightAnnotation || isNightTime || isNightType) {
                                        noturnasStr = String(extDay.total_horas);
                                        normaisStr = '0';
                                    } else {
                                        normaisStr = String(extDay.horas_normais !== undefined && extDay.horas_normais !== null ? extDay.horas_normais : extDay.total_horas);
                                        noturnasStr = '0';
                                    }
                                }

                                return {
                                    ...r,
                                    inicio: hasNoHours ? '' : (extDay.inicio ? extDay.inicio.substring(0, 5) : ''),
                                    fim: hasNoHours ? '' : (extDay.fim ? extDay.fim.substring(0, 5) : ''),
                                    horasNormais: normaisStr,
                                    horasNoturnas: noturnasStr,
                                    obra: hasNoHours ? '' : matchedObraId,
                                    totalHoras: hasNoHours ? '' : String(extDay.total_horas)
                                };
                            }
                            return {
                                ...r,
                                inicio: '',
                                fim: '',
                                horasNormais: '',
                                horasNoturnas: '',
                                obra: '',
                                totalHoras: ''
                            };
                        });
                        newRecords = mapped;
                        return mapped;
                    });
                    
                    setTimeout(() => {
                        const snapshot: Record<number, { inicio: string; fim: string; totalHoras: string }> = {};
                        newRecords.forEach(r => {
                            snapshot[r.day] = { inicio: r.inicio, fim: r.fim, totalHoras: r.totalHoras };
                        });
                        setOcrSnapshot(snapshot);
                    }, 0);

                    toast.success("Dados da folha extraídos e carregados com sucesso!");
                } else {
                    toast.warning("A IA não retornou um array de dias válido.");
                }
            } else {
                throw new Error("Resposta inválida da IA.");
            }
        } catch (error: any) {
            console.error("Erro no processamento OCR:", error);
            toast.error(error.message || "Erro na leitura inteligente (OCR).");
        } finally {
            setExtracting(false);
        }
    };

    const totalHours = records.reduce((acc, curr) => acc + (parseFloat(curr.totalHoras) || 0), 0);
    const totalNormais = records.reduce((acc, curr) => acc + (parseFloat(curr.horasNormais) || 0), 0);
    const totalNoturnas = records.reduce((acc, curr) => acc + (parseFloat(curr.horasNoturnas) || 0), 0);

    const handleBulkApplyObra = (siteId: string) => {
        if (selectedDays.length === 0) return;
        setRecords(prev => prev.map(r => 
            selectedDays.includes(r.day) 
                ? { ...r, obra: siteId } 
                : r
        ));
        const siteName = clientSites.find(s => s.id === siteId)?.name || 'Obra';
        toast.success(`Obra "${siteName}" aplicada em lote para ${selectedDays.length} dias!`);
        setSelectedDays([]);
    };

    const handleSelectWeek = (weekNum: number) => {
        const startDay = (weekNum - 1) * 7 + 1;
        const endDay = Math.min(records.length, weekNum === 5 ? records.length : weekNum * 7);
        const weekDays = records.filter(r => r.day >= startDay && r.day <= endDay).map(r => r.day);
        setSelectedDays(weekDays);
        toast.info(`Semana ${weekNum} (dias ${startDay} a ${endDay}) selecionada.`);
    };

    const handleBulkSetNight = () => {
        if (selectedDays.length === 0) return;
        setRecords(prev => prev.map(r => {
            if (!selectedDays.includes(r.day)) return r;
            const norm = parseFloat(r.horasNormais) || 0;
            const not = parseFloat(r.horasNoturnas) || 0;
            const tot = parseFloat(r.totalHoras) || (norm + not);
            if (tot <= 0) return r;
            return {
                ...r,
                horasNoturnas: String(tot),
                horasNormais: '0',
                totalHoras: String(tot)
            };
        }));
        toast.success(`${selectedDays.length} dias marcados como Horas Noturnas (🌙)!`);
    };

    const handleBulkSetDay = () => {
        if (selectedDays.length === 0) return;
        setRecords(prev => prev.map(r => {
            if (!selectedDays.includes(r.day)) return r;
            const norm = parseFloat(r.horasNormais) || 0;
            const not = parseFloat(r.horasNoturnas) || 0;
            const tot = parseFloat(r.totalHoras) || (norm + not);
            if (tot <= 0) return r;
            return {
                ...r,
                horasNormais: String(tot),
                horasNoturnas: '0',
                totalHoras: String(tot)
            };
        }));
        toast.success(`${selectedDays.length} dias marcados como Horas Diurnas (☀️)!`);
    };

    const handleBulkFillPreset = (preset: '8h_diurna' | '10h_noturna' | '12h_noturna' | 'descanso') => {
        if (selectedDays.length === 0) return;
        setRecords(prev => prev.map(r => {
            if (!selectedDays.includes(r.day)) return r;
            if (preset === '8h_diurna') {
                return {
                    ...r,
                    inicio: '08:00',
                    fim: '17:00',
                    horasNormais: '8',
                    horasNoturnas: '0',
                    totalHoras: '8'
                };
            }
            if (preset === '10h_noturna') {
                return {
                    ...r,
                    inicio: '20:00',
                    fim: '06:00',
                    horasNormais: '0',
                    horasNoturnas: '10',
                    totalHoras: '10'
                };
            }
            if (preset === '12h_noturna') {
                return {
                    ...r,
                    inicio: '19:00',
                    fim: '07:00',
                    horasNormais: '0',
                    horasNoturnas: '12',
                    totalHoras: '12'
                };
            }
            // descanso
            return {
                ...r,
                inicio: '',
                fim: '',
                horasNormais: '0',
                horasNoturnas: '0',
                totalHoras: ''
            };
        }));
        toast.success(`Preenchimento em lote aplicado para ${selectedDays.length} dias!`);
    };

    const handleReloadPortalValues = () => {
        if (!portalDrafts || portalDrafts.length === 0) {
            toast.error("Nenhum apontamento do portal disponível para este trabalhador.");
            return;
        }

        setRecords(prev => prev.map(r => {
            const draftRec = portalDrafts.find((d: any) => Number(d.day ?? d.dia) === r.day);
            if (!draftRec) return r;

            const rawNormais = draftRec?.horasNormais ?? draftRec?.horas_normais;
            const rawNoturnas = draftRec?.horasNoturnas ?? draftRec?.horas_noturnas;
            const rawTotal = draftRec?.totalHoras ?? draftRec?.total_horas;

            const inicioVal = draftRec?.inicio || draftRec?.entrada || '';
            const fimVal = draftRec?.fim || draftRec?.saida || '';
            const normaisVal = rawNormais !== undefined && rawNormais !== null && String(rawNormais) !== '' 
                ? String(rawNormais) 
                : (rawTotal !== undefined && rawTotal !== null && String(rawTotal) !== '' ? String(rawTotal) : '');
            const noturnasVal = rawNoturnas !== undefined && rawNoturnas !== null && String(rawNoturnas) !== '' 
                ? String(rawNoturnas) 
                : '0';
            const totalHorasVal = rawTotal !== undefined && rawTotal !== null && String(rawTotal) !== '' 
                ? String(rawTotal) 
                : (Number(normaisVal || 0) + Number(noturnasVal || 0) > 0 ? String(Number(normaisVal || 0) + Number(noturnasVal || 0)) : '');

            return {
                ...r,
                inicio: inicioVal,
                fim: fimVal,
                horasNormais: normaisVal,
                horasNoturnas: noturnasVal,
                totalHoras: totalHorasVal
            };
        }));

        toast.success("Apontamentos digitais do portal carregados na tabela com sucesso!");
    };

    const handleSave = async () => {
        if (!clientId) {
            toast.error("ID do cliente não encontrado. Não é possível salvar.");
            return;
        }

        if (clientSites.length > 1) {
            const missingObra = records.some(r => {
                const hrs = parseFloat(r.totalHoras);
                return !isNaN(hrs) && hrs > 0 && !r.obra;
            });
            if (missingObra) {
                toast.error("Por favor, selecione a Obra/Centro de Custo para todos os dias com horas trabalhadas.");
                return;
            }
        }

        if (!workerFuncId) {
            toast.error("Por favor, selecione uma Função/Perfil ativa do sistema no cabeçalho antes de salvar.");
            return;
        }

        setLoading(true);
        try {
            const selectedJobFunc = jobFunctions.find(jf => jf.id === workerFuncId);
            const targetFuncName = selectedJobFunc ? selectedJobFunc.name : workerFunction;
            
            // Resolve custom and standard tariff rates from database settings
            const { data: workerExceptions } = await supabase
                .schema('core_common')
                .from('client_worker_tariffs')
                .select('worker_id, client_site_id, valor_tarifa, valor_tarifa_noturna')
                .eq('client_id', clientId);

            const { data: standardTariffs } = await supabase
                .schema('core_common')
                .from('client_tariffs')
                .select('job_function_id, client_site_id, valor_tarifa, valor_tarifa_noturna')
                .eq('client_id', clientId);

            const resolveTariff = (wId: string, funcId: string, siteId: string | null): { normal: number; noturna: number } => {
                // 1. Try to find a worker exception matching this site
                const wExcSite = workerExceptions?.find(e => 
                    e.worker_id === wId && 
                    e.client_site_id === siteId
                );
                if (wExcSite) {
                    const norm = Number(wExcSite.valor_tarifa);
                    const not = wExcSite.valor_tarifa_noturna !== null && wExcSite.valor_tarifa_noturna !== undefined
                        ? Number(wExcSite.valor_tarifa_noturna)
                        : norm;
                    return { normal: norm, noturna: not };
                }

                // 2. Try to find a worker exception with global (null) site
                const wExcGlobal = workerExceptions?.find(e => 
                    e.worker_id === wId && 
                    e.client_site_id === null
                );
                if (wExcGlobal) {
                    const norm = Number(wExcGlobal.valor_tarifa);
                    const not = wExcGlobal.valor_tarifa_noturna !== null && wExcGlobal.valor_tarifa_noturna !== undefined
                        ? Number(wExcGlobal.valor_tarifa_noturna)
                        : norm;
                    return { normal: norm, noturna: not };
                }

                // 3. Try to find a standard function tariff matching this site
                const stdSite = standardTariffs?.find(t => 
                    t.job_function_id === funcId && 
                    t.client_site_id === siteId
                );
                if (stdSite) {
                    const norm = Number(stdSite.valor_tarifa);
                    const not = stdSite.valor_tarifa_noturna !== null && stdSite.valor_tarifa_noturna !== undefined
                        ? Number(stdSite.valor_tarifa_noturna)
                        : norm;
                    return { normal: norm, noturna: not };
                }

                // 4. Try to find a standard function tariff with global (null) site
                const stdGlobal = standardTariffs?.find(t => 
                    t.job_function_id === funcId && 
                    t.client_site_id === null
                );
                if (stdGlobal) {
                    const norm = Number(stdGlobal.valor_tarifa);
                    const not = stdGlobal.valor_tarifa_noturna !== null && stdGlobal.valor_tarifa_noturna !== undefined
                        ? Number(stdGlobal.valor_tarifa_noturna)
                        : norm;
                    return { normal: norm, noturna: not };
                }

                // 5. General fallback based on function name matching
                const base = targetFuncName?.toLowerCase().includes('soldador') ? 25.50 : (targetFuncName?.toLowerCase().includes('tubero') ? 28.00 : 27.00);
                return { normal: base, noturna: base };
            };

            const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

            const { error: deleteError } = await supabase
                .schema('core_finance')
                .from('horas_trabalhadas')
                .delete()
                .eq('worker_id', workerId)
                .eq('client_id', clientId)
                .gte('data_trabalho', startDateStr)
                .lte('data_trabalho', endDateStr);

            if (deleteError) {
                console.error("Erro ao limpar registros anteriores:", deleteError);
                throw deleteError;
            }

            const rowsToInsert = records
                .filter(r => {
                    const hrs = parseFloat(r.totalHoras);
                    return !isNaN(hrs) && hrs > 0;
                })
                .map(r => {
                    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
                    const siteId = r.obra || null;
                    const tariffPair = resolveTariff(workerId, workerFuncId, siteId);
                    const totalH = parseFloat(r.totalHoras) || 0;
                    const noturnasH = parseFloat(r.horasNoturnas) || 0;
                    const normaisH = r.horasNormais !== '' ? (parseFloat(r.horasNormais) || 0) : Math.max(0, totalH - noturnasH);
                    
                    return {
                        worker_id: workerId,
                        client_id: clientId,
                        data_trabalho: dayStr,
                        hora_inicio: r.inicio ? `${r.inicio}:00` : null,
                        hora_fim: r.fim ? `${r.fim}:00` : null,
                        horas_normais: normaisH,
                        horas_noturnas: noturnasH,
                        horas_totais: totalH,
                        status: 'pending_review',
                        funcao_id: workerFuncId,
                        obra_id: siteId,
                        tarifa_faturada: tariffPair.normal,
                        tarifa_faturada_noturna: tariffPair.noturna
                    };
                });

            if (rowsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .schema('core_finance')
                    .from('horas_trabalhadas')
                    .insert(rowsToInsert);

                if (insertError) {
                    console.error("Erro ao salvar lançamentos diários:", insertError);
                    throw insertError;
                }
            }

            const totalNormaisH = rowsToInsert.reduce((sum, r) => sum + (Number(r.horas_normais) || 0), 0);
            const totalNoturnasH = rowsToInsert.reduce((sum, r) => sum + (Number(r.horas_noturnas) || 0), 0);
            const totalGeralH = totalNormaisH + totalNoturnasH;

            const { error: updateError } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({ 
                    status: 'validado',
                    total_horas_normais: totalNormaisH,
                    total_horas_noturnas: totalNoturnasH,
                    horas_totais: totalGeralH
                })
                .eq('id', recordId);

            if (updateError) {
                console.error("Erro ao atualizar status da folha:", updateError);
                throw updateError;
            }

            toast.success("Horas validadas e salvas com sucesso!");
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || "Erro ao salvar validação.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full gap-4 p-4 bg-background">
            <Card className="flex-1 lg:w-1/2 flex flex-col overflow-hidden border shadow-sm rounded-2xl bg-white">
                <div className="bg-slate-50/80 px-4 py-3 border-b flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-200/70 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLeftTab('document')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    leftTab === 'document'
                                        ? 'bg-white text-slate-800 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Documento Físico
                                {fileUrl && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftTab('portal')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    leftTab === 'portal'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Smartphone className="h-3.5 w-3.5" />
                                Portal Digital
                                {portalDrafts.length > 0 && (
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                                        {portalDrafts.filter((d: any) => Number(d.total_horas ?? d.totalHoras ?? 0) > 0).length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-slate-700">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex-1 bg-muted/20 relative flex flex-col overflow-hidden">
                    {leftTab === 'document' ? (
                        fileUrl ? (
                            isPdf ? (
                                <iframe 
                                    src={fileUrl.includes('#') ? fileUrl : `${fileUrl}#navpanes=0`} 
                                    className="w-full h-full rounded-b-2xl border-0 bg-white"
                                    title="Document Viewer"
                                />
                            ) : (
                                <div className="w-full h-full relative flex flex-col items-center rounded-b-2xl overflow-hidden bg-black/5">
                                    <div className="absolute top-2 right-2 flex gap-1 z-10 bg-white/90 p-1 rounded-md shadow-sm border backdrop-blur-sm">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageZoom(z => Math.max(0.25, z - 0.25))} title="Diminuir Zoom">
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageZoom(1)} title="Ajustar à tela">
                                            <Maximize className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageZoom(z => Math.min(4, z + 0.25))} title="Aumentar Zoom">
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-2">
                                        <img 
                                            src={fileUrl} 
                                            alt="Documento de Horas" 
                                            style={{ 
                                                transform: `scale(${imageZoom})`,
                                                transformOrigin: 'center center',
                                                transition: 'transform 0.15s ease-in-out'
                                            }}
                                            className={imageZoom === 1 ? "max-w-full max-h-full object-contain rounded" : "rounded shadow-md"}
                                        />
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 mb-3">
                                    <FileText className="h-8 w-8" />
                                </div>
                                <h4 className="font-semibold text-slate-700 text-sm">Sem anexo físico nesta folha</h4>
                                <p className="text-xs text-slate-500 max-w-xs mt-1">
                                    {portalDrafts.length > 0 
                                        ? "O trabalhador realizou o apontamento diretamente pelo Portal Digital do Trabalhador."
                                        : "Nenhum arquivo ou documento físico foi carregado para este período."}
                                </p>
                                {portalDrafts.length > 0 && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setLeftTab('portal')}
                                        className="mt-4 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                    >
                                        <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                                        Ver Apontamentos do Portal ({portalDrafts.filter((d: any) => Number(d.total_horas ?? d.totalHoras ?? 0) > 0).length} dias)
                                    </Button>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                            {/* Header de Resumo do Portal */}
                            <div className="p-4 bg-white border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Apontamentos do Portal</span>
                                        {supervisorSignature?.signedAt ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                                ✓ Assinado pelo Encarregado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                                                Rascunho / Em Andamento
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Dados informados pelo trabalhador {workerName} para o mês {month}/{year}.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReloadPortalValues}
                                    className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 shrink-0"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                    Carregar na Tabela
                                </Button>
                            </div>

                            {/* Tabela de Consulta do Portal */}
                            <div className="flex-1 overflow-auto p-4">
                                {portalDrafts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <Smartphone className="h-8 w-8 mb-2 opacity-50" />
                                        <span className="text-sm font-semibold">Nenhum apontamento feito pelo portal</span>
                                        <span className="text-xs mt-1">O trabalhador ainda não submeteu horas pelo app/portal neste mês.</span>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow className="text-[11px] font-bold text-slate-600">
                                                    <TableHead className="w-16">Dia</TableHead>
                                                    <TableHead>Horário</TableHead>
                                                    <TableHead className="text-right">Diurnas</TableHead>
                                                    <TableHead className="text-right">Noturnas</TableHead>
                                                    <TableHead className="text-right font-black">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="text-xs">
                                                {portalDrafts
                                                    .filter((d: any) => {
                                                        const tot = Number(d.total_horas ?? d.totalHoras ?? 0);
                                                        const ini = d.inicio || d.entrada;
                                                        return tot > 0 || !!ini;
                                                    })
                                                    .sort((a: any, b: any) => Number(a.day ?? a.dia) - Number(b.day ?? b.dia))
                                                    .map((d: any) => {
                                                        const dayNum = Number(d.day ?? d.dia);
                                                        const ini = d.inicio || d.entrada || '-';
                                                        const fim = d.fim || d.saida || '-';
                                                        const norm = Number(d.horas_normais ?? d.horasNormais ?? 0);
                                                        const notu = Number(d.horas_noturnas ?? d.horasNoturnas ?? 0);
                                                        const tot = Number(d.total_horas ?? d.totalHoras ?? (norm + notu));
                                                        return (
                                                            <TableRow key={dayNum} className="hover:bg-slate-50/80">
                                                                <TableCell className="font-bold text-slate-700">
                                                                    Dia {String(dayNum).padStart(2, '0')}
                                                                </TableCell>
                                                                <TableCell className="text-slate-500 font-mono text-[11px]">
                                                                    {ini} às {fim}
                                                                </TableCell>
                                                                <TableCell className="text-right text-slate-700">
                                                                    {norm > 0 ? `${norm.toFixed(1)}h` : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right text-amber-600 font-medium">
                                                                    {notu > 0 ? `${notu.toFixed(1)}h` : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-indigo-700">
                                                                    {tot.toFixed(1)}h
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="flex-1 lg:w-1/2 flex flex-col overflow-hidden border shadow-md rounded-2xl bg-white">
                {/* Cabeçalho Premium com Informações do Trabalhador e KPI de Horas */}
                <div className="bg-slate-50/50 border-b p-5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-5">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                                <Building2 className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Empresa</span>
                                <span className="font-semibold text-slate-700 leading-tight">{contratante || 'Não informado'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                                <Briefcase className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cliente</span>
                                <span className="font-semibold text-slate-700 leading-tight">{clienteNome || 'Não informado'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500 border border-indigo-100/50">
                                <User className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Trabalhador</span>
                                <span className="font-extrabold text-slate-800 leading-tight">{workerName} {workerCode ? `(${workerCode})` : ''}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 col-span-1">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                                <Wrench className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Função / Perfil</span>
                                {jobFunctions.length > 0 ? (
                                    <select
                                        value={workerFuncId || ''}
                                        onChange={(e) => setWorkerFuncId(e.target.value || null)}
                                        className={`mt-0.5 block w-full rounded-lg border-slate-200 py-1 pl-2 pr-8 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white border ${
                                            !workerFuncId ? 'border-amber-400 ring-2 ring-amber-100' : ''
                                        }`}
                                    >
                                        <option value="">Selecione um perfil...</option>
                                        {jobFunctions.map((jf) => (
                                            <option key={jf.id} value={jf.id}>
                                                {jf.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="font-semibold text-slate-700 leading-tight">{workerFunction || 'Não informada'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* KPIs Executivos */}
                    <div className="flex flex-col sm:flex-row gap-3 xl:min-w-[420px]">
                        {/* KPI Horas Totais com Breakdown */}
                        <div className="flex-1 flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-indigo-100/50 transition-all duration-300 hover:scale-[1.02] border border-indigo-500/20">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Horas Totais</span>
                                    <span className="text-2xl font-black tracking-tight">{totalHours.toFixed(2)}h</span>
                                </div>
                                <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                                    <Clock className="h-4.5 w-4.5 text-white" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2 mt-2 border-t border-white/15 text-[11px] font-semibold text-indigo-100">
                                <span>Diurnas: <strong className="text-white">{totalNormais.toFixed(1)}h</strong></span>
                                <span>•</span>
                                <span className="text-amber-200">Noturnas: <strong className="text-white">{totalNoturnas.toFixed(1)}h</strong></span>
                            </div>
                        </div>

                        {/* KPI Dias Trabalhados */}
                        <div className="flex-1 flex items-center justify-between gap-4 bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Dias Lançados</span>
                                <span className="text-2xl font-black text-slate-700 tracking-tight">
                                    {records.filter(r => (parseFloat(r.totalHoras) || 0) > 0).length} <span className="text-xs font-semibold text-slate-400">/ {records.length}d</span>
                                </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl text-slate-400 border border-slate-100">
                                <Calendar className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banner de Assinatura Eletrônica do Encarregado */}
                {supervisorSignature?.signedAt && (
                    <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-emerald-900">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                                ✓
                            </span>
                            <span>
                                Folha assinada eletronicamente por <strong>{supervisorSignature.encarregadoNome || 'Encarregado do Cliente'}</strong> em {new Date(supervisorSignature.signedAt).toLocaleString('pt-PT')}
                            </span>
                            {supervisorSignature.signedIp && (
                                <Badge variant="outline" className="text-[10px] border-emerald-300 bg-white text-emerald-700">
                                    IP: {supervisorSignature.signedIp}
                                </Badge>
                            )}
                        </div>
                        {supervisorSignature.signatureImageUrl && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-[10px]">Rubrica:</span>
                                <img 
                                    src={supervisorSignature.signatureImageUrl} 
                                    alt="Assinatura" 
                                    className="h-6 max-w-[90px] object-contain bg-white rounded border border-emerald-200 px-1" 
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Banner de Sincronização do Portal */}
                {portalDrafts.length > 0 && (
                    <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs text-indigo-900">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                            <span>
                                <strong>Apontamento Digital Detectado:</strong> O trabalhador informou horas via portal ({portalDrafts.filter((d: any) => Number(d.total_horas ?? d.totalHoras ?? 0) > 0).length} dias preenchidos).
                            </span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleReloadPortalValues}
                            className="h-7 px-2.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-100/70 border border-indigo-200 rounded-lg shadow-2xs"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Recarregar Horas do Portal na Tabela
                        </Button>
                    </div>
                )}

                {/* Barra de Ações */}
                <div className="bg-slate-50/30 px-5 py-3.5 border-b flex justify-between items-center flex-wrap gap-3 shadow-2xs">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        Validação de Horas Diárias
                    </h3>
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleExtract} 
                            disabled={extracting || loading || loadingSites} 
                            className="bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 shadow-sm font-semibold transition-all relative overflow-hidden group py-2"
                        >
                            {extracting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2 text-violet-600 group-hover:scale-110 transition-transform animate-pulse" />
                            )}
                            Extrair Dados (IA)
                        </Button>
                        <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold shadow-sm transition-all py-2">
                            Cancelar
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={loading || loadingSites}
                            className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold shadow-md shadow-emerald-100 hover:shadow-emerald-200 border-0 transition-all hover:scale-[1.02] active:scale-[0.98] py-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Dados
                        </Button>
                    </div>
                </div>

                {/* Seleção Rápida por Semanas */}
                <div className="bg-slate-100/70 px-5 py-2 border-b flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-slate-500 font-bold mr-1 text-[11px] uppercase tracking-wider">
                        Selecionar:
                    </span>
                    <button
                        type="button"
                        onClick={() => handleSelectWeek(1)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-all"
                    >
                        Sem. 1 (1-7)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectWeek(2)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-all"
                    >
                        Sem. 2 (8-14)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectWeek(3)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-all"
                    >
                        Sem. 3 (15-21)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectWeek(4)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-all"
                    >
                        Sem. 4 (22-28)
                    </button>
                    {records.length > 28 && (
                        <button
                            type="button"
                            onClick={() => handleSelectWeek(5)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-2xs transition-all"
                        >
                            Sem. 5 (29-{records.length})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            const daysWithHours = records.filter(r => (parseFloat(r.totalHoras) || 0) > 0).map(r => r.day);
                            setSelectedDays(daysWithHours);
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs transition-all"
                    >
                        Dias c/ Horas
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedDays(records.map(r => r.day))}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs transition-all"
                    >
                        Todos
                    </button>
                    {selectedDays.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setSelectedDays([])}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold text-red-600 hover:text-red-800 ml-auto hover:underline"
                        >
                            Limpar Seleção
                        </button>
                    )}
                </div>
                
                {/* Bulk Action Bar */}
                {selectedDays.length > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 border-b border-indigo-200 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2 text-indigo-950 text-xs font-semibold animate-in fade-in duration-200 shadow-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-600 text-white rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-2xs">
                                {selectedDays.length} {selectedDays.length === 1 ? 'dia' : 'dias'}
                            </span>

                            <div className="h-4 w-px bg-indigo-200"></div>

                            {/* Botões Noturnas / Diurnas */}
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleBulkSetNight}
                                className="h-7 px-2.5 text-[11px] font-bold border-sky-300 bg-sky-100/70 text-sky-900 hover:bg-sky-200 gap-1 shadow-2xs"
                            >
                                <Moon className="h-3.5 w-3.5 text-sky-600" /> Definir como Noturnas
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleBulkSetDay}
                                className="h-7 px-2.5 text-[11px] font-bold border-amber-300 bg-amber-100/70 text-amber-900 hover:bg-amber-200 gap-1 shadow-2xs"
                            >
                                <Sun className="h-3.5 w-3.5 text-amber-600" /> Definir como Diurnas
                            </Button>

                            <div className="h-4 w-px bg-indigo-200"></div>

                            {/* Preencher Horas em Lote */}
                            <select
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                        handleBulkFillPreset(val as any);
                                    }
                                    e.target.value = '';
                                }}
                                className="rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs h-7"
                            >
                                <option value="">Preencher horas...</option>
                                <option value="8h_diurna">☀️ 8h Diurnas (08:00 - 17:00)</option>
                                <option value="10h_noturna">🌙 10h Noturnas (20:00 - 06:00)</option>
                                <option value="12h_noturna">🌙 12h Noturnas (19:00 - 07:00)</option>
                                <option value="descanso">🏖️ Folga / 0h</option>
                            </select>

                            {/* Aplicar Obra em Lote */}
                            <select
                                onChange={(e) => {
                                    const siteId = e.target.value;
                                    if (siteId) {
                                        handleBulkApplyObra(siteId);
                                    }
                                    e.target.value = '';
                                }}
                                className="rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs h-7"
                            >
                                <option value="">Aplicar obra...</option>
                                {clientSites.map((site) => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedDays([])}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline"
                        >
                            Desmarcar
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-0">
                    {loadingSites ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span>Carregando dados da folha e obras...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
                                <TableRow className="border-b border-slate-200/80">
                                    <TableHead className="w-[45px] text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={records.length > 0 && selectedDays.length === records.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedDays(records.map(r => r.day));
                                                } else {
                                                    setSelectedDays([]);
                                                }
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[50px] text-center font-bold text-slate-600">Dia</TableHead>
                                    <TableHead className="w-[110px] font-bold text-slate-600">Dia da Semana</TableHead>
                                    <TableHead className="w-[85px] text-center font-bold text-slate-600">Início</TableHead>
                                    <TableHead className="w-[85px] text-center font-bold text-slate-600">Fim</TableHead>
                                    <TableHead className="w-[85px] text-center font-bold text-slate-700">Normais (h)</TableHead>
                                    <TableHead className="w-[85px] text-center font-bold text-indigo-600">Noturnas (h)</TableHead>
                                    <TableHead className="font-bold text-slate-600">Obra/Centro de Custo</TableHead>
                                    <TableHead className="w-[95px] text-center font-bold text-slate-600">Total (h)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((record) => {
                                    const hasHours = (parseFloat(record.totalHoras) || 0) > 0;
                                    const isWeekend = record.isWeekend;
                                    const orig = ocrSnapshot[record.day];
                                    const isModified = orig && (
                                        orig.inicio !== record.inicio ||
                                        orig.fim !== record.fim ||
                                        orig.totalHoras !== record.totalHoras
                                    );

                                    let rowClass = "transition-all duration-150 border-b border-slate-100 ";
                                    if (isModified) {
                                        rowClass += "bg-rose-50/20 border-l-4 border-l-rose-500 hover:bg-rose-50/40 text-rose-800";
                                    } else if (hasHours) {
                                        rowClass += "bg-emerald-50/20 border-l-4 border-l-emerald-500 hover:bg-emerald-50/40";
                                    } else if (isWeekend) {
                                        rowClass += "bg-slate-50/40 hover:bg-slate-50/60 text-slate-400/80";
                                    } else {
                                        rowClass += "hover:bg-slate-50/30";
                                    }

                                    return (
                                        <TableRow 
                                            key={record.day} 
                                            className={rowClass}
                                        >
                                            <TableCell className="p-2 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDays.includes(record.day)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDays(prev => [...prev, record.day]);
                                                        } else {
                                                            setSelectedDays(prev => prev.filter(d => d !== record.day));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2 text-center font-semibold">
                                                <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold ${
                                                    isModified
                                                        ? "bg-rose-600 text-white font-bold shadow-xs shadow-rose-100"
                                                        : hasHours 
                                                            ? "bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-100" 
                                                            : isWeekend 
                                                                ? "bg-slate-200/50 text-slate-400 font-medium" 
                                                                : "bg-slate-100 text-slate-600"
                                                }`}>
                                                    {record.day}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <span className={`text-xs ${
                                                    isModified
                                                        ? "font-semibold text-rose-800"
                                                        : hasHours 
                                                            ? "font-semibold text-slate-700" 
                                                            : isWeekend 
                                                                ? "text-slate-400" 
                                                                : "text-slate-600"
                                                }`}>
                                                    {record.weekday}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input 
                                                    type="text" 
                                                    placeholder="HH:MM"
                                                    value={record.inicio}
                                                    onChange={(e) => handleRecordChange(record.day, 'inicio', e.target.value)}
                                                    className={`h-9 w-full text-center rounded-lg shadow-2xs transition-all duration-150 border-slate-200 text-xs ${
                                                        isModified
                                                            ? "bg-white border-rose-200/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 text-rose-800 font-medium"
                                                            : hasHours 
                                                                ? "bg-white border-emerald-200/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50 text-emerald-800 font-medium" 
                                                                : "bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200/50"
                                                    }`}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input 
                                                    type="text" 
                                                    placeholder="HH:MM"
                                                    value={record.fim}
                                                    onChange={(e) => handleRecordChange(record.day, 'fim', e.target.value)}
                                                    className={`h-9 w-full text-center rounded-lg shadow-2xs transition-all duration-150 border-slate-200 text-xs ${
                                                        isModified
                                                            ? "bg-white border-rose-200/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 text-rose-800 font-medium"
                                                            : hasHours 
                                                                ? "bg-white border-emerald-200/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50 text-emerald-800 font-medium" 
                                                                : "bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200/50"
                                                    }`}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input 
                                                    type="number" 
                                                    placeholder="0"
                                                    step="0.5"
                                                    value={record.horasNormais}
                                                    onChange={(e) => handleRecordChange(record.day, 'horasNormais', e.target.value)}
                                                    className="h-9 w-full text-center font-medium text-xs rounded-lg shadow-2xs transition-all duration-150 border-slate-200 bg-white"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input 
                                                    type="number" 
                                                    placeholder="0"
                                                    step="0.5"
                                                    value={record.horasNoturnas}
                                                    onChange={(e) => handleRecordChange(record.day, 'horasNoturnas', e.target.value)}
                                                    className="h-9 w-full text-center font-semibold text-xs rounded-lg shadow-2xs transition-all duration-150 border-indigo-200 bg-indigo-50/40 text-indigo-700"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <select
                                                    value={record.obra}
                                                    onChange={(e) => handleObraChange(record.day, e.target.value)}
                                                    className={`flex h-9 w-full rounded-lg border px-2 py-1 text-xs shadow-2xs transition-all duration-150 border-slate-200 focus-visible:outline-none focus:ring-2 focus:ring-offset-0 ${
                                                        isModified
                                                            ? "bg-white border-rose-200/80 focus:border-rose-500 focus:ring-rose-200/50 text-slate-700"
                                                            : hasHours 
                                                                ? "bg-white border-emerald-200/80 focus:border-emerald-500 focus:ring-emerald-200/50 text-slate-700" 
                                                                : "bg-white focus:border-violet-500 focus:ring-violet-200/50 text-slate-600"
                                                    }`}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {clientSites.map((site) => (
                                                        <option key={site.id} value={site.id}>{site.name}</option>
                                                    ))}
                                                    <option value="create_new" className="text-violet-600 font-semibold bg-violet-50 hover:bg-violet-100">+ Cadastrar Nova Obra (Setup Taller)...</option>
                                                </select>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input 
                                                    type="number" 
                                                    placeholder="0"
                                                    step="0.01"
                                                    value={record.totalHoras}
                                                    onChange={(e) => handleRecordChange(record.day, 'totalHoras', e.target.value)}
                                                    className={`h-9 w-full text-center font-bold text-xs rounded-lg shadow-2xs transition-all duration-150 border-slate-200 ${
                                                        isModified
                                                            ? "text-rose-750 bg-rose-50/40 border-rose-200/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50"
                                                            : hasHours 
                                                                ? "text-emerald-700 bg-emerald-50/40 border-emerald-200/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50" 
                                                                : "bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200/50 text-slate-400"
                                                    }`}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            <Dialog open={newSiteOpen} onOpenChange={setNewSiteOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Setup de Obra / Centro de Custo</DialogTitle>
                        <DialogDescription>
                            Adicione uma nova obra vinculada a este cliente ({clienteNome}). Ela estará imediatamente disponível no grid.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="site_name" className="text-right">
                                Nome da Obra
                            </Label>
                            <Input
                                id="site_name"
                                value={newSiteName}
                                onChange={(e) => setNewSiteName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: MDF-TARREGA ou Taller"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setNewSiteOpen(false);
                            setNewSiteName('');
                        }} disabled={creatingSite}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateSite} disabled={creatingSite}>
                            {creatingSite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Cadastrar Obra
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
