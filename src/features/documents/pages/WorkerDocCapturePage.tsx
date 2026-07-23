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
    Mail, MapPin, Phone, Users, Home, Shirt
} from 'lucide-react';
import { toast } from 'sonner';

export function WorkerDocCapturePage() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [request, setRequest] = useState<DocumentRequest | null>(null);

    // Document URLs and File states
    const [passportUrl, setPassportUrl] = useState<string | null>(null);
    const [nifUrl, setNifUrl] = useState<string | null>(null);
    const [nissUrl, setNissUrl] = useState<string | null>(null);
    const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
    const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

    // OCR Loading states
    const [ocrLoading, setOcrLoading] = useState<{ [key: string]: boolean }>({
        identity: false,
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
        licencia_conducir: '',
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
        nif: useRef<HTMLInputElement>(null),
        niss: useRef<HTMLInputElement>(null),
        license: useRef<HTMLInputElement>(null),
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
                setNifUrl(reqData.nif_url);
                setNissUrl(reqData.niss_url);
                setLicenseUrl(reqData.license_url);
                setSelfieUrl(reqData.selfie_url);

                const existingData = reqData.extracted_data || {};

                if (reqData.worker) {
                    setFormData(prev => ({
                        ...prev,
                        nome: reqData.worker?.nome || existingData.nome || '',
                        email: reqData.worker?.email || existingData.email || '',
                        movil: reqData.worker?.movil || existingData.movil || '',
                        direccion_actual: existingData.direccion_actual || '',
                        ubicacion_actual: existingData.ubicacion_actual || '',
                        contacto_emergencia_nombre: existingData.contacto_emergencia_nombre || '',
                        contacto_emergencia_parentesco: existingData.contacto_emergencia_parentesco || '',
                        contacto_emergencia_telefono: existingData.contacto_emergencia_telefono || '',
                        talla_camisa: existingData.talla_camisa || '',
                        talla_pantalon: existingData.talla_pantalon || '',
                        nif: existingData.nif || '',
                        niss: existingData.niss || '',
                        pasaporte: existingData.pasaporte || '',
                        nie: existingData.nie || '',
                        dni: existingData.dni || ''
                    }));
                }
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
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'identity' | 'nif' | 'niss' | 'license' | 'selfie') => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        // Validar tamanho (máx 15MB)
        if (file.size > 15 * 1024 * 1024) {
            toast.error("O arquivo excede o limite de 15MB.");
            return;
        }

        try {
            // Setar carregamento
            if (docType !== 'selfie') {
                setOcrLoading(prev => ({ ...prev, [docType]: true }));
            }

            const fileExt = file.name.split('.').pop();
            const filePath = `${token}/${docType}_${Date.now()}.${fileExt}`;

            // Upload no bucket privado worker-incoming-docs
            const { error: uploadErr } = await supabase.storage
                .from('worker-incoming-docs')
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: true
                });

            if (uploadErr) throw uploadErr;

            // Salvar URL correspondente
            if (docType === 'identity') setPassportUrl(filePath);
            if (docType === 'nif') setNifUrl(filePath);
            if (docType === 'niss') setNissUrl(filePath);
            if (docType === 'license') setLicenseUrl(filePath);
            if (docType === 'selfie') {
                setSelfieUrl(filePath);
                toast.success("Foto de perfil carregada!");
                return;
            }

            // Chamar IA OCR se não for selfie
            toast.info("Processando documento com IA...");
            try {
                const ocrRes = await processDocumentOcr({
                    file_path: filePath,
                    mime_type: file.type,
                    document_type: docType
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
                            } else {
                                updated.dni = prev.dni ? prev.dni : docNum;
                            }
                            return updated;
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
            }
        } catch (err: any) {
            console.error(`Erro ao processar upload de ${docType}:`, err);
            toast.error(`Falha no upload do documento: ${err.message || err}`);
        } finally {
            if (docType !== 'selfie') {
                setOcrLoading(prev => ({ ...prev, [docType]: false }));
            }
        }
    };

    // 3. Submeter formulário final
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passportUrl || !selfieUrl) {
            toast.error("Por favor, envie os documentos obrigatórios (Identificação e Selfie).");
            return;
        }

        try {
            setSubmitting(true);

            // Submeter caminhos e dados extraídos consolidados
            await submitDocumentRequest(token!, {
                passport_url: passportUrl,
                nif_url: nifUrl,
                niss_url: nissUrl,
                license_url: licenseUrl,
                selfie_url: selfieUrl,
                extracted_data: formData
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

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="max-w-md space-y-2">
                    <h1 className="text-2xl font-bold text-slate-100">Documentos Enviados!</h1>
                    <p className="text-slate-400">
                        Obrigado, <strong>{request.worker?.nome}</strong>. Seus documentos foram recebidos com sucesso e nossa equipe de RH fará a validação.
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
                        Olá <strong>{request.worker?.nome}</strong>, por favor, envie fotos nítidas dos seus documentos para elaboração do seu contrato.
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
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                ref={inputRefs.identity}
                                onChange={(e) => handleFileUpload(e, 'identity')}
                                className="hidden"
                            />
                            {!passportUrl ? (
                                <button
                                    type="button"
                                    onClick={() => inputRefs.identity.current?.click()}
                                    className="w-full h-28 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <Camera className="h-8 w-8 mb-2 text-slate-500" />
                                    <span className="text-sm">Tirar Foto ou Carregar Arquivo</span>
                                </button>
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
                                        <Button variant="ghost" size="sm" type="button" className="text-slate-400 hover:text-white" onClick={() => inputRefs.identity.current?.click()}>Alterar</Button>
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
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo del Familiar</label>
                                    <Input 
                                        placeholder="Ej: María Gómez"
                                        value={formData.contacto_emergencia_nombre}
                                        onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Parentesco</label>
                                    <Input 
                                        placeholder="Ej: Esposa, Padre, Hermano..."
                                        value={formData.contacto_emergencia_parentesco}
                                        onChange={(e) => setFormData({ ...formData, contacto_emergencia_parentesco: e.target.value })}
                                        className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono con Prefijo</label>
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
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                ref={inputRefs.nif}
                                onChange={(e) => handleFileUpload(e, 'nif')}
                                className="hidden"
                            />
                            {!nifUrl ? (
                                <button
                                    type="button"
                                    onClick={() => inputRefs.nif.current?.click()}
                                    className="w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                    <span className="text-sm font-medium">Carregue seu NIF</span>
                                </button>
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
                                    <Button variant="ghost" size="sm" type="button" className="text-slate-400" onClick={() => inputRefs.nif.current?.click()}>Alterar</Button>
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
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                ref={inputRefs.niss}
                                onChange={(e) => handleFileUpload(e, 'niss')}
                                className="hidden"
                            />
                            {!nissUrl ? (
                                <button
                                    type="button"
                                    onClick={() => inputRefs.niss.current?.click()}
                                    className="w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                    <span className="text-sm font-medium">Carregue seu NISS</span>
                                </button>
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
                                    <Button variant="ghost" size="sm" type="button" className="text-slate-400" onClick={() => inputRefs.niss.current?.click()}>Alterar</Button>
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
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                ref={inputRefs.license}
                                onChange={(e) => handleFileUpload(e, 'license')}
                                className="hidden"
                            />
                            {!licenseUrl ? (
                                <button
                                    type="button"
                                    onClick={() => inputRefs.license.current?.click()}
                                    className="w-full h-20 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-3 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                    <span className="text-sm font-medium">Carregue a Carta de Condução</span>
                                </button>
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
                                    <Button variant="ghost" size="sm" type="button" className="text-slate-400" onClick={() => inputRefs.license.current?.click()}>Alterar</Button>
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
                                Tire uma foto nítida do seu rosto em um ambiente iluminado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="user"
                                ref={inputRefs.selfie}
                                onChange={(e) => handleFileUpload(e, 'selfie')}
                                className="hidden"
                            />
                            {!selfieUrl ? (
                                <button
                                    type="button"
                                    onClick={() => inputRefs.selfie.current?.click()}
                                    className="w-full h-24 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <Camera className="h-7 w-7 mb-1.5 text-slate-500" />
                                    <span className="text-sm font-medium">Abrir Câmera para Selfie</span>
                                </button>
                            ) : (
                                <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                                        <span className="text-sm text-slate-300 font-semibold">Foto carregada com sucesso!</span>
                                    </div>
                                    <Button variant="ghost" size="sm" type="button" className="text-slate-400" onClick={() => inputRefs.selfie.current?.click()}>Tirar Outra</Button>
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
