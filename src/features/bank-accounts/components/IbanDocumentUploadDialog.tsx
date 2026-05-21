import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileText, Loader2, FileCheck2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { IbanDocType } from '../api/ibanDocumentsApi';
import { uploadIbanDocument, getIbanDocumentDownloadUrl } from '../api/ibanDocumentsApi';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

interface IbanDocumentUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    docType: IbanDocType;
    currentUrl: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function IbanDocumentUploadDialog({ open, onOpenChange, workerId, workerName, docType, currentUrl }: IbanDocumentUploadDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { selectedEmpresaId } = useEmpresa();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isLoadingView, setIsLoadingView] = useState(false);

    const docTypeLabel = docType === 'certificado' ? 'Certificado de Titularidade' : 'Autorização de Mudança';

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!selectedEmpresaId) throw new Error("Empresa não selecionada.");
            return uploadIbanDocument({ empresaId: selectedEmpresaId, workerId, docType, file });
        },
        onSuccess: () => {
             toast({
                title: 'Sucesso',
                description: `${docTypeLabel} anexado com sucesso.`,
            });
            setSelectedFile(null);
            // Invalidate queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['all-bank-accounts', selectedEmpresaId] });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast({
                variant: 'destructive',
                title: 'Erro no Upload',
                description: err.message || 'Ocorreu um erro ao enviar o arquivo.',
            });
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                variant: 'destructive',
                title: 'Arquivo muito grande',
                description: 'O tamanho máximo permitido é de 5MB.',
            });
            return;
        }
        
        const type = file.type.toLowerCase();
        if (!type.includes('pdf') && !type.includes('image')) {
            toast({
                variant: 'destructive',
                title: 'Formato inválido',
                description: 'Por favor, envie um arquivo PDF, JPG ou PNG.',
            });
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsHovering(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            uploadMutation.mutate(selectedFile);
        }
    };

    const handleViewExisting = async () => {
        if (!currentUrl) return;
        setIsLoadingView(true);
        try {
            const url = await getIbanDocumentDownloadUrl(currentUrl);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao abrir documento',
                description: error.message || 'Não foi possível gerar um link para o documento.',
            });
        } finally {
            setIsLoadingView(false);
        }
    };

    const isUploading = uploadMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-900">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        {docTypeLabel}
                    </DialogTitle>
                    <DialogDescription>
                        Trabalhador: <span className="font-semibold text-slate-800">{workerName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* View existing doc */}
                    {currentUrl && !selectedFile && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                            <FileCheck2 className="w-8 h-8 text-emerald-500" />
                            <p className="text-sm font-medium text-emerald-800">Este documento já está anexado no sistema.</p>
                            <Button 
                                variant="outline" 
                                className="mt-2 bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100 w-full"
                                onClick={handleViewExisting}
                                disabled={isLoadingView}
                            >
                                {isLoadingView ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                {isLoadingView ? 'Gerando link visualizador...' : 'Visualizar Documento Atual'}
                            </Button>
                            
                            <div className="w-full flex items-center gap-2 mt-4 pt-4 border-t border-emerald-200/50">
                                <span className="text-xs text-emerald-600/70 uppercase font-semibold flex-1">Ou substitua anexando novo:</span>
                            </div>
                        </div>
                    )}

                    {/* Drag and drop zone */}
                    {!selectedFile ? (
                        <div 
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer ${
                                isHovering ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                            onDragLeave={() => setIsHovering(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,image/png,image/jpeg,image/jpg"
                            />
                            
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-1">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-700">Clique ou arraste um arquivo para envio.</p>
                                <p className="text-xs text-slate-500 mt-1">Formatos aceitos: PDF, JPG, PNG (máx 5MB)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex flex-shrink-0 items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                                onClick={() => setSelectedFile(null)}
                                disabled={isUploading}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Cancelar
                    </Button>
                    <Button 
                        className="bg-indigo-600 text-white hover:bg-indigo-700" 
                        disabled={!selectedFile || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isUploading ? 'Enviando e vinculando...' : 'Salvar Anexo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
