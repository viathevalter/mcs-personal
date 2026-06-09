const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        lock: async (name, acquireTimeout, fn) => {
            return await fn();
        }
    }
});

async function run() {
    console.log("Starting login test...");
    try {
        const res = await supabase.auth.signInWithPassword({
            email: 'valter@gestaologinpro.com',
            password: 'some-password-here-to-test'
        });
        console.log("Response:", JSON.stringify(res, null, 2));
    } catch(e) {
        console.error("Exception:", e);
    }
}
run();
