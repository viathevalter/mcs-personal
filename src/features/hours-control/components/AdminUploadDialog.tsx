import { useState } from 'react';
import { supabase } from '../../../shared/supabase/client';
import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Upload, File as FileIcon, Loader2 } from 'lucide-react';

interface AdminUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    clientXName: string; // The client name specifically for folder structure
    periodYear: number;
    periodMonth: number;
    contratante: string; // The employer specifically for folder structure
    hourRecordId?: string; // If it doesn't exist, we might need to create it, but in our flow it should exist as 'pendente'
    onSuccess: () => void;
}

export function AdminUploadDialog({
    open,
    onOpenChange,
    workerName,
    clientXName,
    periodYear,
    periodMonth,
    contratante,
    hourRecordId,
    onSuccess
}: AdminUploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const getMonthName = (month: number) => {
        const date = new Date(2000, month - 1, 1);
        return date.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Por favor, selecione um arquivo primeiro.');
            return;
        }

        if (!hourRecordId) {
            toast.error('Erro de integridade: Registro de horas não encontrado no banco.');
            return;
        }

        try {
            setLoading(true);

            // Structure: Nome do trabalhador.ext
            const extension = file.name.split('.').pop() || 'pdf';
            const safeCliente = clientXName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
            const safeNome = workerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();

            const fileName = `${safeNome}.${extension}`;

            // Path Structure in Bucket: /ANO/MES/CLIENTE/ARQUIVO
            const monthStr = periodMonth.toString().padStart(2, '0');
            const filePath = `${periodYear}/${monthStr}/${safeCliente}/${fileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('horas_trabalhadores')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Falha ao enviar arquivo pro Storage');
            }

            const fileUrl = uploadData.path;

            // Update Database Record
            const { error: dbError } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({
                    status: 'enviado',
                    file_url: fileUrl,
                    file_name: file.name,
                    contratante: contratante,
                    cliente_nombre: clientXName
                })
                .eq('id', hourRecordId);

            if (dbError) {
                console.error('DB Update error:', dbError);
                throw new Error('Falha ao registrar arquivo no banco de dados');
            }

            toast.success('Folha enviada com sucesso em nome do trabalhador!');
            onSuccess();
            onOpenChange(false);
            setFile(null); // Reset

        } catch (error: any) {
            toast.error(error.message || 'Erro inesperado ao enviar arquivo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enviar Folha pelo Trabalhador</DialogTitle>
                    <DialogDescription className="pt-2">
                        Você está enviando o arquivo de horas de <strong className="text-primary">{workerName}</strong> para {clientXName} referente a {getMonthName(periodMonth)} {periodYear}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="arquivo">Selecione o PDF ou Foto da folha</Label>
                        <Input
                            id="arquivo"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                    </div>

                    {file && (
                        <div className="flex items-center gap-3 p-3 bg-muted border rounded-md">
                            <FileIcon className="h-6 w-6 text-blue-500" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleUpload} disabled={!file || loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Confirmar Submissão
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
