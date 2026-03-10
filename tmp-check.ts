import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function checkFile() {
    const filePath = path.resolve('dados_sharepoint', 'Descuento de coches Febrero.xlsx');
    console.log(`Lendo arquivo: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("Arquivo não encontrado!");
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    console.log(`Total de linhas originais lidas: ${rows.length}`);

    // Mostrando as chaves da primeira linha para entendermos a estrutura
    const firstRow = rows[0] || {};
    console.log(`Chaves da linha 0:`, Object.keys(firstRow));

    // Procura na planilha onde está o código 2128 em qualquer coluna
    let fCount = 0;
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (const key of Object.keys(row)) {
            const val = String(row[key]);
            if (val.includes('2128')) {
                console.log(`ACHOU NA LINHA ${r + 2}, Coluna: "${key}"`);
                console.log(`Valor exato lido: "${val}"`);

                for (let i = 0; i < val.length; i++) {
                    console.log(`  Char ${i} [${val[i]}]: ${val.charCodeAt(i)}`);
                }
                console.log(`----------------------------------`);
                fCount++;
            }
        }
    }

    if (fCount === 0) {
        console.log("Nenhuma menção ao '2128' encontrada na planilha inteira lida pelo XLSX!");
    } else {
        console.log(`Total encontrado: ${fCount}`);
    }
}

checkFile().catch(console.error);
