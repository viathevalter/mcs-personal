import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
    FileText,
    Download,
    DollarSign,
    Calendar,
    Building2,
    CheckCircle2,
    Clock,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface HoleriteEvento {
    id: string;
    tipo_evento: 'provento' | 'desconto';
    categoria: string;
    descricao: string;
    valor: number;
    referencia_dias_horas?: number;
}

interface PortalHolerite {
    id: string;
    empresa_id: string;
    empresa_nome: string;
    empresa_nif?: string;
    worker_id: string;
    mes_referencia: string; // YYYY-MM
    horas_trabalhadas: number;
    total_proventos: number;
    total_descontos: number;
    valor_liquido: number;
    status: string;
    data_pagamento?: string;
    metodo_pagamento?: string;
    eventos: HoleriteEvento[];
}

export function WorkerHoleritesPage() {
    const { workerAuth } = useOutletContext<{ workerAuth: any }>();
    const [holerites, setHolerites] = useState<PortalHolerite[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedHoleriteId, setExpandedHoleriteId] = useState<string | null>(null);

    useEffect(() => {
        if (workerAuth) {
            fetchHolerites();
        }
    }, [workerAuth]);

    const fetchHolerites = async () => {
        try {
            setLoading(true);
            const profiles = workerAuth.profiles && workerAuth.profiles.length > 0 ? workerAuth.profiles : [workerAuth];
            const passport = workerAuth.pasaporte || workerAuth.nie || workerAuth.dnie;

            let allHolerites: PortalHolerite[] = [];

            for (const profile of profiles) {
                const { data, error } = await supabase.rpc('get_worker_holerites_portal', {
                    p_worker_id: profile.id,
                    p_pasaporte: passport
                });

                if (error) {
                    console.error('Error fetching holerites for profile:', profile.id, error);
                    continue;
                }

                if (data && data.success && Array.isArray(data.holerites)) {
                    allHolerites = [...allHolerites, ...data.holerites];
                }
            }

            // Deduplicate by ID and sort descending by mes_referencia
            const uniqueMap = new Map<string, PortalHolerite>();
            for (const h of allHolerites) {
                uniqueMap.set(h.id, h);
            }

            const sorted = Array.from(uniqueMap.values()).sort((a, b) =>
                b.mes_referencia.localeCompare(a.mes_referencia)
            );

            setHolerites(sorted);
        } catch (err: any) {
            console.error('Erro ao buscar holerites:', err);
            toast.error('Erro ao carregar recibos de pagamento.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val?: number | null) => {
        const num = Number(val || 0);
        return num.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
    };

    const formatMonth = (mesRef: string) => {
        if (!mesRef) return '';
        const parts = mesRef.split('-');
        if (parts.length < 2) return mesRef;
        const [year, month] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const handleDownloadPdf = (holerite: PortalHolerite) => {
        try {
            const isSeguridade = Boolean(workerAuth.niss || workerAuth.seguridad_social);
            const title = isSeguridade
                ? 'RECIBO DE VENCIMENTO / NÓMINA'
                : 'DEMONSTRATIVO DE PRESTAÇÃO DE SERVIÇOS';

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const margin = 14;
            const pageWidth = 210;
            const contentWidth = pageWidth - margin * 2;
            let y = 14;

            // Company & Header Box
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(title, margin + 4, y + 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`Entidade Pagadora: ${holerite.empresa_nome || 'MCS'} ${holerite.empresa_nif ? `• NIF: ${holerite.empresa_nif}` : ''}`, margin + 4, y + 12);
            doc.text(`Período de Referência: ${formatMonth(holerite.mes_referencia)} | Horas Apontadas: ${Number(holerite.horas_trabalhadas || 0).toFixed(1)} h`, margin + 4, y + 18);

            y += 28;

            // Worker Info Box
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text('Trabalhador:', margin + 4, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.text(workerAuth.nome, margin + 26, y + 5);

            doc.setFont('helvetica', 'bold');
            doc.text('Doc. Identificação:', margin + 115, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.text(workerAuth.pasaporte || workerAuth.nie || 'N/A', margin + 146, y + 5);

            doc.setFont('helvetica', 'bold');
            doc.text('Função / Categoria:', margin + 4, y + 12);
            doc.setFont('helvetica', 'normal');
            doc.text(workerAuth.funcion || 'Operário Especialista', margin + 35, y + 12);

            doc.setFont('helvetica', 'bold');
            doc.text('Data Pagamento:', margin + 115, y + 12);
            doc.setFont('helvetica', 'normal');
            doc.text(holerite.data_pagamento ? new Date(holerite.data_pagamento).toLocaleDateString('pt-PT') : 'Liquidado', margin + 143, y + 12);

            y += 24;

            // Events Table (Proventos & Descontos)
            const proventos = holerite.eventos.filter(e => e.tipo_evento === 'provento');
            const descontos = holerite.eventos.filter(e => e.tipo_evento === 'desconto');

            const colW = (contentWidth - 4) / 2;

            // Left Table: Proventos / Vencimentos
            doc.setFillColor(30, 41, 59);
            doc.rect(margin, y, colW, 6.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text('Proventos / Remunerações', margin + 3, y + 4.5);
            doc.text('Valor', margin + colW - 3, y + 4.5, { align: 'right' });

            // Right Table: Descontos
            doc.setFillColor(30, 41, 59);
            doc.rect(margin + colW + 4, y, colW, 6.5, 'F');
            doc.text('Descontos / Retenções', margin + colW + 7, y + 4.5);
            doc.text('Valor', margin + contentWidth - 3, y + 4.5, { align: 'right' });

            y += 6.5;

            const maxRows = Math.max(proventos.length, descontos.length, 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            for (let i = 0; i < maxRows; i++) {
                const prov = proventos[i];
                const desc = descontos[i];

                // Left row
                doc.setDrawColor(226, 232, 240);
                doc.rect(margin, y, colW, 6, 'S');
                doc.setTextColor(30, 41, 59);
                if (prov) {
                    doc.text(prov.descricao || prov.categoria, margin + 3, y + 4.2);
                    doc.text(formatCurrency(prov.valor), margin + colW - 3, y + 4.2, { align: 'right' });
                } else if (i === 0 && proventos.length === 0) {
                    doc.text('Remuneração de Horas Trabalhadas', margin + 3, y + 4.2);
                    doc.text(formatCurrency(holerite.total_proventos), margin + colW - 3, y + 4.2, { align: 'right' });
                }

                // Right row
                doc.rect(margin + colW + 4, y, colW, 6, 'S');
                if (desc) {
                    doc.text(desc.descricao || desc.categoria, margin + colW + 7, y + 4.2);
                    doc.text(formatCurrency(desc.valor), margin + contentWidth - 3, y + 4.2, { align: 'right' });
                } else if (i === 0 && descontos.length === 0) {
                    doc.text('Sem descontos', margin + colW + 7, y + 4.2);
                    doc.text(formatCurrency(0), margin + contentWidth - 3, y + 4.2, { align: 'right' });
                }

                y += 6;
            }

            // Subtotals
            y += 2;
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y, colW, 6.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.text('Total Proventos:', margin + 3, y + 4.5);
            doc.text(formatCurrency(holerite.total_proventos), margin + colW - 3, y + 4.5, { align: 'right' });

            doc.rect(margin + colW + 4, y, colW, 6.5, 'FD');
            doc.text('Total Descontos:', margin + colW + 7, y + 4.5);
            doc.text(formatCurrency(holerite.total_descontos), margin + contentWidth - 3, y + 4.5, { align: 'right' });

            // Grand Total Líquido
            y += 10;
            doc.setFillColor(220, 252, 231); // emerald-100
            doc.setDrawColor(34, 197, 94); // emerald-500
            doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

            doc.setFontSize(10);
            doc.setTextColor(22, 101, 52); // emerald-800
            doc.text('VALOR LÍQUIDO PAGO / TRANSFERIDO:', margin + 6, y + 8);
            doc.setFontSize(12);
            doc.text(formatCurrency(holerite.valor_liquido), margin + contentWidth - 6, y + 8, { align: 'right' });

            // Footer
            y += 20;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('Documento emitido eletronicamente para fins informativos e comprobatórios do trabalhador.', margin, y);

            doc.save(`Recibo_${formatMonth(holerite.mes_referencia).replace(/\s+/g, '_')}_${workerAuth.nome.replace(/\s+/g, '_')}.pdf`);
            toast.success('Recibo descarregado com sucesso!');
        } catch (err: any) {
            console.error('Erro ao gerar PDF:', err);
            toast.error('Erro ao gerar o documento PDF.');
        }
    };

    const isSeguridade = Boolean(workerAuth?.niss || workerAuth?.seguridad_social);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {isSeguridade ? 'Minhas Nóminas e Recibos' : 'Demonstrativos de Pagamento'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Consulte os recibos dos meses já liquidados e pagos pela empresa.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : holerites.length === 0 ? (
                <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-white shadow-sm space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-semibold text-slate-800">Nenhum pagamento liquidado no momento</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Os recibos ficam disponíveis aqui assim que o departamento financeiro processa e confirma o pagamento.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {holerites.map((h) => {
                        const isExpanded = expandedHoleriteId === h.id;
                        const proventos = h.eventos.filter(e => e.tipo_evento === 'provento');
                        const descontos = h.eventos.filter(e => e.tipo_evento === 'desconto');

                        return (
                            <Card key={h.id} className="border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
                                <CardHeader className="bg-slate-50/50 pb-3 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold text-slate-900">
                                                    {formatMonth(h.mes_referencia)}
                                                </CardTitle>
                                                <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                                                    <Building2 className="h-3 w-3" /> {h.empresa_nome}
                                                    {h.horas_trabalhadas > 0 && ` • ${Number(h.horas_trabalhadas).toFixed(1)}h trabalhadas`}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <CheckCircle2 className="h-3 w-3" /> Pago
                                            </span>
                                            {h.data_pagamento && (
                                                <span className="text-xs text-slate-500 hidden sm:inline">
                                                    {new Date(h.data_pagamento).toLocaleDateString('pt-PT')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 pb-3">
                                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
                                                <TrendingUp className="h-3 w-3 text-blue-500" /> Proventos
                                            </p>
                                            <p className="text-sm font-semibold text-slate-800 mt-0.5">
                                                {formatCurrency(h.total_proventos)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
                                                <TrendingDown className="h-3 w-3 text-red-500" /> Descontos
                                            </p>
                                            <p className="text-sm font-semibold text-red-600 mt-0.5">
                                                {formatCurrency(h.total_descontos)}
                                            </p>
                                        </div>
                                        <div className="bg-emerald-50 rounded p-1 border border-emerald-100">
                                            <p className="text-[11px] text-emerald-700 font-bold">Líquido Recebido</p>
                                            <p className="text-sm font-extrabold text-emerald-900 mt-0.5">
                                                {formatCurrency(h.valor_liquido)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Expandable items breakdown */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                Detalhamento de Rubricas
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                {/* Proventos list */}
                                                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                    <p className="font-semibold text-slate-700 border-b border-slate-200 pb-1 flex justify-between">
                                                        <span>Vencimentos</span>
                                                        <span>{formatCurrency(h.total_proventos)}</span>
                                                    </p>
                                                    {proventos.length > 0 ? (
                                                        proventos.map((p, idx) => (
                                                            <div key={idx} className="flex justify-between text-slate-600">
                                                                <span className="truncate pr-2">{p.descricao || p.categoria}</span>
                                                                <span className="font-mono">{formatCurrency(p.valor)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex justify-between text-slate-600">
                                                            <span>Horas Apontadas</span>
                                                            <span className="font-mono">{formatCurrency(h.total_proventos)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Descontos list */}
                                                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                    <p className="font-semibold text-slate-700 border-b border-slate-200 pb-1 flex justify-between">
                                                        <span>Deduções</span>
                                                        <span>{formatCurrency(h.total_descontos)}</span>
                                                    </p>
                                                    {descontos.length > 0 ? (
                                                        descontos.map((d, idx) => (
                                                            <div key={idx} className="flex justify-between text-slate-600">
                                                                <span className="truncate pr-2">{d.descricao || d.categoria}</span>
                                                                <span className="font-mono text-red-600">-{formatCurrency(d.valor)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-slate-400 italic">Sem deduções registradas</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="bg-slate-50/50 pt-2 pb-3 border-t flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedHoleriteId(isExpanded ? null : h.id)}
                                        className="text-xs text-slate-600 gap-1 h-8"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp className="h-3.5 w-3.5" /> Ocultar Detalhes
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-3.5 w-3.5" /> Ver Detalhes
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadPdf(h)}
                                        className="text-xs gap-1.5 h-8 border-slate-300 hover:bg-slate-100"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Baixar PDF
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
