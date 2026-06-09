const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir);

const filtered = files
    .filter(f => f.endsWith('.sql'))
    .map(f => {
        const match = f.match(/^(\d+)_/);
        return {
            filename: f,
            version: match ? match[1] : null
        };
    })
    .filter(x => x.version && x.version > '20260401085406')
    .sort((a, b) => a.version.localeCompare(b.version));

console.log("Found migrations to run:", filtered.map(x => x.filename));
