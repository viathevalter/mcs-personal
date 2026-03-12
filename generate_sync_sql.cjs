const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join('C:\\\\', 'Projetos IA', 'Kotrik', 'mcs-personal', 'dados_sharepoint', 'trabalhadores_alta.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('planilla'));
const worksheet = workbook.Sheets[sheetName || 'Planilla_3'];
const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

const header = rawData[0];
const data = rawData.slice(1);

function getColIdx(namePart) {
    return header.findIndex(h => h && h.toLowerCase().includes(namePart.toLowerCase()));
}

const idxCodColab = getColIdx('CodColab');
const idxNombre = getColIdx('NOMBRE');
const idxStatusTrab = getColIdx('STATUS TRABAJADOR');
const idxStatusSeg = getColIdx('STATUSSEGURIDADE');
const idxEmpresa = getColIdx('EmpresaHo');
const idxCodCliente = getColIdx('cod_cliente');
const idxNomeCliente = getColIdx('NomeCliente');
const idxFuncion = getColIdx('Función Trabajador') > -1 ? getColIdx('Función Trabajador') : getColIdx('Funcion');

let batchCounter = 1;
let rowCount = 0;
let sqlOutput = "BEGIN;\n\n-- Clean up assignments\n";

data.forEach(row => {
    const codColab = row[idxCodColab] ? String(row[idxCodColab]).trim() : '';
    if (!codColab || !codColab.startsWith('E')) return; // Skip invalid
    
    rowCount++;
    const rawStatusTrabajador = row[idxStatusTrab] ? String(row[idxStatusTrab]).trim() : '';
    const rawStatusSeg = row[idxStatusSeg] ? String(row[idxStatusSeg]).trim() : '';
    const rawEmpresa = row[idxEmpresa] ? String(row[idxEmpresa]).trim() : '';
    const rawCodCliente = row[idxCodCliente] ? String(row[idxCodCliente]).trim() : '';
    const rawNomeCliente = row[idxNomeCliente] ? String(row[idxNomeCliente]).trim() : '';
    const rawNome = row[idxNombre] ? String(row[idxNombre]).trim().replace(/'/g, "''") : '';
    const rawFuncion = row[idxFuncion] ? String(row[idxFuncion]).trim().replace(/'/g, "''") : '';

    const cleanStatusTrab = rawStatusTrabajador.toLowerCase().includes('activo') ? 'Ativo' 
                          : rawStatusTrabajador.toLowerCase().includes('regulariza') ? 'Em Regularização'
                          : 'Inativo'; // fallback
                          
    const empresaSafe = rawEmpresa.replace(/'/g, "''");
    const segStatusSafe = rawStatusSeg.replace(/'/g, "''");
    
    sqlOutput += `
UPDATE public.colaboradores 
SET status_trabajador = '${cleanStatusTrab}', 
    status_seguridad = '${segStatusSafe}',
    contratante = NULLIF('${empresaSafe}', ''),
    funcion = COALESCE(NULLIF('${rawFuncion}', ''), funcion)
WHERE cod_colab = '${codColab}';
`;

    if (cleanStatusTrab === 'Ativo' && rawNomeCliente) {
        const clienteSafe = rawNomeCliente.replace(/'/g, "''");
        sqlOutput += `
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = '${codColab}' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%${empresaSafe}%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%${clienteSafe}%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = '${codColab}' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, '${codColab}', '${rawNome}', v_idcliente, '${rawCodCliente}', '${clienteSafe}', v_idempresa, '${empresaSafe}', CURRENT_DATE);
    END IF;
END $$;
`;
    }
    
    if (rowCount % 100 === 0) {
        sqlOutput += "\nCOMMIT;\n\nBEGIN;\n";
    }
});

sqlOutput += "\nCOMMIT;\n";
fs.writeFileSync('sync_workers.sql', sqlOutput);
console.log(`Generated sync_workers.sql with ${rowCount} valid workers.`);
