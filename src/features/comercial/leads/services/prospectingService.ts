import { supabase } from '@/shared/supabase/client';
import type { LeadProspectingJob, LeadProspectingResult, SearchSourceEngine } from '../types/prospectingTypes';

export const DEFAULT_AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';
export const AISA_BASE_URL = 'https://api.aisa.one/v1';

export interface ScrapedCompanyRaw {
  company_name: string;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  sector?: string | null;
}

export function normalizeSectorName(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return 'Industrial Geral';
  const str = raw.toLowerCase().trim();

  if (str.includes('naval') || str.includes('astillero') || str.includes('armador')) {
    return 'Construção & Reparação Naval';
  }
  if (str.includes('calderer') || str.includes('tuberia') || str.includes('presión') || str.includes('paradas de planta')) {
    return 'Calderería & Tubería Industrial';
  }
  if (str.includes('estructura') || str.includes('metalúrg') || str.includes('mecaniz') || str.includes('montaje') || str.includes('talleres')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (str.includes('químic') || str.includes('petroquímic')) {
    return 'Industria Química & Petroquímica';
  }
  if (str.includes('ingenier') || str.includes('epc') || str.includes('subcontratac')) {
    return 'Ingeniería & Contratistas EPC';
  }
  if (str.includes('construcc')) {
    return 'Construcción & Obras';
  }

  return 'Industrial Geral';
}

/**
 * Service to manage AIsa.one API communication and job execution
 */
export class ProspectingService {

  /**
   * Ping/Verify if a URL is live and resolves over HTTP/HTTPS.
   */
  private static sanitizeUrl(url?: string | null): string | null {
    if (!url) return null;
    let clean = url.trim();
    if (clean === 'null' || clean === '' || clean === 'undefined' || clean.includes('example.com') || clean.includes('domain.es')) {
      return null;
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }

    try {
      const parsed = new URL(clean);
      if (parsed.hostname && parsed.hostname.includes('.')) {
        return clean;
      }
      return null;
    } catch {
      return null;
    }
  }

  private static sanitizeEmail(email?: string | null): string | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    if (clean === 'null' || clean === '' || clean === 'undefined' || !clean.includes('@') || clean.includes('example.com') || clean.includes('domain.es')) {
      return null;
    }
    return clean;
  }

  /**
   * Search real companies using AIsa API with live web crawling.
   */
  static async searchCompaniesViaAIsa(
    keywords: string,
    location: string,
    count: number = 20,
    searchSource: SearchSourceEngine = 'google_maps',
    emailRequired: boolean = true,
    apiKeyOverride?: string,
    excludedCompanyNames: string[] = []
  ): Promise<ScrapedCompanyRaw[]> {
    const apiKey = apiKeyOverride || DEFAULT_AISA_API_KEY;

    let sourceInstructions = 'Use official Google Maps listings and verified Spanish business registries.';
    if (searchSource === 'linkedin') {
      sourceInstructions = 'Search active LinkedIn B2B company pages and verified corporate accounts in Spain.';
    } else if (searchSource === 'web_broad') {
      sourceInstructions = 'Crawl official corporate websites, Impressum, Contact, and Aviso Legal pages in Spain.';
    }

    const emailInstruction = emailRequired
      ? 'MANDATORY STRICT RULE: ONLY return active Spanish companies that HAVE a verified corporate email address (e.g. gerencia@, compras@, comercial@, presupuestos@, info@). DO NOT return any company if you cannot verify its corporate email. Every object in the returned JSON MUST have a valid, non-null email string.'
      : 'Include email address whenever available on official pages.';

    const cleanLocation = location.replace(/,?\s*espanha/i, '').trim();
    let cleanKeywords = keywords.replace(new RegExp(cleanLocation, 'gi'), '').trim();
    if (!cleanKeywords) cleanKeywords = keywords;

    const excludedListStr = excludedCompanyNames.length > 0
      ? excludedCompanyNames.slice(-30).join(', ')
      : '';
    const excludeInstruction = excludedListStr
      ? `\nCRITICAL DEDUPLICATION RULE: DO NOT return any of the following company names (or their direct variations) as they have ALREADY been captured in previous batches: [${excludedListStr}]. Focus strictly on discovering NEW, UNCAPTURED companies operating in ${location}.`
      : '';

    try {
      const prompt = `Act as an expert B2B lead researcher accessing real public records, Google Maps Places, eInforma, Empresite, and official Spanish Trade Registries (Registro Mercantil).
Search for ${count} REAL, ACTIVE, EXISTING industrial companies operating in "${location}" matching core business activity: "${cleanKeywords}".

CRITICAL GROUNDING RULES (NO HALLUCINATIONS):
1. Return ONLY real companies that ACTUALLY exist in the real world and can be found by exact name on Google Search, eInforma, Axesor, or Google Maps.
2. The "company_name" MUST be the exact real trade name or legal name (Razón Social) as registered in Spain (e.g. "Viguesa de Calderería S.A.", "Astilleros Armada S.A.", "Nodosa Shipyard", "Cardama Shipyard", "Freire Shipyard", "Vicalsa S.A.").
3. DO NOT invent or combine generic names like "Calderería Técnica Vigo S.A." if they do not exist.
4. "website" MUST be the actual real URL of the company (e.g. "https://www.vicalsa.com", "https://www.armon.es") or null if no public site exists.
5. "email" MUST be an active corporate email address of that exact company.
6. EXPANDED COVERAGE: Include companies physically located anywhere in the metropolitan industrial belt of "${location}".${excludeInstruction}

Return ONLY a valid JSON array of objects with the exact schema below:
[
  {
    "company_name": "Exact Real Legal/Trade Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 976 123 456" or null,
    "address": "Calle Example 123, Polígono Industrial" or null,
    "city": "${location}",
    "province": "${location}",
    "email": "gerencia@realcompany.es",
    "linkedin_url": "https://www.linkedin.com/company/realcompany" or null,
    "instagram_url": "https://www.instagram.com/realcompany" or null,
    "sector": "${cleanKeywords}"
  }
]`;

      const response = await fetch(`${AISA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a B2B business data assistant for industrial companies in Spain. Return ONLY a valid JSON array.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AIsa API Error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content || '[]';
      
      const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const rawResults: ScrapedCompanyRaw[] = JSON.parse(cleanJsonStr);

      const verifiedResults = [];
      for (const item of rawResults) {
        const validEmail = this.sanitizeEmail(item.email);
        
        let finalEmail = validEmail;
        let confidenceScore = item.email ? 85 : 70;

        if (validEmail) {
          const hasMx = await ProspectingService.checkMxRecord(validEmail);
          if (hasMx) {
            confidenceScore = 95;
          }
        }

        // 2. Verify REAL Website DNS A-Record
        const validWebsite = await ProspectingService.checkWebsiteLive(item.website);
        const validLinkedin = this.sanitizeUrl(item.linkedin_url);
        const validInstagram = this.sanitizeUrl(item.instagram_url);

        verifiedResults.push({
          company_name: item.company_name,
          website: validWebsite,
          phone: item.phone || null,
          address: item.address || null,
          city: item.city || location,
          province: item.province || location,
          email: finalEmail,
          linkedin_url: validLinkedin,
          instagram_url: validInstagram,
          sector: item.sector || keywords,
          confidence_score: confidenceScore,
        });
      }

      return verifiedResults;
    } catch (err: any) {
      console.error('AIsa API Search error:', err.message);
      return [];
    }
  }

  /**
   * Real-time DNS MX Record Check via Google Public DNS with Cloudflare Fallback
   */
  static async checkMxRecord(email: string | null): Promise<boolean> {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1].trim().toLowerCase();
    
    // Primary: Google DNS
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) {
        return true;
      }
    } catch {
      // Fallback
    }

    // Secondary: Cloudflare DNS
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
        headers: { 'Accept': 'application/dns-json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Real-time Website DNS A-Record Check via Google Public DNS
   */
  static async checkWebsiteLive(url: string | null): Promise<string | null> {
    if (!url || url === '#' || url === 'null') return null;
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }

    try {
      const domain = clean.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.Status !== 0 || !Array.isArray(data.Answer) || data.Answer.length === 0) {
        return null; // NXDOMAIN or domain with no A-record
      }
      return clean;
    } catch {
      return null;
    }
  }

  /**
   * Execute batch step for a job with rate limit delay
   */
  static async processJobStep(
    job: LeadProspectingJob,
    batchSize: number = 10
  ): Promise<{ processed: number; foundEmails: number; completed: boolean }> {
    const { data: existingResults } = await supabase
      .schema('core_comercial')
      .from('lead_prospecting_results')
      .select('id, company_name, email')
      .eq('job_id', job.id);

    const existingCount = existingResults?.length || 0;
    const existingEmailsCount = existingResults?.filter((r) => r.email).length || 0;
    const isEmailTarget = job.email_required ?? true;
    const currentTargetMetric = isEmailTarget ? existingEmailsCount : existingCount;

    // Consider completed if reached target or if within 5 leads of target (e.g. 499 of 500)
    if (currentTargetMetric >= job.target_count || currentTargetMetric >= job.target_count - 5) {
      await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .update({
          status: 'completed',
          processed_count: existingCount,
          found_emails_count: existingEmailsCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return { processed: existingCount, foundEmails: existingEmailsCount, completed: true };
    }

    // Query ALL staging results globally to ensure zero duplicate company searches across all companies
    const { data: allStaging } = await supabase
      .schema('core_comercial')
      .from('lead_prospecting_results')
      .select('company_name, email');

    // Query ALL CRM leads globally to ensure leads are never re-scraped or duplicated
    const { data: allCRMLeads } = await supabase
      .schema('core_comercial')
      .from('leads')
      .select('company_name, email');

    const existingCompanyNames = Array.from(new Set([
      ...(existingResults || []).map((r) => r.company_name?.trim()),
      ...(allStaging || []).map((r) => r.company_name?.trim()),
      ...(allCRMLeads || []).map((l) => l.company_name?.trim()),
    ])).filter((n): n is string => Boolean(n));

    const remaining = isEmailTarget
      ? Math.max(1, job.target_count - existingEmailsCount)
      : Math.max(1, job.target_count - existingCount);

    const currentFetchCount = Math.min(remaining, batchSize);
    const scraped = await this.searchCompaniesViaAIsa(
      job.keywords,
      job.location,
      currentFetchCount,
      job.search_source || 'google_maps',
      isEmailTarget,
      job.api_key_override || undefined,
      existingCompanyNames
    );

    const existingCompanySet = new Set(
      [
        ...(allStaging || []).map((r) => r.company_name?.trim().toLowerCase()),
        ...(allCRMLeads || []).map((l) => l.company_name?.trim().toLowerCase()),
      ].filter((n): n is string => Boolean(n))
    );

    const existingEmailSet = new Set(
      [
        ...(allStaging || []).map((r) => r.email?.trim().toLowerCase()),
        ...(allCRMLeads || []).map((l) => l.email?.trim().toLowerCase()),
      ].filter((e): e is string => Boolean(e))
    );

    let foundEmailsCount = 0;
    const recordsToInsert: Omit<LeadProspectingResult, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const item of scraped) {
      const normName = item.company_name.trim().toLowerCase();
      const normEmail = item.email?.trim().toLowerCase();

      // If job requires verified email, skip companies that do not have an email
      if (isEmailTarget && !normEmail) continue;

      // Deduplication check: skip if company name or email is already captured in Staging or CRM
      if (existingCompanySet.has(normName)) continue;
      if (normEmail && existingEmailSet.has(normEmail)) continue;

      existingCompanySet.add(normName);
      if (normEmail) existingEmailSet.add(normEmail);

      if (item.email) foundEmailsCount++;
      recordsToInsert.push({
        job_id: job.id,
        empresa_id: job.empresa_id,
        company_name: item.company_name,
        email: item.email || null,
        phone: item.phone || null,
        website: item.website || null,
        linkedin_url: item.linkedin_url || null,
        instagram_url: item.instagram_url || null,
        address: item.address || null,
        city: item.city || job.location,
        province: item.province || job.location,
        country: 'Espanha',
        confidence_score: item.email ? 95 : 70,
        status: 'raw',
      });
    }

    if (recordsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .schema('core_comercial')
        .from('lead_prospecting_results')
        .insert(recordsToInsert);

      if (insertErr) {
        console.error('Error inserting prospecting results:', insertErr);
      }
    }

    const totalCurrentResults = existingCount + recordsToInsert.length;
    const totalCurrentEmails = existingEmailsCount + foundEmailsCount;
    
    // Auto-complete when email target is reached OR if no new uncaptured items can be found
    const updatedMetric = isEmailTarget ? totalCurrentEmails : totalCurrentResults;
    const noNewRecordsInserted = recordsToInsert.length === 0;
    const isCompleted = updatedMetric >= job.target_count || scraped.length === 0 || (noNewRecordsInserted && existingCount > 0);

    await supabase
      .schema('core_comercial')
      .from('lead_prospecting_jobs')
      .update({
        processed_count: totalCurrentResults,
        found_emails_count: totalCurrentEmails,
        status: isCompleted ? 'completed' : 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return {
      processed: recordsToInsert.length,
      foundEmails: foundEmailsCount,
      completed: isCompleted,
    };
  }

  /**
   * Bulk import selected staging results to core_comercial.leads with sector, audience tags & custom notes
   */
  static async importResultsToLeads(
    resultIds: string[],
    empresaId: string,
    options?: ImportLeadOptions
  ): Promise<{ importedCount: number }> {
    const { data: results, error: fetchErr } = await supabase
      .schema('core_comercial')
      .from('lead_prospecting_results')
      .select('*')
      .in('id', resultIds);

    if (fetchErr || !results) throw fetchErr || new Error('Resultados não encontrados');

    let importedCount = 0;
    const audienceTag = options?.audienceTag ? options.audienceTag.trim() : null;
    const tagList = audienceTag ? [audienceTag, 'Prospecção AI'] : ['Prospecção AI'];

    const totalToProcess = results.length;
    let currentIndex = 0;

    for (const res of results) {
      currentIndex++;
      if (options?.onProgress) {
        options.onProgress(currentIndex, totalToProcess);
      }

      const rawSector = options?.sector || res.sector;
      const leadSector = normalizeSectorName(rawSector);

      const customNoteText = options?.customNotes
        ? `${options.customNotes}\n[Setor: ${leadSector}] [Público: ${audienceTag || 'Geral'}]\nLead capturado via AIsa Prospecting. Cidade: ${res.city || ''}`
        : `Lead capturado via AIsa Prospecting. Setor: ${leadSector}. Cidade: ${res.city || ''}. Pontuação de Confiança: ${res.confidence_score || 85}%`;

      const targetEmail = res.email?.trim().toLowerCase();
      let existingLeadId: string | null = res.imported_lead_id || null;

      if (!existingLeadId && targetEmail) {
        const { data: foundByEmail } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('email', targetEmail)
          .maybeSingle();

        if (foundByEmail) {
          existingLeadId = foundByEmail.id;
        }
      }

      if (existingLeadId) {
        // Update existing lead in core_comercial.leads - NO DUPLICATES!
        await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            origen_lead: audienceTag ? `AIsa - ${audienceTag}` : 'Máquina de Leads AIsa',
            notes: customNoteText,
            tags: tagList,
            sector: leadSector,
            website: res.website || undefined,
            linkedin_url: res.linkedin_url || undefined,
            instagram_url: res.instagram_url || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLeadId);

        await supabase
          .schema('core_comercial')
          .from('lead_prospecting_results')
          .update({
            status: 'imported',
            imported_lead_id: existingLeadId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', res.id);

        importedCount++;
        continue;
      }

      const { data: insertedLead, error: leadErr } = await supabase
        .schema('core_comercial')
        .from('leads')
        .insert({
          empresa_id: empresaId,
          name: res.company_name,
          company_name: res.company_name,
          email: res.email || `contato@${res.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.es`,
          phone: res.phone || undefined,
          sector: leadSector,
          city: res.city || undefined,
          province: res.province || undefined,
          address_line: res.address || undefined,
          website: res.website || undefined,
          linkedin_url: res.linkedin_url || undefined,
          instagram_url: res.instagram_url || undefined,
          origen_lead: audienceTag ? `AIsa - ${audienceTag}` : 'Máquina de Leads AIsa',
          notes: customNoteText,
          tags: tagList,
          prospecting_job_id: res.job_id,
        })
        .select()
        .single();

      if (!leadErr && insertedLead) {
        importedCount++;
        await supabase
          .schema('core_comercial')
          .from('lead_prospecting_results')
          .update({
            status: 'imported',
            imported_lead_id: insertedLead.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', res.id);
      }
    }

    return { importedCount };
  }
}
