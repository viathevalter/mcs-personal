const xlsx = require('xlsx');
const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const companyMap = {
  'WISEOWE': 'dae64d51-2181-4510-b14f-e63d2f111a8e',
  'STOCCO': '441f1f5d-aed3-40e3-8c77-7b1217757251',
  'KOTRIK & ROSAS': 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
  'KOTRIK': 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
  'TRIANGULO': 'a798620a-358a-4c6c-9db2-3a507c583cac',
  'LOGIN PRO': 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
};

const run = async () => {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_implantar.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
    } catch(e) {
        console.log('Error connecting', e);
        return;
    }

    console.log("Processing first row:");
    const row = data[0];
    console.log(row);

    const codColab = row['CodColab'] ? String(row['CodColab']).trim() : '';
    const nome = row['Colaborador'] ? String(row['Colaborador']).trim() : '';
    const contratanteObj = String(row['Contratante'] || '').trim().toUpperCase();
            
    let empresa_id = companyMap[contratanteObj] || companyMap['KOTRIK'];

    try {
        console.log("Running INSERT INTO core_personal.workers...");
        const res = await prodClient.query(`
            INSERT INTO core_personal.workers 
            (empresa_id, cod_colab, nome, status_seguridad, status_trabajador)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `, [
            empresa_id, codColab, nome, 
            row['Status Seguridade'] || 'Em Regularização',
            row['Status Colaborador'] || 'Ativo'
        ]);
        console.log("INSERT RESULT:", res.rows);
    } catch(e) {
        console.log("INSERT FAILED:", e.message);
    }

    const c1 = await prodClient.query("SELECT COUNT(*) FROM core_personal.workers;");
    console.log("FINAL COUNT:", c1.rows[0].count);

    await prodClient.end();
}

run();
