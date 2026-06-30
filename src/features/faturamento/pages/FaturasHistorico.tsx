import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, Calendar, Loader2, DollarSign, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getFaturasTracking } from '../api/faturamentoApi';
import { toast } from 'sonner';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';

export function FaturasHistorico() {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedEmpresaId } = useEmpresa();

  const fetchFaturas = async () => {
    try {
      setLoading(true);
      const data = await getFaturasTracking(selectedEmpresaId);
      // Filter for approved faturas representing completed history
      const approvedOnly = (data || []).filter(f => f.status === 'approved');
      setFaturas(approvedOnly);
    } catch (error: any) {
      toast.error('Erro ao carregar histórico de faturas', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaturas();
  }, [selectedEmpresaId]);

  const filteredFaturas = faturas.filter(f => {
    const query = searchQuery.toLowerCase();
    const matchesId = f.id.toLowerCase().includes(query);
    const matchesClient = f.client?.nombre_comercial?.toLowerCase().includes(query) || false;
    return matchesId || matchesClient;
  });

  // Calculate summary metrics
  const totalHorasEntregues = faturas.reduce((sum, f) => sum + (f.total_horas || 0), 0);
  const totalFaturadoEuros = faturas.reduce((sum, f) => sum + (f.total_valor || 0), 0);
  const faturasContadas = faturas.length;

  return (
    <div className="p-6 space-y-6 max-w-full w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Histórico de Faturamento</h1>
          <p className="text-muted-foreground mt-1">
            Consulte faturas finalizadas e o histórico consolidado de horas faturadas.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Volume Total Faturado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              € {totalFaturadoEuros.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total em Euros (€)</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Horas Faturadas</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalHorasEntregues.toFixed(2)}h
            </div>
            <p className="text-xs text-muted-foreground">Total de horas aprovadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Faturas Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {faturasContadas}
            </div>
            <p className="text-xs text-muted-foreground">Ciclos de faturamento encerrados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>Visualização detalhada de faturas aprovadas</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por fatura ou cliente..."
                className="pl-9 bg-white dark:bg-slate-950"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6">
              <p className="text-lg font-medium text-muted-foreground">Nenhuma fatura finalizada no histórico.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 py-4">Fatura ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Total de Horas</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaturas.map((fatura) => (
                  <TableRow key={fatura.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-medium pl-6 text-slate-900 dark:text-slate-100">
                      #{fatura.id.split('-')[0].toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                      {fatura.client?.nombre_comercial || 'Cliente Desconhecido'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {fatura.data_emissao ? new Date(fatura.data_emissao).toLocaleDateString() : '--/--/----'}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-300">
                      {fatura.total_horas ? `${fatura.total_horas.toFixed(2)}h` : '0.00h'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                      € {fatura.total_valor ? fatura.total_valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 font-medium">
                        Aprovada & Concluída
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
