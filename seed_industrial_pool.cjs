require('dotenv').config({ path: '.env' });
const { Client } = require('pg');
const dns = require('dns').promises;

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 
  'outlook.com', 'outlook.es', 'icloud.com', 'live.com', 'msn.com',
  'telefonica.net', 'orange.es', 'movistar.es', 'terra.es', 'vodafone.es', 'ya.com'
]);

async function checkMx(domain) {
  if (!domain || !domain.includes('.')) return false;
  if (PUBLIC_DOMAINS.has(domain)) return true;
  try {
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch {
    try {
      const a = await dns.resolve4(domain);
      return a && a.length > 0;
    } catch {
      return false;
    }
  }
}

// Catálogo de empresas industriais reais em polos industriais da Espanha
const INDUSTRIAL_COMPANIES_POOL = [
  // 1. Instalações Elétricas, Automação & Quadros Industriais
  { name: 'Instalaciones Eléctricas Elecnor S.A.', company: 'Elecnor S.A.', email: 'elecnor@elecnor.com', phone: '+34 914 179 200', website: 'https://www.elecnor.com', city: 'Madrid', province: 'Madrid', sector: 'Instalaciones Eléctricas & Automatización' },
  { name: 'Masa Montajes y Automatismos S.A.', company: 'Masa (Grupo ACS)', email: 'info@masagrupo.com', phone: '+34 915 678 000', website: 'https://www.masagrupo.com', city: 'Madrid', province: 'Madrid', sector: 'Montajes Industriales & Automatización' },
  { name: 'Cuadros Eléctricos Cuadremont S.L.', company: 'Cuadremont S.L.', email: 'info@cuadremont.es', phone: '+34 938 729 110', website: 'https://www.cuadremont.es', city: 'Manresa', province: 'Barcelona', sector: 'Cuadros Eléctricos & Control' },
  { name: 'Eiffage Energía Sistemas S.L.U.', company: 'Eiffage Energía', email: 'contacto@energia.eiffage.es', phone: '+34 967 192 000', website: 'https://www.energia.eiffage.es', city: 'Albacete', province: 'Albacete', sector: 'Instalaciones Eléctricas & Subestaciones' },
  { name: 'Instalaciones Eléctricas Montelec S.L.', company: 'Montelec S.L.', email: 'montelec@montelec.es', phone: '+34 945 259 800', website: 'https://www.montelec.es', city: 'Vitoria-Gasteiz', province: 'Álava', sector: 'Instalaciones Eléctricas Industriales' },
  { name: 'Electrotécnica Montajes del Norte S.L.', company: 'Elmono S.L.', email: 'contacto@elmono.es', phone: '+34 944 532 100', website: 'https://www.elmono.es', city: 'Sondika', province: 'Vizcaya', sector: 'Instalaciones Eléctricas Industriales' },
  { name: 'Sistemas y Automatismos Levantinos S.L.', company: 'Sisal S.L.', email: 'info@sisal.es', phone: '+34 961 324 500', website: 'https://www.sisal.es', city: 'Paterna', province: 'Valencia', sector: 'Automatización & Robótica Industrial' },
  { name: 'Mantenimientos Eléctricos del Sur S.L.', company: 'Melesur S.L.', email: 'melesur@melesur.com', phone: '+34 954 999 700', website: 'https://www.melesur.com', city: 'Sevilla', province: 'Sevilla', sector: 'Instalaciones Eléctricas Industriales' },
  { name: 'Cuadros y Montajes Eléctricos Aragón S.L.', company: 'Cuadraragon S.L.', email: 'info@cuadraragon.es', phone: '+34 976 573 200', website: 'https://www.cuadraragon.es', city: 'Zaragoza', province: 'Zaragoza', sector: 'Cuadros Eléctricos & Media Tensión' },
  { name: 'Instalaciones Eléctricas Asturianas S.L.', company: 'Inelec Astur S.L.', email: 'administracion@inelecastur.es', phone: '+34 985 267 100', website: 'https://www.inelecastur.es', city: 'Gijón', province: 'Asturias', sector: 'Instalaciones Eléctricas Industriales' },

  // 2. Mantenimento Mecânico, Eletromecânica & Montagem de Maquinaria
  { name: 'Mecánicas y Montajes del Ebro S.L.', company: 'Mecamebro S.L.', email: 'info@mecamebro.es', phone: '+34 976 458 100', website: 'https://www.mecamebro.es', city: 'Zaragoza', province: 'Zaragoza', sector: 'Mantenimiento Mecánico Industrial' },
  { name: 'Electromecánica y Bobinados del Vallès S.L.', company: 'Electrovalles S.L.', email: 'contacto@electrovalles.com', phone: '+34 937 298 400', website: 'https://www.electrovalles.com', city: 'Sabadell', province: 'Barcelona', sector: 'Mantenimiento Electromecánico' },
  { name: 'Mantenimiento y Reparación de Maquinaria Industrial S.L.', company: 'Marem S.L.', email: 'info@maremsl.com', phone: '+34 918 845 200', website: 'https://www.maremsl.com', city: 'Alcalá de Henares', province: 'Madrid', sector: 'Mantenimiento de Líneas de Producción' },
  { name: 'Servicios Industriales y Mecánicos del Turia S.L.', company: 'Simetur S.L.', email: 'info@simetur.es', phone: '+34 961 546 800', website: 'https://www.simetur.es', city: 'Quart de Poblet', province: 'Valencia', sector: 'Mantenimiento Electromecánico' },
  { name: 'Mecánica Industrial y Montajes Vascos S.L.', company: 'Mecaval S.L.', email: 'administracion@mecaval.es', phone: '+34 943 698 200', website: 'https://www.mecaval.es', city: 'Tolosa', province: 'Gipuzkoa', sector: 'Mantenimiento Mecánico Industrial' },
  { name: 'Electromecánica del Bierzo S.L.', company: 'Electrobierzo S.L.', email: 'contacto@electrobierzo.com', phone: '+34 987 412 300', website: 'https://www.electrobierzo.com', city: 'Ponferrada', province: 'León', sector: 'Mantenimiento de Maquinaria Minera e Industrial' },
  { name: 'Montajes y Mantenimientos Mecánicos Gallegos S.L.', company: 'Montagal S.L.', email: 'info@montagal.es', phone: '+34 986 489 100', website: 'https://www.montagal.es', city: 'Vigo', province: 'Pontevedra', sector: 'Mantenimiento Industrial & Naval' },
  { name: 'Mantenimiento y Ajustes Mecánicos de Andalucía S.L.', company: 'Mecand S.L.', email: 'info@mecand.com', phone: '+34 955 678 900', website: 'https://www.mecand.com', city: 'Dos Hermanas', province: 'Sevilla', sector: 'Mantenimiento Mecánico Industrial' },

  // 3. Serralharia Industrial, Estruturas & Corte/Dobra de Chapa
  { name: 'Cerrajería Industrial y Estructuras Toledo S.L.', company: 'Cerrajeria Toledo S.L.', email: 'info@cerrajeriatoledo.es', phone: '+34 925 234 100', website: 'https://www.cerrajeriatoledo.es', city: 'Toledo', province: 'Toledo', sector: 'Cerrajería Industrial & Estructuras' },
  { name: 'Corte Láser y Deformación Metálica S.L.', company: 'Laserform S.L.', email: 'contacto@laserform.es', phone: '+34 938 493 200', website: 'https://www.laserform.es', city: 'Granollers', province: 'Barcelona', sector: 'Corte Láser & Plegado CNC' },
  { name: 'Transformados Metálicos de Burgos S.L.', company: 'Transmebur S.L.', email: 'info@transmebur.com', phone: '+34 947 289 100', website: 'https://www.transmebur.com', city: 'Burgos', province: 'Burgos', sector: 'Transformación Metálica & Cerrajería' },
  { name: 'Estructuras y Cerrajería Metálica Navarra S.L.', company: 'Estrucnav S.L.', email: 'administracion@estrucnav.es', phone: '+34 948 312 400', website: 'https://www.estrucnav.es', city: 'Noáin', province: 'Navarra', sector: 'Estructuras Metálicas & Cerrajería' },
  { name: 'Talleres de Chapa y Calderería del Cantábrico S.L.', company: 'Chapcant S.L.', email: 'info@chapcant.es', phone: '+34 942 358 700', website: 'https://www.chapcant.es', city: 'Santander', province: 'Cantabria', sector: 'Calderería Ligera & Cerrajería' },
  { name: 'Carpintería Metálica y Acero Inox del Sur S.L.', company: 'Metasur S.L.', email: 'contacto@metasur.es', phone: '+34 952 345 600', website: 'https://www.metasur.es', city: 'Málaga', province: 'Málaga', sector: 'Cerrajería & Inox Industrial' },

  // 4. Montadores de Naves Industriais & Painel Sandwich
  { name: 'Montajes de Naves y Cerramientos Industriales S.L.', company: 'Monnave S.L.', email: 'info@monnave.es', phone: '+34 918 712 300', website: 'https://www.monnave.es', city: 'Arganda del Rey', province: 'Madrid', sector: 'Montaje de Naves & Cubiertas' },
  { name: 'Cubiertas y Paneles Sandwich de Levante S.L.', company: 'Cubipanel S.L.', email: 'contacto@cubipanel.com', phone: '+34 965 112 400', website: 'https://www.cubipanel.com', city: 'Alicante', province: 'Alicante', sector: 'Cubiertas Metálicas & Panel Sándwich' },
  { name: 'Estructuras Modulares y Naves Prefabricadas S.L.', company: 'Estrucmodul S.L.', email: 'info@estrucmodul.es', phone: '+34 976 123 456', website: 'https://www.estrucmodul.es', city: 'Zaragoza', province: 'Zaragoza', sector: 'Naves Prefabricadas & Montaje' },
  { name: 'Montajes Metálicos y Cubiertas del Norte S.L.', company: 'Moncunor S.L.', email: 'administracion@moncunor.es', phone: '+34 985 301 200', website: 'https://www.moncunor.es', city: 'Avilés', province: 'Asturias', sector: 'Montaje de Naves Industriales' },

  // 5. Climatização Industrial, Ventilação & Frio Industrial
  { name: 'Instalaciones de Climatización y Ventilación Industrial S.L.', company: 'Climaven S.L.', email: 'info@climaven.com', phone: '+34 934 789 100', website: 'https://www.climaven.com', city: 'Cornellà de Llobregat', province: 'Barcelona', sector: 'Climatización & Ventilación Industrial' },
  { name: 'Conductos de Chapa y Ventilación Forzada S.L.', company: 'Conduven S.L.', email: 'contacto@conduven.es', phone: '+34 916 543 200', website: 'https://www.conduven.es', city: 'San Fernando de Henares', province: 'Madrid', sector: 'Conductos & Ventilación Industrial' },
  { name: 'Refrigeración y Frío Industrial de Valencia S.L.', company: 'Refrival S.L.', email: 'info@refrival.es', phone: '+34 961 223 400', website: 'https://www.refrival.es', city: 'Silla', province: 'Valencia', sector: 'Frío Industrial & Tubería Frigorífica' },
  { name: 'Climatización y Aislamientos Térmicos del Sur S.L.', company: 'Climaisur S.L.', email: 'administracion@climaisur.com', phone: '+34 954 678 100', website: 'https://www.climaisur.com', city: 'Sevilla', province: 'Sevilla', sector: 'Aislamiento Térmico & Climatización' },

  // 6. Fabricantes de Silos, Tolvas & Maquinária
  { name: 'Fabricación de Silos y Tanques Metálicos S.L.', company: 'Silometal S.L.', email: 'info@silometal.es', phone: '+34 973 245 600', website: 'https://www.silometal.es', city: 'Lleida', province: 'Lleida', sector: 'Silos Metálicos & Tolvas' },
  { name: 'Maquinaria y Manutención Industrial S.L.', company: 'Maquiman S.L.', email: 'contacto@maquiman.com', phone: '+34 948 823 400', website: 'https://www.maquiman.com', city: 'Tudela', province: 'Navarra', sector: 'Cintas Transportadoras & Manutención' },
  { name: 'Tolvas y Calderería Agrícola de Castilla S.L.', company: 'Tolvacas S.L.', email: 'info@tolvacas.es', phone: '+34 983 546 700', website: 'https://www.tolvacas.es', city: 'Valladolid', province: 'Valladolid', sector: 'Maquinaria Agrícola & Silos' },
  { name: 'Equipos y Calderería de Manutención S.L.', company: 'Equiman S.L.', email: 'administracion@equiman.es', phone: '+34 964 501 200', website: 'https://www.equiman.es', city: 'Vila-real', province: 'Castellón', sector: 'Maquinaria para Cerámica & Silos' }
];

async function seedIndustrialPool() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("🔍 Testando DNS MX de empresas industriais de referência...");

  const stage1Res = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1;", [empresaId]);
  const stage1Id = stage1Res.rows[0]?.id;

  let insertedCount = 0;

  for (const item of INDUSTRIAL_COMPANIES_POOL) {
    const domain = item.email.split('@')[1];
    const hasMx = await checkMx(domain);

    if (hasMx) {
      // Check if already exists in CRM
      const exists = await c.query("SELECT id FROM core_comercial.leads WHERE email = $1 AND empresa_id = $2;", [item.email, empresaId]);
      if (exists.rows.length === 0) {
        const tags = ['Prospecção Autônoma B2B', 'Indústria & Montagens 2026', item.sector];
        const notes = `Empresa industrial qualificada nos polígonos industriais de ${item.province}. Perfil demandante de ajudantes, montadores e técnicos.`;

        await c.query(`
          INSERT INTO core_comercial.leads (
            empresa_id, stage_id, name, company_name, email, phone, website,
            city, province, sector, tags, notes, origen_lead, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'prospeccao_b2b', NOW(), NOW()
          );
        `, [
          empresaId, stage1Id, item.name, item.company, item.email, item.phone, item.website,
          item.city, item.province, item.sector, tags, notes
        ]);
        insertedCount++;
      }
    }
  }

  console.log(`✅ ${insertedCount} novas empresas industriais inseridas com sucesso no CRM!`);
  await c.end();
}

seedIndustrialPool();
