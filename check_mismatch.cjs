const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
    const worksheet = workbook.Sheets['Control de trabajadores'];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < 10; i++) {
        if (rawData[i] && rawData[i].includes('CodColab')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawData[headerRowIndex];
    let excelCodColabActivo = [];

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        let rowObj = {};
        headers.forEach((h, idx) => {
            if (h) rowObj[h] = row[idx];
        });

        const status = (rowObj['STATUS TRABAJADOR'] || '').toString().trim().toLowerCase();
        if (status.includes('activ') && !status.includes('inactiv')) {
            const codColab = (rowObj['CodColab'] || '').toString().trim();
            if (codColab) {
                excelCodColabActivo.push(codColab);
            }
        }
    }

    console.log(`Excel has ${excelCodColabActivo.length} 'Activo' workers.`);

    // Check DB for these exact cod_colabs
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('cod_colab, status_trabajador, status_seguridad')
        .in('cod_colab', excelCodColabActivo);

    if (error) console.error(error);

    console.log(`Of these ${excelCodColabActivo.length} active Excel cod_colabs, DB found ${data ? data.length : 0} matches.`);

    let inDbButNotActivo = data.filter(d => !d.status_trabajador || !d.status_trabajador.toLowerCase().includes('activ') || d.status_trabajador.toLowerCase().includes('inactiv'));
    console.log(`... and ${inDbButNotActivo.length} of those matched rows are NOT Activo in the DB (like ${inDbButNotActivo.slice(0, 3).map(x => x.cod_colab).join(',')}).`);

    let activeInDb = data.filter(d => d.status_trabajador && d.status_trabajador.toLowerCase() === 'activo');
    console.log(`... and ${activeInDb.length} ARE 'Activo' in the DB.`);
}

check();
