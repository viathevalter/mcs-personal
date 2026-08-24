require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fixSanitizeAndRestoreDotCom() {
  console.log('==================================================================================');
  console.log('🛠️ CORRIGINDO FUNÇÃO SANITIZE_EMAIL E RESTAURANDO .COM EM TODOS OS LEADS');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  // 1. Fix sanitize_email function
  await client.query(`
    CREATE OR REPLACE FUNCTION core_comercial.sanitize_email(raw_email text)
    RETURNS text
    LANGUAGE plpgsql
    IMMUTABLE
    AS $$
    DECLARE
      clean TEXT;
    BEGIN
      IF raw_email IS NULL OR TRIM(raw_email) = '' THEN
        RETURN NULL;
      END IF;

      clean := LOWER(TRIM(raw_email));

      -- Strip URL encoded space (%20)
      clean := REPLACE(clean, '%20', '');
      
      -- Remove non-breaking spaces and control chars
      clean := REGEXP_REPLACE(clean, '[\\u00A0\\u200B\\u200C\\u200D\\uFEFF]', '', 'g');
      
      -- Remove accents / non-ASCII characters in email addresses
      clean := TRANSLATE(clean, 
        'áàâãäåéèêëíìîïóòôõöúùûüñçáéíóú', 
        'aaaaaaeeeeiiiiooooouuuuncaeiou'
      );

      -- Fix commas inside email usernames (e.g. i,c@ -> ic@)
      clean := REGEXP_REPLACE(clean, '([a-z0-9._%+-]+),([a-z0-9._%+-]+@)', '\\1\\2', 'g');

      -- Fix double dots like ..com -> .com
      clean := REGEXP_REPLACE(clean, '\\.{2,}', '.', 'g');

      -- Fix trailing .e -> .es
      clean := REGEXP_REPLACE(clean, '\\.e$', '.es', 'g');

      -- Fix common trailing punctuation like .com. -> .com
      clean := REGEXP_REPLACE(clean, '\\.+$', '');

      -- Remove any remaining non-standard characters from email address
      clean := REGEXP_REPLACE(clean, '[^a-z0-9._%+-@]', '', 'g');

      RETURN clean;
    END;
    $$;
  `);

  console.log('✅ Função core_comercial.sanitize_email atualizada com sucesso!');

  // Test sanitize_email
  const testRes = await client.query(`
    SELECT core_comercial.sanitize_email('info@metalocer.com') as t1,
           core_comercial.sanitize_email('tamoin@tamoin.com') as t2;
  `);
  console.log('🧪 Teste de sanitização:', testRes.rows[0]);

  // 2. Restore .com on core_comercial.leads
  const upLeads = await client.query(`
    UPDATE core_comercial.leads
    SET email = email || 'm', updated_at = NOW()
    WHERE email LIKE '%.co' AND NOT email LIKE '%.com';
  `);
  console.log(`✅ Leads no CRM restaurados de .co para .com: ${upLeads.rowCount} registros.`);

  // 3. Restore .com on core_comercial.lead_prospecting_results (Staging)
  const upStaging = await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET email = email || 'm', updated_at = NOW()
    WHERE email LIKE '%.co' AND NOT email LIKE '%.com';
  `);
  console.log(`✅ Leads no Staging restaurados de .co para .com: ${upStaging.rowCount} registros.`);

  // 4. Distribution check
  const tldStats = await client.query(`
    SELECT count(*), split_part(email, '.', array_length(string_to_array(email, '.'), 1)) as tld
    FROM core_comercial.leads
    GROUP BY tld
    ORDER BY count(*) DESC;
  `);

  console.log('\n📊 DISTRIBUIÇÃO ATUALIZADA DE DOMÍNIOS NO CRM:');
  console.table(tldStats.rows);

  const sample = await client.query(`
    SELECT name, email, website FROM core_comercial.leads WHERE email LIKE '%.com' LIMIT 10;
  `);
  console.log('\n🔍 AMOSTRA DE E-MAILS .COM CORRIGIDOS:');
  console.table(sample.rows);

  await client.end();
}

fixSanitizeAndRestoreDotCom();
