import JSZip from 'jszip';

async function testNumberingRegex() {
    const url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/generated-documents/generated/generated_1791271143946_mnwuscy.docx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')?.async('string');

    // Parse all paragraphs and their numPr
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let match;
    let pCount = 0;
    let l0 = 0;
    let l1 = 0;

    while ((match = pRegex.exec(xml)) !== null) {
        const pContent = match[1];
        const numMatch = pContent.match(/<w:numPr>[\s\S]*?<w:ilvl\s+w:val="(\d+)"\/>[\s\S]*?<w:numId\s+w:val="(\d+)"\/>[\s\S]*?<\/w:numPr>/);
        
        // Extract text
        const textMatches = pContent.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const text = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');

        if (numMatch) {
            const ilvl = parseInt(numMatch[1], 10);
            const numId = parseInt(numMatch[2], 10);
            
            if (numId === 2) { // Our multi-level list
                if (ilvl === 0) {
                    l0++;
                    l1 = 0;
                    console.log(`[Level 0] -> ${l0}. ${text.trim().substring(0, 40)}`);
                } else if (ilvl === 1) {
                    l1++;
                    console.log(`  [Level 1] -> ${l0}.${l1}. ${text.trim().substring(0, 40)}`);
                }
            }
        }
    }
}

testNumberingRegex().catch(console.error);
