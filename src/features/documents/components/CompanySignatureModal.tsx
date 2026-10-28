import React, { useState, useRef, useEffect } from 'react';
import { documentGeneratorService, type GeneratedDocument } from '../services/documentGeneratorService';
import { X, PenTool, CheckCircle2, RotateCcw, Loader2, ShieldCheck, Building2, FileUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CompanySignatureModalProps {
    isOpen: boolean;
    doc: GeneratedDocument | null;
    onClose: () => void;
    onSignedSuccess: (updatedDoc: GeneratedDocument) => void;
}

export const CompanySignatureModal: React.FC<CompanySignatureModalProps> = ({
    isOpen,
    doc,
    onClose,
    onSignedSuccess
}) => {
    const [signerName, setSignerName] = useState('Emmanuel de Lima Maciel');
    const [signerRole, setSignerRole] = useState('Representante Legal');
    const [sigType, setSigType] = useState<'draw' | 'type' | 'upload'>('draw');
    const [typedText, setTypedText] = useState('Emmanuel de Lima Maciel');
    const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);
    const [removeStaticImg, setRemoveStaticImg] = useState(true);
    const [replacementDocx, setReplacementDocx] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Canvas drawing states
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (isOpen && doc) {
            setSignerName(doc.company_signed_by_name || doc.custom_data?.company_signed_by_name || 'Emmanuel de Lima Maciel');
            setSignerRole(doc.company_signed_role || doc.custom_data?.company_signed_role || 'Representante Legal');
            setTypedText(doc.company_signed_by_name || 'Emmanuel de Lima Maciel');
            setReplacementDocx(null);
            setRemoveStaticImg(true);
            setHasSignature(false);
        }
    }, [isOpen, doc]);

    if (!isOpen || !doc) return null;

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasSignature(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const endDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasSignature(false);
    };

    const generateTypedSignatureDataUrl = (text: string): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'italic bold 38px "Brush Script MT", "Dancing Script", "Caveat", cursive, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text || 'Assinatura', canvas.width / 2, canvas.height / 2 - 10);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60, canvas.height / 2 + 25);
        ctx.lineTo(canvas.width - 60, canvas.height / 2 + 25);
        ctx.stroke();

        return canvas.toDataURL('image/png');
    };

    const handleConfirmCompanySignature = async () => {
        if (!signerName.trim()) {
            toast.error('Informe o nome do representante da empresa.');
            return;
        }

        let finalDataUrl = '';

        if (sigType === 'draw') {
            if (!hasSignature || !canvasRef.current) {
                toast.error('Desenhe a assinatura da empresa no quadro abaixo.');
                return;
            }
            finalDataUrl = canvasRef.current.toDataURL('image/png');
        } else if (sigType === 'type') {
            if (!typedText.trim()) {
                toast.error('Digite o nome ou texto da assinatura.');
                return;
            }
            finalDataUrl = generateTypedSignatureDataUrl(typedText.trim());
        } else if (sigType === 'upload') {
            if (!uploadedImgUrl) {
                toast.error('Faça o upload de uma imagem de assinatura.');
                return;
            }
            finalDataUrl = uploadedImgUrl;
        }

        setSubmitting(true);
        try {
            const updated = await documentGeneratorService.submitCompanySignature(doc, {
                signedByName: signerName.trim(),
                signedRole: signerRole.trim(),
                signatureDataUrl: finalDataUrl,
                removeStaticSignatureFromDocx: removeStaticImg,
                replacementDocxFile: replacementDocx
            });

            toast.success('Assinatura eletrônica da Empresa registrada com sucesso!');
            onSignedSuccess(updated);
            onClose();
        } catch (err: any) {
            console.error('Error submitting company signature:', err);
            toast.error('Erro ao salvar assinatura da empresa: ' + (err?.message || err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200 my-8">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                    Assinatura Bilateral OCT
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-white mt-0.5">
                                Assinar Eletronicamente pela Empresa (Prestadora)
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {/* Contract Info & Client Signature Preservation Banner */}
                    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase font-bold text-slate-400">Contrato Selecionado</p>
                            <p className="text-sm font-bold text-white">{doc.title}</p>
                        </div>
                        {doc.signature_status === 'signed' ? (
                            <div className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold shrink-0">
                                <CheckCircle2 size={15} className="text-emerald-400" />
                                <span>Cliente já assinou ({doc.signed_by_name}) — Mantida!</span>
                            </div>
                        ) : (
                            <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-300 text-xs font-bold shrink-0">
                                <span>Cliente ainda não assinou (Assinatura prévia da Empresa)</span>
                            </div>
                        )}
                    </div>

                    {/* Signer Name and Role */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                                Nome do Signatário (Sua Empresa) *
                            </label>
                            <input
                                type="text"
                                value={signerName}
                                onChange={e => {
                                    setSignerName(e.target.value);
                                    if (sigType === 'type') setTypedText(e.target.value);
                                }}
                                placeholder="Ex: Emmanuel de Lima Maciel"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                                Cargo / Qualidade
                            </label>
                            <input
                                type="text"
                                value={signerRole}
                                onChange={e => setSignerRole(e.target.value)}
                                placeholder="Ex: Administrador / Representante Legal"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Signature Mode Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-300 uppercase block mb-2">
                            Escolha como deseja assinar eletronicamente:
                        </label>
                        <div className="flex flex-wrap gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSigType('draw')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${sigType === 'draw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                ✍️ Desenhar Assinatura
                            </button>
                            <button
                                type="button"
                                onClick={() => setSigType('type')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${sigType === 'type' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                ⌨️ Digitar Nome (Cursiva)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSigType('upload')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${sigType === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                📁 Subir Imagem / Carimbo
                            </button>
                        </div>
                    </div>

                    {/* MODE 1: DRAW */}
                    {sigType === 'draw' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <PenTool size={13} className="text-blue-400" />
                                    Desenhe sua rubrica ou assinatura no quadro abaixo:
                                </span>
                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg"
                                >
                                    <RotateCcw size={12} /> Limpar Quadro
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-slate-400 shadow-inner">
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={200}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={endDrawing}
                                    onMouseLeave={endDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={endDrawing}
                                    style={{ touchAction: 'none' }}
                                    className="w-full h-44 cursor-crosshair block"
                                />
                            </div>
                        </div>
                    )}

                    {/* MODE 2: TYPE */}
                    {sigType === 'type' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-300 uppercase block">
                                Texto da Assinatura Cursiva *
                            </label>
                            <input
                                type="text"
                                value={typedText}
                                onChange={e => setTypedText(e.target.value)}
                                placeholder="Ex: Emmanuel de Lima Maciel"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="bg-white rounded-xl p-5 border-2 border-dashed border-slate-400 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Pré-visualização da Assinatura Eletrônica:</p>
                                <div className="font-serif italic text-3xl text-slate-900 tracking-wide font-extrabold py-2 border-b-2 border-slate-300 inline-block px-8">
                                    {typedText.trim() || 'Sua Assinatura'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE 3: UPLOAD */}
                    {sigType === 'upload' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-300 uppercase block">
                                Selecione a Imagem da Assinatura ou Carimbo (.PNG / .JPG) *
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => {
                                            setUploadedImgUrl(ev.target?.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="w-full bg-slate-950 text-slate-300 border border-slate-700 rounded-xl p-2.5 text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                            />
                            {uploadedImgUrl && (
                                <div className="bg-white rounded-xl p-4 text-center border-2 border-dashed border-slate-400">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Imagem Carregada:</p>
                                    <img src={uploadedImgUrl} alt="Preview Assinatura Empresa" className="max-h-24 mx-auto object-contain" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Automatic DOCX Static Image Removal & Optional Manual DOCX Replacement */}
                    <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-4 space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={removeStaticImg}
                                onChange={e => setRemoveStaticImg(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="text-xs">
                                <span className="font-bold text-blue-200 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-blue-400" />
                                    Substituir automaticamente a imagem fixa do Word (.docx) pela Assinatura Eletrônica
                                </span>
                                <p className="text-slate-400 mt-0.5 leading-relaxed">
                                    Remove a figura antiga da assinatura que estava colada no Word e insere esta nova assinatura eletrônica (mantendo a assinatura do cliente e o mesmo link).
                                </p>
                            </div>
                        </label>

                        <div className="pt-2 border-t border-slate-800/80">
                            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                                <FileUp size={13} className="text-amber-400" />
                                Ou subir um novo arquivo Word (.docx) atualizado para este contrato (Opcional):
                            </label>
                            <input
                                type="file"
                                accept=".docx"
                                onChange={e => setReplacementDocx(e.target.files?.[0] || null)}
                                className="w-full bg-slate-950/90 text-slate-300 border border-slate-700 rounded-xl p-2 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                        <span>Gera selo jurídico eletrônico da Empresa no Termo OCT do PDF.</span>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmCompanySignature}
                            disabled={submitting}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            Confirmar Assinatura da Empresa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
