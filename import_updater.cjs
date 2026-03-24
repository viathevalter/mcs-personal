const xlsx = require('xlsx');
const { Client } = require('pg');
const fs = require('fs');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const companyMap = {
  'WISEOWE': 'dae64d51-2181-4510-b14f-e63d2f111a8e',
  'STOCCO': '441f1f5d-aed3-40e3-8c77-7b1217757251',
  'KOTRIK & ROSAS': 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
  'ROSAS': 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
  'KOTRIK': 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
  'TRIANGULO': 'a798620a-358a-4c6c-9db2-3a507c583cac',
  'LOGIN PRO': 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
  // Luminous will be fetched dynamically from db 
};

const run = async () => {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_implantar.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    let successCount = 0;
    
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
    } catch(e) {
        console.log('Error connecting', e);
        return;
    }

    // Capture the ID of Luminous
    const l_res = await prodClient.query("SELECT id FROM core_common.empresas WHERE codigo = 'LUM';");
    if(l_res.rows.length > 0) {
        companyMap['LUMINOUS'] = l_res.rows[0].id;
    }

    for (const row of data) {
        const codColab = row['CodColab'] ? String(row['CodColab']).trim() : '';
        if(!codColab) continue;

        const contratanteObj = String(row['Contratante'] || '').trim().toUpperCase();
        let empresa_id = companyMap[contratanteObj] || companyMap['KOTRIK'];
        
        let funcion = row['Funcion'] ? String(row['Funcion']).trim() : '-';
        let cliente = row['Nome Cliente'] ? String(row['Nome Cliente']).trim() : '-';
        let contratante_str = row['Contratante'] ? String(row['Contratante']).trim() : '-';

        try {
            await prodClient.query(`
                UPDATE core_personal.workers 
                SET empresa_id = $1, 
                    contratante = $2, 
                    funcion = $3, 
                    cliente = $4,
                    status_seguridad = COALESCE($6, status_seguridad),
                    status_trabajador = COALESCE($7, status_trabajador)
                WHERE cod_colab = $5;
            `, [
                empresa_id, 
                contratante_str, 
                funcion, 
                cliente, 
                codColab,
                row['Status Seguridade'] || 'Em Regularização',
                row['Status Colaborador'] || 'Ativo'
            ]);
            successCount++;
        } catch(e) {
            console.error(`❌ Erro FATAL no Colaborador ${row['CodColab']} (${row['Colaborador']}):\n  ->`, e.message);
        }
    }
    
    console.log(`\n✅ Sucesso! Atualizados ${successCount} de ${data.length} trabalhadores na PRODUÇÃO!`);
    await prodClient.end();
}

run();
