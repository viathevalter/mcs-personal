import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { criarAtivo, atualizarAtivo, gerarProximoCodigo, uploadArquivoPatrimonio } from '../api/patrimonioApi';
import type { AtivoPatrimonio, PatrimonioStatus, FotoPatrimonio } from '../types/patrimonio';
import { CATEGORIAS_PATRIMONIO, STATUS_CONFIG } from '../types/patrimonio';
import { Plus, Sparkles, Upload, Trash2, Camera, Image, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AtivoFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativoParaEditar?: AtivoPatrimonio | null;
    onSuccess: () => void;
}

export function AtivoFormDialog({ open, onOpenChange, ativoParaEditar, onSuccess }: AtivoFormDialogProps) {
    const isEdit = Boolean(ativoParaEditar);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingFoto, setUploadingFoto] = useState(false);

    // Identificação
    const [codigoPatrimonial, setCodigoPatrimonial] = useState('');
    const [categoria, setCategoria] = useState<string>('Informática (Notebooks, Monitores, PCs)');
    const [subcategoria, setSubcategoria] = useState('');
    const [descricao, setDescricao] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [numeroSerie, setNumeroSerie] = useState('');
    const [imei, setImei] = useState('');
    const [matricula, setMatricula] = useState('');
    const [cor, setCor] = useState('');
    const [empresaProprietaria, setEmpresaProprietaria] = useState('KR Industrial');
    const [centroCusto, setCentroCusto] = useState('Geral');
    const [localizacao, setLocalizacao] = useState('Armazém Central');
    const [status, setStatus] = useState<PatrimonioStatus>('disponivel');

    // Aquisição
    const [dataCompra, setDataCompra] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [numeroFatura, setNumeroFatura] = useState('');
    const [valorAquisicao, setValorAquisicao] = useState<number>(0);
    const [garantiaMeses, setGarantiaMeses] = useState<number>(12);
    const [dataFimGarantia, setDataFimGarantia] = useState('');
    const [observacoesAquisicao, setObservacoesAquisicao] = useState('');

    // Fotos
    const [fotoPrincipalUrl, setFotoPrincipalUrl] = useState('');
    const [fotos, setFotos] = useState<FotoPatrimonio[]>([]);

    useEffect(() => {
        if (!open) return;

        if (ativoParaEditar) {
            setCodigoPatrimonial(ativoParaEditar.codigo_patrimonial);
            setCategoria(ativoParaEditar.categoria);
            setSubcategoria(ativoParaEditar.subcategoria || '');
            setDescricao(ativoParaEditar.descricao);
            setMarca(ativoParaEditar.marca || '');
            setModelo(ativoParaEditar.modelo || '');
            setNumeroSerie(ativoParaEditar.numero_serie || '');
            setImei(ativoParaEditar.imei || '');
            setMatricula(ativoParaEditar.matricula || '');
            setCor(ativoParaEditar.cor || '');
            setEmpresaProprietaria(ativoParaEditar.empresa_proprietaria || 'KR Industrial');
            setCentroCusto(ativoParaEditar.centro_custo || 'Geral');
            setLocalizacao(ativoParaEditar.localizacao || 'Armazém Central');
            setStatus(ativoParaEditar.status);

            setDataCompra(ativoParaEditar.data_compra || '');
            setFornecedor(ativoParaEditar.fornecedor || '');
            setNumeroFatura(ativoParaEditar.numero_fatura || '');
            setValorAquisicao(ativoParaEditar.valor_aquisicao || 0);
            setGarantiaMeses(ativoParaEditar.garantia_meses || 0);
            setDataFimGarantia(ativoParaEditar.data_fim_garantia || '');
            setObservacoesAquisicao(ativoParaEditar.observacoes_aquisicao || '');

            setFotoPrincipalUrl(ativoParaEditar.foto_principal_url || '');
            setFotos(ativoParaEditar.fotos || []);
        } else {
            // Novo ativo - Reset
            limparFormulario();
            handleGerarCodigo('TI');
        }
    }, [open, ativoParaEditar]);

    const limparFormulario = () => {
        setCodigoPatrimonial('');
        setCategoria('Informática (Notebooks, Monitores, PCs)');
        setSubcategoria('');
        setDescricao('');
        setMarca('');
        setModelo('');
        setNumeroSerie('');
        setImei('');
        setMatricula('');
        setCor('');
        setEmpresaProprietaria('KR Industrial');
        setCentroCusto('Geral');
        setLocalizacao('Armazém Central');
        setStatus('disponivel');
        setDataCompra(new Date().toISOString().slice(0, 10));
        setFornecedor('');
        setNumeroFatura('');
        setValorAquisicao(0);
        setGarantiaMeses(12);
        setDataFimGarantia('');
        setObservacoesAquisicao('');
        setFotoPrincipalUrl('');
        setFotos([]);
    };

    const handleGerarCodigo = async (catNome?: string) => {
        const cat = catNome || categoria;
        let prefixo = 'PAT';
        if (cat.toLowerCase().includes('celular') || cat.toLowerCase().includes('telefonia')) prefixo = 'MOB';
        else if (cat.toLowerCase().includes('informática') || cat.toLowerCase().includes('notebook')) prefixo = 'TI';
        else if (cat.toLowerCase().includes('ferramenta')) prefixo = 'FER';
        else if (cat.toLowerCase().includes('veículo') || cat.toLowerCase().includes('veiculo')) prefixo = 'VEI';
        else if (cat.toLowerCase().includes('máquina') || cat.toLowerCase().includes('maquina')) prefixo = 'MAQ';

        try {
            const novoCod = await gerarProximoCodigo(prefixo);
            setCodigoPatrimonial(novoCod);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCategoriaChange = (novaCat: string) => {
        setCategoria(novaCat);
        if (!isEdit && !codigoPatrimonial) {
            handleGerarCodigo(novaCat);
        }
    };

    const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>, tipoFoto: FotoPatrimonio['tipo'] = 'frontal') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFoto(true);
        try {
            const url = await uploadArquivoPatrimonio(file, 'fotos');
            const novaFoto: FotoPatrimonio = {
                id: Math.random().toString(36).substring(2, 9),
                tipo: tipoFoto,
                url,
                legenda: `Foto ${tipoFoto}`,
                created_at: new Date().toISOString(),
            };

            setFotos(prev => [...prev, novaFoto]);
            if (!fotoPrincipalUrl) {
                setFotoPrincipalUrl(url);
            }
            toast.success('Foto enviada com sucesso!');
        } catch (err: any) {
            console.error('Erro no upload da foto:', err);
            toast.error('Falha ao enviar foto. Verifique a conexão.');
        } finally {
            setUploadingFoto(false);
        }
    };

    const handleRemoverFoto = (id: string, url: string) => {
        setFotos(prev => prev.filter(f => f.id !== id));
        if (fotoPrincipalUrl === url) {
            const restante = fotos.filter(f => f.id !== id);
            setFotoPrincipalUrl(restante[0]?.url || '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigoPatrimonial.trim()) {
            toast.error('Informe o código patrimonial.');
            return;
        }
        if (!descricao.trim()) {
            toast.error('Informe a descrição do equipamento.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                codigo_patrimonial: codigoPatrimonial.trim().toUpperCase(),
                categoria,
                subcategoria: subcategoria || null,
                descricao,
                marca: marca || null,
                modelo: modelo || null,
                numero_serie: numeroSerie || null,
                imei: imei || null,
                matricula: matricula || null,
                cor: cor || null,
                empresa_proprietaria: empresaProprietaria || 'KR Industrial',
                centro_custo: centroCusto || null,
                localizacao: localizacao || 'Armazém Central',
                status,
                data_compra: dataCompra || null,
                fornecedor: fornecedor || null,
                numero_fatura: numeroFatura || null,
                valor_aquisicao: Number(valorAquisicao) || 0,
                moeda: 'EUR',
                garantia_meses: Number(garantiaMeses) || null,
                data_fim_garantia: dataFimGarantia || null,
                observacoes_aquisicao: observacoesAquisicao || null,
                foto_principal_url: fotoPrincipalUrl || null,
                fotos,
            };

            if (isEdit && ativoParaEditar) {
                await atualizarAtivo(ativoParaEditar.id, payload, 'Dados cadastrais atualizados.');
                toast.success(`Patrimônio ${codigoPatrimonial} atualizado com sucesso!`);
            } else {
                await criarAtivo(payload as any);
                toast.success(`Patrimônio ${codigoPatrimonial} cadastrado com sucesso!`);
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro ao salvar ativo:', err);
            toast.error(err?.message || 'Falha ao salvar dados do patrimônio.');
        } finally {
            setSubmitting(false);
        }
    };

    const ehCelular = categoria.toLowerCase().includes('celular') || categoria.toLowerCase().includes('telefonia');
    const ehVeiculo = categoria.toLowerCase().includes('veículo') || categoria.toLowerCase().includes('veiculo');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0">
                <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <ShieldCheck className="h-5 w-5 text-sky-600" />
                        {isEdit ? `Editar Patrimônio: ${ativoParaEditar?.codigo_patrimonial}` : 'Cadastrar Novo Patrimônio / Ativo'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Preencha a identificação, dados de aquisição e fotos do bem.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="identificacao" className="w-full">
                        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <TabsList className="bg-slate-200 dark:bg-slate-800 h-8 p-0.5">
                                <TabsTrigger value="identificacao" className="text-xs px-3 h-7">
                                    Identificação
                                </TabsTrigger>
                                <TabsTrigger value="aquisicao" className="text-xs px-3 h-7">
                                    Aquisição & Garantia
                                </TabsTrigger>
                                <TabsTrigger value="fotos" className="text-xs px-3 h-7">
                                    Identificação Visual ({fotos.length})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* ABA 1: IDENTIFICAÇÃO */}
                        <TabsContent value="identificacao" className="p-5 space-y-4 m-0">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">
                                        Código Patrimonial <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={codigoPatrimonial}
                                            onChange={(e) => setCodigoPatrimonial(e.target.value.toUpperCase())}
                                            placeholder="Ex: MOB-000245"
                                            className="h-9 text-xs uppercase font-bold text-sky-700 dark:text-sky-400"
                                            required
                                        />
                                        {!isEdit && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGerarCodigo()}
                                                title="Gerar próximo código sequencial"
                                                className="h-9 px-2 text-xs shrink-0"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">
                                        Categoria <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select value={categoria} onValueChange={handleCategoriaChange}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIAS_PATRIMONIO.map((c) => (
                                                <SelectItem key={c.id} value={c.nome}>
                                                    {c.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs font-medium">
                                        Descrição / Nome do Equipamento <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        placeholder="Ex: Samsung Galaxy A55, Furadeira de Impacto Bosch..."
                                        className="h-9 text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Subcategoria</Label>
                                    <Input
                                        value={subcategoria}
                                        onChange={(e) => setSubcategoria(e.target.value)}
                                        placeholder="Ex: Smartphone, Perfuratriz"
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Marca</Label>
                                    <Input
                                        value={marca}
                                        onChange={(e) => setMarca(e.target.value)}
                                        placeholder="Ex: Apple, Samsung, Bosch, Dell..."
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Modelo</Label>
                                    <Input
                                        value={modelo}
                                        onChange={(e) => setModelo(e.target.value)}
                                        placeholder="Ex: Latitude 5420, GSB 18V-50..."
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Cor</Label>
                                    <Input
                                        value={cor}
                                        onChange={(e) => setCor(e.target.value)}
                                        placeholder="Ex: Preto, Azul, Prata..."
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Número de Série</Label>
                                    <Input
                                        value={numeroSerie}
                                        onChange={(e) => setNumeroSerie(e.target.value)}
                                        placeholder="S/N do fabricante"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {ehCelular ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                            IMEI (Celular)
                                        </Label>
                                        <Input
                                            value={imei}
                                            onChange={(e) => setImei(e.target.value)}
                                            placeholder="15 dígitos do IMEI"
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                ) : ehVeiculo ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            Matrícula / Placa (Veículo)
                                        </Label>
                                        <Input
                                            value={matricula}
                                            onChange={(e) => setMatricula(e.target.value)}
                                            placeholder="Ex: 1234-BBB"
                                            className="h-9 text-xs uppercase"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Identificador Adicional</Label>
                                        <Input
                                            value={imei || matricula}
                                            onChange={(e) => setImei(e.target.value)}
                                            placeholder="Código interno ou tag"
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Status Atual</Label>
                                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    {config.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Empresa Proprietária</Label>
                                    <Select value={empresaProprietaria} onValueChange={setEmpresaProprietaria}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="KR Industrial">KR Industrial</SelectItem>
                                            <SelectItem value="MCS Industrial">MCS Industrial</SelectItem>
                                            <SelectItem value="Kotrik Spain">Kotrik Spain</SelectItem>
                                            <SelectItem value="Holdings">Holdings</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Centro de Custo</Label>
                                    <Input
                                        value={centroCusto}
                                        onChange={(e) => setCentroCusto(e.target.value)}
                                        placeholder="Ex: Oficina, ADM, Operações..."
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Localização Inicial</Label>
                                    <Input
                                        value={localizacao}
                                        onChange={(e) => setLocalizacao(e.target.value)}
                                        placeholder="Ex: Armazém Barcelona, Oficina Central..."
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ABA 2: AQUISIÇÃO & GARANTIA */}
                        <TabsContent value="aquisicao" className="p-5 space-y-4 m-0">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Data de Compra</Label>
                                    <Input
                                        type="date"
                                        value={dataCompra}
                                        onChange={(e) => setDataCompra(e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Fornecedor / Loja</Label>
                                    <Input
                                        value={fornecedor}
                                        onChange={(e) => setFornecedor(e.target.value)}
                                        placeholder="Ex: MediaMarkt, Leroy Merlin, Dell..."
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Nº da Fatura / Ticket</Label>
                                    <Input
                                        value={numeroFatura}
                                        onChange={(e) => setNumeroFatura(e.target.value)}
                                        placeholder="Ex: FAC-2026-9812"
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Valor de Aquisição (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valorAquisicao || ''}
                                        onChange={(e) => setValorAquisicao(parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className="h-9 text-xs font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Garantia (Meses)</Label>
                                    <Input
                                        type="number"
                                        value={garantiaMeses || ''}
                                        onChange={(e) => setGarantiaMeses(parseInt(e.target.value, 10) || 0)}
                                        placeholder="Ex: 24"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Data Fim da Garantia</Label>
                                    <Input
                                        type="date"
                                        value={dataFimGarantia}
                                        onChange={(e) => setDataFimGarantia(e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Observações da Compra / Garantia</Label>
                                <Textarea
                                    value={observacoesAquisicao}
                                    onChange={(e) => setObservacoesAquisicao(e.target.value)}
                                    placeholder="Detalhes sobre a nota fiscal, garantia estendida, seguro..."
                                    className="text-xs min-h-[90px]"
                                />
                            </div>
                        </TabsContent>

                        {/* ABA 3: IDENTIFICAÇÃO VISUAL & FOTOS */}
                        <TabsContent value="fotos" className="p-5 space-y-4 m-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                                        Galeria de Imagens do Patrimônio
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Adicione foto frontal, traseira, número de série e estado geral do bem.
                                    </p>
                                </div>

                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleUploadFoto(e, 'frontal')}
                                        className="hidden"
                                        disabled={uploadingFoto}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploadingFoto}
                                        className="text-xs gap-1.5 pointer-events-none"
                                    >
                                        {uploadingFoto ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Upload className="h-3.5 w-3.5" />
                                        )}
                                        Adicionar Imagem
                                    </Button>
                                </label>
                            </div>

                            {/* Foto Principal URL manual opcional */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">URL da Imagem Principal (ou selecione abaixo)</Label>
                                <Input
                                    value={fotoPrincipalUrl}
                                    onChange={(e) => setFotoPrincipalUrl(e.target.value)}
                                    placeholder="https://... ou faça upload acima"
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Grid de Fotos */}
                            {fotos.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        Nenhuma fotografia anexada ainda
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Fotos ajudam na identificação rápida na hora da entrega e devolução.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {fotos.map((f) => (
                                        <div
                                            key={f.id}
                                            className={`relative group rounded-lg overflow-hidden border ${
                                                fotoPrincipalUrl === f.url
                                                    ? 'border-sky-500 ring-2 ring-sky-400'
                                                    : 'border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <img
                                                src={f.url}
                                                alt={f.legenda || 'Foto patrimônio'}
                                                className="h-28 w-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFotoPrincipalUrl(f.url)}
                                                    className="text-[10px] text-white bg-sky-600/90 hover:bg-sky-600 px-1.5 py-0.5 rounded self-start"
                                                >
                                                    {fotoPrincipalUrl === f.url ? 'Principal ⭐' : 'Tornar Principal'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoverFoto(f.id, f.url)}
                                                    className="text-white hover:text-rose-400 self-end p-1"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 px-2 py-0.5 text-[10px] text-white truncate">
                                                {f.tipo.toUpperCase()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 gap-2">
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
                            className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="h-3.5 w-3.5" /> {isEdit ? 'Salvar Alterações' : 'Cadastrar Patrimônio'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
