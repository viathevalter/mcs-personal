const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

function splitStatements(sql) {
    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarQuoteTag = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        const nextChar = sql[i + 1] || '';
        
        if (inDollarQuote) {
            current += char;
            // Check if dollar quote ends
            if (char === '$' && sql.substring(i - dollarQuoteTag.length + 1, i + 1) === dollarQuoteTag) {
                inDollarQuote = false;
                dollarQuoteTag = '';
            }
        } else if (inSingleQuote) {
            current += char;
            if (char === "'" && sql[i - 1] !== '\\') {
                inSingleQuote = false;
            }
        } else if (inDoubleQuote) {
            current += char;
            if (char === '"' && sql[i - 1] !== '\\') {
                inDoubleQuote = false;
            }
        } else {
            current += char;
            if (char === '$' && nextChar === '$') {
                inDollarQuote = true;
                dollarQuoteTag = '$$';
                current += '$';
                i++;
            } else if (char === '$' && nextChar.match(/[a-zA-Z_]/)) {
                // Look for tag like $function$
                const nextDollarIndex = sql.indexOf('$', i + 1);
                if (nextDollarIndex !== -1) {
                    const tag = sql.substring(i, nextDollarIndex + 1);
                    if (tag.match(/^\$[a-zA-Z0-9_]*\$/)) {
                        inDollarQuote = true;
                        dollarQuoteTag = tag;
                        current += tag.substring(1);
                        i = nextDollarIndex;
                    }
                }
            } else if (char === "'") {
                inSingleQuote = true;
            } else if (char === '"') {
                inDoubleQuote = true;
            } else if (char === ';') {
                statements.push(current);
                current = '';
            }
        }
    }
    if (current.trim()) {
        statements.push(current);
    }
    return statements;
}

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected. Reading migration v2...");
        
        const filePath = path.resolve(__dirname, 'supabase', 'migrations', '20260515120000_bloco3_registro_general_v2.sql');
        const sql = fs.readFileSync(filePath, 'utf8');
        
        const statements = splitStatements(sql);
        console.log(`Split migration into ${statements.length} statements.`);
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;
            
            console.log(`\nExecuting statement #${i + 1}:`);
            console.log(stmt.substring(0, 150) + (stmt.length > 150 ? '...' : ''));
            
            try {
                await client.query(stmt);
                console.log(`-> Statement #${i + 1} succeeded.`);
            } catch (err) {
                console.error(`-> Statement #${i + 1} FAILED with error:`, err.message);
                console.error("Full failed statement content:");
                console.error(stmt);
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
