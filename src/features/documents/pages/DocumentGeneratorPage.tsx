import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { documentGeneratorService, type GeneratedDocument } from '../services/documentGeneratorService';
import { documentTemplateService } from '../services/documentTemplateService';
import { pdfExportService } from '../services/pdfExportService';
import { DocumentVariablesCheatSheetModal } from '../components/DocumentVariablesCheatSheetModal';
import { DocumentTemplateManagerModal } from '../components/DocumentTemplateManagerModal';
import { GenerateDocumentWizardModal } from '../components/GenerateDocumentWizardModal';
import { CompanySignatureModal } from '../components/CompanySignatureModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Sparkles, Upload, FileText, Search, RefreshCw, Copy, ExternalLink,
    CheckCircle2, Clock, Trash2, Loader2, User, Building, Download, FileCheck, PenTool, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export const DocumentGeneratorPage: React.FC = () => {
    const [docs, setDocs] = useState<GeneratedDocument[]>([]);
    const [templateCount, setTemplateCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [targetFilter, setTargetFilter] = useState<'all' | 'worker' | 'client'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'pending'>('all');

    // Modals state
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
    const [companySignDoc, setCompanySignDoc] = useState<GeneratedDocument | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [docsList, templatesList] = await Promise.all([
                documentGeneratorService.listGeneratedDocuments(),
                documentTemplateService.listTemplates()
            ]);
            setDocs(docsList);
            setTemplateCount(templatesList.length);
        } catch (err: any) {
            console.error('Error loading documents generator data:', err);
            toast.error('Erro ao carregar documentos: ' + (err?.message || err));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (doc: GeneratedDocument) => {
        setDownloadingId(doc.id);
        try {
            toast.info('Gerando PDF do documento...');
            await pdfExportService.downloadDocumentAsPdf(doc);
            toast.success('Download do PDF concluído!');
        } catch (err: any) {
            console.error('Error downloading PDF:', err);
            toast.error('Erro ao gerar PDF: ' + (err?.message || err));
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if (!confirm('Deseja realmente excluir este registro de documento?')) return;
        try {
            await documentGeneratorService.deleteGeneratedDocument(id);
            toast.success('Registro excluído.');
            await loadData();
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + (err?.message || err));
        }
    };

    // KPIs
    const kpis = useMemo(() => {
        const total = docs.length;
        const signed = docs.filter(d => d.signature_status === 'signed').length;
        const pending = docs.filter(d => d.signature_status !== 'signed').length;
        return { total, signed, pending, templates: templateCount };
    }, [docs, templateCount]);

    // Filtered Docs
    const filteredDocs = useMemo(() => {
        return docs.filter(d => {
            const titleMatches = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.signed_by_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.company_signed_by_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const targetMatches = targetFilter === 'all' || d.target_type === targetFilter;
            const statusMatches = statusFilter === 'all'
                ? true
                : statusFilter === 'signed'
                    ? d.signature_status === 'signed'
                    : d.signature_status !== 'signed';

            return titleMatches && targetMatches && statusMatches;
        });
    }, [docs, searchQuery, targetFilter, statusFilter]);

    return (
        <Layout>
            <div className="w-full px-4 md:px-8 py-6 space-y-6 max-w-[1680px] mx-auto font-sans">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl text-white">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                Automação & Assinatura Digital Bilateral
                            </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                            <Sparkles className="h-6 w-6 text-emerald-400" />
                            Gerador de Documentos & Assinaturas Digitais
                        </h1>
                        <p className="text-xs md:text-sm text-slate-300 max-w-3xl">
                            Criação instantânea de contratos a partir de modelos Word (.docx), assinatura eletrônica bilateral (Empresa + Cliente/Trabalhador) e certificado de auditoria OCT.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            onClick={() => setIsWizardOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Sparkles className="h-4 w-4" />
                            Gerar Documento (.docx)
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsTemplateManagerOpen(true)}
                            className="bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                        >
                            <Upload className="h-4 w-4 text-blue-400" />
                            Modelos Word ({templateCount})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsCheatSheetOpen(true)}
                            className="bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                        >
                            <FileText className="h-4 w-4 text-amber-400" />
                            Gabarito de Variáveis
                        </Button>
                        <Button
                            variant="outline"
                            onClick={loadData}
                            className="bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 rounded-xl"
                            title="Atualizar dados"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Total de Documentos
                                </p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {kpis.total}
                                </h3>
                                <p className="text-[11px] text-slate-400">Criados no sistema</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                                <FileText className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Assinados Digitalmente
                                </p>
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                    {kpis.signed}
                                </h3>
                                <p className="text-[11px] text-emerald-600/80">Com termo de auditoria</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                <FileCheck className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Aguardando Assinatura
                                </p>
                                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                    {kpis.pending}
                                </h3>
                                <p className="text-[11px] text-amber-600/80">Links públicos ativos</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                <Clock className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Modelos Word (.docx)
                                </p>
                                <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                    {kpis.templates}
                                </h3>
                                <p className="text-[11px] text-purple-600/80">Modelos configurados</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                                <Upload className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Container Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    {/* Filters Toolbar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por título, entidade ou signatário..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-slate-950 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={targetFilter}
                                onChange={(e) => setTargetFilter(e.target.value as any)}
                                className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-slate-700 dark:text-slate-200 outline-none font-medium cursor-pointer shadow-xs"
                            >
                                <option value="all">Todas as Entidades</option>
                                <option value="worker">Apenas Trabalhadores</option>
                                <option value="client">Apenas Clientes</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-slate-700 dark:text-slate-200 outline-none font-medium cursor-pointer shadow-xs"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="signed">Apenas Assinados</option>
                                <option value="pending">Apenas Pendentes</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="p-0">
                        {loading ? (
                            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                <p className="text-xs font-semibold">Carregando documentos...</p>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-950/30 text-xs space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                    <FileText className="h-7 w-7" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                    Nenhum documento encontrado
                                </h4>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Clique no botão verde <strong className="text-slate-700 dark:text-slate-200">"Gerar Documento (.docx)"</strong> para criar um contrato preenchido e enviar para assinatura!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                                        <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                            <TableHead className="text-xs font-bold uppercase text-slate-500 py-3.5 pl-6 min-w-[260px]">
                                                Título do Documento
                                            </TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-slate-500 py-3.5 w-[130px]">
                                                Entidade Alvo
                                            </TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-slate-500 py-3.5 min-w-[260px]">
                                                Status de Assinatura (Cliente & Empresa)
                                            </TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-slate-500 py-3.5 w-[110px]">
                                                Criação
                                            </TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-slate-500 py-3.5 pr-6 text-right min-w-[440px]">
                                                Ações & Download
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        {filteredDocs.map(doc => {
                                            const publicLink = `${window.location.origin}/assinar/doc/${doc.public_token}`;
                                            const isCompanySigned =
                                                doc.company_signature_status === 'signed' ||
                                                !!doc.company_signature_url ||
                                                !!doc.custom_data?.company_signature_url;
                                            const companySigner =
                                                doc.company_signed_by_name ||
                                                doc.custom_data?.company_signed_by_name;

                                            return (
                                                <TableRow key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    {/* Document Title */}
                                                    <TableCell className="py-4 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-900/40">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                                                    {doc.title}
                                                                </h4>
                                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                    Token: {doc.public_token?.slice(0, 16)}...
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Target Type */}
                                                    <TableCell className="py-4">
                                                        {doc.target_type === 'worker' ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg">
                                                                <User className="h-3 w-3" /> Trabalhador
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg">
                                                                <Building className="h-3 w-3" /> Cliente
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* Signature Status (Bilateral) */}
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Client Status */}
                                                            <div className="flex items-center gap-2">
                                                                {doc.signature_status === 'signed' ? (
                                                                    <Badge className="bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-md shadow-2xs">
                                                                        <CheckCircle2 className="h-3 w-3" /> Cliente: {doc.signed_by_name || 'Assinado'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-md">
                                                                        <Clock className="h-3 w-3 text-amber-500" /> Cliente: Aguardando
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Company Status */}
                                                            <div className="flex items-center gap-2">
                                                                {isCompanySigned ? (
                                                                    <Badge className="bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-md shadow-2xs">
                                                                        <ShieldCheck className="h-3 w-3" /> Empresa: {companySigner || 'Assinado'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold flex items-center gap-1 w-fit px-2 py-0.5 rounded-md">
                                                                        <PenTool className="h-2.5 w-2.5" /> Empresa: Pendente Assinatura
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Creation Date */}
                                                    <TableCell className="py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '-'}
                                                    </TableCell>

                                                    {/* Action Buttons */}
                                                    <TableCell className="py-4 pr-6 text-right">
                                                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                            {/* Copy Link Button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(publicLink);
                                                                    toast.success('Link público copiado! Você pode enviar este link para o cliente assinar ou baixar o PDF.');
                                                                }}
                                                                className="h-8 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl"
                                                                title="Copiar Link para enviar ao Cliente"
                                                            >
                                                                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar Link
                                                            </Button>

                                                            {/* Sign as Company Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setCompanySignDoc(doc)}
                                                                className={`inline-flex items-center justify-center h-8 px-3 text-xs font-bold rounded-xl shadow-xs transition-all ${
                                                                    isCompanySigned
                                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                                }`}
                                                                title="Assinar eletronicamente pela sua Empresa (Prestadora)"
                                                            >
                                                                <PenTool className="h-3.5 w-3.5 mr-1" />
                                                                {isCompanySigned ? 'Reassinar (Empresa)' : 'Assinar (Empresa)'}
                                                            </button>

                                                            {/* Open Public Link Button */}
                                                            <a
                                                                href={publicLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                                                                title="Abrir tela pública do Cliente"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver Link
                                                            </a>

                                                            {/* Download PDF Button */}
                                                            <button
                                                                onClick={() => handleDownloadPdf(doc)}
                                                                disabled={downloadingId === doc.id}
                                                                className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-all disabled:opacity-50 shadow-2xs"
                                                                title="Baixar em formato PDF com Certificado de Assinatura Eletrônica"
                                                            >
                                                                {downloadingId === doc.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 text-rose-600" />
                                                                ) : (
                                                                    <Download className="h-3.5 w-3.5 mr-1 text-rose-600 dark:text-rose-400" />
                                                                )}
                                                                {(doc.signature_status === 'signed' || isCompanySigned) ? 'PDF Assinado' : 'Baixar PDF'}
                                                            </button>

                                                            {/* Delete Button */}
                                                            <button
                                                                onClick={() => handleDeleteDoc(doc.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-all ml-0.5"
                                                                title="Excluir documento"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                <DocumentVariablesCheatSheetModal
                    isOpen={isCheatSheetOpen}
                    onClose={() => setIsCheatSheetOpen(false)}
                />
                <DocumentTemplateManagerModal
                    isOpen={isTemplateManagerOpen}
                    onClose={() => setIsTemplateManagerOpen(false)}
                    onOpenCheatSheet={() => {
                        setIsTemplateManagerOpen(false);
                        setIsCheatSheetOpen(true);
                    }}
                    onTemplateCreated={loadData}
                />
                <GenerateDocumentWizardModal
                    isOpen={isWizardOpen}
                    onClose={() => setIsWizardOpen(false)}
                    onDocumentGenerated={loadData}
                />
                <CompanySignatureModal
                    isOpen={!!companySignDoc}
                    doc={companySignDoc}
                    onClose={() => setCompanySignDoc(null)}
                    onSignedSuccess={(updated) => {
                        setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                />
            </div>
        </Layout>
    );
};
