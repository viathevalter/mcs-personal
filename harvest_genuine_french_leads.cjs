require("dotenv").config();
const { Client } = require("pg");

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || "postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

const MISSION_NAF_MAPPING = [
  {
    num: 1,
    titleKeyword: "33.20",
    nafCodes: ["33.20A", "33.20B", "33.20C", "33.20D"],
    sector: "Calderería & Tubería Industrial"
  },
  {
    num: 2,
    titleKeyword: "25.29",
    nafCodes: ["25.29Z"],
    sector: "Calderería & Tubería Industrial"
  },
  {
    num: 3,
    titleKeyword: "25.11",
    nafCodes: ["25.11Z"],
    sector: "Estructuras Metálicas & Montajes"
  },
  {
    num: 4,
    titleKeyword: "25.62",
    nafCodes: ["25.62A", "25.62B"],
    sector: "Mecanizado CNC & Tornería"
  },
  {
    num: 5,
    titleKeyword: "30.11",
    nafCodes: ["30.11Z", "33.15Z"],
    sector: "Construção & Reparação Naval"
  },
  {
    num: 6,
    titleKeyword: "28.93",
    nafCodes: ["28.93Z"],
    sector: "Tubería Inox & Agroalimentaria"
  },
  {
    num: 7,
    titleKeyword: "28.25",
    nafCodes: ["28.25Z", "33.11Z"],
    sector: "Mantenimiento Industrial & Calderas"
  },
  {
    num: 8,
    titleKeyword: "Z.I.",
    nafCodes: ["25.99B", "25.50B", "42.99Z", "24.20Z"],
    sector: "Polígonos Industriais & Subcontratistas"
  }
];

const JUNK_EMAIL_PREFIXES = ["firstname@", "lastname@", "user@", "username@", "name@", "yourname@", "email@", "exemple@", "example@"];

async function checkMx(domain) {
  if (!domain || !domain.includes(".")) return false;
  try {
    const res = await fetch("https://dns.google/resolve?name=" + encodeURIComponent(domain) + "&type=MX", {
      signal: AbortSignal.timeout(2000)
    });
    const d = await res.json();
    return d.Status === 0 && Array.isArray(d.Answer) && d.Answer.length > 0;
  } catch {
    return false;
  }
}

async function verifyAndScrape(c) {
  const name = c.nom_complet || "";
  const sigle = c.sigle || "";
  const nomCom = c.nom_commercial || c.siege?.nom_commercial || "";
  const enseignes = c.siege?.liste_enseignes || [];

  const rawNames = [name, sigle, nomCom, ...enseignes].filter(Boolean);
  const candidates = [];

  for (const raw of rawNames) {
    const norm = raw.toLowerCase()
      .replace(/^(sas|sarl|sa|ste|societe)s+/i, "")
      .replace(/s+(sas|sarl|sa|france|industries?|group|groupe)$/i, "")
      .trim();

    const clean = norm.replace(/[^a-z0-9]/g, "");
    const cleanFull = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const words = norm.split(/[^a-z0-9]+/).filter(w => w.length > 1);

    if (clean.length >= 3) {
      candidates.push(clean + ".fr", clean + ".com", clean + ".eu", clean + "-industrie.fr", clean + "-france.fr", clean + "-france.com");
    }
    if (cleanFull.length >= 3 && cleanFull !== clean) {
      candidates.push(cleanFull + ".fr", cleanFull + ".com");
    }
    if (words.length > 1) {
      candidates.push(words.join("-") + ".fr", words.join("-") + ".com", words.join("") + ".fr", words.join("") + ".com");
    }
  }

  const seenDom = new Set();

  for (const dom of candidates) {
    if (seenDom.has(dom)) continue;
    seenDom.add(dom);

    const hasMx = await checkMx(dom);
    if (!hasMx) continue;

    const urls = [
      "https://www." + dom,
      "https://" + dom,
      "http://www." + dom,
      "http://" + dom
    ];

    for (const u of urls) {
      try {
        const res = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(3000)
        });
        if (!res.ok) continue;
        let html = await res.text();
        html = html.replace(/[\u2000-\u200b\s]+/g, " ");

        const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
        const cleanEmails = emails.filter(e => {
          const lower = e.toLowerCase();
          if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".webp") || lower.endsWith(".js") || lower.endsWith(".css") || lower.includes("sentry") || lower.includes("wixpress") || lower.includes("schema.org") || lower.includes("example.com") || lower.includes("domain.com") || !lower.includes(dom)) {
            return false;
          }
          if (JUNK_EMAIL_PREFIXES.some(p => lower.startsWith(p))) return false;
          return true;
        });

        const phones = html.match(/(?:\+33\s*(?:\(0\)\s*)?[0-9][\s0-9().-]{8,15}[0-9])|(?:0[1-9][\s0-9.-]{8,13}[0-9])/g) || [];
        const cleanPhones = phones.filter(p => {
          const digits = p.replace(/\D/g, "");
          return digits.length >= 9 && digits.length <= 13 && !digits.startsWith("0000") && !p.includes("00 00 00");
        });

        if (cleanEmails.length > 0) {
          return {
            website: u,
            email: cleanEmails[0].toLowerCase().trim(),
            phone: cleanPhones[0]?.trim() || null
          };
        }
      } catch {}
    }
  }
  return null;
}

async function runRealFranceProspector() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log("====================================================================");
  console.log("🇫🇷 MOTOR OFICIAL 100% REAL DE CAPTAÇÃO INDUSTRIAL (FRANÇA)");
  console.log("====================================================================");

  // Purge any dummy or placeholder emails
  await client.query("DELETE FROM core_comercial.lead_prospecting_results WHERE email LIKE 'firstname@%' OR phone LIKE '%00 00 00%';");

  await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', updated_at = NOW() WHERE location LIKE '%Fran%';");

  const existingStagingRes = await client.query("SELECT company_name, email FROM core_comercial.lead_prospecting_results;");
  const existingCrmRes = await client.query("SELECT company_name, email FROM core_comercial.leads;");

  const existingNames = new Set();
  const existingEmails = new Set();

  for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
    if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
    if (r.email) existingEmails.add(r.email.trim().toLowerCase());
  }

  console.log("📊 Base de exclusão inicial: " + existingNames.size + " empresas / " + existingEmails.size + " e-mails.");

  while (true) {
    for (const mapping of MISSION_NAF_MAPPING) {
      const jobRes = await client.query("SELECT * FROM core_comercial.lead_prospecting_jobs WHERE location LIKE '%Fran%' AND title LIKE $1 LIMIT 1;", ["%" + mapping.titleKeyword + "%"]);
      if (jobRes.rows.length === 0) continue;
      const job = jobRes.rows[0];

      console.log("\n🎯 Processando Missão " + mapping.num + ": \"" + job.title + "\"");

      for (const naf of mapping.nafCodes) {
        console.log("📂 Consultando NAF Oficial " + naf + " (Páginas 1 a 35)...");

        for (let page = 1; page <= 35; page++) {
          try {
            const url = "https://recherche-entreprises.api.gouv.fr/search?activite_principale=" + naf + "&per_page=25&page=" + page;
            const apiRes = await fetch(url);
            if (!apiRes.ok) continue;
            const data = await apiRes.json();
            const companies = data.results || [];
            if (companies.length === 0) break;

            let insertedInPage = 0;

            for (const c of companies) {
              const companyName = (c.nom_complet || c.nom_raison_sociale || "").trim();
              if (!companyName || companyName.length < 3) continue;

              const normName = companyName.toLowerCase();
              if (existingNames.has(normName)) continue;

              const city = c.siege?.libelle_commune || "France";
              const postalCode = c.siege?.code_postal || "";
              const address = (c.siege?.adresse || c.siege?.libelle_voie || "Zone Industrielle") + (postalCode ? " " + postalCode : "");
              const department = c.siege?.departement || "France";

              const scraped = await verifyAndScrape(c);
              if (!scraped || !scraped.email) continue;

              const normEmail = scraped.email.toLowerCase().trim();
              if (existingEmails.has(normEmail)) continue;

              existingNames.add(normName);
              existingEmails.add(normEmail);

              await client.query("INSERT INTO core_comercial.lead_prospecting_results (job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) ON CONFLICT DO NOTHING;", [
                job.id, job.empresa_id, companyName, normEmail, scraped.phone || null, scraped.website,
                address, city, department + " - France", "França", 99, "raw"
              ]);

              insertedInPage++;
              console.log("  ✓ [100% REAL] " + companyName + " | Site: " + scraped.website + " | Email: " + normEmail + " | Tel: " + (scraped.phone || "N/A"));
            }

            if (insertedInPage > 0) {
              const countRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;", [job.id]);
              const currentCount = parseInt(countRes.rows[0].count, 10);
              await client.query("UPDATE core_comercial.lead_prospecting_jobs SET processed_count = $1, found_emails_count = $1, updated_at = NOW() WHERE id = $2;", [currentCount, job.id]);
            }
          } catch (err) {
            console.warn("  Erro na página " + page + ":", err.message);
          }

          await new Promise(r => setTimeout(r, 150));
        }
      }

      const countRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;", [job.id]);
      const currentCount = parseInt(countRes.rows[0].count, 10);
      await client.query("UPDATE core_comercial.lead_prospecting_jobs SET processed_count = $1, found_emails_count = $1, updated_at = NOW() WHERE id = $2;", [currentCount, job.id]);
      console.log("📊 Total acumulado na Missão " + mapping.num + ": " + currentCount + " leads REAIS.");
    }

    console.log("\n🔄 Ciclo completo finalizado. Próxima rodada de aprofundamento...");
    await new Promise(r => setTimeout(r, 2000));
  }
}

runRealFranceProspector().catch(console.error);
