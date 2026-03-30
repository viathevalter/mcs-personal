const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
// Retirei o dotenv para evitar conflito e puxar o banco correto diretamente
// PREENCHA OS DOIS CAMPOS ABAIXO COM OS DADOS DO "Mastercorp PROD" 
// (Aquele que a URL termina em "ysrcq")

const supabaseUrl = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw';

if (supabaseUrl.includes('COLE_AQUI') || supabaseKey.includes('COLE_AQUI')) {
    console.error('❌ ERRO: Você esqueceu de colocar a URL e a KEY do banco PROD no arquivo!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncWorkers() {
    console.log('Iniciando script de atualização de dados dos trabalhadores...');

    try {
        const workbook = xlsx.readFile('dados_sharepoint/colaboradores_atualiza_dados.xlsx');
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        let countCore = 0;
        let countPub = 0;

        for (const row of rows) {
            // Adjust the property names to match the exact headers in your Excel file
            // Let's assume the excel has "Data Nascimento", "Nacionalidade", "CÓDIGO", "Camiseta", "Pantalones"
            // If they are different string matches, we can update them in the next step.

            // To be robust against extra spaces or casing, we normalize keys
            const normalizedRow = {};
            for (let key in row) {
                normalizedRow[key.trim().toLowerCase()] = row[key];
            }

            // Find Code
            const codColab = normalizedRow['codigo'] || normalizedRow['código'] || normalizedRow['código do trabalhador'] || normalizedRow['cod_colab'];
            const dataNascimento = normalizedRow['data de nascimento'] || normalizedRow['data nascimento'] || normalizedRow['fecha de nacimiento'] || normalizedRow['fecha nacimiento'];
            const nacionalidade = normalizedRow['nacionalidade'] || normalizedRow['nacionalidad'];
            const camiseta = normalizedRow['camiseta'] || normalizedRow['t-shirt'];
            const pantalones = normalizedRow['pantalones'] || normalizedRow['calça'] || normalizedRow['calcas'];

            if (!codColab) continue;

            // Optional Formatting for Date (Assuming Excel date text like dd/mm/yyyy or Excel Serial)
            let formattedDate = null;
            if (typeof dataNascimento === 'number') {
                const date = new Date((dataNascimento - (25567 + 2)) * 86400 * 1000);
                formattedDate = date.toISOString().split('T')[0];
            } else if (dataNascimento) {
                // assume string mm/dd/yyyy or yyyy-mm-dd
                formattedDate = String(dataNascimento).trim();
            }

            console.log(`Processando [${codColab}] - Nac: ${nacionalidade}, Nasc: ${formattedDate}, Camiseta: ${camiseta}, Calça: ${pantalones}`);

            // Update core_personal.workers
            const updatesCore = {};
            if (nacionalidade) updatesCore.nacionalidade = nacionalidade;
            if (formattedDate) updatesCore.fecha_nacimiento = formattedDate;
            if (camiseta) updatesCore.camiseta = String(camiseta);
            if (pantalones) updatesCore.pantalones = String(pantalones);

            if (Object.keys(updatesCore).length > 0) {
                const { error: err1 } = await supabase.schema('core_personal').from('workers').update(updatesCore).eq('cod_colab', codColab);
                if (err1) {
                    console.error(`Erro core_personal (cod: ${codColab}): `, err1.message);
                } else {
                    countCore++;
                }

                // Update public.colaboradores
                const updatesPub = {};
                if (nacionalidade) updatesPub.nacionalidad = nacionalidade; // if public is named nacionalidad
                if (formattedDate) updatesPub.fecha_nacimiento = formattedDate; // if public is named fecha_nacimiento
                if (camiseta) updatesPub.camiseta = String(camiseta);
                if (pantalones) updatesPub.pantalones = String(pantalones);

                const { error: err2 } = await supabase.schema('public').from('colaboradores').update(updatesPub).eq('cod_colab', codColab);
                if (err2) {
                    console.error(`Erro public (cod: ${codColab}): `, err2.message);
                } else {
                    countPub++;
                }
            }
        }

        console.log(`✅ Sucesso! Atualizados ${countCore} na core_personal e ${countPub} na public.`);

    } catch (err) {
        console.error('Falha geral no script:', err);
    }
}

syncWorkers();
