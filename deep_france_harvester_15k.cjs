require("dotenv").config();
const { Client } = require("pg");

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || "postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

const MISSION_NAF_MAPPING = [
  {
    num: 1,
    titleKeyword: "33.20",
    nafCodes: ["33.20A", "33.20B", "33.20C", "33.20D", "43.22B"],
    sector: "Calderería & Tubería Industrial"
  },
  {
    num: 2,
    titleKeyword: "25.29",
    nafCodes: ["25.29Z", "25.21Z", "25.30Z"],
    sector: "Calderería & Tubería Industrial"
  },
  {
    num: 3,
    titleKeyword: "25.11",
    nafCodes: ["25.11Z", "25.12Z", "43.99C"],
    sector: "Estructuras Metálicas & Montajes"
  },
  {
    num: 4,
    titleKeyword: "25.62",
    nafCodes: ["25.62A", "25.62B", "33.12Z", "28.41Z"],
    sector: "Mecanizado CNC & Tornería"
  },
  {
    num: 5,
    titleKeyword: "30.11",
    nafCodes: ["30.11Z", "33.15Z", "30.12Z"],
    sector: "Construção & Reparação Naval"
  },
  {
    num: 6,
    titleKeyword: "28.93",
    nafCodes: ["28.93Z", "28.94Z", "28.95Z", "28.96Z"],
    sector: "Tubería Inox & Agroalimentaria"
  },
  {
    num: 7,
    titleKeyword: "28.25",
    nafCodes: ["28.25Z", "33.11Z", "28.13Z", "28.14Z"],
    sector: "Mantenimiento Industrial & Calderas"
  },
  {
    num: 8,
    titleKeyword: "Z.I.",
    nafCodes: ["25.99B", "25.50B", "42.99Z", "24.20Z", "24.33Z", "25.61Z"],
    sector: "Polígonos Industriais & Subcontratistas"
  }
];

const INDUSTRIAL_KEYWORDS = [
  "tuyauterie", "chaudronnerie", "soudure", "soudeur", "mécano-soudure", "mecano-soudure",
  "usinage", "décolletage", "decolletage", "tôlerie", "tolerie", "charpente métallique",
  "charpente metallique", "serrurerie", "métallerie", "metallerie", "cuve", "citerne",
  "réservoir", "reservoir", "naval", "chantier naval", "bateau", "robinetterie",
  "valves", "tuyaux", "montage mécanique", "montage mecanique", "maintenance industrielle",
  "pipeline", "inox", "acier", "métal", "metal", "échangeur", "echangeur", "chaudière", "chaudiere"
];

const BLACKLIST_KEYWORDS = [
  "voyage", "voyages", "tourisme", "musique", "spectacle", "avocat", "notaire",
  "dentiste", "médical", "clinique", "coiffure", "esthétique", "assurance",
  "immobilier", "agence de voyage", "séjour", "vacances", "croisière", "concert",
  "album", "artiste", "chanson", "conservatoire"
];

const JUNK_PREFIXES = ["firstname@", "lastname@", "user@", "username@", "name@", "yourname@", "email@", "exemple@", "example@"];

async function checkMx(domain) {
  if (!domain || !domain.includes(".")) return false;
  try {
    const res = await fetch("https://dns.google/resolve?name=" + encodeURIComponent(domain) + "&type=MX", {
      signal: AbortSignal.timeout(1800)
    });
    const d = await res.json();
    return d.Status === 0 && Array.isArray(d.Answer) && d.Answer.length > 0;
  } catch {
    return false;
  }
}

async function verifyAndScrape(c) {
  const name = c.nom_complet || "";
  const nomCom = c.nom_commercial || c.siege?.nom_commercial || "";
  const enseignes = c.siege?.liste_enseignes || [];

  const rawNames = [name, nomCom, ...enseignes].filter(Boolean);
  const candidates = [];

  for (const raw of rawNames) {
    const norm = raw.toLowerCase()
      .replace(/^(sas|sarl|sa|ste|societe)\s+/i, "")
      .replace(/\s+(sas|sarl|sa|france|industries?|group|groupe)$/i, "")
      .trim();

    const clean = norm.replace(/[^a-z0-9]/g, "");
    const cleanFull = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const words = norm.split(/[^a-z0-9]+/).filter(w => w.length > 1);

    if (clean.length >= 5) {
      candidates.push(clean + ".fr", clean + ".com", clean + ".eu", clean + "-industrie.fr", clean + "-france.fr", clean + "-france.com");
    }
    if (cleanFull.length >= 5 && cleanFull !== clean) {
      candidates.push(cleanFull + ".fr", cleanFull + ".com");
    }
    if (words.length > 1) {
      const joined = words.join("-");
      if (joined.length >= 5) {
        candidates.push(joined + ".fr", joined + ".com");
      }
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
      "http://www." + dom
    ];

    for (const u of urls) {
      try {
        const res = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(2200)
        });
        if (!res.ok) continue;
        let html = await res.text();
        html = html.replace(/[\u2000-\u200b\s]+/g, " ").toLowerCase();

        if (BLACKLIST_KEYWORDS.some(bad => html.includes(bad)) && !INDUSTRIAL_KEYWORDS.some(ind => html.includes(ind))) {
          continue;
        }

        const cleanNamePart = name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().split(/\s+/).filter(w => w.length >= 4);
        const hasIndustrialTerms = INDUSTRIAL_KEYWORDS.some(ind => html.includes(ind));
        const hasNameMatch = cleanNamePart.some(w => html.includes(w));

        if (!hasIndustrialTerms && !hasNameMatch) {
          continue;
        }

        const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
        const cleanEmails = emails.filter(e => {
          const lower = e.toLowerCase();
          if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".webp") || lower.endsWith(".js") || lower.endsWith(".css") || lower.includes("sentry") || lower.includes("wixpress") || lower.includes("schema.org") || lower.includes("example.com") || lower.includes("domain.com") || !lower.includes(dom)) {
            return false;
          }
          if (JUNK_PREFIXES.some(p => lower.startsWith(p))) return false;
          return true;
        });

        const phones = html.match(/(?:\+33\s*(?:\(0\)\s*)?[0-9][\s0-9().-]{8,15}[0-9])|(?:0[1-9][\s0-9.-]{8,13}[0-9])/g) || [];
        const cleanPhones = phones.filter(p => {
          const digits = p.replace(/\D/g, "");
          return digits.length >= 9 && digits.length <= 13 && !digits.startsWith("0000") && !p.includes("00 00 00");
        });

        if (cleanEmails.length > 0 && cleanPhones.length > 0) {
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

async function deepHarvestLoop() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log("====================================================================");
  console.log("🚀 MOTOR DE CAPTAÇÃO PROFUNDA FRANÇA (META 15.000 LEADS REAIS)");
  console.log("====================================================================");

  // Set all 8 French missions to processing
  await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', updated_at = NOW() WHERE location LIKE '%Fran%';");

  const existingStagingRes = await client.query("SELECT company_name, email FROM core_comercial.lead_prospecting_results;");
  const existingCrmRes = await client.query("SELECT company_name, email FROM core_comercial.leads;");

  const existingNames = new Set();
  const existingEmails = new Set();

  for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
    if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
    if (r.email) existingEmails.add(r.email.trim().toLowerCase());
  }

  console.log("📊 Base inicial: " + existingNames.size + " empresas / " + existingEmails.size + " e-mails.");

  let cycle = 0;
  while (true) {
    cycle++;
    console.log("\n=== INICIANDO CICLO " + cycle + " DE CAPTAÇÃO PROFUNDA (PÁGINAS 1 A 150) ===");

    for (const mapping of MISSION_NAF_MAPPING) {
      const jobRes = await client.query("SELECT * FROM core_comercial.lead_prospecting_jobs WHERE location LIKE '%Fran%' AND title LIKE $1 LIMIT 1;", ["%" + mapping.titleKeyword + "%"]);
      if (jobRes.rows.length === 0) continue;
      const job = jobRes.rows[0];

      console.log("\n🎯 [Missão " + mapping.num + "] " + job.title);

      for (const naf of mapping.nafCodes) {
        console.log("  📂 Buscando NAF Oficial " + naf + " (Até 120 páginas)...");

        for (let page = 1; page <= 120; page++) {
          try {
            const url = "https://recherche-entreprises.api.gouv.fr/search?activite_principale=" + naf + "&per_page=25&page=" + page;
            const apiRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (!apiRes.ok) continue;
            const data = await apiRes.json();
            const companies = data.results || [];
            if (companies.length === 0) break;

            const scrapeResults = await Promise.all(
              companies.map(async (c) => {
                const companyName = (c.nom_complet || c.nom_raison_sociale || "").trim();
                if (!companyName || companyName.length < 3) return null;

                const normName = companyName.toLowerCase();
                if (existingNames.has(normName)) return null;

                const scraped = await verifyAndScrape(c);
                if (!scraped || !scraped.email) return null;

                const normEmail = scraped.email.toLowerCase().trim();
                if (existingEmails.has(normEmail)) return null;

                const city = c.siege?.libelle_commune || "France";
                const postalCode = c.siege?.code_postal || "";
                const address = (c.siege?.adresse || c.siege?.libelle_voie || "Zone Industrielle") + (postalCode ? " " + postalCode : "");
                const department = c.siege?.departement || "France";

                return {
                  job_id: job.id,
                  empresa_id: job.empresa_id,
                  company_name: companyName,
                  normName,
                  email: normEmail,
                  phone: scraped.phone || null,
                  website: scraped.website,
                  address,
                  city,
                  province: department + " - France",
                  country: "França",
                  confidence_score: 99,
                  status: "raw"
                };
              })
            );

            const validLeads = scrapeResults.filter(Boolean);

            for (const lead of validLeads) {
              existingNames.add(lead.normName);
              existingEmails.add(lead.email);

              await client.query("INSERT INTO core_comercial.lead_prospecting_results (job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) ON CONFLICT DO NOTHING;", [
                lead.job_id, lead.empresa_id, lead.company_name, lead.email, lead.phone, lead.website,
                lead.address, lead.city, lead.province, lead.country, lead.confidence_score, lead.status
              ]);

              console.log("    ✓ [LEAD REAL] " + lead.company_name + " (" + lead.city + ") | " + lead.email + " | " + (lead.phone || "Tel N/A"));
            }

            if (validLeads.length > 0) {
              const countRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;", [job.id]);
              const currentCount = parseInt(countRes.rows[0].count, 10);
              await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', processed_count = $1, found_emails_count = $1, updated_at = NOW() WHERE id = $2;", [currentCount, job.id]);
            }
          } catch (err) {
            // continue next page
          }
        }
      }

      const countRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;", [job.id]);
      const currentCount = parseInt(countRes.rows[0].count, 10);
      await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', processed_count = $1, found_emails_count = $1, updated_at = NOW() WHERE id = $2;", [currentCount, job.id]);
      console.log("  📈 Total acumulado na Missão " + mapping.num + ": " + currentCount + " leads REAIS.");
    }

    console.log("\n🔄 Ciclo " + cycle + " finalizado. Reiniciando busca contínua...");
    await new Promise(r => setTimeout(r, 2000));
  }
}

deepHarvestLoop().catch(console.error);
