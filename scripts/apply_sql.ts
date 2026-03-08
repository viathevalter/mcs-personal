import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env: Record<string, string> = {};
for (const line of envLines) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
    }
}

const dbUrl = env['DATABASE_URL'];

if (!dbUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), 'update_tarifas_block.sql');
const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log("Connecting to Supabase Database...");
    await client.connect();

    console.log("Running update_tarifas_block.sql...");
    try {
        await client.query(sqlQuery);
        console.log("SQL executed successfully!");

        // Let's verify Nivaldo immediately
        const res = await client.query(`
            SELECT * FROM core_personal.worker_beneficios_settings 
            WHERE worker_id = (SELECT id FROM core_personal.workers WHERE cod_colab = 'E0088')
        `);
        console.log("Nivaldo's inserted tariff data:", res.rows);
    } catch (e) {
        console.error("Failed to execute SQL:", e);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
