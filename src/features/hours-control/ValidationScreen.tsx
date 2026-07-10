import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Save, X, Sparkles, ZoomIn, ZoomOut, Maximize, Clock, Building2, Briefcase, User, Wrench, Calendar, CheckCircle2 } from 'lucide-react';
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
            let matched = allClients?.find(c => {
                const normLegal = normalizeName(c.legal_name);
                const normTrade = normalizeName(c.trade_name);
                return (
                    normLegal === normTarget || 
                    normTrade === normTarget ||
                    (normLegal.length > 3 && normTarget.includes(normLegal)) ||
                    (normTarget.length > 3 && normLegal.includes(normTarget)) ||
                    (normTrade.length > 3 && normTarget.includes(normTrade)) ||
                    (normTarget.length > 3 && normTrade.includes(normTarget))
                );
            });

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
                        empresa_id: matched.empresa_id,
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

                // Find existing record
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dbRec = existingHours?.find(h => h.data_trabalho === dayStr);

                // Apply pre-selection logic for obra if new record and exactly 1 site exists
                let initialObra = '';
                if (dbRec) {
                    initialObra = dbRec.obra_id || '';
                } else if (finalSites.length === 1) {
                    initialObra = finalSites[0].id;
                }

                return {
                    day: dayNum,
                    weekday: weekdayFormatted,
                    inicio: dbRec?.hora_inicio ? dbRec.hora_inicio.substring(0, 5) : '',
                    fim: dbRec?.hora_fim ? dbRec.hora_fim.substring(0, 5) : '',
                    obra: initialObra,
                    totalHoras: dbRec?.horas_totais ? String(dbRec.horas_totais) : '',
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
                    updated.totalHoras = duration > 0 ? String(duration) : '';
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
                    bucket_id: "extracao-horas",
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

                                return {
                                    ...r,
                                    inicio: hasNoHours ? '' : (extDay.inicio ? extDay.inicio.substring(0, 5) : ''),
                                    fim: hasNoHours ? '' : (extDay.fim ? extDay.fim.substring(0, 5) : ''),
                                    obra: hasNoHours ? '' : matchedObraId,
                                    totalHoras: hasNoHours ? '' : String(extDay.total_horas)
                                };
                            }
                            return {
                                ...r,
                                inicio: '',
                                fim: '',
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
            const mockTarifaFaturada = targetFuncName?.toLowerCase().includes('soldador') ? 25.50 : (targetFuncName?.toLowerCase().includes('tubero') ? 28.00 : 27.00);

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
                    return {
                        worker_id: workerId,
                        client_id: clientId,
                        data_trabalho: dayStr,
                        hora_inicio: r.inicio ? `${r.inicio}:00` : null,
                        hora_fim: r.fim ? `${r.fim}:00` : null,
                        horas_totais: parseFloat(r.totalHoras),
                        status: 'pending_review',
                        funcao_id: workerFuncId,
                        obra_id: r.obra || null,
                        tarifa_faturada: mockTarifaFaturada
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

            const { error: updateError } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({ status: 'validado' })
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
            <Card className="flex-1 lg:w-1/2 flex flex-col overflow-hidden border">
                <div className="bg-muted px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Documento: {workerName}</h3>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                <div className="flex-1 bg-muted/30 relative flex items-center justify-center overflow-hidden">
                    {fileUrl ? (
                        isPdf ? (
                            <iframe 
                                src={fileUrl.includes('#') ? fileUrl : `${fileUrl}#navpanes=0`} 
                                className="w-full h-full rounded-md border-0 bg-white"
                                title="Document Viewer"
                            />
                        ) : (
                            <div className="w-full h-full relative flex flex-col items-center rounded-md overflow-hidden bg-black/5">
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
                        <div className="text-muted-foreground flex flex-col items-center">
                            <span className="mb-2">Nenhum documento selecionado para visualização.</span>
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
                    <div className="flex flex-col sm:flex-row gap-3 xl:min-w-[340px]">
                        {/* KPI Horas Totais */}
                        <div className="flex-1 flex items-center justify-between gap-4 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 py-4 rounded-2xl shadow-lg shadow-indigo-100/50 transition-all duration-300 hover:scale-[1.02] border border-indigo-500/20">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Horas Totais</span>
                                <span className="text-3xl font-black tracking-tight">{totalHours.toFixed(2)}h</span>
                            </div>
                            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                                <Clock className="h-5 w-5 text-white" />
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
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                const daysWithHours = records.filter(r => (parseFloat(r.totalHoras) || 0) > 0).map(r => r.day);
                                setSelectedDays(daysWithHours);
                                if (daysWithHours.length > 0) {
                                    toast.info(`${daysWithHours.length} dias com horas foram marcados. Agora selecione a Obra em lote abaixo.`);
                                } else {
                                    toast.warning("Não há nenhum dia com horas preenchidas para selecionar.");
                                }
                            }}
                            disabled={loading || loadingSites || records.length === 0} 
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50/50 font-semibold shadow-sm transition-all py-2"
                        >
                            Selecionar Dias c/ Horas
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
                
                {/* Bulk Action Bar */}
                {selectedDays.length > 0 && (
                    <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-4 text-indigo-900 text-xs font-semibold animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5">
                            <span className="bg-indigo-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                                {selectedDays.length}
                            </span>
                            <span>{selectedDays.length === 1 ? 'dia selecionado' : 'dias selecionados'}</span>
                        </div>
                        <div className="h-4 w-px bg-indigo-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-normal">Aplicar Obra em Lote:</span>
                            <select
                                onChange={(e) => {
                                    const siteId = e.target.value;
                                    if (siteId) {
                                        handleBulkApplyObra(siteId);
                                    }
                                    e.target.value = '';
                                }}
                                className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
                            >
                                <option value="">Selecione uma obra...</option>
                                {clientSites.map((site) => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setSelectedDays([])}
                            className="ml-auto text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline"
                        >
                            Desmarcar todos
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
                                    <TableHead className="w-[60px] text-center font-bold text-slate-600">Dia</TableHead>
                                    <TableHead className="w-[130px] font-bold text-slate-600">Dia da Semana</TableHead>
                                    <TableHead className="w-[100px] text-center font-bold text-slate-600">Inicio</TableHead>
                                    <TableHead className="w-[100px] text-center font-bold text-slate-600">Fim</TableHead>
                                    <TableHead className="font-bold text-slate-600">Obra/Centro de Custo</TableHead>
                                    <TableHead className="w-[125px] text-center font-bold text-slate-600">Total Horas</TableHead>
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
                                                <span className={`text-sm ${
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
                                                    className={`h-9 w-full text-center rounded-lg shadow-2xs transition-all duration-150 border-slate-200 ${
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
                                                    className={`h-9 w-full text-center rounded-lg shadow-2xs transition-all duration-150 border-slate-200 ${
                                                        isModified
                                                            ? "bg-white border-rose-200/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 text-rose-800 font-medium"
                                                            : hasHours 
                                                                ? "bg-white border-emerald-200/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50 text-emerald-800 font-medium" 
                                                                : "bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200/50"
                                                    }`}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <select
                                                    value={record.obra}
                                                    onChange={(e) => handleObraChange(record.day, e.target.value)}
                                                    className={`flex h-9 w-full rounded-lg border px-3 py-1 text-sm shadow-2xs transition-all duration-150 border-slate-200 focus-visible:outline-none focus:ring-2 focus:ring-offset-0 ${
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
                                                    className={`h-9 w-full text-center font-bold rounded-lg shadow-2xs transition-all duration-150 border-slate-200 ${
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
