const JSZip = require('jszip');
const fs = require('fs');

async function checkFile(name) {
    console.log(`=== Checking ${name} ===`);
    const buffer = fs.readFileSync(name);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml").async("string");

    console.log("Is {{IMAGE:FIRMA_CLIENTE}} in XML?", xml.includes("{{IMAGE:FIRMA_CLIENTE}}"));
    console.log("Is {{FIRMA_CLIENTE}} in XML?", xml.includes("{{FIRMA_CLIENTE}}"));
    console.log("Is IMAGE:FIRMA_CLIENTE in XML?", xml.includes("IMAGE:FIRMA_CLIENTE"));
    console.log("Is FIRMA_CLIENTE in XML?", xml.includes("FIRMA_CLIENTE"));
    
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith("word/media/"));
    console.log("Media files:", mediaFiles);
    
    // Print around Por EL CLIENTE
    const searchStr = "Por EL CLIENTE";
    const idxP = xml.indexOf(searchStr);
    if (idxP !== -1) {
        console.log("Por EL CLIENTE context:", xml.substring(idxP - 100, idxP + 600));
    }
}

async function run() {
    await checkFile("local_proposal.docx");
    await checkFile("local_contract.docx");
}

run().catch(console.error);
