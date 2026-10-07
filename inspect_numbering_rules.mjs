import JSZip from 'jszip';

async function testNumberingXml() {
    const url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/generated-documents/generated/generated_1791271143946_mnwuscy.docx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const numberingXml = await zip.file('word/numbering.xml')?.async('string');
    console.log("Full Numbering XML:\n", numberingXml);
}

testNumberingXml().catch(console.error);
