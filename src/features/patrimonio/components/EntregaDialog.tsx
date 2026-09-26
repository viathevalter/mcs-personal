import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { realizarEntrega, salvarDocumento } from '../api/patrimonioApi';
import { gerarTermoResponsabilidadePdf } from '../utils/termoResponsabilidadePdf';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { supabase } from '@/shared/supabase/client';
import { UserCheck, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EntregaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativo: AtivoPatrimonio | null;
    onSuccess: () => void;
}

export function EntregaDialog({ open, onOpenChange, ativo, onSuccess }: EntregaDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [gerarTermoAutomatico, setGerarTermoAutomatico] = useState(true);

    const [workerId, setWorkerId] = useState('');
    const [workerNome, setWorkerNome] = useState('');
    const [workerDoc, setWorkerDoc] = useState('');
    const [coordenadorNome, setCoordenadorNome] = useState('');
    const [projeto, setProjeto] = useState('');
    const [localEntrega, setLocalEntrega] = useState('Escritório Central / Oficina');
    const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().slice(0, 16));
    const [previsaoDevolucao, setPrevisaoDevolucao] = useState('');
    const [acessoriosEntregues, setAcessoriosEntregues] = useState('');
    const [estadoEquipamento, setEstadoEquipamento] = useState('Excelente / Novo');
    const [observacoes, setObservacoes] = useState('');

    // Busca de trabalhadores para autocomplete
    const [buscaWorker, setBuscaWorker] = useState('');
    const [workersOptions, setWorkersOptions] = useState<{ id: string; nome: string; documento?: string }[]>([]);
    const [loadingWorkers, setLoadingWorkers] = useState(false);

    useEffect(() => {
        if (!open) {
            setWorkerId('');
            setWorkerNome('');
            setWorkerDoc('');
            setBuscaWorker('');
            return;
        }

        // Sugestão de acessórios conforme categoria do ativo
        if (ativo) {
            if (ativo.categoria.toLowerCase().includes('celular') || ativo.codigo_patrimonial.startsWith('MOB')) {
                setAcessoriosEntregues('Carregador original, Cabo USB-C, Capa de proteção');
            } else if (ativo.categoria.toLowerCase().includes('informática') || ativo.codigo_patrimonial.startsWith('TI')) {
                setAcessoriosEntregues('Fonte de alimentação, Carregador, Mouse, Mochila para notebook');
            } else if (ativo.categoria.toLowerCase().includes('ferramenta')) {
                setAcessoriosEntregues('Maleta plástica, 2 baterias, Carregador bivolt, Manual');
            }
        }
    }, [open, ativo]);

    // Buscar trabalhadores no Supabase
    useEffect(() => {
        if (!buscaWorker || buscaWorker.length < 2) {
            setWorkersOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoadingWorkers(true);
            try {
                const { data } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, nome, nie, dni, passaporte')
                    .ilike('nome', `%${buscaWorker}%`)
                    .limit(6);

                if (data) {
                    setWorkersOptions(
                        data.map((w: any) => ({
                            id: w.id,
                            nome: w.nome,
                            documento: w.nie || w.dni || w.passaporte || '',
                        }))
                    );
                }
            } catch {
                // Silencioso se não tiver permissão
            } finally {
                setLoadingWorkers(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [buscaWorker]);

    const handleSelectWorker = (w: { id: string; nome: string; documento?: string }) => {
        setWorkerId(w.id);
        setWorkerNome(w.nome);
        setWorkerDoc(w.documento || '');
        setBuscaWorker(w.nome);
        setWorkersOptions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo) return;
        if (!workerNome.trim()) {
            toast.error('Informe o nome do funcionário responsável.');
            return;
        }

        setSubmitting(true);
        try {
            await realizarEntrega(ativo.id, {
                workerId: workerId || undefined as any,
                workerNome,
                workerDoc,
                coordenadorNome,
                dataEntrega: new Date(dataEntrega).toISOString(),
                localEntrega,
                projeto,
                previsaoDevolucao: previsaoDevolucao || undefined,
                acessoriosEntregues,
                observacoes,
            });

            // Se selecionado, gera e baixa automaticamente o Termo de Responsabilidade
            if (gerarTermoAutomatico) {
                const pdfDoc = gerarTermoResponsabilidadePdf({
                    ativo,
                    funcionarioNome: workerNome,
                    funcionarioDoc: workerDoc,
                    coordenadorNome,
                    projeto,
                    localEntrega,
                    dataEntrega: new Date(dataEntrega).toLocaleDateString('pt-BR'),
                    acessorios: acessoriosEntregues,
                    estadoEquipamento,
                    empresaNome: ativo.empresa_proprietaria || 'MCS INDUSTRIAL',
                });

                pdfDoc.save(`termo_responsabilidade_${ativo.codigo_patrimonial}_${workerNome.replace(/\s+/g, '_')}.pdf`);

                // Registra o documento na ficha do ativo
                await salvarDocumento({
                    ativo_id: ativo.id,
                    tipo_documento: 'termo_responsabilidade',
                    titulo: `Termo de Entrega - ${workerNome}`,
                    arquivo_url: '#gerado_automaticamente',
                    arquivo_nome: `termo_${ativo.codigo_patrimonial}.pdf`,
                    status_assinatura: 'pendente',
                });
            }

            toast.success(`Equipamento entregue a ${workerNome} com sucesso!`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro na entrega:', err);
            toast.error(err?.message || 'Falha ao registrar entrega.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <UserCheck className="h-5 w-5 text-emerald-600" />
                        Entregar Patrimônio ao Colaborador
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Atribuir custódia de <strong>{ativo?.codigo_patrimonial}</strong> ({ativo?.descricao}) e gerar termo de entrega.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1">
                    {/* Seleção do Trabalhador */}
                    <div className="space-y-1.5 relative">
                        <Label className="text-xs font-medium">
                            Funcionário Beneficiário / Responsável <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            placeholder="Digite para buscar pelo nome no sistema ou digite um novo..."
                            value={buscaWorker}
                            onChange={(e) => {
                                setBuscaWorker(e.target.value);
                                setWorkerNome(e.target.value);
                            }}
                            className="h-9 text-xs"
                            required
                        />

                        {/* Dropdown de sugestões */}
                        {workersOptions.length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 max-h-48 overflow-y-auto">
                                {workersOptions.map((w) => (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => handleSelectWorker(w)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center"
                                    >
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{w.nome}</span>
                                        {w.documento && (
                                            <span className="text-[11px] text-slate-400">Doc: {w.documento}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Documento (DNI / NIE / Passaporte)</Label>
                            <Input
                                placeholder="Ex: Y1234567X"
                                value={workerDoc}
                                onChange={(e) => setWorkerDoc(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Coordenador Responsável</Label>
                            <Input
                                placeholder="Nome do coordenador / supervisor"
                                value={coordenadorNome}
                                onChange={(e) => setCoordenadorNome(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Projeto / Obra / Centro</Label>
                            <Input
                                placeholder="Ex: Tarragona, Sagunto, Oficina..."
                                value={projeto}
                                onChange={(e) => setProjeto(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Local da Entrega</Label>
                            <Input
                                placeholder="Local físico"
                                value={localEntrega}
                                onChange={(e) => setLocalEntrega(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Data e Hora da Entrega</Label>
                            <Input
                                type="datetime-local"
                                value={dataEntrega}
                                onChange={(e) => setDataEntrega(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Previsão de Devolução (Opcional)</Label>
                            <Input
                                type="date"
                                value={previsaoDevolucao}
                                onChange={(e) => setPrevisaoDevolucao(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Acessórios Entregues Junto</Label>
                        <Input
                            placeholder="Cabos, carregador, adaptadores, capa, etc."
                            value={acessoriosEntregues}
                            onChange={(e) => setAcessoriosEntregues(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Estado do Equipamento na Entrega</Label>
                        <Input
                            placeholder="Ex: Excelente estado, sem riscos ou avarias"
                            value={estadoEquipamento}
                            onChange={(e) => setEstadoEquipamento(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Observações Adicionais</Label>
                        <Textarea
                            placeholder="Informações relevantes para registro..."
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            className="text-xs min-h-[60px]"
                        />
                    </div>

                    {/* Checkbox para geração automática do PDF do Termo */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5">
                        <Checkbox
                            id="gerarTermo"
                            checked={gerarTermoAutomatico}
                            onCheckedChange={(checked: boolean) => setGerarTermoAutomatico(checked)}
                        />
                        <label htmlFor="gerarTermo" className="text-xs text-emerald-900 dark:text-emerald-300 font-medium cursor-pointer">
                            Gerar e baixar automaticamente o <strong>Termo de Responsabilidade em PDF</strong> com dados completos para assinatura.
                        </label>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...
                                </>
                            ) : (
                                <>
                                    <UserCheck className="h-3.5 w-3.5" /> Confirmar Entrega
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
