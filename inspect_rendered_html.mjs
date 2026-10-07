import JSZip from 'jszip';

async function testDocx() {
    const url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/generated-documents/generated/generated_1791271143946_mnwuscy.docx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')?.async('string');

    // Find all paragraphs with w:numPr
    const pMatches = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
    console.log("Total paragraphs in doc:", pMatches.length);

    for (let i = 0; i < pMatches.length; i++) {
        const p = pMatches[i];
        if (p.includes('PRECIO Y CONDICIONES') || p.includes('Retribución de los servicios')) {
            console.log(`\n--- Paragraph ${i} ---`);
            console.log(p.substring(0, 500));
        }
    }
}

testDocx().catch(console.error);
