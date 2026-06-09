const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        lock: async (name, acquireTimeout, fn) => {
            return await fn();
        }
    }
});

async function run() {
    console.log("Starting login test with correct key...");
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
