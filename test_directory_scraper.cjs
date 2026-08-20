async function testScrapeDirectory() {
  console.log("Testing access to public business directories in Spain...");
  try {
    const res = await fetch("https://www.infocif.es/empresas-cnae/2511-fabricacion-de-estructuras-metalicas.html", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("InfoCIF Status:", res.status);
    const text = await res.text();
    console.log("Response length:", text.length);
    console.log("Snippet:", text.slice(0, 500));
  } catch (err) {
    console.error("Error scraping directory:", err.message);
  }
}

testScrapeDirectory();
