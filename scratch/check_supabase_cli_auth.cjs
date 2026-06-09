const fs = require('fs');
const path = require('path');

function check() {
    const paths = [
        path.join(process.env.USERPROFILE || 'C:\\Users\\User03', '.config', 'supabase', 'config.json'),
        path.join(process.env.APPDATA || 'C:\\Users\\User03\\AppData\Roaming', 'supabase', 'config.json'),
        path.join(process.env.USERPROFILE || 'C:\\Users\\User03', '.supabase', 'config.json')
    ];

    for (const p of paths) {
        console.log(`Checking ${p}...`);
        if (fs.existsSync(p)) {
            console.log(`FOUND! Reading contents...`);
            try {
                const content = fs.readFileSync(p, 'utf8');
                console.log(content);
            } catch (err) {
                console.error(`Error reading:`, err.message);
            }
        } else {
            console.log(`Not found.`);
        }
    }
}

check();
