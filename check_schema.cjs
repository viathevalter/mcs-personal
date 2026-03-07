const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
    const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
    const response = await fetch(url, {
        headers: {
            'Accept-Profile': 'core_personal'
        }
    });
    const data = await response.json();

    if (data.definitions && data.definitions.seguridade_status) {
        console.log(JSON.stringify(data.definitions.seguridade_status, null, 2));
    } else {
        console.log("Not found in definitions:", Object.keys(data.definitions || {}));
    }
}

check();
