export type PlaybookLang = 'es' | 'fr' | 'it';

export interface PlaybookSpecialtyProfile {
  id: string;
  emoji: string;
  badgeColor: string;
  imageUrl: string;
  title: string;
  shortDesc: string;
  badExample: string;
  goodExample: string;
  questions: string[];
  criticalRule: string;
}

export interface PlaybookCommonField {
  label: string;
  question: string;
  icon: string;
}

export interface PlaybookPillarRule {
  id: string;
  emoji: string;
  title: string;
  highlight: string;
  bullets: string[];
  colorClass: string;
}

export interface PlaybookContent {
  lang: PlaybookLang;
  dailyGoalBadge: string;
  corePrinciple: string;
  openingVariants: {
    gatekeeperTitle: string;
    gatekeeperPitch: string;
    decisorTitle: string;
    decisorNote: string;
    videoCallTitle: string;
    videoCallPitch: string;
  };
  workflowPhases: {
    step: string;
    title: string;
    items: string[];
    color: string;
  }[];
  commonProjectFields: PlaybookCommonField[];
  specialties: PlaybookSpecialtyProfile[];
  pillarRules: PlaybookPillarRule[];
  orderContacts: { role: string; detail: string }[];
  finalChecklist: string[];
  postSaleScripts: {
    firstDayTitle: string;
    firstDayDesc: string;
    monthlyTitle: string;
    monthlyScript: string;
    substitutionTitle: string;
    substitutionScript: string;
    transferTitle: string;
    transferScript: string;
  };
}

export function resolveScriptPlaybookLang(sector?: string | null, title?: string | null, fallbackLang?: string): PlaybookLang {
  const s = `${sector || ''} ${title || ''}`.toLowerCase();
  if (s.includes('_fr') || s.includes('franc') || s.includes('fatumata') || s.includes('chaudronnerie')) {
    return 'fr';
  }
  if (s.includes('_it') || s.includes('italia') || s.includes('giada') || s.includes('carpenteria')) {
    return 'it';
  }
  if (s.includes('_es') || s.includes('espa') || s.includes('alex') || s.includes('alba') || s.includes('liseth') || s.includes('ayslan')) {
    return 'es';
  }
  if (fallbackLang === 'fr') return 'fr';
  if (fallbackLang === 'it') return 'it';
  return 'es';
}

export const COMMERCIAL_PLAYBOOK_BY_LANG: Record<PlaybookLang, PlaybookContent> = {
  es: {
    lang: 'es',
    dailyGoalBadge: 'Meta: 20–30 llamadas cualificadas / día',
    corePrinciple: 'El nombre del oficio NO es una especificación. Sin datos técnicos completos y currículos aprobados por el cliente, NO se libera ningún pedido.',
    openingVariants: {
      gatekeeperTitle: '1. Recepción / Filtro Inicial (Pasar al Decisor)',
      gatekeeperPitch:
        'Buenos días, le llamo del área técnica industrial respecto al refuerzo de operarios cualificados (soldadores homologados, tuberos, caldereros y mecanizado CNC) para {empresa}. ¿Me podría comunicar un momento con el responsable de Producción, Jefe de Taller o Compras Técnicas, por favor?',
      decisorTitle: '2. Conversación Directa con el Decisor ({contato})',
      decisorNote:
        'Objetivo en 15 segundos: identificar si trabajan proyectos industriales, tienen picos de producción/montaje y quién valida subcontratas y presupuestos.',
      videoCallTitle: '3. Cliente con Dudas → Ofrecer Videollamada Breve (Solo si aporta valor)',
      videoCallPitch:
        'Si te quedan dudas sobre nuestro modelo operativo, podemos organizar una breve videollamada de 10 minutos para explicarte cómo seleccionamos a los profesionales, verificamos su experiencia práctica y organizamos alojamiento, transporte y PRL.',
    },
    workflowPhases: [
      {
        step: '01 · CAPTACIÓN',
        title: 'Prospección Cualificada',
        items: [
          'Validar Actividad, Capacidad, Viabilidad y Decisor',
          'Llamar y registrar cada resultado en Power Dialer',
          'Enviar Dossier / Presentación personalizada si ayuda',
        ],
        color: 'blue',
      },
      {
        step: '02 · CONVERSIÓN',
        title: 'Pedido Definido & CVs',
        items: [
          'Recoger requisitos técnicos exactos por cada oficio',
          'Negociar tarifa (diurno / nocturno +1,50 €/h) y contrato',
          'Enviar CVs (respuesta 24h / máx. 48h) y obtener aprobación',
        ],
        color: 'amber',
      },
      {
        step: '03 · INICIO Y CONTROL',
        title: 'Acompañamiento & Fidelización',
        items: [
          'Llamada obligatoria tras las primeras 5–6 horas en obra',
          'Presentar Coordinación al cliente (traslados = Coordinación)',
          'Seguimiento comercial mensual + gestión de sustituciones',
        ],
        color: 'emerald',
      },
    ],
    commonProjectFields: [
      {
        icon: '🏢',
        label: 'Cliente, Obra y Decisor',
        question: '¿Para qué proyecto/nave concreta es y quién valida técnicamente los perfiles?',
      },
      {
        icon: '📍',
        label: 'Ubicación y Acceso',
        question: '¿Dirección exacta del centro/obra y condiciones de acceso o aparcamiento?',
      },
      {
        icon: '📅',
        label: 'Inicio y Duración',
        question: '¿Fecha prevista de incorporación, duración estimada y posibles ampliaciones?',
      },
      {
        icon: '👷',
        label: 'Cantidad y Autonomía',
        question: '¿Cuántos operarios por categoría (Oficial 1ª, 2ª, Ayudante) y nivel de autonomía?',
      },
      {
        icon: '🕒',
        label: 'Horarios, Turnos y Rotación',
        question: '¿Horario entrada/salida, horas/día, turno diurno o nocturno (+1,50 €/h) y rotaciones?',
      },
      {
        icon: '⚙️',
        label: 'Trabajo Real a Ejecutar',
        question: '¿Qué tareas reales hará, con qué materiales, espesores, máquinas y acabado exigido?',
      },
      {
        icon: '📐',
        label: 'Planos, Fotos o Vídeos',
        question: '¿Pueden compartir planos, fotos o vídeos de las piezas/estructura para acertar al 100%?',
      },
    ],
    specialties: [
      {
        id: 'soldador',
        emoji: '🔥',
        badgeColor: 'orange',
        imageUrl: '/assets/images/luminous/hero-welder.jpg',
        title: 'Soldadores (TIG / MIG-MAG / Electrodo)',
        shortDesc: 'Proceso, posiciones 1G–6G, materiales, espesores, purga y acabado',
        badExample: '“Necesito 2 soldadores para la semana que viene.”',
        goodExample:
          '“2 Soldadores TIG en tubo de acero inoxidable SCH10 (pared fina), con purga interior de gas, diámetros ½″ a 2½″, posición 6G, acabado sanitario/precisión y prueba práctica.”',
        questions: [
          '¿Qué proceso exacto se exige: TIG, MIG/MAG, hilo tubular, electrodo revestido, arco sumergido u orbital?',
          '¿En qué posiciones de soldadura trabajarán: 1G (plano), 2G, 3G, 4G, 6G (tubería inclinada) u otra?',
          '¿Qué material base y espesores: acero al carbono, inoxidable (¿requiere purga interior?), aluminio, dúplex? ¿Diámetros o espesores en mm/SCH?',
          '¿Es soldadura de tubería a presión (END / radiografía / ultrasonidos) o estructura/calderería?',
          '¿Deben interpretar planos o realizar prueba práctica al llegar? (Pedir fotos de las uniones si es posible).',
        ],
        criticalRule:
          'REGLA HOMOLOGACIONES: Solo plantearlas si el cliente las exige expresamente. Su organización y coste corresponden al cliente (casos excepcionales consultar antes con Dirección Comercial / Coordinación).',
      },
      {
        id: 'tubero',
        emoji: '🔩',
        badgeColor: 'blue',
        imageUrl: '/assets/images/mkt-wise-es-hero.jpg',
        title: 'Tuberos Industriales (Taller / Campo)',
        shortDesc: 'Isométricos, spools, diámetros/SCH, biselado y tipo de unión',
        badExample: '“Mándame un par de tuberos para obra.”',
        goodExample:
          '“2 Tuberos industriales de campo con lectura autónoma de planos isométricos, trazado y armado de spools en inox y carbono Ø 2″ a 8″ SCH40, preparación de biseles y punteo TIG.”',
        questions: [
          '¿Es prefabricación de tubería en taller o montaje/instalación de líneas en campo/planta?',
          '¿Qué materiales, diámetros (pulgadas/DN) y espesores (SCH10, SCH40, SCH80) van a manejar?',
          '¿Las uniones son soldadas, bridadas, roscadas o ranuradas? IMPORTANTE: ¿El tubero solo presenta/puntea o quién suelda?',
          '¿Requiere interpretación autónoma de planos isométricos, cálculo de desarrollos, injertos y soportación?',
          '¿Qué herramientas de corte, biselado, alineación y medios de elevación aporta la obra?',
        ],
        criticalRule:
          'NO CONFUNDIR TUBERO CON SOLDADOR: El tubero mide, traza, corta, bisela, presenta con isométrico y puntea. Confirmar siempre quién ejecuta el cordón final de soldadura.',
      },
      {
        id: 'montador',
        emoji: '🏗️',
        badgeColor: 'indigo',
        imageUrl: '/assets/images/hero-team.jpg',
        title: 'Montadores Industriales / Estructuras',
        shortDesc: 'Naves, bastidores, atornillado/soldado, lectura de planos y alturas',
        badExample: '“Necesitamos 3 montadores metálicos.”',
        goodExample:
          '“3 Montadores de estructura metálica pesada en obra, unión atornillada y punteada según plano, uso de plataforma elevadora PEMP (curso PRL alturas + PEMP en vigor).”',
        questions: [
          '¿Es montaje nuevo, desmontaje, ampliación de nave o mantenimiento industrial? ¿De qué estructuras o equipos?',
          '¿La unión es atornillada (llave de impacto/dinamométrica), soldada o mixta? ¿Necesitan corte con soplete/radial?',
          '¿Qué peso y dimensiones tienen las piezas? ¿Deben interpretar planos de montaje de forma autónoma?',
          '¿Trabajarán en altura? ¿Requieren carnet de plataformas elevadoras (PEMP), puente grúa, carretilla o arnés?',
          '¿Qué herramientas eléctricas, equipos de izado y plataformas aporta el cliente en obra?',
        ],
        criticalRule:
          'SEGURIDAD EN ALTURA: Si hay montaje en cota elevada, confirmar obligatoriamente curso PRL 20h Metal + Trabajos en Altura + PEMP antes de seleccionar currículos.',
      },
      {
        id: 'calderero_fab',
        emoji: '⚙️',
        badgeColor: 'amber',
        imageUrl: '/assets/images/triangulo-tig-welder.png',
        title: 'Caldereros de Fabricación (Taller)',
        shortDesc: 'Depósitos, intercambiadores, trazado, corte, plegado y armado',
        badExample: '“Un calderero oficial de primera.”',
        goodExample:
          '“Calderero de fabricación en taller para depósitos e intercambiadores en inox 6–15 mm: lectura de planos complejos, trazado, cilindrado, armado y punteo TIG (sin soldadura final).”',
        questions: [
          '¿Qué se fabrica exactamente en el taller: depósitos a presión, tolvas, intercambiadores, silos, campanas o bancadas?',
          '¿Qué materiales (carbono, inox, antidesgaste), espesores de chapa y tolerancias críticas manejan?',
          '¿Qué operaciones debe dominar el operario: trazado/desarrollo, corte (plasma/oxicorte/cizalla), plegado, cilindrado, armado y punteo?',
          '¿Tienen planos constructivos o fotos de los equipos que fabrican habitualmente?',
        ],
        criticalRule:
          'REGLA CLAVE CALDERERÍA: El calderero de fabricación lee planos, traza, conforma, arma y SOLO PUNTEA. No asumas que va a realizar la soldadura completa salvo que se pida perfil mixto validado.',
      },
      {
        id: 'calderero_mon',
        emoji: '🔧',
        badgeColor: 'teal',
        imageUrl: '/assets/images/wise-mkt03-despliegue.png',
        title: 'Caldereros de Montaje (Obra / Planta)',
        shortDesc: 'Instalación de conjuntos prefabricados, ajuste, alineación e izado',
        badExample: '“Dos caldereros para parada de planta.”',
        goodExample:
          '“2 Caldereros de montaje para parada industrial: desmontaje y ajuste en obra de conductos y ciclones prefabricados, alineación, punteo y trabajo en espacios confinados.”',
        questions: [
          '¿Es montaje en obra de conjuntos ya fabricados, reforma en planta o parada de mantenimiento?',
          '¿Cómo se ensamblan los equipos: ajuste mecánico, punteo + soldadura, bridas o atornillado?',
          '¿Requiere interpretación de planos de implantación, nivelación/alineación fina o uso de puente grúa?',
          '¿Existen requisitos de espacios confinados, riesgo ATEX o trabajos en altura en la planta?',
        ],
        criticalRule:
          'DIFERENCIAR TALLER VS OBRA: Muchos excelentes caldereros de taller no trabajan en parada de planta (espacios confinados/alturas) y viceversa. Confirmar siempre el entorno real.',
      },
      {
        id: 'cnc',
        emoji: '🖥️',
        badgeColor: 'purple',
        imageUrl: '/assets/images/wise-mkt02-dossier.png',
        title: 'Torneros & Fresadores (CNC / Convencional)',
        shortDesc: 'Control Fanuc/Siemens/Mazak/Heidenhain, preparar vs programar',
        badExample: '“Busco un tornero fresador CNC.”',
        goodExample:
          '“Tornero CNC con control Fanuc para series cortas en acero e inox (Ø hasta 400 mm): debe preparar máquina, corregir desgastes/herramientas y ajustar programa a pie de máquina.”',
        questions: [
          '¿Es torno paralelo/fresadora convencional, torno CNC, centro de mecanizado (3, 4 o 5 ejes) o mandrinadora?',
          '¿Qué lenguaje/control utiliza la máquina exactamente: Fanuc, Siemens, Heidenhain, Fagor, Mazak u otro?',
          '¿Cuáles son las dimensiones máximas de las piezas, materiales (acero, inox, aluminio, bronce, plásticos técnicos) y tolerancias (centesimales/milesimales)?',
          'PREGUNTA OBLIGATORIA: ¿Debe PROGRAMAR desde cero a pie de máquina, PREPARAR herramientas/cero pieza, o SOLO OPERAR (cargar pieza, medir con micrómetro/calibre y corregir)?',
        ],
        criticalRule:
          'ACLARACIÓN CRÍTICA MECANIZADO: La diferencia entre un “Operador CNC” (carga y mide) y un “Programador/Preparador CNC” cambia totalmente el perfil y la tarifa. Confirmarlo siempre por escrito.',
      },
      {
        id: 'electricista',
        emoji: '⚡',
        badgeColor: 'yellow',
        imageUrl: '/assets/images/genio/hero_empresas.png',
        title: 'Electricistas Industriales (BT / MT / AT)',
        shortDesc: 'Tensión exacta (<1kV, 1–36kV, >36kV), cuadros, bandeja, motores y PLC',
        badExample: '“Dos electricistas industriales para fábrica.”',
        goodExample:
          '“2 Electricistas industriales de Baja Tensión (<1 kV) para tendido de bandeja Rejiband, cableado de fuerza y maniobra, conexionado de armarios eléctricos y lectura de esquemas EPLAN.”',
        questions: [
          '¿Es Baja Tensión (<1 kV), Media Tensión (1–36 kV) o Alta Tensión (>36 kV)? Confirmar rango exacto y habilitación exigida.',
          '¿Qué trabajo predomina: montaje de bandeja/tubo conduit, tirada de manguera de potencia, montaje de cuadros/armarios, instrumentación o PLC?',
          '¿Es obra nueva industrial, mantenimiento de fábrica, conexionado de maquinaria o puesta en marcha?',
          '¿Deben interpretar esquemas eléctricos unifilares y multifilares de forma autónoma?',
        ],
        criticalRule:
          'NORMATIVA Y TENSIÓN: Nunca enviar un electricista sin confirmar la tensión efectiva (<1kV / 1-36kV / >36kV) y los cursos obligatorios (Riesgo Eléctrico / Alta Tensión / PRL).',
      },
      {
        id: 'pintor',
        emoji: '🎨',
        badgeColor: 'rose',
        imageUrl: '/assets/images/luminous/worker-helmet-luminous.jpg',
        title: 'Pintores Industriales & Chorreadores',
        shortDesc: 'Airless/pistola/polvo, epoxi/poliuretano/ignífuga, granallado y micras',
        badExample: '“Un pintor industrial.”',
        goodExample:
          '“Pintor industrial con equipo Airless para estructura metálica: aplicación de imprimación epoxi bicomponente y acabado poliuretano con control de espesor en micras y preparación previa con granallado.”',
        questions: [
          '¿Qué método de aplicación utilizan: equipo Airless, pistola aerográfica/electrostática, pintura en polvo al horno o brocha/rodillo?',
          '¿Qué tipo de pintura: epoxi bicomponente, poliuretano, intumescente/ignífuga, esmalte sintético o anticorrosiva marina?',
          '¿Sobre qué superficies: estructura metálica, depósitos interiores/exteriores, tuberías o carrocería/maquinaria?',
          '¿Incluye preparación previa (granallado, chorro de arena, lijado mecánico) y control de espesor de capa (micras)?',
        ],
        criticalRule:
          'EPIS ESPECÍFICOS PINTURA: Máscaras con filtro de vapores orgánicos/ventilación asistida, buzos químicos o equipos especiales deben confirmarse y ser aportados por el cliente.',
      },
      {
        id: 'mecanico',
        emoji: '🏭',
        badgeColor: 'emerald',
        imageUrl: '/assets/images/wise-mkt01-hero.png',
        title: 'Mecánicos & Electromecánicos Industriales',
        shortDesc: 'Maquinaria pesada, bombas, reductores, cintas, alineación y mantenimiento',
        badExample: '“Un mecánico de mantenimiento.”',
        goodExample:
          '“Electromecánico industrial para mantenimiento preventivo y correctivo de líneas de transporte, reductores, rodamientos, neumática/hidráulica y diagnosis básica de sensores/motores.”',
        questions: [
          '¿Sobre qué maquinaria trabajará: bombas, reductores, turbinas, compresores, prensas, cintas transportadoras o líneas automatizadas?',
          '¿Es montaje mecánico nuevo, alineación de ejes/cojinetes, desmontaje o mantenimiento preventivo/correctivo de averías?',
          'Si es Electromecánico: ¿qué peso real tiene la parte mecánica (70%/30%) frente a la eléctrica/automatismos?',
          '¿Se requieren herramientas especiales (llaves dinamométricas, alineador láser, extractores hidráulicos) y quién las aporta?',
        ],
        criticalRule:
          'EQUILIBRIO MECÁNICA / ELÉCTRICA: En perfiles electromecánicos, detallar siempre qué averías eléctricas o mecánicas concretas debe resolver solo.',
      },
      {
        id: 'ayudante',
        emoji: '👷',
        badgeColor: 'slate',
        imageUrl: '/assets/images/mkt-triangulo-es-hero.jpg',
        title: 'Ayudantes Especialistas & Otros Perfiles',
        shortDesc: 'Tareas concretas de apoyo, manejo de radial/taladro, PRL y supervisión',
        badExample: '“Un par de peones para ayudar en taller.”',
        goodExample:
          '“2 Ayudantes adelantados de taller metalúrgico para rebarbado con radial, taladro de columna, limpieza de soldaduras, orden de material y apoyo directo a oficiales caldereros, con PRL 20h Metal.”',
        questions: [
          '¿Qué tareas concretas ejecutará el ayudante y cuáles quedan estrictamente reservadas a los oficiales?',
          '¿Debe manejar herramientas manuales/eléctricas (radial, amoladora, taladro, tronzadora) o carretilla/puente grúa?',
          '¿Tendrá supervisión directa del encargado del cliente o acompaña a nuestro equipo de oficiales?',
          'Si es un oficio no catalogado: describir todas sus funciones paso a paso y validar antes con Contratación.',
        ],
        criticalRule:
          'PERFIL VERIFICABLE: Aunque sea ayudante, nunca enviar personal sin detallar qué herramientas tocará y qué cursos PRL exige la planta.',
      },
    ],
    pillarRules: [
      {
        id: 'turnos',
        emoji: '🌙',
        title: 'Turnos, Horarios y Nocturnidad',
        highlight: 'Turno Noche: +1,50 €/h norma general',
        bullets: [
          'Ejemplo referencia: 27,00 €/h (diurno) → 28,50 €/h (nocturno) | 30,00 €/h → 31,50 €/h.',
          'Excepción +1,00 €/h: ÚNICAMENTE con autorización previa de Coordinación.',
          'Confirmar hora exacta de entrada/salida, nº de personas por especialidad en cada turno y si hay rotación semanal.',
        ],
        colorClass: 'indigo',
      },
      {
        id: 'epis',
        emoji: '🦺',
        title: 'EPIs, Uniforme y Plataforma CAE',
        highlight: 'Incluimos EPIs básicos estándar',
        bullets: [
          'Suministramos EPI básico habitual: casco, botas de seguridad, chaleco y guantes básicos.',
          'EPIs especiales (ignífugos, antiestáticos, químicos, arnés especial, máscaras respiratorias): deben constar en pedido y ser aportados por el cliente.',
          'Confirmar plataforma documental (CTAIMA, DocuCAE, e-Coordina, Obralia) y contacto PRL.',
        ],
        colorClass: 'amber',
      },
      {
        id: 'cvs',
        emoji: '📄',
        title: 'Currículos (24h/48h) & Bloqueo Operativo',
        highlight: 'PROHIBIDO liberar sin CVs aprobados',
        bullets: [
          'Al enviar CVs, informar que la disponibilidad cambia rápido (no prometer reserva indefinida).',
          'Pedir respuesta el mismo día / 24h; seguimiento activo máximo a las 48h.',
          'Si rechaza un CV: consultar PRIMERO con Contratación. Sin aprobación expresa de CVs, NO se pasa orden de ejecución a Coordinación.',
        ],
        colorClass: 'rose',
      },
      {
        id: 'postventa',
        emoji: '🤝',
        title: 'Seguimiento 5–6h, Mensual y Sustituciones',
        highlight: 'Llamada a las 5–6h + Mensual obligatoria',
        bullets: [
          'Primer día (tras 5–6h de trabajo): Comercial llama al cliente, valida arranque y presenta a Coordinación.',
          'Sustituciones: Comercial da la cara, abre reemplazo en sistema y envía email con Coordinación en CC.',
          'Traslados entre obras: competencia EXCLUSIVA de Coordinación (Comercial recoge datos y deriva sin confirmar).',
        ],
        colorClass: 'emerald',
      },
    ],
    orderContacts: [
      { role: '1. Técnico / Producción', detail: 'Define funciones, herramientas, planos y valida idoneidad técnica y CVs.' },
      { role: '2. PRL / Seguridad', detail: 'Responsable de accesos, cursos PRL, EPIs especiales y plataforma CAE.' },
      { role: '3. Compras / Contratación', detail: 'Aprueba presupuesto, tarifas, contrato mercantil y condiciones.' },
      { role: '4. Financiero / Facturación', detail: 'Condiciones de pago, vencimientos, CIF y recepción de facturas.' },
      { role: '5. Logística / Encargado Obra', detail: 'Contacto del primer día, entrada, turnos, horarios y recepción del equipo.' },
    ],
    finalChecklist: [
      '¿Están descritas profesión, tareas reales y competencias técnicas para CADA perfil por separado?',
      '¿Se han confirmado cantidad, horarios, turnos (diurno/nocturno +1,50€/h), rotaciones, inicio y duración?',
      '¿Están identificados los cursos PRL, EPIs especiales (aportados por cliente), plataforma CAE y los 5 contactos?',
      '¿Se han solicitado planos, fotografías o vídeos de las piezas/obra para evitar errores de selección?',
      '¿El cliente ha aprobado expresamente los currículos y Contratación ha reconfirmado disponibilidad antes de liberar?',
    ],
    postSaleScripts: {
      firstDayTitle: 'Llamada Primer Día (tras 5–6 horas)',
      firstDayDesc:
        '«Hola {contato}, te llamo para comprobar qué tal han arrancado nuestros operarios en estas primeras horas, si la adaptación en taller/obra va según lo previsto y dejarte presentado a nuestro equipo de Coordinación para el día a día operativo.»',
      monthlyTitle: 'Seguimiento Comercial Mensual (Obligatorio)',
      monthlyScript:
        '«¿Qué tal os está funcionando el equipo este mes? Queríamos saber si estáis satisfechos y comentarte que tenemos algunos perfiles cualificados que podrían quedar disponibles pronto. ¿Os vendría bien algún refuerzo? Si te interesa, lo consulto con Contratación y te confirmo.»',
      substitutionTitle: 'Gestión de Sustitución (Correo obligatorio con CC a Coordinación)',
      substitutionScript:
        '«Buenos días, {contato}: Lamentamos la incidencia con el trabajador asignado y las molestias ocasionadas. Ya estamos revisando con Contratación el perfil y, con Coordinación, las circunstancias del trabajo. Te informaremos de la alternativa y de los próximos pasos en cuanto estén validados.»',
      transferTitle: 'Solicitud de Traslado entre Obras (Derivar a Coordinación)',
      transferScript:
        '«Tomo nota de los datos de la nueva ubicación y traslado ahora mismo tu petición a nuestro departamento de Coordinación, que comprobará alojamientos, desplazamientos y PRL y te confirmará directamente cómo proceder.»',
    },
  },

  fr: {
    lang: 'fr',
    dailyGoalBadge: 'Objectif : 20–30 appels qualifiés / jour',
    corePrinciple: 'L’intitulé du poste N’EST PAS une spécification technique. Sans fiche technique complète et CV approuvés par le client, AUCUNE commande n’est lancée.',
    openingVariants: {
      gatekeeperTitle: '1. Standard / Accueil (Joindre le Décideur)',
      gatekeeperPitch:
        'Bonjour, je vous appelle du pôle technique Wiseowe Industrie concernant le renfort d’opérateurs qualifiés (soudeurs certifiés TIG/MIG, tuyauteurs, chaudronniers et usineurs CNC) pour {empresa}. Pourriez-vous me passer le responsable de Production, le Chef d’Atelier ou les Achats Industriels, s’il vous plaît ?',
      decisorTitle: '2. Échange Direct avec le Décideur ({contato})',
      decisorNote:
        'Objectif en 15 secondes : vérifier l’activité industrielle, identifier les pics de charge/chantiers à venir et valider le circuit de décision.',
      videoCallTitle: '3. Client Hésitant → Proposer une Courte Visio (10 min)',
      videoCallPitch:
        'S’il vous reste des questions sur notre fonctionnement, nous pouvons organiser une courte visioconférence de 10 minutes afin de vous montrer comment nous sélectionnons nos compagnons, validons leurs compétences et gérons l’hébergement, le transport et les habilitations.',
    },
    workflowPhases: [
      {
        step: '01 · PROSPECTION',
        title: 'Qualification Ciblée',
        items: [
          'Valider Activité, Capacité, Viabilité et Décideur',
          'Appeler et enregistrer chaque action dans Power Dialer',
          'Envoyer Dossier / Présentation personnalisée M365',
        ],
        color: 'blue',
      },
      {
        step: '02 · CONVERSION',
        title: 'Cahier des Charges & CV',
        items: [
          'Recueillir les prérequis techniques précis par métier',
          'Valider tarif (jour / nuit +1,50 €/h), horaires et contrat',
          'Envoyer les CV (retour 24h / suivi max 48h) + accord écrit',
        ],
        color: 'amber',
      },
      {
        step: '03 · DÉMARRAGE & SUIVI',
        title: 'Contrôle 5–6h & Fidélisation',
        items: [
          'Appel obligatoire après les 5–6 premières heures sur site',
          'Présenter la Coordination (transferts inter-chantiers = Coordination)',
          'Suivi mensuel obligatoire + gestion transparente des remplacements',
        ],
        color: 'emerald',
      },
    ],
    commonProjectFields: [
      {
        icon: '🏢',
        label: 'Client, Chantier & Décideur',
        question: 'Pour quel site/projet précis et qui valide techniquement les profils et CV ?',
      },
      {
        icon: '📍',
        label: 'Adresse & Accès Site',
        question: 'Quelle est l’adresse exacte de l’atelier/chantier et les conditions d’accès ?',
      },
      {
        icon: '📅',
        label: 'Démarrage & Durée',
        question: 'Quelle est la date souhaitée d’intégration, la durée estimée et la visibilité ?',
      },
      {
        icon: '👷',
        label: 'Effectif & Autonomie',
        question: 'Combien de professionnels par métier et quel niveau d’autonomie exigé ?',
      },
      {
        icon: '🕒',
        label: 'Horaires, Postes & Nuit',
        question: 'Heures d’entrée/sortie, poste jour ou nuit (+1,50 €/h) et rotations hebdomadaires ?',
      },
      {
        icon: '⚙️',
        label: 'Travail Réel à Exécuter',
        question: 'Tâches concrètes, matériaux, épaisseurs, machines utilisées et niveau de finition ?',
      },
      {
        icon: '📐',
        label: 'Plans, Photos ou Vidéos',
        question: 'Pouvez-vous nous transmettre des plans, photos ou vidéos des pièces/ouvrages ?',
      },
    ],
    specialties: [
      {
        id: 'soldador',
        emoji: '🔥',
        badgeColor: 'orange',
        imageUrl: '/assets/images/mkt-wise-fr-hero.jpg',
        title: 'Soudeurs Qualifiés (TIG / MIG-MAG / Électrode)',
        shortDesc: 'Procédé, positions 1G–6G, matériaux, épaisseurs, chambrage gaz',
        badExample: '« J’ai besoin de 2 soudeurs pour lundi. »',
        goodExample:
          '« 2 Soudeurs TIG sur tuyauterie inox SCH10 (paroi fine), chambrage gaz intérieur, Ø ½″ à 2½″, toutes positions (6G), finition haute précision et essai pratique. »',
        questions: [
          'Quel procédé exact est exigé : TIG (141), MIG/MAG (135/136), électrode enrobée (111), arc submergé ou orbital ?',
          'Quelles positions de soudage : à plat (PA/1G), corniche (PC/2G), montante (PF/3G), toutes positions tube (HL045/6G) ?',
          'Quels matériaux et épaisseurs : acier carbone, inox (chambrage/purge exigé ?), aluminium ? Quels diamètres/épaisseurs ?',
          'S’agit-il de tuyauterie sous pression (contrôles radio/CND) ou de charpente/chaudronnerie ?',
          'Lecture de plans exigée ou test pratique à l’arrivée ? (Demander photos des pièces si possible).',
        ],
        criticalRule:
          'QUALIFICATIONS / LICENCES (ISO 9606-1) : Ne proposer des homologations spécifiques que si le client les exige. Leur organisation et leur coût sont à la charge du client.',
      },
      {
        id: 'tubero',
        emoji: '🔩',
        badgeColor: 'blue',
        imageUrl: '/assets/images/wise-mkt01-hero.png',
        title: 'Tuyauteurs Industriels (Atelier / Chantier)',
        shortDesc: 'Plans isométriques, spools, DN/SCH, chanfreinage et pointage',
        badExample: '« Envoyez-moi deux tuyauteurs pour chantier. »',
        goodExample:
          '« 2 Tuyauteurs industriels autonomes sur plans isométriques, préfabrication et montage sur site en inox/carbone DN50 à DN200 SCH40, préparation chanfreins et pointage TIG. »',
        questions: [
          'Préfabrication de spools en atelier ou montage/installation de lignes sur site industriel ?',
          'Quels matériaux (inox, carbone, alliages), diamètres (DN / pouces) et épaisseurs (SCH) ?',
          'Assemblages soudés, bridés ou vissés ? IMPORTANT : Le tuyauteur pointe uniquement ou qui réalise la soudure finale ?',
          'Lecture autonome de plans isométriques, prise de côtes, traçage et calculs de débits requis ?',
          'Quels outillages de coupe, chanfreinage et moyens de levage sont fournis sur le chantier ?',
        ],
        criticalRule:
          'NE PAS CONFONDRE TUYAUTEUR ET SOUDEUR : Le tuyauteur lit l’isométrique, coupe, prépare, présente et pointe. Toujours confirmer qui effectue le cordon de soudure.',
      },
      {
        id: 'montador',
        emoji: '🏗️',
        badgeColor: 'indigo',
        imageUrl: '/assets/images/hero-team.jpg',
        title: 'Monteurs Charpente & Équipements Industriels',
        shortDesc: 'Structures métalliques, boulonnage/pointage, plans et travail en hauteur',
        badExample: '« Il nous faut 3 monteurs métalliques. »',
        goodExample:
          '« 3 Monteurs en charpente métallique sur site, assemblage boulonné sur plans, travail en hauteur avec nacelle PEMP (CACES PEMP + port du harnais obligatoires). »',
        questions: [
          'Montage neuf, démontage, extension d’usine ou maintenance ? Sur quel type de structure ou d’équipement ?',
          'Assemblage boulonné (clé à choc / dynamométrique), soudé ou mixte ? Découpe/ajustage nécessaire ?',
          'Dimensions des éléments, lecture de plans de montage et travail en hauteur ?',
          'Quelles habilitations sont requises : travail en hauteur, CACES nacelle (PEMP), pont roulant, chariot ?',
        ],
        criticalRule:
          'SÉCURITÉ & HAUTEUR : Vérifier systématiquement les habilitations hauteur, port du harnais et CACES nacelle avant toute sélection de CV.',
      },
      {
        id: 'calderero_fab',
        emoji: '⚙️',
        badgeColor: 'amber',
        imageUrl: '/assets/images/triangulo-tig-welder.png',
        title: 'Chaudronniers d’Atelier (Fabrication)',
        shortDesc: 'Cuves, échangeurs, traçage, découpe, pliage, roulage et assemblage',
        badExample: '« Un chaudronnier qualifié. »',
        goodExample:
          '« Chaudronnier d’atelier pour fabrication de cuves et trémies inox ép. 6–15 mm : lecture de plans, traçage, pliage/roulage, mise en forme et pointage TIG. »',
        questions: [
          'Que fabriquez-vous exactement : cuves sous pression, échangeurs, trémies, gaines, châssis mécano-soudés ?',
          'Quels matériaux, épaisseurs de tôle et tolérances dimensionnelles critiques ?',
          'Quelles opérations : lecture de plans, traçage, découpe, pliage, roulage, assemblage et pointage ?',
        ],
        criticalRule:
          'RÈGLE CHAUDRONNERIE : Le chaudronnier trace, met en forme, assemble et POINTE uniquement (il ne réalise pas la soudure complète sauf profil mixte validé).',
      },
      {
        id: 'calderero_mon',
        emoji: '🔧',
        badgeColor: 'teal',
        imageUrl: '/assets/images/wise-mkt03-despliegue.png',
        title: 'Chaudronniers de Chantier (Montage Site)',
        shortDesc: 'Pose d’ensembles préfabriqués, ajustage sur site, alignement et arrêt d’unité',
        badExample: '« Deux chaudronniers pour arrêt technique. »',
        goodExample:
          '« 2 Chaudronniers chantier pour arrêt d’usine : démontage et ajustage de gaines et cyclones, alignement, pointage, habilitation espace confiné / ATEX. »',
        questions: [
          'Montage sur site d’ensembles préfabriqués, modification en usine ou arrêt de maintenance ?',
          'Ajustage mécanique, boulonnage ou pointage ? Moyens de levage disponibles ?',
          'Contraintes spécifiques du site : espace confiné, zone ATEX, travail en hauteur, N1/N2 ?',
        ],
        criticalRule:
          'ATELIER VS CHANTIER : Toujours distinguer le chaudronnier de fabrication en atelier du chaudronnier de montage en arrêt industriel.',
      },
      {
        id: 'cnc',
        emoji: '🖥️',
        badgeColor: 'purple',
        imageUrl: '/assets/images/wise-mkt02-dossier.png',
        title: 'Tourneurs & Fraiseurs (CNC / Conventionnel)',
        shortDesc: 'Commande Fanuc/Siemens/Mazak/Heidenhain — Programmer, régler ou opérer ?',
        badExample: '« Je cherche un tourneur-fraiseur CN. »',
        goodExample:
          '« Tourneur CN sur commande Fanuc pour petites séries acier/inox : réglage machine, montage outils, prise d’origine et modification de programme au pied de la machine. »',
        questions: [
          'Tour/fraiseuse conventionnelle ou commande numérique (CNC / centre d’usinage 3, 4 ou 5 axes) ?',
          'Quelle armoire de commande exactement : Fanuc, Siemens, Heidenhain, Mazak, Num ?',
          'Dimensions max des pièces, matériaux usinés (acier, inox, alu, plastiques) et tolérances ?',
          'QUESTION OBLIGATOIRE : Doit-il PROGRAMMER de A à Z, RÉGLER/PRÉPARER la machine et les outils, ou UNIQUEMENT OPÉRER (charger/contrôler) ?',
        ],
        criticalRule:
          'POINT CRITIQUE USINAGE : Confirmer impérativement si le poste exige de la programmation, du réglage complet ou uniquement de la conduite machine.',
      },
      {
        id: 'electricista',
        emoji: '⚡',
        badgeColor: 'yellow',
        imageUrl: '/assets/images/genio/hero_empresas.png',
        title: 'Électriciens Industriels (BT / HTA / HTB)',
        shortDesc: 'Tension (<1kV, 1–36kV, >36kV), chemins de câbles, armoires, moteurs et API/PLC',
        badExample: '« Deux électriciens industriels. »',
        goodExample:
          '« 2 Électriciens industriels Basse Tension (<1 kV) avec habilitations B1V/B2V/BR : pose chemins de câbles, tirage puissance/commande et raccordement d’armoires sur schémas. »',
        questions: [
          'Basse Tension (<1 kV), Moyenne/Haute Tension (1–36 kV ou >36 kV) ? Quelles habilitations électriques exigées (B1V, B2V, BR, H0V...) ?',
          'Chemins de câbles, câblage d’armoires, puissance, instrumentation, moteurs ou automatismes PLC ?',
          'Installation neuve, maintenance industrielle, raccordement machines ou mise en service ?',
        ],
        criticalRule:
          'HABILITATIONS OBLIGATOIRES : Confirmer systématiquement la tension réelle et le titre d’habilitation électrique requis par le client.',
      },
      {
        id: 'pintor',
        emoji: '🎨',
        badgeColor: 'rose',
        imageUrl: '/assets/images/luminous/worker-helmet-luminous.jpg',
        title: 'Peintres Industriels & Sableurs/Grenailleurs',
        shortDesc: 'Airless, pistolet, poudre ; époxy, polyuréthane, ignifuge ; grenaillage',
        badExample: '« Un peintre industriel. »',
        goodExample:
          '« Peintre industriel Airless sur charpente métallique : primaire époxy et finition polyuréthane avec contrôle d’épaisseur (microns) et grenaillage préalable. »',
        questions: [
          'Méthode d’application : Airless, pistolet pneumatique/électrostatique, thermolaquage poudre ou brosse ?',
          'Type de peinture : époxy, polyuréthane, intumescente/ignifuge, anticorrosion (ACQPA) ?',
          'Surfaces (charpente, cuves, tuyauteries) et préparation préalable (grenaillage, sablage) ?',
        ],
        criticalRule:
          'EPI SPÉCIFIQUES PEINTURE : Masques ventilés, combinaisons chimiques et équipements spéciaux doivent être précisés et fournis par le client.',
      },
      {
        id: 'mecanico',
        emoji: '🏭',
        badgeColor: 'emerald',
        imageUrl: '/assets/images/luminous/hero-welder.jpg',
        title: 'Mécaniciens & Électromécaniciens Industriels',
        shortDesc: 'Pompes, réducteurs, turbines, convoyeurs, alignement laser et maintenance',
        badExample: '« Un mécanicien de maintenance. »',
        goodExample:
          '« Électromécanicien industriel pour maintenance préventive/curative sur lignes de convoyage, réducteurs, roulements, pneumatique et diagnostic électrique moteurs/capteurs. »',
        questions: [
          'Sur quels équipements : pompes, réducteurs, turbines, compresseurs, presses, convoyeurs ou robots ?',
          'Montage neuf, alignement laser/roulements, démontage ou maintenance préventive/curative ?',
          'Répartition réelle entre compétences mécaniques, électriques, pneumatiques et hydrauliques ?',
        ],
        criticalRule:
          'OUTILLAGE SPÉCIAL : Préciser qui fournit les clés dynamométriques, extracteurs hydrauliques ou appareils d’alignement laser.',
      },
      {
        id: 'ayudante',
        emoji: '👷',
        badgeColor: 'slate',
        imageUrl: '/assets/images/mkt-triangulo-es-hero.jpg',
        title: 'Aides-Opérateurs & Profils Spécifiques',
        shortDesc: 'Meulage, perçage, manutention, assistance aux compagnons et règles sécurité',
        badExample: '« Deux manœuvres pour l’atelier. »',
        goodExample:
          '« 2 Aides-chaudronniers d’atelier pour meulage/ébavurage, perçage, manutention des pièces et appui direct aux soudeurs/chaudronniers. »',
        questions: [
          'Quelles tâches concrètes seront exécutées par l’aide et lesquelles restent réservées aux compagnons qualifiés ?',
          'Utilisation d’outillage électroportatif (meuleuse, perceuse), pont roulant ou chariot ?',
          'Quel encadrement sur site et quelles formations sécurité obligatoires ?',
        ],
        criticalRule:
          'FICHE DE POSTE CLAIRE : Même pour un profil d’aide, détailler précisément les tâches et habilitations avant recherche.',
      },
    ],
    pillarRules: [
      {
        id: 'turnos',
        emoji: '🌙',
        title: 'Horaires, Postes & Travail de Nuit',
        highlight: 'Poste de Nuit : +1,50 €/h en règle générale',
        bullets: [
          'Référence : ex. 27,00 €/h (jour) → 28,50 €/h (nuit) | 30,00 €/h → 31,50 €/h.',
          'Exception +1,00 €/h : UNIQUEMENT sur validation préalable de la Coordination.',
          'Confirmer horaires exacts, effectif par métier sur chaque poste et rotations hebdomadaires.',
        ],
        colorClass: 'indigo',
      },
      {
        id: 'epis',
        emoji: '🦺',
        title: 'EPI, Tenue & Accès Sécurité',
        highlight: 'EPI standards de base inclus',
        bullets: [
          'Nous fournissons les EPI standards : casque, chaussures de sécurité, gilet et gants standards.',
          'EPI spéciaux (ignifugés, antistatiques, chimiques, masques spécifiques) : à préciser dans la commande et fournis par le client.',
          'Confirmer les formations sécurité (N1/N2, ATEX, hauteur, CACES) et le portail documentaire du site.',
        ],
        colorClass: 'amber',
      },
      {
        id: 'cvs',
        emoji: '📄',
        title: 'Envoi des CV (24h/48h) & Blocage Opérationnel',
        highlight: 'INTERDICTION de lancer sans CV validés',
        bullets: [
          'Préciser au client que la disponibilité des profils évolue vite (pas de blocage sans retour).',
          'Demander une réponse sous 24h ; relance active sous 48h maximum.',
          'En cas de refus : voir d’abord le Recrutement. Sans validation écrite des CV par le client, AUCUN ordre de mobilisation n’est transmis.',
        ],
        colorClass: 'rose',
      },
      {
        id: 'postventa',
        emoji: '🤝',
        title: 'Suivi 5–6h, Mensuel & Remplacements',
        highlight: 'Appel à 5–6h + Suivi mensuel obligatoire',
        bullets: [
          'Jour 1 (après 5–6h) : le Commercial appelle le client, vérifie le démarrage et présente la Coordination.',
          'Remplacement : le Commercial répond au client, ouvre le remplacement dans le système et envoie un mail avec Coordination en copie (CC).',
          'Transfert entre chantiers : compétence EXCLUSIVE de la Coordination (transmettre la demande sans confirmer).',
        ],
        colorClass: 'emerald',
      },
    ],
    orderContacts: [
      { role: '1. Technique / Production', detail: 'Définit les tâches, plans, outillages et valide les CV.' },
      { role: '2. HSE / Sécurité', detail: 'Gère les accès site, formations sécurité, accueil et EPI spéciaux.' },
      { role: '3. Achats / Direction', detail: 'Valide le devis, les tarifs horaires et le contrat commercial.' },
      { role: '4. Comptabilité / Facturation', detail: 'SIRET/TVA, conditions de règlement et réception des factures.' },
      { role: '5. Chef de Chantier / Atelier', detail: 'Contact d’accueil le 1er jour, horaires, pointage et consignes.' },
    ],
    finalChecklist: [
      'Le métier, les tâches réelles et les compétences techniques sont-ils détaillés pour CHAQUE profil ?',
      'L’effectif, les horaires, les postes (jour/nuit +1,50 €/h), le démarrage et la durée sont-ils confirmés ?',
      'Les habilitations HSE, EPI spécifiques (fournis par le client) et les 5 contacts clients sont-ils identifiés ?',
      'Des plans, photos ou vidéos ont-ils été demandés pour sécuriser la sélection technique ?',
      'Les CV ont-ils été expressément approuvés par le client et la disponibilité reconfirmée avant lancement ?',
    ],
    postSaleScripts: {
      firstDayTitle: 'Appel du 1er Jour (après 5–6 heures)',
      firstDayDesc:
        '« Bonjour {contato}, je vous appelle pour faire le point après ces premières heures de démarrage de notre équipe, vérifier que tout se passe bien sur site et vous présenter notre service Coordination pour le suivi opérationnel quotidien. »',
      monthlyTitle: 'Suivi Commercial Mensuel (Obligatoire)',
      monthlyScript:
        '« Comment se passe la mission de notre équipe ce mois-ci ? Nous avons quelques profils qualifiés qui pourraient se libérer prochainement : auriez-vous besoin d’un renfort ? Si cela vous intéresse, je vérifie immédiatement avec notre service Recrutement. »',
      substitutionTitle: 'Gestion d’un Remplacement (E-mail obligatoire avec Coordination en CC)',
      substitutionScript:
        '« Bonjour {contato}, nous regrettons sincèrement cet écart concernant l’opérateur affecté et la gêne occasionnée. Nous analysons immédiatement le profil avec le Recrutement et les conditions sur site avec la Coordination afin de vous revenir très vite avec une solution validée. »',
      transferTitle: 'Demande de Transfert vers un Autre Chantier (Transmettre à la Coordination)',
      transferScript:
        '« Je note les informations du nouveau site et je transmets immédiatement votre demande à notre service Coordination, qui vérifiera la logistique et la sécurité et vous confirmera directement la marche à suivre. »',
    },
  },

  it: {
    lang: 'it',
    dailyGoalBadge: 'Obiettivo: 20–30 chiamate qualificate / giorno',
    corePrinciple: 'Il nome della mansione NON è una specifica tecnica. Senza scheda tecnica completa e CV approvati dal cliente, NESSUN ordine viene attivato.',
    openingVariants: {
      gatekeeperTitle: '1. Centralino / Reception (Parlare con il Decisore)',
      gatekeeperPitch:
        'Buongiorno, chiamo dall’area tecnica di Wiseowe Servizi Industriali per il supporto di personale specializzato (saldatori qualificati TIG/MIG, tubisti, carpentieri e operatori CNC) per {empresa}. Potrebbe passarmi il Responsabile di Produzione, il Capo Officina o l’Ufficio Acquisti Tecnici, per favore?',
      decisorTitle: '2. Colloquio Diretto con il Decisore ({contato})',
      decisorNote:
        'Obiettivo nei primi 15 secondi: verificare il settore industriale, individuare picchi di commessa/cantiere e capire chi approva fornitori e profili.',
      videoCallTitle: '3. Cliente con Dubbi → Proporre Breve Videochiamata (10 min)',
      videoCallPitch:
        'Se desidera approfondire il nostro metodo operativo, possiamo fissare una breve videochiamata di 10 minuti per mostrarle come selezioniamo i tecnici, verifichiamo le competenze pratiche e gestiamo alloggio, trasporti e sicurezza.',
    },
    workflowPhases: [
      {
        step: '01 · ACQUISIZIONE',
        title: 'Prospezione Qualificata',
        items: [
          'Validare Attività, Capacità, Fattibilità e Decisore',
          'Chiamare e registrare ogni esito nel Power Dialer',
          'Inviare Dossier / Presentazione personalizzata M365',
        ],
        color: 'blue',
      },
      {
        step: '02 · CONVERSIONE',
        title: 'Requisiti Tecnici & CV',
        items: [
          'Raccogliere le specifiche tecniche esatte per ogni profilo',
          'Definire tariffa (diurno / notturno +1,50 €/h), turni e contratto',
          'Inviare CV (risposta 24h / follow-up max 48h) + approvazione',
        ],
        color: 'amber',
      },
      {
        step: '03 · AVVIO & CONTROLLO',
        title: 'Follow-up 5–6h & Mensile',
        items: [
          'Chiamata obbligatoria dopo le prime 5–6 ore in cantiere/officina',
          'Presentare il Coordinamento (spostamenti cantiere = Coordinamento)',
          'Contatto commerciale mensile + gestione trasparente sostituzioni',
        ],
        color: 'emerald',
      },
    ],
    commonProjectFields: [
      {
        icon: '🏢',
        label: 'Cliente, Commessa e Decisore',
        question: 'Per quale stabilimento/commessa specifica e chi valida tecnicamente i profili?',
      },
      {
        icon: '📍',
        label: 'Sede e Condizioni di Accesso',
        question: 'Indirizzo esatto dello stabilimento/cantiere e modalità di accesso?',
      },
      {
        icon: '📅',
        label: 'Data di Inizio e Durata',
        question: 'Data prevista di inserimento, durata stimata e possibili proroghe?',
      },
      {
        icon: '👷',
        label: 'Quantità e Autonomia',
        question: 'Quanti operatori per qualifica e quale livello di autonomia/esperienza?',
      },
      {
        icon: '🕒',
        label: 'Orari, Turni e Notturno',
        question: 'Orari di ingresso/uscita, turno diurno o notturno (+1,50 €/h) e rotazioni settimanali?',
      },
      {
        icon: '⚙️',
        label: 'Lavoro Reale da Svolgere',
        question: 'Mansioni concrete, materiali, spessori, macchinari e qualità di finitura richiesta?',
      },
      {
        icon: '📐',
        label: 'Disegni, Foto o Video',
        question: 'È possibile ricevere disegni tecnici, foto o video dei pezzi/strutture da realizzare?',
      },
    ],
    specialties: [
      {
        id: 'soldador',
        emoji: '🔥',
        badgeColor: 'orange',
        imageUrl: '/assets/images/wise-mkt03-despliegue.png',
        title: 'Saldatori Qualificati (TIG / MIG-MAG / Elettrodo)',
        shortDesc: 'Processo, posizioni 1G–6G, materiali, spessori, flussaggio gas',
        badExample: '«Mi servono 2 saldatori per la prossima settimana.»',
        goodExample:
          '«2 Saldatori TIG su tubazione inox SCH10 (spessore sottile), con flussaggio/purga interna gas, Ø ½″–2½″, posizione 6G, finitura ad alta precisione ed esperienza dimostrabile.»',
        questions: [
          'Quale processo di saldatura è richiesto: TIG, MIG/MAG, filo animato, elettrodo, arco sommerso o orbitale?',
          'In quali posizioni di saldatura: 1G, 2G, 3G, 6G o altre posizioni specifiche?',
          'Quali materiali e spessori: acciaio al carbonio, inox (serve purga interna?), alluminio? Diametri e spessori?',
          'Tubazioni a pressione (controlli radiografici/CND) o carpenteria strutturale?',
          'È richiesta lettura del disegno tecnico o prova pratica in ingresso?',
        ],
        criticalRule:
          'PATENTINI / QUALIFICHE: Proporli solo se richiesti dal cliente. Organizzazione e costi di eventuali prove specifiche sono a carico del cliente.',
      },
      {
        id: 'tubero',
        emoji: '🔩',
        badgeColor: 'blue',
        imageUrl: '/assets/images/wise-mkt01-hero.png',
        title: 'Tubisti Industriali (Officina / Impianto)',
        shortDesc: 'Isometrici, prefabbricazione spool, DN/SCH, smussatura e puntatura',
        badExample: '«Mandatemi due tubisti per cantiere.»',
        goodExample:
          '«2 Tubisti industriali autonomi nella lettura di disegni isometrici, prefabbricazione e montaggio linee inox/carbonio DN50–DN200 SCH40, preparazione smussi e puntatura TIG.»',
        questions: [
          'Prefabbricazione tubazioni in officina o montaggio/installazione linee in impianto/cantiere?',
          'Quali materiali, diametri (pollici/DN) e spessori (SCH10, SCH40, SCH80) vengono lavorati?',
          'Giunzioni saldate, flangiate o filettate? IMPORTANTE: Il tubista esegue solo accoppiamento/puntatura o chi salda?',
          'È richiesta lettura autonoma di disegni isometrici, tracciatura, sviluppo spool e staffaggi?',
        ],
        criticalRule:
          'NON CONFONDERE TUBISTA E SALDATORE: Il tubista legge l’isometrico, taglia, smussa, accoppia e punta. Confermare sempre chi esegue la saldatura completa.',
      },
      {
        id: 'montador',
        emoji: '🏗️',
        badgeColor: 'indigo',
        imageUrl: '/assets/images/hero-team.jpg',
        title: 'Montatori Meccanici & Strutture Metalliche',
        shortDesc: 'Capannoni, carpenteria pesante, bullonatura/puntatura, disegni e lavori in quota',
        badExample: '«Servono 3 montatori di carpenteria.»',
        goodExample:
          '«3 Montatori di carpenteria metallica pesante in cantiere, giunzioni bullonate da disegno, utilizzo PLE/piattaforma aerea e abilitazione lavori in quota.»',
        questions: [
          'Montaggio nuovo, smontaggio, installazione impianti o manutenzione? Di quali strutture/macchinari?',
          'Giunzione bullonata, saldata o mista? Servono operazioni di taglio o piegatura?',
          'Dimensioni dei pezzi, lettura autonoma del disegno di montaggio e lavori in quota?',
          'Quali attrezzature, mezzi di sollevamento e piattaforme (PLE) mette a disposizione il cantiere?',
        ],
        criticalRule:
          'LAVORI IN QUOTA: Verificare sempre attestati sicurezza specifici, lavori in quota e patentino PLE/carroponte prima della selezione.',
      },
      {
        id: 'calderero_fab',
        emoji: '⚙️',
        badgeColor: 'amber',
        imageUrl: '/assets/images/triangulo-tig-welder.png',
        title: 'Carpentieri in Ferro / Caldarai di Officina',
        shortDesc: 'Serbatoi, scambiatori, tracciatura, taglio, piegatura, calandratura e puntatura',
        badExample: '«Un carpentiere esperto.»',
        goodExample:
          '«Carpentiere/Caldaraio d’officina per serbatoi a pressione e scambiatori in inox 6–15 mm: lettura disegni, tracciatura, taglio, calandratura, assemblaggio e sola puntatura.»',
        questions: [
          'Cosa si costruisce esattamente: serbatoi a pressione, scambiatori, tramogge, tubazioni o carpenteria pesante?',
          'Materiali, spessori lamiera, dimensioni e tolleranze critiche richieste?',
          'Operazioni richieste: tracciatura, taglio, piegatura, calandratura, assemblaggio e puntatura?',
        ],
        criticalRule:
          'REGOLA CARPENTERIA: Il carpentiere/caldaraio d’officina legge il disegno, traccia, assembla e PUNTA solamente (non esegue la saldatura finale salvo accordo specifico).',
      },
      {
        id: 'calderero_mon',
        emoji: '🔧',
        badgeColor: 'teal',
        imageUrl: '/assets/images/mkt-wise-es-hero.jpg',
        title: 'Carpentieri di Montaggio (Cantiere / Fermata)',
        shortDesc: 'Installazione gruppi prefabbricati, aggiustaggio, allineamento e sollevamento',
        badExample: '«Due carpentieri per fermata impianto.»',
        goodExample:
          '«2 Carpentieri di montaggio per fermata industriale: smontaggio e installazione condotti prefabbricati, allineamento, puntatura e abilitazione spazi confinati.»',
        questions: [
          'Montaggio in opera di gruppi prefabbricati, smontaggio o fermata di manutenzione?',
          'Sistema di fissaggio (saldatura/puntatura o bullonatura), allineamento e mezzi di sollevamento?',
          'Requisiti speciali di impianto: spazi confinati, ATEX, lavori in quota?',
        ],
        criticalRule:
          'OFFICINA VS CANTIERE: Distinguere sempre il carpentiere di fabbricazione in officina dal carpentiere di montaggio in cantiere.',
      },
      {
        id: 'cnc',
        emoji: '🖥️',
        badgeColor: 'purple',
        imageUrl: '/assets/images/wise-mkt02-dossier.png',
        title: 'Tornitori & Fresatori (CNC / Tradizionali)',
        shortDesc: 'Controllo Fanuc/Siemens/Mazak/Heidenhain — Programmare, attrezzare o solo operare?',
        badExample: '«Cerco un tornitore/fresatore CNC.»',
        goodExample:
          '«Tornitore CNC con controllo Fanuc per piccoli lotti in acciaio e inox: attrezzaggio macchina, cambio utensili, azzeramento pezzo e correzione quote a bordo macchina.»',
        questions: [
          'Tornio/fresatrice tradizionale o CNC / centro di lavoro (3, 4 o 5 assi)?',
          'Quale controllo numerico utilizza la macchina: Fanuc, Siemens, Heidenhain, Mazak o altro?',
          'Dimensioni massime dei pezzi, materiali lavorati (acciaio, inox, alluminio, tecnopolimeri) e tolleranze?',
          'DOMANDA OBBLIGATORIA: Deve PROGRAMMARE a bordo macchina, ATTREZZARE/PREPARARE utensili, oppure SOLO OPERARE (carico/scarico e controllo quote)?',
        ],
        criticalRule:
          'PUNTO CHIAVE MECCANICA CNC: Chiarire sempre con il cliente se serve un Programmatore/Attrezzista CNC o un Operatore CNC.',
      },
      {
        id: 'electricista',
        emoji: '⚡',
        badgeColor: 'yellow',
        imageUrl: '/assets/images/genio/hero_empresas.png',
        title: 'Elettricisti Industriali (BT / MT / AT)',
        shortDesc: 'Tensione (<1kV, 1–36kV, >36kV), quadri, passerelle, bordo macchina e PLC',
        badExample: '«Due elettricisti industriali.»',
        goodExample:
          '«2 Elettricisti industriali Bassa Tensione (<1 kV, PES/PAV) per posa passerelle, stesura cavi potenza/controllo, cablaggio quadri e bordo macchina da schema elettrico.»',
        questions: [
          'Bassa (<1 kV), Media (1–36 kV) o Alta Tensione (>36 kV)? Confermare tensione effettiva e abilitazioni (PES/PAV/CEI 11-27).',
          'Posa canaline/passerelle, cablaggio quadri, bordo macchina, strumentazione o automazione/PLC?',
          'Nuova installazione, manutenzione impianto o collaudo/messa in servizio?',
        ],
        criticalRule:
          'SICUREZZA ELETTRICA: Confermare sempre la tensione di lavoro e le abilitazioni normative richieste dallo stabilimento.',
      },
      {
        id: 'pintor',
        emoji: '🎨',
        badgeColor: 'rose',
        imageUrl: '/assets/images/luminous/worker-helmet-luminous.jpg',
        title: 'Verniciatori Industriali & Sabbiatori',
        shortDesc: 'Airless, spruzzo, polvere; epossidica, poliuretanica, ignifuga; sabbiatura',
        badExample: '«Un verniciatore industriale.»',
        goodExample:
          '«Verniciatore industriale Airless per carpenteria metallica: ciclo epossidico/poliuretanico con controllo spessori (micron) e preparazione tramite sabbiatura/granigliatura.»',
        questions: [
          'Metodo di applicazione: Airless, pistola a spruzzo, verniciatura a polvere o rullo/pennello?',
          'Tipo di vernice: epossidica, poliuretanica, intumescente/ignifuga, smalto anticorrosivo?',
          'Superfici da trattare, numero di mani, spessore in micron e preparazione (sabbiatura/granigliatura)?',
        ],
        criticalRule:
          'DPI SPECIALI VERNICIATURA: Maschere respiratorie specifiche e tute chimiche devono essere indicate nell’ordine e fornite dal cliente.',
      },
      {
        id: 'mecanico',
        emoji: '🏭',
        badgeColor: 'emerald',
        imageUrl: '/assets/images/luminous/hero-welder.jpg',
        title: 'Meccanici & Elettromeccanici Industriali',
        shortDesc: 'Pompe, riduttori, turbine, nastri, allineamento laser e manutenzione',
        badExample: '«Un manutentore meccanico.»',
        goodExample:
          '«Elettromeccanico industriale per manutenzione preventiva e straordinaria su linee automatizzate, riduttori, cuscinetti, pneumatica e ricerca guasti su motori/sensori.»',
        questions: [
          'Su quali macchinari: pompe, riduttori, turbine, compressori, presse, nastri trasportatori o robot?',
          'Montaggio meccanico, allineamento laser/cuscinetti, revisione o manutenzione preventiva/correttiva?',
          'Quale combinazione reale tra competenze meccaniche, elettriche e di controllo è richiesta?',
        ],
        criticalRule:
          'ATTREZZATURE SPECIALI: Verificare chi fornisce chiavi dinamometriche, estrattori idraulici o strumenti di allineamento.',
      },
      {
        id: 'ayudante',
        emoji: '👷',
        badgeColor: 'slate',
        imageUrl: '/assets/images/mkt-triangulo-es-hero.jpg',
        title: 'Aiutanti di Officina & Altri Profili',
        shortDesc: 'Molatura, foratura, movimentazione e supporto agli operai specializzati',
        badExample: '«Due operai generici per officina.»',
        goodExample:
          '«2 Aiutanti di carpenteria metallica per sbavatura con smerigliatrice, trapano a colonna, pulizia saldature e supporto diretto ai carpentieri qualificati.»',
        questions: [
          'Quali mansioni concrete svolgerà l’aiutante e quali restano riservate agli operai specializzati?',
          'Uso di utensili elettrici (smerigliatrice, trapano), muletto o carroponte?',
          'Livello di supervisione in reparto e attestati sicurezza richiesti?',
        ],
        criticalRule:
          'PROFILO VERIFICABILE: Descrivere sempre le mansioni esatte e consultare Selezione/Reclutamento per profili fuori catalogo.',
      },
    ],
    pillarRules: [
      {
        id: 'turnos',
        emoji: '🌙',
        title: 'Turni, Orari e Maggiorazione Notturna',
        highlight: 'Turno Notturno: +1,50 €/h regola generale',
        bullets: [
          'Esempio riferimento: 27,00 €/h (diurno) → 28,50 €/h (notturno) | 30,00 €/h → 31,50 €/h.',
          'Eccezione +1,00 €/h: SOLO previa autorizzazione del Coordinamento.',
          'Confermare orari di ingresso/uscita, numero operatori per qualifica su ogni turno ed eventuali rotazioni.',
        ],
        colorClass: 'indigo',
      },
      {
        id: 'epis',
        emoji: '🦺',
        title: 'DPI, Divisa e Documentazione Sicurezza',
        highlight: 'DPI standard di base inclusi',
        bullets: [
          'Forniamo i DPI standard: casco, scarpe antinfortunistiche, gilet ad alta visibilità e guanti base.',
          'DPI specifici (ignifughi, antistatici, chimici, maschere speciali): devono figurare nell’ordine ed essere forniti dal cliente.',
          'Confermare corsi sicurezza (spazi confinati, quota, PLE, ATEX) e portale documentale.',
        ],
        colorClass: 'amber',
      },
      {
        id: 'cvs',
        emoji: '📄',
        title: 'Invio CV (24h/48h) & Blocco Operativo',
        highlight: 'VIETATO attivare l’ordine senza CV approvati',
        bullets: [
          'All’invio dei CV spiegare che la disponibilità varia rapidamente (nessuna riserva garantita).',
          'Chiedere riscontro entro 24h; follow-up attivo entro massimo 48h.',
          'In caso di rifiuto sentire PRIMA Selezione/Reclutamento. Senza approvazione espressa dei CV, NON passare l’ordine al Coordinamento.',
        ],
        colorClass: 'rose',
      },
      {
        id: 'postventa',
        emoji: '🤝',
        title: 'Follow-up 5–6h, Mensile e Sostituzioni',
        highlight: 'Chiamata dopo 5–6h + Mensile obbligatoria',
        bullets: [
          'Primo giorno (dopo 5–6h): il Commerciale chiama il cliente, verifica l’avvio e presenta il Coordinamento.',
          'Sostituzioni: il Commerciale risponde al cliente, registra la sostituzione nel sistema e invia mail con Coordinamento in CC.',
          'Spostamenti tra cantieri: competenza ESCLUSIVA del Coordinamento (raccogliere dati e inoltrare senza confermare).',
        ],
        colorClass: 'emerald',
      },
    ],
    orderContacts: [
      { role: '1. Tecnico / Produzione', detail: 'Definisce mansioni, disegni, utensili e approva tecnicamente i CV.' },
      { role: '2. RSPP / Sicurezza', detail: 'Gestisce accessi, corsi sicurezza, DPI specifici e portale documentale.' },
      { role: '3. Acquisti / Direzione', detail: 'Approva preventivo, tariffe orarie e contratto commerciale.' },
      { role: '4. Amministrazione / Fatturazione', detail: 'P.IVA/SDI, condizioni di pagamento e ricezione fatture.' },
      { role: '5. Logistica / Capo Cantiere', detail: 'Referente del primo giorno, turni, orari e accoglienza squadra.' },
    ],
    finalChecklist: [
      'Mansione, compiti reali e competenze tecniche sono descritti per OGNI singolo profilo?',
      'Quantità, orari, turni (diurno/notturno +1,50 €/h), rotazioni, inizio e durata sono confermati?',
      'Corsi sicurezza, DPI specifici (forniti dal cliente) e i 5 referenti aziendali sono registrati?',
      'Sono stati richiesti disegni, foto o video dei pezzi/lavorazioni per evitare errori di selezione?',
      'I CV sono stati approvati espressamente dal cliente e la disponibilità è stata riconfermata prima del rilascio?',
    ],
    postSaleScripts: {
      firstDayTitle: 'Chiamata Primo Giorno (dopo 5–6 ore)',
      firstDayDesc:
        '«Buongiorno {contato}, ti chiamo per verificare come hanno iniziato i nostri operatori in queste prime ore in reparto/cantiere e per presentarti il nostro ufficio Coordinamento per la gestione operativa quotidiana.»',
      monthlyTitle: 'Follow-up Commerciale Mensile (Obbligatorio)',
      monthlyScript:
        '«Come sta lavorando la nostra squadra questo mese? Volevamo verificare la vostra soddisfazione e anticiparti che a breve potremmo avere alcuni profili qualificati disponibili: vi potrebbe servire un rinforzo? Se vi interessa verifico subito con la Selezione.»',
      substitutionTitle: 'Gestione Sostituzione (E-mail obbligatoria con Coordinamento in CC)',
      substitutionScript:
        '«Buongiorno {contato}, ci scusiamo per l’inconveniente riscontrato con l’operatore assegnato. Stiamo già verificando il profilo con l’ufficio Selezione e le condizioni operative con il Coordinamento per aggiornarvi al più presto sulla soluzione validata.»',
      transferTitle: 'Richiesta Spostamento tra Cantieri (Inoltrare al Coordinamento)',
      transferScript:
        '«Prendo nota dei dati del nuovo cantiere e inoltro subito la tua richiesta al nostro ufficio Coordinamento, che verificherà logistica e sicurezza e ti confermerà direttamente come procedere.»',
    },
  },
};
