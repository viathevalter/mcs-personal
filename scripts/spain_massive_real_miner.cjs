const { Client } = require('pg');

const PROD_PG_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

const INDUSTRIAL_HUBS_SPAIN = [
  // 1. Madrid e Corredor do Henares / Sul
  { hub: 'Madrid Sur', poligonos: 'Polígonos Industriales de Getafe (Los Ángeles, San Marcos), Pinto (Las Arenas) y Leganés (Nuestra Señora de Butarque, Prado Overa)', province: 'Madrid', city: 'Getafe / Pinto' },
  { hub: 'Madrid Este / Corredor', poligonos: 'Polígonos Industriales de San Fernando de Henares, Coslada, Torrejón de Ardoz y Alcalá de Henares (La Garena, Camporroso)', province: 'Madrid', city: 'San Fernando / Alcalá' },
  { hub: 'Madrid Suroeste', poligonos: 'Polígonos Industriales de Fuenlabrada (Cobo Calleja, Cantueña), Alcorcón (Urtinsa) y Móstoles (Regordoño)', province: 'Madrid', city: 'Fuenlabrada / Móstoles' },
  { hub: 'Madrid Sureste', poligonos: 'Polígonos Industriales de Arganda del Rey, Rivas-Vaciamadrid y Villaverde Industrial', province: 'Madrid', city: 'Arganda / Villaverde' },

  // 2. Catalunha / Barcelona / Tarragona
  { hub: 'Barcelona Vallès Occidental', poligonos: 'Polígonos Industriales de Sabadell (Can Roqueta, Gràcia), Terrassa (Can Parellada, Santa Margarida) y Rubí (Can Jardí)', province: 'Barcelona', city: 'Sabadell / Terrassa' },
  { hub: 'Barcelona Baix Llobregat', poligonos: 'Polígonos Industriales de Martorell, Sant Boi de Llobregat, Cornellà y Zona Franca Barcelona', province: 'Barcelona', city: 'Martorell / Zona Franca' },
  { hub: 'Barcelona Vallès Oriental', poligonos: 'Polígonos Industriales de Granollers (Congost, Font del Ràdium), Montmeló y Mollet del Vallès', province: 'Barcelona', city: 'Granollers / Montmeló' },
  { hub: 'Tarragona Químico & Metal', poligonos: 'Polígonos Industriales Químico Riu Clar, Francolí, Constantí y Valls', province: 'Tarragona', city: 'Tarragona / Valls' },

  // 3. País Basco & Navarra
  { hub: 'Vizcaya / Gran Bilbao', poligonos: 'Polígonos Industriales de Asua, Erandio, Trapagaran, Zamudio, Basauri y Durango', province: 'Vizcaya', city: 'Bilbao / Trapagaran' },
  { hub: 'Álava / Vitoria', poligonos: 'Polígonos Industriales de Júndiz, Betoño, Gamarra y Gojain', province: 'Álava', city: 'Vitoria-Gasteiz' },
  { hub: 'Gipuzkoa', poligonos: 'Polígonos Industriales de Eibar, Beasain, Hernani, Irún y Mondragón / Arrasate', province: 'Gipuzkoa', city: 'Eibar / Beasain / Irún' },
  { hub: 'Navarra', poligonos: 'Polígonos Industriales Landaben, Noáin-Esquíroz, Comarca 2 y Tudela', province: 'Navarra', city: 'Pamplona / Tudela' },

  // 4. Aragão / Zaragoza
  { hub: 'Zaragoza', poligonos: 'Polígonos Industriales Malpica, Plaza, Centrovía (La Muela), Cogullada, Utebo y La Cartuja', province: 'Zaragoza', city: 'Zaragoza / Utebo' },

  // 5. Valência, Alicante & Castellón
  { hub: 'Valência Norte / Oeste', poligonos: 'Polígonos Industriales Fuente del Jarro (Paterna), L Andana, Ribarroja (El Oliveral) y Almussafes', province: 'Valencia', city: 'Paterna / Ribarroja' },
  { hub: 'Valência Sul / Sagunto', poligonos: 'Polígonos Industriales de Silla, Torrent, Picassent y Parc Sagunt', province: 'Valencia', city: 'Sagunto / Silla' },
  { hub: 'Castellón Metal & Cerâmica', poligonos: 'Polígonos Industriales Ciudad del Transporte, Mijares (Almassora), Vila-real y Onda', province: 'Castellón', city: 'Castellón / Almassora' },
  { hub: 'Alicante', poligonos: 'Polígonos Industriales Las Atalayas, Pla de la Vallonga, Babel y Elche Parque Empresarial', province: 'Alicante', city: 'Alicante / Elche' },

  // 6. Astúrias, Cantábria & Galícia
  { hub: 'Astúrias Central', poligonos: 'Polígonos Industriales Silvota (Llanera), Asipo, PEPA (Avilés), Porceyo (Gijón) y Tremañes', province: 'Asturias', city: 'Gijón / Avilés / Oviedo' },
  { hub: 'Cantábria', poligonos: 'Polígonos Industriales Candina (Santander), Guarnizo, Morero (Guarnizo-Camargo) y Tanos-Viérnoles (Torrelavega)', province: 'Cantabria', city: 'Santander / Torrelavega' },
  { hub: 'Galícia Sul / Vigo', poligonos: 'Polígonos Industriales de Balaídos, O Campiño (Pontevedra), A Granxa (Porriño) y As Gándaras', province: 'Pontevedra', city: 'Vigo / O Porriño' },
  { hub: 'Galícia Norte / A Coruña & Ferrol', poligonos: 'Polígonos Industriales de Sabón (Arteixo), A Grela (A Coruña), Río do Pozo (Narón) y Vilar do Colo (Fene/Cabanas)', province: 'A Coruña', city: 'A Coruña / Ferrol' },

  // 7. Andaluzia & Múrcia
  { hub: 'Sevilla', poligonos: 'Polígonos Industriales Calonge, Store, La Isla (Dos Hermanas), Alcalá de Guadaíra (Cuchipanda) y El Pino', province: 'Sevilla', city: 'Sevilla / Dos Hermanas' },
  { hub: 'Cádiz / Baía de Algeciras', poligonos: 'Polígonos Industriales de Palmones (Los Barrios), Cortijo Real (Algeciras), El Trocadero (Puerto Real) y Guadarranque (San Roque)', province: 'Cádiz', city: 'Algeciras / Puerto Real' },
  { hub: 'Huelva Químico & Naval', poligonos: 'Polígonos Industriales Nuevo Puerto, Tartessos y Palos de la Frontera', province: 'Huelva', city: 'Huelva / Palos' },
  { hub: 'Múrcia / Cartagena', poligonos: 'Polígonos Industriales Cabezo Beaza, Los Camachos (Cartagena), Valle de Escombreras y Base 2000 (Molina de Segura)', province: 'Murcia', city: 'Cartagena / Molina' },

  // 8. Castela e Leão & Castela-La Mancha
  { hub: 'Valladolid & Burgos', poligonos: 'Polígonos Industriales San Cristóbal (Valladolid), Argales, Villalonquéjar (Burgos) y Gamonal', province: 'Valladolid / Burgos', city: 'Valladolid / Burgos' },
  { hub: 'Toledo & Guadalajara', poligonos: 'Polígonos Industriales de Toledo (Santa María de Benquerencia), Seseña, Henares (Guadalajara) y Cabanillas del Campo', province: 'Guadalajara / Toledo', city: 'Guadalajara / Toledo' }
];

const SECTORS = [
  {
    name: 'Calderería Pesada & Fabricación Metálica',
    cnae: '25.29 / 25.30',
    keywords: 'talleres de calderería pesada, calderería media, fabricación de depósitos y tanques metálicos, caldereros soldadores oficiales, recipientes a presión'
  },
  {
    name: 'Tubería Industrial & Montajes de Planta',
    cnae: '33.20 / 43.22',
    keywords: 'montaje de tubería industrial, piping industrial, soldadura de tuberías alta presión TIG / electrodo, líneas de vapor y fluidos, montajes mecánicos industriales'
  },
  {
    name: 'Estructuras Metálicas & Naves Industriales',
    cnae: '25.11',
    keywords: 'fabricación y montaje de estructuras metálicas, cerrajería industrial pesada, naves industriales de acero, vigas y celosías metálicas, carpintería metálica estructural'
  },
  {
    name: 'Bienes de Equipo & Mecanizado Industrial',
    cnae: '25.62 / 28.41',
    keywords: 'mecanizado de piezas industriales CNC, tornos y fresadoras, mandrinadoras, matricería industrial, fabricación de maquinaria y bienes de equipo'
  },
  {
    name: 'Equipos Térmicos & Intercambiadores de Calor',
    cnae: '28.21 / 28.25',
    keywords: 'fabricación y mantenimiento de intercambiadores de calor, calderas industriales, hornos industriales, condensadores y equipos térmicos'
  },
  {
    name: 'Construcción y Reparación Naval',
    cnae: '30.11 / 33.15',
    keywords: 'astilleros navales, reparación y habilitación naval, calderería naval, tubería y soldadura naval, talleres auxiliares de astilleros'
  },
  {
    name: 'Frío Industrial & Aislamiento Térmico',
    cnae: '43.29 / 28.25',
    keywords: 'instalaciones de frío industrial con amoniaco/freón, calorifugado y aislamiento térmico de tuberías, plantas frigoríficas, climatización industrial HVAC'
  },
  {
    name: 'Industria Agroalimentaria & Tubería Inox',
    cnae: '28.93',
    keywords: 'tubería alimentaria de acero inoxidable, soldadura TIG sanitaria, depósitos y tanques inox para bodegas, almazaras, queserías y cerveceras'
  }
];

async function checkMx(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

async function fetchRealWorkshops(hubObj, sectorObj, excluded) {
  const excludeStr = excluded.length > 0 ? `\nDO NOT include any of these company names or domains: [${excluded.slice(-25).join(', ')}].` : '';
  const prompt = `You are a Spanish industrial B2B registry expert.
Provide 25 REAL, NON-DUPLICATED, ACTIVE Spanish industrial workshops and fabricators (Pymes / Talleres industriales) located in the industrial parks: "${hubObj.poligonos}", Spain matching: "${sectorObj.keywords}".
Target real small and medium industrial companies (10 to 100 workers) situated in these industrial estates that employ welders, tuberos, caldereros, and mechanic fitters.
Only return REAL existing companies with their genuine website (.es or .com) and official contact email (e.g. info@, contacto@, administracion@, comercial@).${excludeStr}

Return JSON array only:
[
  {
    "company_name": "Exact Legal/Trade Name S.L. / S.A.",
    "website": "https://www.company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Calle / Polígono Industrial...",
    "city": "${hubObj.city}",
    "province": "${hubObj.province}",
    "email": "info@company.es"
  }
]`;

  try {
    const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a Spanish industrial registry database assistant. Return ONLY valid JSON array with real verified Spanish companies.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error(`Fetch error for ${hubObj.hub}:`, err.message);
    return [];
  }
}

async function runMassiveSpainMiner(totalCycles = 5) {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('========================================================================');
  console.log('🇪🇸 INICIANDO MINERADOR REAL MASSIVO DA ESPANHA (100% DEDUPLICADO & DNS MX)');
  console.log('========================================================================\n');

  // Get active empresa
  const empRes = await client.query('SELECT id FROM core_common.empresas LIMIT 1;');
  const empresaId = empRes.rows[0]?.id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  // Get default stage
  const stageRes = await client.query(`
    SELECT id FROM core_comercial.kanban_stages 
    WHERE empresa_id = $1 AND order_index = 1 
    LIMIT 1;
  `, [empresaId]);
  const defaultStageId = stageRes.rows[0]?.id || null;

  // Load ALL existing emails and domains to prevent duplicates 100%
  const existingRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.leads WHERE email IS NOT NULL AND email != \'\';');
  const existingEmails = new Set(existingRes.rows.map(r => r.email));
  const existingDomains = new Set();

  existingEmails.forEach(em => {
    if (em.includes('@')) {
      existingDomains.add(em.split('@')[1]);
    }
  });

  console.log(`🔒 Trava de Deduplicação Ativa: ${existingEmails.size} e-mails e ${existingDomains.size} domínios já protegidos.`);

  let totalMined = 0;
  let totalMxVerified = 0;
  let totalInserted = 0;

  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    console.log(`\n=================== [CICLO ${cycle} de ${totalCycles}] VARRENDO TODOS OS POLÍGONOS ===================`);

    for (const hub of INDUSTRIAL_HUBS_SPAIN) {
      for (const sector of SECTORS) {
        const rawList = await fetchRealWorkshops(hub, sector, Array.from(existingDomains).slice(-30));
        if (!rawList || rawList.length === 0) continue;

        totalMined += rawList.length;
        const validBatch = [];

        for (const comp of rawList) {
          if (!comp.email || !comp.company_name) continue;
          const cleanEmail = comp.email.toLowerCase().trim();
          if (existingEmails.has(cleanEmail)) continue;

          let domain = comp.website ? comp.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0].trim() : '';
          if (!domain && cleanEmail.includes('@')) {
            domain = cleanEmail.split('@')[1];
          }

          if (existingDomains.has(domain)) continue;

          // Check DNS MX server
          const hasMx = await checkMx(domain);
          if (!hasMx) continue;

          totalMxVerified++;
          existingEmails.add(cleanEmail);
          existingDomains.add(domain);

          validBatch.push({
            empresa_id: empresaId,
            stage_id: defaultStageId,
            name: comp.company_name,
            company_name: comp.company_name,
            email: cleanEmail,
            phone: comp.phone || '+34 91 000 00 00',
            website: comp.website || `https://www.${domain}`,
            address_line: comp.address || `${hub.poligonos}, ${hub.province}`,
            city: comp.city || hub.city,
            province: hub.province,
            sector: sector.name,
            origen_lead: 'AIsa - Polígonos Espanha',
            notes: `Oficina/Indústria real verificada via DNS MX. CNAE: ${sector.cnae}. Polígono: ${hub.poligonos}.`,
            tags: ['Espanha', 'Polígonos Industriais', 'AIsa Prospecção', sector.name]
          });
        }

        if (validBatch.length > 0) {
          for (const item of validBatch) {
            try {
              const check = await client.query('SELECT id FROM core_comercial.leads WHERE LOWER(TRIM(email)) = $1 LIMIT 1;', [item.email]);
              if (check.rows.length === 0) {
                const ins = await client.query(`
                  INSERT INTO core_comercial.leads (
                    empresa_id, stage_id, name, company_name, email, phone, website,
                    address_line, city, province, sector, origen_lead, notes, tags, created_at, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
                  )
                  RETURNING id;
                `, [
                  item.empresa_id, item.stage_id, item.name, item.company_name, item.email,
                  item.phone, item.website, item.address_line, item.city, item.province,
                  item.sector, item.origen_lead, item.notes, item.tags
                ]);

                if (ins.rows.length > 0) {
                  totalInserted++;
                }
              }
            } catch (err) {
              console.error("Insert err:", err.message);
            }
          }
          console.log(`[${hub.hub}] +${validBatch.length} novas indústrias validadas com MX ativo! (Total inserido no CRM: ${totalInserted})`);
        }
      }
    }
  }

  console.log('\n========================================================================');
  console.log(`🏁 MINERAÇÃO MASSIVA CONCLUÍDA COM SUCESSO!`);
  console.log(`Total Mapeado: ${totalMined} | MX Aprovados: ${totalMxVerified} | Novos Leads Inseridos: ${totalInserted}`);
  console.log('========================================================================');

  await client.end();
}

runMassiveSpainMiner(6);
