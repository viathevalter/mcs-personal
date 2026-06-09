const supabaseUrl = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw';

async function run() {
    console.log("Testing process-document-ocr edge function on PROD...");
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/process-document-ocr`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: 'test/path.jpg',
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
