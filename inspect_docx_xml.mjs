import JSZip from 'jszip';

async function inspectDocx() {
    const url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/generated-documents/generated/generated_1791271143946_mnwuscy.docx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')?.async('string');

    console.log("Document XML length:", xml?.length);

    // Look for Clause 2 / Precios
    const idx = xml?.indexOf('PRECIO Y CONDICIONES');
    if (idx !== -1) {
        console.log("Around Clause 2:\n", xml.substring(idx - 200, idx + 1000));
    }

    // Check numbering.xml if present
    const numberingXml = await zip.file('word/numbering.xml')?.async('string');
    console.log("Numbering XML present?", !!numberingXml);
    if (numberingXml) {
        console.log("Numbering XML snippet:\n", numberingXml.substring(0, 1000));
    }
}

inspectDocx().catch(console.error);
