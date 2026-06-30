import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; // Corrected Path
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../i18n';

const DEPT_MAPPING: Record<string, string> = {
    "1": "eb39d2e2-016f-4bee-a8ac-b020ae7f4feb",
    "2": "f4980ce6-034a-44ee-a70c-001b5a2edc80",
    "3": "d3d525e8-14bc-43b4-9d66-b59826eba2ab",
    "4": "f3b06161-2b6f-40d2-a081-f92da33ea21d",
    "5": "f2f29b74-1fd2-45f3-b23a-94db3669c234",
    "6": "7f1ec5e3-8c44-4f98-a603-0f6d0115c442",
    "7": "f1ae0a4c-56f3-424d-85af-9435d3ae1cdd",
    "8": "e7d4ce72-9c1d-4cea-a090-99bdcab76c49",
    "9": "7fa9a59c-b80d-49a0-8aa4-f26bf71cf92a",
    "10": "e0b803f2-141f-414a-85b2-3a870c9363a6",
    "11": "681fa4a1-994c-43e1-9a71-f31f6f43df3a",
    "12": "7804abed-e176-4329-8b1b-7cde9e091fff",
    "13": "cb0872de-603f-4454-ae6e-bf54a1b29456",
    "14": "f218c51e-1739-47d4-8102-8479b445d694",
    "15": "b6c0134a-69dd-491f-9f85-9537b47e38d1",
    "16": "04e76460-cbdf-4266-b6a7-eb6a11ad6e5f",
    "17": "77e4b79f-c32a-490a-b6ad-e850aad9d46b",
    "18": "81027f04-aac7-4648-9756-5f7cd3fb4947"
};

export const ImportarFuncionarios: React.FC = () => {
    const { t } = useLanguage();
    const [fileData, setFileData] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [stats, setStats] = useState({ success: 0, errors: 0 });
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        const { data, error } = await supabase
            .from('empresas')
            .select('id, nome_pbi, nome_comercial');
        if (data) setCompanies(data);
        if (error) addLog(`${t('import_funcionarios.logs.error_companies')}: ${error.message}`);
    };

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setLogs([`${t('import_funcionarios.logs.reading_file')}: ${file.name}...`]);

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Convert to JSON array of arrays for flexibility
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                setFileData(data);
                addLog(t('import_funcionarios.logs.read_success', { count: data.length }));
            } catch (error: any) {
                addLog(`${t('import_funcionarios.logs.read_error')}: ${error.message}`);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file); // Might need adjustment if using xlsx lib for CSV too (it supports it) but binary read is safer for special chars sometimes
            // Logic above uses binary, let's stick to binary read for everything as xlsx handles it
            reader.readAsBinaryString(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const processImport = async () => {
        if (!fileData || fileData.length === 0) return addLog(t('import_funcionarios.logs.no_data'));

        setProcessing(true);
        setStats({ success: 0, errors: 0 });
        setLogs(prev => [...prev, t('import_funcionarios.logs.starting')]);

        // Create Company Map
        const companyMap = new Map();
        companies.forEach(c => {
            if (c.nome_pbi) companyMap.set(c.nome_pbi.trim().toLowerCase(), c.id);
            if (c.nome_comercial) companyMap.set(c.nome_comercial.trim().toLowerCase(), c.id);
        });

        let successCount = 0;
        let errorCount = 0;

        // Determine Start Row (Header check)
        let startIndex = 0;
        if (fileData[0] && (String(fileData[0][0]).toLowerCase().includes('usuario') || String(fileData[0][0]).toLowerCase().includes('empresa'))) {
            addLog(t('import_funcionarios.logs.header_detected'));
            startIndex = 1;
        }

        for (let i = startIndex; i < fileData.length; i++) {
            const row = fileData[i];
            if (!row || row.length === 0) continue;

            try {
                // Mapping based on column index (Adapt if needed)
                // 0: EmpresaContratante
                // 1: EmpresaServicios
                // 2: Usuario
                // 3: NombreCompleto
                // 4: CorreoEmpresarial
                // ...
                // 6: DepartamentoID
                // ...
                // 12: EstadoTrabajador

                const empresaContratanteRaw = row[0] ? String(row[0]).trim() : '';
                const empresaServiciosRaw = row[1] ? String(row[1]).trim() : '';
                const usuario = row[2] ? String(row[2]).trim() : '';
                const nomeCompleto = row[3] ? String(row[3]).trim() : '';
                const email = row[4] ? String(row[4]).trim() : '';

                const deptIdRaw = row[6] ? String(row[6]).trim() : '';
                const status = row[12] ? String(row[12]).trim() : '';

                if (!nomeCompleto) continue; // Skip empty rows

                const department_id = DEPT_MAPPING[deptIdRaw];
                if (!department_id) {
                    addLog(`${t('import_funcionarios.logs.row')} ${i + 1}: ${t('import_funcionarios.logs.error_dept', { dept: deptIdRaw })}`);
                    errorCount++;
                    continue;
                }

                const empresa_contratante_id = empresaContratanteRaw ? companyMap.get(empresaContratanteRaw.toLowerCase()) : null;
                const empresa_servicos_id = empresaServiciosRaw ? companyMap.get(empresaServiciosRaw.toLowerCase()) : null;

                let active = true;
                let estadotrabajador = status || 'Ativo';
                if (status && (status.toLowerCase().includes('inativo') || status.toLowerCase().includes('desligado'))) {
                    active = false;
                }

                const payload: any = {
                    department_id,
                    empresa_contratante_id,
                    empresa_servicos_id,
                    nombrecompleto: nomeCompleto,
                    usuario: usuario || null,
                    correoempresarial: email || null,
                    ubicaciontrabajo: row[5] ? String(row[5]) : null,
                    codigoresponsabilidad: row[7] ? String(row[7]) : null,
                    telefonodirecto: row[8] ? String(row[8]) : null,
                    extenciontelefonica: row[9] ? String(row[9]) : null,
                    fechainicio: row[10] ? String(row[10]) : null, // Might need date formatting logic if Excel date serial
                    fechanacimiento: row[11] ? String(row[11]) : null,
                    estadotrabajador: estadotrabajador,
                    iban: row[13] ? String(row[13]) : null,
                    active: active,
                    member_role: 'member'
                };

                const { error } = await supabase.from('mcs_department_members').insert([payload]);

                if (error) {
                    addLog(`${t('import_funcionarios.logs.row')} ${i + 1}: ${t('import_funcionarios.logs.db_error')} - ${error.message}`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err: any) {
                addLog(`${t('import_funcionarios.logs.row')} ${i + 1}: ${t('import_funcionarios.logs.exception')} - ${err.message}`);
                errorCount++;
            }

            if (i % 10 === 0) {
                setStats({ success: successCount, errors: errorCount });
                await new Promise(r => setTimeout(r, 10));
            }
        }

        setStats({ success: successCount, errors: errorCount });
        addLog(t('import_funcionarios.logs.end_process'));
        setProcessing(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Upload className="text-blue-600" /> {t('import_funcionarios.title')}
            </h1>
            <p className="text-slate-500">{t('import_funcionarios.subtitle')}</p>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="fileUpload"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center gap-2">
                        <FileSpreadsheet size={48} className="text-green-600" />
                        <span className="text-lg font-medium text-slate-700 dark:text-slate-300">
                            {fileName || t('import_funcionarios.click_to_select')}
                        </span>
                        <span className="text-sm text-slate-500">
                            {t('import_funcionarios.supported_formats')}
                        </span>
                    </label>
                </div>

                <div className="mt-6 flex gap-4 items-center justify-between">
                    <div className="flex gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full"><CheckCircle size={16} /> {t('import_funcionarios.success')}: {stats.success}</span>
                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full"><AlertCircle size={16} /> {t('import_funcionarios.errors')}: {stats.errors}</span>
                    </div>

                    <button
                        onClick={processImport}
                        disabled={processing || fileData.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                    >
                        {processing ? t('import_funcionarios.btn_processing') : t('import_funcionarios.btn_start')}
                    </button>
                </div>
            </div>

            {logs.length > 0 && (
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto shadow-inner">
                    {logs.map((log, i) => (
                        <div key={i} className="border-b border-slate-800 py-1 last:border-0">{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
};
