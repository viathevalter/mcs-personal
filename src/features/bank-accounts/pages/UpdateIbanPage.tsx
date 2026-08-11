import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Wallet, Camera, UploadCloud, CheckCircle2, Loader2, 
    Sparkles, ShieldCheck, AlertCircle, FileCheck, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useIbanRequestByToken, useSubmitIbanRequest, useUploadIbanRequestFile } from '../hooks/useIbanRequests';
import { processDocumentOcr } from '@/features/documents/api/contractsApi';
import { useTranslation } from 'react-i18next';

export function UpdateIbanPage() {
    const { token } = useParams<{ token: string }>();
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language || 'pt';

    const [success, setSuccess] = useState(false);
    
    // Form fields
    const [newIban, setNewIban] = useState('');
    const [newBanco, setNewBanco] = useState('');
    const [ibanPhotoUrl, setIbanPhotoUrl] = useState<string | null>(null);
    const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);

    // Temp file references for display
    const [ibanPhotoFile, setIbanPhotoFile] = useState<File | null>(null);
    const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

    // Loading states
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUploadingComp, setIsUploadingComp] = useState(false);

    // Query request data
    const { data: request, isLoading: isLoadingRequest, error: requestError } = useIbanRequestByToken(token || '');

    const { mutateAsync: uploadFile } = useUploadIbanRequestFile();
    const { mutateAsync: submitRequest, isPending: isSubmitting } = useSubmitIbanRequest();

    const photoInputRef = useRef<HTMLInputElement>(null);
    const compInputRef = useRef<HTMLInputElement>(null);

    // Redirect or set success if already submitted
    useEffect(() => {
        if (request && (request.status === 'enviado' || request.status === 'aprovado')) {
            setSuccess(true);
        }
    }, [request]);

    const maskIban = (iban: string | null | undefined) => {
        if (!iban) return t('updateIban.notRegistered');
        const clean = iban.replace(/\s+/g, '');
        if (clean.length < 8) return iban;
        const start = clean.substring(0, 4);
        const end = clean.substring(clean.length - 4);
        return `${start} •••• •••• •••• ${end}`;
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        // Size limit (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo excede o limite de 10MB.');
            return;
        }

        setIbanPhotoFile(file);
        setIsUploadingPhoto(true);

        try {
            // 1. Upload to bucket worker-incoming-docs
            const path = await uploadFile({ token, file, docType: 'iban_photo' });
            setIbanPhotoUrl(path);
            toast.success(t('updateIban.toastPhotoSuccess'));

            // 2. Run OCR using AI
            setIsOcrProcessing(true);
            toast.info(t('updateIban.toastOcrRunning'), { icon: '🤖' });
            
            try {
                const ocrResult = await processDocumentOcr({
                    file_path: path,
                    mime_type: file.type,
                    document_type: 'iban'
                });

                if (ocrResult.success && ocrResult.data) {
                    const { iban, banco } = ocrResult.data;
                    if (iban) {
                        setNewIban(iban.toUpperCase());
                        toast.success(t('updateIban.toastOcrSuccess'), { icon: '✨' });
                    }
                    if (banco) {
                        setNewBanco(banco.toUpperCase());
                    }
                } else {
                    toast.info(t('updateIban.toastOcrFail'));
                }
            } catch (ocrErr: any) {
                console.warn('OCR error:', ocrErr);
                toast.info(t('updateIban.toastOcrError'));
            } finally {
                setIsOcrProcessing(false);
            }

        } catch (err: any) {
            console.error('File upload error:', err);
            toast.error('Erro ao processar imagem.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleCompSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo excede o limite de 10MB.');
            return;
        }

        setComprovanteFile(file);
        setIsUploadingComp(true);

        try {
            const path = await uploadFile({ token, file, docType: 'comprovante' });
            setComprovanteUrl(path);
            toast.success(t('updateIban.toastCompSuccess'));
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar comprovativo.');
        } finally {
            setIsUploadingComp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!newIban || newIban.trim().length < 15) {
            toast.error('Por favor, informe um IBAN válido.');
            return;
        }

        if (!newBanco || newBanco.trim() === '') {
            toast.error('Por favor, informe o nome do banco.');
            return;
        }

        if (!comprovanteUrl) {
            toast.error('Por favor, envie o comprovativo oficial de titularidade.');
            return;
        }

        try {
            await submitRequest({
                token,
                payload: {
                    new_iban: newIban.replace(/\s+/g, ''),
                    new_banco: newBanco,
                    iban_photo_url: ibanPhotoUrl,
                    comprovante_url: comprovanteUrl
                }
            });

            toast.success(t('updateIban.toastSubmitSuccess'));
            setSuccess(true);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao submeter os dados.');
        }
    };

    if (isLoadingRequest) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium">Carregando formulário seguro de dados bancários...</p>
            </div>
        );
    }

    if (requestError || !request) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 text-center shadow-xl backdrop-blur-md">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">{t('updateIban.errorTitle')}</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {t('updateIban.errorGeneric')}
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/80 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl relative">
                    {/* Language Switcher */}
                    <div className="absolute top-4 right-4 flex gap-1">
                        <button 
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${currentLanguage.startsWith('pt') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}
                            onClick={() => i18n.changeLanguage('pt')}
                        >
                            PT
                        </button>
                        <button 
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${currentLanguage.startsWith('es') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}
                            onClick={() => i18n.changeLanguage('es')}
                        >
                            ES
                        </button>
                    </div>

                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">{t('updateIban.successTitle')}</h2>
                    <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                        {t('updateIban.successText', { name: request.worker?.nome })}
                    </p>
                    <div className="bg-indigo-950/40 border border-indigo-500/10 rounded-xl p-4 text-left text-xs text-indigo-300 mb-6 leading-relaxed">
                        <p className="font-semibold text-white mb-1.5 flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-1 text-indigo-400" /> {t('updateIban.successInstructionTitle')}
                        </p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>{t('updateIban.successInstruction1')}</li>
                            <li>{t('updateIban.successInstruction2')}</li>
                            <li>{t('updateIban.successInstruction3')}</li>
                        </ol>
                    </div>
                    <p className="text-[11px] text-slate-500">{t('updateIban.successFooter')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 p-4 relative">
            
            {/* Language Switcher */}
            <div className="absolute top-4 right-4 flex gap-1 z-55">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold rounded ${currentLanguage.startsWith('pt') ? 'bg-indigo-600 text-white hover:bg-indigo-600' : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'}`}
                    onClick={() => i18n.changeLanguage('pt')}
                >
                    PT
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold rounded ${currentLanguage.startsWith('es') ? 'bg-indigo-600 text-white hover:bg-indigo-600' : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'}`}
                    onClick={() => i18n.changeLanguage('es')}
                >
                    ES
                </Button>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-indigo-600/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-lg">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
                    {t('updateIban.title')}
                </h2>
                <p className="mt-2 text-center text-sm text-indigo-200/70">
                    {t('updateIban.subtitle')}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl py-8 px-6 sm:px-10 shadow-2xl backdrop-blur-xl">
                    
                    {/* Worker Info Card */}
                    <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">{t('updateIban.collaborator')}</span>
                                <span className="text-white font-semibold text-sm">{request.worker?.nome}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">{t('updateIban.workerCode')}</span>
                                <span className="text-slate-300 font-mono text-sm">{request.worker?.cod_colab || '-'}</span>
                            </div>
                            <div className="col-span-2 border-t border-indigo-950/60 pt-3 space-y-2.5">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">{t('updateIban.currentBank')}</span>
                                    <span className="text-slate-200 font-semibold text-sm">{request.old_banco || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">{t('updateIban.currentIban')}</span>
                                    <span className="text-slate-200 font-mono text-sm break-all tracking-tight">{maskIban(request.old_iban)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* 1. PHOTO/CAMERA UPLOAD AREA (WITH OCR) */}
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-sm font-medium flex items-center justify-between">
                                <span>{t('updateIban.step1Title')}</span>
                                <span className="text-[10px] text-indigo-400 flex items-center bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    <Sparkles className="w-3 h-3 mr-1 animate-pulse" /> {t('updateIban.step1BtnOcr')}
                                </span>
                            </Label>
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={photoInputRef}
                                onChange={photoInputSelect => handlePhotoSelect(photoInputSelect)}
                                accept="application/pdf,image/*"
                            />

                            {!ibanPhotoFile ? (
                                <div 
                                    className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    <div className="w-10 h-10 bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-300">{t('updateIban.step1Placeholder')}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{t('updateIban.step1PlaceholderSub')}</p>
                                </div>
                            ) : (
                                <div className="border border-indigo-500/20 bg-indigo-950/10 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex flex-shrink-0 items-center justify-center">
                                            {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-200 truncate">{ibanPhotoFile.name}</p>
                                            <p className="text-[10px] text-slate-500">{(ibanPhotoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="text-slate-400 hover:text-rose-500 p-1"
                                        onClick={() => { setIbanPhotoFile(null); setIbanPhotoUrl(null); }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. FORM FIELDS (STACKED VERTICALLY) */}
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new_banco" className="text-slate-300 text-sm font-medium">{t('updateIban.newBankLabel')}</Label>
                                <Input
                                    id="new_banco"
                                    placeholder={t('updateIban.newBankPlaceholder')}
                                    value={newBanco}
                                    onChange={(e) => setNewBanco(e.target.value)}
                                    className="bg-slate-950/40 border-slate-800 text-white h-10"
                                    disabled={isOcrProcessing || isSubmitting}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new_iban" className="text-slate-300 text-sm font-medium">{t('updateIban.newIbanLabel')}</Label>
                                <div className="relative">
                                    <Input
                                        id="new_iban"
                                        placeholder={t('updateIban.newIbanPlaceholder')}
                                        value={newIban}
                                        onChange={(e) => setNewIban(e.target.value.toUpperCase())}
                                        className={`bg-slate-950/40 border-slate-800 text-white font-mono uppercase h-10 ${isOcrProcessing ? 'pl-9 text-indigo-300' : ''}`}
                                        disabled={isOcrProcessing || isSubmitting}
                                        required
                                    />
                                    {isOcrProcessing && (
                                        <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. OFFICIAL PROOF OF TITULARITY */}
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-sm font-medium">
                                {t('updateIban.step2Title')} <span className="text-rose-500">*</span>
                            </Label>
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={compInputRef}
                                onChange={compInputSelect => handleCompSelect(compInputSelect)}
                                accept="application/pdf,image/*"
                            />

                            {!comprovanteFile ? (
                                <div 
                                    className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                                    onClick={() => compInputRef.current?.click()}
                                >
                                    <div className="w-10 h-10 bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">
                                        <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-300">{t('updateIban.step2Placeholder')}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{t('updateIban.step2PlaceholderSub')}</p>
                                </div>
                            ) : (
                                <div className="border border-indigo-500/20 bg-indigo-950/10 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex flex-shrink-0 items-center justify-center">
                                            {isUploadingComp ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4 text-emerald-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-200 truncate">{comprovanteFile.name}</p>
                                            <p className="text-[10px] text-slate-500">{(comprovanteFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="text-slate-400 hover:text-rose-500 p-1"
                                        onClick={() => { setComprovanteFile(null); setComprovanteUrl(null); }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-2">
                            <Button 
                                type="submit" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-11 shadow-lg border-0 shadow-indigo-600/20 text-sm"
                                disabled={isSubmitting || isUploadingPhoto || isUploadingComp || isOcrProcessing}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                )}
                                {isSubmitting ? t('updateIban.btnSubmitting') : t('updateIban.btnSubmit')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
