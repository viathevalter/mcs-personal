const fs = require('fs');
const path = require('path');

async function run() {
    const logsPath = 'C:\\Users\\User03\\.gemini\\antigravity\\brain\\ab329d84-60f1-46f1-b885-f6585c7600c0\\.system_generated\\logs\\transcript.jsonl';
    if (!fs.existsSync(logsPath)) {
        console.log("Logs file not found at " + logsPath);
        return;
    }
    
    console.log("Reading logs...");
    const content = fs.readFileSync(logsPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.includes('SUPABASE_SERVICE_ROLE_KEY') || line.includes('service_role') || line.includes('serviceKey')) {
            // Print matching line (truncate to avoid printing too much)
            console.log(line.substring(0, 500));
        }
    }
}

run();
