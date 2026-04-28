import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useUpdateWorkerAlocacao } from '../../hooks/useUpdateWorkerAlocacao';
import { getUniqueClients, getUniqueContratantes, getUniqueFunciones, WorkerAlocacao } from '../../api/workersApi';

interface EditManualAllocationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerCodColab: string;
    allocation: WorkerAlocacao | null;
}

export function EditManualAllocationModal({ open, onOpenChange, workerCodColab, allocation }: EditManualAllocationModalProps) {
    const { mutate: updateAllocation, isPending } = useUpdateWorkerAlocacao();
    const [cliente, setCliente] = useState('');
    const [contratante, setContratante] = useState('');
    const [funcion, setFuncion] = useState('');
    const [codpedido, setCodpedido] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [dataSaida, setDataSaida] = useState('');

    const [clientsList, setClientsList] = useState<string[]>([]);
    const [contratantesList, setContratantesList] = useState<string[]>([]);
    const [funcionesList, setFuncionesList] = useState<string[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);

    useEffect(() => {
        if (open) {
            setLoadingFilters(true);
            Promise.all([
                getUniqueClients(),
                getUniqueContratantes(),
                getUniqueFunciones()
            ])
                .then(([clients, contratantes, funciones]) => {
                    setClientsList(clients.filter(Boolean));
                    setContratantesList(contratantes.filter(Boolean));
                    setFuncionesList(funciones.filter(Boolean));
                })
                .catch(console.error)
                .finally(() => setLoadingFilters(false));
            
            // Initialize form with allocation data
            if (allocation) {
                setCliente(allocation.cliente_nombre || '');
                setContratante(allocation.contratante || '');
                setFuncion(allocation.funcion || '');
                setCodpedido(allocation.codpedido || '');
                setDataInicio(allocation.fechainiciopedido ? allocation.fechainiciopedido.split('T')[0] : '');
                setDataFim(allocation.fechafinpedido ? allocation.fechafinpedido.split('T')[0] : '');
                setDataSaida(allocation.fechasalidatrabajador ? allocation.fechasalidatrabajador.split('T')[0] : '');
            }
        }
    }, [open, allocation]);

    const handleSave = () => {
        if (!allocation) return;
        
        updateAllocation(
            {
                id: allocation.id,
                workerCodColab,
                cliente_nombre: cliente,
                contratante,
                funcion,
                codpedido: codpedido || undefined,
                fechainiciopedido: dataInicio || undefined,
                fechafinpedido: dataFim || null,
                fechasalidatrabajador: dataSaida || null
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                }
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Alocação</DialogTitle>
                    <DialogDescription>
                        Edite as informações da alocação selecionada.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    {loadingFilters ? (
                        <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" /></div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                <Label>Data de Início da Obra</Label>
                                <Input 
                                    type="date" 
                                    value={dataInicio} 
                                    onChange={(e) => setDataInicio(e.target.value)} 
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                    <Label>Fim Previsto</Label>
                                    <Input 
                                        type="date" 
                                        value={dataFim} 
                                        onChange={(e) => setDataFim(e.target.value)} 
                                    />
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <Label>Saída Efetiva</Label>
                                    <Input 
                                        type="date" 
                                        value={dataSaida} 
                                        onChange={(e) => setDataSaida(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Código do Pedido</Label>
                                <Input 
                                    placeholder="Ex: P12345" 
                                    value={codpedido} 
                                    onChange={(e) => setCodpedido(e.target.value)} 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Empresa Contratante</Label>
                                <Input 
                                    list="edit-contratantes-list" 
                                    placeholder="Ex: TRIANGULO" 
                                    value={contratante} 
                                    onChange={(e) => setContratante(e.target.value)} 
                                />
                                <datalist id="edit-contratantes-list">
                                    {contratantesList.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Cliente (Obra)</Label>
                                <Input 
                                    list="edit-clientes-list" 
                                    placeholder="Ex: CAM IMPIANTI" 
                                    value={cliente} 
                                    onChange={(e) => setCliente(e.target.value)} 
                                />
                                <datalist id="edit-clientes-list">
                                    {clientsList.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Função</Label>
                                <Input 
                                    list="edit-funciones-list" 
                                    placeholder="Ex: AYUDANTE" 
                                    value={funcion} 
                                    onChange={(e) => setFuncion(e.target.value)} 
                                />
                                <datalist id="edit-funciones-list">
                                    {funcionesList.map(f => <option key={f} value={f} />)}
                                </datalist>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isPending || !cliente || !contratante || !funcion}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
