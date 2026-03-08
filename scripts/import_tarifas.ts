import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx'; // anon key is enough if RLS allows or we use service_role. 
// Actually anon key might not allow massive updates. Let me just console.log the data first.

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
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
    if (rows.length > 0) {
        console.log('Sample row:', rows[0]);
    }
}

main().catch(console.error);
