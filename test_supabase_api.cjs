const url = 'https://pyahcgorkvwfwmlzspnv.supabase.co/rest/v1/solicitud_tareas';
const anonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    try {
        console.log("=== CALLING SUPABASE REST API AS AUTHENTICATED USING FETCH ===");
        
        // Simulating the headers
        const headers = {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Profile': 'core_operacoes'
        };

        const selectParam = encodeURIComponent('*,department:departments!inner(id,name,code),solicitud:solicitudes_operativas!inner(id,codigo,title,status,priority,due_date)');
        const fullUrl = `${url}?select=${selectParam}&empresa_id=eq.441f1f5d-aed3-40e3-8c77-7b1217757251&department.code=in.(DOCUMENTACION,DOCUMENTACIÓN,CONTRATOS)`;

        const response = await fetch(fullUrl, { headers });
        console.log("Response Status:", response.status);
        const data = await response.json();
        console.log("Response Data:", data);

    } catch (e) {
        console.error("ERROR:", e);
    }
}
run();
