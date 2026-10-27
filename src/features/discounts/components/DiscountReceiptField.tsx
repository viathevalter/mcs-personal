import React, { useState, useRef } from 'react';
import { supabase } from '@/shared/supabase/client';
import { Paperclip, Upload, FileText, Image as ImageIcon, FileSpreadsheet, ExternalLink, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export async function uploadDiscountReceipt(file: File): Promise<{ url: string; name: string }> {
    const ext = file.name.split('.').pop() || 'pdf';
    const safeBase = file.name
        .replace(/\.[^/.]+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);
    const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBase}.${ext}`;
    const filePath = `descontos/${cleanName}`;

    const candidateBuckets = ['comprovantes-financeiro', 'financeiro-anexos', 'documents', 'coches'];

    for (const bucket of candidateBuckets) {
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (!uploadError) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (data?.publicUrl) {
                return { url: data.publicUrl, name: file.name };
            }
        }
    }

    throw new Error('Não foi possível enviar o comprovante para o servidor de arquivos.');
}

export function extractReceiptFileName(url?: string | null, savedName?: string | null): string {
    if (savedName && savedName.trim()) return savedName.trim();
    if (!url) return 'Comprovante anexado';
    try {
        const cleanUrl = url.split('?')[0];
        const lastSegment = decodeURIComponent(cleanUrl.split('/').pop() || '');
        // Strip timestamp prefix if present: 1700000000000_xxxxx_Name.ext
        const match = lastSegment.match(/^\d+_[a-z0-9]+_(.+)$/i);
        if (match && match[1]) return match[1];
        return lastSegment || 'Comprovante anexado';
    } catch {
        return 'Comprovante anexado';
    }
}

interface DiscountReceiptFieldProps {
    comprovanteUrl?: string | null;
    comprovanteNome?: string | null;
    onChange: (url: string | null, nome: string | null) => void;
    disabled?: boolean;
}

export function DiscountReceiptField({
    comprovanteUrl,
    comprovanteNome,
    onChange,
    disabled = false
}: DiscountReceiptFieldProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadDiscountReceipt(file);
            onChange(result.url, result.name);
            toast.success('Comprovante anexado com sucesso!');
        } catch (err: any) {
            console.error('Erro ao anexar comprovante de desconto:', err);
            toast.error(err?.message || 'Erro ao fazer upload do comprovante.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const displayName = extractReceiptFileName(comprovanteUrl, comprovanteNome);
    const ext = displayName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isSpreadsheet = ['xls', 'xlsx', 'csv'].includes(ext);

    return (
        <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-emerald-600" /> Comprovante / Documento do Desconto
                </Label>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Integração Financeiro
                </span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
                disabled={disabled || isUploading}
            />

            {comprovanteUrl ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900 text-emerald-600 flex-shrink-0">
                            {isImage ? (
                                <ImageIcon className="w-4 h-4" />
                            ) : isSpreadsheet ? (
                                <FileSpreadsheet className="w-4 h-4" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={displayName}>
                                    {displayName}
                                </span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            </div>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                Comprovante anexado e pronto para consulta / financeiro
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2">
                        <a
                            href={comprovanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 transition-colors shadow-sm"
                            title="Abrir comprovante em nova aba"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir
                        </a>
                        {!disabled && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Trocar'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => onChange(null, null)}
                                    title="Remover comprovante"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                    className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors ${
                        disabled || isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {isUploading ? 'Enviando comprovante...' : 'Clique para anexar o comprovante deste desconto'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                Suporta PDF, Imagens (JPG, PNG), Word ou Planilhas
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || isUploading}
                        className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100/60 shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                    >
                        <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                        {isUploading ? 'Enviando...' : 'Subir Comprovante'}
                    </Button>
                </div>
            )}
        </div>
    );
}
