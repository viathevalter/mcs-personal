import { useState } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';

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

    const hasData = metrics && !isLoading && !isError;

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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total de Trabalhadores</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.total_workers}</div>
                                <p className="text-xs text-muted-foreground">Cadastros na base</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Trabalhadores Ativos</CardTitle>
                                <Users className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.active_workers}</div>
                                <p className="text-xs text-muted-foreground">Colaboradores ativos hoje</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Em Regularização</CardTitle>
                                <Users className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.regularization_workers}</div>
                                <p className="text-xs text-muted-foreground">Status de Seguridade</p>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
