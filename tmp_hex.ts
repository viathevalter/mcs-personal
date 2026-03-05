const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function check() {
    const res = await fetch(`${supabaseUrl}/rest/v1/workers?pasaporte=eq.BE286208&select=nome,pasaporte`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Accept-Profile': 'core_personal'
        }
    });
    const d2 = await res.json();
    if (d2 && Array.isArray(d2)) {
        d2.forEach(w => {
            console.log(`Name: '${w.nome}' (len ${w.nome?.length})`);
            console.log(`Passport: '${w.pasaporte}' (len ${w.pasaporte?.length})`);
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
        });
    } else {
        console.error("No data", d2);
    }
}

check();
