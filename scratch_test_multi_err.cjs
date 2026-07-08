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

    // Replace {{IMAGE:FIRMA_CLIENTE}} with {{IMAGE FIRMA_CLIENTE}} (space syntax)
    xml = xml.replace("{{IMAGE:FIRMA_CLIENTE}}", "{{IMAGE FIRMA_CLIENTE}}");
    zip.file("word/document.xml", xml);
    const modifiedTemplate = await zip.generateAsync({ type: "nodebuffer" });

    console.log("=== FIRST PASS ===");
    const firstPassDoc = await createReport({
        template: modifiedTemplate,
        data: { empresa_nome: "Stocco" },
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
            if (command_code && command_code !== "undefined") {
                const codeUpper = command_code.toUpperCase();
                if (codeUpper.includes("FIRMA") || codeUpper.includes("SIGNATURE")) {
                    return `{{${command_code}}}`;
                }
            }
            if (err && err.message) {
                const match = err.message.match(/Error executing command '(IMAGE\s+([^']+))'/i) || 
                              err.message.match(/Invalid command syntax: (IMAGE\s+([^']+))/i) ||
                              err.message.match(/Error executing command '(IMAGE:([^']+))'/i) ||
                              err.message.match(/Invalid command syntax: (IMAGE:([^']+))/i);
                if (match) {
                    const fullCommand = match[1];
                    const arg = match[2];
                    const argUpper = arg.toUpperCase();
                    if (argUpper.includes("FIRMA") || argUpper.includes("SIGNATURE")) {
                        return `{{${fullCommand}}}`;
                    }
                }
            }
            return "";
        }
    });

    console.log("\n=== SECOND PASS ===");
    const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const binaryData = Uint8Array.from(atob(base64Png), (c) => c.charCodeAt(0));

    // Test with direct object instead of function
    const finalDoc = await createReport({
        template: firstPassDoc,
        data: {
            FIRMA_CLIENTE: {
                width: 4.5,
                height: 2.0,
                data: binaryData,
                extension: '.png',
            }
        },
        cmdDelimiter: ["{{", "}}"],
        noSandbox: true,
        errorHandler: (err, command_code) => {
            console.log(`  [Second Err] cmd: "${command_code}", msg: "${err.message}"`);
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
