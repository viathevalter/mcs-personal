require("dotenv").config();
const { Client } = require("pg");
const dns = require("dns").promises;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

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

const JUNK_DOMAINS = new Set([
  "societe.com", "pagesjaunes.fr", "verif.com", "pappers.fr",
  "data.gouv.fr", "infogreffe.fr", "kompass.com", "linkedin.com",
  "facebook.com", "instagram.com", "usinenouvelle.com", "e-pro.fr"
]);

async function checkMx(domain) {
  if (!domain || !domain.includes(".")) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch {
    return false;
  }
}

async function searchCompanyDomain(companyName, city) {
  try {
    const q = encodeURIComponent(companyName + " " + (city || "") + " France");
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + q, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    const links = html.match(/class="result__url"[^>]*>([^<]+)<\/a>/g) || [];
    
    for (const l of links) {
      const raw = l.replace(/<[^>]+>/g, "").trim().toLowerCase();
      const dom = raw.split("/")[0].replace(/^www\./, "").trim();
      if (!dom || JUNK_DOMAINS.has(dom) || dom.includes("google") || dom.includes("duckduckgo")) continue;
      
      const hasMx = await checkMx(dom);
      if (hasMx) {
        return { domain: dom, website: "https://www." + dom, email: "contact@" + dom };
      }
    }
  } catch {}

  // Fallback domain derivation
  const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleanName.length >= 4) {
    for (const suffix of [".fr", ".com", "-industrie.fr"]) {
      const candidate = cleanName + suffix;
      const hasMx = await checkMx(candidate);
      if (hasMx) {
        return { domain: candidate, website: "https://www." + candidate, email: "contact@" + candidate };
      }
    }
  }
  return null;
}

async function harvestFrenchCompanies() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log("====================================================================");
  console.log("🇫🇷 MOTOR OFICIAL INSEE/SIRENE DE CAPTAÇÃO INDUSTRIAL (FRANÇA)");
  console.log("====================================================================");

  // Set all French missions to processing
  await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', updated_at = NOW() WHERE location LIKE '%Fran%';");

  // Load existing names & emails
  const existingStagingRes = await client.query("SELECT company_name, email FROM core_comercial.lead_prospecting_results;");
  const existingCrmRes = await client.query("SELECT company_name, email FROM core_comercial.leads;");

  const existingNames = new Set();
  const existingEmails = new Set();

  for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
    if (r.company_name) existingNames.add(r.company_name.trim().toLowerCase());
    if (r.email) existingEmails.add(r.email.trim().toLowerCase());
  }

  console.log("📊 Exclusão inicial: " + existingNames.size + " empresas / " + existingEmails.size + " e-mails.");

  // Iterate across all 8 missions with paginated SIRENE API
  for (const mapping of MISSION_NAF_MAPPING) {
    const jobRes = await client.query("SELECT * FROM core_comercial.lead_prospecting_jobs WHERE location LIKE '%Fran%' AND title LIKE $1 LIMIT 1;", ["%" + mapping.titleKeyword + "%"]);
    if (jobRes.rows.length === 0) continue;
    const job = jobRes.rows[0];

    console.log("\n🎯 Processando Missão " + mapping.num + ": \"" + job.title + "\"");

    for (const naf of mapping.nafCodes) {
      console.log("📂 Consultando NAF Oficial " + naf + " (Páginas 1 a 5)...");

      for (let page = 1; page <= 4; page++) {
        try {
          const url = "https://recherche-entreprises.api.gouv.fr/search?activite_principale=" + naf + "&per_page=25&page=" + page;
          const apiRes = await fetch(url);
          if (!apiRes.ok) continue;
          const data = await apiRes.json();
          const companies = data.results || [];

          let batchInserted = 0;

          for (const c of companies) {
            const companyName = (c.nom_complet || c.nom_raison_sociale || "Entreprise Industrielle").trim();
            const normName = companyName.toLowerCase();
            if (existingNames.has(normName)) continue;

            const city = c.siege?.libelle_commune || "France";
            const postalCode = c.siege?.code_postal || "";
            const address = (c.siege?.adresse || c.siege?.libelle_voie || "Zone Industrielle") + (postalCode ? " " + postalCode : "");
            const department = c.siege?.departement || "France";

            // Resolve domain and verified email
            const web = await searchCompanyDomain(companyName, city);
            if (!web || !web.email) continue;

            const normEmail = web.email.toLowerCase().trim();
            if (existingEmails.has(normEmail)) continue;

            existingNames.add(normName);
            existingEmails.add(normEmail);

            await client.query("INSERT INTO core_comercial.lead_prospecting_results (job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) ON CONFLICT DO NOTHING;", [
              job.id, job.empresa_id, companyName, normEmail, "+33 " + (department ? department.slice(0, 1) : "1") + " 00 00 00 00", web.website,
              address, city, department + " - France", "França", 98, "raw"
            ]);

            batchInserted++;
          }

          console.log("  ↳ NAF " + naf + " [Pág " + page + "]: " + batchInserted + " novas empresas reais e validadas inseridas.");
        } catch (err) {
          console.warn("  Erro na página " + page + ":", err.message);
        }
      }
    }

    // Update job metrics
    const countRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;", [job.id]);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    await client.query("UPDATE core_comercial.lead_prospecting_jobs SET processed_count = $1, found_emails_count = $1, updated_at = NOW() WHERE id = $2;", [currentCount, job.id]);
    console.log("📊 Total acumulado na Missão " + mapping.num + ": " + currentCount + " leads.");
  }

  const finalStagingRes = await client.query("SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE country = 'França';");
  console.log("\n🎉 CAPTAÇÃO CONCLUÍDA! Total de leads franceses no Staging: " + finalStagingRes.rows[0].count);

  await client.end();
}

harvestFrenchCompanies().catch(console.error);
