import { useState } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Home, Clock, EuroIcon, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function DashboardPage() {
    const { selectedEmpresaId, empresas } = useEmpresa();
    const activeEmpresa = empresas.find(e => e.id === selectedEmpresaId);

    // Default to current year and month
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const { data: metrics, isLoading, isError } = useDashboardMetrics(selectedEmpresaId || '', year, month);

    if (!activeEmpresa) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground text-lg">Selecione uma empresa para visualizar o Dashboard.</p>
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const hasData = metrics && !isLoading && !isError;
    const topWorkersData = metrics?.top_workers || [];

    // Transform simple top workers array to what Recharts wants for visualization
    const chartData = topWorkersData.slice(0, 5).map(tw => ({
        name: tw.worker_name.split(' ')[0], // Take first name for chart brevity
        amount: Number(tw.net_amount)
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-muted-foreground">Métricas mensais de {activeEmpresa.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <select
                        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Mês {m.toString().padStart(2, '0')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {isError && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    Falha ao carregar métricas. Tente novamente.
                </div>
            )}

            {hasData && (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total de Trabalhadores</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.total_workers}</div>
                                <p className="text-xs text-muted-foreground">Trabalhadores ativos</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Auxílios Moradia</CardTitle>
                                <Home className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.active_housing}</div>
                                <p className="text-xs text-muted-foreground">Vigentes no mês selecionado</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Soma de Auxílios</CardTitle>
                                <EuroIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(metrics.aux_moradia_sum)}</div>
                                <p className="text-xs text-muted-foreground">Custos gerados este mês</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lançamentos Pendentes</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.pending_entries}</div>
                                <p className="text-xs text-muted-foreground">Correntes a consolidar</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* CHART */}
                        <Card className="col-span-1 lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Top 5 Maiores Custos</CardTitle>
                                <CardDescription>Trabalhadores com maior montante gerado (Net) neste mês.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                            <XAxis
                                                dataKey="name"
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `€${value}`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                                                formatter={(val: any) => [`€ ${val}`, 'Montante']}
                                            />
                                            <Bar
                                                dataKey="amount"
                                                fill="hsl(var(--primary))"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={50}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* TABLE */}
                        <Card className="col-span-1 lg:col-span-3">
                            <CardHeader>
                                <CardTitle>10 Trabalhadores com Maior Custo</CardTitle>
                                <CardDescription>Consolidado da conta corrente mensal</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topWorkersData.length === 0 ? (
                                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                        Nenhum registro encontrado no período.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Trabalhador</TableHead>
                                                <TableHead className="text-right">Net Mensal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topWorkersData.map((w, i) => (
                                                <TableRow key={`${w.worker_name}-${i}`}>
                                                    <TableCell className="font-medium">
                                                        {w.worker_name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(w.net_amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
