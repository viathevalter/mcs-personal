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

const parseExcelDate = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number') {
        const d = new Date((excelDate - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    return null;
}

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

    for (const row of data) {
        try {
            // Não mais BEGIN unificado pois aborts engoliam o block inteiro.
            
            const codColab = row['CodColab'] ? String(row['CodColab']).trim() : '';
            if (codColab === 'E0266' || codColab === '999999') {
                 // Pular os que eu já inseri na mão
                 continue;
            }
            
            const nome = row['Colaborador'] ? String(row['Colaborador']).trim() : '';
            const contratanteObj = String(row['Contratante'] || '').trim().toUpperCase();
            let empresa_id = companyMap[contratanteObj] || companyMap['KOTRIK'];
            const id_empresa = typeof row['Id_contratante'] === 'number' ? row['Id_contratante'] : 1;
            
            // 1. Insert core_personal.workers
            await prodClient.query(`
                INSERT INTO core_personal.workers 
                (empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, status_seguridad, status_trabajador)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
            `, [
                empresa_id, codColab, nome, 
                row['Movil'] ? String(row['Movil']) : null, 
                row['NISS'] ? String(row['NISS']) : null, 
                row['NIF'] ? String(row['NIF']) : null, 
                row['Pasaporte'] ? String(row['Pasaporte']) : null, 
                row['Status Seguridade'] || 'Em Regularização',
                row['Status Colaborador'] || 'Ativo'
            ]);
            
            // 2. Insert public.colaboradores 
            try {
                await prodClient.query(`
                    INSERT INTO public.colaboradores
                    (cod_colab, nombre_y_apellidos, id_empresa, contratante, cod_funcion, funcion, fecha_alta_ss)
                    VALUES ($1, $2, $3, $4, $5, $6, $7);
                `, [
                    codColab, nome, id_empresa, contratanteObj,
                    row['Cod_funcion'] || null,
                    row['Funcion'] || null,
                    parseExcelDate(row['Fecha Alta'])
                ]);
            } catch(ee) { console.error("Error public.colaboradores:", ee.message); }
            
            // 3. Insert public.colaborador_por_pedido
            try {
                await prodClient.query(`
                    INSERT INTO public.colaborador_por_pedido
                    (cod_colab, codcliente, cliente_nombre, contratante, id_funcion_contratacion, fechainiciopedido)
                    VALUES ($1, $2, $3, $4, $5, $6);
                `, [
                    codColab, 
                    row['cod_cliente'] || null, 
                    row['Nome Cliente'] || 'NÃO DEFINIDO', 
                    contratanteObj, 
                    row['Cod_funcion'] || null,
                    parseExcelDate(row['Fecha Inicio'])
                ]);
            } catch(ee) { console.error("Error public.colaborador_por_pedido:", ee.message); }

            successCount++;
        } catch(e) {
            console.error(`❌ Erro FATAL no Colaborador ${row['CodColab']} (${row['Colaborador']}):\n  ->`, e.message);
        }
    }
    
    console.log(`\n✅ Sucesso! Injetados ${successCount} de ${data.length} trabalhadores ativos na PRODUÇÃO!`);
    await prodClient.end();
}

run();
