import JSZip from 'jszip';
import { renderAsync } from 'docx-preview';
import { JSDOM } from 'jsdom';

async function testDocxPreviewDom() {
    const url = 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/generated-documents/generated/generated_1791271143946_mnwuscy.docx';
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`);
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    global.HTMLElement = dom.window.HTMLElement;

    const container = document.getElementById('container');
    await renderAsync(buffer, container, null, { inWrapper: false });

    console.log("Rendered HTML snippet around 2. PRECIO or 2.6:");
    const html = container.innerHTML;
    
    // Search for 2.6 or PRECIO
    const idx = html.indexOf('PRECIO Y CONDICIONES');
    if (idx !== -1) {
        console.log(html.substring(idx - 100, idx + 800));
    }
}

testDocxPreviewDom().catch(console.error);
