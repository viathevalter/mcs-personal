const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    console.log("Testing sign-proposal edge function on DEV...");
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/sign-proposal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: '00000000-0000-0000-0000-000000000000',
                otp_code: '123456',
                ip_address: '1.2.3.4',
                user_agent: 'Node-Test'
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
