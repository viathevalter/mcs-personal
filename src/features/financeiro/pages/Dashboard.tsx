import React, { useMemo, useState, useEffect } from 'react';
import { MultiSelect } from '../components/MultiSelect';
import { useData } from '../context/DataContext';
import { calculateMetrics, getAgingData, getTreemapData } from '../lib/metrics';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Treemap, Legend, ComposedChart
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, AlertCircle, Clock, Users, CheckCircle2, Layers, Filter, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

const KPICard = ({ title, value, count, subtext, icon: Icon, color, isCurrency = true }: any) => {
    const displayValue = isCurrency && typeof value === 'number'
        ? (value > 999999 ? formatCompactCurrency(value) : formatCurrency(value))
        : value;

    const titleValue = isCurrency && typeof value === 'number'
        ? formatCurrency(value)
        : value;

    return (
        <div className="bg-brand-surface p-5 rounded-2xl border border-gray-100 shadow-sm relative hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
                <div className={`p-1.5 rounded-lg ${color} bg-opacity-10 absolute top-3 right-3`}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2 truncate pr-2" title={titleValue}>
                {displayValue}
            </h3>

            {(count !== undefined || subtext) && (
                <div className="flex flex-col gap-1">
                    {count !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Qtd</span>
                            <span className="text-xs font-semibold text-gray-700">{count}</span>
                        </div>
                    )}
                    {subtext && <p className="text-[10px] text-gray-400">{subtext}</p>}
                </div>
            )}
        </div>
    );
};

const getContrastColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return 'text-gray-900';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'text-gray-900' : 'text-white';
};

const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, value, payload, fill } = props;
    const color = fill || payload?.fill || '#cbd5e1';
    const showText = width > 60 && height > 40;
    const showValue = width > 80 && height > 60;
    const textColorClass = getContrastColor(color);

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} style={{ fill: color, stroke: '#fff', strokeWidth: 2 }} />
            {showText && (
                <foreignObject x={x} y={y} width={width} height={height} style={{ pointerEvents: 'none' }}>
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                        <span className={`${textColorClass} font-bold text-xs leading-tight line-clamp-2 drop-shadow-sm`}>{name}</span>
                        {showValue && <span className={`${textColorClass} text-[10px] mt-1 opacity-95 font-medium drop-shadow-sm`}>{formatCurrency(value)}</span>}
                    </div>
                </foreignObject>
            )}
        </g>
    );
};

const CustomTreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg text-sm z-50">
                <p className="font-bold text-gray-900 mb-1 border-b pb-1">{data.name}</p>
                <div className="space-y-1">
                    <p className="text-gray-600 flex justify-between gap-4"><span>Valor Vencido:</span><span className="font-bold">{formatCurrency(data.value)}</span></p>
                    <p className="text-gray-600 flex justify-between gap-4"><span>Qtd. Títulos:</span><span className="font-medium">{data.qtdTitulos}</span></p>
                    <p className="text-gray-600 flex justify-between gap-4">
                        <span>Atraso Médio:</span>
                        <span className={`font-bold ${data.atrasoMedio > 90 ? 'text-red-600' : data.atrasoMedio > 60 ? 'text-orange-600' : data.atrasoMedio > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {data.atrasoMedio} dias
                        </span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const CustomReceiptTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const items = data.items || [];
        const topItems = items.slice(0, 5);
        const remaining = items.length - 5;

        return (
            <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg text-sm z-50 min-w-[200px]">
                <p className="font-bold text-gray-900 mb-2 border-b pb-1 flex justify-between">
                    <span>{data.date}</span>
                    <span className="text-brand-action">{formatCurrency(data.value)}</span>
                </p>
                <div className="space-y-1.5">
                    {topItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 truncate max-w-[120px]" title={item.client}>{item.client}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
                        </div>
                    ))}
                    {remaining > 0 && <p className="text-xs text-gray-400 italic text-center mt-1">+ {remaining} outros</p>}
                    {items.length === 0 && <p className="text-xs text-gray-400">Sem detalhes disponíveis</p>}
                </div>
            </div>
        );
    }
    return null;
};

export const Dashboard = () => {
    const { filteredData, setFilters } = useData();
    const navigate = useNavigate();
    const metrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);
    const agingData = useMemo(() => getAgingData(filteredData), [filteredData]);

    const [treemapDimension, setTreemapDimension] = useState<'Empresa' | 'Cliente' | 'Obra' | 'Banco'>('Empresa');
    const [selectedRiskStatuses, setSelectedRiskStatuses] = useState<string[]>([]);

    const riskStatuses = useMemo(() => {
        const statusSet = new Set<string>();
        filteredData.forEach(item => {
            if (item.Status && item.Status !== 'Pago') statusSet.add(item.Status);
        });
        return Array.from(statusSet).sort().map(s => ({ value: s, label: s }));
    }, [filteredData]);

    useEffect(() => {
        if (riskStatuses.length > 0 && selectedRiskStatuses.length === 0) {
            setSelectedRiskStatuses(riskStatuses.map(r => r.value));
        }
    }, [riskStatuses.length]);

    const treemapData = useMemo(() => {
        let dataToProcess = filteredData;
        if (selectedRiskStatuses.length > 0) {
            dataToProcess = filteredData.filter(item => selectedRiskStatuses.includes(item.Status));
        } else if (riskStatuses.length > 0) {
            if (selectedRiskStatuses.length === 0) dataToProcess = [];
        }
        return getTreemapData(dataToProcess, treemapDimension) || [];
    }, [filteredData, treemapDimension, selectedRiskStatuses, riskStatuses.length]);

    const receiptData = useMemo(() => {
        const buckets: Record<string, { value: number, items: any[], rawDate: Date }> = {};
        filteredData.forEach(d => {
            if (d.dt_recebimento && d.Status === 'Pago') {
                const dateKey = d.dt_recebimento.toISOString().split('T')[0];
                if (!buckets[dateKey]) buckets[dateKey] = { value: 0, items: [], rawDate: d.dt_recebimento };
                const val = d.Valor_parcial || d.Valot_total;
                buckets[dateKey].value += val;
                buckets[dateKey].items.push({ client: d.clienteInfo?.NombreComercial || d.Cliente, value: val });
            }
        });
        Object.values(buckets).forEach(bucket => bucket.items.sort((a, b) => b.value - a.value));
        return Object.entries(buckets).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).slice(-7).map(([dateStr, data]) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return { date: formatDate(new Date(year, month - 1, day)), rawDate: data.rawDate, value: data.value, items: data.items };
        });
    }, [filteredData]);

    // Fetch ordens de pagamento from Supabase
    const { data: ordensData } = useQuery({
        queryKey: ['ordens_pagamento_dashboard'],
        queryFn: async () => {
            const { data, error } = await supabase.schema('core_finance').from('ordens_pagamento')
                .select('*')
                .in('status', ['aprovado', 'pago']);
            if (error) throw error;
            return data || [];
        }
    });

    // Cash Flow 30 days forecast
    const cashFlowForecast = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            return d;
        });

        const ordens = ordensData || [];

        return next30Days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            let entradas = 0;
            let saidas = 0;

            // Entradas: faturas from DataContext (Dt_venc matches)
            filteredData.forEach(f => {
                if (f.Dt_venc && f.Status !== 'Pago' && f.Status !== 'Cancelado') {
                    const fDateStr = f.Dt_venc.toISOString().split('T')[0];
                    if (fDateStr === dateStr) entradas += (f.Saldo_a_pagar || 0);
                }
            });

            // Saídas: ordens_pagamento from Supabase (data_vencimento matches)
            ordens.forEach(o => {
                const oDateStr = new Date(o.data_vencimento).toISOString().split('T')[0];
                if (oDateStr === dateStr) saidas += Number(o.valor);
            });

            return {
                date: formatDate(date),
                entradas,
                saidas,
                saldo: entradas - saidas
            };
        });
    }, [filteredData, ordensData]);

    const topPendencias = useMemo(() => filteredData.filter(i => i.Status !== 'Pago').sort((a, b) => b.Saldo_a_pagar - a.Saldo_a_pagar).slice(0, 5), [filteredData]);

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KPICard title="Recebido (Filtro)" value={metrics.recebidoPeriodo} count={metrics.countRecebidoPeriodo} icon={CheckCircle2} color="bg-emerald-500 text-emerald-500" />
                <KPICard title="Saldo Total" value={metrics.totalOpenBalance} count={metrics.countTotalOpen} icon={Layers} color="bg-indigo-500 text-indigo-500" />
                <KPICard title="Vencido (Saldo)" value={metrics.saldoVencido} count={metrics.countSaldoVencido} icon={AlertCircle} color="bg-state-critical text-state-critical" />
                <KPICard title="A Vencer (30d)" value={metrics.aVencer30d} count={metrics.countAVencer30d} icon={Clock} color="bg-blue-500 text-blue-500" />
                <KPICard title="% Vencido" value={metrics.percentualVencido.toFixed(1) + '%'} count={metrics.countSaldoVencido} subtext="do total em aberto" isCurrency={false} icon={ArrowDownRight} color="bg-orange-500 text-orange-500" />
                <KPICard title="Clientes Atraso" value={metrics.clientesAtraso} count={metrics.countClientesAtrasoTitulos} isCurrency={false} icon={Users} color="bg-purple-500 text-purple-500" />
            </div>

            {/* 30-Day Cash Flow Forecast */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Activity size={18} className="text-brand-action" />
                            Previsão de Fluxo de Caixa (30 Dias)
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Compara Entradas (Faturas a vencer) vs Saídas (Ordens aprovadas).
                        </p>
                    </div>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={cashFlowForecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" style={{ fontSize: '11px' }} />
                            <YAxis style={{ fontSize: '11px' }} tickFormatter={(val) => formatCompactCurrency(val)} />
                            <Tooltip 
                                formatter={(value: number, name: string) => [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #eee' }}
                            />
                            <Legend />
                            <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="saidas" name="Saídas" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Line type="monotone" dataKey="saldo" name="Saldo Diário" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-gray-800 mb-4">Aging (Vencidos)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agingData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '12px' }} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {agingData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4">Recebimentos (Últimos 7 dias)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={receiptData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                                <YAxis style={{ fontSize: '12px' }} />
                                <Tooltip content={<CustomReceiptTooltip />} />
                                <Line type="monotone" dataKey="value" stroke="#32CD32" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Layers size={18} className="text-brand-dark" /> Mapa de Risco — Concentração de Dívida
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Tamanho do bloco = Valor Vencido | Cor = Atraso Médio</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                        <div className="w-full sm:w-48">
                            <MultiSelect label="Filtrar Status" options={riskStatuses} selected={selectedRiskStatuses} onChange={setSelectedRiskStatuses} placeholder="Selecione status..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Agrupar por</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['Empresa', 'Cliente'].map((dim) => (
                                    <button key={dim} onClick={() => setTreemapDimension(dim as any)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${treemapDimension === dim ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                                        {dim}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="h-96 w-full">
                    {treemapData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap data={treemapData} dataKey="value" nameKey="name" aspectRatio={4 / 3} stroke="#fff" content={<CustomTreemapContent />}>
                                <Tooltip content={<CustomTreemapTooltip />} />
                            </Treemap>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Filter size={32} className="opacity-20 mb-2" />
                            <p>Não há títulos vencidos no período/filtro selecionado.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Top 5 Pendências (Valor Individual)</h3>
                    <Link to="/financeiro/titulos" className="text-sm text-brand-action font-medium hover:underline">Ver todos</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Vencimento</th>
                                <th className="px-6 py-3 text-right">Saldo</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topPendencias.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.clienteInfo?.NombreComercial || item.Cliente}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">{item.Empresa}</td>
                                    <td className="px-6 py-4 text-gray-500">{formatDate(item.Dt_venc)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(item.Saldo_a_pagar)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.Status === 'Vencido' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.Status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
