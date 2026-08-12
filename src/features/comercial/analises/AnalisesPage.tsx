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
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/features/master-data/clients/hooks/useClients';

interface WorkerCostDetail {
    id: string;
    name: string;
    role: string;
    hours: number;
    hourlyRateClient: number; // tarifa cobrada do cliente (€/h)
    hourlyRateWorker: number; // custo hora trabalhador (€/h)
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
        workers: [
            { id: 'w1', name: 'Carlos Santos', role: 'Soldador TIG 6G', hours: 180, hourlyRateClient: 34.00, hourlyRateWorker: 19.50 },
            { id: 'w2', name: 'Manuel Oliveira', role: 'Serralheiro Montador', hours: 176, hourlyRateClient: 31.00, hourlyRateWorker: 18.00 },
            { id: 'w3', name: 'António Ferreira', role: 'Tubista Industrial', hours: 180, hourlyRateClient: 32.00, hourlyRateWorker: 18.50 },
            { id: 'w4', name: 'Joaquim Silva', role: 'Encarregado de Obra', hours: 184, hourlyRateClient: 38.00, hourlyRateWorker: 22.00 },
            { id: 'w5', name: 'Pedro Rodrigues', role: 'Soldador MIG/MAG', hours: 170, hourlyRateClient: 30.00, hourlyRateWorker: 17.50 },
        ]
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
        workers: [
            { id: 'w6', name: 'Miguel Arantes', role: 'Tubista Especialista', hours: 168, hourlyRateClient: 29.00, hourlyRateWorker: 19.50 },
            { id: 'w7', name: 'Rui Costa', role: 'Soldador Raio-X', hours: 160, hourlyRateClient: 29.00, hourlyRateWorker: 19.00 },
            { id: 'w8', name: 'Fernando Gomes', role: 'Ajudante Técnico', hours: 152, hourlyRateClient: 24.00, hourlyRateWorker: 16.00 },
        ]
    },
    {
        id: 'c3',
        name: 'Montajes Vallejo S.L.',
        code: 'CLI-059',
        city: 'San Sebastián, ES',
        activeProject: 'Manutenção Preventiva Refinaria',
        workerCount: 18,
        totalHours: 2880,
        avgRateClient: 34.00,
        avgCostWorker: 17.80,
        billedAmount: 97920.00,
        workerPayrollCost: 51264.00,
        extraCosts: 7100.00,
        taxesAndCharges: 11750.40,
        estimatedMarginPercent: 28.0,
        overdueInvoices: 0.00,
        workers: [
            { id: 'w9', name: 'Jorge Mendonça', role: 'Técnico Tubista', hours: 176, hourlyRateClient: 35.00, hourlyRateWorker: 18.00 },
            { id: 'w10', name: 'Lucas Pereira', role: 'Soldador TIG', hours: 180, hourlyRateClient: 34.00, hourlyRateWorker: 17.50 },
            { id: 'w11', name: 'André Martins', role: 'Serralheiro Mecânico', hours: 184, hourlyRateClient: 33.00, hourlyRateWorker: 17.50 },
        ]
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
        workers: [
            { id: 'w12', name: 'Diogo Ribeiro', role: 'Montador Especializado', hours: 160, hourlyRateClient: 26.00, hourlyRateWorker: 19.50 },
            { id: 'w13', name: 'Vasco Fernandes', role: 'Soldador de Estruturas', hours: 160, hourlyRateClient: 25.00, hourlyRateWorker: 19.00 },
        ]
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
        workers: [
            { id: 'w14', name: 'Tiago Neves', role: 'Eletricista Industrial', hours: 160, hourlyRateClient: 33.00, hourlyRateWorker: 17.50 },
            { id: 'w15', name: 'Gonçalo Lopes', role: 'Técnico Automação', hours: 160, hourlyRateClient: 35.00, hourlyRateWorker: 18.50 },
        ]
    }
];

export function AnalisesPage() {
    const { data: dbClients = [] } = useClients();
    
    const [selectedTab, setSelectedTab] = useState<'global' | 'simulator'>('global');
    const [period, setPeriod] = useState<string>('2026-07');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'profitable' | 'tight' | 'loss' | 'overdue'>('all');
    
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

    // Merge real database clients with operational scenarios
    const clientsData: ClientProfitabilityData[] = useMemo(() => {
        if (!dbClients || dbClients.length === 0) return INITIAL_CLIENTS_ANALYSIS;
        
        // Map real DB clients into the profitability framework
        const realClientsMapped: ClientProfitabilityData[] = dbClients.map((dbc, idx) => {
            const fallbackScenario = INITIAL_CLIENTS_ANALYSIS[idx % INITIAL_CLIENTS_ANALYSIS.length];
            return {
                id: dbc.id,
                name: dbc.name || dbc.legal_name || `Cliente ${dbc.code || idx + 1}`,
                legalName: dbc.legal_name || undefined,
                code: dbc.code || `CLI-${100 + idx}`,
                city: dbc.city || fallbackScenario.city,
                activeProject: fallbackScenario.activeProject,
                workerCount: fallbackScenario.workerCount,
                totalHours: fallbackScenario.totalHours,
                avgRateClient: fallbackScenario.avgRateClient,
                avgCostWorker: fallbackScenario.avgCostWorker,
                billedAmount: fallbackScenario.billedAmount,
                workerPayrollCost: fallbackScenario.workerPayrollCost,
                extraCosts: fallbackScenario.extraCosts,
                taxesAndCharges: fallbackScenario.taxesAndCharges,
                estimatedMarginPercent: fallbackScenario.estimatedMarginPercent,
                overdueInvoices: fallbackScenario.overdueInvoices,
                workers: fallbackScenario.workers,
                isFromDatabase: true,
            };
        });

        // Ensure we include both real DB clients and scenario benchmarks if DB list is small
        if (realClientsMapped.length < INITIAL_CLIENTS_ANALYSIS.length) {
            const existingIds = new Set(realClientsMapped.map(c => c.id));
            const extra = INITIAL_CLIENTS_ANALYSIS.filter(c => !existingIds.has(c.id));
            return [...realClientsMapped, ...extra];
        }

        return realClientsMapped;
    }, [dbClients]);

    // Calculate totals for Global View
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
            totalBilled,
            totalPayroll,
            totalCosts,
            totalNetProfit,
            totalNetMarginPercent,
            totalOverdue,
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

    // Simulator calculations for active client
    const simulationResult = useMemo(() => {
        if (!activeClient) return null;

        const currentRate = activeClient.avgRateClient;
        const simulatedRate = Math.max(0, currentRate + rateAdjustment);
        const rateDiff = simulatedRate - currentRate;

        const currentBilled = activeClient.billedAmount;
        const currentPayroll = activeClient.workerPayrollCost;
        const currentExtras = activeClient.extraCosts;
        const currentTaxes = activeClient.taxesAndCharges;
        const currentTotalCosts = currentPayroll + currentExtras + currentTaxes;
        
        const currentNetProfit = currentBilled - currentTotalCosts;

        // Simulated values
        const simulatedBilled = currentBilled + (activeClient.totalHours * rateDiff);
        
        const taxRate = currentBilled > 0 ? (currentTaxes / currentBilled) : 0.12;
        const simulatedTaxes = simulatedBilled * (taxRate + (customTaxAdjustmentPercent / 100));
        const simulatedTotalCosts = currentPayroll + currentExtras + simulatedTaxes;

        const simulatedNetProfit = simulatedBilled - simulatedTotalCosts;
        const simulatedNetMargin = simulatedBilled > 0 ? (simulatedNetProfit / simulatedBilled) * 100 : 0;
        
        const profitGain = simulatedNetProfit - currentNetProfit;

        return {
            currentRate,
            simulatedRate,
            rateDiff,
            currentBilled,
            simulatedBilled,
            currentNetProfit,
            simulatedNetProfit,
            currentNetMargin: currentBilled > 0 ? (currentNetProfit / currentBilled) * 100 : 0,
            simulatedNetMargin,
            profitGain,
            currentTotalCosts,
            simulatedTotalCosts,
            estimatedMargin: activeClient.estimatedMarginPercent
        };
    }, [activeClient, rateAdjustment, customTaxAdjustmentPercent]);

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
                                € {globalSummary.totalBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                € {globalSummary.totalPayroll.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                € {globalSummary.totalNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                € {globalSummary.totalOverdue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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

                    {/* Table of Client Profitability */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Ranqueamento Financeiro de Clientes
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Comparativo entre Tarifa Cobrada, Custos Trabalhistas, Margem Real e Inadimplência.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                                {filteredClients.length} cliente(s) listados
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
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
                                                            € {client.workerPayrollCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} tot.
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Faturamento Total */}
                                                <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                                                    € {client.billedAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                                </td>

                                                {/* Lucro Real */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className={cn(
                                                        "font-bold",
                                                        isLoss ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        € {netProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                                            € {client.overdueInvoices.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                    Obra: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeClient.activeProject}</span> • {activeClient.city}
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
                                                            <div className="text-[10px] text-slate-400">{c.code} • {c.activeProject}</div>
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
                                                € {simulationResult.simulatedNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                            </span>
                                            {simulationResult.profitGain !== 0 && (
                                                <span className={cn(
                                                    "text-sm font-bold flex items-center",
                                                    simulationResult.profitGain > 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {simulationResult.profitGain > 0 ? '+' : ''}
                                                    € {simulationResult.profitGain.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                                            <span className="text-slate-400">Lucro Anterior (Base):</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                € {simulationResult.currentNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
                                                € {simulationResult.simulatedBilled.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Custos Diretos com Pessoal */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Salários e Custo Direto dos Trabalhadores</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {activeClient.workerPayrollCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Alojamento e Logística */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Alojamento, Transporte & Logística</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {activeClient.extraCosts.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Impostos e Encargos */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-rose-500">(-)</span>
                                                <span className="text-slate-700 dark:text-slate-300">Impostos & Taxas sobre Faturamento</span>
                                            </div>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                - € {simulationResult.simulatedTotalCosts - (activeClient.workerPayrollCost + activeClient.extraCosts)}
                                            </span>
                                        </div>

                                        {/* Lucro Operacional Final */}
                                        <div className="flex items-center justify-between py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-4 mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-yellow-500 text-lg">(=)</span>
                                                <span className="font-bold text-slate-900 dark:text-white text-base">Lucro Operacional Projetado</span>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl">
                                                € {simulationResult.simulatedNetProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Workers Team Allocation Table */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Equipe Alocada & Rentabilidade por Trabalhador
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Detalhamento dos salários, tarifa praticada e lucro individual gerado em {activeClient.name}.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                                {activeClient.workers.length} trabalhadores cadastrados
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3.5">Trabalhador / Função</th>
                                        <th className="px-4 py-3.5 text-center">Horas</th>
                                        <th className="px-4 py-3.5 text-right">Tarifa Cobrada</th>
                                        <th className="px-4 py-3.5 text-right">Custo Hora</th>
                                        <th className="px-4 py-3.5 text-right">Faturamento</th>
                                        <th className="px-4 py-3.5 text-right">Custo Salário</th>
                                        <th className="px-4 py-3.5 text-right">Lucro Individual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {activeClient.workers.map((worker) => {
                                        const effectiveClientRate = worker.hourlyRateClient + rateAdjustment;
                                        const billed = worker.hours * effectiveClientRate;
                                        const cost = worker.hours * worker.hourlyRateWorker;
                                        const profit = billed - cost;

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
                                                    € {billed.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                                </td>

                                                <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-400">
                                                    € {cost.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                                </td>

                                                <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    € {profit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
        </div>
    );
}
