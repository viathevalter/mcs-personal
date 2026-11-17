import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export interface CommissionExportMetadata {
    sellerName: string;
    sellerEmail?: string;
    isCustomRule: boolean;
    comissaoBase: number;
    bonusNovoCliente: number;
    carenciaDias: number;
    startDate: string;
    endDate: string;
    includePendingPrevious: boolean;
    calc: {
        totalBrutoGerado: number;
        totalBloqueadoCarencia: number;
        totalBloqueadoFatura: number;
        totalElegivelReceber: number;
        totalPago: number;
        totalAjustes: number;
        countVagas: number;
        countClientesNovos: number;
    };
}

function fmtDate(dStr: string | null | undefined, dotSeparator = false): string {
    if (!dStr) return '-';
    const clean = String(dStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        const sep = dotSeparator ? '.' : '/';
        return `${parts[2]}${sep}${parts[1]}${sep}${parts[0]}`;
    }
    return clean;
}

function fmtEuro(val: number): string {
    const n = Number(val || 0);
    return `${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function shortPedidoNum(pedidoCod: string | null | undefined): string {
    if (!pedidoCod) return '-';
    const str = String(pedidoCod).trim();
    const match = str.match(/(\d+)$/);
    if (match) {
        return String(parseInt(match[1], 10));
    }
    return str;
}

function shortReemplazoNum(reemplazoCod: string | null | undefined, repassesCount: number): string {
    if (reemplazoCod) {
        const match = String(reemplazoCod).match(/(\d+)$/);
        if (match) return String(parseInt(match[1], 10));
        return String(reemplazoCod);
    }
    if (repassesCount > 0) {
        return `${repassesCount} rep.`;
    }
    return '';
}

function getStatusShortLabel(status: string): string {
    switch (status) {
        case 'ELEGIVEL':
            return 'LIBERADA';
        case 'BLOQUEADA_FATURA':
            return 'AG. FATURA';
        case 'BLOQUEADA_CARENCIA':
            return 'CARÊNCIA';
        case 'REMANEJADO':
            return 'REMANEJADO';
        case 'PAGO':
            return 'PAGO';
        case 'AJUSTE':
            return 'AJUSTE';
        default:
            return status;
    }
}

function buildObservationText(r: any): string {
    const parts: string[] = [];
    const statusLbl = getStatusShortLabel(r.status);
    const fatLbl = r.fatura_quitada
        ? 'Fatura Quitada'
        : r.fatura_status === 'FATURA_ABERTA'
            ? 'Fatura em Aberto'
            : 'Aguard. Fatura';

    parts.push(`[${statusLbl} • ${fatLbl}]`);

    if (r.isRetroactiveOpen) {
        parts.push(`Acumulado ${r.mes_referencia_label || ''}`);
    } else if (r.isValidatedInPeriod) {
        parts.push(`Iniciou ${r.mes_referencia_label || ''} (15d no período)`);
    }

    if (r.remanejado_de_pedido) {
        parts.push(`Remanejado de ${r.remanejado_de_pedido} (sem duplicar comissão)`);
    } else if (r.repasses_count > 0 && Array.isArray(r.historico_vaga) && r.historico_vaga.length > 1) {
        const prevNames = r.historico_vaga
            .filter((h: any) => !h.is_current)
            .map((h: any) => h.worker_name?.split(' ').slice(0, 2).join(' '))
            .filter(Boolean);
        if (prevNames.length > 0) {
            parts.push(`Substituiu: ${prevNames.join(' -> ')}`);
        }
    } else if (r.motivo_bloqueio && r.status !== 'ELEGIVEL' && r.status !== 'PAGO') {
        parts.push(r.motivo_bloqueio);
    }

    return parts.join(' | ');
}

export function exportCommissionsToExcel(rows: any[], meta: CommissionExportMetadata): void {
    const contratacoes = rows.filter(r => r._type === 'generated' && r.tipo_lancamento === 'contratacao');
    const novosClientes = rows.filter(r => r._type === 'generated' && r.tipo_lancamento === 'bonus_cliente_novo');
    const ajustes = rows.filter(r => r._type !== 'generated');

    // Sheet 1: Modelo Relatório Comercial (no padrão da planilha horizontal do comercial + auditoria financeira)
    const sheet1Rows: any[] = [];

    contratacoes.forEach((r, idx) => {
        const raw = r.raw || {};
        const hasReemplazo = (r.repasses_count || 0) > 0 || Boolean(raw.reemplazo_cod);
        const started = !r.is_pending_start && (r.dias_trabalhados > 0 || Boolean(r.start_date));
        const endDateDisplay = r.end_date
            ? fmtDate(r.end_date)
            : raw.data_fim_carencia
                ? fmtDate(raw.data_fim_carencia)
                : 'Em Atividade';

        sheet1Rows.push({
            'ITEM': idx + 1,
            'PEDIDO': shortPedidoNum(r.pedido_cod),
            'CÓD. PEDIDO': r.pedido_cod || '-',
            'EMPRESA': raw.empresa_nome || 'LUMINOUS',
            'CLIENTE': r.cliente_nome || '-',
            '¿INICIÓ?': started ? 'SI' : 'NO',
            'FECHA INICIO REAL': fmtDate(r.pedido_start_date || r.start_date || r.date, true),
            'NOMBRE TRABAJADOR': r.desc || '-',
            'MOVIL': raw.worker_movil || '-',
            'CARGO': r.job_function || '-',
            '¿GENERÓ REEMPLAZO?': hasReemplazo ? 'SI' : 'NO',
            'REEMPLAZO N°': shortReemplazoNum(raw.reemplazo_cod, r.repasses_count || 0),
            'FECHA INICIAL': fmtDate(r.start_date || r.date),
            'FECHA FINAL / VALIDAÇÃO': endDateDisplay,
            'TOTAL DIAS': r.dias_trabalhados ?? 0,
            'FATURA CLIENTE': r.fatura_status_label || '-',
            'STATUS COMISSÃO': getStatusShortLabel(r.status),
            'ORIGEM PERÍODO': r.isRetroactiveOpen ? `Acumulado (${r.mes_referencia_label})` : r.isValidatedInPeriod ? `Validou 15d no Mês (${r.mes_referencia_label})` : 'Mês Selecionado',
            'VALOR €': Number(r.valor || 0),
            'OBSERVACIONES / AUDITORIA': buildObservationText(r)
        });
    });

    if (novosClientes.length > 0) {
        sheet1Rows.push({});
        novosClientes.forEach((r, idx) => {
            const raw = r.raw || {};
            sheet1Rows.push({
                'ITEM': idx + 1,
                'PEDIDO': shortPedidoNum(r.pedido_cod),
                'CÓD. PEDIDO': r.pedido_cod || '-',
                'EMPRESA': raw.empresa_nome || 'LUMINOUS',
                'CLIENTE': r.cliente_nome || '-',
                '¿INICIÓ?': 'SI',
                'FECHA INICIO REAL': fmtDate(r.cliente_created_at || r.date, true),
                'NOMBRE TRABAJADOR': 'EMPRESA NUEVA (BÔNUS NOVO CLIENTE)',
                'MOVIL': '-',
                'CARGO': r.desc || '-',
                '¿GENERÓ REEMPLAZO?': 'NO',
                'REEMPLAZO N°': '',
                'FECHA INICIAL': fmtDate(r.cliente_created_at || r.date),
                'FECHA FINAL / VALIDAÇÃO': fmtDate(raw.data_fim_carencia),
                'TOTAL DIAS': r.dias_trabalhados ?? 0,
                'FATURA CLIENTE': r.fatura_status_label || '-',
                'STATUS COMISSÃO': getStatusShortLabel(r.status),
                'ORIGEM PERÍODO': r.isRetroactiveOpen ? `Acumulado (${r.mes_referencia_label})` : 'Mês Selecionado',
                'VALOR €': Number(r.valor || 0),
                'OBSERVACIONES / AUDITORIA': buildObservationText(r)
            });
        });
    }

    if (ajustes.length > 0) {
        sheet1Rows.push({});
        ajustes.forEach((r, idx) => {
            sheet1Rows.push({
                'ITEM': idx + 1,
                'PEDIDO': '-',
                'CÓD. PEDIDO': '-',
                'EMPRESA': '-',
                'CLIENTE': '-',
                '¿INICIÓ?': '-',
                'FECHA INICIO REAL': fmtDate(r.date, true),
                'NOMBRE TRABAJADOR': r.desc || 'AJUSTE MANUAL',
                'MOVIL': '-',
                'CARGO': '-',
                '¿GENERÓ REEMPLAZO?': '-',
                'REEMPLAZO N°': '',
                'FECHA INICIAL': fmtDate(r.date),
                'FECHA FINAL / VALIDAÇÃO': '-',
                'TOTAL DIAS': '-',
                'FATURA CLIENTE': r.fatura_status_label || '-',
                'STATUS COMISSÃO': getStatusShortLabel(r.status),
                'ORIGEM PERÍODO': 'Lançamento Manual',
                'VALOR €': Number(r.valor || 0),
                'OBSERVACIONES / AUDITORIA': r.desc || ''
            });
        });
    }

    // Summary rows at the bottom of Sheet 1
    sheet1Rows.push({});
    sheet1Rows.push({
        'CLIENTE': 'RESUMO DE FECHAMENTO DA CONTA CORRENTE',
        'NOMBRE TRABAJADOR': `Vendedor: ${meta.sellerName}`,
        'FATURA CLIENTE': 'TOTAL GERADO BRUTO:',
        'VALOR €': Number(meta.calc.totalBrutoGerado.toFixed(2))
    });
    sheet1Rows.push({
        'FATURA CLIENTE': `BLOQUEADO (CARÊNCIA < ${meta.carenciaDias}D):`,
        'VALOR €': Number(meta.calc.totalBloqueadoCarencia.toFixed(2))
    });
    sheet1Rows.push({
        'FATURA CLIENTE': 'BLOQUEADO (AGUARDANDO FATURA):',
        'VALOR €': Number(meta.calc.totalBloqueadoFatura.toFixed(2))
    });
    sheet1Rows.push({
        'FATURA CLIENTE': 'TOTAL ELEGÍVEL / LIBERADO A PAGAR:',
        'VALOR €': Number(meta.calc.totalElegivelReceber.toFixed(2))
    });
    sheet1Rows.push({
        'FATURA CLIENTE': 'TOTAL JÁ PAGO:',
        'VALOR €': Number(meta.calc.totalPago.toFixed(2))
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
    ws1['!cols'] = [
        { wch: 6 },  // ITEM
        { wch: 9 },  // PEDIDO
        { wch: 16 }, // COD PEDIDO
        { wch: 13 }, // EMPRESA
        { wch: 34 }, // CLIENTE
        { wch: 9 },  // INICIO
        { wch: 15 }, // FECHA INICIO REAL
        { wch: 32 }, // NOMBRE TRABAJADOR
        { wch: 18 }, // MOVIL
        { wch: 28 }, // CARGO
        { wch: 18 }, // GENERO REEMPLAZO
        { wch: 13 }, // REEMPLAZO N
        { wch: 14 }, // FECHA INICIAL
        { wch: 18 }, // FECHA FINAL
        { wch: 11 }, // TOTAL DIAS
        { wch: 26 }, // FATURA CLIENTE
        { wch: 16 }, // STATUS COMISSAO
        { wch: 24 }, // ORIGEM PERIODO
        { wch: 12 }, // VALOR
        { wch: 52 }  // OBSERVACIONES
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Relatorio_Comercial');

    const safeSeller = meta.sellerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Relatorio_Comissoes_${safeSeller}_${meta.startDate}_a_${meta.endDate}.xlsx`);
}

export function exportCommissionsToPDF(rows: any[], meta: CommissionExportMetadata): void {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageW = 297;
    const pageH = 210;
    const marginX = 6;
    const usableW = pageW - marginX * 2; // 285mm

    const contratacoes = rows.filter(r => r._type === 'generated' && r.tipo_lancamento === 'contratacao');
    const novosClientes = rows.filter(r => r._type === 'generated' && r.tipo_lancamento === 'bonus_cliente_novo');
    const ajustes = rows.filter(r => r._type !== 'generated');

    // Column definitions totaling 285mm
    const cols = [
        { key: 'item', label: 'ITEM', w: 6, align: 'center' as const, group: 0 },
        { key: 'pedido', label: 'PEDIDO', w: 12, align: 'center' as const, group: 0 },
        { key: 'empresa', label: 'EMPRESA', w: 15, align: 'center' as const, group: 0 },
        { key: 'cliente', label: 'CLIENTE', w: 35, align: 'left' as const, group: 0 },
        { key: 'inicio', label: '¿INICIÓ?', w: 9, align: 'center' as const, group: 0 },
        { key: 'fecha_inicio', label: 'FECHA INICIO', w: 15, align: 'center' as const, group: 0 },

        { key: 'trabajador', label: 'NOMBRE TRABAJADOR', w: 36, align: 'left' as const, group: 1 },
        { key: 'movil', label: 'MOVIL', w: 20, align: 'center' as const, group: 1 },
        { key: 'cargo', label: 'CARGO', w: 25, align: 'left' as const, group: 1 },

        { key: 'reemplazo', label: '¿REEMPL.?', w: 11, align: 'center' as const, group: 2 },
        { key: 'reemplazo_num', label: 'REEMP. N°', w: 9, align: 'center' as const, group: 2 },

        { key: 'fecha_ini_trab', label: 'FECHA INICIAL', w: 15, align: 'center' as const, group: 3 },
        { key: 'fecha_fin_trab', label: 'FECHA FINAL', w: 15, align: 'center' as const, group: 3 },
        { key: 'total_dias', label: 'DIAS', w: 8, align: 'center' as const, group: 3 },

        { key: 'valor', label: 'VALOR €', w: 13, align: 'right' as const, group: 4 },
        { key: 'observaciones', label: 'FATURA / STATUS & OBSERVACIONES', w: 41, align: 'left' as const, group: 5 }
    ];

    const groups = [
        { label: 'VALIDACIÓN INICIO DE TRABAJO', w: 6 + 12 + 15 + 35 + 9 + 15, fill: [217, 150, 117] as [number, number, number] },
        { label: 'DATOS GENERALES', w: 36 + 20 + 25, fill: [198, 156, 109] as [number, number, number] },
        { label: 'TRABAJO CONTINUO', w: 11 + 9, fill: [142, 169, 116] as [number, number, number] },
        { label: `CONTINUIDAD ${meta.carenciaDias} DIAS`, w: 15 + 15 + 8, fill: [232, 168, 124] as [number, number, number] },
        { label: 'VALOR €', w: 13, fill: [255, 242, 204] as [number, number, number] },
        { label: 'AUDITORÍA FINANCIERA & OBSERVACIONES', w: 41, fill: [217, 150, 117] as [number, number, number] }
    ];

    let curY = 8;
    let pageNum = 1;

    const drawTopBanner = (isFirstPage: boolean) => {
        // Dark corporate banner
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(marginX, curY, usableW, isFirstPage ? 16 : 10, 1.5, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isFirstPage ? 11 : 9);
        doc.text(
            `RELATÓRIO DE CONTA CORRENTE DE COMISSÕES — ${meta.sellerName.toUpperCase()}`,
            marginX + 3,
            curY + (isFirstPage ? 6 : 6.2)
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const periodText = `Período: ${fmtDate(meta.startDate)} a ${fmtDate(meta.endDate)}${meta.includePendingPrevious ? ' (+ Acumulado Pendente Anterior)' : ' (Somente Iniciados no Período)'}   |   Regra: € ${meta.comissaoBase.toFixed(2)}/vaga • € ${meta.bonusNovoCliente.toFixed(2)}/cliente novo • Carência: ${meta.carenciaDias} dias`;
        if (isFirstPage) {
            doc.setTextColor(203, 213, 225);
            doc.text(periodText, marginX + 3, curY + 12.2);

            // Right side KPIs on header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(74, 222, 128);
            doc.text(
                `LIBERADO A PAGAR: ${fmtEuro(meta.calc.totalElegivelReceber)}`,
                pageW - marginX - 3,
                curY + 6.2,
                { align: 'right' }
            );
            doc.setFontSize(7.2);
            doc.setTextColor(251, 191, 36);
            doc.text(
                `Total Bruto: ${fmtEuro(meta.calc.totalBrutoGerado)}  |  Ag. Fatura: ${fmtEuro(meta.calc.totalBloqueadoFatura)}  |  Carência: ${fmtEuro(meta.calc.totalBloqueadoCarencia)}  |  Pago: ${fmtEuro(meta.calc.totalPago)}`,
                pageW - marginX - 3,
                curY + 12.2,
                { align: 'right' }
            );
        } else {
            doc.setTextColor(203, 213, 225);
            doc.text(`Página ${pageNum}  |  ${periodText}`, pageW - marginX - 3, curY + 6.2, { align: 'right' });
        }

        curY += isFirstPage ? 18 : 12;
    };

    const drawTableHeaders = () => {
        // Row 1: Group bands
        let x = marginX;
        const h1 = 5.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.2);

        groups.forEach(g => {
            doc.setFillColor(g.fill[0], g.fill[1], g.fill[2]);
            doc.rect(x, curY, g.w, h1, 'FD');
            doc.setTextColor(20, 20, 20);
            doc.text(g.label, x + g.w / 2, curY + 3.8, { align: 'center' });
            x += g.w;
        });
        curY += h1;

        // Row 2: Individual column headers
        x = marginX;
        const h2 = 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.7);

        cols.forEach(c => {
            const gFill = groups[c.group].fill;
            // Slightly lighter tint for subheader
            doc.setFillColor(
                Math.min(255, gFill[0] + 18),
                Math.min(255, gFill[1] + 18),
                Math.min(255, gFill[2] + 18)
            );
            doc.rect(x, curY, c.w, h2, 'FD');
            doc.setTextColor(15, 15, 15);
            doc.text(c.label, x + c.w / 2, curY + 4, { align: 'center' });
            x += c.w;
        });
        curY += h2;
    };

    const checkPageBreak = (neededH: number) => {
        if (curY + neededH > pageH - 10) {
            doc.addPage();
            pageNum++;
            curY = 8;
            drawTopBanner(false);
            drawTableHeaders();
        }
    };

    const fitText = (text: string, maxW: number): string => {
        const clean = String(text || '').trim();
        if (!clean) return '';
        if (doc.getTextWidth(clean) <= maxW) return clean;
        let s = clean;
        while (s.length > 3 && doc.getTextWidth(s + '…') > maxW) {
            s = s.slice(0, -1);
        }
        return s + '…';
    };

    drawTopBanner(true);
    drawTableHeaders();

    const rowH = 5.2;
    doc.setLineWidth(0.15);
    doc.setDrawColor(160, 160, 160);

    // 1. Render Worker Rows
    contratacoes.forEach((r, idx) => {
        checkPageBreak(rowH);
        const raw = r.raw || {};
        const hasReemplazo = (r.repasses_count || 0) > 0 || Boolean(raw.reemplazo_cod);
        const started = !r.is_pending_start && (r.dias_trabalhados > 0 || Boolean(r.start_date));
        const endDateDisplay = r.end_date
            ? fmtDate(r.end_date)
            : raw.data_fim_carencia
                ? fmtDate(raw.data_fim_carencia)
                : 'Ativo';

        const rowValues: Record<string, string> = {
            item: String(idx + 1),
            pedido: shortPedidoNum(r.pedido_cod),
            empresa: raw.empresa_nome || 'LUMINOUS',
            cliente: r.cliente_nome || '-',
            inicio: started ? 'SI' : 'NO',
            fecha_inicio: fmtDate(r.pedido_start_date || r.start_date || r.date, true),
            trabajador: r.desc || '-',
            movil: raw.worker_movil || '-',
            cargo: r.job_function || '-',
            reemplazo: hasReemplazo ? 'SI' : 'NO',
            reemplazo_num: shortReemplazoNum(raw.reemplazo_cod, r.repasses_count || 0),
            fecha_ini_trab: fmtDate(r.start_date || r.date),
            fecha_fin_trab: endDateDisplay,
            total_dias: String(r.dias_trabalhados ?? 0),
            valor: fmtEuro(r.valor || 0),
            observaciones: buildObservationText(r)
        };

        let x = marginX;
        cols.forEach(c => {
            // Cell background color rules matching the commercial spreadsheet style
            let fillRGB: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];

            if (c.key === 'reemplazo') {
                fillRGB = hasReemplazo ? [255, 242, 204] : [198, 224, 180];
            } else if (c.key === 'valor') {
                if (r.status === 'ELEGIVEL' || r.status === 'PAGO') {
                    fillRGB = [198, 224, 180]; // Green
                } else if (r.status === 'REMANEJADO' || Number(r.valor) === 0) {
                    fillRGB = [226, 232, 240]; // Slate/Gray
                } else {
                    fillRGB = [254, 243, 199]; // Amber/Pending
                }
            } else if (c.key === 'observaciones') {
                if (r.status === 'ELEGIVEL') fillRGB = [236, 253, 245];
                else if (r.status === 'BLOQUEADA_FATURA') fillRGB = [255, 247, 237];
                else if (r.status === 'BLOQUEADA_CARENCIA') fillRGB = [254, 252, 232];
                else if (r.status === 'REMANEJADO') fillRGB = [238, 242, 255];
            }

            doc.setFillColor(fillRGB[0], fillRGB[1], fillRGB[2]);
            doc.rect(x, curY, c.w, rowH, 'FD');

            doc.setFont('helvetica', c.key === 'valor' || c.key === 'pedido' || c.key === 'reemplazo' ? 'bold' : 'normal');
            doc.setFontSize(5.6);
            doc.setTextColor(20, 20, 20);

            const txt = fitText(rowValues[c.key] || '', c.w - 1.6);
            if (c.align === 'center') {
                doc.text(txt, x + c.w / 2, curY + 3.6, { align: 'center' });
            } else if (c.align === 'right') {
                doc.text(txt, x + c.w - 1, curY + 3.6, { align: 'right' });
            } else {
                doc.text(txt, x + 0.9, curY + 3.6);
            }

            x += c.w;
        });

        curY += rowH;
    });

    // 2. Render New Clients Section (EMPRESA NUEVA) at the bottom, just like Alex's template
    if (novosClientes.length > 0) {
        curY += 2.5;
        checkPageBreak(rowH * (novosClientes.length + 2));

        novosClientes.forEach((r, idx) => {
            checkPageBreak(rowH);
            const raw = r.raw || {};
            const rowValues: Record<string, string> = {
                item: String(idx + 1),
                pedido: shortPedidoNum(r.pedido_cod),
                empresa: raw.empresa_nome || 'LUMINOUS',
                cliente: r.cliente_nome || '-',
                inicio: 'SI',
                fecha_inicio: fmtDate(r.cliente_created_at || r.date, true),
                trabajador: 'EMPRESA NUEVA (BÔNUS NOVO CLIENTE)',
                movil: '',
                cargo: r.desc || '',
                reemplazo: '',
                reemplazo_num: '',
                fecha_ini_trab: fmtDate(r.cliente_created_at || r.date),
                fecha_fin_trab: fmtDate(raw.data_fim_carencia),
                total_dias: String(r.dias_trabalhados ?? 0),
                valor: fmtEuro(r.valor || 0),
                observaciones: buildObservationText(r)
            };

            let x = marginX;
            cols.forEach(c => {
                let fillRGB: [number, number, number] = [255, 255, 255];
                if (c.key === 'fecha_ini_trab' || c.key === 'fecha_fin_trab' || c.key === 'total_dias') {
                    fillRGB = [248, 203, 173]; // Pink/peach highlight like the template
                } else if (c.key === 'valor') {
                    fillRGB = [198, 224, 180]; // Green highlight
                } else if (c.key === 'trabajador') {
                    fillRGB = [243, 232, 255]; // Soft purple for new client
                }

                doc.setFillColor(fillRGB[0], fillRGB[1], fillRGB[2]);
                doc.rect(x, curY, c.w, rowH, 'FD');

                doc.setFont('helvetica', c.key === 'trabajador' || c.key === 'valor' || c.key === 'cliente' ? 'bold' : 'normal');
                doc.setFontSize(5.6);
                doc.setTextColor(20, 20, 20);

                const txt = fitText(rowValues[c.key] || '', c.w - 1.6);
                if (c.align === 'center') {
                    doc.text(txt, x + c.w / 2, curY + 3.6, { align: 'center' });
                } else if (c.align === 'right') {
                    doc.text(txt, x + c.w - 1, curY + 3.6, { align: 'right' });
                } else {
                    doc.text(txt, x + 0.9, curY + 3.6);
                }

                x += c.w;
            });

            curY += rowH;
        });
    }

    // 3. Render Manual Adjustments if any
    if (ajustes.length > 0) {
        curY += 2;
        ajustes.forEach((r, idx) => {
            checkPageBreak(rowH);
            let x = marginX;
            cols.forEach(c => {
                doc.setFillColor(248, 250, 252);
                doc.rect(x, curY, c.w, rowH, 'FD');
                doc.setFont('helvetica', c.key === 'valor' ? 'bold' : 'normal');
                doc.setFontSize(5.6);
                const val =
                    c.key === 'item' ? String(idx + 1)
                    : c.key === 'fecha_inicio' ? fmtDate(r.date, true)
                    : c.key === 'trabajador' ? (r.desc || 'AJUSTE')
                    : c.key === 'valor' ? fmtEuro(r.valor || 0)
                    : c.key === 'observaciones' ? (r.fatura_status_label || 'Lançamento Manual')
                    : '';
                const txt = fitText(val, c.w - 1.6);
                if (c.align === 'right') doc.text(txt, x + c.w - 1, curY + 3.6, { align: 'right' });
                else if (c.align === 'center') doc.text(txt, x + c.w / 2, curY + 3.6, { align: 'center' });
                else doc.text(txt, x + 0.9, curY + 3.6);
                x += c.w;
            });
            curY += rowH;
        });
    }

    // 4. Footer Summary Box (Total Bruto vs Total Liberado a Pagar)
    curY += 4;
    checkPageBreak(18);

    const summaryCards = [
        { label: 'TOTAL GERADO (CONTA)', val: fmtEuro(meta.calc.totalBrutoGerado), sub: `${meta.calc.countVagas} vagas + ${meta.calc.countClientesNovos} clientes novos`, fill: [241, 245, 249] as [number, number, number], text: [15, 23, 42] as [number, number, number] },
        { label: `BLOQUEADO (CARÊNCIA < ${meta.carenciaDias}D)`, val: fmtEuro(meta.calc.totalBloqueadoCarencia), sub: `Menos de ${meta.carenciaDias} dias trab.`, fill: [254, 243, 199] as [number, number, number], text: [180, 83, 9] as [number, number, number] },
        { label: `${meta.carenciaDias}D OK • AGUARD. FATURA`, val: fmtEuro(meta.calc.totalBloqueadoFatura), sub: 'Aguardando quitação cliente', fill: [255, 237, 213] as [number, number, number], text: [194, 65, 12] as [number, number, number] },
        { label: 'TOTAL JÁ PAGO', val: fmtEuro(meta.calc.totalPago), sub: 'Liquidado na conta corrente', fill: [226, 232, 240] as [number, number, number], text: [51, 65, 85] as [number, number, number] },
        { label: 'TOTAL ELEGÍVEL / A PAGAR', val: fmtEuro(meta.calc.totalElegivelReceber), sub: '15d cumpridos + Fatura Quitada', fill: [198, 224, 180] as [number, number, number], text: [20, 83, 45] as [number, number, number] }
    ];

    const cardW = (usableW - 8) / 5;
    summaryCards.forEach((sc, i) => {
        const cx = marginX + i * (cardW + 2);
        doc.setFillColor(sc.fill[0], sc.fill[1], sc.fill[2]);
        doc.setDrawColor(180, 180, 180);
        doc.roundedRect(cx, curY, cardW, 13, 1.2, 1.2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(sc.text[0], sc.text[1], sc.text[2]);
        doc.text(sc.label, cx + 2.5, curY + 4);

        doc.setFontSize(9.5);
        doc.text(sc.val, cx + 2.5, curY + 8.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(sc.sub, cx + 2.5, curY + 11.7);
    });

    const safeSeller = meta.sellerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Relatorio_Comissoes_${safeSeller}_${meta.startDate}_a_${meta.endDate}.pdf`);
}
