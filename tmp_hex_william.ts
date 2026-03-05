const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function check() {
    const res = await fetch(`${supabaseUrl}/rest/v1/workers?pasaporte=ilike.*GH281425*&select=nome,pasaporte`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Accept-Profile': 'core_personal'
        }
    });
    const d2 = await res.json();
    if (d2 && Array.isArray(d2)) {
        d2.forEach(w => {
            console.log(`Name: '${w.nome}'`);
            console.log(`Passport: '${w.pasaporte}'`);
            if (w.pasaporte) {
                let hex = '';
                for (let i = 0; i < w.pasaporte.length; i++) {
                    hex += w.pasaporte.charCodeAt(i).toString(16) + ' ';
                }
                console.log(`Hex P: ${hex}`);
            }
            if (w.nome) {
                let hex = '';
                for (let i = 0; i < w.nome.length; i++) {
                    hex += w.nome.charCodeAt(i).toString(16) + ' ';
                }
                console.log(`Hex N: ${hex}`);
            }

            // Local check matching the app's logic
            const normalizedPassportInput = "GH281425".trim().toLowerCase();
            const normalizedNameInput = "WILLIAM MORAIS DA SILVA"
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, " ");

            const dbPassport = (w.pasaporte || '').trim().toLowerCase();
            const dbName = (w.nome || '')
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, " ");

            console.log(`App Check DB Passport "${dbPassport}" to "${normalizedPassportInput}"`);
            console.log(`App Check DB Name "${dbName}" includes "${normalizedNameInput}"`);

            console.log("App Passport match?", dbPassport === normalizedPassportInput);
            console.log("App Name match?", dbName.includes(normalizedNameInput));
        });
    } else {
        console.error("No data", d2);
    }
}

check();
