import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

    const uniqueRowsMap = new Map<string, number>();

    rows.forEach(r => {
        const codColab = String(r['Cod trabalhador'] || r['codigo'] || r['cod_colab'] || '').trim().replace(/'/g, "''");
        let tarifa = parseFloat(String(r['Tarifa'] || r['Tarifa Hora'] || r['valor']).replace(',', '.'));

        if (codColab.includes('0088')) {
            console.log("Found 0088:", r);
            console.log("Parsed codColab:", codColab, "Parsed Tarifa:", tarifa);
        }

        if (codColab && !isNaN(tarifa)) {
            uniqueRowsMap.set(codColab, tarifa);
        }
    });

    const valuesPart = Array.from(uniqueRowsMap.entries()).map(([codColab, tarifa]) => {
        return `('${codColab}', ${tarifa})`;
    }).join(',\n    ');

    if (!valuesPart) {
        console.log('No valid data found to generate SQL.');
        return;
    }

    const sql = `
DO $$ 
DECLARE 
    temp_row record;
BEGIN
    -- Create a temporary table with our values
    CREATE TEMP TABLE temp_tarifas (cod_colab text, tarifa numeric) ON COMMIT DROP;
    
    INSERT INTO temp_tarifas (cod_colab, tarifa) VALUES
    ${valuesPart};
    
    -- Now insert or update into the actual table
    INSERT INTO core_personal.worker_beneficios_settings (worker_id, tarifa_hora)
    SELECT w.id, t.tarifa
    FROM temp_tarifas t
    JOIN core_personal.workers w ON w.cod_colab = t.cod_colab
    ON CONFLICT (worker_id) 
    DO UPDATE SET tarifa_hora = EXCLUDED.tarifa_hora;
    
    RAISE NOTICE 'Tariffs synchronized successfully';
END $$;
`;

    const outPath = path.join(process.cwd(), 'update_tarifas_block.sql');
    fs.writeFileSync(outPath, sql, 'utf8');
    console.log(`Wrote complete SQL block to ${outPath}. Running through UI Supabase CLI...`);

    // Use the reliable -c flag or file
    try {
        execSync(`npx supabase db query -f update_tarifas_block.sql`, { stdio: 'inherit' });
    } catch (e: any) {
        // Fallback for supabase query if it doesn't support -f locally
        try {
            execSync(`psql $DATABASE_URL -f update_tarifas_block.sql`, { stdio: 'inherit' });
        } catch (e2: any) {
            console.log('Manually copy update_tarifas_block.sql and run it in the Supabase Dashboard.');
        }
    }
}

main();
