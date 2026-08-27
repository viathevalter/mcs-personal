require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function searchClients() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("=== 1. BUSCANDO EM CORE_COMMON.CLIENTS ===");
  const targetKeywords = [
    'cantabria', 'santander', 'torrelavega', 'reinosa', 'camargo',
    'alava', 'álava', 'araba', 'vitoria', 'gasteiz',
    'vizcaya', 'bizkaia', 'bilbao', 'barakaldo', 'getxo', 'basauri', 'sestao', 'galdakao', 'durango', 'amurrio', 'llodio',
    'burgos', 'miranda', 'aranda',
    'leon', 'león', 'ponferrada', 'astorga',
    'asturias', 'oviedo', 'gijon', 'gijón', 'aviles', 'avilés', 'mieres', 'langreo'
  ];

  const allClientsRes = await c.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id, province, city, address_line, postal_code, notes, functions_json
    FROM core_common.clients
    ORDER BY trade_name;
  `);

  console.log(`Total de clientes no cadastro: ${allClientsRes.rows.length}`);

  const matchedClients = [];

  for (const cl of allClientsRes.rows) {
    const combinedText = `${cl.trade_name || ''} ${cl.legal_name || ''} ${cl.province || ''} ${cl.city || ''} ${cl.address_line || ''} ${cl.postal_code || ''} ${cl.notes || ''}`.toLowerCase();
    
    // Verificar código postal espanhol de 2 dígitos:
    // 39xxx = Cantabria
    // 01xxx = Álava
    // 48xxx = Vizcaya
    // 09xxx = Burgos
    // 24xxx = León
    // 33xxx = Asturias
    const pc = (cl.postal_code || '').trim();
    const matchesPostal = pc.startsWith('39') || pc.startsWith('01') || pc.startsWith('48') || pc.startsWith('09') || pc.startsWith('24') || pc.startsWith('33');

    const matchedKw = targetKeywords.filter(k => combinedText.includes(k));

    if (matchedKw.length > 0 || matchesPostal) {
      matchedClients.push({
        id: cl.id,
        codigo: cl.codigo,
        empresa: cl.trade_name || cl.legal_name,
        legal_name: cl.legal_name,
        cif: cl.tax_id,
        provincia: cl.province,
        cidade: cl.city,
        endereco: cl.address_line,
        cp: cl.postal_code,
        match: matchedKw.join(', ') || `CP ${pc}`
      });
    }
  }

  console.log(`\n🎯 Clientes encontrados em Cantabria, Vitoria, Bilbao, Burgos, León, Oviedo/Gijón/Asturias: ${matchedClients.length}`);
  console.table(matchedClients);

  console.log("\n=== 2. BUSCANDO EM CLIENT_SITES / OBRAS / LOCALIZAÇÕES DE PROJETO ===");
  const sitesRes = await c.query(`
    SELECT cs.id, cs.client_id, cs.name as site_name, cs.city, cs.province, cs.address, c.trade_name as client_name
    FROM core_common.client_sites cs
    LEFT JOIN core_common.clients c ON c.id = cs.client_id;
  `);
  console.log(`Total de sites/centros de trabalho: ${sitesRes.rows.length}`);
  console.table(sitesRes.rows);

  console.log("\n=== 3. BUSCANDO EM PEDIDOS / PROJETOS DA EMPRESA ===");
  const pedidosRes = await c.query(`
    SELECT p.id, p.code, p.title, p.location, p.city, p.province, p.client_id, c.trade_name as client_name, p.status
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id;
  `);
  console.log(`Total de pedidos comerciais: ${pedidosRes.rows.length}`);
  console.table(pedidosRes.rows);

  console.log("\n=== 4. BUSCANDO EM PUBLIC.CLIENTES / PUBLIC.OBRAS ===");
  const pubObras = await c.query(`
    SELECT o.id, o.nome as obra_nome, cl.nombre_comercial, cl.razon_social, cl.provincia, cl.municipio, cl.domicilio
    FROM public.obras o
    LEFT JOIN public.clientes cl ON cl.id = o.cliente_id;
  `);
  console.log(`Total de obras em public: ${pubObras.rows.length}`);
  console.table(pubObras.rows);

  console.log("\n=== 5. LISTAGEM COMPLETA DE TODOS OS CLIENTES ATIVOS DO SISTEMA PARA CONFERÊNCIA ===");
  console.table(allClientsRes.rows.map(c => ({
    codigo: c.codigo,
    empresa: c.trade_name,
    razao_social: c.legal_name,
    cidade: c.city,
    provincia: c.province,
    cp: c.postal_code,
    endereco: c.address_line
  })));

  await c.end();
}

searchClients();
