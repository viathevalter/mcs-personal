const fs = require('fs');
const path = require('path');

function list(dir) {
    console.log(`\nListing ${dir}:`);
    if (!fs.existsSync(dir)) {
        console.log(`Directory does not exist.`);
        return;
    }
    try {
        const files = fs.readdirSync(dir);
        console.log(files);
        for (const f of files) {
            const full = path.join(dir, f);
            if (fs.statSync(full).isDirectory()) {
                list(full);
            }
        }
    } catch (err) {
        console.error(`Error:`, err.message);
    }
}

list('C:\\Users\\User03\\.config');
list('C:\\Users\\User03\\.supabase');
list('C:\\Users\\User03\\.config\\supabase');
list('C:\\Users\\User03\\.config\\@supabase');
