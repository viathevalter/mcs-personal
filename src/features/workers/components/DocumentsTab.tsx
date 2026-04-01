import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkerDocuments, useUploadDocument, useDeleteDocument, useDocumentDownload } from '@/features/workers/hooks/useWorkerDocuments';
import { updateWorker } from '@/features/workers/api/workersApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, UploadCloud, Download, Trash2, FileText, Eye } from 'lucide-react';

interface DocumentsTabProps {
    workerId: string;
    empresaId: string;
}

const DOC_TYPES = [
    { value: 'foto', label: 'Foto do Trabalhador' },
    { value: 'contrato_trabalho', label: 'Contrato de Trabalho' },
    { value: 'contrato_alta', label: 'Contrato de Alta' },
    { value: 'doc_alta_seguridade', label: 'Doc Alta Seguridade' },
    { value: 'doc_baixa_seguridade', label: 'Doc Baixa Seguridade' },
    { value: 'certificado_banco', label: 'Cert. Titularidade Banco' },
    { value: 'autorizacao_banco', label: 'Autorização Mudança Conta Banco' },
    { value: 'passaporte', label: 'Passaporte' },
    { value: 'niss', label: 'NISS' },
    { value: 'nif', label: 'NIF' },
    { value: 'permision_conducir', label: 'Permision de Conducir' },
    { value: 'carta_renuncia', label: 'Carta de Renuncia' },
    { value: 'carta_laboral', label: 'Carta Laboral' },
    { value: 'prova_vida', label: 'Prova de Vida' },
    { value: 'nomina', label: 'Recibo de Vencimento (Nómina)' },
    { value: 'identificacao', label: 'Doc. Identificação Genérica' },
    { value: 'outros', label: 'Outros' }
];

function formatBytes(bytes: number | null, decimals = 2) {
    if (bytes === null || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function DocumentsTab({ workerId, empresaId }: DocumentsTabProps) {
    const { role } = useEmpresa();
    const queryClient = useQueryClient();
    const { data: documents, isLoading, isError } = useWorkerDocuments(workerId);
    const uploadMutation = useUploadDocument();
    const deleteMutation = useDeleteDocument();
    const downloadMutation = useDocumentDownload();

    const [selectedDocType, setSelectedDocType] = useState('contrato_trabalho');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const safeDocs = documents || [];
    const isAdmin = role === 'admin';
    const canUpload = role === 'admin' || role === 'rh';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;

        uploadMutation.mutate({
            empresaId,
            workerId,
            docType: selectedDocType,
            file: selectedFile
        }, {
            onSuccess: async (newDoc) => {
                setSelectedFile(null);
                // Reset input file
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                
                if (selectedDocType === 'foto' && newDoc?.file_path) {
                    try {
                        await updateWorker(workerId, { foto: newDoc.file_path });
                        queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
                    } catch (err) {
                        console.error('Falha ao atualizar foto de perfil do trabalhador', err);
                    }
                }
                
                alert('Documento anexado com sucesso!');
            },
            onError: (err) => {
                alert(`Erro ao subir arquivo: ${err.message}`);
            }
        });
    };

    const handleDelete = (doc: any) => {
        if (confirm(`Tem certeza que deseja apagar permanentemente o documento ${doc.file_name}?`)) {
            deleteMutation.mutate(doc, {
                onSuccess: () => alert('Documento removido.'),
                onError: (err) => alert(`Erro ao remover: ${err.message}`)
            });
        }
    };

    const handleDownload = (filePath: string, fileName: string) => {
        downloadMutation.mutate(filePath, {
            onSuccess: (url) => {
                // Create a temporary link to download
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            onError: (err) => alert(`Falha ao obter link de download: ${err.message}`)
        });
    };

    const handleView = (filePath: string) => {
        downloadMutation.mutate(filePath, {
            onSuccess: (url) => {
                window.open(url, '_blank');
            },
            onError: (err) => alert(`Falha ao abrir documento: ${err.message}`)
        });
    };

    return (
        <div className="mt-6 space-y-6">
            {canUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UploadCloud className="h-5 w-5 text-muted-foreground" />
                            Novo Documento
                        </CardTitle>
                        <CardDescription>Faça upload de documentos diretamente para o arquivo digital do trabalhador.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="space-y-1.5 w-full sm:max-w-xs">
                                <Label>Tipo de Documento</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={selectedDocType}
                                    onChange={e => setSelectedDocType(e.target.value)}
                                >
                                    {DOC_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5 w-full sm:flex-1">
                                <Label htmlFor="file-upload">Arquivo</Label>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={uploadMutation.isPending}
                                />
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploadMutation.isPending}
                                className="w-full sm:w-auto"
                            >
                                {uploadMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Anexar'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Arquivo Digital
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Arquivo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Tamanho</TableHead>
                                    <TableHead>Data de Envio</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && isError && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                            Erro ao carregar documentos.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && safeDocs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Nenhum documento anexado.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && safeDocs.map((doc) => {
                                    const tipoLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type;
                                    const date = new Date(doc.created_at).toLocaleDateString('pt-PT');

                                    return (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium max-w-[200px] truncate" title={doc.file_name}>
                                                {doc.file_name}
                                            </TableCell>
                                            <TableCell>{tipoLabel}</TableCell>
                                            <TableCell className="text-muted-foreground">{formatBytes(doc.file_size)}</TableCell>
                                            <TableCell className="text-muted-foreground">{date}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Visualizar"
                                                    onClick={() => handleView(doc.file_path)}
                                                    disabled={downloadMutation.isPending}
                                                >
                                                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Baixar"
                                                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                                    disabled={downloadMutation.isPending}
                                                >
                                                    <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Excluir"
                                                        onClick={() => handleDelete(doc)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive hover:text-red-700" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
