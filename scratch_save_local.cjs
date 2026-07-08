const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseServiceKey = 'sb_secret_m8NhWGV0_JXhgYdeQFPNIQ_BDb1OxmG';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Downloading proposal...");
    const { data: bP } = await supabase.storage.from("proposal-signatures").download("46760e16-50c7-45be-ae5b-45154c2c474c/proposta_1781619396710.docx");
    fs.writeFileSync("local_proposal.docx", Buffer.from(await bP.arrayBuffer()));
    console.log("Saved local_proposal.docx, size:", fs.statSync("local_proposal.docx").size);

    console.log("Downloading contract...");
    const { data: bC } = await supabase.storage.from("proposal-signatures").download("46760e16-50c7-45be-ae5b-45154c2c474c/contrato_1781619396895.docx");
    fs.writeFileSync("local_contract.docx", Buffer.from(await bC.arrayBuffer()));
    console.log("Saved local_contract.docx, size:", fs.statSync("local_contract.docx").size);
}

run().catch(console.error);
