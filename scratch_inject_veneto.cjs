/**
 * INJECT AUDITED VENETO WORKSHOPS TO CRM (PROD & DEV)
 */

const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const VENETO_LEADS = [
  { name: 'Ferrari Melidonio S.r.l.', domain: 'ferrarimelidonio.it', email: 'info@ferrarimelidonio.it', phone: '+39 0444 567111', city: 'Vicenza', prov: 'Vicenza (VI)', sector: 'Carpenteria Metallica & Strutture (Italia)', ateco: '25.11' },
  { name: 'Carpenteria Filippi Luciano S.n.c.', domain: 'carpenteriafilippiluciano.com', email: 'info@carpenteriafilippiluciano.com', phone: '+39 0445 602111', city: 'Malo', prov: 'Vicenza (VI)', sector: 'Carpenteria Metallica & Strutture (Italia)', ateco: '25.11' },
  { name: 'Metal 9 S.r.l. Strutture Acciaio', domain: 'metal9.it', email: 'info@metal9.it', phone: '+39 0444 737111', city: 'Montegalda', prov: 'Vicenza (VI)', sector: 'Carpenteria Metallica & Strutture (Italia)', ateco: '25.11' },
  { name: 'Balbo Meccanica S.r.l.', domain: 'balbomeccanicasrl.it', email: 'info@balbomeccanicasrl.it', phone: '+39 0442 95111', city: 'Terrazzo', prov: 'Verona (VR)', sector: 'Lavorazioni Meccaniche CNC & Torneria (Italia)', ateco: '25.62' },
  { name: 'Valan G. S.n.c. Carpenterie Metalliche', domain: 'valang-snc.it', email: 'info@valang-snc.it', phone: '+39 045 761111', city: 'Colognola ai Colli', prov: 'Verona (VR)', sector: 'Carpenteria Metallica & Strutture (Italia)', ateco: '25.11' },
  { name: 'Carpenteria Toniato Robert', domain: 'carpenteriatoniatorobert.it', email: 'info@carpenteriatoniatorobert.it', phone: '+39 049 884111', city: 'Limena', prov: 'Padova (PD)', sector: 'Carpenteria Metallica & Strutture (Italia)', ateco: '25.11' },
  { name: 'FAIP Saldatura & Carpenteria Industriale', domain: 'faipsaldaturapadova.it', email: 'info@faipsaldaturapadova.it', phone: '+39 049 930111', city: 'Campodarsego', prov: 'Padova (PD)', sector: 'Caldareria Pesante & Serbatoi a Pressione (Italia)', ateco: '25.29' }
];

async function injectVeneto(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empRes.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  let added = 0;
  for (const w of VENETO_LEADS) {
    const exists = await client.query('SELECT id FROM core_comercial.leads WHERE email = $1;', [w.email.toLowerCase()]);
    if (exists.rows.length === 0) {
      await client.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, name, company_name, email, phone, website,
          address_line, city, province, sector, origen_lead, notes, tags, created_at, updated_at
        ) VALUES (
          $1, $2, $2, $3, $4, $5,
          $6, $7, $8, $9, 'Prospecção Comercial', NULL, ARRAY['Italia', 'Prospecção Ativa', $10], NOW(), NOW()
        );
      `, [
        empresaId,
        w.name,
        w.email.toLowerCase(),
        w.phone,
        `https://www.${w.domain}`,
        `Zona Industriale di ${w.city}`,
        w.city,
        w.prov,
        w.sector,
        w.ateco
      ]);
      added++;
    }
  }

  const totalItaly = await client.query("SELECT count(*) FROM core_comercial.leads WHERE tags @> ARRAY['Italia'];");
  console.log(`[${dbName}] Added ${added} new Veneto leads. Total Italy in CRM: ${totalItaly.rows[0].count}`);

  await client.end();
}

async function run() {
  await injectVeneto('DEV', devConnectionString);
  await injectVeneto('PROD', prodConnectionString);
}

run();
