const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const CNAE_PATTERNS = [
  {
    code: '2529',
    title: 'Fabricación de otros depósitos, cisternas y recipientes de metal',
    subsector: 'Calderería Pesada & Recipientes a Presión',
    regex: /(calderer|caldereria|caldeiraria|deposito|cisterna|tanque|presion|recipiente|autoclave|boiler)/i
  },
  {
    code: '3320',
    title: 'Instalación de máquinas y equipos industriales (Piping & Montajes)',
    subsector: 'Tubería Industrial, Piping & Montajes Mecánicos',
    regex: /(tuberia|piping|tuberias|montaje|montajes|instalacion|instalaciones|valvula|oleoducto|gasoducto)/i
  },
  {
    code: '2511',
    title: 'Fabricación de estructuras metálicas y sus componentes',
    subsector: 'Estructuras Metálicas, Naves & Cerrajería Pesada',
    regex: /(estructura|estructuras|metalica|metalicas|metalic|cerrajeria|vigas|cubiertas|naves|carpinteria metalica)/i
  },
  {
    code: '2893',
    title: 'Fabricación de maquinaria para la industria de la alimentación, bebidas y tabaco',
    subsector: 'Industria Agroalimentaria, Bodegas & Tubería Inox',
    regex: /(inox|inoxidable|alvinox|teinoxma|alimentar|bodega|cerveza|lactea|farmaceutica|vitivinicola)/i
  },
  {
    code: '2562',
    title: 'Ingeniería mecánica por cuenta de terceros (Mecanizado CNC & Tornería)',
    subsector: 'Mecanizado Industrial CNC, Tornería & Matricería',
    regex: /(mecanizado|mecanizados|torno|torneria|fresado|corte laser|plasma|matriceria|decolaje)/i
  },
  {
    code: '2825',
    title: 'Fabricación de maquinaria de ventilación y refrigeración no doméstica',
    subsector: 'Intercambiadores de Calor, Calderas & Frío Industrial',
    regex: /(calor|intercambiador|clima|climatizacion|frio industrial|refrigeracion|quemador|ventilacion|termica)/i
  },
  {
    code: '3011',
    title: 'Construcción y reparación de barcos y estructuras flotantes',
    subsector: 'Construcción & Reparación Naval / Astilleros',
    regex: /(naval|astillero|barco|buque|maritimo|puerto|varadero|astilleros)/i
  },
  {
    code: '4329',
    title: 'Otras instalaciones en obras de construcción (Aislamiento & Calorifugado)',
    subsector: 'Aislamiento Térmico, Calorifugado & Acústico',
    regex: /(calorifugado|aislamiento|termico|acustico|ignifugado|lana de roca)/i
  },
  {
    code: '2599',
    title: 'Fabricación de otros productos metálicos n.c.o.p.',
    subsector: 'Metalurgia & Calderería Ligera Auxiliar',
    regex: /(metal|metalurgica|talleres|transformados metalicos|calderas)/i
  }
];

async function runDeterministicAnalysis() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    const res = await client.query(`
      SELECT id, cod_cliente, nombre_comercial, razon_social, cif_dni, domicilio, pais, email_envio_factura, comentarios
      FROM public.clientes
      ORDER BY id ASC;
    `);

    const clients = res.rows;
    console.log(`Total de clientes analisados: ${clients.length}\n`);

    const cnaeStats = {};
    for (const pat of CNAE_PATTERNS) {
      cnaeStats[pat.code] = {
        code: pat.code,
        title: pat.title,
        subsector: pat.subsector,
        clients: []
      };
    }
    cnaeStats['Outros'] = {
      code: 'Outros / Serviços',
      title: 'Engenharia Geral, Construção Civil & Prestadores de Serviços',
      subsector: 'Engenharia & Montagens Diversas',
      clients: []
    };

    for (const c of clients) {
      const fullText = `${c.nombre_comercial || ''} ${c.razon_social || ''} ${c.domicilio || ''} ${c.comentarios || ''}`;
      let matched = false;

      for (const pat of CNAE_PATTERNS) {
        if (pat.regex.test(fullText)) {
          cnaeStats[pat.code].clients.push(c.razon_social || c.nombre_comercial || c.cod_cliente);
          matched = true;
          break;
        }
      }

      if (!matched) {
        cnaeStats['Outros'].clients.push(c.razon_social || c.nombre_comercial || c.cod_cliente);
      }
    }

    const sorted = Object.values(cnaeStats).sort((a, b) => b.clients.length - a.clients.length);

    console.log('========================================================================================');
    console.log('🏆 MAPA DOS PRINCIPAIS CNAEs DA SUA CARTEIRA ATUAL DE CLIENTES (350 EMPRESAS)');
    console.log('========================================================================================\n');

    console.table(sorted.map(s => ({
      'CNAE': s.code,
      'Sub-Setor Industrial': s.subsector,
      'Qtd Clientes Ativos': s.clients.length,
      '% da Sua Carteira': `${((s.clients.length / clients.length) * 100).toFixed(1)}%`,
      'Exemplos Reais': s.clients.slice(0, 3).join(' | ')
    })));

  } finally {
    await client.end();
  }
}

runDeterministicAnalysis();
