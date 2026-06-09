const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected. Reading migration v2...");
        
        const filePath = path.resolve(__dirname, 'supabase', 'migrations', '20260515120000_bloco3_registro_general_v2.sql');
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Let's split by simple semicolon, keeping in mind we might split functions.
        // To be safe, we can try to run the statements by using a parser or simple splitter.
        // Wait, a simple splitter on ";\n" or ";\r\n" usually works for SQL migrations.
        const statements = sql.split(/;\r?\n/);
        
        console.log(`Split migration into ${statements.length} statements.`);
        
        for (let i = 0; i < statements.length; i++) {
            let stmt = statements[i].trim();
            if (!stmt) continue;
            
            // Re-add semicolon if needed
            if (!stmt.endsWith(';')) {
                stmt += ';';
            }
            
            console.log(`\nExecuting statement #${i + 1}:`);
            console.log(stmt.substring(0, 150) + (stmt.length > 150 ? '...' : ''));
            
            try {
                await client.query(stmt);
                console.log(`-> Statement #${i + 1} succeeded.`);
            } catch (err) {
                console.error(`-> Statement #${i + 1} FAILED with error:`, err.message);
                break;
            }
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
