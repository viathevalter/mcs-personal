require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

async function analyzeClients() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log('========================================================================');
    console.log('🔍 ANALISANDO BASE DE 350 CLIENTES REAIS DA MCS E SEUS CNAEs');
    console.log('========================================================================\n');

    const res = await client.query(`
      SELECT id, cod_cliente, nombre_comercial, razon_social, cif_dni, domicilio, pais, email_envio_factura
      FROM public.clientes
      WHERE razon_social IS NOT NULL AND TRIM(razon_social) != ''
      ORDER BY id ASC;
    `);

    const clientList = res.rows;
    console.log(`Total de empresas clientes encontradas: ${clientList.length}\n`);

    // Batch process with Gemini Flash to classify official Spanish CNAE codes
    const BATCH_SIZE = 30;
    const classified = [];

    for (let i = 0; i < clientList.length; i += BATCH_SIZE) {
      const chunk = clientList.slice(i, i + BATCH_SIZE);
      const prompt = `You are a Spanish National Institute of Statistics (INE) & Mercantile Registry CNAE classifier.
Analyze the following active B2B industrial clients of a metalwork/piping/welding subcontractor company in Spain.
For EACH company in the list, determine its most accurate 4-digit Spanish CNAE 2009 code, CNAE Title, and Industrial Subsector based on their legal name, commercial name, and activity.

Client List:
${JSON.stringify(chunk.map(c => ({ id: c.id, name: c.razon_social || c.nombre_comercial, cif: c.cif_dni, address: c.domicilio })))}

Return JSON array only:
[
  {
    "id": "client_id",
    "name": "company_name",
    "cnae_code": "2511",
    "cnae_title": "Fabricación de estructuras metálicas y sus componentes",
    "subsector": "Estructuras Metálicas & Montajes"
  }
]`;

      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10000);
        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          signal: controller.signal
        });
        clearTimeout(t);

        const json = await gRes.json();
        if (json.error) {
          console.error("API Error:", json.error);
        }
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        classified.push(...parsed);
        console.log(`Processados ${Math.min(i + BATCH_SIZE, clientList.length)} / ${clientList.length} clientes... (Classificados: ${parsed.length})`);
      } catch (err) {
        console.error('Erro no lote:', err.message);
      }
    }

    // Aggregate by CNAE Code
    const cnaeStats = {};
    for (const item of classified) {
      const code = item.cnae_code || 'Outros';
      if (!cnaeStats[code]) {
        cnaeStats[code] = {
          code,
          title: item.cnae_title,
          subsector: item.subsector,
          count: 0,
          sampleClients: []
        };
      }
      cnaeStats[code].count++;
      if (cnaeStats[code].sampleClients.length < 4) {
        cnaeStats[code].sampleClients.push(item.name);
      }
    }

    const sortedCnae = Object.values(cnaeStats).sort((a, b) => b.count - a.count);

    console.log('\n========================================================================');
    console.log('🏆 RANKING DOS PRINCIPAIS CNAEs DA SUA CARTEIRA ATUAL DE CLIENTES');
    console.log('========================================================================\n');
    console.table(sortedCnae.map(s => ({
      'CNAE': s.code,
      'Título Oficial': s.title,
      'Sub-Setor': s.subsector,
      'Qtd Clientes': s.count,
      '% da Carteira': `${((s.count / classified.length) * 100).toFixed(1)}%`,
      'Exemplos de Clientes': s.sampleClients.join(', ')
    })));

  } finally {
    await client.end();
  }
}

analyzeClients();
