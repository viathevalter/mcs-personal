const { createClient } = require('@supabase/supabase-js');
const JSZip = require('jszip');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseServiceKey = 'sb_secret_m8NhWGV0_JXhgYdeQFPNIQ_BDb1OxmG';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: blob } = await supabase.storage.from("proposal-signatures").download("46760e16-50c7-45be-ae5b-45154c2c474c/proposta_1781619396710.docx");
    const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
    const docXml = await zip.file("word/document.xml").async("string");

    const searchStr = "Por EL CLIENTE";
    const idx = docXml.indexOf(searchStr);
    if (idx !== -1) {
        console.log("=== XML chunk in proposta_1781619396710.docx ===");
        console.log(docXml.substring(idx - 100, idx + 1000));
    } else {
        console.log("Por EL CLIENTE not found in XML.");
    }
}

run().catch(console.error);
