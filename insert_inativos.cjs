const xlsx = require('xlsx');
const fs = require('fs');

const EMPRESA_MAP = {
    'STOCCO': '441f1f5d-aed3-40e3-8c77-7b1217757251',
    'LUMINOUS': '847796c4-b253-4e53-9e6b-34a127ec7d85',
    'WISEOWE': 'dae64d51-2181-4510-b14f-e63d2f111a8e',
    'TRIANGULO': 'a798620a-358a-4c6c-9db2-3a507c583cac'
};

function standardizeStatus(status) {
    if (status === undefined || status === null) return null;
    return status.toString().trim().replace(/'/g, "''"); // escape for SQL
}

function excelDateToJSDate(excelDate) {
    if (!excelDate) return null;
    if (typeof excelDate === 'string') {
        if (excelDate.includes('/')) {
            const parts = excelDate.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return excelDate;
    }
    return new Date((excelDate - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
}

async function run() {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_inativos.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    let sql = 'BEGIN;\n';
    
    for (const row of rawData) {
        const codColab = standardizeStatus(row['CodColab']);
        if (!codColab) continue;

        const dateSalida = excelDateToJSDate(row['FECHA SALIDA TRABAJADOR']);
        const statusTrabajador = standardizeStatus(row['STATUS TRABAJADOR']) || 'Inactivo';
        const statusSeguridad = standardizeStatus(row['Status Seguridade']) || 'Baja';

        const nome = standardizeStatus(row['Colaborador']);
        const movil = standardizeStatus(row['Movil']);
        const niss = standardizeStatus(row['NISS']);
        const nif = standardizeStatus(row['NIF']);
        const pasaporte = standardizeStatus(row['Pasaporte']);
        const funcion = standardizeStatus(row['Funcion']);
        const contratante = standardizeStatus(row['Contratante']);
        const cliente = standardizeStatus(row['Nome Cliente']) || standardizeStatus(row['cod_cliente']);
        
        let empresa_id = EMPRESA_MAP[contratante?.toUpperCase()];
        if (!empresa_id) {
            console.error(`UNKNOWN CONTRATANTE: ${contratante} FOR ${codColab}`);
            continue;
        }

        // To avoid duplicating the 4 that exist, we use WHERE NOT EXISTS
        sql += `
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '${empresa_id}'::uuid, 
    '${codColab}', 
    ${nome ? `'${nome}'` : 'NULL'}, 
    ${movil ? `'${movil}'` : 'NULL'}, 
    ${niss ? `'${niss}'` : 'NULL'}, 
    ${nif ? `'${nif}'` : 'NULL'}, 
    ${pasaporte ? `'${pasaporte}'` : 'NULL'}, 
    ${funcion ? `'${funcion}'` : 'NULL'}, 
    ${contratante ? `'${contratante}'` : 'NULL'}, 
    ${cliente ? `'${cliente}'` : 'NULL'}, 
    '${statusTrabajador}', 
    '${statusSeguridad}', 
    ${dateSalida ? `'${dateSalida}'` : 'NULL'}
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = '${codColab}'
);
`.trim() + '\n';
    }
    
    sql += 'COMMIT;\n';
    
    fs.writeFileSync('insert_inativos.sql', sql, 'utf8');
}

run();
