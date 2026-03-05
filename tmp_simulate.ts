import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'core_personal' } });

async function simulateLogin(nomeInput: string, passportInput: string) {
    console.log(`Simulating login for: Nome="${nomeInput}", Passport="${passportInput}"`);

    const query = supabase.from('workers');
    const { data, error } = await query
        .select('id, empresa_id, cod_colab, nome, pasaporte, status_trabajador, cliente_nombre')
        .ilike('nome', `%${nomeInput.trim()}%`)
        .ilike('pasaporte', `${passportInput.trim()}%`);

    if (error || !data || data.length === 0) {
        console.error('Login error Supabase query:', error || 'No data returned from Supabase');
        return;
    }

    console.log(`Supabase returned ${data.length} matches.`);

    // Verify locally that the trimmed passport exactly matches, ignoring case
    const normalizedInput = passportInput.trim().toLowerCase();
    const validProfiles = data.filter(d =>
        (d.pasaporte || '').trim().toLowerCase() === normalizedInput
    );

    if (validProfiles.length === 0) {
        console.error('Login error: Client-side validation failed (passport mismatch)');
        console.log('Normalized input:', `"${normalizedInput}"`);
        console.log('Data passports returned from DB:', data.map(d => `"${d.pasaporte}"`));
        return;
    }

    console.log("LOGIN SUCCESS! Valid profiles:", validProfiles.length);
}

simulateLogin("ALIRIO ORTIZ MOLINA", "BE286208");
