const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Inserting Walter into public.mcs_users in PROD...");
        const insertRes = await client.query(`
            INSERT INTO public.mcs_users (
                id, email, display_name, role, language, active, created_at, department_id, managed_departments
            )
            VALUES (
                'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb',
                'valter@gestaologinpro.com',
                'Walter',
                'admin',
                'pt',
                true,
                now(),
                null,
                ARRAY[
                    'Administración',
                    'Almacén',
                    'Caldato / Hire on Core',
                    'CentralCars',
                    'Comercial',
                    'Coordinación',
                    'Documentación',
                    'Gerencia',
                    'Legal',
                    'Logística',
                    'Operações',
                    'Recepción',
                    'Recursos Humanos',
                    'SafetyPrevi'
                ]
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                role = EXCLUDED.role,
                language = EXCLUDED.language,
                active = EXCLUDED.active,
                managed_departments = EXCLUDED.managed_departments
            RETURNING *
        `);
        console.log("SUCCESS! Inserted/Updated record:");
        console.log(insertRes.rows[0]);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
