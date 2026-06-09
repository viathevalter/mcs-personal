const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    console.log("Testing generate-proposal edge function on DEV with CORRECT ID...");
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-proposal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estimacion_id: '14797205-bee6-4e1c-9379-f0064a8dfd18'
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
