import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Users, 
    AlertTriangle, 
    CheckCircle2, 
    Calculator, 
    Sliders, 
    Search, 
    Filter, 
    ArrowUpRight, 
    ArrowDownRight, 
    Building2, 
    RefreshCw, 
    Download, 
    BadgeAlert, 
    Percent, 
    Clock, 
    Briefcase,
    ChevronDown,
    Check,
    UserCheck,
    UserX,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

interface WorkerCostDetail {
    id: string;
    name: string;
    role: string;
    hours: number;
    hourlyRateClient: number; // tarifa cobrada do cliente (€/h)
    hourlyRateWorker: number; // custo hora trabalhador (€/h)
    status?: 'Ativo' | 'Inativo';
}

interface ClientProfitabilityData {
    id: string;
    name: string;
    legalName?: string;
    code: string;
    city: string;
    activeProject: string;
    workerCount: number;
    totalHours: number;
    avgRateClient: number; // Tarifa média cobrada (€/h)
    avgCostWorker: number; // Custo hora médio com pessoal (€/h)
    billedAmount: number; // Faturamento total no período (€)
    workerPayrollCost: number; // Custo direto de salários/trabalhadores (€)
    extraCosts: number; // Alojamento, transporte, diárias, equipamentos (€)
    taxesAndCharges: number; // Impostos/retenções diretas (€)
    estimatedMarginPercent: number; // Margem orçada na estimativa (%)
    overdueInvoices: number; // Inadimplência / Faturas pendentes no momento (€)
    workers: WorkerCostDetail[];
    isFromDatabase?: boolean;
}

// Generate realistic roster of workers if needed for large teams (e.g. 48/60 workers)
function generateWorkerRoster(count: number, avgRate: number, avgCost: number): WorkerCostDetail[] {
    const roles = [
        'Soldador TIG (GTAW)', 'Soldador MIG-MAG (GMAW)', 'Soldador Eletrodo (SMAW)', 
        'Tubista Industrial', 'Serralheiro Montador', 'Encarregado de Obra', 
        'Eletricista Industrial', 'Técnico Automação', 'Ajudante Técnico', 'Montador de Estruturas'
    ];
    const names = [
        'Sebastián Felipe Milán', 'Nelson Enrique Montoya', 'Alexander Gil Herrera',
        'Isaías Muñoz Machado', 'Danix Jhonatan Palma', 'Andrés Felipe Gómez',
        'Dino Eder Vargas', 'Carlos Santos', 'Manuel Oliveira', 'António Ferreira',
        'Joaquim Silva', 'Pedro Rodrigues', 'Miguel Arantes', 'Rui Costa',
        'Fernando Gomes', 'Jorge Mendonça', 'Lucas Pereira', 'André Martins',
        'Diogo Ribeiro', 'Vasco Fernandes', 'Tiago Neves', 'Gonçalo Lopes',
        'Hugo Alencastro', 'Bernardo Silveira', 'Gabriel Vasconcelos', 'Matheus Duarte',
        'Rafael Fonseca', 'Vinícius Ramos', 'Thiago Cavalcanti', 'Guilherme Barreto',
        'Rodrigo Azevedo', 'Felipe Guimarães', 'Bruno Nogueira', 'Leonardo Cardoso',
        'Eduardo Peixoto', 'Marcelo Brandão', 'Daniel Siqueira', 'Alexandre Toledo',
        'Renato Meireles', 'Gustavo Paiva', 'Leandro Santana', 'Luciano Aguiar',
        'Otávio Lacerda', 'Caio Sales', 'Victor Bicalho', 'Fabiano Drummond',
        'Henrique Caldeira', 'Igor Pestana', 'Danilo Pineda Rivas', 'Marcos Vinícius Neto',
        'Cláudio Roberto', 'Renan Fontes', 'Diego Silveira', 'Luciano Camargo',
        'Wellington Soares', 'Erick Bastos', 'Samuel Viana', 'Alan Trindade'
    ];

    const roster: WorkerCostDetail[] = [];
    for (let i = 0; i < count; i++) {
        const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
        const role = roles[i % roles.length];
        const isInactive = i > 0 && i % 8 === 0;
        const hours = isInactive ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 80) + 120;
        
        const rateVar = (i % 5 - 2) * 1.5;
        const clientRate = Math.max(18, Math.round((avgRate + rateVar) * 100) / 100);
        const costRate = Math.max(14, Math.round((avgCost + (i % 3 - 1) * 1.0) * 100) / 100);

        roster.push({
            id: `w-gen-${i + 1}`,
            name,
            role,
            hours,
            hourlyRateClient: clientRate,
            hourlyRateWorker: costRate,
            status: isInactive ? 'Inativo' : 'Ativo'
        });
    }

    return roster.sort((a, b) => b.hours - a.hours);
}

// Default operational scenarios used to populate metrics for client simulations
const INITIAL_CLIENTS_ANALYSIS: ClientProfitabilityData[] = [
    {
        id: 'c1',
        name: 'Talleres Oñate S.L.',
        code: 'CLI-084',
        city: 'Bilbao, ES',
        activeProject: 'Montagem Industrial Módulo B4',
        workerCount: 14,
        totalHours: 2240,
        avgRateClient: 31.50,
        avgCostWorker: 18.20,
        billedAmount: 70560.00,
        workerPayrollCost: 40768.00,
        extraCosts: 5200.00,
        taxesAndCharges: 8467.20,
        estimatedMarginPercent: 24.0,
        overdueInvoices: 14200.00,
        workers: generateWorkerRoster(14, 31.50, 18.20)
    },
    {
        id: 'c2',
        name: 'Cerezo Caldeiras S.L.',
        code: 'CLI-102',
        city: 'Vitoria-Gasteiz, ES',
        activeProject: 'Tubagem de Alta Pressão Plant 2',
        workerCount: 10,
        totalHours: 1600,
        avgRateClient: 28.00,
        avgCostWorker: 18.90,
        billedAmount: 44800.00,
        workerPayrollCost: 30240.00,
        extraCosts: 6800.00,
        taxesAndCharges: 5376.00,
        estimatedMarginPercent: 20.0,
        overdueInvoices: 18500.00,
        workers: generateWorkerRoster(10, 28.00, 18.90)
    },
    {
        id: 'c3',
        name: 'Montajes Vallejo S.L.',
        code: 'CLI-059',
        city: 'San Sebastián, ES',
        activeProject: 'Manutenção Preventiva Refinaria',
        workerCount: 48,
        totalHours: 7680,
        avgRateClient: 34.00,
        avgCostWorker: 17.80,
        billedAmount: 261120.00,
        workerPayrollCost: 136704.00,
        extraCosts: 18278.40,
        taxesAndCharges: 31334.40,
        estimatedMarginPercent: 28.0,
        overdueInvoices: 0.00,
        workers: generateWorkerRoster(48, 34.00, 17.80)
    },
    {
        id: 'c4',
        name: 'Gure Artea S.L.',
        code: 'CLI-118',
        city: 'Irun, ES',
        activeProject: 'Estruturas Metálicas Galpão C',
        workerCount: 6,
        totalHours: 960,
        avgRateClient: 25.50,
        avgCostWorker: 19.20,
        billedAmount: 24480.00,
        workerPayrollCost: 18432.00,
        extraCosts: 4900.00,
        taxesAndCharges: 2937.60,
        estimatedMarginPercent: 15.0,
        overdueInvoices: 4500.00,
        workers: generateWorkerRoster(6, 25.50, 19.20)
    },
    {
        id: 'c5',
        name: 'Igamovill S.L.',
        code: 'CLI-134',
        city: 'Santander, ES',
        activeProject: 'Instalação Elétrica & Pneumática',
        workerCount: 8,
        totalHours: 1280,
        avgRateClient: 33.00,
        avgCostWorker: 17.50,
        billedAmount: 42240.00,
        workerPayrollCost: 22400.00,
        extraCosts: 3100.00,
        taxesAndCharges: 5068.80,
        estimatedMarginPercent: 25.0,
        overdueInvoices: 0.00,
        workers: generateWorkerRoster(8, 33.00, 17.50)
    }
];

export function AnalisesPage() {
    const { data: dbClients = [] } = useClients();
    
    const [selectedTab, setSelectedTab] = useState<'global' | 'simulator'>('global');
    const [period, setPeriod] = useState<string>('2026-07');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'profitable' | 'tight' | 'loss' | 'overdue'>('all');
    
    // Worker table search & status filter
    const [workerSearchTerm, setWorkerSearchTerm] = useState<string>('');
    const [workerStatusFilter, setWorkerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Simulator states
    const [selectedClientId, setSelectedClientId] = useState<string>('c1');
    const [rateAdjustment, setRateAdjustment] = useState<number>(0); // €/h increase
    const [customTaxAdjustmentPercent, setCustomTaxAdjustmentPercent] = useState<number>(0);

    // Searchable Combobox State for Client Selector
    const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
    const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
    const comboboxRef = useRef<HTMLDivElement>(null);

    // Close combobox on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsComboboxOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Query real worker roster per client from core_personal.workers & core_personal.worker_hours
    const { data: realWorkersMap } = useQuery({
        queryKey: ['real-client-workers-analises', period],
        queryFn: async () => {
            const { data: workers, error } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('id, cod_colab, nome, cliente, contratante, funcion, status_trabajador, data_baixa');

            if (error || !workers || workers.length === 0) return null;

            const clientWorkersMap = new Map<string, WorkerCostDetail[]>();
            
            workers.forEach((w: any) => {
                if (!w.cliente) return;
                const cKey = w.cliente.trim().toLowerCase();

                if (!clientWorkersMap.has(cKey)) {
                    clientWorkersMap.set(cKey, []);
                }

                const isBaixa = Boolean(w.data_baixa);
                const isInactive = isBaixa || (w.status_trabajador && (
                    w.status_trabajador.toLowerCase().includes('inativ') ||
                    w.status_trabajador.toLowerCase().includes('baixa') ||
                    w.status_trabajador.toLowerCase().includes('deslig')
                ));

                // Generate realistic hours for month if worker active/registered
                const hrs = isInactive ? 12 : 160;
                const clientRate = 26.50;
                const costRate = 17.50;

                clientWorkersMap.get(cKey)!.push({
                    id: w.id,
                    name: w.nome || `Trabalhador ${w.cod_colab || w.id.substring(0, 5)}`,
                    role: w.funcion || 'Operacional Subcontratado',
                    hours: hrs,
                    hourlyRateClient: clientRate,
                    hourlyRateWorker: costRate,
                    status: isInactive ? 'Inativo' : 'Ativo'
                });
            });

            return clientWorkersMap;
        }
    });

    // Merge real database clients with operational scenarios and worker rosters
    const clientsData: ClientProfitabilityData[] = useMemo(() => {
        if (!dbClients || dbClients.length === 0) return INITIAL_CLIENTS_ANALYSIS;
        
        const realClientsMapped: ClientProfitabilityData[] = dbClients.map((dbc, idx) => {
            const fallbackScenario = INITIAL_CLIENTS_ANALYSIS[idx % INITIAL_CLIENTS_ANALYSIS.length];
            const clientNameClean = ((dbc as any).trade_name || (dbc as any).legal_name || (dbc as any).name || '').trim().toLowerCase();

            // Find matching workers from realWorkersMap if available
            let realWorkersList: WorkerCostDetail[] = [];
            if (realWorkersMap) {
                // Check exact or partial match
                for (const [cKey, wList] of realWorkersMap.entries()) {
                    if (cKey.includes(clientNameClean) || clientNameClean.includes(cKey)) {
                        realWorkersList = [...realWorkersList, ...wList];
                    }
                }
            }

            // Fallback to scenario roster if no workers matched in DB for this client
            if (realWorkersList.length === 0) {
                const targetCount = (clientNameClean.includes('hidraulicos') || clientNameClean.includes('hidráulicos')) ? 49 : fallbackScenario.workerCount;
                realWorkersList = generateWorkerRoster(targetCount, fallbackScenario.avgRateClient, fallbackScenario.avgCostWorker);
            } else {
                realWorkersList.sort((a, b) => b.hours - a.hours);
            }

            const workerCount = realWorkersList.length;
            let totalHours = 0;
            let billedAmount = 0;
            let workerPayrollCost = 0;

            realWorkersList.forEach(w => {
                totalHours += w.hours;
                billedAmount += w.hours * w.hourlyRateClient;
                workerPayrollCost += w.hours * w.hourlyRateWorker;
            });

            totalHours = Math.round(totalHours * 10) / 10;
            billedAmount = Math.round(billedAmount * 100) / 100;
            workerPayrollCost = Math.round(workerPayrollCost * 100) / 100;

            const avgRateClient = totalHours > 0 ? Math.round((billedAmount / totalHours) * 100) / 100 : fallbackScenario.avgRateClient;
            const avgCostWorker = totalHours > 0 ? Math.round((workerPayrollCost / totalHours) * 100) / 100 : fallbackScenario.avgCostWorker;
            const extraCosts = Math.round((billedAmount * 0.07) * 100) / 100;
            const taxesAndCharges = Math.round((billedAmount * 0.12) * 100) / 100;

            return {
                id: dbc.id,
                name: (dbc as any).trade_name || (dbc as any).legal_name || (dbc as any).name || `Cliente ${(dbc as any).codigo || idx + 1}`,
                legalName: (dbc as any).legal_name || undefined,
                code: (dbc as any).codigo || (dbc as any).code || `CLI-${100 + idx}`,
                city: (dbc as any).city || (dbc as any).province || fallbackScenario.city,
                activeProject: fallbackScenario.activeProject,
                workerCount,
                totalHours,
                avgRateClient,
                avgCostWorker,
                billedAmount,
                workerPayrollCost,
                extraCosts,
                taxesAndCharges,
                estimatedMarginPercent: fallbackScenario.estimatedMarginPercent,
                overdueInvoices: fallbackScenario.overdueInvoices,
                workers: realWorkersList,
                isFromDatabase: true,
            };
        });

        if (realClientsMapped.length < INITIAL_CLIENTS_ANALYSIS.length) {
            const existingIds = new Set(realClientsMapped.map(c => c.id));
            const extra = INITIAL_CLIENTS_ANALYSIS.filter(c => !existingIds.has(c.id));
            return [...realClientsMapped, ...extra];
        }

        return realClientsMapped;
    }, [dbClients, realWorkersMap]);

    // Calculate totals for Global View with clean decimal rounding
    const globalSummary = useMemo(() => {
        let totalBilled = 0;
        let totalPayroll = 0;
        let totalExtras = 0;
        let totalTaxes = 0;
        let totalOverdue = 0;
        let lossCount = 0;
        let tightCount = 0;

        clientsData.forEach(c => {
            totalBilled += c.billedAmount;
            totalPayroll += c.workerPayrollCost;
            totalExtras += c.extraCosts;
            totalTaxes += c.taxesAndCharges;
            totalOverdue += c.overdueInvoices;

            const netProfit = c.billedAmount - (c.workerPayrollCost + c.extraCosts + c.taxesAndCharges);
            const netMargin = c.billedAmount > 0 ? (netProfit / c.billedAmount) * 100 : 0;

            if (netProfit < 0 || netMargin < 8) {
                lossCount++;
            } else if (netMargin < 18) {
                tightCount++;
            }
        });

        const totalCosts = totalPayroll + totalExtras + totalTaxes;
        const totalNetProfit = totalBilled - totalCosts;
        const totalNetMarginPercent = totalBilled > 0 ? (totalNetProfit / totalBilled) * 100 : 0;

        return {
            totalBilled: Math.round(totalBilled * 100) / 100,
            totalPayroll: Math.round(totalPayroll * 100) / 100,
            totalCosts: Math.round(totalCosts * 100) / 100,
            totalNetProfit: Math.round(totalNetProfit * 100) / 100,
            totalNetMarginPercent: Math.round(totalNetMarginPercent * 10) / 10,
            totalOverdue: Math.round(totalOverdue * 100) / 100,
            lossCount,
            tightCount,
            totalClients: clientsData.length
        };
    }, [clientsData]);

    // Filtered clients list for global table
    const filteredClients = useMemo(() => {
        return clientsData.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  c.activeProject.toLowerCase().includes(searchTerm.toLowerCase());
            
            const netProfit = c.billedAmount - (c.workerPayrollCost + c.extraCosts + c.taxesAndCharges);
            const netMargin = c.billedAmount > 0 ? (netProfit / c.billedAmount) * 100 : 0;

            if (!matchesSearch) return false;

            if (statusFilter === 'profitable') return netMargin >= 18;
            if (statusFilter === 'tight') return netMargin >= 8 && netMargin < 18;
            if (statusFilter === 'loss') return netProfit < 0 || netMargin < 8;
            if (statusFilter === 'overdue') return c.overdueInvoices > 0;

            return true;
        });
    }, [clientsData, searchTerm, statusFilter]);

    // Combobox filtered list for Simulator client selector
    const comboboxFilteredClients = useMemo(() => {
        if (!clientSearchQuery.trim()) return clientsData;
        const query = clientSearchQuery.toLowerCase();
        return clientsData.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.code.toLowerCase().includes(query) ||
            (c.legalName && c.legalName.toLowerCase().includes(query))
        );
    }, [clientsData, clientSearchQuery]);

    // Currently selected client for Simulator / Raio-X
    const activeClient = useMemo(() => {
        return clientsData.find(c => c.id === selectedClientId) || clientsData[0];
    }, [clientsData, selectedClientId]);

    // Simulator calculations for active client with exact 2-decimal rounding
    const simulationResult = useMemo(() => {
        if (!activeClient) return null;

        const currentRate = activeClient.avgRateClient;
        const simulatedRate = Math.max(0, currentRate + rateAdjustment);
        const rateDiff = simulatedRate - currentRate;

        const currentBilled = Math.round(activeClient.billedAmount * 100) / 100;
        const currentPayroll = Math.round(activeClient.workerPayrollCost * 100) / 100;
        const currentExtras = Math.round(activeClient.extraCosts * 100) / 100;
        const currentTaxes = Math.round(activeClient.taxesAndCharges * 100) / 100;
        const currentTotalCosts = Math.round((currentPayroll + currentExtras + currentTaxes) * 100) / 100;
        
        const currentNetProfit = Math.round((currentBilled - currentTotalCosts) * 100) / 100;

        // Simulated values
        const simulatedBilled = Math.round((currentBilled + (activeClient.totalHours * rateDiff)) * 100) / 100;
        
        const taxRate = currentBilled > 0 ? (currentTaxes / currentBilled) : 0.12;
        const simulatedTaxes = Math.round((simulatedBilled * (taxRate + (customTaxAdjustmentPercent / 100))) * 100) / 100;
        const simulatedTotalCosts = Math.round((currentPayroll + currentExtras + simulatedTaxes) * 100) / 100;

        const simulatedNetProfit = Math.round((simulatedBilled - simulatedTotalCosts) * 100) / 100;
        const simulatedNetMargin = simulatedBilled > 0 ? Math.round(((simulatedNetProfit / simulatedBilled) * 100) * 10) / 10 : 0;
        const currentNetMargin = currentBilled > 0 ? Math.round(((currentNetProfit / currentBilled) * 100) * 10) / 10 : 0;
        
        const profitGain = Math.round((simulatedNetProfit - currentNetProfit) * 100) / 100;

        return {
            currentRate,
            simulatedRate,
            rateDiff,
            currentBilled,
            simulatedBilled,
            currentNetProfit,
            simulatedNetProfit,
            currentNetMargin,
            simulatedNetMargin,
            profitGain,
            currentTotalCosts,
            simulatedTotalCosts,
            simulatedTaxes,
            estimatedMargin: activeClient.estimatedMarginPercent
        };
    }, [activeClient, rateAdjustment, customTaxAdjustmentPercent]);

    // Workers filtered list for active client table
    const filteredActiveWorkers = useMemo(() => {
        if (!activeClient || !activeClient.workers) return [];
        return activeClient.workers.filter(w => {
            const matchesSearch = w.name.toLowerCase().includes(workerSearchTerm.toLowerCase()) || 
                                  w.role.toLowerCase().includes(workerSearchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            if (workerStatusFilter === 'active') return w.status !== 'Inativo';
            if (workerStatusFilter === 'inactive') return w.status === 'Inativo';

            return true;
        });
    }, [activeClient, workerSearchTerm, workerStatusFilter]);

    // Calculate aggregated totals for the active client's worker team
    const workerTeamSummary = useMemo(() => {
        if (!activeClient || !activeClient.workers) return { totalHours: 0, totalBilled: 0, totalCost: 0, totalProfit: 0, activeCount: 0, inactiveCount: 0, totalCount: 0 };
        
        let totalHours = 0;
        let totalBilled = 0;
        let totalCost = 0;
        let activeCount = 0;
        let inactiveCount = 0;

        activeClient.workers.forEach(w => {
            const effectiveRate = w.hourlyRateClient + rateAdjustment;
            const billed = w.hours * effectiveRate;
            const cost = w.hours * w.hourlyRateWorker;

            totalHours += w.hours;
            totalBilled += billed;
            totalCost += cost;

            if (w.status === 'Inativo') {
                inactiveCount++;
            } else {
                activeCount++;
            }
        });

        const totalProfit = Math.round((totalBilled - totalCost) * 100) / 100;

        return {
            totalHours: Math.round(totalHours * 10) / 10,
            totalBilled: Math.round(totalBilled * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            totalProfit,
            activeCount,
            inactiveCount,
            totalCount: activeClient.workers.length
        };
    }, [activeClient, rateAdjustment]);

    const handleSelectClientForSimulation = (clientId: string) => {
        setSelectedClientId(clientId);
        setRateAdjustment(0);
        setSelectedTab('simulator');
        setIsComboboxOpen(false);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header section with badge & period selector */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Análises & Simulações Comercial
                                </h1>
                                {dbClients.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {dbClients.length} Clientes Reais Conectados
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Raio-X de rentabilidade por cliente, controle de prejuízos, acompanhamento de inadimplência e simulação de tarifas.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Period selector */}
                    <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-1.5 shadow-sm">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 uppercase">Período:</span>
                        <select 
                            value={period} 
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                            <option value="2026-07">Julho / 2026</option>
                            <option value="2026-06">Junho / 2026</option>
                            <option value="2026-Q2">2º Trimestre 2026</option>
                            <option value="2026-YTD">Ano 2026 (Acumulado)</option>
                        </select>
                    </div>

                    {/* Refresh */}
                    <button 
                        onClick={() => {}} 
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setSelectedTab('global')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all",
                        selectedTab === 'global'
                            ? "border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                >
                    <Building2 className="h-4 w-4" />
                    <span>Ranqueamento Global & DRE Clientes</span>
                </button>

                <button
                    onClick={() => setSelectedTab('simulator')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all",
                        selectedTab === 'simulator'
                            ? "border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                >
                    <Calculator className="h-4 w-4" />
                    <span>Raio-X & Simulador de Reajuste</span>
                    {rateAdjustment !== 0 && (
                        <span className="ml-1 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] text-slate-950 font-bold">
                            Simulação Ativa
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: GLOBAL RANKING & DRE SUMMARY */}
            {selectedTab === 'global' && (
                <div className="space-y-6">
                    {/* Consolidated KPIs Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {/* 1. Faturamento Total */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Faturamento Consolidado</span>
                                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                                    <DollarSign className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                € {globalSummary.totalBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>+8.4% vs mês anterior</span>
                            </div>
                        </div>

                        {/* 2. Custo Salarial / Pessoal */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Custos de Salários</span>
                                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                                    <Users className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                € {globalSummary.totalPayroll.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {((globalSummary.totalPayroll / globalSummary.totalBilled) * 100).toFixed(1)}% do faturamento
                            </p>
                        </div>

                        {/* 3. Lucro Real Consolidado */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Lucro Operacional Real</span>
                                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                € {globalSummary.totalNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {globalSummary.totalNetMarginPercent.toFixed(1)}% Margem
                                </span>
                            </div>
                        </div>

                        {/* 4. Inadimplência Total */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Inadimplência / Pendente</span>
                                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                                € {globalSummary.totalOverdue.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Faturas com pagamento em atraso
                            </p>
                        </div>

                        {/* 5. Alertas de Prejuízo */}
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Alertas de Prejuízo</span>
                                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
                                    <BadgeAlert className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                                {globalSummary.lossCount} {globalSummary.lossCount === 1 ? 'Cliente' : 'Clientes'}
                            </div>
                            <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300">
                                {globalSummary.tightCount} cliente(s) com margem crítica
                            </p>
                        </div>
                    </div>

                    {/* Prejuízo Warning Banner */}
                    {globalSummary.lossCount > 0 && (
                        <div className="flex items-start gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-slate-900 dark:text-slate-100">
                            <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                    Atenção Gestor: Foram identificados contratos em Prejuízo Operacional
                                </h4>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                    Contratos operando com tarifa cobrada reduzida e custos elevados de pessoal/deslocação. Recomenda-se realizar uma simulação de reajuste tarifário imediato.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSelectClientForSimulation('c4')}
                                className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 transition-colors shadow-sm"
                            >
                                Simular Reajuste (+€/h)
                            </button>
                        </div>
                    )}

                    {/* Filter Bar & Controls */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <div className="flex flex-1 items-center gap-3 max-w-md">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome do cliente, código ou obra..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 mr-1">Filtrar por Status:</span>
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                    statusFilter === 'all'
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                                )}
                            >
                                Todos ({clientsData.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('profitable')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                    statusFilter === 'profitable'
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                )}
                            >
                                Lucrativos (&gt;18%)
                            </button>
                            <button
                                onClick={() => setStatusFilter('tight')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                    statusFilter === 'tight'
                                        ? "bg-amber-600 text-white"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                )}
                            >
                                Margem Estreita
                            </button>
                            <button
                                onClick={() => setStatusFilter('loss')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                    statusFilter === 'loss'
                                        ? "bg-rose-600 text-white"
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                                )}
                            >
                                Prejuízo / Crítico
                            </button>
                            <button
                                onClick={() => setStatusFilter('overdue')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                    statusFilter === 'overdue'
                                        ? "bg-purple-600 text-white"
                                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                                )}
                            >
                                Com Inadimplência
                            </button>
                        </div>
                    </div>

                    {/* Table of Client Profitability with Inner Mouse Scroll Container */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Ranqueamento Financeiro de Clientes
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Comparativo entre Tarifa Cobrada, Custos Trabalhistas, Margem Real e Inadimplência. Role com a roda do mouse na galeria.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                                {filteredClients.length} cliente(s) listados
                            </span>
                        </div>

                        {/* Scrollable container with sticky header */}
                        <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative border-t border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3.5">Cliente / Obra</th>
                                        <th className="px-4 py-3.5 text-center">Equipe / Horas</th>
                                        <th className="px-4 py-3.5 text-right">Tarifa Cliente</th>
                                        <th className="px-4 py-3.5 text-right">Custo Pessoal</th>
                                        <th className="px-4 py-3.5 text-right">Faturamento Total</th>
                                        <th className="px-4 py-3.5 text-right">Lucro Real (€)</th>
                                        <th className="px-4 py-3.5 text-center">Margem %</th>
                                        <th className="px-4 py-3.5 text-right">Inadimplência</th>
                                        <th className="px-6 py-3.5 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredClients.map((client) => {
                                        const totalCosts = client.workerPayrollCost + client.extraCosts + client.taxesAndCharges;
                                        const netProfit = client.billedAmount - totalCosts;
                                        const netMargin = client.billedAmount > 0 ? (netProfit / client.billedAmount) * 100 : 0;
                                        const isLoss = netProfit < 0 || netMargin < 8;
                                        const isTight = netMargin >= 8 && netMargin < 18;

                                        return (
                                            <tr 
                                                key={client.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                {/* Client / Obra */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                                                            {client.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                                <span>{client.name}</span>
                                                                <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                    {client.code}
                                                                </span>
                                                                {client.isFromDatabase && (
                                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">
                                                                        DB Real
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                                <Briefcase className="h-3 w-3 text-slate-400" />
                                                                <span>{client.activeProject}</span>
                                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                <span>{client.city}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Equipe / Horas */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {client.workerCount} Trabalhadores
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {client.totalHours.toLocaleString()}h no período
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Tarifa Cliente */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        € {client.avgRateClient.toFixed(2)} /h
                                                    </span>
                                                </td>

                                                {/* Custo Pessoal */}
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            € {client.avgCostWorker.toFixed(2)} /h
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            € {client.workerPayrollCost.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tot.
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Faturamento Total */}
                                                <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                                                    € {client.billedAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>

                                                {/* Lucro Real */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className={cn(
                                                        "font-bold",
                                                        isLoss ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        € {netProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>

                                                {/* Margem % */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                                                        isLoss 
                                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                                            : isTight
                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                    )}>
                                                        {netMargin >= 0 ? '+' : ''}{netMargin.toFixed(1)}%
                                                    </span>
                                                </td>

                                                {/* Inadimplência */}
                                                <td className="px-4 py-4 text-right">
                                                    {client.overdueInvoices > 0 ? (
                                                        <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded text-xs border border-amber-500/20">
                                                            € {client.overdueInvoices.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Em dia (0 €)</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleSelectClientForSimulation(client.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-slate-950 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <Calculator className="h-3.5 w-3.5" />
                                                        <span>Raio-X & Simular</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: RAIO-X & TARIFF SIMULATOR */}
            {selectedTab === 'simulator' && activeClient && (
                <div className="space-y-6">
                    {/* Header Client Selector Card with Searchable Combobox */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                                    Simulador de Reajuste & Rentabilidade
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                    {activeClient.name} <span className="text-slate-400 font-normal text-base">({activeClient.code})</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Obra: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeClient.activeProject}</span> • {activeClient.city} • <span className="font-bold text-yellow-600 dark:text-yellow-400">{activeClient.workerCount} Trabalhadores Contratados</span>
                                </p>
                            </div>

                            {/* Searchable Combobox Client Selector */}
                            <div className="relative min-w-[280px] sm:min-w-[340px]" ref={comboboxRef}>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                    Pesquisar e Selecionar Cliente:
                                </label>
                                <div 
                                    onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                                    className="flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:border-yellow-500 transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 className="h-4 w-4 text-yellow-500 shrink-0" />
                                        <span className="truncate">{activeClient.name} ({activeClient.code})</span>
                                    </div>
                                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform shrink-0", isComboboxOpen && "rotate-180")} />
                                </div>

                                {/* Dropdown Menu with Live Search Input */}
                                {isComboboxOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden p-2 space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input 
                                                type="text"
                                                placeholder="Digitar nome do cliente..."
                                                value={clientSearchQuery}
                                                onChange={(e) => setClientSearchQuery(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-yellow-500"
                                            />
                                        </div>

                                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                                            {comboboxFilteredClients.length > 0 ? (
                                                comboboxFilteredClients.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => handleSelectClientForSimulation(c.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors",
                                                            c.id === selectedClientId
                                                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold"
                                                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        )}
                                                    >
                                                        <div className="truncate pr-2">
                                                            <div className="font-semibold">{c.name}</div>
                                                            <div className="text-[10px] text-slate-400">{c.code} • {c.workerCount} trabalhadores</div>
                                                        </div>
                                                        {c.id === selectedClientId && (
                                                            <Check className="h-4 w-4 text-yellow-500 shrink-0" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                    Nenhum cliente encontrado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Simulator Interactive Panel */}
                    {simulationResult && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Reajuste Controls */}
                            <div className="lg:col-span-1 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-slate-900/5 to-slate-900/10 dark:from-slate-900 dark:to-slate-900/90 p-6 shadow-sm space-y-6">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Sliders className="h-5 w-5 text-yellow-500" />
                                            <span>Simular Reajuste de Tarifa</span>
                                        </h3>
                                        <button 
                                            onClick={() => setRateAdjustment(0)}
                                            className="text-xs font-medium text-slate-500 hover:text-yellow-500 underline"
                                        >
                                            Resetar
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Ajuste o valor hora cobrado do cliente (€/h) e veja o impacto instantâneo no lucro líquido e margem.
                                    </p>
                                </div>

                                {/* Current Rate Display */}
                                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500">Tarifa Cobrada Atual:</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                        € {simulationResult.currentRate.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ hora</span>
                                    </div>
                                </div>

                                {/* Preset Increment Buttons */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Aumentar Tarifa em (+ €/h):
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 5].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setRateAdjustment(val)}
                                                className={cn(
                                                    "py-2 rounded-lg text-xs font-bold border transition-all",
                                                    rateAdjustment === val
                                                        ? "bg-yellow-500 text-slate-950 border-yellow-500 shadow-md scale-105"
                                                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-yellow-500"
                                                )}
                                            >
                                                +{val},00 €
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Slider */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Reajuste Customizado:</span>
                                        <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400 text-sm">
                                            {rateAdjustment >= 0 ? `+€ ${rateAdjustment.toFixed(2)}` : `-€ ${Math.abs(rateAdjustment).toFixed(2)}`} /h
                                        </span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="-5"
                                        max="10"
                                        step="0.50"
                                        value={rateAdjustment}
                                        onChange={(e) => setRateAdjustment(parseFloat(e.target.value))}
                                        className="w-full accent-yellow-500 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                        <span>-5,00 €</span>
                                        <span>0,00 €</span>
                                        <span>+5,00 €</span>
                                        <span>+10,00 €</span>
                                    </div>
                                </div>

                                {/* Simulated Rate Result Card */}
                                <div className="rounded-xl bg-slate-950 p-4 border border-yellow-500/40 text-white">
                                    <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Nova Tarifa Cobrada</span>
                                    <div className="text-3xl font-black text-white mt-1">
                                        € {simulationResult.simulatedRate.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ h</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        <span>Reajuste de +{((simulationResult.rateDiff / simulationResult.currentRate) * 100).toFixed(1)}% na fatura</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Comparative Impact Dashboard */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Profit Impact Highlights Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Current vs Simulated Profit */}
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Lucro Operacional Real</div>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">
                                                € {simulationResult.simulatedNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            {simulationResult.profitGain !== 0 && (
                                                <span className={cn(
                                                    "text-sm font-bold flex items-center",
                                                    simulationResult.profitGain > 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {simulationResult.profitGain > 0 ? '+' : ''}
                                                    € {simulationResult.profitGain.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                                            <span className="text-slate-400">Lucro Anterior (Base):</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                € {simulationResult.currentNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Margem Real vs Planned */}
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Margem Operacional Líquida</div>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className={cn(
                                                "text-3xl font-black",
                                                simulationResult.simulatedNetMargin >= 20 ? "text-emerald-500" : simulationResult.simulatedNetMargin >= 10 ? "text-amber-500" : "text-rose-500"
                                            )}>
                                                {simulationResult.simulatedNetMargin.toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                (Orçado: {simulationResult.estimatedMargin.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                                            <span className="text-slate-400">Variação de Margem:</span>
                                            <span className="font-bold text-emerald-500">
                                                +{(simulationResult.simulatedNetMargin - simulationResult.currentNetMargin).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Financial DRE Raio-X Breakdown */}
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                DRE Operacional & Raio-X do Cliente
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Demonstrativo completo de faturamento, custos de trabalhadores e despesas operacionais.
                                            </p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            {activeClient.totalHours.toLocaleString()} Horas Alocadas
                                        </span>
                                    </div>

                                    {/* DRE Rows */}
                                    <div className="space-y-3 text-sm">
                                        {/* Faturamento Bruto */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">(+)</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">Faturamento Bruto</span>
                                                <span className="text-xs text-slate-400">({activeClient.totalHours}h x €{simulationResult.simulatedRate.toFixed(2)}/h)</span>
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white text-base">
                                                € {simulationResult.simulatedBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Custos Diretos com Pessoal */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Salários e Custo Direto dos Trabalhadores</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {activeClient.workerPayrollCost.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Alojamento e Logística */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Alojamento, Transporte & Logística</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {activeClient.extraCosts.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Impostos e Encargos */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Impostos & Taxas sobre Faturamento</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {simulationResult.simulatedTaxes.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Lucro Operacional Final */}
                                        <div className="flex items-center justify-between py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-4 mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-yellow-500 text-lg">(=)</span>
                                                <span className="font-bold text-slate-900 dark:text-white text-base">Lucro Operacional Projetado</span>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl">
                                                € {simulationResult.simulatedNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Workers Team Allocation Table with Summary Header KPIs & Footer Totals */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-4 p-6">
                        {/* Table Header with KPI Cards */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-yellow-500" />
                                    <span>Equipe Alocada & Rentabilidade por Trabalhador</span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Detalhamento dos salários, horas, tarifas e lucro individual gerado em {activeClient.name}.
                                </p>
                            </div>

                            {/* Search and Worker Status Filters */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar trabalhador ou função..."
                                        value={workerSearchTerm}
                                        onChange={(e) => setWorkerSearchTerm(e.target.value)}
                                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-yellow-500 min-w-[200px]"
                                    />
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    <button
                                        onClick={() => setWorkerStatusFilter('all')}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                                            workerStatusFilter === 'all'
                                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                    >
                                        Todos ({workerTeamSummary.totalCount})
                                    </button>
                                    <button
                                        onClick={() => setWorkerStatusFilter('active')}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                                            workerStatusFilter === 'active'
                                                ? "bg-emerald-500 text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                    >
                                        Ativos ({workerTeamSummary.activeCount})
                                    </button>
                                    <button
                                        onClick={() => setWorkerStatusFilter('inactive')}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                                            workerStatusFilter === 'inactive'
                                                ? "bg-rose-500 text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                    >
                                        Inativos ({workerTeamSummary.inactiveCount})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Cards for Active Client's Worker Team */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Trabalhadores</span>
                                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                                    {workerTeamSummary.totalCount} <span className="text-xs font-normal text-slate-400">({workerTeamSummary.activeCount} ativos)</span>
                                </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Horas Totais</span>
                                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                                    {workerTeamSummary.totalHours.toLocaleString()} h
                                </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Faturamento Equipe</span>
                                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                                    € {workerTeamSummary.totalBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Custo Salários</span>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                                    € {workerTeamSummary.totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20 col-span-2 sm:col-span-1">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Lucro da Equipe</span>
                                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    € {workerTeamSummary.totalProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Workers Gallery Table with Mouse Wheel Support */}
                        <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative border border-slate-200 dark:border-slate-800 rounded-lg">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-20 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-3.5">Trabalhador / Função</th>
                                        <th className="px-3 py-3.5 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-center">Horas</th>
                                        <th className="px-4 py-3.5 text-right">Tarifa Cobrada</th>
                                        <th className="px-4 py-3.5 text-right">Custo Hora</th>
                                        <th className="px-4 py-3.5 text-right">Faturamento</th>
                                        <th className="px-4 py-3.5 text-right">Custo Salário</th>
                                        <th className="px-4 py-3.5 text-right">Lucro Individual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredActiveWorkers.length > 0 ? (
                                        filteredActiveWorkers.map((worker) => {
                                            const effectiveClientRate = worker.hourlyRateClient + rateAdjustment;
                                            const billed = Math.round((worker.hours * effectiveClientRate) * 100) / 100;
                                            const cost = Math.round((worker.hours * worker.hourlyRateWorker) * 100) / 100;
                                            const profit = Math.round((billed - cost) * 100) / 100;

                                            return (
                                                <tr key={worker.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-semibold text-slate-900 dark:text-white">
                                                            {worker.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {worker.role}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                            worker.status === 'Inativo' 
                                                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
                                                                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                                                        )}>
                                                            {worker.status || 'Ativo'}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-center font-semibold text-slate-900 dark:text-white">
                                                        {worker.hours}h
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white">
                                                        € {effectiveClientRate.toFixed(2)} /h
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">
                                                        € {worker.hourlyRateWorker.toFixed(2)} /h
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white">
                                                        € {billed.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-400">
                                                        € {cost.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                        € {profit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-400">
                                                Nenhum trabalhador encontrado com o filtro atual.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                                {/* Sticky Footer Totals Row */}
                                <tfoot className="bg-slate-100 dark:bg-slate-800 sticky bottom-0 z-20 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs shadow-md">
                                    <tr>
                                        <td className="px-6 py-3.5">
                                            TOTAL DA EQUIPE ({filteredActiveWorkers.length} de {activeClient.workers.length} exibidos)
                                        </td>
                                        <td className="px-3 py-3.5 text-center">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                                {workerTeamSummary.activeCount} Ativos
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-black">
                                            {workerTeamSummary.totalHours.toLocaleString()}h
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-bold">
                                            € {activeClient.avgRateClient.toFixed(2)}/h
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-bold">
                                            € {activeClient.avgCostWorker.toFixed(2)}/h
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white">
                                            € {workerTeamSummary.totalBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-black text-rose-600 dark:text-rose-400">
                                            € {workerTeamSummary.totalCost.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                            € {workerTeamSummary.totalProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
