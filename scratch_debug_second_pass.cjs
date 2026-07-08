const { createClient } = require('@supabase/supabase-js');
const { createReport } = require('docx-templates');
const fs = require('fs');

async function testSecondPass(dataType) {
    console.log(`\n=== Testing second pass with data type: ${dataType} ===`);
    const templateBuffer = fs.readFileSync("local_proposal.docx"); // wait, local_proposal.docx has no tags now!
    // Let's download the original template stocco/es/proposta.docx which has the tag {{IMAGE:FIRMA_CLIENTE}}!
    const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
    const supabaseServiceKey = 'sb_secret_m8NhWGV0_JXhgYdeQFPNIQ_BDb1OxmG';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: blob } = await supabase.storage.from("proposal-templates").download("stocco/es/proposta.docx");
    const originalTemplate = new Uint8Array(await blob.arrayBuffer());

    // Let's simulate a signature image (1x1 transparent png base64)
    const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const binaryData = Uint8Array.from(atob(base64Png), (c) => c.charCodeAt(0));

    let imgData;
    if (dataType === 'Uint8Array') {
        imgData = binaryData;
    } else if (dataType === 'ArrayBuffer') {
        imgData = binaryData.buffer;
    } else if (dataType === 'base64') {
        imgData = base64Png;
    }

    try {
        const result = await createReport({
            template: originalTemplate,
            data: {
                FIRMA_CLIENTE: () => ({
                    width: 4.5,
                    height: 2.0,
                    data: imgData,
                    extension: '.png',
                })
            },
            cmdDelimiter: ["{{", "}}"],
            noSandbox: true,
            errorHandler: (err, command_code) => {
                console.log(`[Error] tag: ${command_code}, err: ${err.message}`);
                return "";
            }
        });
        console.log("Compilation succeeded!");
    } catch (e) {
        console.error("Compilation crashed:", e);
    }
}

async function run() {
    await testSecondPass('Uint8Array');
    await testSecondPass('ArrayBuffer');
    await testSecondPass('base64');
}

run().catch(console.error);
