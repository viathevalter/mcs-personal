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

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();

    // Count rows
    const countRes = await client.query('SELECT count(*) FROM core_personal.worker_beneficios_settings');
    console.log(`Total rows in database: ${countRes.rows[0].count}`);

    // Get sample
    const sampleRes = await client.query('SELECT * FROM core_personal.worker_beneficios_settings LIMIT 5');
    console.log("Sample Data:", sampleRes.rows);

    // Also, check if workers exist with these tariffs
    const joinRes = await client.query(`
        SELECT w.nome, s.tarifa_hora 
        FROM core_personal.workers w
        JOIN core_personal.worker_beneficios_settings s ON w.id = s.worker_id
        LIMIT 5
    `);
    console.log("Joined Worker Data:", joinRes.rows);

    await client.end();
}

main().catch(console.error);
