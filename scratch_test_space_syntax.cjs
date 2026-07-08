const { createReport } = require('docx-templates');
const JSZip = require('jszip');

async function run() {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
    const supabaseServiceKey = 'sb_secret_m8NhWGV0_JXhgYdeQFPNIQ_BDb1OxmG';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: blob } = await supabase.storage.from("proposal-templates").download("stocco/es/proposta.docx");
    const buffer = Buffer.from(await blob.arrayBuffer());

    const zip = await JSZip.loadAsync(buffer);
    let xml = await zip.file("word/document.xml").async("string");

    // Replace {{IMAGE:FIRMA_CLIENTE}} with {{IMAGE FIRMA_CLIENTE}}
    console.log("Replacing colon syntax with space syntax in XML...");
    xml = xml.replace("{{IMAGE:FIRMA_CLIENTE}}", "{{IMAGE FIRMA_CLIENTE}}");
    zip.file("word/document.xml", xml);
    const modifiedTemplate = await zip.generateAsync({ type: "nodebuffer" });

    // 1. Simulate FIRST pass (generate-proposal)
    console.log("\n=== SIMULATING FIRST PASS (generate) ===");
    const mergeData = {
        empresa_nome: "Stocco"
    };

    const firstPassDoc = await createReport({
        template: modifiedTemplate,
        data: mergeData,
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
            console.log(`[First Pass Error] command_code: "${command_code}", err: "${err.message}"`);
            
            // Check if this error is related to FIRMA or SIGNATURE
            const errStr = (err.message || "") + (command_code || "");
            const hasFirma = errStr.toUpperCase().includes("FIRMA") || errStr.toUpperCase().includes("SIGNATURE");
            
            if (hasFirma) {
                // Return the literal image tag we want to preserve!
                // Let's identify the correct tag name (e.g. FIRMA_CLIENTE)
                let tagName = "FIRMA_CLIENTE";
                if (errStr.includes("FIRMA_CONTRATANTE")) tagName = "FIRMA_CONTRATANTE";
                else if (errStr.includes("SIGNATURE")) tagName = "signature";
                else if (errStr.includes("FIRMA")) tagName = "FIRMA";
                
                const ret = `{{IMAGE ${tagName}}}`;
                console.log(`  -> Preserved IMAGE tag: "${ret}"`);
                return ret;
            }
            return "";
        }
    });

    const zip1 = await JSZip.loadAsync(firstPassDoc);
    const xml1 = await zip1.file("word/document.xml").async("string");
    console.log("Is {{IMAGE FIRMA_CLIENTE}} in first pass output?", xml1.includes("{{IMAGE FIRMA_CLIENTE}}"));

    // 2. Simulate SECOND pass (sign-proposal)
    console.log("\n=== SIMULATING SECOND PASS (sign) ===");
    const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const binaryData = Uint8Array.from(atob(base64Png), (c) => c.charCodeAt(0));

    const finalDoc = await createReport({
        template: firstPassDoc,
        data: {
            FIRMA_CLIENTE: () => ({
                width: 4.5,
                height: 2.0,
                data: binaryData,
                extension: '.png',
            })
        },
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
            console.log(`[Second Pass Error] command_code: "${command_code}", err: "${err.message}"`);
            return "";
        }
    });

    const zip2 = await JSZip.loadAsync(finalDoc);
    const xml2 = await zip2.file("word/document.xml").async("string");
    console.log("Is {{IMAGE FIRMA_CLIENTE}} in second pass output?", xml2.includes("{{IMAGE FIRMA_CLIENTE}}"));
    const mediaFiles = Object.keys(zip2.files).filter(f => f.startsWith("word/media/"));
    console.log("Media files in second pass output:", mediaFiles);
}

run().catch(console.error);
