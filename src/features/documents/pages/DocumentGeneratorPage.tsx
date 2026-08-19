import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { documentGeneratorService, type GeneratedDocument } from '../services/documentGeneratorService';
import { documentTemplateService } from '../services/documentTemplateService';
import { pdfExportService } from '../services/pdfExportService';
import { DocumentVariablesCheatSheetModal } from '../components/DocumentVariablesCheatSheetModal';
import { DocumentTemplateManagerModal } from '../components/DocumentTemplateManagerModal';
import { GenerateDocumentWizardModal } from '../components/GenerateDocumentWizardModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Sparkles, Upload, FileText, Plus, Search, RefreshCw, Copy, ExternalLink,
    CheckCircle2, Clock, Trash2, Loader2, User, Building, Download
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
            const titleMatches = d.title.toLowerCase().includes(searchQuery.toLowerCase());
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
            <div className="flex flex-col space-y-6 p-4 md:p-6 max-w-7xl mx-auto font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                            <Sparkles className="h-8 w-8 text-emerald-500" />
                            Gerador de Documentos & Assinaturas Digital
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm mt-1">
                            Preenchimento automático de arquivos Word (.docx) para Trabalhadores e Clientes com controle de links de assinatura.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={() => setIsWizardOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
                        >
                            <Sparkles className="h-4 w-4" />
                            Gerar Documento (.docx)
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsTemplateManagerOpen(true)}
                            className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5"
                        >
                            <Upload className="h-4 w-4 text-blue-500" />
                            Modelos Word ({templateCount})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsCheatSheetOpen(true)}
                            className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5"
                        >
                            <FileText className="h-4 w-4 text-amber-500" />
                            Gabarito de Variáveis
                        </Button>
                        <Button
                            variant="outline"
                            onClick={loadData}
                            className="text-slate-600 dark:text-slate-300"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* KPIs Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total de Documentos Gerados</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.total}</h3>
                            </div>
                            <FileText className="h-8 w-8 text-blue-400 opacity-60" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-emerald-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Assinados Digitalmente</p>
                                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.signed}</h3>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-amber-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Pendentes de Assinatura</p>
                                <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.pending}</h3>
                            </div>
                            <Clock className="h-8 w-8 text-amber-500 opacity-60" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-purple-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Modelos Word Cadastrados</p>
                                <h3 className="text-2xl font-bold text-purple-600 mt-1">{kpis.templates}</h3>
                            </div>
                            <Upload className="h-8 w-8 text-purple-400 opacity-60" />
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Documents List Table */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar por título do documento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white dark:bg-slate-950 text-xs"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={targetFilter}
                                onChange={(e) => setTargetFilter(e.target.value as any)}
                                className="h-9 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-slate-700 dark:text-slate-200 outline-none"
                            >
                                <option value="all">Todas as Entidades</option>
                                <option value="worker">Trabalhadores</option>
                                <option value="client">Clientes</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="h-9 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-slate-700 dark:text-slate-200 outline-none"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="signed">Assinados</option>
                                <option value="pending">Pendentes</option>
                            </select>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" /> Carregando documentos gerados...
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-3">
                                <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="font-semibold text-slate-600 dark:text-slate-300">
                                    Nenhum documento encontrado.
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Clique em "Gerar Documento (.docx)" para criar o primeiro documento preenchido automaticamente!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold uppercase">Título do Documento</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Entidade Alvo</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Status de Assinatura</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Data de Criação</TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-right">Ações & Links</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDocs.map(doc => {
                                            const publicLink = `${window.location.origin}/assinar/doc/${doc.public_token}`;
                                            return (
                                                <TableRow key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                    <TableCell className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                        {doc.title}
                                                    </TableCell>

                                                    <TableCell>
                                                        {doc.target_type === 'worker' ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 flex items-center gap-1 w-fit">
                                                                <User className="h-3 w-3" /> Trabalhador
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 flex items-center gap-1 w-fit">
                                                                <Building className="h-3 w-3" /> Cliente
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {doc.signature_status === 'signed' ? (
                                                            <Badge className="bg-emerald-500 text-white flex items-center gap-1 w-fit">
                                                                <CheckCircle2 className="h-3 w-3" /> Assinado por {doc.signed_by_name || 'Usuário'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1 w-fit">
                                                                <Clock className="h-3 w-3" /> Pendente de Assinatura
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-slate-500">
                                                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '-'}
                                                    </TableCell>

                                                    <TableCell className="text-right space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(publicLink);
                                                                toast.success('Link de assinatura copiado!');
                                                            }}
                                                            className="h-8 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                                                        >
                                                            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar Link
                                                        </Button>
                                                        <a
                                                            href={publicLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Assinar
                                                        </a>
                                                        <button
                                                            onClick={() => handleDownloadPdf(doc)}
                                                            disabled={downloadingId === doc.id}
                                                            className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all disabled:opacity-50"
                                                        >
                                                            {downloadingId === doc.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 text-emerald-500" />
                                                            ) : (
                                                                <Download className="h-3.5 w-3.5 mr-1 text-red-500" />
                                                            )}
                                                            {doc.signature_status === 'signed' ? 'Baixar PDF Assinado' : 'Baixar PDF'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDoc(doc.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors inline-block align-middle"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

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
            </div>
        </Layout>
    );
};
