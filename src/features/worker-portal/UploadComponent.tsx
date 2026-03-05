import { useState } from 'react';
import { supabase } from '../../shared/supabase/client';
import type { WorkerHour } from '../../shared/types/corePersonal';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Upload, X, File as FileIcon, Loader2 } from 'lucide-react';

interface UploadComponentProps {
    worker: any; // Using any for simplicity here
    period: WorkerHour;
    onCancel: () => void;
    onSuccess: () => void;
}

export function UploadComponent({ worker, period, onCancel, onSuccess }: UploadComponentProps) {
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

            // Nomenclatura V1.0: Apenas NOME_DO_TRABALHADOR.extensao
            // (A pasta do SharePoint já organiza por Empresa/Mês/Cliente)
            const extension = file.name.split('.').pop() || 'pdf';
            const clientFolder = worker.cliente_nombre || 'SEM_CLIENTE';
            const safeCliente = clientFolder.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
            const safeNome = worker.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();

            const fileName = `${safeNome}.${extension}`;

            // Path Structure in Bucket: /ANO/MES/CLIENTE/ARQUIVO
            const monthStr = period.period_month.toString().padStart(2, '0');
            const filePath = `${period.period_year}/${monthStr}/${safeCliente}/${fileName}`;

            // Upload
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('horas_trabalhadores')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Falha ao enviar arquivo');
            }

            // Get Public URL (if bucket is public later, otherwise just store the path)
            const fileUrl = uploadData.path;

            // Update Database Record
            const { error: dbError } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .update({
                    status: 'enviado',
                    file_url: fileUrl,
                    file_name: file.name // Original file name, or store the new structured one
                })
                .eq('id', period.id);

            if (dbError) {
                console.error('DB Update error:', dbError);
                throw new Error('Falha ao atualizar status');
            }

            toast.success('Folha enviada com sucesso!');
            onSuccess();

        } catch (error: any) {
            toast.error(error.message || 'Erro inesperado ao enviar arquivo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-blue-50/50 border-b">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">Enviar Folha de Horas</CardTitle>
                        <CardDescription className="mt-1 text-sm text-slate-600">
                            Mês de Referência: <strong className="text-slate-900">{getMonthName(period.period_month)} {period.period_year}</strong>
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} title="Cancelar">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="arquivo">Selecione o PDF ou Foto da sua folha de horas assinada</Label>
                    <Input
                        id="arquivo"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {file && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-md">
                        <FileIcon className="h-8 w-8 text-blue-500" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-slate-50/50 border-t pt-4">
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                    Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={!file || loading} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Confirmar Envio
                </Button>
            </CardFooter>
        </Card>
    );
}
