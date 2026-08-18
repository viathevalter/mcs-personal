import * as XLSX from 'xlsx';
import type { Worker } from '@/shared/types/corePersonal';
import { format } from 'date-fns';

export interface BankExportWorkerItem {
    worker: Worker & { worker_beneficios_settings?: any };
    valorLiquido: number;
    iban?: string;
    banco?: string;
}

export function exportBankTransferSpreadsheet({
    items,
    mesReferencia,
    empresaNome = 'Todas as Empresas',
}: {
    items: BankExportWorkerItem[];
    mesReferencia: string;
    empresaNome?: string;
}) {
    if (!items || items.length === 0) return;

    // Build standard bank transfer sheet rows
    const rows = items.map((item, index) => {
        const w = item.worker;
        const rawIban = (item.iban || '').replace(/\s+/g, '').toUpperCase();
        
        return {
            'Nº': index + 1,
            'Código': w.cod_colab || '-',
            'Beneficiário': w.nome,
            'IBAN / Conta': rawIban || 'SEM IBAN CADASTRADO',
            'Banco': item.banco || '-',
            'Valor a Pagar (€)': Number(item.valorLiquido.toFixed(2)),
            'Conceito / Referência': `Folha ${mesReferencia} - ${w.nome} (${w.cod_colab || ''})`,
            'NISS': w.niss || '-',
            'Empresa Contratante': w.contratante || '-',
            'Cliente': w.cliente_nombre || '-',
            'Data de Emissão': format(new Date(), 'dd/MM/yyyy')
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 5 },   // Nº
        { wch: 10 },  // Código
        { wch: 35 },  // Beneficiário
        { wch: 32 },  // IBAN
        { wch: 18 },  // Banco
        { wch: 18 },  // Valor a Pagar (€)
        { wch: 45 },  // Conceito / Referência
        { wch: 16 },  // NISS
        { wch: 20 },  // Empresa Contratante
        { wch: 25 },  // Cliente
        { wch: 16 },  // Data de Emissão
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Remessa Bancária');

    const cleanComp = mesReferencia.replace('-', '_');
    const filename = `Remessa_Bancaria_Folha_${cleanComp}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, filename);
}
