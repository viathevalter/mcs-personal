import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarAtivos } from '../api/patrimonioApi';
import type { AtivoPatrimonio, PatrimonioFiltros, PatrimonioStatus } from '../types/patrimonio';
import { CATEGORIAS_PATRIMONIO, STATUS_CONFIG } from '../types/patrimonio';
import { exportarPatrimoniosExcel, exportarPatrimoniosCsv, exportarPatrimoniosPdf } from '../utils/exportPatrimonio';
import { QrScannerModal } from '../components/QrScannerModal';
import { EtiquetasModal } from '../components/EtiquetasModal';
import { AtivoFormDialog } from '../components/AtivoFormDialog';
import { EntregaDialog } from '../components/EntregaDialog';
import { DevolucaoDialog } from '../components/DevolucaoDialog';
import { TransferenciaDialog } from '../components/TransferenciaDialog';
import { ManutencaoDialog } from '../components/ManutencaoDialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    Plus,
    Camera,
    Printer,
    Download,
    LayoutGrid,
    List,
    Search,
    Filter,
    RotateCcw,
    UserCheck,
    RefreshCw,
    Wrench,
    FileSpreadsheet,
    FileText,
    ExternalLink,
    MoreVertical,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export function PatrimonioListPage() {
    const navigate = useNavigate();

    const [ativos, setAtivos] = useState<AtivoPatrimonio[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Filtros
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
    const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas');
    const [filtroProjeto, setFiltroProjeto] = useState<string>('todos');

    // Seleção de itens para etiquetas em lote
    const [selecionados, setSelecionados] = useState<string[]>([]);

    // Modais
    const [scannerOpen, setScannerOpen] = useState(false);
    const [novoAtivoOpen, setNovoAtivoOpen] = useState(false);
    const [etiquetasOpen, setEtiquetasOpen] = useState(false);

    // Modais de ação rápida para um item específico
    const [ativoSelecionadoAcao, setAtivoSelecionadoAcao] = useState<AtivoPatrimonio | null>(null);
    const [entregaOpen, setEntregaOpen] = useState(false);
    const [devolucaoOpen, setDevolucaoOpen] = useState(false);
    const [transferenciaOpen, setTransferenciaOpen] = useState(false);
    const [manutencaoOpen, setManutencaoOpen] = useState(false);

    useEffect(() => {
        carregarAtivos();
    }, [filtroStatus, filtroCategoria, filtroEmpresa, filtroProjeto]);

    const carregarAtivos = async () => {
        setLoading(true);
        try {
            const filtros: PatrimonioFiltros = {
                status: filtroStatus as any,
                categoria: filtroCategoria,
                empresa: filtroEmpresa,
                projeto: filtroProjeto,
                search: busca || undefined,
            };
            const dados = await listarAtivos(filtros);
            setAtivos(dados);
        } catch (err: any) {
            console.error('Erro ao listar patrimônios:', err);
            toast.error('Falha ao carregar lista de patrimônio.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        carregarAtivos();
    };

    // Lista filtrada em memória para busca rápida
    const ativosFiltrados = useMemo(() => {
        if (!busca.trim()) return ativos;
        const b = busca.toLowerCase();
        return ativos.filter(
            (a) =>
                a.codigo_patrimonial.toLowerCase().includes(b) ||
                a.descricao.toLowerCase().includes(b) ||
                (a.marca && a.marca.toLowerCase().includes(b)) ||
                (a.modelo && a.modelo.toLowerCase().includes(b)) ||
                (a.responsavel_nome && a.responsavel_nome.toLowerCase().includes(b)) ||
                (a.projeto && a.projeto.toLowerCase().includes(b)) ||
                (a.numero_serie && a.numero_serie.toLowerCase().includes(b)) ||
                (a.imei && a.imei.toLowerCase().includes(b))
        );
    }, [ativos, busca]);

    // Opções únicas para dropdowns de filtros
    const empresasDisponiveis = useMemo(() => {
        const set = new Set(ativos.map((a) => a.empresa_proprietaria).filter(Boolean));
        return Array.from(set) as string[];
    }, [ativos]);

    const projetosDisponiveis = useMemo(() => {
        const set = new Set(ativos.map((a) => a.projeto).filter(Boolean));
        return Array.from(set) as string[];
    }, [ativos]);

    // Seleção de checkboxes
    const toggleSelectAll = () => {
        if (selecionados.length === ativosFiltrados.length) {
            setSelecionados([]);
        } else {
            setSelecionados(ativosFiltrados.map((a) => a.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelecionados((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const ativosParaImprimir = useMemo(() => {
        if (selecionados.length > 0) {
            return ativosFiltrados.filter((a) => selecionados.includes(a.id));
        }
        return ativosFiltrados;
    }, [ativosFiltrados, selecionados]);

    const handleAcaoScanner = (ativo: AtivoPatrimonio, acao: 'consultar' | 'entregar' | 'devolver' | 'transferir' | 'manutencao') => {
        setAtivoSelecionadoAcao(ativo);
        if (acao === 'entregar') setEntregaOpen(true);
        else if (acao === 'devolver') setDevolucaoOpen(true);
        else if (acao === 'transferir') setTransferenciaOpen(true);
        else if (acao === 'manutencao') setManutencaoOpen(true);
    };

    return (
        <div className="space-y-5 pb-12">
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-sky-600" />
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            Controle Patrimonial & Ativos
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Gestão de bens, etiquetas com QR Code, termos de custódia e histórico de ferramentas da empresa.
                    </p>
                </div>

                {/* BOTÕES DE AÇÃO PRINCIPAIS */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Botão Escanear por Celular */}
                    <Button
                        onClick={() => setScannerOpen(true)}
                        variant="outline"
                        className="h-9 text-xs gap-1.5 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100"
                    >
                        <Camera className="h-4 w-4 text-sky-600" /> Escanear QR Code
                    </Button>

                    {/* Botão Imprimir Etiquetas */}
                    <Button
                        onClick={() => setEtiquetasOpen(true)}
                        variant="outline"
                        disabled={ativosFiltrados.length === 0}
                        className="h-9 text-xs gap-1.5"
                    >
                        <Printer className="h-3.5 w-3.5 text-slate-600" />
                        {selecionados.length > 0
                            ? `Imprimir Etiquetas (${selecionados.length})`
                            : 'Imprimir Etiquetas em Lote'}
                    </Button>

                    {/* Dropdown de Exportações */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs gap-1.5">
                                <Download className="h-3.5 w-3.5" /> Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportarPatrimoniosExcel(ativosFiltrados)} className="text-xs gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Exportar para Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportarPatrimoniosCsv(ativosFiltrados)} className="text-xs gap-2">
                                <FileText className="h-3.5 w-3.5 text-blue-600" /> Exportar para CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportarPatrimoniosPdf(ativosFiltrados)} className="text-xs gap-2">
                                <Printer className="h-3.5 w-3.5 text-rose-600" /> Exportar para Relatório PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Botão Novo Patrimônio */}
                    <Button
                        onClick={() => setNovoAtivoOpen(true)}
                        className="h-9 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        <Plus className="h-4 w-4" /> Novo Patrimônio
                    </Button>
                </div>
            </div>

            {/* BARRA DE FILTROS E BUSCA */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por código, descrição, marca, responsável, IMEI ou nº de série..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                        <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
                            Buscar
                        </Button>
                    </form>

                    {/* Alternância de Visualização (Cards vs Tabela) */}
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800 self-start sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 rounded text-xs transition-colors ${
                                viewMode === 'cards'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Visualização em Galeria (Cards)"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded text-xs transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Visualização em Tabela Detalhada"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Filtros em Linha */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos os Status</SelectItem>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                    {cfg.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas as Categorias</SelectItem>
                            {CATEGORIAS_PATRIMONIO.map((c) => (
                                <SelectItem key={c.id} value={c.nome}>
                                    {c.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Empresa Proprietária" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas as Empresas</SelectItem>
                            {empresasDisponiveis.map((emp) => (
                                <SelectItem key={emp} value={emp}>
                                    {emp}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Projeto / Local" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos os Projetos</SelectItem>
                            {projetosDisponiveis.map((proj) => (
                                <SelectItem key={proj} value={proj}>
                                    {proj}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* CONTADOR DE REGISTROS E SELEÇÃO */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <div className="flex items-center gap-2">
                    <span>
                        Exibindo <strong>{ativosFiltrados.length}</strong> patrimônio(s)
                    </span>
                    {selecionados.length > 0 && (
                        <span className="font-semibold text-sky-600">
                            • {selecionados.length} selecionado(s)
                        </span>
                    )}
                </div>

                {ativosFiltrados.length > 0 && (
                    <button
                        onClick={toggleSelectAll}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-sky-600 font-medium"
                    >
                        {selecionados.length === ativosFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos para etiquetas'}
                    </button>
                )}
            </div>

            {/* CONTEÚDO PRINCIPAL (CARDS OU TABELA) */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                    <span className="text-xs text-slate-500 font-medium">Carregando patrimônios...</span>
                </div>
            ) : ativosFiltrados.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40">
                    <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Nenhum patrimônio encontrado
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Tente ajustar os filtros acima ou cadastre um novo equipamento para iniciar o controle.
                    </p>
                    <Button
                        onClick={() => setNovoAtivoOpen(true)}
                        size="sm"
                        className="mt-4 bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" /> Cadastrar Primeiro Ativo
                    </Button>
                </div>
            ) : viewMode === 'cards' ? (
                /* ------------------- VISUALIZAÇÃO EM GALERIA (CARDS) ------------------- */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {ativosFiltrados.map((ativo) => {
                        const statusCfg = STATUS_CONFIG[ativo.status] || STATUS_CONFIG.disponivel;
                        const isSelected = selecionados.includes(ativo.id);

                        return (
                            <div
                                key={ativo.id}
                                className={`group rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-sky-500 ring-2 ring-sky-400'
                                        : 'border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div>
                                    {/* Imagem do Ativo */}
                                    <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                                        {ativo.foto_principal_url ? (
                                            <img
                                                src={ativo.foto_principal_url}
                                                alt={ativo.descricao}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400">
                                                <ShieldCheck className="h-10 w-10 opacity-40 mb-1" />
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                    {ativo.categoria}
                                                </span>
                                            </div>
                                        )}

                                        {/* Checkbox de Seleção */}
                                        <div className="absolute top-2.5 left-2.5 z-10">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelect(ativo.id)}
                                                className="bg-white/90 data-[state=checked]:bg-sky-600 border-slate-300 shadow"
                                            />
                                        </div>

                                        {/* Badge de Código Patrimonial */}
                                        <div className="absolute top-2.5 right-2.5 z-10">
                                            <span className="text-[10px] font-black tracking-wider bg-slate-900/90 text-white px-2 py-0.5 rounded shadow backdrop-blur-sm">
                                                {ativo.codigo_patrimonial}
                                            </span>
                                        </div>

                                        {/* Badge de Status sobreposto */}
                                        <div className="absolute bottom-2 left-2.5 z-10">
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-semibold backdrop-blur-md px-2 py-0.5 shadow-sm ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusCfg.dot}`} />
                                                {statusCfg.label}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Corpo do Card */}
                                    <div className="p-3.5 space-y-2">
                                        <div>
                                            <h3
                                                onClick={() => navigate(`/patrimonio/${ativo.codigo_patrimonial}`)}
                                                className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-600 transition-colors line-clamp-1 cursor-pointer"
                                                title={ativo.descricao}
                                            >
                                                {ativo.descricao}
                                            </h3>
                                            <p className="text-xs text-slate-500 truncate">
                                                {[ativo.marca, ativo.modelo].filter(Boolean).join(' • ') || ativo.categoria}
                                            </p>
                                        </div>

                                        {/* Informações de Custódia */}
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                                <span className="text-slate-400">Responsável:</span>
                                                <span className="font-semibold truncate max-w-[140px]">
                                                    {ativo.responsavel_nome || 'Armazém Central'}
                                                </span>
                                            </div>

                                            {ativo.projeto && (
                                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                                    <span className="text-slate-400">Projeto:</span>
                                                    <span className="font-medium truncate max-w-[140px] text-sky-600">
                                                        {ativo.projeto}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                <span>Identificador:</span>
                                                <span className="font-mono truncate max-w-[130px]">
                                                    {ativo.imei || ativo.numero_serie || ativo.matricula || ativo.categoria}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rodapé do Card com Ações */}
                                <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/patrimonio/${ativo.codigo_patrimonial}`)}
                                        className="h-7 text-xs text-sky-600 hover:text-sky-700 px-2 gap-1 font-medium"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> Detalhes
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="text-xs">
                                            {ativo.status !== 'em_uso' && (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setAtivoSelecionadoAcao(ativo);
                                                        setEntregaOpen(true);
                                                    }}
                                                    className="gap-2 text-emerald-600"
                                                >
                                                    <UserCheck className="h-3.5 w-3.5" /> Entregar a Colaborador
                                                </DropdownMenuItem>
                                            )}

                                            {ativo.status === 'em_uso' && (
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setAtivoSelecionadoAcao(ativo);
                                                            setDevolucaoOpen(true);
                                                        }}
                                                        className="gap-2 text-amber-600"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" /> Registrar Devolução
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setAtivoSelecionadoAcao(ativo);
                                                            setTransferenciaOpen(true);
                                                        }}
                                                        className="gap-2 text-blue-600"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" /> Transferir Projeto
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setAtivoSelecionadoAcao(ativo);
                                                    setManutencaoOpen(true);
                                                }}
                                                className="gap-2 text-rose-600"
                                            >
                                                <Wrench className="h-3.5 w-3.5" /> Enviar para Manutenção
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ------------------- VISUALIZAÇÃO EM TABELA ------------------- */
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                            <TableRow>
                                <TableHead className="w-10 text-center">
                                    <Checkbox
                                        checked={selecionados.length === ativosFiltrados.length && ativosFiltrados.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="text-xs">Código</TableHead>
                                <TableHead className="text-xs">Descrição / Modelo</TableHead>
                                <TableHead className="text-xs">Categoria</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Responsável Atual</TableHead>
                                <TableHead className="text-xs">Projeto</TableHead>
                                <TableHead className="text-xs">Nº Série / IMEI</TableHead>
                                <TableHead className="text-xs">Empresa</TableHead>
                                <TableHead className="text-xs text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ativosFiltrados.map((ativo) => {
                                const statusCfg = STATUS_CONFIG[ativo.status] || STATUS_CONFIG.disponivel;
                                const isSelected = selecionados.includes(ativo.id);

                                return (
                                    <TableRow
                                        key={ativo.id}
                                        className={isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : undefined}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelect(ativo.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold text-xs text-sky-700 dark:text-sky-400 font-mono">
                                            {ativo.codigo_patrimonial}
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                onClick={() => navigate(`/patrimonio/${ativo.codigo_patrimonial}`)}
                                                className="cursor-pointer hover:text-sky-600"
                                            >
                                                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                                                    {ativo.descricao}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {[ativo.marca, ativo.modelo].filter(Boolean).join(' • ') || '-'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                            {ativo.categoria}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}
                                            >
                                                {statusCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.responsavel_nome || (
                                                <span className="text-slate-400 italic">Disponível em Armazém</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                            {ativo.projeto || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-slate-500">
                                            {ativo.imei || ativo.numero_serie || ativo.matricula || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {ativo.empresa_proprietaria || 'KR Industrial'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/patrimonio/${ativo.codigo_patrimonial}`)}
                                                className="h-7 text-xs text-sky-600 hover:text-sky-700 px-2"
                                            >
                                                Ver
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* MODAIS GLOBAIS */}
            {scannerOpen && (
                <QrScannerModal
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onSelectAtivoParaAcao={handleAcaoScanner}
                />
            )}

            {novoAtivoOpen && (
                <AtivoFormDialog
                    open={novoAtivoOpen}
                    onOpenChange={setNovoAtivoOpen}
                    onSuccess={carregarAtivos}
                />
            )}

            {etiquetasOpen && (
                <EtiquetasModal
                    open={etiquetasOpen}
                    onOpenChange={setEtiquetasOpen}
                    ativos={ativosParaImprimir}
                />
            )}

            {/* MODAIS DE AÇÃO RÁPIDA */}
            {entregaOpen && ativoSelecionadoAcao && (
                <EntregaDialog
                    open={entregaOpen}
                    onOpenChange={setEntregaOpen}
                    ativo={ativoSelecionadoAcao}
                    onSuccess={carregarAtivos}
                />
            )}

            {devolucaoOpen && ativoSelecionadoAcao && (
                <DevolucaoDialog
                    open={devolucaoOpen}
                    onOpenChange={setDevolucaoOpen}
                    ativo={ativoSelecionadoAcao}
                    onSuccess={carregarAtivos}
                />
            )}

            {transferenciaOpen && ativoSelecionadoAcao && (
                <TransferenciaDialog
                    open={transferenciaOpen}
                    onOpenChange={setTransferenciaOpen}
                    ativo={ativoSelecionadoAcao}
                    onSuccess={carregarAtivos}
                />
            )}

            {manutencaoOpen && ativoSelecionadoAcao && (
                <ManutencaoDialog
                    open={manutencaoOpen}
                    onOpenChange={setManutencaoOpen}
                    ativo={ativoSelecionadoAcao}
                    onSuccess={carregarAtivos}
                />
            )}
        </div>
    );
}
