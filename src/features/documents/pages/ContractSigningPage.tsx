import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { supabase } from '@/shared/supabase/client';
import { getContractByToken, signContract, type Contract } from '../api/contractsApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

function adjustDocxPreviewSpacing(container: HTMLElement | null) {
    if (!container) return;
    const elements = container.querySelectorAll('*');
    elements.forEach((el: any) => {
        const text = (el.innerText || el.textContent || "").trim();
        if (text.length < 150 && (
            text.startsWith("Empresa:") || 
            text.startsWith("Nombre:") || 
            text.startsWith("Email:") ||
            text.startsWith("Cargo:") ||
            text.startsWith("NIF:") ||
            text.startsWith("Rua S. Tomé")
        )) {
            el.style.setProperty('margin-top', '0px', 'important');
            el.style.setProperty('margin-bottom', '0px', 'important');
            el.style.setProperty('padding-top', '0px', 'important');
            el.style.setProperty('padding-bottom', '0px', 'important');
            el.style.setProperty('line-height', '1.0', 'important');
        }
    });
}


export function ContractSigningPage() {
    const { token } = useParams<{ token: string }>();
    const { t, i18n } = useTranslation();
    const docContainerRef = useRef<HTMLDivElement>(null);
    const [contract, setContract] = useState<Contract | null>(null);
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [success, setSuccess] = useState(false);
    const [auditLog, setAuditLog] = useState<any | null>(null);
    
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
                    
                    // Buscar logs de auditoria
                    const { data: auditData } = await supabase
                        .schema('core_personal')
                        .from('contract_audit_logs')
                        .select('*')
                        .eq('contract_id', data.id)
                        .order('verified_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (auditData) {
                        setAuditLog(auditData);
                    }
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
                toast.error(t('signing.errorDescContract'));
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
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                useBase64URL: true,
            })
            .then(() => {
                adjustDocxPreviewSpacing(docContainerRef.current);
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
            toast.error(t('signing.toastOtpRequired'));
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

            toast.success(t('signing.toastSuccessContract'));
            setSuccess(true);
            setOtpModalOpen(false);
            
            // Recarregar os dados do contrato
            const updatedContract = await getContractByToken(token!);
            setContract(updatedContract);
            
            const { data: auditData } = await supabase
                .schema('core_personal')
                .from('contract_audit_logs')
                .select('*')
                .eq('contract_id', updatedContract.id)
                .order('verified_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (auditData) {
                setAuditLog(auditData);
            }
        } catch (err: any) {
            console.error("Erro na assinatura:", err);
            toast.error(err.message || t('signing.toastErrorFallback'));
        } finally {
            setSigning(false);
        }
    };

    // 5. Baixar PDF com Alta Fidelidade (via iframe print isolado)
    const handlePrintPdf = () => {
        const docElement = docContainerRef.current?.querySelector('.docx-document');
        if (!docElement) {
            toast.error(t('signing.errorNotRendered', { defaultValue: 'Documento não renderizado ainda.' }));
            return;
        }

        // Criar iframe oculto para impressão
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) return;

        // Clonar o elemento do documento
        const cloned = docElement.cloneNode(true) as HTMLElement;

        // Injetar estilos e conteúdo no iframe
        iframeDoc.write('<html><head><title>' + (contract?.contract_type || 'Contrato') + '</title>');
        
        // Copiar estilos da página principal
        const styles = document.querySelectorAll('link[rel="stylesheet"], style');
        styles.forEach(style => {
            iframeDoc.write(style.outerHTML);
        });

        // Adicionar estilos específicos de impressão
        iframeDoc.write(`
            <style>
                body {
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    font-family: sans-serif;
                }
                .docx-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    width: 100% !important;
                }
                .docx-document {
                    box-shadow: none !important;
                    border: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .print-signature-block {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e2e8f0;
                    page-break-inside: avoid;
                }
                @media print {
                    body { padding: 0 !important; }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
            </style>
        `);

        iframeDoc.write('</head><body>');
        iframeDoc.write('<div class="docx-wrapper">');
        iframeDoc.write(cloned.outerHTML);

        // Se estiver assinado, adicionar o carimbo de auditoria
        if (success && contract) {
            const auditIp = auditLog?.ip_address || ipInfo.ip;
            const auditDate = contract.signed_at 
                ? new Date(contract.signed_at).toLocaleString('pt-PT') 
                : new Date().toLocaleString('pt-PT');

            iframeDoc.write(`
                <div class="print-signature-block">
                    <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
                        Assinatura Eletrónica e Carimbo de Integridade (eIDAS)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #334155;">
                        <tr>
                            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Assinante</strong>
                                    <span style="font-weight: bold; font-size: 12px; color: #1e293b;">${contract.worker?.nome}</span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Documento de Identificação</strong>
                                    <span>${contract.worker?.nif || contract.worker?.dni || contract.worker?.nie || contract.worker?.pasaporte || '-'}</span>
                                </div>
                            </td>
                            <td style="width: 50%; vertical-align: top;">
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Contratante</strong>
                                    <span>${contract.contratante}</span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Metadados de Segurança</strong>
                                    <span style="font-family: monospace; font-size: 10px;">IP: ${auditIp}</span><br/>
                                    <span style="font-family: monospace; font-size: 10px;">Data: ${auditDate}</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <p style="font-size: 8.5px; color: #94a3b8; margin-top: 15px; line-height: 1.4;">
                        Este documento foi assinado eletronicamente em conformidade com o Regulamento (UE) nº 910/2014 (eIDAS). A autenticidade e integridade desta cópia são garantidas pelo carimbo de verificação de integridade OTP/SMS armazenado de forma permanente nos registos de auditoria do sistema.
                    </p>
                </div>
            `);
        }

        iframeDoc.write('</div></body></html>');
        iframeDoc.close();

        // Aguardar o carregamento e chamar a tela de impressão
        iframe.contentWindow?.focus();
        setTimeout(() => {
            iframe.contentWindow?.print();
            // Limpar iframe do DOM
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">{t('signing.loadingContract')}</p>
            </div>
        );
    }

    if (!contract || !fileBlob) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">{t('signing.errorTitleContract')}</h1>
                <p className="text-slate-400 max-w-md">{t('signing.errorDescContract')}</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
            <style>{`
                .docx-wrapper table p,
                .docx-wrapper table div,
                .docx-wrapper table td > * {
                    margin-top: 0px !important;
                    margin-bottom: 0px !important;
                    padding-top: 0px !important;
                    padding-bottom: 0px !important;
                    line-height: 1.0 !important;
                }
            `}</style>
            {/* Header Superior */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{t('signing.headerContract')}</h1>
                        <p className="text-xs text-slate-400">{t('signing.subtitleContract')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    {success ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> {t('signing.statusSigned')}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <Lock className="h-4 w-4" /> {t('signing.statusPending')}
                        </div>
                    )}
                </div>
            </header>

            {/* Layout Lateral / Principal */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualizador de Contrato */}
                <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-4xl overflow-x-auto docx-preview-container">
                        <div ref={docContainerRef} className="docx-wrapper" />
                    </div>
                </main>

                {/* Sidebar com Controles de Assinatura */}
                <aside className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-6">
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{t('signing.registrationInfo')}</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelFullName')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.nome}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelIdentity')}</label>
                                    <span className="font-semibold text-slate-200 block">
                                        {contract.worker?.nif || contract.worker?.dni || contract.worker?.nie || contract.worker?.pasaporte}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelContractor')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.contratante}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelRegisteredEmail')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-950/30 rounded-xl p-4 border border-indigo-500/20 text-indigo-300 text-xs space-y-2">
                            <p className="font-semibold flex items-center gap-1.5 text-indigo-200">
                                <Lock className="h-3.5 w-3.5" /> {t('signing.termsTitleCert')}
                            </p>
                            <p>{t('signing.termsBodyContract1')}</p>
                            <p>{t('signing.termsBodyContract2')}</p>
                        </div>
                    </div>

                    <div className="pt-6 space-y-3">
                        {success ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handlePrintPdf}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl border border-indigo-600 transition duration-150 shadow-md shadow-indigo-600/10"
                                >
                                    <Download className="h-4 w-4" /> {t('signing.btnDownloadSignedPdf', { defaultValue: 'Baixar Contrato (PDF)' })}
                                </button>
                                <div className="text-center text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="block font-semibold text-emerald-500">{t('signing.documentSigned')}</span>
                                    IP: {ipInfo.ip} <br />
                                    Data: {new Date(contract.signed_at || '').toLocaleString(i18n.resolvedLanguage || 'pt')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setOtpModalOpen(true)}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition duration-150 text-center"
                            >
                                {t('signing.btnSignContract')}
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">{t('signing.ipDevice', { ip: ipInfo.ip })}</p>
                    </div>
                </aside>
            </div>

            {/* Modal de Digitação de OTP */}
            {otpModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                            <Smartphone className="h-5 w-5 text-indigo-400" /> {t('signing.modalTitleIdentity')}
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            {t('signing.modalDescContract', { email: contract.worker?.email })}
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
                                {t('signing.btnCancel')}
                            </button>
                            <button
                                onClick={handleSignContract}
                                disabled={signing}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> {t('signing.signing')}
                                    </>
                                ) : (
                                    t('signing.btnConfirmSignContract')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
