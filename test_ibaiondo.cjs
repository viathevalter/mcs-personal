async function testScrapeIbaiondo() {
  const url = 'https://www.ibaiondo.com/contacto/';
  console.log("Scraping Ibaiondo:", url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const matches = html.match(emailRegex) || [];
    console.log("Emails found on ibaiondo.com/contacto/:", matches);
  } catch (e) {
    console.error(e.message);
  }
}

testScrapeIbaiondo();
