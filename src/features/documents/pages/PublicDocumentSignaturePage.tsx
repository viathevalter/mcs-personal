import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { documentGeneratorService, type GeneratedDocument } from '../services/documentGeneratorService';
import { FileText, CheckCircle2, Loader2, Download, PenTool, RotateCcw, Lock } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { toast } from 'sonner';

export const PublicDocumentSignaturePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [doc, setDoc] = useState<GeneratedDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [signerName, setSignerName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Canvas Signature State
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const docContainerRef = useRef<HTMLDivElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (token) {
            loadDocument();
        }
    }, [token]);

    const loadDocument = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const found = await documentGeneratorService.getByToken(token!);
            if (!found) {
                setErrorMsg('Documento não encontrado ou link inválido.');
            } else {
                setDoc(found);
                if (found.document_url) {
                    renderDocxPreview(found.document_url);
                }
            }
        } catch (e: any) {
            setErrorMsg('Erro ao carregar documento: ' + (e?.message || e));
        } finally {
            setLoading(false);
        }
    };

    const renderDocxPreview = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            if (docContainerRef.current) {
                docContainerRef.current.innerHTML = '';
                await renderAsync(blob, docContainerRef.current);
            }
        } catch (err) {
            console.warn('Docx preview failed to render visually:', err);
        }
    };

    // --- CANVAS SIGNATURE DRAWING HANDLERS ---
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setHasSignature(true);

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
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

    const handleConfirmSignature = async () => {
        if (!signerName.trim()) {
            toast.error('Informe seu nome completo para assinar.');
            return;
        }
        if (!hasSignature || !canvasRef.current) {
            toast.error('Por favor, desenhe sua assinatura no quadro.');
            return;
        }

        const dataUrl = canvasRef.current.toDataURL('image/png');
        setSubmitting(true);
        try {
            const updated = await documentGeneratorService.submitSignature(token!, {
                signedByName: signerName,
                signatureDataUrl: dataUrl
            });
            setDoc(updated);
            toast.success('Assinatura colhida com sucesso!');
        } catch (err: any) {
            toast.error('Erro ao salvar assinatura: ' + (err?.message || err));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <Loader2 size={36} className="animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-semibold">Carregando portal de assinatura digital...</p>
            </div>
        );
    }

    if (errorMsg || !doc) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="p-8 max-w-md bg-slate-800 border border-slate-700 rounded-3xl text-center space-y-4 shadow-2xl">
                    <Lock size={48} className="text-amber-400 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Documento Indisponível</h2>
                    <p className="text-xs text-slate-400">{errorMsg || 'Token inválido'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Top Bar */}
            <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md">
                        MCS
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white">Portal de Assinatura Digital</h1>
                        <p className="text-[11px] text-slate-400">Mastercorp Digital Documents Signature</p>
                    </div>
                </div>
                <div>
                    <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 text-slate-200 transition-all"
                    >
                        <Download size={14} /> Baixar Original
                    </a>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
                {/* Title Banner */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {doc.target_type === 'worker' ? 'Documento de Trabalhador' : 'Documento Comercial'}
                        </span>
                        <h2 className="text-lg md:text-xl font-bold text-white mt-2">
                            {doc.title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {doc.signature_status === 'signed' ? (
                            <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-2">
                                <CheckCircle2 size={16} /> Documento Assinado
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-2">
                                <PenTool size={16} /> Aguardando Assinatura
                            </div>
                        )}
                    </div>
                </div>

                {/* Doc Preview Canvas / Text */}
                <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl min-h-[400px] border border-slate-200 overflow-auto">
                    <div ref={docContainerRef} className="docx-preview-container">
                        <div className="text-center py-12 text-slate-400">
                            <FileText size={48} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm font-semibold">Visualizando Documento Word</p>
                            <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline font-bold mt-2 inline-block"
                            >
                                Clique aqui para baixar o arquivo completo (.docx)
                            </a>
                        </div>
                    </div>
                </div>

                {/* SIGNATURE SECTION */}
                {doc.signature_status === 'signed' ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                        <CheckCircle2 size={48} className="text-emerald-400 mx-auto animate-bounce" />
                        <h3 className="text-lg font-bold text-white">Este documento já foi assinado com sucesso!</h3>
                        <p className="text-xs text-slate-400">
                            Assinado por <strong className="text-white">{doc.signed_by_name}</strong> em{' '}
                            {doc.signed_at ? new Date(doc.signed_at).toLocaleString('pt-BR') : ''}.
                        </p>
                        {doc.signature_url && (
                            <div className="p-4 bg-white rounded-xl inline-block border border-slate-200">
                                <img src={doc.signature_url} alt="Assinatura" className="max-h-24 mx-auto object-contain" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                            <PenTool size={24} className="text-blue-400" />
                            <div>
                                <h3 className="text-base font-bold text-white">Assinar Digitalmente</h3>
                                <p className="text-xs text-slate-400">Desenhe sua assinatura no quadro abaixo e confirme.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                                Nome Completo do Signatário *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Digite seu nome completo como no documento"
                                value={signerName}
                                onChange={e => setSignerName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-300 uppercase">
                                    Quadro de Assinatura (Desenhe com o Dedo ou Mouse) *
                                </label>
                                <button
                                    onClick={clearCanvas}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                    <RotateCcw size={12} /> Limpar
                                </button>
                            </div>

                            <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-slate-500 touch-none">
                                <canvas
                                    ref={canvasRef}
                                    width={700}
                                    height={180}
                                    className="w-full h-44 cursor-crosshair bg-white"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={handleConfirmSignature}
                                disabled={submitting}
                                className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Confirmar e Assinar Documento
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
