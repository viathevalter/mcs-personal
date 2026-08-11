import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Loader2, FileText, CheckCircle2, XCircle, Download, 
    Upload, Eye, Trash2, ArrowRight, Info, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import type { IbanChangeRequest } from '../api/ibanRequestsApi';
import { getIbanRequestFileUrl, updateIbanRequestUrls } from '../api/ibanRequestsApi';
import { useApproveIbanRequest, useRejectIbanRequest, useUploadIbanRequestFile } from '../hooks/useIbanRequests';

interface ReviewIbanRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: IbanChangeRequest;
    empresaId: string;
}

export function ReviewIbanRequestDialog({ 
    open, onOpenChange, request, empresaId 
}: ReviewIbanRequestDialogProps) {
    const { mutateAsync: approveRequest, isPending: isApproving } = useApproveIbanRequest();
    const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectIbanRequest();
    const { mutateAsync: uploadFile } = useUploadIbanRequestFile();

    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    
    // File URLs
    const [termoGeradoUrl, setTermoGeradoUrl] = useState<string | null>(request.termo_gerado_url);
    const [termoAssinadoUrl, setTermoAssinadoUrl] = useState<string | null>(request.termo_assinado_url);
    const [termoAssinadoFile, setTermoAssinadoFile] = useState<File | null>(null);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isUploadingTermo, setIsUploadingTermo] = useState(false);
    const [isViewingFile, setIsViewingFile] = useState<string | null>(null);

    const termoInputRef = useRef<HTMLInputElement>(null);

    const maskIban = (iban: string | null | undefined) => {
        if (!iban) return '-';
        const clean = iban.replace(/\s+/g, '');
        if (clean.length < 8) return iban;
        const start = clean.substring(0, 4);
        const end = clean.substring(clean.length - 4);
        return `${start} •••• •••• •••• ${end}`;
    };

    const handleViewFile = async (filePath: string | null, type: string) => {
        if (!filePath) return;
        setIsViewingFile(type);
        try {
            const url = await getIbanRequestFileUrl(filePath);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao gerar link de visualização do arquivo.');
        } finally {
            setIsViewingFile(null);
        }
    };

    // PDF Generation using jsPDF
    const handleGeneratePdf = async () => {
        if (!request.worker) return;
        setIsGeneratingPdf(true);

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Margins and Dimensions
            const margin = 20;
            const width = doc.internal.pageSize.getWidth();
            let y = 30;

            // Logo Placeholder/Header
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // slate-800
            doc.text('MCS PERSONAL', margin, y);
            y += 8;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('Gestão de Recursos Humanos e Folha de Pagamento', margin, y);
            
            y += 4;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.5);
            doc.line(margin, y, width - margin, y);
            
            y += 18;

            // Title
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('TERMO DE AUTORIZAÇÃO DE ALTERAÇÃO DE DADOS BANCÁRIOS', width / 2, y, { align: 'center' });
            
            y += 18;

            // Body Text
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(51, 65, 85); // slate-700
            
            const p1 = `Eu, ${request.worker.nome.toUpperCase()}, portador do código de colaborador ${request.worker.cod_colab || 'N/A'}, na qualidade de trabalhador ativo na empresa, solicito e autorizo expressamente o departamento financeiro e de recursos humanos a efetuar o pagamento de todas as minhas futuras remunerações, salários, adiantamentos e eventuais reembolsos na conta bancária cujos dados são propostos abaixo, em substituição a qualquer outra conta cadastrada anteriormente no sistema.`;
            
            const splitText = doc.splitTextToSize(p1, width - (2 * margin));
            doc.text(splitText, margin, y);
            y += (splitText.length * 6) + 12;

            // Box details
            doc.setDrawColor(99, 102, 241); // indigo-500
            doc.setFillColor(249, 250, 251); // slate-50
            doc.rect(margin, y, width - (2 * margin), 32, 'FD');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('NOVOS DADOS BANCÁRIOS AUTORIZADOS', margin + 5, y + 8);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Banco Destinatário:   ${request.new_banco || '-'}`, margin + 5, y + 16);
            doc.setFont('Helvetica', 'bold');
            doc.text(`IBAN da Conta:          ${request.new_iban || '-'}`, margin + 5, y + 24);

            y += 44;

            // Confirmation and Signature Info
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            const p2 = 'Confirmo que sou o titular da conta indicada acima e assumo total responsabilidade pela veracidade destas informações bancárias, isentando a empresa de qualquer responsabilidade por atrasos ou falhas de pagamento decorrentes de dados incorretos preenchidos por mim.';
            const splitText2 = doc.splitTextToSize(p2, width - (2 * margin));
            doc.text(splitText2, margin, y);
            y += (splitText2.length * 5) + 15;

            // Date
            const today = new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(`Data de geração: ${today}`, margin, y);

            y += 28;

            // Signature Lines
            const colWidth = (width - (2 * margin) - 15) / 2;
            
            // Col 1: Worker
            doc.line(margin, y, margin + colWidth, y);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Assinatura do Trabalhador', margin + (colWidth / 2), y + 5, { align: 'center' });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(request.worker.nome, margin + (colWidth / 2), y + 9, { align: 'center' });

            // Col 2: Company/HR
            doc.line(width - margin - colWidth, y, width - margin, y);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Recursos Humanos (Validação)', width - margin - (colWidth / 2), y + 5, { align: 'center' });
            
            // Save as Blob for upload
            const pdfOutput = doc.output('blob');
            const pdfFile = new File([pdfOutput], `termo_autorizacao_${request.token}.pdf`, { type: 'application/pdf' });

            // Upload generated PDF to Supabase storage
            const path = await uploadFile({
                token: request.token,
                file: pdfFile,
                docType: 'termo_assinado'
            });

            // Update request entry in DB
            await updateIbanRequestUrls(request.id, { termo_gerado_url: path });
            setTermoGeradoUrl(path);

            // Trigger local download
            doc.save(`Termo_Autorizacao_IBAN_${request.worker.nome.replace(/\s+/g, '_')}.pdf`);
            toast.success('Termo de Autorização gerado com sucesso em PDF!');

        } catch (err) {
            console.error(err);
            toast.error('Erro ao gerar Termo em PDF.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Upload Signed Term
    const handleUploadSignedTerm = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo excede o limite de 10MB.');
            return;
        }

        setTermoAssinadoFile(file);
        setIsUploadingTermo(true);

        try {
            const path = await uploadFile({
                token: request.token,
                file,
                docType: 'termo_assinado'
            });

            await updateIbanRequestUrls(request.id, { termo_assinado_url: path });
            setTermoAssinadoUrl(path);
            toast.success('Termo assinado anexado com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar termo assinado.');
        } finally {
            setIsUploadingTermo(false);
        }
    };

    const handleApprove = async () => {
        if (!request.new_iban || !request.new_banco) {
            toast.error('Dados bancários incompletos na solicitação.');
            return;
        }

        try {
            await approveRequest({
                id: request.id,
                workerId: request.worker_id,
                newIban: request.new_iban,
                newBanco: request.new_banco,
                termoAssinadoUrl: termoAssinadoUrl || termoGeradoUrl, // fallback to generated if no signed uploaded
                comprovanteUrl: request.comprovante_url,
                empresaId
            });

            toast.success('Alteração bancária aprovada e ativada com sucesso!');
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao aprovar solicitação.');
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Por favor, informe o motivo da rejeição.');
            return;
        }

        try {
            await rejectRequest({
                id: request.id,
                reason: rejectionReason,
                empresaId
            });

            toast.success('Solicitação rejeitada com sucesso.');
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao rejeitar solicitação.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={isApproving || isRejecting ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="text-slate-900 text-lg font-bold flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                        Avaliar Troca de IBAN
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                        Trabalhador: <span className="font-semibold text-slate-800">{request.worker?.nome}</span> ({request.worker?.cod_colab})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-5">
                    
                    {/* Comparison Side-by-side */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 border rounded-xl p-4">
                        <div className="space-y-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dados Atuais</span>
                            <div>
                                <span className="text-xs text-slate-500 block">Banco</span>
                                <span className="text-sm text-slate-600 font-medium">{request.old_banco || 'Não informado'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">IBAN</span>
                                <span className="text-sm font-mono text-slate-500">{maskIban(request.old_iban)}</span>
                            </div>
                        </div>

                        <div className="space-y-3 border-l pl-4">
                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block flex items-center">
                                Proposta de Alteração <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </span>
                            <div>
                                <span className="text-xs text-slate-500 block">Novo Banco</span>
                                <span className="text-sm text-slate-900 font-bold">{request.new_banco || 'Aguardando envio'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Novo IBAN</span>
                                <span className="text-sm font-mono text-slate-900 font-bold">{request.new_iban || 'Aguardando envio'}</span>
                            </div>
                        </div>
                    </div>

                    {/* COLLABORATOR ATTACHMENTS */}
                    <div className="space-y-2.5">
                        <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider block">Documentos Enviados pelo Trabalhador</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Photo of IBAN */}
                            <div className="border rounded-xl p-3 flex items-center justify-between bg-white shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800">Foto do IBAN / Cartão</p>
                                        <p className="text-[10px] text-slate-400">OCR IA ou Foto enviada</p>
                                    </div>
                                </div>
                                {request.iban_photo_url ? (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                        onClick={() => handleViewFile(request.iban_photo_url, 'iban_photo')}
                                        disabled={isViewingFile === 'iban_photo'}
                                    >
                                        {isViewingFile === 'iban_photo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">Não anexado</span>
                                )}
                            </div>

                            {/* Proof of Titularity */}
                            <div className="border rounded-xl p-3 flex items-center justify-between bg-white shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800">Comprovante do Banco</p>
                                        <p className="text-[10px] text-slate-400">Titularidade oficial</p>
                                    </div>
                                </div>
                                {request.comprovante_url ? (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                        onClick={() => handleViewFile(request.comprovante_url, 'comprovante')}
                                        disabled={isViewingFile === 'comprovante'}
                                    >
                                        {isViewingFile === 'comprovante' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">Não anexado</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LAUNCH DOCUMENT / GENERATE PDF ACTION */}
                    <div className="border-t pt-4 space-y-4">
                        <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider block">Geração do Termo e Assinatura</Label>
                        
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                            {/* 1. PDF Generation */}
                            <div className="flex-1 border border-slate-200 bg-slate-50/50 rounded-xl p-4 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-800 mb-1">1. Criar Termo de Autorização</h4>
                                    <p className="text-[10px] text-slate-500 leading-normal">
                                        Gere um termo oficial em PDF com o novo IBAN para assinatura física ou digital.
                                    </p>
                                </div>
                                <Button 
                                    className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white w-full border-0 shadow-sm"
                                    onClick={handleGeneratePdf}
                                    disabled={isGeneratingPdf || !request.new_iban}
                                    size="sm"
                                >
                                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    {termoGeradoUrl ? 'Re-gerar e Baixar PDF' : 'Gerar Termo em PDF'}
                                </Button>
                            </div>

                            {/* 2. PDF Upload of Signed document */}
                            <div className="flex-1 border border-slate-200 bg-slate-50/50 rounded-xl p-4 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-800 mb-1">2. Termo Assinado pelo Trabalhador</h4>
                                    <p className="text-[10px] text-slate-500 leading-normal">
                                        Anexe a via assinada de volta no sistema para manter o histórico de auditoria.
                                    </p>
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    ref={termoInputRef}
                                    onChange={handleUploadSignedTerm}
                                    accept="application/pdf,image/png,image/jpeg"
                                />
                                {termoAssinadoUrl ? (
                                    <div className="mt-3 flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                                            onClick={() => handleViewFile(termoAssinadoUrl, 'termo_assinado')}
                                            disabled={isViewingFile === 'termo_assinado'}
                                        >
                                            {isViewingFile === 'termo_assinado' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                                            Ver
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-rose-500 hover:bg-rose-50 h-9 px-3"
                                            onClick={() => { setTermoAssinadoUrl(null); setTermoAssinadoFile(null); }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button 
                                        className="mt-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 w-full"
                                        onClick={() => termoInputRef.current?.click()}
                                        disabled={isUploadingTermo || !termoGeradoUrl}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {isUploadingTermo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2 text-slate-500" />}
                                        Carregar Assinado
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* REJECTION FORM */}
                    {showRejectionForm && (
                        <div className="border-t pt-4 space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                            <Label htmlFor="rejection_reason" className="text-rose-900 text-xs font-bold uppercase tracking-wider block">Motivo da Rejeição</Label>
                            <Textarea 
                                id="rejection_reason" 
                                placeholder="Informe detalhadamente o porquê desta conta não ser válida..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="bg-white border-rose-200 focus:border-rose-500 text-slate-800 text-xs"
                                rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                    onClick={() => setShowRejectionForm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-sm shadow-rose-600/10"
                                    onClick={handleReject}
                                    disabled={isRejecting}
                                >
                                    {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    Confirmar Rejeição
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between items-center w-full gap-2 border-t pt-4 mt-2">
                    {!showRejectionForm && (
                        <>
                            <Button 
                                variant="ghost" 
                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-3 w-full sm:w-auto"
                                onClick={() => setShowRejectionForm(true)}
                                disabled={isApproving || isRejecting}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto flex-1 justify-end">
                                <Button 
                                    variant="outline" 
                                    onClick={() => onOpenChange(false)} 
                                    disabled={isApproving || isRejecting}
                                    className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                                >
                                    Fechar
                                </Button>
                                <Button 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-initial shadow-md shadow-indigo-600/10 border-0"
                                    onClick={handleApprove}
                                    disabled={isApproving || !request.new_iban || (!termoAssinadoUrl && !termoGeradoUrl)}
                                >
                                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                    Aprovar e Ativar IBAN
                                </Button>
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
