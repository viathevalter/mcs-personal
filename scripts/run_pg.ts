import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function run() {
    // Attempting to read SUPABASE_DB_URL or falling back to constructing one
    // From standard local setup:
    // PGPASSWORD=... psql -h ... -p ... -U ...
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('No DATABASE_URL found in .env.local');
        return;
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to PG successfully.');

        const sql = fs.readFileSync(path.join(process.cwd(), 'update_tarifas_block.sql'), 'utf8');
        await client.query(sql);
        console.log('SQL block executed securely via direct Postgres connection.');

    } catch (e) {
        console.error('PG Error:', e);
    } finally {
        await client.end();
    }
}

run();
