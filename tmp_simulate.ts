import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'core_personal' } });

async function simulateLogin(nomeInput: string, passportInput: string) {
    console.log(`Simulating login for: Nome="${nomeInput}", Passport="${passportInput}"`);

    const query = supabase.from('workers');
    const { data, error } = await query
        .select('id, empresa_id, cod_colab, nome, pasaporte, status_trabajador, cliente_nombre')
        .ilike('pasaporte', `${passportInput.trim()}%`);

    if (error || !data || data.length === 0) {
        console.error('Login error Supabase query:', error || 'No data returned from Supabase');
        return;
    }

    console.log(`Supabase returned ${data.length} matches for passport pattern ${passportInput.trim()}%`);
    console.log(data);

    // Verify locally that the trimmed passport exactly matches, ignoring case
    const normalizedPassportInput = passportInput.trim().toLowerCase();

    const normalizedNameInput = nomeInput
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

    console.log(`Input normalized passport: "${normalizedPassportInput}"`);
    console.log(`Input normalized name: "${normalizedNameInput}"`);

    const validProfiles = data.filter(d => {
        const dbPassport = (d.pasaporte || '').trim().toLowerCase();
        const dbName = (d.nome || '')
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ");

        console.log(`Comparing DB Passport "${dbPassport}" to "${normalizedPassportInput}"`);
        console.log(`Comparing DB Name "${dbName}" includes "${normalizedNameInput}"`);

        return dbPassport === normalizedPassportInput && dbName.includes(normalizedNameInput);
    });

    if (validProfiles.length === 0) {
        console.error('Login error: Client-side validation failed (passport or name mismatch)');
        return;
    }

    console.log("LOGIN SUCCESS! Valid profiles:", validProfiles.length);
}

simulateLogin("WILLIAM MORAIS DA SILVA", "GH281425");
