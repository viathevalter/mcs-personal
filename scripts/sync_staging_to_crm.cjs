/**
 * ==============================================================================
 * 🚀 SYNC STAGING TO CRM LEADS (core_comercial.leads)
 * ==============================================================================
 * Converte todos os leads da staging (lead_prospecting_results) diretamente
 * para a tabela principal de CRM (core_comercial.leads), segmentados por:
 * - País (🇪🇸 Espanha | 🇫🇷 França | 🇮🇹 Itália)
 * - Setor Industrial Padronizado (ex: Calderería & Tubería, Estructuras Metálicas, etc.)
 * - Tags e Origem: "Prospecção Automática 24/7", "E-mail Verificado MX"
 * - Deduplicação rigorosa contra e-mails já existentes no CRM
 * ==============================================================================
 */

const { Pool } = require('pg');
require('dotenv').config();

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: PROD_PG_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function syncAllStagingToCrm() {
  const client = await pool.connect();

  try {
    console.log('🔄 Conectado ao banco de dados de Produção...');

    const initialCrmCountRes = await client.query('SELECT count(*) FROM core_comercial.leads;');
    console.log(`📊 Total atual no CRM: ${initialCrmCountRes.rows[0].count} leads.`);

    await client.query('BEGIN');

    const insertSql = `
      WITH deduplicated_staging AS (
        SELECT DISTINCT ON (LOWER(r.email))
          r.id AS staging_id,
          COALESCE(r.empresa_id, j.empresa_id, '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid) AS empresa_id,
          r.company_name,
          LOWER(TRIM(r.email)) AS email,
          r.phone,
          r.website,
          r.address,
          r.city,
          r.province,
          r.job_id,
          r.confidence_score,
          CASE
            WHEN r.country ILIKE '%fran%' OR j.location ILIKE '%fran%' OR j.title ILIKE '%🇫🇷%' THEN '🇫🇷 França'
            WHEN r.country ILIKE '%ital%' OR j.location ILIKE '%ital%' OR j.title ILIKE '%🇮🇹%' THEN '🇮🇹 Itália'
            ELSE '🇪🇸 Espanha'
          END AS country_label,
          CASE
            WHEN j.title ILIKE '%33.20%' OR j.title ILIKE '%3320%' OR j.title ILIKE '%tuyauterie%' OR j.title ILIKE '%tuberia%' OR j.title ILIKE '%tubisteria%' OR j.title ILIKE '%piping%' THEN 'Calderería & Tubería Industrial'
            WHEN j.title ILIKE '%25.29%' OR j.title ILIKE '%2529%' OR j.title ILIKE '%chaudronnerie%' OR j.title ILIKE '%caldereria%' OR j.title ILIKE '%caldareria%' OR j.title ILIKE '%cuves%' OR j.title ILIKE '%tanques%' THEN 'Calderería & Tubería Industrial'
            WHEN j.title ILIKE '%25.11%' OR j.title ILIKE '%2511%' OR j.title ILIKE '%charpente%' OR j.title ILIKE '%estructuras%' OR j.title ILIKE '%carpenteria%' THEN 'Estructuras Metálicas & Montajes'
            WHEN j.title ILIKE '%25.62%' OR j.title ILIKE '%2562%' OR j.title ILIKE '%usinage%' OR j.title ILIKE '%mecanizado%' OR j.title ILIKE '%meccanica%' OR j.title ILIKE '%torner%' OR j.title ILIKE '%tornitura%' THEN 'Mecanizado CNC & Tornería'
            WHEN j.title ILIKE '%30.11%' OR j.title ILIKE '%3011%' OR j.title ILIKE '%33.15%' OR j.title ILIKE '%3315%' OR j.title ILIKE '%naval%' OR j.title ILIKE '%astilleros%' OR j.title ILIKE '%chantiers%' OR j.title ILIKE '%cantieri%' THEN 'Construção & Reparação Naval'
            WHEN j.title ILIKE '%28.25%' OR j.title ILIKE '%2825%' OR j.title ILIKE '%33.11%' OR j.title ILIKE '%3311%' OR j.title ILIKE '%echangeur%' OR j.title ILIKE '%scambiatori%' OR j.title ILIKE '%calderas%' OR j.title ILIKE '%froid%' THEN 'Mantenimiento Industrial & Calderas'
            ELSE 'Indústria & Montagens Industriais'
          END AS sector_label
        FROM core_comercial.lead_prospecting_results r
        LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id
        WHERE r.email IS NOT NULL AND r.email != ''
          AND NOT EXISTS (
            SELECT 1 FROM core_comercial.leads l WHERE LOWER(l.email) = LOWER(r.email)
          )
        ORDER BY LOWER(r.email), r.created_at DESC
      )
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        address_line, city, province, sector, origen_lead, tags, notes, prospecting_job_id
      )
      SELECT
        s.empresa_id,
        COALESCE(s.company_name, 'Empresa Industrial'),
        COALESCE(s.company_name, 'Empresa Industrial'),
        s.email,
        s.phone,
        s.website,
        s.address,
        s.city,
        s.province,
        s.sector_label,
        'Prospecção Automática 24/7',
        ARRAY['Prospecção 24/7', 'E-mail Verificado MX', s.country_label, s.sector_label],
        'Lead capturado e verificado 100% real via Motor 24/7. País: ' || s.country_label || ' | Setor: ' || s.sector_label,
        s.job_id
      FROM deduplicated_staging s
      RETURNING id, email;
    `;

    console.log('⚡ Executando conversão em lote para core_comercial.leads...');
    const insertedRes = await client.query(insertSql);
    console.log(`✅ Inseridos ${insertedRes.rows.length} novos leads no CRM!`);

    console.log('🔄 Atualizando status na staging (lead_prospecting_results)...');
    const updateStagingRes = await client.query(`
      UPDATE core_comercial.lead_prospecting_results r
      SET status = 'imported',
          imported_lead_id = l.id,
          updated_at = NOW()
      FROM core_comercial.leads l
      WHERE LOWER(r.email) = LOWER(l.email)
        AND (r.status != 'imported' OR r.imported_lead_id IS NULL);
    `);
    console.log(`✅ Atualizados ${updateStagingRes.rowCount} registros na staging para status 'imported'.`);

    await client.query('COMMIT');

    const finalCrmCountRes = await client.query('SELECT count(*) FROM core_comercial.leads;');
    console.log('\n================================================================================');
    console.log('🎉 SINCRONIZAÇÃO COMPLETA COM SUCESSO!');
    console.log(`📈 Leads no CRM antes: ${initialCrmCountRes.rows[0].count}`);
    console.log(`🚀 Novos leads adicionados: ${insertedRes.rows.length}`);
    console.log(`🏆 Total atual de leads no CRM: ${finalCrmCountRes.rows[0].count}`);
    console.log('================================================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a sincronização:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  syncAllStagingToCrm().catch(console.error);
}

module.exports = { syncAllStagingToCrm };
