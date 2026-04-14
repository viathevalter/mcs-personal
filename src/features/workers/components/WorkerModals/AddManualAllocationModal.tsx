import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAddManualAllocation } from '../../hooks/useAddManualAllocation';
import { getUniqueClients, getUniqueContratantes, getUniqueFunciones } from '../../api/workersApi';

interface AddManualAllocationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerCodColab: string;
    workerName: string;
}

export function AddManualAllocationModal({ open, onOpenChange, workerCodColab, workerName }: AddManualAllocationModalProps) {
    const { mutate: addAllocation, isPending } = useAddManualAllocation();
    const [cliente, setCliente] = useState('');
    const [contratante, setContratante] = useState('');
    const [funcion, setFuncion] = useState('');
    const [codpedido, setCodpedido] = useState('');
    const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);

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
            
            // Reset form
            setCliente('');
            setContratante('');
            setFuncion('');
            setCodpedido('');
            setDataInicio(new Date().toISOString().split('T')[0]);
        }
    }, [open]);

    const handleSave = () => {
        if (!cliente || !contratante || !funcion || !dataInicio) return;
        
        addAllocation(
            {
                workerCodColab,
                workerName,
                cliente_nombre: cliente,
                contratante,
                funcion,
                codpedido: codpedido || undefined,
                fechainiciopedido: dataInicio
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
                    <DialogTitle>Nova Alocação Manual (Mini-Pedido)</DialogTitle>
                    <DialogDescription>
                        Reative e aloque este trabalhador rapidamente sem aguardar a sincronização do SharePoint.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    {loadingFilters ? (
                        <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" /></div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                <Label>Data de Início da Obra <span className="text-destructive">*</span></Label>
                                <Input 
                                    type="date" 
                                    value={dataInicio} 
                                    onChange={(e) => setDataInicio(e.target.value)} 
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Código do Pedido (Opcional)</Label>
                                <Input 
                                    placeholder="Ex: P12345 (Ou gerado automático)" 
                                    value={codpedido} 
                                    onChange={(e) => setCodpedido(e.target.value)} 
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label>Empresa Contratante <span className="text-destructive">*</span></Label>
                                <Input 
                                    list="contratantes-list" 
                                    placeholder="Ex: TRIANGULO" 
                                    value={contratante} 
                                    onChange={(e) => setContratante(e.target.value)} 
                                />
                                <datalist id="contratantes-list">
                                    {contratantesList.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Cliente (Obra) <span className="text-destructive">*</span></Label>
                                <Input 
                                    list="clientes-list" 
                                    placeholder="Ex: CAM IMPIANTI" 
                                    value={cliente} 
                                    onChange={(e) => setCliente(e.target.value)} 
                                />
                                <datalist id="clientes-list">
                                    {clientsList.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Função <span className="text-destructive">*</span></Label>
                                <Input 
                                    list="funciones-list" 
                                    placeholder="Ex: AYUDANTE" 
                                    value={funcion} 
                                    onChange={(e) => setFuncion(e.target.value)} 
                                />
                                <datalist id="funciones-list">
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
                        disabled={isPending || !cliente || !contratante || !funcion || !dataInicio}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Ativar e Alocar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
