import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { supabase } from '@/shared/supabase/client';
import { getProposalByToken, signProposal, type ProposalSignature } from '../api/proposalsApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, AlertTriangle, Download, PenTool, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProposalSigningPage() {
    const { token } = useParams<{ token: string }>();
    const docContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [proposal, setProposal] = useState<ProposalSignature | null>(null);
    const [proposalBlob, setProposalBlob] = useState<Blob | null>(null);
    const [contractBlob, setContractBlob] = useState<Blob | null>(null);
    const [activeTab, setActiveTab] = useState<'proposal' | 'contract'>('proposal');
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Canvas drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    
    // OTP Modal states
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Audit data
    const [ipInfo, setIpInfo] = useState({ ip: '0.0.0.0', ua: navigator.userAgent });

    // 1. Carregar detalhes da proposta e arquivo
    useEffect(() => {
        if (!token) return;

        // Capturar IP público do assinante
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpInfo(prev => ({ ...prev, ip: data.ip })))
            .catch(() => console.warn("Não foi possível detectar o IP. Usando padrão."));

        async function loadProposalData() {
            try {
                setLoading(true);
                const data = await getProposalByToken(token!);
                setProposal(data);

                if (data.status === 'signed') {
                    setSuccess(true);
                }

                if (data.document_url) {
                    console.log("Baixando documento da proposta:", data.document_url);
                    const { data: fileData, error: fileErr } = await supabase.storage
                        .from('proposal-signatures')
                        .download(data.document_url);

                    if (fileErr) throw fileErr;
                    setProposalBlob(fileData);
                }

                if (data.contract_document_url) {
                    console.log("Baixando documento do contrato:", data.contract_document_url);
                    const { data: contractData, error: contractErr } = await supabase.storage
                        .from('proposal-signatures')
                        .download(data.contract_document_url);

                    if (!contractErr && contractData) {
                        setContractBlob(contractData);
                    } else {
                        console.warn("Contrato não encontrado ou erro no download:", contractErr);
                    }
                }
            } catch (err: any) {
                console.error("Erro ao carregar proposta:", err);
                toast.error("Proposta inválida, expirada ou não encontrada.");
            } finally {
                setLoading(false);
            }
        }

        loadProposalData();
    }, [token]);

    // 2. Renderizar o arquivo .docx ativo usando docx-preview
    const activeBlob = activeTab === 'proposal' ? proposalBlob : contractBlob;
    useEffect(() => {
        if (activeBlob && docContainerRef.current) {
            console.log(`Renderizando docx da ${activeTab === 'proposal' ? 'proposta' : 'contrato'}...`);
            docContainerRef.current.innerHTML = "";
            renderAsync(activeBlob, docContainerRef.current, undefined, {
                className: "docx-document",
                inWrapper: false,
                ignoreWidth: true,
                ignoreHeight: true,
            })
            .catch(err => {
                console.error("Falha ao renderizar visualização do docx:", err);
            });
        }
    }, [activeBlob, activeTab, loading]);

    // 3. Inicializar e redimensionar o canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Ajustar resolução interna do canvas para bater com o tamanho exibido na tela
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 180;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Preencher o fundo do canvas com branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#0f172a'; // Cor escura (Navy/Slate) para simular caneta
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [proposal, success]); // Recriar se o layout mudar devido ao sucesso/dados carregados

    // 4. Lógica de Desenho no Canvas (Touch & Mouse)
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if ('touches' in e) {
            // Prevenir comportamento de scroll do mobile enquanto desenha
            if (e.cancelable) e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        if ('touches' in e) {
            if (e.cancelable) e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSigned(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    // 5. Gerenciar código OTP
    const handleOtpChange = (index: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        
        const newOtp = [...otpValues];
        newOtp[index] = val.slice(-1);
        setOtpValues(newOtp);

        if (val && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').trim();
        if (!/^\d{6}$/.test(text)) {
            toast.error("Por favor, cole um código válido com 6 números.");
            return;
        }
        
        const digits = text.split('');
        setOtpValues(digits);
        otpRefs.current[5]?.focus();
    };

    // 6. Enviar Assinatura
    const handleOpenSignatureConfirmation = () => {
        if (!hasSigned) {
            toast.error("Por favor, desenhe sua assinatura no campo indicado.");
            return;
        }
        setOtpModalOpen(true);
    };

    const handleSignProposal = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length < 6) {
            toast.error("Por favor, insira o código OTP de 6 dígitos.");
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const signatureImageBase64 = canvas.toDataURL('image/png');

        try {
            setSigning(true);
            await signProposal({
                token: token!,
                otp_code: otpCode,
                signature_image: signatureImageBase64,
                ip_address: ipInfo.ip,
                user_agent: ipInfo.ua
            });

            toast.success("Proposta assinada eletronicamente com sucesso!");
            setSuccess(true);
            setOtpModalOpen(false);
            if (proposal) {
                setProposal({ ...proposal, status: 'signed', signed_at: new Date().toISOString() });
            }
        } catch (err: any) {
            console.error("Erro na assinatura:", err);
            toast.error(err.message || "Código incorreto ou expirado. Tente novamente.");
        } finally {
            setSigning(false);
        }
    };

    // 7. Baixar Cópias
    const handleDownloadCopy = (type: 'proposal' | 'contract') => {
        const blob = type === 'proposal' ? proposalBlob : contractBlob;
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'proposal' 
            ? `proposta_${proposal?.estimacion?.codigo || 'comercial'}.docx`
            : `contrato_${proposal?.estimacion?.codigo || 'comercial'}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">Carregando visualizador de propostas...</p>
            </div>
        );
    }

    if (!proposal || (!proposalBlob && !contractBlob)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold mb-2">Proposta Inexistente ou Expirada</h1>
                <p className="text-slate-400 max-w-md">O link de assinatura utilizado é inválido ou já expirou. Entre em contato com a equipe comercial para solicitar um novo link.</p>
            </div>
        );
    }

    const clientOrLeadName = proposal.estimacion?.client?.trade_name || proposal.estimacion?.client?.legal_name || proposal.estimacion?.lead?.company_name || proposal.estimacion?.lead?.name || 'Cliente';
    const recipientEmail = proposal.estimacion?.contact_email || proposal.estimacion?.lead?.email || proposal.estimacion?.client?.email || '';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Header com Glassmorphism */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-base md:text-lg leading-tight">Assinatura Digital de Proposta</h1>
                        <p className="text-xs text-slate-400 font-medium">Estudo Comercial • {proposal.estimacion?.codigo}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {success ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
                            <CheckCircle2 className="h-4 w-4" /> Assinado Digitalmente
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
                            <Lock className="h-4 w-4" /> Aguardando Assinatura
                        </div>
                    )}
                </div>
            </header>

            {/* Layout Principal */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualizador de Documentos com Abas */}
                <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/40 border-r border-slate-900">
                    {/* Seletor de Abas Premium */}
                    <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex gap-4">
                        <button
                            onClick={() => setActiveTab('proposal')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                                activeTab === 'proposal'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                        >
                            <FileText className="h-4 w-4" /> 1. Proposta Comercial
                        </button>
                        {contractBlob && (
                            <button
                                onClick={() => setActiveTab('contract')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                                    activeTab === 'contract'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                            >
                                <PenTool className="h-4 w-4" /> 2. Contrato Comercial
                            </button>
                        )}
                    </div>
                    {/* Container de Exibição */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center docx-preview-container-parent">
                        <div className="w-full max-w-4xl bg-white text-slate-950 p-6 md:p-12 shadow-2xl rounded-2xl border border-slate-200 overflow-x-auto min-h-[842px] docx-preview-container">
                            <div ref={docContainerRef} className="docx-wrapper" />
                        </div>
                    </div>
                </main>

                {/* Painel Lateral com Canvas */}
                <aside className="w-full md:w-[420px] bg-slate-900/60 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800/80 shadow-xl">
                    <div className="space-y-6">
                        {/* Informações da Proposta */}
                        <div className="bg-slate-950/75 rounded-2xl p-5 border border-slate-800 shadow-inner space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-2">Detalhes do Destinatário</h3>
                            <div className="space-y-3.5 text-sm">
                                <div>
                                    <label className="text-slate-500 text-xs block font-medium">Organização / Empresa</label>
                                    <span className="font-semibold text-slate-200 block text-base mt-0.5">{clientOrLeadName}</span>
                                </div>
                                {proposal.estimacion?.contact_name && (
                                    <div>
                                        <label className="text-slate-500 text-xs block font-medium">Pessoa de Contato</label>
                                        <span className="font-semibold text-slate-200 block">{proposal.estimacion.contact_name}</span>
                                    </div>
                                )}
                                <div>
                                    <label className="text-slate-500 text-xs block font-medium">E-mail de Destino</label>
                                    <span className="font-semibold text-indigo-400 block break-all">{recipientEmail}</span>
                                </div>
                            </div>
                        </div>

                        {/* Informações Legais/eIDAS */}
                        <div className="bg-indigo-950/20 rounded-2xl p-5 border border-indigo-500/10 text-indigo-300 text-xs space-y-2.5 shadow-sm">
                            <p className="font-semibold flex items-center gap-1.5 text-indigo-200 text-sm">
                                <Lock className="h-4 w-4" /> Termos de Assinatura
                            </p>
                            <p className="leading-relaxed">
                                Ao assinar eletronicamente estes documentos, você concorda com o escopo, termos e tarifas descritos na proposta comercial e no contrato de serviços, com plena validade jurídica.
                            </p>
                            <p className="leading-relaxed">
                                O sistema registrará sua assinatura digital desenhada, endereço IP, carimbo de tempo e a validação por código OTP enviado ao seu e-mail para validar ambos os documentos simultaneamente.
                            </p>
                        </div>

                        {/* Campo de Assinatura Manual (Somente se não assinado) */}
                        {!success && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <PenTool className="h-3.5 w-3.5 text-indigo-400" /> Desenhe sua Assinatura
                                    </label>
                                    <button 
                                        onClick={clearCanvas}
                                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-500/10"
                                        title="Limpar assinatura atual"
                                    >
                                        <Trash2 className="h-3 w-3" /> Limpar
                                    </button>
                                </div>
                                
                                <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-white shadow-inner">
                                    <canvas
                                        ref={canvasRef}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-44 cursor-crosshair touch-none bg-white block"
                                    />
                                    {!hasSigned && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                                            Assine aqui com mouse ou tela touch
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 space-y-4">
                        {success ? (
                            <div className="space-y-3 animate-fade-in">
                                <button
                                    onClick={() => handleDownloadCopy('proposal')}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl border border-slate-800 transition duration-150 shadow-md text-xs"
                                >
                                    <Download className="h-4 w-4" /> Baixar Proposta Comercial
                                </button>
                                {contractBlob && (
                                    <button
                                        onClick={() => handleDownloadCopy('contract')}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl border border-slate-800 transition duration-150 shadow-md text-xs"
                                    >
                                        <Download className="h-4 w-4" /> Baixar Contrato Comercial
                                    </button>
                                )}
                                <div className="text-center text-[11px] text-slate-500 bg-slate-950/85 p-3 rounded-xl border border-slate-800">
                                    <span className="block font-bold text-emerald-400 text-xs mb-1">✓ Documentos Assinados!</span>
                                    IP de Assinatura: {ipInfo.ip} <br />
                                    Data/Hora: {new Date(proposal.signed_at || '').toLocaleString('pt-PT')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleOpenSignatureConfirmation}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transform hover:-translate-y-0.5 transition duration-150 text-center text-sm tracking-wide"
                            >
                                Assinar Proposta e Contrato
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">Conexão identificada pelo IP: {ipInfo.ip}</p>
                    </div>
                </aside>
            </div>

            {/* Modal de Confirmação com OTP */}
            {otpModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                            <Smartphone className="h-5 w-5 text-indigo-400" /> Confirmar Código de Segurança
                        </h2>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Enviamos um código de segurança de 6 dígitos para o e-mail cadastrado <strong>{recipientEmail}</strong>. Digite-o abaixo para concluir o processo de assinatura.
                        </p>

                        {/* Inputs do OTP */}
                        <div className="flex justify-center gap-2 mb-6">
                            {otpValues.map((val, idx) => (
                                <input
                                    key={idx}
                                    ref={el => { otpRefs.current[idx] = el; }}
                                    type="text"
                                    maxLength={1}
                                    pattern="\d*"
                                    inputMode="numeric"
                                    value={val}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                                    className="w-11 h-14 bg-slate-950 border border-slate-800 text-center text-xl font-bold text-indigo-400 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                                />
                            ))}
                        </div>

                        {/* Ações do Modal */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setOtpModalOpen(false)}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-800 transition text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSignProposal}
                                disabled={signing}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Processando...
                                    </>
                                ) : (
                                    "Confirmar e Assinar"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
