const xlsx = require('xlsx');
const fs = require('fs');

function standardizeStatus(status) {
    if (status === undefined || status === null) return null;
    return status.toString().trim();
}

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + str.replace(/'/g, "''") + "'";
}

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

if (headerRowIndex === -1) {
    console.error("Could not find headers in Excel.");
    process.exit(1);
}

const headers = rawData[headerRowIndex];
let sql = `
-- Script to bulk update workers and seguridade_status
BEGIN;

`;

let updateCount = 0;

for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    let rowObj = {};
    headers.forEach((h, idx) => {
        if (h) rowObj[h] = row[idx];
    });

    const codColab = standardizeStatus(rowObj['CodColab']);
    if (!codColab) continue;

    let newTrab = standardizeStatus(rowObj['STATUS TRABAJADOR']);
    let newSeg = standardizeStatus(rowObj['STATUS']);

    const isInactive = newTrab && (newTrab.toLowerCase().includes('inativo') || newTrab.toLowerCase().includes('inactivo'));
    const isPendingSeg = newSeg && (newSeg.toLowerCase().includes('pendente') || newSeg.toLowerCase().includes('pendiente'));

    if (isInactive && isPendingSeg) {
        newSeg = 'Anulado'; // Force out of pending status for inactive workers
    }

    // Generate update statement for the worker
    if (newTrab !== undefined || newSeg !== undefined) {
        let sets = [];
        if (newTrab !== undefined) sets.push(`status_trabajador = ${escapeSql(newTrab)}`);
        if (newSeg !== undefined) sets.push(`status_seguridad = ${escapeSql(newSeg)}`);

        if (sets.length > 0) {
            sql += `UPDATE core_personal.workers SET ${sets.join(', ')} WHERE cod_colab = ${escapeSql(codColab)};\n`;
            updateCount++;
        }
    }
}

sql += `
-- Cancel pending seguridade cards for INACTIVE workers
UPDATE core_personal.seguridade_status
SET status = 'cancelado', updated_at = NOW(), observacoes = 'Cancelado via sync (Trabalhador inativo)'
WHERE status = 'pendente' 
  AND worker_id IN (
    SELECT id FROM core_personal.workers 
    WHERE status_trabajador ILIKE '%inativ%' OR status_trabajador ILIKE '%inactiv%'
  );

-- Create missing pending ALTA cards for active workers
INSERT INTO core_personal.seguridade_status (empresa_id, worker_id, tipo_evento, status, origem, data_solicitacao)
SELECT empresa_id, id, 'alta', 'pendente', 'Importação Excel', NOW()
FROM core_personal.workers w
WHERE (w.status_seguridad ILIKE '%pendente alta%' OR w.status_seguridad ILIKE '%pendiente alta%')
  AND w.status_trabajador NOT ILIKE '%inativ%' AND w.status_trabajador NOT ILIKE '%inactiv%'
  AND NOT EXISTS (
      SELECT 1 FROM core_personal.seguridade_status ss 
      WHERE ss.worker_id = w.id AND ss.status = 'pendente' AND ss.tipo_evento = 'alta'
  );

-- Create missing pending BAIXA cards for active workers
INSERT INTO core_personal.seguridade_status (empresa_id, worker_id, tipo_evento, status, origem, data_solicitacao)
SELECT empresa_id, id, 'baixa', 'pendente', 'Importação Excel', NOW()
FROM core_personal.workers w
WHERE (w.status_seguridad ILIKE '%pendente baixa%' OR w.status_seguridad ILIKE '%pendiente baja%')
  AND w.status_trabajador NOT ILIKE '%inativ%' AND w.status_trabajador NOT ILIKE '%inactiv%'
  AND NOT EXISTS (
      SELECT 1 FROM core_personal.seguridade_status ss 
      WHERE ss.worker_id = w.id AND ss.status = 'pendente' AND ss.tipo_evento = 'baixa'
  );

COMMIT;
`;

fs.writeFileSync('sync.sql', sql);
console.log(`Generated sync.sql with ${updateCount} worker updates and cleanup logic.`);
