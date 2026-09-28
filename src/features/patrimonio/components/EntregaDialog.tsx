import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { realizarEntrega, salvarDocumento, listarColaboradores, type ColaboradorPatrimonio } from '../api/patrimonioApi';
import { gerarTermoResponsabilidadePdf } from '../utils/termoResponsabilidadePdf';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { 
    UserCheck, 
    Search, 
    Building2, 
    Briefcase, 
    FileText, 
    Loader2, 
    Check, 
    X, 
    Users, 
    MapPin, 
    RefreshCw 
} from 'lucide-react';
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

    // Lista de colaboradores do sistema
    const [colaboradores, setColaboradores] = useState<ColaboradorPatrimonio[]>([]);
    const [loadingColaboradores, setLoadingColaboradores] = useState(false);
    const [buscaColaborador, setBuscaColaborador] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'oficina' | 'campo'>('todos');
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState<ColaboradorPatrimonio | null>(null);

    // Dados do formulário
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

    useEffect(() => {
        if (!open) {
            setColaboradorSelecionado(null);
            setWorkerId('');
            setWorkerNome('');
            setWorkerDoc('');
            setBuscaColaborador('');
            return;
        }

        // Carrega a lista completa de colaboradores cadastrados
        carregarListaColaboradores();

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

    const carregarListaColaboradores = async () => {
        setLoadingColaboradores(true);
        try {
            const lista = await listarColaboradores();
            setColaboradores(lista);
        } catch (err) {
            console.error('Erro ao carregar colaboradores:', err);
        } finally {
            setLoadingColaboradores(false);
        }
    };

    // Filtragem em memória
    const colaboradoresFiltrados = useMemo(() => {
        return colaboradores.filter((c) => {
            if (filtroTipo === 'oficina' && !c.tipo.toLowerCase().includes('oficina')) return false;
            if (filtroTipo === 'campo' && !c.tipo.toLowerCase().includes('campo')) return false;

            if (!buscaColaborador.trim()) return true;
            const b = buscaColaborador.toLowerCase();
            return (
                c.nome.toLowerCase().includes(b) ||
                (c.documento && c.documento.toLowerCase().includes(b)) ||
                (c.setor_projeto && c.setor_projeto.toLowerCase().includes(b)) ||
                (c.empresa && c.empresa.toLowerCase().includes(b))
            );
        });
    }, [colaboradores, buscaColaborador, filtroTipo]);

    const handleSelecionarColaborador = (c: ColaboradorPatrimonio) => {
        setColaboradorSelecionado(c);
        setWorkerId(c.id);
        setWorkerNome(c.nome);
        setWorkerDoc(c.documento || '');
        if (c.setor_projeto && c.setor_projeto !== 'Operacional') {
            setProjeto(c.setor_projeto);
        }
        if (c.tipo.toLowerCase().includes('oficina')) {
            setLocalEntrega('Oficina Central / Escritório');
        } else if (c.setor_projeto) {
            setLocalEntrega(c.setor_projeto);
        }
    };

    const handleLimparColaborador = () => {
        setColaboradorSelecionado(null);
        setWorkerId('');
        setWorkerNome('');
        setWorkerDoc('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo) return;
        if (!workerNome.trim()) {
            toast.error('Selecione o funcionário responsável.');
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
                    empresaNome: ativo.empresa_proprietaria || 'KR INDUSTRIAL',
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
            <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0">
                <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <UserCheck className="h-5 w-5 text-emerald-600" />
                        Entregar Patrimônio ao Colaborador
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Atribuir custódia de <strong>{ativo?.codigo_patrimonial}</strong> ({ativo?.descricao}) e gerar termo de entrega.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* SELEÇÃO DO COLABORADOR */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>Funcionário Beneficiário / Responsável <span className="text-rose-500">*</span></span>
                            {colaboradorSelecionado && (
                                <button
                                    type="button"
                                    onClick={handleLimparColaborador}
                                    className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-normal"
                                >
                                    <RefreshCw className="h-3 w-3" /> Trocar Funcionário
                                </button>
                            )}
                        </Label>

                        {/* Se já selecionou um colaborador, exibe o Card de confirmação */}
                        {colaboradorSelecionado ? (
                            <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                        {colaboradorSelecionado.nome.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                {colaboradorSelecionado.nome}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 ${
                                                    colaboradorSelecionado.tipo.includes('Oficina')
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}
                                            >
                                                {colaboradorSelecionado.tipo}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {colaboradorSelecionado.documento ? `Doc: ${colaboradorSelecionado.documento} • ` : ''}
                                            {colaboradorSelecionado.setor_projeto} • {colaboradorSelecionado.empresa}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLimparColaborador}
                                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                    title="Remover seleção"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            /* Painel de Busca e Seleção dos Colaboradores Cadastrados */
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-3 space-y-2.5">
                                {/* Campo de Busca */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Pesquise por nome do funcionário, NIE/DNI ou setor..."
                                        value={buscaColaborador}
                                        onChange={(e) => setBuscaColaborador(e.target.value)}
                                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-900"
                                        autoFocus
                                    />
                                </div>

                                {/* Filtros Rápidos por Categoria de Funcionário */}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTipo('todos')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                            filtroTipo === 'todos'
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        Todos ({colaboradores.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTipo('oficina')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                            filtroTipo === 'oficina'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        🏢 Oficina & Escritório
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTipo('campo')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                            filtroTipo === 'campo'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        👷 Trabalhadores de Campo
                                    </button>
                                </div>

                                {/* Lista de Colaboradores */}
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                    {loadingColaboradores ? (
                                        <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                                            Carregando cadastro de funcionários...
                                        </div>
                                    ) : colaboradoresFiltrados.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-slate-400">
                                            Nenhum funcionário localizado com o filtro atual.
                                        </div>
                                    ) : (
                                        colaboradoresFiltrados.slice(0, 30).map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleSelecionarColaborador(c)}
                                                className="w-full p-2.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                                        c.tipo.includes('Oficina') ? 'bg-blue-600' : 'bg-emerald-600'
                                                    }`}>
                                                        {c.nome.trim().substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-sky-600">
                                                                {c.nome}
                                                            </span>
                                                            <span className={`text-[10px] px-1 py-0 rounded border font-medium ${
                                                                c.tipo.includes('Oficina')
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                            }`}>
                                                                {c.tipo.includes('Oficina') ? 'Oficina' : 'Campo'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 truncate">
                                                            {c.documento ? `Doc: ${c.documento} • ` : ''}
                                                            {c.setor_projeto} • {c.empresa}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    Selecionar →
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
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
                            <Label className="text-xs font-medium">Projeto / Setor / Oficina</Label>
                            <Input
                                placeholder="Ex: Oficina Central, Sagunto, Tarragona..."
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
                            className="text-xs min-h-[50px]"
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
                            Gerar e baixar automaticamente o <strong>Termo de Responsabilidade em PDF</strong> para assinatura.
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
                            disabled={submitting || !workerNome}
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
