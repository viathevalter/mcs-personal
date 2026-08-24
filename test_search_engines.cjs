async function testDirectories() {
  // 1. Paginas Amarillas
  try {
    const res = await fetch('https://www.paginasamarillas.es/a/caldereria/madrid/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });
    const html = await res.text();
    console.log('PA HTML length:', html.length);
    // Find websites
    const webMatches = html.match(/data-ubication="([^"]+)"/g) || html.match(/href="([^"]+)"/g) || [];
    console.log('PA Links total:', webMatches.length);
  } catch (e) {
    console.log('PA err:', e.message);
  }

  // 2. Infocif
  try {
    const res2 = await fetch('https://www.infocif.es/empresas-actividad/caldereria-madrid.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });
    const html2 = await res2.text();
    console.log('Infocif HTML length:', html2.length);
  } catch (e) {
    console.log('Infocif err:', e.message);
  }
}

testDirectories();
