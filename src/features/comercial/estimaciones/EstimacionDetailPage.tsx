import { useParams, useNavigate } from 'react-router-dom';
import { useEstimacionDetail } from './hooks/useEstimacionDetail';
import { EstimacionStatusBadge } from './components/EstimacionStatusBadge';
import { ApproveEstimacionButton } from './components/ApproveEstimacionButton';
import { ProposalSignatureStatusCard } from './components/ProposalSignatureStatusCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { 
  ArrowLeft, FileText, CheckCircle2, AlertCircle, 
  MapPin, Clock, Calendar, Users, DollarSign, ExternalLink
} from 'lucide-react';

export function EstimacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: estimacion, isLoading, error } = useEstimacionDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">Carregando detalhes...</div>
    );
  }

  if (!estimacion) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div className="text-xl text-muted-foreground">Estimación não encontrada.</div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md max-w-2xl text-sm break-all">
            <strong>Erro:</strong> {error instanceof Error ? error.message : JSON.stringify(error)}
          </div>
        )}
        <Button variant="outline" onClick={() => navigate('/comercial/estimaciones')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getSolicitudTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      new_allocation: 'Nova Alocação',
      expansion: 'Expansão de Escopo',
      other: 'Outro',
    };
    return map[type] || type;
  };

  return (
    <div className="flex flex-col space-y-6 p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comercial/estimaciones')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{estimacion.codigo}</h1>
                <EstimacionStatusBadge status={estimacion.status} />
              </div>
              <p className="text-muted-foreground flex items-center mt-1">
                <span className="font-medium mr-2">{getSolicitudTypeLabel(estimacion.estimation_type)}</span>
                | Versão atual: {estimacion.current_version?.version_number || 1}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {estimacion.status === 'approved' && (
              <Button variant="outline" onClick={() => navigate('/operacoes/solicitudes')}>
                Ver Pedido / Solicitud Gerada
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
            <ApproveEstimacionButton estimacion={estimacion} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="items">Itens e Serviços</TabsTrigger>
            <TabsTrigger value="costs">Custos Adicionais</TabsTrigger>
            <TabsTrigger value="financial">Resumo Financeiro</TabsTrigger>
            <TabsTrigger value="versions">Versões</TabsTrigger>
            <TabsTrigger value="timeline">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Empresa</p>
                        <p className="text-base">{estimacion.client?.legal_name}</p>
                        {estimacion.client?.trade_name && (
                          <p className="text-sm text-muted-foreground">{estimacion.client.trade_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Obra / Local</p>
                        <p className="text-base">{estimacion.client_site?.name || 'Não especificado'}</p>
                        {estimacion.client_site?.address && (
                          <p className="text-sm text-muted-foreground">{estimacion.client_site.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start border-t pt-4">
                      <FileText className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Contato da Proposta</p>
                        <p className="text-base">{estimacion.contact_name || 'Não especificado'}</p>
                        {estimacion.contact_email && (
                          <p className="text-sm text-muted-foreground">{estimacion.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ProposalSignatureStatusCard estimacion={estimacion} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Proposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {estimacion.general_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Observações Gerais</p>
                      <p className="text-sm">{estimacion.general_notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">País</p>
                        <p className="text-sm font-medium">
                          {estimacion.country?.name || 'Padrão / Global'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">Condições de Pagamento</p>
                        <p className="text-sm font-medium">{estimacion.payment_terms || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data Prevista Início</p>
                        <p className="text-sm font-medium">
                          {estimacion.expected_start_date ? format(new Date(estimacion.expected_start_date), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <p className="text-xs text-muted-foreground">Validade da Proposta</p>
                        <p className="text-sm font-medium">
                          {estimacion.validity_date ? format(new Date(estimacion.validity_date), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profissionais e Serviços (Versão Atual)</CardTitle>
                <CardDescription>Detalhamento de horas e tarifas propostas no orçamento principal.</CardDescription>
              </CardHeader>
              <CardContent>
                {estimacion.current_version?.items && estimacion.current_version.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium">Função</th>
                          <th className="pb-3 font-medium text-center">Qtd</th>
                          <th className="pb-3 font-medium text-center">Horas Totais</th>
                          <th className="pb-3 font-medium text-right">Tarifa Base</th>
                          <th className="pb-3 font-medium text-right">Tarifa Venda</th>
                          <th className="pb-3 font-medium text-right">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {estimacion.current_version.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-3">
                              <div className="font-medium">{item.job_function?.name}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                {item.includes_accommodation && (
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                                    Alojamento{item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? `: €${Number(item.custom_lodging_rate).toFixed(2)}/dia` : ''}
                                  </span>
                                )}
                                {item.includes_transport && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">Transporte</span>}
                                {item.includes_ppe && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">EPIs</span>}
                                {item.ss_regime && item.ss_regime !== 'none' && (
                                  <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                    Seg. Social: {item.ss_regime === 'destacado' ? 'Destacado' : 'Local'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-center">{item.total_hours}h</td>
                            <td className="py-3 text-right">{formatCurrency(item.base_cost_hour)}/h</td>
                            <td className="py-3 text-right font-medium text-blue-600">{formatCurrency(item.sell_rate_hour)}/h</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' :
                                item.margin_percent >= 10 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.margin_percent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum item cadastrado nesta versão.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Custos Adicionais</CardTitle>
                <CardDescription>Outros custos e reembolsos associados à proposta.</CardDescription>
              </CardHeader>
              <CardContent>
                {estimacion.current_version?.costs && estimacion.current_version.costs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium">Categoria</th>
                          <th className="pb-3 font-medium">Descrição</th>
                          <th className="pb-3 font-medium text-center">Repassado ao Cliente</th>
                          <th className="pb-3 font-medium text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {estimacion.current_version.costs.map((cost: any) => (
                          <tr key={cost.id}>
                            <td className="py-3 font-medium capitalize">{cost.cost_category.replace('_', ' ')}</td>
                            <td className="py-3 text-muted-foreground">{cost.description || '-'}</td>
                            <td className="py-3 text-center">
                              {cost.is_rechargeable ? (
                                <span className="text-emerald-600 text-xs font-medium bg-emerald-100 px-2 py-1 rounded-full">Sim (+{cost.markup_percent}%)</span>
                              ) : (
                                <span className="text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-full">Não (Custo Interno)</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-medium">{formatCurrency(cost.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum custo adicional cadastrado.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro e Rentabilidade</CardTitle>
                <CardDescription>Totais calculados para a versão atual.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Custo Total Previsto</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(estimacion.current_version?.total_cost || 0)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-blue-100 dark:border-blue-950/40 text-blue-900 dark:text-blue-100">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Receita Total Prevista</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-400">
                      {formatCurrency(estimacion.current_version?.total_revenue || 0)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-6 border ${
                    (estimacion.current_version?.margin_percent || 0) >= 20 ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                    (estimacion.current_version?.margin_percent || 0) >= 10 ? 'bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/40 text-amber-700 dark:text-amber-400' :
                    'bg-white dark:bg-slate-900 border-red-100 dark:border-red-950/40 text-red-700 dark:text-red-400'
                  }`}>
                    <p className="text-sm font-medium mb-2 opacity-80 text-slate-600 dark:text-slate-400">Margem Global (Lucro)</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-bold">
                        {estimacion.current_version?.margin_percent || 0}%
                      </p>
                      <p className="text-sm font-medium opacity-80">
                        ({formatCurrency((estimacion.current_version?.total_revenue || 0) - (estimacion.current_version?.total_cost || 0))})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Versões</CardTitle>
                <CardDescription>Todas as revisões e orçamentos emitidos para esta mesma solicitação.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {estimacion.versions?.map((version: any) => (
                    <div 
                      key={version.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${version.id === estimacion.current_version_id ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          V{version.version_number}
                        </div>
                        <div>
                          <p className="font-medium">
                            {version.id === estimacion.current_version_id && <span className="text-primary text-xs font-bold uppercase mr-2 tracking-wider">Atual</span>}
                            {format(new Date(version.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm")}
                          </p>
                          <p className="text-sm text-muted-foreground">{version.notes || 'Sem observações'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(version.total_revenue)}</p>
                        <p className="text-xs text-muted-foreground">Margem: {version.margin_percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline da Solicitação</CardTitle>
                <CardDescription>Rastreabilidade da proposta desde a criação até a aprovação.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="p-8 text-center text-muted-foreground">
                   (Timeline simplificada implementada em módulo posterior)
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
  );
}
