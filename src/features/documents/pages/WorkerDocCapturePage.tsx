import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { getDocumentRequestByToken, processDocumentOcr, submitDocumentRequest, type DocumentRequest } from '../api/contractsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, UploadCloud, CheckCircle2, User, 
    FileText, CreditCard, Sparkles, Camera, Smartphone, AlertTriangle,
    Mail, MapPin, Phone, Users, Home, Shirt, Globe
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Comprime imagem client-side via canvas para compatibilidade universal:
 * - Evita limites de memória ou uploads pesados (>10MB de câmeras móveis).
 * - Normaliza para JPEG padrão aceito pelo Supabase storage e OCR.
 * - PDFs são preservados intactos.
 */
async function compressImageIfNeeded(file: File, maxDimension = 1920, quality = 0.85): Promise<{ blob: Blob; fileExt: string; contentType: string }> {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return { blob: file, fileExt: 'pdf', contentType: 'application/pdf' };
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve({ blob, fileExt: 'jpg', contentType: 'image/jpeg' });
                                return;
                            }
                            resolve({ blob: file, fileExt: 'jpg', contentType: file.type || 'image/jpeg' });
                        },
                        'image/jpeg',
                        quality
                    );
                } else {
                    resolve({ blob: file, fileExt: 'jpg', contentType: file.type || 'image/jpeg' });
                }
            };
            img.onerror = () => {
                resolve({ blob: file, fileExt: 'jpg', contentType: file.type || 'image/jpeg' });
            };
            img.src = e.target?.result as string;
        };
        reader.onerror = () => {
            resolve({ blob: file, fileExt: 'jpg', contentType: file.type || 'image/jpeg' });
        };
        reader.readAsDataURL(file);
    });
}

export function WorkerDocCapturePage() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [request, setRequest] = useState<DocumentRequest | null>(null);

    // Document URLs and File states
    const [passportUrl, setPassportUrl] = useState<string | null>(null);
    const [residenceUrl, setResidenceUrl] = useState<string | null>(null);
    const [nifUrl, setNifUrl] = useState<string | null>(null);
    const [nissUrl, setNissUrl] = useState<string | null>(null);
    const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
    const [ibanUrl, setIbanUrl] = useState<string | null>(null);
    const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

    // OCR Loading states
    const [ocrLoading, setOcrLoading] = useState<{ [key: string]: boolean }>({
        identity: false,
        residence: false,
        nif: false,
        niss: false,
        license: false
    });

    // Extracted / Form fields
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        movil: '',
        nif: '',
        niss: '',
        nie: '',
        dni: '',
        pasaporte: '',
        tiene_residencia_ue: true,
        tipo_residencia: '',
        numero_residencia: '',
        pais_residencia: '',
        licencia_conducir: '',
        banco: '',
        iban: '',
        nacionalidade: '',
        fecha_nacimiento: '',
        direccion_actual: '',
        ubicacion_actual: '',
        contacto_emergencia_nombre: '',
        contacto_emergencia_parentesco: '',
        contacto_emergencia_telefono: '',
        talla_camisa: '',
        talla_pantalon: ''
    });

    // Refs for file inputs
    const inputRefs = {
        identity: useRef<HTMLInputElement>(null),
        residence: useRef<HTMLInputElement>(null),
        nif: useRef<HTMLInputElement>(null),
        niss: useRef<HTMLInputElement>(null),
        license: useRef<HTMLInputElement>(null),
        iban: useRef<HTMLInputElement>(null),
        selfie: useRef<HTMLInputElement>(null)
    };

    // 1. Carregar solicitação de documento
    useEffect(() => {
        if (!token) return;
        async function loadRequest() {
            try {
                setLoading(true);
                const reqData = await getDocumentRequestByToken(token!);
                setRequest(reqData);
                
                if (reqData.status === 'submitted' || reqData.status === 'verified') {
                    setSuccess(true);
                }

                // Carregar dados existentes se houver
                setPassportUrl(reqData.passport_url);
                setResidenceUrl(reqData.residence_url || (reqData.extracted_data as any)?.residence_url || null);
                setNifUrl(reqData.nif_url);
                setNissUrl(reqData.niss_url);
                setLicenseUrl(reqData.license_url);
                setIbanUrl(reqData.iban_url);
                setSelfieUrl(reqData.selfie_url);

                const existingData = reqData.extracted_data || {};
                const workerObj = (reqData.worker || {}) as any;

                const hasResidence = reqData.tiene_residencia_ue ?? existingData.tiene_residencia_ue ?? true;

                setFormData(prev => ({
                    ...prev,
                    nome: existingData.nome || workerObj.nome || '',
                    email: existingData.email || workerObj.email || '',
                    movil: existingData.movil || workerObj.movil || '',
                    direccion_actual: existingData.direccion_actual || workerObj.address_line || '',
                    ubicacion_actual: existingData.ubicacion_actual || workerObj.location || '',
                    contacto_emergencia_nombre: existingData.contacto_emergencia_nombre || '',
                    contacto_emergencia_parentesco: existingData.contacto_emergencia_parentesco || '',
                    contacto_emergencia_telefono: existingData.contacto_emergencia_telefono || '',
                    talla_camisa: existingData.talla_camisa || workerObj.camiseta || '',
                    talla_pantalon: existingData.talla_pantalon || workerObj.pantalones || '',
                    banco: existingData.banco || '',
                    iban: existingData.iban || workerObj.iban || '',
                    nif: existingData.nif || workerObj.nif || '',
                    niss: existingData.niss || workerObj.niss || '',
                    pasaporte: existingData.pasaporte || workerObj.pasaporte || '',
                    nie: existingData.nie || workerObj.nie || '',
                    dni: existingData.dni || workerObj.dni || '',
                    tiene_residencia_ue: hasResidence,
                    tipo_residencia: existingData.tipo_residencia || '',
                    numero_residencia: existingData.numero_residencia || workerObj.nie || '',
                    pais_residencia: existingData.pais_residencia || (workerObj.nie ? 'España' : ''),
                    licencia_conducir: existingData.licencia_conducir || workerObj.licencia_conducir || '',
                    nacionalidade: existingData.nacionalidade || workerObj.nacionalidade || '',
                    fecha_nacimiento: existingData.fecha_nacimiento || workerObj.fecha_nacimiento || ''
                }));
            } catch (err) {
                console.error("Erro ao carregar solicitação:", err);
                toast.error("Link de envio inválido, expirado ou inexistente.");
            } finally {
                setLoading(false);
            }
        }
        loadRequest();
    }, [token]);

    // 2. Upload de arquivo e execução do OCR
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'identity' | 'residence' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie') => {
        const file = e.target.files?.[0];
        // Reset input value so user can select the same file or re-try
        e.target.value = '';
        if (!file || !token) return;

        try {
            setUploadingDoc(docType);

            // Comprimir imagem se for foto (garante compatibilidade total e upload rápido em qualquer celular)
            toast.info("Processando arquivo...");
            const { blob, fileExt, contentType } = await compressImageIfNeeded(file);

            // Validar tamanho final (máx 15MB)
            if (blob.size > 15 * 1024 * 1024) {
                toast.error("O arquivo excede o limite de 15MB.");
                return;
            }

            const filePath = `${token}/${docType}_${Date.now()}.${fileExt}`;

            // Upload no bucket privado worker-incoming-docs
            const { error: uploadErr } = await supabase.storage
                .from('worker-incoming-docs')
                .upload(filePath, blob, {
                    contentType: contentType,
                    upsert: true
                });

            if (uploadErr) throw uploadErr;

            // Salvar URL correspondente
            if (docType === 'identity') setPassportUrl(filePath);
            if (docType === 'residence') {
                setResidenceUrl(filePath);
                setFormData(prev => ({ ...prev, tiene_residencia_ue: true }));
            }
            if (docType === 'nif') setNifUrl(filePath);
            if (docType === 'niss') setNissUrl(filePath);
            if (docType === 'license') setLicenseUrl(filePath);
            if (docType === 'iban') {
                setIbanUrl(filePath);
                toast.success("Comprovante de IBAN carregado!");
                return;
            }
            if (docType === 'selfie') {
                setSelfieUrl(filePath);
                toast.success("Foto de perfil carregada com sucesso!");
                return;
            }

            // Chamar IA OCR se não for selfie ou iban
            setOcrLoading(prev => ({ ...prev, [docType]: true }));
            toast.info("Processando documento com IA...");
            try {
                const ocrRes = await processDocumentOcr({
                    file_path: filePath,
                    mime_type: contentType,
                    document_type: docType === 'residence' ? 'identity' : docType
                });

                if (ocrRes.success && ocrRes.data) {
                    toast.success("Leitura da IA concluída!");
                    const data = ocrRes.data;

                    if (docType === 'identity') {
                        setFormData(prev => {
                            const updated = {
                                ...prev,
                                nome: prev.nome ? prev.nome : (data.nome_completo || ''),
                                nacionalidade: prev.nacionalidade ? prev.nacionalidade : (data.nacionalidade || ''),
                                fecha_nacimiento: prev.fecha_nacimiento ? prev.fecha_nacimiento : (data.data_nascimento || '')
                            };

                            const docNum = data.numero_documento || '';
                            if (data.tipo_identificacao === 'passaporte') {
                                updated.pasaporte = prev.pasaporte ? prev.pasaporte : docNum;
                            } else if (data.tipo_identificacao === 'nie') {
                                updated.nie = prev.nie ? prev.nie : docNum;
                                updated.tiene_residencia_ue = true;
                                updated.numero_residencia = prev.numero_residencia ? prev.numero_residencia : docNum;
                            } else {
                                updated.dni = prev.dni ? prev.dni : docNum;
                            }
                            return updated;
                        });
                    } else if (docType === 'residence') {
                        setFormData(prev => {
                            const docNum = data.numero_documento || data.nie || '';
                            return {
                                ...prev,
                                tiene_residencia_ue: true,
                                numero_residencia: prev.numero_residencia ? prev.numero_residencia : docNum,
                                nie: prev.nie ? prev.nie : (docNum.match(/^[XYZxyz]/) ? docNum : prev.nie),
                                pais_residencia: prev.pais_residencia ? prev.pais_residencia : (data.pais || (docNum.match(/^[XYZxyz]/) ? 'España' : ''))
                            };
                        });
                    } else if (docType === 'nif') {
                        setFormData(prev => ({ ...prev, nif: prev.nif ? prev.nif : (data.nif || '') }));
                    } else if (docType === 'niss') {
                        setFormData(prev => ({ ...prev, niss: prev.niss ? prev.niss : (data.niss || '') }));
                    } else if (docType === 'license') {
                        setFormData(prev => ({ ...prev, licencia_conducir: prev.licencia_conducir ? prev.licencia_conducir : (data.licencia_conducir || '') }));
                    }
                }
            } catch (ocrErr: any) {
                console.warn(`Erro no OCR (não impeditivo) para ${docType}:`, ocrErr);
                toast.warning("Não foi possível extrair os dados automaticamente. Por favor, preencha as informações abaixo.");
            } finally {
                setOcrLoading(prev => ({ ...prev, [docType]: false }));
            }
        } catch (err: any) {
            console.error(`Erro ao processar upload de ${docType}:`, err);
            toast.error(`Falha no upload do documento: ${err.message || err}`);
        } finally {
            setUploadingDoc(null);
        }
    };

    // 3. Submeter formulário final
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação obrigatória principal
        if (!passportUrl || !selfieUrl) {
            toast.error("Por favor, envie os documentos obrigatórios (Identificação e Selfie).");
            return;
        }

        // Validação condicional: se possui residência europeia, o comprovativo é obrigatório
        if (formData.tiene_residencia_ue && !residenceUrl) {
            toast.error("Você indicou que possui residência europeia. Por favor, anexe a foto do seu comprovativo de residência (NIE / Título de Residência).");
            return;
        }

        try {
            setSubmitting(true);

            // Submeter caminhos e dados extraídos consolidados
            await submitDocumentRequest(token!, {
                passport_url: passportUrl,
                residence_url: residenceUrl,
                tiene_residencia_ue: formData.tiene_residencia_ue,
                nif_url: nifUrl,
                niss_url: nissUrl,
                license_url: licenseUrl,
                iban_url: ibanUrl,
                selfie_url: selfieUrl,
                extracted_data: {
                    ...formData,
                    iban_url: ibanUrl,
                    residence_url: residenceUrl,
                    tiene_residencia_ue: formData.tiene_residencia_ue
                }
            });

            toast.success("Documentos enviados com sucesso!");
            setSuccess(true);
        } catch (err: any) {
            console.error("Erro ao enviar documentos:", err);
            toast.error("Erro ao enviar documentos. Tente novamente.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">Carregando portal de onboarding...</p>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Solicitação Inválida</h1>
                <p className="text-slate-400 max-w-md">O link para envio dos documentos expirou ou é inválido. Solicite uma nova chave para o setor de RH.</p>
            </div>
        );
    }

    const workerDisplayName = request?.worker?.nome || (request?.extracted_data as any)?.nome || '';

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="max-w-md space-y-2">
                    <h1 className="text-2xl font-bold text-slate-100">Documentos Enviados!</h1>
                    <p className="text-slate-400">
                        Obrigado{workerDisplayName ? `, ${workerDisplayName}` : ''}. Seus documentos foram recebidos com sucesso e nossa equipe de RH fará a validação.
                    </p>
                    <p className="text-xs text-slate-500 pt-4">
                        Você já pode fechar esta página. O link do seu contrato será enviado assim que os dados forem verificados.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-xl space-y-6">
                {/* Header do Portal */}
                <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20 mb-2">
                        <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Portal de Envio de Documentos</h1>
                    <p className="text-sm text-slate-400">
                        Olá{workerDisplayName ? <strong> {workerDisplayName}</strong> : ''}, por favor, envie fotos nítidas dos seus documentos para elaboração do seu contrato.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Documento de Identificação */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <CreditCard className="h-5 w-5 text-indigo-400" />
                                    1. Documento de Identificação
                                </CardTitle>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Obrigatório</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Envie foto da frente e verso do seu Passaporte, DNI ou NIE.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {uploadingDoc === 'identity' ? (
                                <div className="w-full h-32 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-4">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-indigo-400" />
                                    <span className="text-sm font-semibold animate-pulse">Enviando documento...</span>
                                    <span className="text-xs text-slate-500 mt-1">Aguarde a conclusão do envio</span>
                                </div>
                            ) : !passportUrl ? (
                                <div className="space-y-3">
                                    {/* Opções de Captura Rápidas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* Botão Câmera Traseira */}
                                        <div className="relative overflow-hidden rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 p-3.5 flex items-center justify-center gap-2.5 text-indigo-200 cursor-pointer transition-all active:scale-[0.98]">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment"
                                                onChange={(e) => handleFileUpload(e, 'identity')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Fotografar Documento com Câmera"
                                            />
                                            <Camera className="h-5 w-5 text-indigo-400 shrink-0 pointer-events-none" />
                                            <span className="text-xs font-semibold pointer-events-none">Fotografar (Câmera)</span>
                                        </div>

                                        {/* Botão Galeria ou PDF */}
                                        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800/60 p-3.5 flex items-center justify-center gap-2.5 text-slate-200 cursor-pointer transition-all active:scale-[0.98]">
                                            <input 
                                                type="file" 
                                                accept="image/*,application/pdf" 
                                                onChange={(e) => handleFileUpload(e, 'identity')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Escolher Foto da Galeria ou PDF"
                                            />
                                            <UploadCloud className="h-5 w-5 text-slate-400 shrink-0 pointer-events-none" />
                                            <span className="text-xs font-semibold pointer-events-none">Galeria ou PDF</span>
                                        </div>
                                    </div>

                                    {/* Box de Toque Geral */}
                                    <div className="relative w-full h-20 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            ref={inputRefs.identity}
                                            onChange={(e) => handleFileUpload(e, 'identity')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Tirar Foto ou Carregar Arquivo"
                                        />
                                        <div className="flex flex-col items-center justify-center pointer-events-none text-center px-2">
                                            <Camera className="h-6 w-6 mb-1 text-slate-500" />
                                            <span className="text-xs font-medium">Ou toque aqui para selecionar o arquivo</span>
                                        </div>
                                    </div>
                                </div>
                            ) : ocrLoading.identity ? (
                                <div className="w-full h-28 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <Loader2 className="h-6 w-6 animate-spin mb-1" />
                                    <span className="text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                                        <Sparkles className="h-3 w-3 text-amber-500" /> IA Lendo Documento...
                                    </span>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-xs text-indigo-400/80 hover:text-white mt-1 h-auto py-0"
                                        onClick={() => setOcrLoading(prev => ({ ...prev, identity: false }))}
                                    >
                                        Preencher manualmente
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 space-y-3">
                                    <div className="flex items-center justify-between text-emerald-400 text-sm font-semibold">
                                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Documento Lido</span>
                                        <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                            <input 
                                                type="file" 
                                                accept="image/*,application/pdf" 
                                                onChange={(e) => handleFileUpload(e, 'identity')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Alterar Documento"
                                            />
                                            <span className="text-xs font-medium text-slate-300 pointer-events-none">Alterar</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                                        <div>
                                            <label className="text-slate-500 block">Nome Completo</label>
                                            <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 block">Nacionalidade</label>
                                            <Input value={formData.nacionalidade} onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })} className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 block">Nº Documento</label>
                                            <Input 
                                                value={formData.pasaporte || formData.nie || formData.dni} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData(prev => ({ ...prev, pasaporte: val, nie: val, dni: val }));
                                                }} 
                                                className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs mt-1" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 block">Data de Nascimento</label>
                                            <Input value={formData.fecha_nacimiento} onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })} className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs mt-1" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pergunta e Upload: Residência / Autorização Europeia */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <Globe className="h-5 w-5 text-indigo-400" />
                                    ¿Tiene Residencia Legal en la Unión Europea?
                                </CardTitle>
                                <Badge variant="secondary" className={formData.tiene_residencia_ue ? "bg-indigo-950 text-indigo-300 border border-indigo-800" : "bg-slate-800 text-slate-400"}>
                                    {formData.tiene_residencia_ue ? "Requerido" : "Opcional"}
                                </Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Indique si posee permiso de residencia, NIE comunitario, Título de Residencia (España, Portugal u otro país de la UE).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Seleção rápida Sí / No com botões táteis no celular */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, tiene_residencia_ue: true }))}
                                    className={`p-3.5 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                        formData.tiene_residencia_ue 
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/40' 
                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                    }`}
                                >
                                    <CheckCircle2 className={`h-5 w-5 ${formData.tiene_residencia_ue ? 'text-indigo-400' : 'text-slate-500'}`} />
                                    <span>SÍ, tengo residencia UE</span>
                                    <span className="text-[11px] font-normal text-slate-400">NIE / Título / Tarjeta UE</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, tiene_residencia_ue: false }))}
                                    className={`p-3.5 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                        !formData.tiene_residencia_ue 
                                            ? 'bg-slate-800/80 border-slate-600 text-slate-200 ring-2 ring-slate-600/30' 
                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                    }`}
                                >
                                    <FileText className={`h-5 w-5 ${!formData.tiene_residencia_ue ? 'text-slate-300' : 'text-slate-500'}`} />
                                    <span>NO, solo pasaporte</span>
                                    <span className="text-[11px] font-normal text-slate-400">Documento de origen</span>
                                </button>
                            </div>

                            {/* Se respondeu SÍ: Seção de upload obrigatório com suporte móvel universal */}
                            {formData.tiene_residencia_ue && (
                                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-indigo-400" />
                                            Foto de la Tarjeta / Permiso de Residencia Europea
                                        </label>
                                        <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">Obligatorio</Badge>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Suba una foto clara del anverso y reverso de su tarjeta de residencia (NIE/TIE de España, Título de Residência de Portugal, etc.).
                                    </p>

                                    {uploadingDoc === 'residence' ? (
                                        <div className="w-full h-32 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-4">
                                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-indigo-400" />
                                            <span className="text-sm font-semibold animate-pulse">Cargando documento de residencia...</span>
                                            <span className="text-xs text-slate-500 mt-1">Espere a que finalice el envío</span>
                                        </div>
                                    ) : !residenceUrl ? (
                                        <div className="space-y-3">
                                            {/* Opções de Captura Rápidas */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {/* Botão Câmera Traseira */}
                                                <div className="relative overflow-hidden rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 p-3.5 flex items-center justify-center gap-2.5 text-indigo-200 cursor-pointer transition-all active:scale-[0.98]">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        capture="environment"
                                                        onChange={(e) => handleFileUpload(e, 'residence')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                        title="Fotografar Residência com Câmera"
                                                    />
                                                    <Camera className="h-5 w-5 text-indigo-400 shrink-0 pointer-events-none" />
                                                    <span className="text-xs font-semibold pointer-events-none">Fotografar Tarjeta</span>
                                                </div>

                                                {/* Botão Galeria ou PDF */}
                                                <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800/60 p-3.5 flex items-center justify-center gap-2.5 text-slate-200 cursor-pointer transition-all active:scale-[0.98]">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,application/pdf" 
                                                        onChange={(e) => handleFileUpload(e, 'residence')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                        title="Elegir Foto o PDF"
                                                    />
                                                    <UploadCloud className="h-5 w-5 text-slate-400 shrink-0 pointer-events-none" />
                                                    <span className="text-xs font-semibold pointer-events-none">Galería o PDF</span>
                                                </div>
                                            </div>

                                            {/* Box de Toque Geral */}
                                            <div className="relative w-full h-20 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                                <input 
                                                    type="file" 
                                                    accept="image/*,application/pdf" 
                                                    ref={inputRefs.residence}
                                                    onChange={(e) => handleFileUpload(e, 'residence')}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                    title="Adjuntar Tarjeta de Residencia"
                                                />
                                                <div className="flex flex-col items-center justify-center pointer-events-none text-center px-2">
                                                    <Camera className="h-6 w-6 mb-1 text-slate-500" />
                                                    <span className="text-xs font-medium">O toque aquí para seleccionar el archivo</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ocrLoading.residence ? (
                                        <div className="w-full h-28 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                            <Loader2 className="h-6 w-6 animate-spin mb-1" />
                                            <span className="text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                                                <Sparkles className="h-3 w-3 text-amber-500" /> IA Leyendo Tarjeta de Residencia...
                                            </span>
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="text-xs text-indigo-400/80 hover:text-white mt-1 h-auto py-0"
                                                onClick={() => setOcrLoading(prev => ({ ...prev, residence: false }))}
                                            >
                                                Completar manualmente
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 space-y-3">
                                            <div className="flex items-center justify-between text-emerald-400 text-sm font-semibold">
                                                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Tarjeta de Residencia Cargada</span>
                                                <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,application/pdf" 
                                                        onChange={(e) => handleFileUpload(e, 'residence')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                        title="Cambiar Documento"
                                                    />
                                                    <span className="text-xs font-medium text-slate-300 pointer-events-none">Cambiar</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                                                <div>
                                                    <label className="text-slate-400 block mb-1">Nº NIE / Título de Residencia</label>
                                                    <Input 
                                                        placeholder="Ej: Y1234567X / PT123456" 
                                                        value={formData.numero_residencia} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.toUpperCase();
                                                            setFormData(prev => ({ ...prev, numero_residencia: val, nie: prev.nie || val }));
                                                        }} 
                                                        className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs font-mono" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-400 block mb-1">País Emisor de la Residencia</label>
                                                    <Input 
                                                        placeholder="Ej: España, Portugal, Italia..." 
                                                        value={formData.pais_residencia} 
                                                        onChange={(e) => setFormData({ ...formData, pais_residencia: e.target.value })} 
                                                        className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dados de Contacto y Dirección */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <Mail className="h-5 w-5 text-indigo-400" />
                                    Contacto y Dirección Actual
                                </CardTitle>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Requerido</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Ingrese su correo electrónico y dirección donde reside actualmente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico (E-mail)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                type="email"
                                                placeholder="ejemplo@correo.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono / Móvil Personal (con prefijo)</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                type="tel"
                                                placeholder="Ej: +34 600 000 000 / +55 ..."
                                                value={formData.movil}
                                                onChange={(e) => setFormData({ ...formData, movil: e.target.value })}
                                                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">Ubicación Actual (Ciudad y País)</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                placeholder="Ej: Madrid, España / Oporto, Portugal"
                                                value={formData.ubicacion_actual}
                                                onChange={(e) => setFormData({ ...formData, ubicacion_actual: e.target.value })}
                                                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">Dirección / Morada Completa</label>
                                        <div className="relative">
                                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                placeholder="Calle/Rua, Número, Piso, Código Postal"
                                                value={formData.direccion_actual}
                                                onChange={(e) => setFormData({ ...formData, direccion_actual: e.target.value })}
                                                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contactos de Emergencia */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <Users className="h-5 w-5 text-indigo-400" />
                                    Contacto de Emergencia / Familiar
                                </CardTitle>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Importante</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Indique los datos de un familiar directo a quien contactar en caso de emergencia.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1 whitespace-nowrap truncate">Nombre Familiar</label>
                                    <Input 
                                        placeholder="Ej: María Gómez"
                                        value={formData.contacto_emergencia_nombre}
                                        onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1 whitespace-nowrap truncate">Parentesco</label>
                                    <Input 
                                        placeholder="Ej: Esposa, Padre, Hermano..."
                                        value={formData.contacto_emergencia_parentesco}
                                        onChange={(e) => setFormData({ ...formData, contacto_emergencia_parentesco: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1 whitespace-nowrap truncate">Teléfono con Prefijo</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input 
                                            placeholder="Ej: +34 600 000 000"
                                            value={formData.contacto_emergencia_telefono}
                                            onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                                            className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tallas de Uniforme / EPI */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <Shirt className="h-5 w-5 text-indigo-400" />
                                    Tallas de Uniforme / Ropa de Trabajo
                                </CardTitle>
                                <Badge variant="secondary" className="bg-slate-800 text-slate-400">Opcional</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Indique las tallas para la asignación de su equipo de protección e indumentaria laboral.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Talla de Camisa / Polo</label>
                                    <select
                                        value={formData.talla_camisa}
                                        onChange={(e) => setFormData({ ...formData, talla_camisa: e.target.value })}
                                        className="w-full h-10 px-3 py-2 border border-slate-800 rounded-lg bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Seleccionar Talla...</option>
                                        <option value="S (50/52)">S (50/52)</option>
                                        <option value="M(54/56)">M(54/56)</option>
                                        <option value="L(58)">L(58)</option>
                                        <option value="XL(60)">XL(60)</option>
                                        <option value="XXL(62)">XXL(62)</option>
                                        <option value="XXXL(64)">XXXL(64)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Talla de Pantalón</label>
                                    <select
                                        value={formData.talla_pantalon}
                                        onChange={(e) => setFormData({ ...formData, talla_pantalon: e.target.value })}
                                        className="w-full h-10 px-3 py-2 border border-slate-800 rounded-lg bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Seleccionar Talla...</option>
                                        <option value="S (38/40)">S (38/40)</option>
                                        <option value="M(42/44)">M(42/44)</option>
                                        <option value="L(46)">L(46)</option>
                                        <option value="XL(52)">XL(52)</option>
                                        <option value="XXL(54)">XXL(54)</option>
                                        <option value="XXXL(56)">XXXL(56)</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información Bancaria / IBAN */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <CreditCard className="h-5 w-5 text-indigo-400" />
                                    Información Bancaria / IBAN
                                </CardTitle>
                                <Badge variant="secondary" className="bg-indigo-950 text-indigo-300 border border-indigo-800">Requerido</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs mt-1">
                                Proporcione los datos de la cuenta bancaria donde se realizarán los pagos de su salario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Aviso informativo solicitado pelo usuário */}
                            <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-lg text-xs text-indigo-200 flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                                <span>
                                    <strong>El IBAN es el número internacional de tu cuenta bancaria. La cuenta debe estar en euros.</strong>
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Banco / Entidad</label>
                                    <input 
                                        type="text" 
                                        value={formData.banco} 
                                        onChange={(e) => setFormData({ ...formData, banco: e.target.value })} 
                                        placeholder="Ej: Santander, CaixaBank, Revolut, BBVA" 
                                        className="w-full h-10 px-3 py-2 border border-slate-800 rounded-lg bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Número de IBAN</label>
                                    <input 
                                        type="text" 
                                        value={formData.iban} 
                                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })} 
                                        placeholder="Ej: ES91 2100 0418 4502 0005 1234" 
                                        className="w-full h-10 px-3 py-2 border border-slate-800 rounded-lg bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Comprobante de Titularidad del IBAN / Justificante Bancario</label>
                                {uploadingDoc === 'iban' ? (
                                    <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                        <Loader2 className="h-5 w-5 animate-spin mb-1 text-indigo-400" />
                                        <span className="text-xs font-semibold animate-pulse">Cargando comprobante...</span>
                                    </div>
                                ) : !ibanUrl ? (
                                    <div className="relative w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            ref={inputRefs.iban}
                                            onChange={(e) => handleFileUpload(e, 'iban')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Adjuntar Comprobante del IBAN (Foto o PDF)"
                                        />
                                        <div className="flex items-center gap-3 pointer-events-none">
                                            <UploadCloud className="h-6 w-6 text-slate-500" />
                                            <span className="text-sm font-medium">Adjuntar Comprobante del IBAN (Foto o PDF)</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                            <div>
                                                <span className="text-xs text-slate-400 block font-medium">Comprobante de IBAN Cargado</span>
                                                <span className="text-xs text-emerald-400 font-semibold">{formData.banco || 'Documento bancario listo'}</span>
                                            </div>
                                        </div>
                                        <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                            <input 
                                                type="file" 
                                                accept="image/*,application/pdf" 
                                                onChange={(e) => handleFileUpload(e, 'iban')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Alterar Comprobante"
                                            />
                                            <span className="text-xs font-medium text-slate-300 pointer-events-none">Alterar</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. NIF */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <FileText className="h-5 w-5 text-indigo-400" />
                                    2. Comprovativo de NIF
                                </CardTitle>
                                <Badge variant="secondary" className="bg-slate-800 text-slate-400">Opcional</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {uploadingDoc === 'nif' ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <Loader2 className="h-5 w-5 animate-spin mb-1 text-indigo-400" />
                                    <span className="text-xs font-semibold animate-pulse">Cargando NIF...</span>
                                </div>
                            ) : !nifUrl ? (
                                <div className="relative w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                    <input 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        ref={inputRefs.nif}
                                        onChange={(e) => handleFileUpload(e, 'nif')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        title="Carregue seu NIF"
                                    />
                                    <div className="flex items-center gap-3 pointer-events-none">
                                        <UploadCloud className="h-6 w-6 text-slate-500" />
                                        <span className="text-sm font-medium">Carregue seu NIF (Foto ou PDF)</span>
                                    </div>
                                </div>
                            ) : ocrLoading.nif ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                        <span className="text-xs animate-pulse font-medium">IA lendo NIF...</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-xs text-indigo-400/80 hover:text-white mt-1 h-auto py-0"
                                        onClick={() => setOcrLoading(prev => ({ ...prev, nif: false }))}
                                    >
                                        Preencher manualmente
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">Nº NIF Lido</span>
                                            <input 
                                                value={formData.nif} 
                                                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                                className="bg-transparent text-slate-200 font-bold text-sm focus:outline-none w-28 font-mono border-b border-transparent focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={(e) => handleFileUpload(e, 'nif')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Alterar NIF"
                                        />
                                        <span className="text-xs font-medium text-slate-300 pointer-events-none">Alterar</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. NISS */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <FileText className="h-5 w-5 text-indigo-400" />
                                    3. Comprovativo de NISS
                                </CardTitle>
                                <Badge variant="secondary" className="bg-slate-800 text-slate-400">Opcional</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {uploadingDoc === 'niss' ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <Loader2 className="h-5 w-5 animate-spin mb-1 text-indigo-400" />
                                    <span className="text-xs font-semibold animate-pulse">Cargando NISS...</span>
                                </div>
                            ) : !nissUrl ? (
                                <div className="relative w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                    <input 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        ref={inputRefs.niss}
                                        onChange={(e) => handleFileUpload(e, 'niss')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        title="Carregue seu NISS"
                                    />
                                    <div className="flex items-center gap-3 pointer-events-none">
                                        <UploadCloud className="h-6 w-6 text-slate-500" />
                                        <span className="text-sm font-medium">Carregue seu NISS (Foto ou PDF)</span>
                                    </div>
                                </div>
                            ) : ocrLoading.niss ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                        <span className="text-xs animate-pulse font-medium">IA lendo NISS...</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-xs text-indigo-400/80 hover:text-white mt-1 h-auto py-0"
                                        onClick={() => setOcrLoading(prev => ({ ...prev, niss: false }))}
                                    >
                                        Preencher manualmente
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">Nº NISS Lido</span>
                                            <input 
                                                value={formData.niss} 
                                                onChange={(e) => setFormData({ ...formData, niss: e.target.value })}
                                                className="bg-transparent text-slate-200 font-bold text-sm focus:outline-none w-32 font-mono border-b border-transparent focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={(e) => handleFileUpload(e, 'niss')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Alterar NISS"
                                        />
                                        <span className="text-xs font-medium text-slate-300 pointer-events-none">Alterar</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 4. Carta de Condução */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <CreditCard className="h-5 w-5 text-slate-400" />
                                    4. Carta de Condução
                                </CardTitle>
                                <Badge variant="secondary" className="bg-slate-800 text-slate-400">Opcional</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {uploadingDoc === 'license' ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <Loader2 className="h-5 w-5 animate-spin mb-1 text-indigo-400" />
                                    <span className="text-xs font-semibold animate-pulse">Cargando Carta de Condução...</span>
                                </div>
                            ) : !licenseUrl ? (
                                <div className="relative w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                    <input 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        ref={inputRefs.license}
                                        onChange={(e) => handleFileUpload(e, 'license')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        title="Carregue a Carta de Condução"
                                    />
                                    <div className="flex items-center gap-3 pointer-events-none">
                                        <UploadCloud className="h-6 w-6 text-slate-500" />
                                        <span className="text-sm font-medium">Carregue a Carta de Condução (Foto ou PDF)</span>
                                    </div>
                                </div>
                            ) : ocrLoading.license ? (
                                <div className="w-full h-20 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                        <span className="text-xs animate-pulse font-medium">IA lendo Carta...</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-xs text-indigo-400/80 hover:text-white mt-1 h-auto py-0"
                                        onClick={() => setOcrLoading(prev => ({ ...prev, license: false }))}
                                    >
                                        Preencher manualmente
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">Carta de Condução</span>
                                            <input 
                                                value={formData.licencia_conducir} 
                                                onChange={(e) => setFormData({ ...formData, licencia_conducir: e.target.value })}
                                                className="bg-transparent text-slate-200 font-bold text-sm focus:outline-none w-32 font-mono border-b border-transparent focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={(e) => handleFileUpload(e, 'license')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Alterar Carta"
                                        />
                                        <span className="text-xs font-medium text-slate-300 pointer-events-none">Alterar</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 5. Foto Selfie */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-100">
                                    <User className="h-5 w-5 text-indigo-400" />
                                    5. Foto de Perfil (Selfie)
                                </CardTitle>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Obrigatório</Badge>
                            </div>
                            <CardDescription className="text-slate-400 text-xs">
                                Tire uma foto nítida do seu rosto em um ambiente iluminado ou escolha da sua galeria.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {uploadingDoc === 'selfie' ? (
                                <div className="w-full h-32 border border-slate-800 rounded-xl flex flex-col items-center justify-center bg-slate-950/80 text-indigo-400 p-4">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-indigo-400" />
                                    <span className="text-sm font-semibold animate-pulse">Enviando foto de perfil...</span>
                                    <span className="text-xs text-slate-500 mt-1">Aguarde a conclusão do envio</span>
                                </div>
                            ) : !selfieUrl ? (
                                <div className="space-y-3">
                                    {/* Opções Diretas: Câmera ou Galeria */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* Botão Câmera Frontal (Selfie) */}
                                        <div className="relative overflow-hidden rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 p-3.5 flex items-center justify-center gap-2.5 text-indigo-200 cursor-pointer transition-all active:scale-[0.98]">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="user"
                                                onChange={(e) => handleFileUpload(e, 'selfie')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Tirar Foto (Câmera Frontal)"
                                            />
                                            <Camera className="h-5 w-5 text-indigo-400 shrink-0 pointer-events-none" />
                                            <span className="text-xs font-semibold pointer-events-none">📷 Tirar Foto (Câmera)</span>
                                        </div>

                                        {/* Botão Escolher da Galeria */}
                                        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800/60 p-3.5 flex items-center justify-center gap-2.5 text-slate-200 cursor-pointer transition-all active:scale-[0.98]">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => handleFileUpload(e, 'selfie')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                title="Escolher Foto da Galeria"
                                            />
                                            <UploadCloud className="h-5 w-5 text-slate-400 shrink-0 pointer-events-none" />
                                            <span className="text-xs font-semibold pointer-events-none">🖼️ Escolher da Galeria</span>
                                        </div>
                                    </div>

                                    {/* Box de Toque Geral */}
                                    <div className="relative w-full h-24 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors overflow-hidden cursor-pointer active:scale-[0.99]">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={inputRefs.selfie}
                                            onChange={(e) => handleFileUpload(e, 'selfie')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Tirar Foto ou Escolher Selfie"
                                        />
                                        <div className="flex flex-col items-center justify-center pointer-events-none text-center px-2">
                                            <Camera className="h-6 w-6 mb-1 text-slate-500" />
                                            <span className="text-xs font-medium">Ou toque aqui para selecionar a foto</span>
                                            <span className="text-[11px] text-slate-500 mt-0.5">Compatível com Samsung, Xiaomi, iPhone e Android</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                        <div>
                                            <span className="text-sm text-slate-300 font-semibold block">Foto carregada com sucesso!</span>
                                            <span className="text-xs text-emerald-400">Pronta para o contrato</span>
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1 cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="user"
                                            onChange={(e) => handleFileUpload(e, 'selfie')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            title="Tirar Outra Foto"
                                        />
                                        <span className="text-xs font-medium text-slate-300 pointer-events-none">Tirar Outra</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Botão de Envio */}
                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={submitting} 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex justify-center items-center gap-2 text-base"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Processando Envio...
                                </>
                            ) : "Confirmar e Enviar Documentos"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
