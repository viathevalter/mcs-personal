require('dotenv').config({ path: '.env' });
const dns = require('dns').promises;
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PROVINCES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga', 'Murcia',
  'Palma de Mallorca', 'Las Palmas', 'Bilbao Vizcaya', 'Alicante', 'Cordoba',
  'Valladolid', 'Vigo Pontevedra', 'Gijon Asturias', 'Vitoria Alava', 'A Coruna',
  'Granada', 'Elche', 'Oviedo Asturias', 'Badalona', 'Cartagena', 'Terrassa',
  'Jerez de la Frontera', 'Sabadell', 'Santa Cruz de Tenerife', 'Mostoles',
  'Alcala de Henares', 'Fuenlabrada', 'Pamplona Navarra', 'Almeria', 'Leganes',
  'San Sebastian Gipuzkoa', 'Santander Cantabria', 'Castellon de la Plana',
  'Burgos', 'Albacete', 'Getafe', 'Salamanca', 'Logrono La Rioja', 'Huelva',
  'Badajoz', 'Tarragona', 'Leon', 'Lleida', 'Cadiz', 'Jaen', 'Ourense', 'Girona',
  'Lugo', 'Caceres', 'Guadalajara', 'Toledo', 'Pontevedra', 'Palencia', 'Ciudad Real',
  'Zamora', 'Avila', 'Cuenca', 'Huesca', 'Segovia', 'Soria', 'Teruel'
];

const SEARCH_TERMS = [
  'taller mecanizado cnc',
  'instalaciones electricas industriales',
  'mantenimiento industrial electromecanico',
  'montajes industriales caldereria',
  'cerrajeria industrial estructuras metalicas',
  'climatizacion industrial frio industrial',
  'fabricacion silos tolvas maquinaria'
];

async function checkDomainMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log("=== TESTANDO DESCOBERTA DE POLÍGONOS INDUSTRIAIS NA ESPANHA ===");
  console.log(`Total de Províncias/Polos mapeados: ${PROVINCES.length}`);
  console.log(`Total de Termos de Busca por Província: ${SEARCH_TERMS.length}`);
  console.log(`Combinações de Busca: ${PROVINCES.length * SEARCH_TERMS.length} varreduras`);
}

main();
