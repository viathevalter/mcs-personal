import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getAnalysisMetrics } from '../lib/metrics';
import { formatCurrency } from '../lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertTriangle, TrendingDown, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnalysisCard = ({ title, value, footer, colorClass }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <h4 className="text-gray-500 text-sm font-medium mb-2">{title}</h4>
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        {footer && <div className="mt-2 text-xs text-gray-400">{footer}</div>}
    </div>
);

export const Analises = () => {
    const { filteredData } = useData();
    const metrics = useMemo(() => getAnalysisMetrics(filteredData), [filteredData]);

    const { concentration, recurringDebtors, performanceByCompany } = metrics;

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Análise de Risco & Performance</h2>
                    <p className="text-gray-500 text-sm mt-1">Visão aprofundada da carteira filtrada.</p>
                </div>
            </div>

            {/* Risk Concentration Row */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-500" />
                    Concentração da Dívida (Vencidos)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnalysisCard
                        title="Top 5 Devedores"
                        value={concentration.top5Percent.toFixed(1) + '%'}
                        footer={`Representam ${formatCurrency(concentration.top5Percent * concentration.totalOverdue / 100)} do total vencido`}
                        colorClass="text-red-600"
                    />
                    <AnalysisCard
                        title="Top 10 Devedores"
                        value={concentration.top10Percent.toFixed(1) + '%'}
                        footer="Acumulado (Top 5 + Próximos 5)"
                        colorClass="text-orange-600"
                    />
                    <AnalysisCard
                        title="Restante da Carteira"
                        value={concentration.restPercent.toFixed(1) + '%'}
                        footer="Carteira pulverizada"
                        colorClass="text-green-600"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performance by Company */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Building2 size={20} className="text-brand-dark" />
                        Performance por Empresa (Período/Seleção)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceByCompany} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px', fontWeight: 600 }} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend />
                                <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="vencido" name="Vencido (Saldo)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top 5 List Detail */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Top 5 Maiores Devedores</h3>
                    <div className="space-y-4">
                        {concentration.top5Clients.map((client, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <span className="font-medium text-gray-800 text-sm truncate max-w-[180px]" title={client.name}>
                                        {client.name}
                                    </span>
                                </div>
                                <div className="font-bold text-gray-900">{formatCurrency(client.value)}</div>
                            </div>
                        ))}
                        {concentration.top5Clients.length === 0 && <div className="text-center text-gray-400 py-10">Sem dados.</div>}
                    </div>
                </div>
            </div>

            {/* Recurring Debtors Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TrendingDown size={20} className="text-gray-600" />
                        Ranking de Inadimplência (Detalhado)
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Ordenado por Saldo</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3 text-center">Qtd. Títulos</th>
                                <th className="px-6 py-3 text-center">Atraso Médio</th>
                                <th className="px-6 py-3 text-right">Saldo Vencido</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recurringDebtors.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wide">{item.empresa}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">{item.count}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-semibold ${item.avgDelay > 90 ? 'text-red-600' : item.avgDelay > 30 ? 'text-orange-600' : 'text-green-600'
                                            }`}>
                                            {item.avgDelay} dias
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(item.balance)}</td>
                                    <td className="px-6 py-4 text-right">
                                        {/* Could link to filtered detail list */}
                                        <Link to={`/titulos?cliente=${encodeURIComponent(item.name)}`} className="text-brand-action hover:underline text-xs">Ver Títulos</Link>
                                    </td>
                                </tr>
                            ))}
                            {recurringDebtors.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-400">Nenhum cliente inadimplente no filtro atual.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
