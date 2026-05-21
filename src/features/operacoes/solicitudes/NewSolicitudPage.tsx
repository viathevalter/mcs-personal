import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, FileText, CheckCircle2 } from 'lucide-react';
import { useWorkerAssignments } from './hooks/useWorkerAssignments';
import { useCreateSolicitud } from './hooks/useCreateSolicitud';
import { AssignmentsSelectionTable } from './components/AssignmentsSelectionTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';

export function NewSolicitudPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('tipo') || 'replacement';
    const initialClientId = searchParams.get('client_id') || 'all';
    const initialSiteId = searchParams.get('site_id') || 'all';
    
    const { selectedEmpresaId } = useEmpresa();
    const { data: clients = [] } = useClients();
    
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
    const [selectedClientSiteId, setSelectedClientSiteId] = useState<string>(initialSiteId);
    const { data: clientSites = [] } = useClientSites(selectedClientId !== 'all' ? selectedClientId : undefined);

    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
    
    // Solicitud Form State
    const [actionType, setActionType] = useState<string>(initialType);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const { data: assignments = [] } = useWorkerAssignments({
        empresa_id: selectedEmpresaId,
        client_id: selectedClientId !== 'all' ? selectedClientId : null,
        client_site_id: selectedClientSiteId !== 'all' ? selectedClientSiteId : null,
    });

    const { createSolicitudWithTargets } = useCreateSolicitud();

    // Reset site when client changes (but skip the first initialization if from URL)
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setSelectedClientSiteId('all');
    }, [selectedClientId]);

    // Default title based on type and selected targets
    useEffect(() => {
        const typeName = actionType === 'replacement' ? 'Substituição (Reemplazo)' : 
                         actionType === 'relocation' ? 'Realocação' : 
                         actionType === 'offboarding' ? 'Desligamento' : 'Operação';
        
        if (selectedAssignments.length > 0) {
            setTitle(`${typeName} de ${selectedAssignments.length} trabalhador(es)`);
        } else {
            setTitle(`Nova Solicitação de ${typeName}`);
        }
    }, [actionType, selectedAssignments.length]);

    const handleToggleSelection = (id: string) => {
        setSelectedAssignments(prev => 
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const handleToggleAll = () => {
        if (selectedAssignments.length === assignments.length) {
            setSelectedAssignments([]);
        } else {
            setSelectedAssignments(assignments.map(a => a.id));
        }
    };

    const handleSubmit = async () => {
        if (selectedAssignments.length === 0) return;
        if (!reason.trim()) {
            // Toast should ideally be here if reason is mandatory
            return;
        }

        // Map the selected assignments to the payload target structure
        const targets = assignments
            .filter(a => selectedAssignments.includes(a.id))
            .map(a => ({
                source_assignment_id: a.id,
                source_worker_id: a.worker_id,
                source_pedido_id: a.pedido_id,
                source_pedido_item_id: a.pedido_item_id,
                source_client_id: a.client_id,
                source_client_site_id: a.client_site_id,
                action_type: (actionType === 'replacement' ? 'replace' : 
                              actionType === 'relocation' ? 'relocate' : 
                              actionType === 'offboarding' ? 'offboard' : 'replace') as 'replace' | 'relocate' | 'offboard',
                reason: reason,
                notes: notes
            }));

        const payload = {
            empresa_id: selectedEmpresaId!,
            type: actionType,
            title: title,
            description: notes || `Solicitação gerada para ${selectedAssignments.length} alvo(s)`,
            priority: priority,
            targets: targets
        };

        try {
            const newSolicitudId = await createSolicitudWithTargets.mutateAsync(payload);
            navigate(`/operacoes/solicitudes/${newSolicitudId}`);
        } catch (error) {
            console.error("Failed to create solicitud", error);
        }
    };

    return (
        <div className="flex flex-col space-y-6 p-4 max-w-6xl mx-auto pb-24">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/operacoes/solicitudes')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Operação sobre Alocações</h1>
                    <p className="text-muted-foreground">
                        Selecione os trabalhadores ativos e inicie processos de substituição, realocação ou desligamento.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Esquerda: Filtros e Tabela */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-md border shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Users className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold">1. Buscar Alocações (Trabalhadores)</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos os Clientes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Clientes</SelectItem>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id || ''}>{c.trade_name || c.legal_name || ''}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra / Local</label>
                                <Select value={selectedClientSiteId} onValueChange={setSelectedClientSiteId} disabled={selectedClientId === 'all'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={selectedClientId === 'all' ? 'Selecione um cliente primeiro' : 'Todas as Obras'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Obras</SelectItem>
                                        {clientSites.map(s => (
                                            <SelectItem key={s.id} value={s.id || ''}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Resultados ({assignments.length})</span>
                                {selectedAssignments.length > 0 && (
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                        {selectedAssignments.length} selecionado(s)
                                    </span>
                                )}
                            </div>
                            <AssignmentsSelectionTable 
                                assignments={assignments}
                                selectedIds={selectedAssignments}
                                onToggleSelection={handleToggleSelection}
                                onToggleAll={handleToggleAll}
                            />
                        </div>
                    </div>
                </div>

                {/* Direita: Formulário de Solicitação */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-md border shadow-sm space-y-5 sticky top-24">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-semibold">2. Detalhes da Solicitação</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Ação</label>
                                <Select value={actionType} onValueChange={setActionType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="replacement">Reemplazo (Substituição)</SelectItem>
                                        <SelectItem value="relocation">Reubicación (Realocação)</SelectItem>
                                        <SelectItem value="offboarding">Baja (Desligamento)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Título Automático</label>
                                <Input 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Reemplazo para Google..." 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prioridade</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Prioridade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Motivo (Reason) <span className="text-red-500">*</span></label>
                                <Textarea 
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Explique o motivo desta ação operacional..." 
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações Extras</label>
                                <Textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Instruções para o RH ou Operações..." 
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="pt-4 mt-2 border-t">
                            <Button 
                                className="w-full" 
                                size="lg"
                                disabled={selectedAssignments.length === 0 || !reason.trim() || createSolicitudWithTargets.isPending}
                                onClick={handleSubmit}
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                {createSolicitudWithTargets.isPending ? 'Criando...' : 'Iniciar Operação'}
                            </Button>
                            {selectedAssignments.length === 0 && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    Selecione pelo menos um trabalhador na tabela.
                                </p>
                            )}
                            {selectedAssignments.length > 0 && !reason.trim() && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    Informe um motivo para continuar.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
