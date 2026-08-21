async function scrapeWebsiteRealEmail(url) {
  console.log(`Scraping real email directly from website HTML: ${url}...`);
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(t);

    const html = await res.text();
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = html.match(emailRegex) || [];
    
    // Filter out common junk emails (like wix, wordpress, sentry, placeholder)
    const validEmails = matches.filter(e => {
      const lower = e.toLowerCase();
      return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.includes('sentry') && !lower.includes('wixpress') && !lower.includes('schema.org') && !lower.includes('example.com');
    });

    const uniqueEmails = [...new Set(validEmails.map(e => e.toLowerCase()))];
    console.log("Emails found in HTML:", uniqueEmails);
    return uniqueEmails;
  } catch (err) {
    console.error("Scraping error:", err.message);
    return [];
  }
}

scrapeWebsiteRealEmail('https://cerrajerianavarro.es');
