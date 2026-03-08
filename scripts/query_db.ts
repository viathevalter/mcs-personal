import { execSync } from 'child_process';

function main() {
    const sql = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'core_personal' AND table_name = 'worker_beneficios_settings';
    `;
    try {
        const out = execSync(`npx supabase db query "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
            stdio: 'pipe',
            cwd: process.cwd(),
            encoding: 'utf8'
        });
        console.log('Result:\n', out);
    } catch (e: any) {
        console.error('Error:', e.stderr || e.stdout || e.message);
    }
}

main();
