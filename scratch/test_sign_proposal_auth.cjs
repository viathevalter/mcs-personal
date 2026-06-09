const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    console.log("Invoking sign-proposal edge function on DEV...");
    const response = await fetch(`${supabaseUrl}/functions/v1/sign-proposal`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: '36b17821-3027-49e2-8ca3-1d4a88875e61',
            otp_code: '491190',
            signature_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1px black png
            ip_address: '127.0.0.1',
            user_agent: 'Test-Agent'
        })
    });

    console.log("Response Status:", response.status);
    const text = await response.text();
    console.log("Response Body:", text);
}

run().catch(err => console.error(err));
