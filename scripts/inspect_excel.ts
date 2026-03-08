import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function main() {
    const filePath = path.join('C:', 'Projetos IA', 'Kotrik', 'mcs-personal', 'dados_sharepoint', 'tarifa_trabalhador.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const fileData = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileData, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
    console.log(`Total rows in Excel: ${rows.length}`);

    const nivaldoRows = rows.filter(r => {
        const name = String(r['Colaborador'] || r['Nome'] || '').toLowerCase();
        return name.includes('nivaldo') || name.includes('mendes da silva');
    });

    console.log("Found rows for Nivaldo:");
    console.dir(nivaldoRows, { depth: null });

    // Check what the first 5 rows actually look like to see the column names
    console.log("First 2 rows:");
    console.dir(rows.slice(0, 2), { depth: null });
}

main();
