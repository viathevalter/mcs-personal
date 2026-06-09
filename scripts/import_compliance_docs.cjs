const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

// Document types mapping constants
const DOC_TYPE_PATTERNS = [
    { pattern: /apto/i, type: 'apto_medico' },
    { pattern: /medico/i, type: 'apto_medico' },
    { pattern: /médico/i, type: 'apto_medico' },
    { pattern: /\ba1\b/i, type: 'a1' },
    { pattern: /prl/i, type: 'prl_certificate' },
    { pattern: /prevencion/i, type: 'prl_certificate' },
    { pattern: /epi/i, type: 'epi_recibo' },
    { pattern: /formacion/i, type: 'formacao_seguranca' },
    { pattern: /formación/i, type: 'formacao_seguranca' },
    { pattern: /segurança/i, type: 'formacao_seguranca' },
    { pattern: /alta/i, type: 'doc_alta_seguridade' },
    { pattern: /baixa/i, type: 'doc_baixa_seguridade' },
    { pattern: /contrato/i, type: 'contrato_trabalho' },
    { pattern: /niss/i, type: 'niss' },
    { pattern: /nif/i, type: 'nif' },
    { pattern: /dni/i, type: 'identificacao' },
    { pattern: /pasaporte/i, type: 'passaporte' },
    { pattern: /passport/i, type: 'passaporte' }
];

function getDocTypeFromFilename(filename) {
    for (const item of DOC_TYPE_PATTERNS) {
        if (item.pattern.test(filename)) {
            return item.type;
        }
    }
    return 'outros';
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'application/octet-stream';
}

// Helper to recursively walk a directory
function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function run() {
    console.log("=== compliance document batch importer ===");

    // 1. Initialize Supabase Client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Authenticating Supabase Client as admin user...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'vitor@2004'
    });

    if (authError) {
        console.error("[ERROR] Failed to authenticate:", authError.message);
        process.exit(1);
    }
    console.log("Supabase Client authenticated successfully.");

    // 2. Initialize PG client
    const pgClient = new Client({ connectionString: devConnectionString });
    await pgClient.connect();
    console.log("Connected to PostgreSQL DEV database.");

    // 3. Scan SharePoint documents directory
    const sourceDir = path.resolve(__dirname, '..', 'dados_sharepoint', 'Documentacao');
    if (!fs.existsSync(sourceDir)) {
        console.error(`[ERROR] Directory not found: ${sourceDir}`);
        await pgClient.end();
        process.exit(1);
    }

    console.log(`Scanning folder: ${sourceDir}`);
    const allFiles = walkDir(sourceDir);
    console.log(`Found ${allFiles.length} files to process.`);

    for (const filePath of allFiles) {
        try {
            const fileName = path.basename(filePath);
            const dirName = path.dirname(filePath);
            
            // The worker folder name is directly inside 'Documentacao' or nested. Let's find it.
            const relative = path.relative(sourceDir, filePath);
            const pathParts = relative.split(path.sep);
            
            // Typically the first part is the worker folder name (e.g. DIEGO ALEJANDRO YANES FAJARDO)
            const folderWorkerName = pathParts[0];

            if (!folderWorkerName || folderWorkerName === fileName) {
                console.log(`Skipping root file or invalid path: ${relative}`);
                continue;
            }

            console.log(`\n--------------------------------------------------`);
            console.log(`Processing File: ${fileName}`);
            console.log(`Worker folder name: ${folderWorkerName}`);

            // 4. Fuzzy match worker in DB
            const workerRes = await pgClient.query(
                `SELECT id, nome, empresa_id FROM core_personal.workers WHERE nome ILIKE $1 LIMIT 1`,
                [`%${folderWorkerName}%`]
            );

            if (workerRes.rows.length === 0) {
                console.warn(`[WARNING] No worker matched in DB for folder: "${folderWorkerName}". Skipping file.`);
                continue;
            }

            const worker = workerRes.rows[0];
            console.log(`Matched Worker: ${worker.nome} (ID: ${worker.id}, Empresa: ${worker.empresa_id})`);

            // 5. Determine doc type
            const docType = getDocTypeFromFilename(fileName);
            const mimeType = getMimeType(fileName);
            console.log(`Mapped Doc Type: ${docType} (Mime: ${mimeType})`);

            // 6. Check if already exists in worker_documents to prevent duplicates
            const docCheck = await pgClient.query(
                `SELECT id FROM core_personal.worker_documents WHERE worker_id = $1 AND file_name = $2`,
                [worker.id, fileName]
            );

            let docId;
            let fileStoragePath;

            if (docCheck.rows.length > 0) {
                console.log(`[~] Document already exists in DB. Skipping upload.`);
                docId = docCheck.rows[0].id;
            } else {
                // 7. Upload to Supabase Storage
                const fileBuffer = fs.readFileSync(filePath);
                const fileExt = fileName.split('.').pop();
                const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                fileStoragePath = `${worker.empresa_id}/${worker.id}/${docType}/${uniqueFileName}`;

                console.log(`Uploading to bucket 'mcs-personal-docs' at: ${fileStoragePath}`);
                const { error: uploadError } = await supabase.storage
                    .from('mcs-personal-docs')
                    .upload(fileStoragePath, fileBuffer, {
                        contentType: mimeType,
                        duplicationBehavior: 'overwrite'
                    });

                if (uploadError) {
                    console.error(`[X] Upload error for ${fileName}:`, uploadError.message);
                    continue;
                }
                console.log(`[+] Uploaded successfully.`);

                // 8. Insert into core_personal.worker_documents
                const docInsert = await pgClient.query(
                    `INSERT INTO core_personal.worker_documents (empresa_id, worker_id, doc_type, file_path, file_name, file_size, mime_type)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING id`,
                    [worker.empresa_id, worker.id, docType, fileStoragePath, fileName, fileBuffer.length, mimeType]
                );
                docId = docInsert.rows[0].id;
                console.log(`[+] Metadata saved in worker_documents (ID: ${docId})`);
            }

            // 9. Sync with compliance checklist if worker has assignments
            const assignRes = await pgClient.query(
                `SELECT id, client_id, client_site_id 
                 FROM core_personal.worker_assignments 
                 WHERE worker_id = $1 AND status IN ('planned', 'active') 
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [worker.id]
            );

            if (assignRes.rows.length > 0) {
                const assign = assignRes.rows[0];
                console.log(`Found active assignment: Client: ${assign.client_id}, Site: ${assign.client_site_id}`);

                // Upsert worker_compliance_status
                const statusUpsert = await pgClient.query(
                    `INSERT INTO core_personal.worker_compliance_status (empresa_id, worker_id, client_id, client_site_id, overall_status)
                     VALUES ($1, $2, $3, $4, 'submitted')
                     ON CONFLICT (empresa_id, worker_id, client_id, client_site_id) 
                     DO UPDATE SET updated_at = NOW()
                     RETURNING id`,
                    [worker.empresa_id, worker.id, assign.client_id, assign.client_site_id]
                );
                const complianceStatusId = statusUpsert.rows[0].id;
                console.log(`Compliance status synchronized (ID: ${complianceStatusId})`);

                // Upsert worker_compliance_documents checklist
                await pgClient.query(
                    `INSERT INTO core_personal.worker_compliance_documents (empresa_id, compliance_status_id, doc_type, worker_document_id, status)
                     VALUES ($1, $2, $3, $4, 'uploaded')
                     ON CONFLICT (compliance_status_id, doc_type)
                     DO UPDATE SET worker_document_id = EXCLUDED.worker_document_id, status = 'uploaded', updated_at = NOW()`,
                    [worker.empresa_id, complianceStatusId, docType, docId]
                );
                console.log(`[+] Compliance checklist document updated.`);
            } else {
                console.log(`[~] Worker has no active assignment. Checklist skipped.`);
            }

        } catch (fileErr) {
            console.error(`[ERROR] Exception processing file:`, fileErr);
        }
    }

    await pgClient.end();
    console.log("\nFinished processing all documents successfully.");
}

run();
