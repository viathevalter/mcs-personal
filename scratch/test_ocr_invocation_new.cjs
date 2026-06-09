const url = 'https://pyahcgorkvwfwmlzspnv.supabase.co/functions/v1/process-document-ocr';
const anonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    console.log("Invoking process-document-ocr on DEV for the new file...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: 'af3f092e-58ad-44b2-b76d-5d9d283fca2d/identity_1779367566354.jpg',
                mime_type: 'image/jpeg',
                document_type: 'identity'
            })
        });
        
        console.log("Response Status:", response.status);
        const text = await response.text();
        console.log("Response Body:", text);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

run();
