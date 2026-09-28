import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    obterAtivoPorCodigo, 
    listarHistorico, 
    listarDocumentos, 
    listarManutencoes,
    salvarDocumento,
    uploadArquivoPatrimonio,
    atualizarAtivo,
    concluirManutencao,
    excluirAtivo
} from '../api/patrimonioApi';
import type { 
    AtivoPatrimonio, 
    HistoricoPatrimonio, 
    DocumentoPatrimonio, 
    ManutencaoPatrimonio,
    FotoPatrimonio,
    TipoDocumentoPatrimonio
} from '../types/patrimonio';
import { STATUS_CONFIG } from '../types/patrimonio';
import { gerarTermoResponsabilidadePdf } from '../utils/termoResponsabilidadePdf';
import { EtiquetasModal } from '../components/EtiquetasModal';
import { EntregaDialog } from '../components/EntregaDialog';
import { DevolucaoDialog } from '../components/DevolucaoDialog';
import { TransferenciaDialog } from '../components/TransferenciaDialog';
import { ManutencaoDialog } from '../components/ManutencaoDialog';
import { AtivoFormDialog } from '../components/AtivoFormDialog';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
    ArrowLeft, 
    Tag, 
    UserCheck, 
    RotateCcw, 
    RefreshCw, 
    Wrench, 
    Edit, 
    Printer, 
    FileText, 
    History, 
    Calendar, 
    MapPin, 
    Briefcase, 
    ShieldCheck, 
    DollarSign, 
    Paperclip, 
    CheckCircle2, 
    AlertCircle, 
    Download, 
    Plus,
    Loader2,
    Clock,
    Camera,
    Upload,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export function PatrimonioDetailPage() {
    const { codigo } = useParams<{ codigo: string }>();
    const navigate = useNavigate();

    const [ativo, setAtivo] = useState<AtivoPatrimonio | null>(null);
    const [historico, setHistorico] = useState<HistoricoPatrimonio[]>([]);
    const [documentos, setDocumentos] = useState<DocumentoPatrimonio[]>([]);
    const [manutencoes, setManutencoes] = useState<ManutencaoPatrimonio[]>([]);
    const [loading, setLoading] = useState(true);

    // Modais operacionais
    const [modalEtiquetasOpen, setModalEtiquetasOpen] = useState(false);
    const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
    const [modalDevolucaoOpen, setModalDevolucaoOpen] = useState(false);
    const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
    const [modalManutencaoOpen, setModalManutencaoOpen] = useState(false);
    const [modalEditarOpen, setModalEditarOpen] = useState(false);

    // Modal para anexar documento
    const [modalDocOpen, setModalDocOpen] = useState(false);
    const [docTipo, setDocTipo] = useState<TipoDocumentoPatrimonio>('fatura');
    const [docTitulo, setDocTitulo] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);

    // Modal para concluir manutenção
    const [manutencaoSelecionada, setManutencaoSelecionada] = useState<ManutencaoPatrimonio | null>(null);
    const [modalConcluirManutencaoOpen, setModalConcluirManutencaoOpen] = useState(false);
    const [solucaoManutencao, setSolucaoManutencao] = useState('');
    const [custoFinalManutencao, setCustoFinalManutencao] = useState<number>(0);
    const [submittingConclusao, setSubmittingConclusao] = useState(false);

    // Modal de exclusão
    const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
    const [excluindo, setExcluindo] = useState(false);

    const handleExcluirPatrimonio = async () => {
        if (!ativo) return;
        setExcluindo(true);
        try {
            await excluirAtivo(ativo.id);
            toast.success(`¡Activo ${ativo.codigo_patrimonial} eliminado con éxito!`);
            navigate('/escritorio/patrimonio');
        } catch (err: any) {
            console.error('Erro ao excluir:', err);
            toast.error('Error al eliminar el activo.');
        } finally {
            setExcluindo(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [codigo]);

    const carregarDados = async () => {
        if (!codigo) return;
        setLoading(true);
        try {
            const dataAtivo = await obterAtivoPorCodigo(codigo);
            if (!dataAtivo) {
                toast.error('Activo no localizado en el sistema.');
                navigate('/escritorio/patrimonio');
                return;
            }
            setAtivo(dataAtivo);

            const [hist, docs, manuts] = await Promise.all([
                listarHistorico(dataAtivo.id),
                listarDocumentos(dataAtivo.id),
                listarManutencoes(dataAtivo.id),
            ]);

            setHistorico(hist);
            setDocumentos(docs);
            setManutencoes(manuts);
        } catch (err: any) {
            console.error('Erro ao carregar ativo:', err);
            toast.error('Error al cargar los detalles del activo.');
        } finally {
            setLoading(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFoto, setUploadingFoto] = useState(false);

    const handleUploadFotoRapido = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ativo) return;

        setUploadingFoto(true);
        try {
            const url = await uploadArquivoPatrimonio(file, 'fotos');
            const novaFoto: FotoPatrimonio = {
                id: Math.random().toString(36).substring(2, 9),
                tipo: 'frontal',
                url,
                legenda: 'Foto del Equipo',
                created_at: new Date().toISOString(),
            };

            const novasFotos = [...(ativo.fotos || []), novaFoto];
            const novaFotoPrincipal = ativo.foto_principal_url || url;

            await atualizarAtivo(
                ativo.id,
                {
                    fotos: novasFotos,
                    foto_principal_url: novaFotoPrincipal,
                },
                'Nueva fotografía añadida al activo.'
            );

            toast.success('¡Fotografía enviada y vinculada con éxito!');
            await carregarDados();
        } catch (err: any) {
            console.error('Erro no upload de foto:', err);
            toast.error('Error al enviar fotografía. Compruebe el archivo.');
        } finally {
            setUploadingFoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSalvarDocumento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ativo || !docFile) return;

        setUploadingDoc(true);
        try {
            const url = await uploadArquivoPatrimonio(docFile, 'documentos');
            await salvarDocumento({
                ativo_id: ativo.id,
                tipo_documento: docTipo,
                titulo: docTitulo || docFile.name,
                arquivo_url: url,
                arquivo_nome: docFile.name,
                tamanho_bytes: docFile.size,
                status_assinatura: docTipo === 'termo_responsabilidade' ? 'pendente' : 'nao_aplicavel',
            });

            toast.success('¡Documento adjuntado con éxito!');
            setModalDocOpen(false);
            setDocFile(null);
            setDocTitulo('');
            carregarDados();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al adjuntar documento.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleGerarTermoPdf = () => {
        if (!ativo) return;
        const pdf = gerarTermoResponsabilidadePdf({
            ativo,
            funcionarioNome: ativo.responsavel_nome || 'Empleado',
            funcionarioDoc: ativo.responsavel_documento || '',
            coordenadorNome: ativo.coordenador_nome || '',
            projeto: ativo.projeto || '',
            localEntrega: ativo.local_entrega || '',
            dataEntrega: ativo.data_entrega ? new Date(ativo.data_entrega).toLocaleDateString('es-ES') : '',
            acessorios: ativo.acessorios_entregues || '',
            empresaNome: ativo.empresa_proprietaria || 'MCS INDUSTRIAL',
        });
        pdf.save(`acta_responsabilidad_${ativo.codigo_patrimonial}.pdf`);
        toast.success('¡Acta de Responsabilidad generada en PDF!');
    };

    const handleConcluirManutencaoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manutencaoSelecionada || !ativo) return;

        setSubmittingConclusao(true);
        try {
            await concluirManutencao(manutencaoSelecionada.id, {
                solucao: solucaoManutencao,
                custoFinal: Number(custoFinalManutencao) || 0,
                dataRetorno: new Date().toISOString().slice(0, 10),
            });

            toast.success('¡Mantenimiento finalizado y equipo devuelto al almacén!');
            setModalConcluirManutencaoOpen(false);
            setManutencaoSelecionada(null);
            carregarDados();
        } catch (err: any) {
            toast.error('Error al finalizar el mantenimiento.');
        } finally {
            setSubmittingConclusao(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                <span className="text-sm font-medium text-slate-500">Cargando ficha del activo...</span>
            </div>
        );
    }

    if (!ativo) return null;

    const statusInfo = STATUS_CONFIG[ativo.status] || STATUS_CONFIG.disponivel;

    return (
        <div className="space-y-6 pb-12">
            {/* TOPO: VOLTAR E AÇÕES */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/escritorio/patrimonio')}
                        className="h-9 w-9 border-slate-300 dark:border-slate-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                {ativo.codigo_patrimonial}
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-xs px-2.5 py-0.5 font-semibold ${statusInfo.color} ${statusInfo.bg} ${statusInfo.border}`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusInfo.dot}`} />
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {ativo.descricao}
                        </h1>
                        <p className="text-xs text-slate-500">
                            {[ativo.marca, ativo.modelo].filter(Boolean).join(' • ') || ativo.categoria} •{' '}
                            {ativo.empresa_proprietaria || '—'}
                        </p>
                    </div>
                </div>

                {/* BOTÕES DE AÇÃO RÁPIDA NO TOPO */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalEtiquetasOpen(true)}
                        className="h-9 text-xs gap-1.5"
                    >
                        <Printer className="h-3.5 w-3.5 text-slate-600" /> Imprimir Etiqueta QR
                    </Button>

                    {ativo.status !== 'em_uso' && (
                        <Button
                            size="sm"
                            onClick={() => setModalEntregaOpen(true)}
                            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <UserCheck className="h-3.5 w-3.5" /> Entregar a Empleado
                        </Button>
                    )}

                    {ativo.status === 'em_uso' && (
                        <>
                            <Button
                                size="sm"
                                onClick={() => setModalDevolucaoOpen(true)}
                                className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Registrar Devolución
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setModalTransferenciaOpen(true)}
                                className="h-9 text-xs gap-1.5 text-blue-600 hover:text-blue-700"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Transferir Proyecto
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalManutencaoOpen(true)}
                        className="h-9 text-xs gap-1.5 text-rose-600 hover:text-rose-700"
                    >
                        <Wrench className="h-3.5 w-3.5" /> Mantenimiento
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalEditarOpen(true)}
                        className="h-9 text-xs gap-1.5"
                    >
                        <Edit className="h-3.5 w-3.5 text-slate-500" /> Editar
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalExcluirOpen(true)}
                        className="h-9 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                </div>
            </div>

            {/* CARD DE DESTAQUE: RESPONSÁVEL ATUAL / CUSTÓDIA */}
            <div className={`p-4 rounded-xl border ${
                ativo.status === 'em_uso'
                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                            ativo.status === 'em_uso' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                            <UserCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                {ativo.status === 'em_uso' ? 'Responsable Actual de la Custodia' : 'Ubicación del Equipo'}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {ativo.status === 'em_uso' ? ativo.responsavel_nome : ativo.localizacao || 'Almacén Central'}
                            </h3>
                            {ativo.status === 'em_uso' && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Proyecto: <strong>{ativo.projeto || 'General'}</strong> • Coordinador: {ativo.coordenador_nome || 'No informado'}
                                    {ativo.data_entrega && ` • Desde ${new Date(ativo.data_entrega).toLocaleDateString('es-ES')}`}
                                </p>
                            )}
                        </div>
                    </div>

                    {ativo.status === 'em_uso' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGerarTermoPdf}
                            className="h-8 text-xs gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 shrink-0"
                        >
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            Descargar Acta de Responsabilidad
                        </Button>
                    )}
                </div>
            </div>

            {/* ABAS PRINCIPAIS */}
            <Tabs defaultValue="ficha" className="w-full">
                <TabsList className="bg-slate-200 dark:bg-slate-800 p-1">
                    <TabsTrigger value="ficha" className="text-xs gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Ficha Técnica y Fotos
                    </TabsTrigger>
                    <TabsTrigger value="historico" className="text-xs gap-1.5">
                        <History className="h-3.5 w-3.5 text-amber-500" /> Historial y Cronología ({historico.length})
                    </TabsTrigger>
                    <TabsTrigger value="documentos" className="text-xs gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-500" /> Documentos ({documentos.length})
                    </TabsTrigger>
                    <TabsTrigger value="manutencoes" className="text-xs gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-rose-500" /> Mantenimientos ({manutencoes.length})
                    </TabsTrigger>
                </TabsList>

                {/* ABA 1: FICHA GERAL & FOTOS */}
                <TabsContent value="ficha" className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Coluna 1 & 2: Dados */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Identificação */}
                            <Card className="border-slate-200 dark:border-slate-800">
                                <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-sky-600" /> Identificación del Equipo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Código de Activo</span>
                                        <span className="font-bold text-sky-700 dark:text-sky-400 text-sm">
                                            {ativo.codigo_patrimonial}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Categoría</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.categoria}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Subcategoría</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.subcategoria || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Marca / Fabricante</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.marca || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Modelo</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.modelo || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Color</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.cor || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Número de Serie</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                                            {ativo.numero_serie || 'No informado'}
                                        </span>
                                    </div>
                                    {ativo.imei && (
                                        <div>
                                            <span className="text-slate-400 block mb-0.5">IMEI (Móvil)</span>
                                            <span className="font-medium text-blue-600 dark:text-blue-400 font-mono">
                                                {ativo.imei}
                                            </span>
                                        </div>
                                    )}
                                    {ativo.matricula && (
                                        <div>
                                            <span className="text-slate-400 block mb-0.5">Matrícula (Vehículo)</span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                                                {ativo.matricula}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Empresa Propietaria</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.empresa_proprietaria || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Centro de Costes</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.centro_custo || 'General'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Ubicación Física</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.localizacao || 'Almacén Central'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Aquisição & Garantia */}
                            <Card className="border-slate-200 dark:border-slate-800">
                                <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-600" /> Adquisición y Garantía
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Fecha de Compra</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.data_compra ? new Date(ativo.data_compra).toLocaleDateString('es-ES') : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Proveedor</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.fornecedor || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">N.º Factura</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                                            {ativo.numero_fatura || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Valor de Adquisición</span>
                                        <span className="font-bold text-emerald-600 text-sm">
                                            € {(ativo.valor_aquisicao || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Garantía</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.garantia_meses ? `${ativo.garantia_meses} meses` : 'Sin garantía'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Fin de Garantía</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {ativo.data_fim_garantia ? new Date(ativo.data_fim_garantia).toLocaleDateString('es-ES') : '-'}
                                        </span>
                                    </div>
                                    {ativo.observacoes_aquisicao && (
                                        <div className="col-span-2 sm:col-span-4 mt-2 p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {ativo.observacoes_aquisicao}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Coluna 3: Fotos & Identificação Visual */}
                        <div className="space-y-4">
                            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-sky-600" /> Foto Principal
                                    </CardTitle>
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleUploadFotoRapido}
                                            disabled={uploadingFoto}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingFoto}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-7 text-xs gap-1.5 text-sky-600 hover:text-sky-700 font-medium"
                                        >
                                            {uploadingFoto ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Upload className="h-3 w-3" />
                                            )}
                                            {ativo.foto_principal_url ? 'Cambiar Foto' : 'Añadir Foto'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {ativo.foto_principal_url ? (
                                        <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-950 flex items-center justify-center">
                                            <img
                                                src={ativo.foto_principal_url}
                                                alt={ativo.descricao}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-xs gap-1.5 shadow"
                                                >
                                                    <Camera className="h-3.5 w-3.5" /> Cambiar Foto
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-lg border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-500 p-4 text-center group"
                                            title="Haga clic para enviar fotografía de este activo"
                                        >
                                            {uploadingFoto ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                                                    <span className="text-xs font-medium text-sky-600">Subiendo foto...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                        <Camera className="h-6 w-6 text-sky-600" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                                                        Haga clic aquí para añadir foto
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
                                                        Envíe foto frontal o detalles del equipo
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Miniaturas das outras fotos */}
                                    {ativo.fotos && ativo.fotos.length > 0 && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                                    Todas las Fotos ({ativo.fotos.length})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-0.5"
                                                >
                                                    <Plus className="h-3 w-3" /> Más fotos
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {ativo.fotos.map((f) => (
                                                    <a
                                                        key={f.id}
                                                        href={f.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block aspect-square rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                                                    >
                                                        <img src={f.url} alt={f.legenda || 'Foto'} className="w-full h-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ABA 2: TIMELINE / HISTÓRICO COMPLETO */}
                <TabsContent value="historico" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <History className="h-4 w-4 text-amber-500" /> Línea de Tiempo y Trazabilidad del Activo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {historico.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center">
                                    Ningún evento registrado en el historial de este bien todavía.
                                </p>
                            ) : (
                                <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                    {historico.map((item) => (
                                        <div key={item.id} className="relative group">
                                            {/* Ponto / Ícone da Timeline */}
                                            <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 bg-sky-600 flex items-center justify-center text-white shadow-sm">
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {item.titulo}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(item.created_at).toLocaleDateString('es-ES')} a las{' '}
                                                        {new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {item.descricao && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                                        {item.descricao}
                                                    </p>
                                                )}

                                                <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                                    {item.worker_nome && (
                                                        <span>👤 {item.worker_nome}</span>
                                                    )}
                                                    {item.projeto && (
                                                        <span>🏗️ {item.projeto}</span>
                                                    )}
                                                    {item.localizacao && (
                                                        <span>📍 {item.localizacao}</span>
                                                    )}
                                                    {item.registrado_por_nome && (
                                                        <span>✍️ Registrado por: {item.registrado_por_nome}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 3: DOCUMENTOS E ANEXOS */}
                <TabsContent value="documentos" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" /> Documentos, Contratos y Actas Adjuntos
                            </CardTitle>
                            <Button
                                size="sm"
                                onClick={() => setModalDocOpen(true)}
                                className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                <Plus className="h-3.5 w-3.5" /> Adjuntar Documento
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {documentos.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">Ningún documento adjunto a este activo.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {documentos.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between"
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                                        {doc.tipo_documento.replace('_', ' ')}
                                                    </span>
                                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                        {doc.titulo}
                                                    </h4>
                                                    <span className="text-[11px] text-slate-400">
                                                        {new Date(doc.created_at).toLocaleDateString('es-ES')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[9px] ${
                                                        doc.status_assinatura === 'assinado'
                                                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                                            : doc.status_assinatura === 'pendente'
                                                            ? 'text-amber-600 bg-amber-50 border-amber-200'
                                                            : 'text-slate-500'
                                                    }`}
                                                >
                                                    {doc.status_assinatura === 'assinado' ? 'Firmado' : doc.status_assinatura === 'pendente' ? 'Pendiente Firma' : 'Archivo'}
                                                </Badge>

                                                {doc.arquivo_url && doc.arquivo_url !== '#gerado_automaticamente' && (
                                                    <a
                                                        href={doc.arquivo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                                                    >
                                                        <Download className="h-3 w-3" /> Descargar
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 4: MANUTENÇÕES */}
                <TabsContent value="manutencoes" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-rose-500" /> Registro de Mantenimientos y Órdenes de Servicio
                            </CardTitle>
                            <Button
                                size="sm"
                                onClick={() => setModalManutencaoOpen(true)}
                                className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                            >
                                <Plus className="h-3.5 w-3.5" /> Nuevo Mantenimiento
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {manutencoes.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center">
                                    Ningún mantenimiento realizado en este equipo hasta el momento.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {manutencoes.map((m) => (
                                        <div
                                            key={m.id}
                                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] ${
                                                            m.status === 'concluida'
                                                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                                : 'text-amber-700 bg-amber-50 border-amber-200'
                                                        }`}
                                                    >
                                                        {m.status === 'concluida' ? 'Finalizado' : 'En Curso'}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {m.motivo}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    Taller: <strong>{m.fornecedor_oficina || 'No informado'}</strong> • Enviado el:{' '}
                                                    {new Date(m.data_envio).toLocaleDateString('es-ES')}
                                                    {m.data_retorno && ` • Retorno: ${new Date(m.data_retorno).toLocaleDateString('es-ES')}`}
                                                </p>
                                                {m.solucao_aplicada && (
                                                    <p className="text-xs text-slate-500 italic">
                                                        Solución: {m.solucao_aplicada}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    € {(m.custo || 0).toFixed(2)}
                                                </span>

                                                {m.status !== 'concluida' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setManutencaoSelecionada(m);
                                                            setCustoFinalManutencao(m.custo || 0);
                                                            setModalConcluirManutencaoOpen(true);
                                                        }}
                                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    >
                                                        Finalizar Reparación
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAIS OPERACIONAIS */}
            {modalEtiquetasOpen && (
                <EtiquetasModal
                    open={modalEtiquetasOpen}
                    onOpenChange={setModalEtiquetasOpen}
                    ativos={[ativo]}
                />
            )}

            {modalEntregaOpen && (
                <EntregaDialog
                    open={modalEntregaOpen}
                    onOpenChange={setModalEntregaOpen}
                    ativo={ativo}
                    onSuccess={carregarDados}
                />
            )}

            {modalDevolucaoOpen && (
                <DevolucaoDialog
                    open={modalDevolucaoOpen}
                    onOpenChange={setModalDevolucaoOpen}
                    ativo={ativo}
                    onSuccess={carregarDados}
                />
            )}

            {modalTransferenciaOpen && (
                <TransferenciaDialog
                    open={modalTransferenciaOpen}
                    onOpenChange={setModalTransferenciaOpen}
                    ativo={ativo}
                    onSuccess={carregarDados}
                />
            )}

            {modalManutencaoOpen && (
                <ManutencaoDialog
                    open={modalManutencaoOpen}
                    onOpenChange={setModalManutencaoOpen}
                    ativo={ativo}
                    onSuccess={carregarDados}
                />
            )}

            {modalEditarOpen && (
                <AtivoFormDialog
                    open={modalEditarOpen}
                    onOpenChange={setModalEditarOpen}
                    ativoParaEditar={ativo}
                    onSuccess={carregarDados}
                />
            )}

            {/* MODAL PARA ANEXAR DOCUMENTO */}
            <Dialog open={modalDocOpen} onOpenChange={setModalDocOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Adjuntar Documento al Activo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSalvarDocumento} className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Tipo de Documento</Label>
                            <Select value={docTipo} onValueChange={(val: any) => setDocTipo(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fatura">Factura / Justificante de Compra</SelectItem>
                                    <SelectItem value="garantia">Documento de Garantía</SelectItem>
                                    <SelectItem value="manual">Manual de Usuario</SelectItem>
                                    <SelectItem value="certificado">Certificado de Conformidad / Calibración</SelectItem>
                                    <SelectItem value="termo_responsabilidade">Acta de Responsabilidad Firmada</SelectItem>
                                    <SelectItem value="termo_devolucao">Acta de Devolución</SelectItem>
                                    <SelectItem value="seguro">Póliza de Seguro</SelectItem>
                                    <SelectItem value="outro">Otro Archivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Título / Identificación del Documento</Label>
                            <Input
                                value={docTitulo}
                                onChange={(e) => setDocTitulo(e.target.value)}
                                placeholder="Ej: Factura de Compra MediaMarkt"
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Archivo (PDF o Imagen)</Label>
                            <Input
                                type="file"
                                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                className="text-xs h-9"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setModalDocOpen(false)} className="text-xs">
                                Cancelar
                            </Button>
                            <Button type="submit" size="sm" disabled={uploadingDoc} className="bg-sky-600 hover:bg-sky-700 text-white text-xs">
                                {uploadingDoc ? 'Subiendo...' : 'Adjuntar Archivo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL PARA CONCLUIR MANUTENÇÃO */}
            <Dialog open={modalConcluirManutencaoOpen} onOpenChange={setModalConcluirManutencaoOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Finalizar Mantenimiento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleConcluirManutencaoSubmit} className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Solución Aplicada por el Taller / Reparador</Label>
                            <Input
                                value={solucaoManutencao}
                                onChange={(e) => setSolucaoManutencao(e.target.value)}
                                placeholder="Ej: Cambio de pantalla, sustitución de rodamientos..."
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Coste Final (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={custoFinalManutencao || ''}
                                onChange={(e) => setCustoFinalManutencao(parseFloat(e.target.value) || 0)}
                                className="h-9 text-xs font-medium"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setModalConcluirManutencaoOpen(false)} className="text-xs">
                                Cancelar
                            </Button>
                            <Button type="submit" size="sm" disabled={submittingConclusao} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                                {submittingConclusao ? 'Finalizando...' : 'Finalizar y Poner Disponible'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            <Dialog open={modalExcluirOpen} onOpenChange={setModalExcluirOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600 text-base font-bold">
                            <AlertTriangle className="h-5 w-5" /> Eliminar Activo
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            ¿Está seguro de que desea eliminar el activo <strong>{ativo.codigo_patrimonial}</strong>? Esta acción es definitiva y eliminará todo el historial y documentos asociados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Equipo:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{ativo.descricao}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Estado Actual:</span>
                            <span>{STATUS_CONFIG[ativo.status]?.label || ativo.status}</span>
                        </div>
                        {ativo.responsavel_nome && (
                            <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                                ⚠️ <strong>Atención:</strong> Activo en custodia de <strong>{ativo.responsavel_nome}</strong>.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={excluindo}
                            onClick={() => setModalExcluirOpen(false)}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={excluindo}
                            onClick={handleExcluirPatrimonio}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
                        >
                            {excluindo ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-3.5 w-3.5" /> Confirmar Eliminación
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
