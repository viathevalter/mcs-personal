const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Logging in as valter@gestaologinpro.com in DEV...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'vitor@2004'
    });

    if (authError) {
        throw new Error(`Auth failed: ${authError.message}`);
    }

    const token = authData.session.access_token;
    console.log("Logged in successfully! Token obtained.");

    const estimacion_id = 'd6f55c7e-d73c-4eba-8790-9c8068a178b0';
    console.log(`Invoking generate-proposal edge function on DEV for estimation: ${estimacion_id}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-proposal`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            estimacion_id: estimacion_id
        })
    });

    console.log("Response Status:", response.status);
    const bodyText = await response.text();
    console.log("Response Body:");
    try {
        console.log(JSON.stringify(JSON.parse(bodyText), null, 2));
    } catch(e) {
        console.log(bodyText);
    }
}

run().catch(err => console.error(err));
