require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Mapeamento de Província para Comunidade Autônoma na Espanha
const PROVINCE_TO_REGION = {
  'Barcelona': 'Cataluña',
  'Tarragona': 'Cataluña',
  'Girona': 'Cataluña',
  'Lleida': 'Cataluña',
  'Madrid': 'Comunidad de Madrid',
  'Valencia': 'Comunitat Valenciana',
  'Castellón': 'Comunitat Valenciana',
  'Alicante': 'Comunitat Valenciana',
  'Vizcaya': 'País Vasco',
  'Guipúzcoa': 'País Vasco',
  'Álava': 'País Vasco',
  'Navarra': 'Comunidad Foral de Navarra',
  'Asturias': 'Principado de Asturias',
  'Pontevedra': 'Galicia',
  'A Coruña': 'Galicia',
  'Lugo': 'Galicia',
  'Ourense': 'Galicia',
  'Zaragoza': 'Aragón',
  'Huesca': 'Aragón',
  'Teruel': 'Aragón',
  'Sevilla': 'Andalucía',
  'Cádiz': 'Andalucía',
  'Huelva': 'Andalucía',
  'Málaga': 'Andalucía',
  'Córdoba': 'Andalucía',
  'Granada': 'Andalucía',
  'Jaén': 'Andalucía',
  'Almería': 'Andalucía',
  'Murcia': 'Región de Murcia',
  'Cantabria': 'Cantabria',
  'La Rioja': 'La Rioja',
  'Burgos': 'Castilla y León',
  'Valladolid': 'Castilla y León',
  'León': 'Castilla y León',
  'Salamanca': 'Castilla y León',
  'Palencia': 'Castilla y León',
  'Zamora': 'Castilla y León',
  'Segovia': 'Castilla y León',
  'Ávila': 'Castilla y León',
  'Soria': 'Castilla y León',
  'Toledo': 'Castilla-La Mancha',
  'Ciudad Real': 'Castilla-La Mancha',
  'Albacete': 'Castilla-La Mancha',
  'Guadalajara': 'Castilla-La Mancha',
  'Cuenca': 'Castilla-La Mancha',
  'Badajoz': 'Extremadura',
  'Cáceres': 'Extremadura'
};

// Heurística de classificação de porte industrial na Espanha
function classifyCompanySize(name, email, notes, sector) {
  const text = `${name} ${email} ${notes} ${sector}`.toLowerCase();

  // Tier 1: Gran Empresa / Corporação (> 250 funcionários / S.A. / Grupo / Astillero / EPC / Petroquímica)
  if (
    text.includes(' s.a.') ||
    text.includes(' s.a') ||
    text.includes(' s.a.u.') ||
    text.includes('astillero') ||
    text.includes('navantia') ||
    text.includes('duro felguera') ||
    text.includes('tamoin') ||
    text.includes('elecnor') ||
    text.includes('ferrovial') ||
    text.includes('sener') ||
    text.includes('urssa') ||
    text.includes('grupo') ||
    text.includes('corporation') ||
    text.includes('holding') ||
    text.includes('petroquimic') ||
    text.includes('refineria') ||
    text.includes('central termica') ||
    text.includes('zayer') ||
    text.includes('inoxpa') ||
    text.includes('dragados') ||
    text.includes('iberdrola') ||
    text.includes('repsol') ||
    text.includes('cepsa')
  ) {
    return 'Gran Empresa (Tier 1)';
  }

  // Tier 2: Mediana Empresa (50 a 250 funcionários / Caldeiraria Pesada / Tanques / Estruturas de Naves / Grandes Montagens)
  if (
    text.includes('caldereria pesada') ||
    text.includes('intercambiador') ||
    text.includes('reactores') ||
    text.includes('oleoducto') ||
    text.includes('gasoducto') ||
    text.includes('parque empresarial') ||
    text.includes('poligono industrial') ||
    text.includes('tanques') ||
    text.includes('estructuras metalicas') ||
    text.includes('montajes industriales') ||
    text.includes('mecanizado cnc') ||
    text.includes('torneria pesada') ||
    text.includes('prefabricacion')
  ) {
    return 'Mediana Empresa (Tier 2)';
  }

  // Tier 3: Pequeña Empresa / Taller Especializado (< 50 funcionários)
  return 'Pequeña Empresa / Taller (Tier 3)';
}

async function classifyAllLeads() {
  console.log('==================================================================================');
  console.log('🏛️ CLASSIFICAÇÃO INTELIGENTE POR REGIÃO, CIDADE E PORTE DE EMPRESA (TIER 1/2/3)');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  // Add columns if they do not exist
  await client.query(`
    ALTER TABLE core_comercial.leads 
    ADD COLUMN IF NOT EXISTS company_size text,
    ADD COLUMN IF NOT EXISTS region text;
  `);

  await client.query(`
    ALTER TABLE core_comercial.lead_prospecting_results 
    ADD COLUMN IF NOT EXISTS company_size text,
    ADD COLUMN IF NOT EXISTS region text;
  `);

  console.log('✅ Colunas company_size e region garantidas no banco.');

  // Fetch leads to classify
  const leadsRes = await client.query('SELECT id, name, company_name, email, city, province, notes, sector, tags FROM core_comercial.leads;');
  console.log(`Classificando ${leadsRes.rows.length} leads no CRM...`);

  let countTier1 = 0;
  let countTier2 = 0;
  let countTier3 = 0;

  for (const lead of leadsRes.rows) {
    const prov = lead.province || '';
    const city = lead.city || '';
    const region = PROVINCE_TO_REGION[prov] || PROVINCE_TO_REGION[city] || 'España';
    const size = classifyCompanySize(lead.company_name || lead.name, lead.email, lead.notes, lead.sector);

    if (size.includes('Tier 1')) countTier1++;
    else if (size.includes('Tier 2')) countTier2++;
    else countTier3++;

    const updatedTags = Array.from(new Set([...(lead.tags || []), size, region]));

    await client.query(`
      UPDATE core_comercial.leads
      SET company_size = $1, region = $2, tags = $3, updated_at = NOW()
      WHERE id = $4;
    `, [size, region, updatedTags, lead.id]);
  }

  // Update Staging results as well
  const stagingRes = await client.query('SELECT id, company_name, email, city, province FROM core_comercial.lead_prospecting_results;');
  console.log(`Classificando ${stagingRes.rows.length} registros no Staging...`);

  for (const row of stagingRes.rows) {
    const prov = row.province || '';
    const city = row.city || '';
    const region = PROVINCE_TO_REGION[prov] || PROVINCE_TO_REGION[city] || 'España';
    const size = classifyCompanySize(row.company_name, row.email, '', '');

    await client.query(`
      UPDATE core_comercial.lead_prospecting_results
      SET company_size = $1, region = $2, updated_at = NOW()
      WHERE id = $3;
    `, [size, region, row.id]);
  }

  console.log('\n🎉 CLASSIFICAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log(`🏢 Grandes Empresas / Corporações (Tier 1): ${countTier1}`);
  console.log(`🏭 Médias Empresas / Fabricantes (Tier 2): ${countTier2}`);
  console.log(`⚙️ Pequenas Empresas / Oficinas Especializadas (Tier 3): ${countTier3}`);

  const regionBreakdown = await client.query(`
    SELECT COALESCE(region, 'Outros') as reg, count(*) 
    FROM core_comercial.leads 
    GROUP BY reg 
    ORDER BY count(*) DESC;
  `);

  console.log('\n🗺️ DISTRIBUIÇÃO POR COMUNIDADE AUTÔNOMA (REGIÃO):');
  console.table(regionBreakdown.rows);

  await client.end();
}

classifyAllLeads();
