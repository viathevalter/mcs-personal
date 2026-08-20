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
    empresaId?: string; // We need this to create the record if it doesn't exist
    workerFunction?: string;
    onSuccess: () => void;
}

export function AdminUploadDialog({
    open,
    onOpenChange,
    workerId,
    workerName,
    clientXName,
    periodYear,
    periodMonth,
    contratante,
    hourRecordId,
    empresaId,
    workerFunction,
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

        try {
            setLoading(true);

            // Structure: Nome do trabalhador.ext
            const extension = file.name.split('.').pop() || 'pdf';

            const monthStr = periodMonth.toString().padStart(2, '0');
            const fileName = `${workerId}_${monthStr}_${periodYear}.${extension}`;
            const filePath = fileName;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('extracao-horas')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Falha ao enviar arquivo pro Storage');
            }

            const fileUrl = uploadData.path;

            if (hourRecordId) {
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
            } else {
                if (!empresaId) throw new Error('ID da empresa não encontrado');
                // Insert New Record
                const { error: insertError } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .insert({
                        empresa_id: empresaId,
                        worker_id: workerId,
                        period_year: periodYear,
                        period_month: periodMonth,
                        status: 'enviado',
                        file_url: fileUrl,
                        file_name: file.name,
                        contratante: contratante,
                        cliente_nombre: clientXName
                    });

                if (insertError) {
                    console.error('DB Insert error:', insertError);
                    throw new Error('Falha ao criar e registrar arquivo no banco de dados');
                }
            }

            // Disparar OCR em segundo plano
            const resolveAndTriggerOcr = async () => {
                if (!empresaId) return;
                try {
                    const { data: allClients } = await supabase
                        .schema('core_common')
                        .from('clients')
                        .select('id, legal_name, trade_name');

                    const clientTarget = clientXName.trim().toLowerCase();
                    const matched = allClients?.find(c => c.trade_name?.trim().toLowerCase() === clientTarget) ||
                                    allClients?.find(c => c.legal_name?.trim().toLowerCase() === clientTarget) ||
                                    allClients?.find(c => 
                                        c.trade_name?.toLowerCase().includes(clientTarget) || 
                                        c.legal_name?.toLowerCase().includes(clientTarget) ||
                                        clientTarget.includes(c.trade_name?.toLowerCase() || '') ||
                                        clientTarget.includes(c.legal_name?.toLowerCase() || '')
                                    );

                    if (matched) {
                        const extension = file.name.split('.').pop() || 'pdf';
                        const mimeType = file.type || (extension === 'pdf' ? 'application/pdf' : 'image/jpeg');

                        supabase.functions.invoke('process-document-ocr', {
                            body: {
                                file_path: fileUrl,
                                document_type: "timesheet",
                                bucket_id: "extracao-horas",
                                mime_type: mimeType,
                                worker_id: workerId,
                                client_id: matched.id,
                                worker_function: workerFunction || null,
                                year: periodYear,
                                month: periodMonth
                            }
                        }).then(res => {
                            console.log("Background OCR triggered successfully:", res);
                        }).catch(err => {
                            console.error("Background OCR invoke error:", err);
                        });
                    } else {
                        console.warn(`[OCR Trigger] Cliente não encontrado com nome "${clientXName}" para disparo de OCR.`);
                    }
                } catch (e) {
                    console.error("[OCR Trigger] Erro ao disparar OCR em segundo plano:", e);
                }
            };

            resolveAndTriggerOcr();

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
