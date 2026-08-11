import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/shared/supabase/client';
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
    Upload, Eye, Trash2, ArrowRight, Info, ShieldCheck, Copy, Share2,
    Save, RefreshCw, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import type { IbanChangeRequest } from '../api/ibanRequestsApi';
import { getIbanRequestFileUrl, updateIbanRequestUrls } from '../api/ibanRequestsApi';
import { 
    useApproveIbanRequest, 
    useRejectIbanRequest, 
    useUploadIbanRequestFile, 
    useSetIbanRequestAwaitingSignature,
    useUpdateIbanRequestData
} from '../hooks/useIbanRequests';

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
    const { mutateAsync: setAwaitingSignature, isPending: isSettingAwaitingSig } = useSetIbanRequestAwaitingSignature();
    const { mutateAsync: updateRequestData, isPending: isUpdatingData } = useUpdateIbanRequestData();

    // Editable fields
    const [editableBanco, setEditableBanco] = useState(request.new_banco || '');
    const [editableIban, setEditableIban] = useState(request.new_iban || '');
    const [hasDataChanged, setHasDataChanged] = useState(false);

    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    
    // File URLs
    const [termoGeradoUrl, setTermoGeradoUrl] = useState<string | null>(request.termo_gerado_url);
    const [termoAssinadoUrl, setTermoAssinadoUrl] = useState<string | null>(request.termo_assinado_url);

    // Media Viewer State
    const [activeTabDoc, setActiveTabDoc] = useState<'iban_photo' | 'comprovante' | 'termo_assinado'>('iban_photo');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isUploadingTermo, setIsUploadingTermo] = useState(false);

    const termoInputRef = useRef<HTMLInputElement>(null);

    // Track input edits
    useEffect(() => {
        setEditableBanco(request.new_banco || '');
        setEditableIban(request.new_iban || '');
        setTermoGeradoUrl(request.termo_gerado_url);
        setTermoAssinadoUrl(request.termo_assinado_url);
        setHasDataChanged(false);
    }, [request]);

    const handleBancoChange = (val: string) => {
        setEditableBanco(val);
        setHasDataChanged(true);
    };

    const handleIbanChange = (val: string) => {
        setEditableIban(val.toUpperCase());
        setHasDataChanged(true);
    };

    // Load Document Preview URL for the selected tab
    useEffect(() => {
        let isMounted = true;
        
        async function loadDocPreview() {
            let path: string | null = null;
            if (activeTabDoc === 'iban_photo') path = request.iban_photo_url;
            else if (activeTabDoc === 'comprovante') path = request.comprovante_url;
            else if (activeTabDoc === 'termo_assinado') path = termoAssinadoUrl || termoGeradoUrl;

            if (!path) {
                setPreviewUrl(null);
                return;
            }

            setIsLoadingPreview(true);
            try {
                const url = await getIbanRequestFileUrl(path);
                if (isMounted) setPreviewUrl(url);
            } catch (err) {
                console.error("Error loading preview URL:", err);
                if (isMounted) setPreviewUrl(null);
            } finally {
                if (isMounted) setIsLoadingPreview(false);
            }
        }

        loadDocPreview();

        return () => {
            isMounted = false;
        };
    }, [activeTabDoc, request, termoAssinadoUrl, termoGeradoUrl]);

    const maskIban = (iban: string | null | undefined) => {
        if (!iban) return '-';
        const clean = iban.replace(/\s+/g, '');
        if (clean.length < 8) return iban;
        const start = clean.substring(0, 4);
        const end = clean.substring(clean.length - 4);
        return `${start} •••• •••• •••• ${end}`;
    };

    const handleSaveManualEdits = async () => {
        if (!editableIban || editableIban.trim().length < 15) {
            toast.error('Por favor, insira um número de IBAN válido.');
            return;
        }

        try {
            await updateRequestData({
                id: request.id,
                data: {
                    new_banco: editableBanco,
                    new_iban: editableIban.replace(/\s+/g, '')
                },
                empresaId
            });

            setHasDataChanged(false);
            toast.success('Dados bancários atualizados e salvos com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar alterações.');
        }
    };

    // PDF Generation using jsPDF (Blank form for signing)
    const handleGeneratePdfAndAwaitingSignature = async () => {
        if (!request.worker) return;
        
        // Save edits first if modified
        if (hasDataChanged) {
            await handleSaveManualEdits();
        }

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

            // Logo Header
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
            doc.text(`Banco Destinatário:   ${editableBanco || request.new_banco || '-'}`, margin + 5, y + 16);
            doc.setFont('Helvetica', 'bold');
            doc.text(`IBAN da Conta:          ${editableIban || request.new_iban || '-'}`, margin + 5, y + 24);

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
            const pdfFile = new File([pdfOutput], `termo_autorizacao_gerado_${request.token}.pdf`, { type: 'application/pdf' });

            // Upload generated PDF to Supabase storage
            const path = await uploadFile({
                token: request.token,
                file: pdfFile,
                docType: 'termo_assinado'
            });

            // Set Request status to Awaiting Signature in DB
            await setAwaitingSignature({
                id: request.id,
                termoGeradoUrl: path,
                empresaId
            });

            setTermoGeradoUrl(path);
            toast.success('Termo de Autorização gerado com sucesso! Solicitação enviada para a fase de assinatura.');

        } catch (err) {
            console.error(err);
            toast.error('Erro ao gerar Termo em PDF.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Upload Signed Term (Fallback / Manual)
    const handleUploadSignedTerm = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo excede o limite de 10MB.');
            return;
        }

        setIsUploadingTermo(true);

        try {
            const path = await uploadFile({
                token: request.token,
                file,
                docType: 'termo_assinado'
            });

            const { error: statusErr } = await supabase
                .schema('core_personal')
                .from('iban_change_requests')
                .update({
                    status: 'assinado',
                    termo_assinado_url: path,
                    updated_at: new Date().toISOString()
                })
                .eq('id', request.id);

            if (statusErr) throw statusErr;

            setTermoAssinadoUrl(path);
            setActiveTabDoc('termo_assinado');
            toast.success('Termo assinado anexado manualmente!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar termo assinado.');
        } finally {
            setIsUploadingTermo(false);
        }
    };

    const handleCopySigningLink = () => {
        const link = `${window.location.origin}/public/assinar-iban/${request.token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link de assinatura digital copiado!');
    };

    const handleSendWhatsApp = () => {
        const link = `${window.location.origin}/public/assinar-iban/${request.token}`;
        const message = `Olá ${request.worker?.nome}, o seu Termo de Autorização para alteração de IBAN (Banco: ${editableBanco || request.new_banco}) já foi gerado. Por favor, acesse o link abaixo para desenhar sua assinatura digital e confirmar a alteração:\n\n${link}`;
        
        let phone = request.worker?.movil || '';
        phone = phone.replace(/\D/g, ''); // Keep only numbers
        
        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleApprove = async () => {
        if (isSubmittingApproval || isApproving) return;

        if (hasDataChanged) {
            await handleSaveManualEdits();
        }

        const finalIban = editableIban || request.new_iban;
        const finalBanco = editableBanco || request.new_banco;

        if (!finalIban || !finalBanco) {
            toast.error('Dados bancários incompletos na solicitação.');
            return;
        }

        setIsSubmittingApproval(true);

        try {
            await approveRequest({
                id: request.id,
                workerId: request.worker_id,
                newIban: finalIban,
                newBanco: finalBanco,
                termoAssinadoUrl: termoAssinadoUrl || termoGeradoUrl,
                comprovanteUrl: request.comprovante_url,
                empresaId
            });

            toast.success('Alteração bancária aprovada e ativada com sucesso!');
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao aprovar solicitação.');
        } finally {
            setIsSubmittingApproval(false);
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

    const isPdfFile = (url: string | null) => {
        if (!url) return false;
        return url.toLowerCase().includes('.pdf') || url.includes('application/pdf');
    };

    return (
        <Dialog open={open} onOpenChange={isApproving || isRejecting || isSettingAwaitingSig ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-6xl bg-white max-h-[92vh] flex flex-col p-0 overflow-hidden">
                
                {/* Modal Header */}
                <DialogHeader className="p-5 border-b bg-slate-50/80 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-slate-900 text-lg font-bold flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                            Revisão e Validação de Troca de IBAN
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs mt-0.5">
                            Confera o documento enviado, audite a extração da IA e valide o novo IBAN para o trabalhador.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Main Split Layout Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-[550px]">
                    
                    {/* LEFT COLUMN: Media Viewer (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-950 flex flex-col border-r border-slate-800 p-4 min-h-[400px]">
                        
                        {/* Document Tabs */}
                        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-3">
                            <button
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                                    activeTabDoc === 'iban_photo' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                                onClick={() => setActiveTabDoc('iban_photo')}
                            >
                                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                Documento / Foto IBAN
                            </button>

                            <button
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                                    activeTabDoc === 'comprovante' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                                onClick={() => setActiveTabDoc('comprovante')}
                            >
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Comprovante Oficial
                            </button>

                            {(termoAssinadoUrl || termoGeradoUrl) && (
                                <button
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                                        activeTabDoc === 'termo_assinado' 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                    onClick={() => setActiveTabDoc('termo_assinado')}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                                    Termo de Autorização
                                </button>
                            )}
                        </div>

                        {/* Document Viewer Container */}
                        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden flex items-center justify-center relative p-2 min-h-[420px]">
                            {isLoadingPreview ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    <span className="text-xs">Carregando arquivo...</span>
                                </div>
                            ) : previewUrl ? (
                                isPdfFile(previewUrl) ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <iframe 
                                            src={`${previewUrl}#toolbar=0`} 
                                            className="w-full h-full min-h-[460px] rounded-lg border-0"
                                            title="Visualizador de PDF"
                                        />
                                        <div className="mt-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-7"
                                                onClick={() => window.open(previewUrl, '_blank')}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" /> Abrir PDF em Nova Guia
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center overflow-auto">
                                        <img 
                                            src={previewUrl} 
                                            alt="Documento do IBAN" 
                                            className="max-h-[480px] max-w-full object-contain rounded-lg shadow-xl"
                                        />
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                                    <FileText className="w-12 h-12 opacity-30 mb-2" />
                                    <p className="text-xs font-semibold text-slate-400">Nenhum documento anexado nesta categoria</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Selecione outra aba no topo para visualizar o comprovativo.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Form & Audit Controls (5 cols) */}
                    <div className="lg:col-span-5 p-5 overflow-y-auto space-y-5 bg-white flex flex-col justify-between">
                        
                        <div className="space-y-5">
                            
                            {/* Worker Header Card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Trabalhador Titular</span>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-bold text-slate-900 block">{request.worker?.nome}</span>
                                        <span className="text-xs font-mono text-slate-500">ID / Código: {request.worker?.cod_colab || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current IBAN vs Proposed Editable Form */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <Label className="text-slate-900 text-xs font-extrabold uppercase tracking-wider block">
                                        Dados Cadastrais Revisados
                                    </Label>
                                    {hasDataChanged && (
                                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                            Alterações pendentes
                                        </span>
                                    )}
                                </div>

                                {/* Bank Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_banco" className="text-slate-600 text-xs font-medium">Nome do Banco / Entidade</Label>
                                    <Input 
                                        id="edit_banco"
                                        value={editableBanco}
                                        onChange={(e) => handleBancoChange(e.target.value)}
                                        placeholder="Ex: Santander, BBVA, Wise..."
                                        className="bg-slate-50 border-slate-200 font-medium text-slate-900 h-9 text-xs"
                                    />
                                </div>

                                {/* IBAN Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_iban" className="text-slate-600 text-xs font-medium">Número de IBAN</Label>
                                    <Input 
                                        id="edit_iban"
                                        value={editableIban}
                                        onChange={(e) => handleIbanChange(e.target.value)}
                                        placeholder="Ex: ES41 0000..."
                                        className="bg-slate-50 border-slate-200 font-mono font-bold uppercase text-slate-900 h-9 text-xs"
                                    />
                                </div>

                                {/* Save Edit Action */}
                                {hasDataChanged && (
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={handleSaveManualEdits}
                                        disabled={isUpdatingData}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white border-0 text-xs h-8 shadow-sm"
                                    >
                                        {isUpdatingData ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                        Salvar Ajustes nos Dados
                                    </Button>
                                )}
                            </div>

                            {/* Current Registered Bank Details for Comparison */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
                                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">IBAN Cadastrado Anterior no Sistema</span>
                                <div className="flex justify-between font-mono text-slate-600 pt-0.5">
                                    <span>Banco: <strong className="text-slate-800 font-sans">{request.old_banco || '-'}</strong></span>
                                    <span>{maskIban(request.old_iban)}</span>
                                </div>
                            </div>

                            {/* DYNAMIC WORKFLOW ACCORDING TO STATUS */}
                            <div className="border-t pt-3 space-y-3">
                                <Label className="text-slate-900 text-xs font-bold uppercase tracking-wider block">Etapa de Assinatura</Label>
                                
                                {/* 1. STATUS: ENVIADO - NEED TO GENERATE THE TERM */}
                                {request.status === 'enviado' && (
                                    <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-3.5 space-y-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 mb-0.5 flex items-center gap-1.5">
                                                <Info className="w-4 h-4 text-indigo-500" />
                                                Passo 1: Gerar Termo de Autorização
                                            </h4>
                                            <p className="text-[10px] text-slate-500 leading-normal">
                                                Após conferir o documento à esquerda e validar os dados, clique abaixo para gerar o termo em PDF e liberar o link de assinatura do colaborador.
                                            </p>
                                        </div>
                                        <Button 
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full border-0 shadow-md text-xs h-9"
                                            onClick={handleGeneratePdfAndAwaitingSignature}
                                            disabled={isGeneratingPdf || isSettingAwaitingSig || !editableIban}
                                            size="sm"
                                        >
                                            {isGeneratingPdf || isSettingAwaitingSig ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <FileText className="w-4 h-4 mr-2" />
                                            )}
                                            Gerar Termo e Enviar para Assinatura
                                        </Button>
                                    </div>
                                )}

                                {/* 2. STATUS: AGUARDANDO ASSINATURA - LINK GENERATED, WAITING WORKER */}
                                {request.status === 'aguardando_assinatura' && (
                                    <div className="space-y-3">
                                        <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3.5 space-y-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-amber-800 mb-0.5 flex items-center gap-1.5">
                                                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                                                    Aguardando Assinatura Digital
                                                </h4>
                                                <p className="text-[10px] text-amber-700 leading-normal">
                                                    Envie o link para o trabalhador desenhar a assinatura no celular:
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 flex items-center justify-center gap-1 text-xs h-8"
                                                    onClick={handleCopySigningLink}
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Copiar Link
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 text-xs border-0 h-8 shadow-sm"
                                                    onClick={handleSendWhatsApp}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" /> WhatsApp
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 bg-slate-50/40 rounded-xl p-3 space-y-2">
                                            <h4 className="text-[11px] font-semibold text-slate-800">Carregar Termo Assinado Manualmente</h4>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                ref={termoInputRef}
                                                onChange={handleUploadSignedTerm}
                                                accept="application/pdf,image/png,image/jpeg,image/jpg"
                                            />
                                            <Button 
                                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 w-full text-xs h-8"
                                                onClick={() => termoInputRef.current?.click()}
                                                disabled={isUploadingTermo}
                                                size="sm"
                                                variant="outline"
                                            >
                                                {isUploadingTermo ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />}
                                                Carregar Documento Assinado
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 3. STATUS: ASSINADO - READY TO ACTIVATE */}
                                {request.status === 'assinado' && (
                                    <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 flex flex-col space-y-2">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <h4 className="text-xs font-bold text-emerald-800">
                                                    Termo Assinado Eletronicamente!
                                                </h4>
                                                <p className="text-[10px] text-emerald-700 leading-normal">
                                                    Assinatura registrada. Clique no botão de ativação abaixo para atualizar o cadastro.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* REJECTION FORM */}
                            {showRejectionForm && (
                                <div className="border-t pt-3 space-y-2.5 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                                    <Label htmlFor="rejection_reason" className="text-rose-900 text-xs font-bold uppercase tracking-wider block">Motivo da Rejeição</Label>
                                    <Textarea 
                                        id="rejection_reason" 
                                        placeholder="Informe o motivo..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="bg-white border-rose-200 focus:border-rose-500 text-slate-800 text-xs"
                                        rows={2}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="bg-white text-slate-600 text-xs h-7"
                                            onClick={() => setShowRejectionForm(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-7 border-0"
                                            onClick={handleReject}
                                            disabled={isRejecting}
                                        >
                                            {isRejecting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                                            Confirmar Rejeição
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Dialog Footer Actions */}
                        <div className="flex justify-between items-center border-t pt-3 mt-4 gap-2">
                            {!showRejectionForm && (
                                <>
                                    {request.status !== 'aprovado' && request.status !== 'rejeitado' ? (
                                        <Button 
                                            variant="ghost" 
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-3 text-xs h-9"
                                            onClick={() => setShowRejectionForm(true)}
                                            disabled={isApproving || isRejecting}
                                        >
                                            <XCircle className="w-4 h-4 mr-1.5" />
                                            Rejeitar
                                        </Button>
                                    ) : (
                                        <div />
                                    )}

                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => onOpenChange(false)} 
                                            disabled={isApproving || isRejecting}
                                            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs h-9"
                                        >
                                            Fechar
                                        </Button>
                                        
                                        {request.status !== 'aprovado' && request.status !== 'rejeitado' && (
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-0 text-xs h-9 px-4 font-semibold"
                                                onClick={handleApprove}
                                                disabled={isApproving || isSubmittingApproval || request.status !== 'assinado' || (!editableIban && !request.new_iban)}
                                            >
                                                {isApproving || isSubmittingApproval ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
                                                Aprovar e Ativar IBAN
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
