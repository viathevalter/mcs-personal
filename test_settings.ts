async function check() {
    const res = await fetch('https://pyahcgorkvwfwmlzspnv.supabase.co/rest/v1/?apikey=sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx', {
        headers: { 'Accept-Profile': 'core_personal' }
    });
    const json = await res.json();
    console.log(JSON.stringify(json.definitions.worker_benefit_housing, null, 2));
}

check();
