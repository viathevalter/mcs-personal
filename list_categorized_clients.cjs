require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function listFormatted() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const targetKeywords = [
    'cantabria', 'santander', 'torrelavega', 'reinosa', 'camargo',
    'alava', 'álava', 'araba', 'vitoria', 'gasteiz',
    'vizcaya', 'bizkaia', 'bilbao', 'barakaldo', 'getxo', 'basauri', 'sestao', 'galdakao', 'durango', 'amurrio', 'llodio',
    'burgos', 'miranda', 'aranda',
    'leon', 'león', 'ponferrada', 'astorga',
    'asturias', 'oviedo', 'gijon', 'gijón', 'aviles', 'avilés', 'mieres', 'langreo'
  ];

  const allClientsRes = await c.query(`
    SELECT codigo, trade_name, legal_name, tax_id, province, city, address_line, postal_code
    FROM core_common.clients
    ORDER BY trade_name;
  `);

  const matched = [];

  for (const cl of allClientsRes.rows) {
    const combined = `${cl.trade_name || ''} ${cl.legal_name || ''} ${cl.province || ''} ${cl.city || ''} ${cl.address_line || ''} ${cl.postal_code || ''}`.toLowerCase();
    const pc = (cl.postal_code || '').trim();
    const matchesPostal = pc.startsWith('39') || pc.startsWith('01') || pc.startsWith('48') || pc.startsWith('09') || pc.startsWith('24') || pc.startsWith('33');

    const matchedKw = targetKeywords.filter(k => combined.includes(k));

    if (matchedKw.length > 0 || matchesPostal) {
      let zone = 'Outra Região';
      if (combined.includes('vitoria') || combined.includes('alava') || combined.includes('álava') || combined.includes('araba') || pc.startsWith('01')) {
        zone = 'VITORIA-GASTEIZ / ÁLAVA';
      } else if (combined.includes('bilbao') || combined.includes('vizcaya') || combined.includes('bizkaia') || pc.startsWith('48')) {
        zone = 'BILBAO / VIZCAYA';
      } else if (combined.includes('cantabria') || combined.includes('santander') || combined.includes('torrelavega') || pc.startsWith('39')) {
        zone = 'CANTABRIA';
      } else if (combined.includes('burgos') || pc.startsWith('09')) {
        zone = 'BURGOS';
      } else if (combined.includes('leon') || combined.includes('león') || combined.includes('ponferrada') || pc.startsWith('24')) {
        zone = 'LEÓN';
      } else if (combined.includes('asturias') || combined.includes('gijon') || combined.includes('gijón') || combined.includes('oviedo') || combined.includes('aviles') || pc.startsWith('33')) {
        zone = 'OVIEDO / GIJÓN (ASTURIAS)';
      }

      matched.push({
        zona: zone,
        empresa: cl.trade_name || cl.legal_name,
        razao_social: cl.legal_name,
        cidade: cl.city || 'Principal',
        provincia: cl.province || zone,
        endereco: cl.address_line
      });
    }
  }

  // Ordenar por Zona e Empresa
  matched.sort((a, b) => a.zona.localeCompare(b.zona) || a.empresa.localeCompare(b.empresa));

  console.log(`\n🎯 TOTAL DE EMPRESAS ATENDIDAS NO NORTE: ${matched.length}\n`);
  
  let curZone = '';
  for (const m of matched) {
    if (m.zona !== curZone) {
      curZone = m.zona;
      console.log(`\n📍 === ${curZone} ===`);
    }
    console.log(`• ${m.empresa} (${m.razao_social}) - ${m.cidade || ''} | ${m.endereco || ''}`);
  }

  await c.end();
}

listFormatted();
