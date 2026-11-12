import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Edit2, ShieldCheck, FileDown, Eye, AlertTriangle, CheckCircle2, Clock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkerAlocacoes } from '../hooks/useWorkerAlocacoes';
import { format } from 'date-fns';
import { AddManualAllocationModal } from './WorkerModals/AddManualAllocationModal';
import { EditManualAllocationModal } from './WorkerModals/EditManualAllocationModal';
import type { WorkerAlocacao } from '../api/workersApi';
import {
    termoResponsabilidadeService,
    type TermoResponsabilidadeAlojamento
} from '@/features/logistica/services/termoResponsabilidadeService';
import { logisticsService, type Alocacao } from '@/features/logistica/services/logisticsService';
import { TermoResponsabilidadeModal } from '@/features/logistica/components/TermoResponsabilidadeModal';
import { downloadTermoAlojamentoPdf } from '@/features/logistica/utils/termoAlojamentoPdfGenerator';

interface AlocacoesTabProps {
    workerCodColab: string;
    workerName?: string;
}

export function AlocacoesTab({ workerCodColab, workerName }: AlocacoesTabProps) {
    const { data: alocacoes, isLoading, isError, error } = useWorkerAlocacoes(workerCodColab);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState<WorkerAlocacao | null>(null);
    const [termosAlojamento, setTermosAlojamento] = useState<TermoResponsabilidadeAlojamento[]>([]);
    const [historicoAlojamentos, setHistoricoAlojamentos] = useState<Alocacao[]>([]);
    const [selectedTermoModal, setSelectedTermoModal] = useState<TermoResponsabilidadeAlojamento | null>(null);

    useEffect(() => {
        termoResponsabilidadeService
            .fetchTermosByWorker({ workerCodigo: workerCodColab, workerNome: workerName })
            .then(setTermosAlojamento)
            .catch(() => {});

        logisticsService
            .fetchHistoricoAlojamentosTrabalhador({ codigoColab: workerCodColab, workerNome: workerName })
            .then(setHistoricoAlojamentos)
            .catch(() => {});
    }, [workerCodColab, workerName]);

    if (isLoading) {
        return (
            <div className="flex h-40 flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Carregando alocações...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive border border-destructive/20">
                <h3 className="font-semibold">Erro ao carregar o histórico de alocações</h3>
                <p>{error?.message || 'Erro desconhecido.'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
        <Card className="overflow-hidden relative">
            <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Histórico de Obras e Alocações</CardTitle>
                        <CardDescription>
                            Registro de todos os Pedidos e Reemplazos nos quais este trabalhador foi alocado.
                        </CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nova Alocação
                    </Button>
                </div>
            </CardHeader>
            <AddManualAllocationModal 
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                workerCodColab={workerCodColab}
                workerName={workerName || 'Trabalhador'}
            />
            <EditManualAllocationModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                workerCodColab={workerCodColab}
                allocation={selectedAllocation}
            />
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Data Registro</TableHead>
                        <TableHead className="font-semibold text-foreground text-center">Tipo</TableHead>
                        <TableHead className="font-semibold text-foreground">Função</TableHead>
                        <TableHead className="font-semibold text-foreground">Empresa / Contratante</TableHead>
                        <TableHead className="font-semibold text-foreground">Pedido / Cliente</TableHead>
                        <TableHead className="font-semibold text-foreground">Duração Programada</TableHead>
                        <TableHead className="font-semibold text-foreground">Saída Efetiva</TableHead>
                        <TableHead className="font-semibold text-foreground text-center">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!alocacoes || alocacoes.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                Nenhuma alocação encontrada para este trabalhador.
                            </TableCell>
                        </TableRow>
                    ) : (
                        alocacoes.map((aloc) => (
                            <TableRow key={aloc.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="whitespace-nowrap">
                                    {aloc.inserted_at ? format(new Date(aloc.inserted_at), 'dd/MM/yyyy') : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={aloc.tiposervico === 'Pedido' ? 'default' : 'outline'} className="text-[10px] uppercase font-semibold">
                                        {aloc.tiposervico || 'Desconhecido'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium text-sm text-primary">
                                        {aloc.funcion || '-'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium text-sm text-foreground">
                                        {aloc.contratante || 'Não definido'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <p className="font-medium text-primary">{aloc.codpedido}</p>
                                    <p className="text-sm text-foreground truncate max-w-[200px]" title={aloc.cliente_nombre}>
                                        {aloc.cliente_nombre || 'Cliente Dinâmico'}
                                    </p>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                    <div>
                                        <span className="font-medium text-foreground">Início: </span>
                                        {aloc.fechainiciopedido ? format(new Date(aloc.fechainiciopedido), 'dd/MM/yyyy') : '-'}
                                    </div>
                                    <div>
                                        <span className="font-medium text-foreground">Fim Previsto: </span>
                                        {aloc.fechafinpedido ? format(new Date(aloc.fechafinpedido), 'dd/MM/yyyy') : '-'}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {aloc.fechasalidatrabajador ? (
                                        <span className="text-destructive">{format(new Date(aloc.fechasalidatrabajador), 'dd/MM/yyyy')}</span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setSelectedAllocation(aloc);
                                            setIsEditModalOpen(true);
                                        }}
                                        title="Editar alocação"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>

        <Card className="overflow-hidden border-purple-200 dark:border-purple-900">
            <CardHeader className="bg-purple-50/50 dark:bg-purple-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Home className="h-5 w-5 text-purple-600" />
                        <div>
                            <CardTitle className="text-base">
                                Histórico de Alojamentos & Auxílio Moradia (Logística)
                            </CardTitle>
                            <CardDescription>
                                Registro cronológico de estadias em alojamentos fixos/temporários da empresa, alojamento por cliente e períodos de alojamento próprio (€ 300/mês).
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Modalidade</TableHead>
                        <TableHead className="font-semibold text-foreground">Alojamento / Imóvel</TableHead>
                        <TableHead className="font-semibold text-foreground">Cliente / Obra</TableHead>
                        <TableHead className="font-semibold text-foreground">Entrada (Desde)</TableHead>
                        <TableHead className="font-semibold text-foreground">Saída / Check-out</TableHead>
                        <TableHead className="font-semibold text-foreground">Status & Observações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historicoAlojamentos.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-20 text-muted-foreground">
                                Nenhum registro de alojamento encontrado para este trabalhador na Logística.
                            </TableCell>
                        </TableRow>
                    ) : (
                        historicoAlojamentos.map(item => {
                            const tipoUpper = String(item.tipo_alojamento || '').toUpperCase();
                            const isPropio =
                                item.status === 'Alojamiento Propio' ||
                                tipoUpper === 'PROPIO' ||
                                item.alojamento_id === 'propio';
                            const isCliente =
                                item.status === 'Alojamiento Cliente' ||
                                tipoUpper === 'CLIENTE' ||
                                item.alojamento_id === 'cliente';
                            const isCheckout = item.status === 'Checkout';

                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {isPropio ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                                🏠 Alojamento Próprio (€ 300)
                                            </span>
                                        ) : isCliente ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                🏨 Alojamento Cliente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                🏢 Imóvel Empresa ({tipoUpper || 'FIJO'})
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-semibold text-sm">
                                            {isPropio
                                                ? 'Alojamento Próprio / Por Conta Própria'
                                                : `${item.alojamento_codigo ? `${item.alojamento_codigo} - ` : ''}${item.alojamento_nome}`}
                                        </p>
                                        {!isPropio && item.cama_identificador && (
                                            <p className="text-xs text-muted-foreground">
                                                🛏️ {item.cama_identificador} {item.municipio ? `• ${item.municipio}` : ''}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{item.cliente_nome || '-'}</p>
                                        <p className="text-xs text-muted-foreground">{item.obra_nome || ''}</p>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm font-semibold">
                                        {item.data_inicio || '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {isCheckout && item.data_fim ? (
                                            <span className="font-bold text-destructive">{item.data_fim}</span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold">Em curso</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isCheckout ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                                    Finalizado / Check-out
                                                </span>
                                                {(item.motivo_checkout || item.observacoes) && (
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                                        {item.motivo_checkout || item.observacoes}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    Ativo
                                                </span>
                                                {item.observacoes && (
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                                        {item.observacoes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </Card>

        <Card className="overflow-hidden border-teal-200 dark:border-teal-900">
            <CardHeader className="bg-teal-50/50 dark:bg-teal-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <ShieldCheck className="h-5 w-5 text-teal-600" />
                        <div>
                            <CardTitle className="text-base">
                                Termos de Responsabilidade e Check-list de Alojamento (Logística)
                            </CardTitle>
                            <CardDescription>
                                Documentos de entrega de alojamento, regras de contas, vistoria de entrada com fotos e assinatura eletrônica vinculados a este trabalhador.
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Código</TableHead>
                        <TableHead className="font-semibold text-foreground">Alojamento & Quarto/Cama</TableHead>
                        <TableHead className="font-semibold text-foreground">Data Check-in</TableHead>
                        <TableHead className="font-semibold text-foreground">Status & Vistoria</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Ações / Documento</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {termosAlojamento.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-20 text-muted-foreground">
                                Nenhum Termo de Responsabilidade de Alojamento emitido para este trabalhador até o momento.
                            </TableCell>
                        </TableRow>
                    ) : (
                        termosAlojamento.map(termo => (
                            <TableRow key={termo.id}>
                                <TableCell className="font-mono font-bold text-xs">{termo.codigo_termo}</TableCell>
                                <TableCell>
                                    <p className="font-semibold text-sm">{termo.alojamento_nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {termo.cama_identificador} • {termo.alojamento_endereco}
                                    </p>
                                </TableCell>
                                <TableCell className="text-sm">{termo.data_checkin}</TableCell>
                                <TableCell>
                                    {termo.status === 'COM_INCIDENCIAS' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                            <AlertTriangle className="h-3 w-3" />
                                            Assinado com Avarias ({termo.total_fotos} foto/s)
                                        </span>
                                    ) : termo.status === 'ASSINADO' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Assinado Eletronicamente
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                            <Clock className="h-3 w-3" />
                                            Pendente de Assinatura
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedTermoModal(termo)}
                                            className="gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver / Enviar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => downloadTermoAlojamentoPdf(termo)}
                                            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                                        >
                                            <FileDown className="h-3.5 w-3.5" />
                                            PDF
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>

        <TermoResponsabilidadeModal
            isOpen={Boolean(selectedTermoModal)}
            onClose={() => setSelectedTermoModal(null)}
            termo={selectedTermoModal}
            onUpdated={updated => {
                setSelectedTermoModal(updated);
                setTermosAlojamento(prev => [updated, ...prev.filter(x => x.id !== updated.id)]);
            }}
        />
        </div>
    );
}
