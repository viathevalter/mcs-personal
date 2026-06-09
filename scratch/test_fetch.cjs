const url = 'https://pyahcgorkvwfwmlzspnv.supabase.co/auth/v1/token?grant_type=password';

async function run() {
    console.log("Direct fetch starting...");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
            },
            body: JSON.stringify({
                email: 'valter@gestaologinpro.com',
                password: 'some-password-here-to-test'
            })
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch(e) {
        console.error("Fetch Exception:", e);
    }
}
run();
