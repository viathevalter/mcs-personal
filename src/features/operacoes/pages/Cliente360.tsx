import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    fetchCliente360, 
    updateClienteComentarios 
} from '../services/queries';
import { 
    ArrowLeft, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    CreditCard, 
    ShieldCheck, 
    FileText, 
    Briefcase, 
    Users, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    Copy, 
    ExternalLink, 
    Save, 
    Check, 
    RefreshCw,
    AlertTriangle,
    DollarSign,
    FolderKanban,
    UserCheck,
    MessageSquareText
} from 'lucide-react';

export const Cliente360: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'pedidos' | 'trabalhadores' | 'obras' | 'reunioes'>('geral');
    
    // Notes state
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);

    // Copy toast
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const loadData = () => {
        if (!id) return;
        setLoading(true);
        fetchCliente360(id).then(res => {
            setData(res);
            if (res) {
                setNotes(res.comentarios || '');
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSaveNotes = async () => {
        if (!data?.id) return;
        setSavingNotes(true);
        const success = await updateClienteComentarios(data.id, notes);
        setSavingNotes(false);
        if (success) {
            setNotesSaved(true);
            setTimeout(() => setNotesSaved(false), 3000);
        }
    };

    const copyToClipboard = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    if (loading) {
        return (
            <div className="p-16 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Carregando raio-x 360 do cliente...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-12 text-center space-y-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <AlertCircle size={48} className="mx-auto text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Cliente não encontrado</h2>
                <p className="text-sm text-slate-500">Não foi possível carregar as informações para o ID solicitado (#{id}).</p>
                <button
                    onClick={() => navigate('/operacoes/clientes')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar para lista de clientes
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/operacoes/clientes')} 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm"
                >
                    <ArrowLeft size={15} /> Voltar para Clientes
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Recarregar dados"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Client Profile Header Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                            {(data.nome || 'CL').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {data.nome}
                                </h1>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                    Ativo
                                </span>
                                {data.cod_cliente && (
                                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                        {data.cod_cliente}
                                    </span>
                                )}
                            </div>

                            {data.razon_social && data.razon_social !== data.nome && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    {data.razon_social}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                {data.cif_dni && (
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                            NIF: {data.cif_dni}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(data.cif_dni, 'cif')}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            title="Copiar NIF"
                                        >
                                            {copiedField === 'cif' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                )}

                                {(data.domicilio || data.provincia || data.pais) && (
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span>
                                            {[data.domicilio, data.provincia, data.pais].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Contact & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                        {data.telefono && (
                            <a
                                href={`tel:${data.telefono}`}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <Phone size={14} className="text-blue-600 dark:text-blue-400" />
                                {data.telefono}
                            </a>
                        )}

                        {data.email && (
                            <a
                                href={`mailto:${data.email}`}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <Mail size={14} className="text-indigo-600 dark:text-indigo-400" />
                                {data.email}
                            </a>
                        )}
                    </div>
                </div>

                {/* Executive KPIs Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    {data.kpis.map((kpi: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block truncate">
                                {kpi.label}
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 block truncate">
                                {kpi.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('geral')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'geral'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <Building2 size={16} />
                    Ficha Cadastral & Contatos
                </button>

                <button
                    onClick={() => setActiveTab('financeiro')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'financeiro'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <CreditCard size={16} />
                    Faturas & Financeiro ({data.faturas?.length || 0})
                </button>

                <button
                    onClick={() => setActiveTab('pedidos')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'pedidos'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <Briefcase size={16} />
                    Pedidos Operacionais ({data.pedidos?.length || 0})
                </button>

                <button
                    onClick={() => setActiveTab('trabalhadores')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'trabalhadores'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <Users size={16} />
                    Colaboradores & Horas ({data.trabalhadores?.length || 0})
                </button>

                <button
                    onClick={() => setActiveTab('obras')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'obras'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <FolderKanban size={16} />
                    Obras / Locais ({data.obras?.length || 0})
                </button>

                <button
                    onClick={() => setActiveTab('reunioes')}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === 'reunioes'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <MessageSquareText size={16} />
                    Reuniões & Incidências ({(data.reunioes?.length || 0) + (data.incidencias?.length || 0)})
                </button>
            </div>

            {/* TAB 1: FICHA CADASTRAL & CONTATOS */}
            {activeTab === 'geral' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Fiscal & Corporate Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <Building2 size={16} className="text-blue-600" />
                                Dados Cadastrais e Fiscais
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block mb-1">Nome Comercial</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{data.nombre_comercial || data.nome}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">Razão Social</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{data.razon_social || '-'}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">NIF / CIF Nacional</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{data.cif_dni || '-'}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">CIF Europeu (VIES)</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{data.cif_europeo || '-'}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">Código do Cliente</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{data.cod_cliente || `#${data.id}`}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">Prazo de Pagamento Padrão</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{data.prazo_pagamento || 'Não configurado'}</span>
                                </div>

                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block mb-1">Endereço / Domicílio Fiscal</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{data.domicilio || '-'}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">Província / Cidade</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {[data.provincia, data.municipio].filter(Boolean).join(' / ') || '-'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block mb-1">País</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{data.pais || 'España'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contacts & Responsibles */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <Users size={16} className="text-indigo-600" />
                                Responsáveis e Contatos de Operação & Faturamento
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 font-medium block mb-1 text-[11px] uppercase">Responsável de Cobrança / Financeiro</span>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.resp_cobros || 'Não informado'}</div>
                                    {data.email_cobros && (
                                        <div className="text-slate-500 mt-1 truncate" title={data.email_cobros}>
                                            ✉️ {data.email_cobros}
                                        </div>
                                    )}
                                    {data.telefono_cobros && (
                                        <div className="text-slate-500 mt-0.5">
                                            📞 {data.telefono_cobros}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 font-medium block mb-1 text-[11px] uppercase">Envio de Faturas</span>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.nombre_resp_facturacion || 'Setor de Faturamento'}</div>
                                    {data.email_envio_factura && (
                                        <div className="text-slate-500 mt-1 truncate" title={data.email_envio_factura}>
                                            ✉️ {data.email_envio_factura}
                                        </div>
                                    )}
                                    {data.telefono_facturacion && (
                                        <div className="text-slate-500 mt-0.5">
                                            📞 {data.telefono_facturacion}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 font-medium block mb-1 text-[11px] uppercase">Gestão da Empresa / Diretoria</span>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.nombre_resp_empresa || 'Responsável Geral'}</div>
                                    {data.telefono_resp_empresa && (
                                        <div className="text-slate-500 mt-1">📞 {data.telefono_resp_empresa}</div>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 font-medium block mb-1 text-[11px] uppercase">Documentação & Compliance</span>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.nombre_resp_documentacion || 'Setor de Documentos'}</div>
                                    {data.telefono_resp_documentacion && (
                                        <div className="text-slate-500 mt-1">📞 {data.telefono_resp_documentacion}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Operational Notes & Quick Summary */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                    <FileText size={16} className="text-amber-500" />
                                    Notas e Observações do Cliente
                                </h3>
                                {notesSaved && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
                                        <Check size={14} /> Salvo!
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500">
                                Registre notas importantes sobre faturamento, particularidades de obras ou acordos comerciais.
                            </p>

                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-44 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                placeholder="Insira anotações sobre prazos especiais, contato preferencial, rotinas de entrega..."
                            />

                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                            >
                                {savingNotes ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} /> Salvar Notas
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: FATURAS & FINANCEIRO */}
            {activeTab === 'financeiro' && (
                <div className="space-y-6">
                    {/* Faturas Emitidas */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                    <FileText size={16} className="text-blue-600" />
                                    Faturas Oficiais Emitidas
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Faturas emitidas pelo módulo de faturamento com ATCUD e portal do cliente</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {data.faturas?.length || 0} faturas
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3">Número / ATCUD</th>
                                        <th className="px-4 py-3">Data Emissão</th>
                                        <th className="px-4 py-3">Vencimento</th>
                                        <th className="px-4 py-3">Obra / Descrição do Serviço</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                    {data.faturas && data.faturas.length > 0 ? (
                                        data.faturas.map((f: any) => (
                                            <tr key={f.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                                    <div>{f.fatura_numero}</div>
                                                    {f.atcud && <div className="text-[10px] text-slate-400 font-mono mt-0.5">ATCUD: {f.atcud}</div>}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                    {f.data_emissao ? new Date(f.data_emissao).toLocaleDateString('pt-PT') : '-'}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                    {f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString('pt-PT') : '-'}
                                                </td>
                                                <td className="px-4 py-3.5 max-w-sm truncate" title={f.obra || f.descricao}>
                                                    {f.obra || f.descricao || 'Prestação de Serviços'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                        {f.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {f.magic_link_token ? (
                                                        <a
                                                            href={`/portal-cliente/${f.magic_link_token}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                        >
                                                            <ExternalLink size={13} /> Abrir Portal
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                                Nenhuma fatura emitida encontrada para este cliente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Contas a Receber */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                    <DollarSign size={16} className="text-emerald-600" />
                                    Contas a Receber e Histórico de Liquidações
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Títulos financeiros, vencimentos e comprovantes de recebimento</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                {data.contasReceber?.length || 0} lançamentos
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3">Documento</th>
                                        <th className="px-4 py-3">Período</th>
                                        <th className="px-4 py-3">Valor (€)</th>
                                        <th className="px-4 py-3">Vencimento</th>
                                        <th className="px-4 py-3">Recebimento</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Comprovante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                    {data.contasReceber && data.contasReceber.length > 0 ? (
                                        data.contasReceber.map((c: any) => (
                                            <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-5 py-3.5 font-medium font-mono text-slate-900 dark:text-slate-100">
                                                    {c.num_doc}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                                    {c.periodo_fat || '-'}
                                                </td>
                                                <td className="px-4 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                                                    € {c.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                    {c.dt_venc ? new Date(c.dt_venc).toLocaleDateString('pt-PT') : '-'}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                    {c.dt_recebimento ? new Date(c.dt_recebimento).toLocaleDateString('pt-PT') : '-'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        c.status === 'Pago' 
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                                                    }`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {c.anexo_url ? (
                                                        <a
                                                            href={c.anexo_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                        >
                                                            <ExternalLink size={13} /> PDF
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400">
                                                Nenhum título a receber registrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: PEDIDOS OPERACIONAIS */}
            {activeTab === 'pedidos' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <Briefcase size={16} className="text-blue-600" />
                                Pedidos e Demandas Operacionais
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Pedidos ativos e históricos cadastrados para o cliente</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {data.pedidos?.length || 0} pedidos
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-5 py-3">Código Pedido</th>
                                    <th className="px-4 py-3">Obra / Frente</th>
                                    <th className="px-4 py-3">Data Início</th>
                                    <th className="px-4 py-3">Data Fim Prevista</th>
                                    <th className="px-4 py-3">Status Comercial</th>
                                    <th className="px-4 py-3">Status Operacional</th>
                                    <th className="px-4 py-3">Origem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {data.pedidos && data.pedidos.length > 0 ? (
                                    data.pedidos.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-3.5 font-medium font-mono text-blue-600 dark:text-blue-400">
                                                {p.CodPedido}
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                                                {p.SiteName}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                {p.DataInicio ? new Date(p.DataInicio).toLocaleDateString('pt-PT') : '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                {p.DataFim ? new Date(p.DataFim).toLocaleDateString('pt-PT') : '-'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                                    {p.StatusComercial}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {p.StatusOperacional}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                                                {p.Origem}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">
                                            Nenhum pedido operacional associado a este cliente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: TRABALHADORES & HORAS */}
            {activeTab === 'trabalhadores' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <Users size={16} className="text-blue-600" />
                                Colaboradores Alocados e Horas Registradas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Trabalhadores com registros de horas prestadas nas obras deste cliente</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {data.trabalhadores?.length || 0} colaboradores
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-5 py-3">Colaborador</th>
                                    <th className="px-4 py-3">Função / Cargo</th>
                                    <th className="px-4 py-3">Horas Acumuladas</th>
                                    <th className="px-4 py-3">Última Atividade</th>
                                    <th className="px-4 py-3">Status Trabalhador</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {data.trabalhadores && data.trabalhadores.length > 0 ? (
                                    data.trabalhadores.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                                {t.nome}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                                {t.funcion}
                                            </td>
                                            <td className="px-4 py-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                                                {Math.round(t.totalHoras)} h
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono">
                                                {t.ultimaAtividade ? new Date(t.ultimaAtividade).toLocaleDateString('pt-PT') : '-'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                                    {t.status || 'Ativo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            Nenhum colaborador com horas registradas para este cliente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 5: OBRAS / SITES */}
            {activeTab === 'obras' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <FolderKanban size={16} className="text-amber-600" />
                                Obras e Locais de Atuação
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Frentes de trabalho registradas para o cliente</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                            {data.obras?.length || 0} obras
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-5 py-3">Nome da Obra</th>
                                    <th className="px-4 py-3">Código Obra</th>
                                    <th className="px-4 py-3">Província / Região</th>
                                    <th className="px-4 py-3">Endereço</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {data.obras && data.obras.length > 0 ? (
                                    data.obras.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                                {s.name}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-slate-500">
                                                {s.site_code || '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                                {s.province || '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 max-w-sm truncate" title={s.address}>
                                                {s.address || '-'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                                    {s.status || 'Ativo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            Nenhum local ou obra cadastrado especificamente para este cliente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 6: REUNIÕES & INCIDÊNCIAS */}
            {activeTab === 'reunioes' && (
                <div className="space-y-6">
                    {/* Reuniões */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <MessageSquareText size={16} className="text-blue-600" />
                                Reuniões Operacionais e Alinhamentos
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Histórico de reuniões da equipe onde este cliente esteve em pauta</p>
                        </div>

                        <div className="p-5">
                            {data.reunioes && data.reunioes.length > 0 ? (
                                <div className="space-y-3">
                                    {data.reunioes.map((r: any) => (
                                        <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                    {r.titulo}
                                                </div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                                    <span>📅 {r.data_reuniao ? new Date(r.data_reuniao).toLocaleDateString('pt-PT') : '-'}</span>
                                                    <span>🏷️ {r.tipo || 'Operacional'}</span>
                                                    <span>📍 {r.modalidade || 'Presencial'}</span>
                                                </div>
                                                {r.resumo_ia && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                                        {r.resumo_ia}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
                                                {r.status || 'Concluída'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-xs text-slate-400 py-6">
                                    Nenhuma reunião operacional registrada especificamente para este cliente.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Incidências */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                Chamados e Incidências Registradas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Ocorrências operacionais abertas para este cliente</p>
                        </div>

                        <div className="p-5">
                            {data.incidencias && data.incidencias.length > 0 ? (
                                <div className="space-y-3">
                                    {data.incidencias.map((inc: any) => (
                                        <div key={inc.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                    {inc.titulo || inc.descricao || `Incidência #${inc.id}`}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1">
                                                    Criada em: {inc.created_at ? new Date(inc.created_at).toLocaleDateString('pt-PT') : '-'}
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                                                {inc.status || 'Aberta'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-xs text-slate-400 py-6">
                                    Nenhuma incidência aberta para este cliente.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
