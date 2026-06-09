const fs = require('fs');
const pdf = require('pdf-parse');

async function run() {
    async function extract(pdfPath, txtPath) {
        console.log(`Extracting ${pdfPath} to ${txtPath}...`);
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        fs.writeFileSync(txtPath, data.text, 'utf8');
        console.log(`Successfully extracted to ${txtPath}. Length: ${data.text.length}`);
    }

    await extract('scratch/Contrato 2026-429.pdf', 'scratch/contrato_text.txt');
    await extract('scratch/Presupuesto 2026-429.pdf', 'scratch/presupuesto_text.txt');
}

run().catch(err => console.error(err));
