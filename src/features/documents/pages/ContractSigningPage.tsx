import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { supabase } from '@/shared/supabase/client';
import { getContractByToken, signContract, type Contract } from '../api/contractsApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';

export function ContractSigningPage() {
    const { token } = useParams<{ token: string }>();
    const docContainerRef = useRef<HTMLDivElement>(null);
    const [contract, setContract] = useState<Contract | null>(null);
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // OTP Modal states
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Audit data
    const [ipInfo, setIpInfo] = useState({ ip: '0.0.0.0', ua: navigator.userAgent });

    // 1. Carregar detalhes do contrato e arquivo
    useEffect(() => {
        if (!token) return;

        // Capturar IP
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpInfo(prev => ({ ...prev, ip: data.ip })))
            .catch(() => console.warn("Não foi possível detectar o IP. Usando padrão."));

        async function loadContractData() {
            try {
                setLoading(true);
                const data = await getContractByToken(token!);
                setContract(data);

                if (data.status === 'signed') {
                    setSuccess(true);
                }

                if (data.document_url) {
                    console.log("Baixando documento:", data.document_url);
                    const { data: fileData, error: fileErr } = await supabase.storage
                        .from('worker-contracts')
                        .download(data.document_url);

                    if (fileErr) throw fileErr;
                    setFileBlob(fileData);
                }
            } catch (err: any) {
                console.error("Erro ao carregar contrato:", err);
                toast.error("Contrato inválido, expirado ou não encontrado.");
            } finally {
                setLoading(false);
            }
        }

        loadContractData();
    }, [token]);

    // 2. Renderizar o arquivo .docx usando docx-preview
    useEffect(() => {
        if (fileBlob && docContainerRef.current) {
            console.log("Renders docx preview...");
            docContainerRef.current.innerHTML = "";
            renderAsync(fileBlob, docContainerRef.current, undefined, {
                className: "docx-document",
                inWrapper: false,
                ignoreWidth: true,
                ignoreHeight: true,
            })
            .catch(err => {
                console.error("Falha ao renderizar visualização do docx:", err);
            });
        }
    }, [fileBlob]);

    // 3. Gerenciar mudança no campo OTP
    const handleOtpChange = (index: number, val: string) => {
        if (!/^\d*$/.test(val)) return; // Apenas números
        
        const newOtp = [...otpValues];
        newOtp[index] = val.slice(-1); // Apenas último dígito
        setOtpValues(newOtp);

        // Avançar foco
        if (val && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // 4. Executar a assinatura com OTP
    const handleSignContract = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length < 6) {
            toast.error("Por favor, insira o código OTP de 6 dígitos.");
            return;
        }

        try {
            setSigning(true);
            await signContract({
                token: token!,
                otp_code: otpCode,
                ip_address: ipInfo.ip,
                user_agent: ipInfo.ua
            });

            toast.success("Contrato assinado eletronicamente com sucesso!");
            setSuccess(true);
            setOtpModalOpen(false);
            if (contract) {
                setContract({ ...contract, status: 'signed' });
            }
        } catch (err: any) {
            console.error("Erro na assinatura:", err);
            toast.error(err.message || "Código incorreto ou expirado. Tente novamente.");
        } finally {
            setSigning(false);
        }
    };

    // 5. Baixar cópia do contrato
    const handleDownloadCopy = () => {
        if (!fileBlob) return;
        const url = window.URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contract?.contract_type || 'contrato'}_assinado.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">Carregando visualizador de contratos...</p>
            </div>
        );
    }

    if (!contract || !fileBlob) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Contrato Inexistente ou Expirado</h1>
                <p className="text-slate-400 max-w-md">O link de assinatura utilizado é inválido ou já expirou. Entre em contato com a equipe de RH para solicitar um novo link.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header Superior */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Assinatura Digital de Contrato</h1>
                        <p className="text-xs text-slate-400">Mastercorp Ecosystem</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {success ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> Assinado Digitalmente
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <Lock className="h-4 w-4" /> Aguardando Assinatura
                        </div>
                    )}
                </div>
            </header>

            {/* Layout Lateral / Principal */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualizador de Contrato */}
                <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-4xl bg-white text-slate-950 p-6 md:p-12 shadow-2xl rounded-xl border border-slate-200 overflow-x-auto min-h-[842px] docx-preview-container">
                        <div ref={docContainerRef} className="docx-wrapper" />
                    </div>
                </main>

                {/* Sidebar com Controles de Assinatura */}
                <aside className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-6">
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Informações Cadastrais</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="text-slate-400 text-xs block">Nome Completo</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.nome}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">Documento de Identidade</label>
                                    <span className="font-semibold text-slate-200 block">
                                        {contract.worker?.nif || contract.worker?.dni || contract.worker?.nie || contract.worker?.pasaporte}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">Contratante (Empresa)</label>
                                    <span className="font-semibold text-slate-200 block">{contract.contratante}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">E-mail Cadastrado</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-950/30 rounded-xl p-4 border border-indigo-500/20 text-indigo-300 text-xs space-y-2">
                            <p className="font-semibold flex items-center gap-1.5 text-indigo-200">
                                <Lock className="h-3.5 w-3.5" /> Assinatura Digital Certificada
                            </p>
                            <p>Ao assinar eletronicamente este documento, você concorda com a validade jurídica plena desta assinatura sob as diretrizes do regulamento europeu eIDAS.</p>
                            <p>O processo registrará seu IP, data/hora e o código OTP enviado ao seu e-mail cadastrado.</p>
                        </div>
                    </div>

                    <div className="pt-6 space-y-3">
                        {success ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handleDownloadCopy}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl border border-slate-700 transition duration-150"
                                >
                                    <Download className="h-4 w-4" /> Baixar Cópia Assinada
                                </button>
                                <div className="text-center text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-850">
                                    <span className="block font-semibold text-emerald-500">Documento Assinado!</span>
                                    IP: {ipInfo.ip} <br />
                                    Data: {new Date(contract.signed_at || '').toLocaleString('pt-PT')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setOtpModalOpen(true)}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition duration-150 text-center"
                            >
                                Assinar Contrato
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">Dispositivo conectado via IP: {ipInfo.ip}</p>
                    </div>
                </aside>
            </div>

            {/* Modal de Digitação de OTP */}
            {otpModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                            <Smartphone className="h-5 w-5 text-indigo-400" /> Confirmar Identidade
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Enviamos um código de verificação OTP de 6 dígitos para o e-mail <strong>{contract.worker?.email}</strong>. Digite-o abaixo para assinar o documento.
                        </p>

                        {/* Campos OTP */}
                        <div className="flex justify-center gap-2.5 mb-6">
                            {otpValues.map((val, idx) => (
                                <input
                                    key={idx}
                                    ref={el => { otpRefs.current[idx] = el; }}
                                    type="text"
                                    maxLength={1}
                                    value={val}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    className="w-12 h-14 bg-slate-950 border border-slate-800 text-center text-xl font-bold text-indigo-400 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            ))}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setOtpModalOpen(false)}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSignContract}
                                disabled={signing}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Assinando...
                                    </>
                                ) : (
                                    "Confirmar Assinatura"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
