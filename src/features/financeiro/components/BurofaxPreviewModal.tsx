import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale, Printer, ShieldAlert, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EnrichedTitulo } from '../types';
import { formatCurrency } from '../lib/utils';

export interface BurofaxPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTitles: EnrichedTitulo[];
    originalTotal: number;
    onConfirmLegal: () => void;
    isConfirming: boolean;
}

export const BurofaxPreviewModal = ({
    isOpen,
    onClose,
    selectedTitles,
    originalTotal,
    onConfirmLegal,
    isConfirming
}: BurofaxPreviewModalProps) => {
    const { t } = useTranslation();

    const clientName = selectedTitles[0]?.clienteInfo?.Nome || selectedTitles[0]?.Cliente || 'Cliente';
    const clientAddress = selectedTitles[0]?.clienteInfo?.End || 'No Definido';
    const clientZip = selectedTitles[0]?.clienteInfo?.Cod_postal || '';
    const clientCity = selectedTitles[0]?.clienteInfo?.Localidade || '';
    const companyName = selectedTitles[0]?.Empresa || 'WISEOWE';

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRows = selectedTitles.map(t => {
            const delay = t.Dt_venc ? Math.floor((new Date().getTime() - new Date(t.Dt_venc).getTime()) / (1000 * 3600 * 24)) : 0;
            return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${t.Num_doc}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${new Date(t.Dt_venc).toLocaleDateString('es-ES')}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${delay} días</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${t.Saldo ? t.Saldo.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} €</td>
                </tr>
            `;
        }).join('');

        const formattedTotal = originalTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Burofax - Requerimiento de Pago</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 13px;
                            line-height: 1.6;
                            color: #333;
                            margin: 45px;
                        }
                        .header {
                            margin-bottom: 40px;
                        }
                        .company-info {
                            font-weight: bold;
                            margin-bottom: 20px;
                            font-size: 12px;
                        }
                        .debtor-info {
                            float: right;
                            border: 1px solid #ccc;
                            padding: 15px;
                            width: 300px;
                            background-color: #fafafa;
                            margin-bottom: 30px;
                            font-size: 12px;
                        }
                        .clear {
                            clear: both;
                        }
                        .title {
                            text-align: center;
                            font-size: 15px;
                            font-weight: bold;
                            margin-top: 30px;
                            margin-bottom: 30px;
                            text-decoration: underline;
                        }
                        .table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            font-size: 12px;
                        }
                        .total-row {
                            font-weight: bold;
                            background-color: #f2f2f2;
                        }
                        .footer {
                            margin-top: 50px;
                            font-size: 12px;
                        }
                        @media print {
                            body { margin: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-info">
                            REMITENTE:<br>
                            ${companyName}<br>
                            Departamento de Administración y Finanzas
                        </div>
                        <div class="debtor-info">
                            <strong>DESTINATARIO:</strong><br>
                            ${clientName}<br>
                            ${clientAddress}<br>
                            ${clientZip} ${clientCity}
                        </div>
                        <div class="clear"></div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}
                    </div>

                    <div class="title">REQUERIMIENTO FORMAL DE PAGO (VÍA EXTRAJUDICIAL PREVIA A LA VÍA JUDICIAL)</div>

                    <p>Muy Sres. nuestros:</p>

                    <p>Por medio de la presente, en representación del Departamento de Administración y Finanzas de <strong>${companyName}</strong>, nos dirigimos a ustedes a fin de requerirles formalmente el pago inmediato de la deuda vencida, líquida y exigible que mantienen con nuestra compañía. A la fecha del presente documento, sus cuentas registran un saldo deudor pendiente correspondiente a las siguientes facturas comerciales:</p>

                    <table class="table">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nº Factura</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Vencimiento</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Retraso</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                            <tr class="total-row">
                                <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">TOTAL DEUDA RECLAMADA:</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formattedTotal} €</td>
                            </tr>
                        </tbody>
                    </table>

                    <p>De conformidad con lo dispuesto en el Código Civil y de conformidad con los términos establecidos en la <strong>Ley 3/2004, de 29 de diciembre</strong>, por la que se establecen medidas de lucha contra la morosidad en las operaciones comerciales, <strong>LES REQUERIMOS FORMALMENTE</strong> para que procedan a abonar la cantidad total adeudada de <strong>${formattedTotal} €</strong> en el plazo improrrogable de <strong>10 días naturales</strong> a contar desde la recepción de esta comunicación.</p>

                    <p>El abono de la citada cantidad deberá realizarse mediante transferencia bancaria a la cuenta habitual de cobros o poniéndose en contacto de inmediato con nuestro departamento para verificar los datos de facturación.</p>

                    <p>Asimismo, les informamos que la presente reclamación previa constituye una vía de solución extrajudicial formal que se realiza con carácter previo al ejercicio de acciones legales ante los Tribunales, sirviendo a todos los efectos como intento de reclamación y solución de controversias mediante <strong>Medios Adecuados de Solución de Controversias (MASC)</strong>, en cumplimiento con los nuevos requisitos procesales en el ámbito civil en España.</p>

                    <p>En el supuesto de que transcurra el citado plazo de 10 días sin que se haya verificado el cobro de la cantidad adeudada o concertado un compromiso formal de pago, procederemos de inmediato y sin necesidad de nuevo aviso a iniciar las correspondientes acciones judiciales, interponiendo la correspondiente demanda de <strong>Procedimiento Monitorio</strong>. En tal caso, además del principal adeudado, les serán reclamados los intereses de demora comerciales legales correspondientes, así como las costas, gastos y honorarios que se deriven del mencionado procedimiento judicial.</p>

                    <p>Sin otro particular, a la espera de sus prontas noticias y de que regularicen esta situación de forma amistosa, les saludamos atentamente.</p>

                    <div class="footer">
                        Atentamente,<br><br><br>
                        ______________________________________<br>
                        <strong>Dirección de Administración y Finanzas</strong><br>
                        ${companyName}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-650 dark:text-red-400">
                        <Scale className="w-5 h-5" />
                        <DialogTitle className="text-base font-bold">{t('financeiro.negotiation.burofax_preview', 'Gerador de Burofax (Requerimento de Pago)')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        {t('financeiro.negotiation.burofax_desc', 'Visualize o documento oficial em espanhol contendo a relação de títulos pendentes e a notificação judicial (MASC).')}
                    </DialogDescription>
                </DialogHeader>

                <div className="border dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-950/20 max-h-[350px] overflow-y-auto font-serif text-xs text-slate-850 dark:text-slate-200 space-y-4">
                    {/* Header Letter Mockup */}
                    <div className="flex justify-between border-b pb-2 mb-2 dark:border-slate-800 font-sans text-[10px] text-muted-foreground">
                        <div>
                            <strong>REMITENTE:</strong><br />
                            {companyName}
                        </div>
                        <div className="text-right">
                            <strong>DESTINATARIO:</strong><br />
                            {clientName}<br />
                            {clientAddress}
                        </div>
                    </div>

                    <div className="text-[10px] font-sans text-muted-foreground">
                        <strong>Fecha:</strong> {new Date().toLocaleDateString('es-ES')}
                    </div>

                    <div className="text-center font-bold text-sm underline text-slate-950 dark:text-white uppercase my-3 font-sans">
                        Requerimiento Formal de Pago (Vía Extrajudicial / MASC)
                    </div>

                    <p>Muy Sres. nuestros:</p>

                    <p>Por la presente, nos dirigimos a ustedes a fin de requerirles formalmente el abono inmediato de la deuda vencida, líquida y exigible que mantienen con nuestra compañía, correspondiente a las facturas que se detallan a continuación:</p>

                    {/* Table of titles */}
                    <div className="border rounded dark:border-slate-850 overflow-hidden font-sans my-2">
                        <table className="w-full text-[10px] border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-800 text-slate-700 dark:text-slate-350">
                                    <th className="p-2 text-left">Documento</th>
                                    <th className="p-2 text-left">Vencimiento</th>
                                    <th className="p-2 text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedTitles.map((t, idx) => (
                                    <tr key={t.id || idx} className="border-b dark:border-slate-850 last:border-0">
                                        <td className="p-2 font-mono font-semibold">{t.Num_doc}</td>
                                        <td className="p-2">{t.Dt_venc ? new Date(t.Dt_venc).toLocaleDateString('es-ES') : ''}</td>
                                        <td className="p-2 text-right font-bold">{formatCurrency(t.Saldo || 0)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-100/50 dark:bg-slate-900/50 font-bold border-t dark:border-slate-800">
                                    <td colSpan={2} className="p-2 text-right">TOTAL RECLAMADO:</td>
                                    <td className="p-2 text-right text-red-650">{formatCurrency(originalTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p>Les requerimos para que procedan a liquidar el importe total en el plazo improrrogable de <strong>10 días naturales</strong> a contar desde la recepción del presente aviso.</p>

                    <p>Esta comunicación previa sirve a efectos legales como intento de solución de controversias extrajudicial <strong>(MASC - Medios Adecuados de Solución de Controversias)</strong> en España, requisito obligatorio previo a cualquier demanda judicial en el ámbito civil.</p>

                    <p>De no recibir el pago o propuesta formal de liquidación en el plazo establecido, procederemos de inmediato y sin necesidad de nuevo aviso a interponer la correspondiente demanda mediante el <strong>Procedimiento Monitorio</strong> comercial ante los tribunales correspondientes.</p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t dark:border-slate-800 pt-3 flex justify-between items-center">
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handlePrint}
                            className="text-xs h-9 gap-1.5 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-650 dark:border-slate-850 dark:hover:bg-slate-950/40"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            {t('financeiro.negotiation.btn_print', 'Imprimir / Salvar PDF')}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={onClose}
                            disabled={isConfirming}
                            className="text-xs h-9"
                        >
                            {t('financeiro.negotiation.btn_back', 'Voltar')}
                        </Button>
                        <Button 
                            onClick={onConfirmLegal}
                            disabled={isConfirming}
                            className="text-xs h-9 bg-red-700 text-white hover:bg-red-800 gap-1.5 font-bold"
                        >
                            <Scale className="w-3.5 h-3.5" />
                            {isConfirming ? t('financeiro.negotiation.btn_saving', 'Salvando...') : t('financeiro.negotiation.btn_confirm_legal', 'Confirmar e Enviar para Jurídico')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
