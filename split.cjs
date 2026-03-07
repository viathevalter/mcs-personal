const fs = require('fs');

if (!fs.existsSync('sync.sql')) {
    console.log("No sync.sql found.");
    process.exit(1);
}

const content = fs.readFileSync('sync.sql', 'utf8');

// The file is composed of many single-line UPDATEs and a few multi-line queries at the end.
// We can split by ';' to get individual statements.
const statements = content.split(';');

const STATEMENTS_PER_FILE = 800; // safe arbitrary limit
let fileCount = 1;

let currentChunk = [];

for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    currentChunk.push(stmt + ';');

    if (currentChunk.length >= STATEMENTS_PER_FILE || i === statements.length - 1) {
        const fileName = `sync_part${fileCount}.sql`;
        const chunkContent = currentChunk.join('\n\n') + '\n';
        fs.writeFileSync(fileName, chunkContent);
        console.log(`Created ${fileName} with ${currentChunk.length} statements.`);
        fileCount++;
        currentChunk = [];
    }
}

console.log('All parts generated successfully correctly this time.');
