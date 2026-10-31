/**
 * MOTOR 100% ESTRITO HTML REAL - FRANÇA (FATUMATA - WISEOWE -> 5.000)
 * PROIBIDO CHUTAR contact@dominio.fr!
 * Só salva o lead se o site abrir de verdade (/, /contact, /mentions-legales)
 * e o endereço de e-mail estiver literalmente escrito dentro do código HTML!
 */
const dns = require('dns').promises;
const { Client } = require('pg');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '9.9.9.9']);

const DB_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const WISEOWE_ID = 'dae64d51-2181-4510-b14f-e63d2f111a8e';
const FATUMATA_ID = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';
const WISEOWE_STAGE_NOVO = '048f4587-f416-4fc2-b3c9-09c42347df95';
const TARGET_NEW_LEADS = 5000;

const BLOCKED_DOMAINS = new Set([
  'exemple.com', 'exemple.fr', 'example.com', 'domaine.fr', 'domaine.com',
  'votredomaine.fr', 'monsite.fr', 'test.com', 'test.fr', 'email.com',
  'sentry.io', 'wixpress.com', 'orange.fr', 'wanadoo.fr', 'free.fr',
  'sfr.fr', 'laposte.net', 'bbox.fr', 'neuf.fr', 'aliceadsl.fr',
  'club-internet.fr', 'numericable.fr', 'noos.fr', 'voila.fr', 'cegetel.net',
  'gmail.com', 'hotmail.fr', 'hotmail.com', 'outlook.fr', 'outlook.com',
  'yahoo.fr', 'yahoo.com', 'live.fr', 'live.com', 'icloud.com', 'msn.com', 'aol.com',
  'societe.com', 'pappers.fr', 'verif.com', 'infogreffe.fr', 'pagesjaunes.fr',
  'kompass.com', 'europages.fr', 'linkedin.com', 'facebook.com', 'wordpress.org', 'wordpress.com'
]);

const PARKED_TITLE_REGEX = /sedoparking|parking|domain for sale|en vente|en construction|site en maintenance|page par d[eé]faut|ovhcloud|f[eé]licitations|index of \/|default web site|403 forbidden|404 not found|account suspended/i;

function decodeCfEmail(encodedString) {
  try {
    let email = '';
    const r = parseInt(encodedString.substr(0, 2), 16);
    for (let n = 2; encodedString.length - n; n += 2) {
      const i = parseInt(encodedString.substr(n, 2), 16) ^ r;
      email += String.fromCharCode(i);
    }
    return email;
  } catch {
    return '';
  }
}

function extractRealEmailsFromHtml(rawHtml, targetDomain) {
  if (!rawHtml) return [];
  let html = rawHtml
    .replace(/&#64;/g, '@')
    .replace(/&#x40;/gi, '@')
    .replace(/&#46;/g, '.')
    .replace(/&#x2e;/gi, '.')
    .replace(/\[at\]|\(at\)|\[arobase\]/gi, '@');

  const cfMatches = html.match(/data-cfemail=["']([a-fA-F0-9]+)["']/g) || [];
  for (const m of cfMatches) {
    const hex = m.replace(/data-cfemail=["']|["']/g, '');
    const decoded = decodeCfEmail(hex);
    if (decoded && decoded.includes('@')) html += ` ${decoded} `;
  }

  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const validSame = [];
  const validCorp = [];

  for (const rawE of matches) {
    const e = rawE.toLowerCase().trim().replace(/^[.,;:]+|[.,;:]+$/g, '');
    if (e.length < 6 || e.length > 80) continue;
    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|ico|pdf|mp4|mp3|zip)$/i.test(e)) continue;
    if (/^(2x|3x|100x|200x|300x|400x|500x)/i.test(e)) continue;
    if (e.includes('sentry') || e.includes('wix') || e.includes('wordpress') || e.includes('prestashop') || e.includes('example') || e.includes('exemple') || e.includes('domaine') || e.includes('votre@') || e.includes('nom@') || e.includes('email@') || e.startsWith('webmaster@')) continue;

    const [user, dom] = e.split('@');
    if (!user || !dom || BLOCKED_DOMAINS.has(dom)) continue;
    if (!/^[a-z0-9.-]+\.[a-z]{2,8}$/.test(dom)) continue;

    if (dom === targetDomain || dom.endsWith(`.${targetDomain}`)) {
      if (!validSame.includes(e)) validSame.push(e);
    } else {
      if (!validCorp.includes(e)) validCorp.push(e);
    }
  }

  return validSame.length > 0 ? validSame : validCorp;
}

async function fetchHtml(url, timeoutMs = 2200) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const visitedDomains = new Set();

async function verifyAndScrapeRealFrenchSite(domain, fallbackName) {
  if (visitedDomains.has(domain)) return null;
  visitedDomains.add(domain);

  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1300))
    ]);
    if (!Array.isArray(mx) || mx.length === 0) return null;
  } catch {
    return null;
  }

  const baseUrls = [`https://${domain}`, `https://www.${domain}`];
  let homeHtml = null;
  let workingBase = null;
  for (const b of baseUrls) {
    const h = await fetchHtml(b, 2200);
    if (h && h.length > 250) {
      homeHtml = h;
      workingBase = b;
      break;
    }
  }
  if (!homeHtml || !workingBase) return null;

  let cleanTitle = fallbackName;
  const tMatch = homeHtml.match(/<title[^>]*>([\s\S]{2,120}?)<\/title>/i);
  if (tMatch) {
    const t = tMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (PARKED_TITLE_REGEX.test(t)) return null;
    const firstPart = t.split(/[|\-–—·•]/)[0].trim();
    if (firstPart.length >= 3 && !/^(accueil|home|bienvenue|index)$/i.test(firstPart)) {
      cleanTitle = firstPart.slice(0, 120);
    }
  }

  if (PARKED_TITLE_REGEX.test(homeHtml.slice(0, 2500))) return null;

  let foundPhone = null;
  const pm = homeHtml.match(/(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/);
  if (pm) foundPhone = pm[0].trim();

  let emails = extractRealEmailsFromHtml(homeHtml, domain);
  if (emails.length === 0) {
    const subPaths = ['/contact', '/mentions-legales', '/nous-contacter'];
    const linkMatches = homeHtml.match(/href=["']([^"']*(?:contact|mention|legal)[^"']*)["']/gi) || [];
    for (const lm of linkMatches.slice(0, 2)) {
      const href = lm.replace(/^href=["']|["']$/gi, '').trim();
      if (href.startsWith('/') && !subPaths.includes(href)) subPaths.unshift(href);
    }
    for (const sp of subPaths.slice(0, 2)) {
      const subHtml = await fetchHtml(`${workingBase}${sp}`, 1900);
      if (subHtml && subHtml.length > 200) {
        if (!foundPhone) {
          const pm2 = subHtml.match(/(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/);
          if (pm2) foundPhone = pm2[0].trim();
        }
        const subE = extractRealEmailsFromHtml(subHtml, domain);
        if (subE.length > 0) {
          emails = subE;
          break;
        }
      }
    }
  }

  // REGRA DE OURO: NUNCA CHUTAR contact@! Só retorna se achou e-mail real escrito no HTML!
  if (emails.length === 0) return null;

  return {
    email: emails[0],
    phone: foundPhone,
    companyName: cleanTitle || fallbackName
  };
}

// Novos setores industriais e B2B franceses ainda não varridos!
const FR_SECTORS = [
  { prefix: 'equipement', label: 'Équipement Industriel' },
  { prefix: 'industrie', label: 'Industrie & Production' },
  { prefix: 'technologies', label: 'Technologies Industrielles' },
  { prefix: 'systemes', label: 'Systèmes Industriels' },
  { prefix: 'solutions', label: 'Solutions Industrielles' },
  { prefix: 'concept', label: 'Conception & Réalisation Industrielle' },
  { prefix: 'ferronnerie', label: 'Ferronnerie & Métallerie' },
  { prefix: 'miroiterie', label: 'Miroiterie & Fermetures Aluminium' },
  { prefix: 'fermetures', label: 'Fermetures Industrielles & Portails' },
  { prefix: 'portails', label: 'Portails & Automatismes' },
  { prefix: 'ascenseurs', label: 'Ascenseurs & Monte-Charges' },
  { prefix: 'froid', label: 'Froid Industriel & Commercial' },
  { prefix: 'ventilation', label: 'Ventilation & Aéraulique Industrielle' },
  { prefix: 'solaire', label: 'Énergie Solaire & Photovoltaïque' },
  { prefix: 'energies', label: 'Énergies & Installations' },
  { prefix: 'echafaudage', label: 'Échafaudage & Accès en Hauteur' },
  { prefix: 'platrerie', label: 'Plâtrerie & Isolation' },
  { prefix: 'menuisier', label: 'Menuiserie & Agencement' },
  { prefix: 'plombier', label: 'Plomberie & Chauffage' },
  { prefix: 'electricien', label: 'Électricité Générale & Industrielle' },
  { prefix: 'chauffagiste', label: 'Chauffage & Génie Climatique' },
  { prefix: 'couvreur', label: 'Couverture & Zinguerie' },
  { prefix: 'macon', label: 'Maçonnerie & Bâtiment' },
  { prefix: 'peintre', label: 'Peinture & Revêtements' },
  { prefix: 'serrurier', label: 'Serrurerie & Métallerie' },
  { prefix: 'charpentier', label: 'Charpente & Construction' },
  { prefix: 'carreleur', label: 'Carrelage & Sols' },
  { prefix: 'plaquiste', label: 'Plâtrerie & Isolation' },
  { prefix: 'vitrier', label: 'Vitrerie & Miroiterie' },
  { prefix: 'terrassier', label: 'Terrassement & VRD' },
  { prefix: 'paysagiste', label: 'Aménagement Extérieur' },
  { prefix: 'architecte', label: 'Architecture & Maîtrise d Oeuvre' },
  { prefix: 'ingenierie', label: 'Ingénierie & Bureau d Études' },
  { prefix: 'imprimerie', label: 'Imprimerie & Industries Graphiques' },
  { prefix: 'signaletique', label: 'Signalétique & Enseignes' },
  { prefix: 'enseignes', label: 'Enseignes & Structures' },
  { prefix: 'nettoyage', label: 'Nettoyage Industriel & Propreté' },
  { prefix: 'proprete', label: 'Propreté & Services aux Entreprises' },
  { prefix: 'securite', label: 'Sécurité & Protection Incendie' },
  { prefix: 'informatique', label: 'Informatique & Réseaux' },
  { prefix: 'constructions', label: 'Constructions & Bâtiment' },
  { prefix: 'renovations', label: 'Rénovation & Bâtiment' },
  { prefix: 'clim', label: 'Climatisation & Pompe à Chaleur' },
  { prefix: 'automatismes', label: 'Automatismes & Fermetures' },
  { prefix: 'stores', label: 'Stores & Fermetures' },
  { prefix: 'volets', label: 'Fermetures & Menuiseries' },
  { prefix: 'fenetres', label: 'Menuiseries & Fenêtres' },
  { prefix: 'verandas', label: 'Vérandas & Structures Aluminium' },
  { prefix: 'clotures', label: 'Clôtures & Portail Industriel' },
  { prefix: 'piscines', label: 'Construction & Équipement Piscines' },
  { prefix: 'bois', label: 'Industrie du Bois & Scierie' },
  { prefix: 'scierie', label: 'Scierie & Transformation du Bois' },
  { prefix: 'toiture', label: 'Toiture & Couverture Industrielle' },
  { prefix: 'facade', label: 'Façade & Isolation Extérieure' },
  { prefix: 'facades', label: 'Façades & Ravalement' },
  { prefix: 'sols', label: 'Sols Industriels & Résine' },
  { prefix: 'parquet', label: 'Parquet & Revêtements' },
  { prefix: 'marbrerie', label: 'Marbrerie & Taille de Pierre' },
  { prefix: 'pierre', label: 'Pierre & Maçonnerie' },
  { prefix: 'beton', label: 'Béton & Préfabrication' },
  { prefix: 'granulats', label: 'Granulats & Carrières' },
  { prefix: 'tp', label: 'Travaux Publics & Génie Civil' },
  { prefix: 'assainissement', label: 'Assainissement & Environnement' },
  { prefix: 'forage', label: 'Forage & Sondage' },
  { prefix: 'topographie', label: 'Topographie & Géomètre' },
  { prefix: 'geometre', label: 'Géomètre & Bureau d Études' },
  { prefix: 'expertise', label: 'Expertise Technique & Bâtiment' },
  { prefix: 'diagnostic', label: 'Diagnostic Immobilier & Technique' },
  { prefix: 'controle', label: 'Contrôle Technique & Industriel' },
  { prefix: 'formation', label: 'Formation Professionnelle' },
  { prefix: 'conseil', label: 'Conseil & Ingénierie' },
  { prefix: 'service', label: 'Services Industriels' },
  { prefix: 'services', label: 'Services aux Entreprises' },
  { prefix: 'diffusion', label: 'Diffusion & Distribution Industrielle' },
  { prefix: 'distribution', label: 'Distribution & Négoce' },
  { prefix: 'negoce', label: 'Négoce de Matériaux & Fournitures' },
  { prefix: 'quincaillerie', label: 'Quincaillerie & Fournitures Industrielles' },
  { prefix: 'machines', label: 'Machines & Équipements Industriels' },
  { prefix: 'moteurs', label: 'Moteurs & Bobinage' },
  { prefix: 'pompes', label: 'Pompes & Systèmes Hydrauliques' },
  { prefix: 'electronique', label: 'Électronique Industrielle' },
  { prefix: 'alu', label: 'Aluminium & Menuiserie Métallique' },
  { prefix: 'aluminium', label: 'Construction Aluminium' },
  { prefix: 'inox', label: 'Chaudronnerie & Tuyauterie Inox' },
  { prefix: 'composites', label: 'Matériaux Composites' },
  { prefix: 'vitrerie', label: 'Vitrerie & Miroiterie' },
  { prefix: 'communication', label: 'Communication & Signalétique' },
  { prefix: 'agence', label: 'Agence & Services' },
  { prefix: 'ateliers', label: 'Ateliers Industriels' },
  { prefix: 'maison', label: 'Construction & Habitat' },
  { prefix: 'garage', label: 'Mécanique & Carrosserie' },
  { prefix: 'carrosserie', label: 'Carrosserie Industrielle & Auto' },
  { prefix: 'depannage', label: 'Dépannage & Maintenance' },
  { prefix: 'auto', label: 'Automobile & Mécanique' },
  { prefix: 'automobiles', label: 'Négoce & Réparation Automobile' },
  { prefix: 'marine', label: 'Marine & Nautisme' },
  { prefix: 'agricole', label: 'Matériel Agricole & Mécanique' },
  { prefix: 'motoculture', label: 'Motoculture & Parcs' },
  { prefix: 'environnement', label: 'Environnement & Recyclage' },
  { prefix: 'recyclage', label: 'Recyclage & Valorisation' },
  { prefix: 'transport', label: 'Transport Routier & Logistique' },
  { prefix: 'taxi', label: 'Transport de Personnes' },
  { prefix: 'ambulance', label: 'Transport Sanitaire' },
  { prefix: 'autocars', label: 'Transport de Voyageurs' },
  { prefix: 'immobilier', label: 'Immobilier d Entreprise & Commercial' },
  { prefix: 'immo', label: 'Agence Immobilière' },
  { prefix: 'habitat', label: 'Habitat & Rénovation' },
  { prefix: 'cuisines', label: 'Cuisines & Agencement' },
  { prefix: 'meubles', label: 'Meubles & Ébénisterie' },
  { prefix: 'mobilier', label: 'Mobilier Professionnel' },
  { prefix: 'agencement', label: 'Agencement & Menuiserie' },
  { prefix: 'decoration', label: 'Décoration & Peinture' }
];

const FR_CITIES_AND_NAMES = [
  'lyon', 'paris', 'marseille', 'toulouse', 'nantes', 'bordeaux', 'lille', 'rennes', 'strasbourg',
  'grenoble', 'rouen', 'toulon', 'montpellier', 'nice', 'angers', 'dijon', 'brest', 'lemans',
  'clermont', 'amiens', 'limoges', 'annecy', 'perpignan', 'metz', 'besancon', 'orleans', 'mulhouse',
  'caen', 'boulogne', 'nancy', 'saintetienne', 'argenteuil', 'montreuil', 'roubaix', 'tourcoing',
  'dunkerque', 'avignon', 'poitiers', 'versailles', 'courbevoie', 'vitry', 'pau', 'larochelle',
  'calais', 'cannes', 'antibes', 'lorient', 'saintnazaire', 'colmar', 'valence', 'quimper',
  'bourges', 'troyes', 'cherbourg', 'chambery', 'niort', 'laval', 'beauvais', 'cholet', 'vannes',
  'saintmalo', 'arras', 'albi', 'tarbes', 'bayonne', 'angouleme', 'brive', 'perigueux', 'agen',
  'montauban', 'rodez', 'castres', 'narbonne', 'beziers', 'sete', 'ales', 'nimes', 'arles',
  'salon', 'martigues', 'aubagne', 'frejus', 'gap', 'briancon', 'romans', 'montelimar',
  'vienne', 'bourgoin', 'voiron', 'thonon', 'annemasse', 'cluses', 'sallanches', 'albertville',
  'aix', 'bourg', 'oyonnax', 'macon', 'chalon', 'lecreusot', 'montceau', 'nevers', 'auxerre',
  'sens', 'vesoul', 'belfort', 'montbeliard', 'pontarlier', 'lons', 'dole', 'epinal', 'saintdie',
  'verdun', 'barleduc', 'thionville', 'forbach', 'sarreguemines', 'haguenau', 'selestat', 'saverne',
  'reims', 'chalons', 'epernay', 'charleville', 'sedan', 'saintquentin', 'soissons', 'laon',
  'compiegne', 'creil', 'senlis', 'abbeville', 'bethune', 'lens', 'lievin', 'henin', 'douai',
  'valenciennes', 'maubeuge', 'cambrai', 'evreux', 'vernon', 'louviers', 'dieppe', 'lehavre',
  'fecamp', 'lisieux', 'bayeux', 'vire', 'flers', 'alencon', 'argentan', 'chartres', 'dreux',
  'chateaudun', 'blois', 'vendome', 'romorantin', 'tours', 'chinon', 'amboise', 'chateauroux',
  'issoudun', 'vierzon', 'montlucon', 'moulins', 'vichy', 'riom', 'issoire', 'thiers', 'aurillac',
  'lepuy', 'gueret', 'tulle', 'ussel', 'cognac', 'saintes', 'rochefort', 'royan', 'bressuire',
  'parthenay', 'thouars', 'chatellerault', 'fontenay', 'laroche', 'lessables', 'challans',
  'herbiers', 'saumur', 'mayenne', 'sable', 'lafleche', 'fougeres',
  'vitre', 'redon', 'dinan', 'guingamp', 'lannion', 'lamballe', 'loudeac', 'pontivy', 'auray',
  'ploermel', 'concarneau', 'morlaix', 'douarnenez', 'landerneau', 'carhaix',
  'nord', 'sud', 'est', 'ouest', 'centre', 'atlantique', 'mediterranee', 'rhone', 'alpes',
  'loire', 'bretagne', 'normandie', 'picardie', 'alsace', 'lorraine', 'champagne', 'bourgogne',
  'auvergne', 'limousin', 'aquitaine', 'provence', 'languedoc', 'roussillon', 'savoie', 'jura',
  'vendee', 'anjou', 'maine', 'touraine', 'berry', 'poitou', 'charente', 'perigord', 'gascogne',
  'martin', 'bernard', 'thomas', 'petit', 'robert', 'richard', 'durand', 'dubois', 'moreau',
  'laurent', 'simon', 'michel', 'lefebvre', 'leroy', 'roux', 'david', 'bertrand', 'morel',
  'fournier', 'girard', 'bonnet', 'dupont', 'lambert', 'fontaine', 'rousseau', 'vincent',
  'muller', 'lefevre', 'faure', 'andre', 'mercier', 'blanc', 'guerin', 'boyer', 'garnier',
  'chevalier', 'francois', 'legrand', 'gauthier', 'garcia', 'perrin', 'robin', 'clement',
  'morin', 'nicolas', 'henry', 'roussel', 'mathieu', 'gautier', 'masson', 'marchand', 'duval',
  'denis', 'dumont', 'marie', 'lemaire', 'noel', 'meyer', 'dufour', 'meunier', 'brun', 'blanchard',
  'giraud', 'joly', 'riviere', 'lucas', 'brunet', 'gaillard', 'barbier', 'arnaud', 'martinez',
  'gerard', 'roche', 'renard', 'schmitt', 'roy', 'leroux', 'colin', 'vidal', 'caron', 'picard',
  'roger', 'fabre', 'aubert', 'lemoine', 'renaud', 'dumas', 'lacroix', 'olivier', 'philippe',
  'bourgeois', 'pierre', 'benoit', 'rey', 'leclerc', 'payet', 'rolland', 'leclercq', 'guillaume',
  'lecomte', 'lopez', 'jean', 'dupuy', 'guillot', 'hubert', 'berger', 'carpentier', 'sanchez',
  'dupuis', 'moulin', 'louis', 'deschamps', 'huet', 'vasseur', 'perez', 'boucher', 'fleury',
  'royer', 'klein', 'jacquet', 'adam', 'poirier', 'marty', 'aubry', 'guyot', 'carre',
  'charles', 'renault', 'menard', 'maillard', 'baron', 'bertin', 'bailly',
  'herve', 'schneider', 'fernandez', 'legall', 'collet', 'leger', 'bouvier', 'julien', 'prevost',
  'millet', 'perrot', 'daniel', 'cousin', 'germain', 'breton', 'besson', 'langlois',
  'remy', 'legoff', 'pelletier', 'leveque', 'perrier', 'leblanc', 'barre', 'lebrun', 'marchal'
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const existingRes = await client.query(`
    SELECT lower(trim(email)) as email
    FROM core_comercial.leads
    WHERE email IS NOT NULL
  `);

  const existingEmails = new Set();
  const existingDomains = new Set();

  for (const r of existingRes.rows) {
    if (r.email) {
      existingEmails.add(r.email);
      const d = r.email.split('@')[1];
      if (d) {
        existingDomains.add(d);
        visitedDomains.add(d);
      }
    }
  }

  const countVirginRes = await client.query(`
    SELECT count(*) as cnt
    FROM core_comercial.leads l
    WHERE l.empresa_id = $1
      AND l.assigned_to = $2
      AND NOT ('Bounce' = ANY(COALESCE(l.tags, ARRAY[]::text[])))
      AND NOT ('E-mail Inválido' = ANY(COALESCE(l.tags, ARRAY[]::text[])))
      AND NOT EXISTS (
        SELECT 1 FROM core_comercial.marketing_campaign_queue q
        WHERE q.lead_id = l.id AND q.status = 'sent'
      )
  `, [WISEOWE_ID, FATUMATA_ID]);

  let currentNewCount = parseInt(countVirginRes.rows[0].cnt, 10) || 0;
  console.log(`🇫🇷 [FRANÇA ESTRITO HTML WAVE 2] Leads 100% reais atuais: ${currentNewCount} / Meta: ${TARGET_NEW_LEADS}`);

  const candidates = [];
  for (const sec of FR_SECTORS) {
    for (const suf of FR_CITIES_AND_NAMES) {
      const cleanSuf = suf.replace(/[^a-z0-9]/g, '');
      const defaultName = `${sec.prefix.charAt(0).toUpperCase() + sec.prefix.slice(1)} ${suf.charAt(0).toUpperCase() + suf.slice(1)}`;
      const d1 = `${sec.prefix}-${cleanSuf}.fr`;
      const d2 = `${sec.prefix}${cleanSuf}.fr`;
      const d3 = `${cleanSuf}-${sec.prefix}.fr`;
      const d4 = `${cleanSuf}${sec.prefix}.fr`;
      if (!existingDomains.has(d1)) candidates.push({ domain: d1, defaultName, sector: sec.label });
      if (!existingDomains.has(d2)) candidates.push({ domain: d2, defaultName, sector: sec.label });
      if (!existingDomains.has(d3)) candidates.push({ domain: d3, defaultName, sector: sec.label });
      if (!existingDomains.has(d4)) candidates.push({ domain: d4, defaultName, sector: sec.label });
    }
  }

  console.log(`Total novos candidatos industriais .fr para verificação estrita HTML: ${candidates.length}`);

  const CHUNK_SIZE = 70;
  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    if (currentNewCount >= TARGET_NEW_LEADS) break;
    const chunk = candidates.slice(i, i + CHUNK_SIZE);

    const verified = (await Promise.all(chunk.map(async c => {
      if (existingDomains.has(c.domain)) return null;
      const res = await verifyAndScrapeRealFrenchSite(c.domain, c.defaultName);
      if (!res) return null;
      return { ...c, ...res };
    }))).filter(Boolean);

    for (const item of verified) {
      if (currentNewCount >= TARGET_NEW_LEADS) break;
      const emailDomain = item.email.split('@')[1];
      if (existingEmails.has(item.email) || existingDomains.has(item.domain) || existingDomains.has(emailDomain)) continue;

      existingEmails.add(item.email);
      existingDomains.add(item.domain);
      existingDomains.add(emailDomain);

      try {
        await client.query(`
          INSERT INTO core_comercial.leads (
            name, company_name, email, phone, empresa_id, assigned_to, stage_id, tags, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ARRAY['França', 'B2B', $8, 'HTML Verificado 100% Real', 'Mailing Fatumata - Novos Capturados França 2026'],
            NOW(), NOW()
          )
        `, [
          item.companyName,
          item.companyName,
          item.email,
          item.phone || null,
          WISEOWE_ID,
          FATUMATA_ID,
          WISEOWE_STAGE_NOVO,
          item.sector
        ]);
        currentNewCount++;
        if (currentNewCount % 25 === 0 || currentNewCount >= TARGET_NEW_LEADS) {
          console.log(`🇫🇷 [FATUMATA 100% HTML REAL] ${currentNewCount}/${TARGET_NEW_LEADS} | ${item.companyName} (${item.email})`);
        }
      } catch {
        // ignore duplicate
      }
    }
  }

  console.log(`✅ [FRANÇA ESTRITO HTML CONCLUÍDO] Total: ${currentNewCount}`);
  await client.end();
}

main().catch(console.error);
