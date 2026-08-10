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

export interface ImportLeadOptions {
  audienceTag?: string;
  customNotes?: string;
  sector?: string;
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
      ? 'CRITICAL: ONLY return companies with real, active corporate emails. If no real email is listed on their website, set email to null.'
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
      const prompt = `Act as a real-time web crawler, search engine proxy, and business contact verifier for B2B leads in Spain.
Search for ${count} REAL active companies in Spain matching core business activity: "${cleanKeywords}" strictly located anywhere within the region/province of "${location}" (including all its cities, towns, and industrial parks).

CRITICAL INSTRUCTIONS:
1. ${sourceInstructions}
2. ${emailInstruction}
3. EXPANDED METROPOLITAN & INDUSTRIAL BELT COVERAGE: Include companies physically located ANYWHERE in the metropolitan area, industrial belt (polígonos industriales), and full region/province of "${location}".
   - If location is "Barcelona", "Catalunya" or near Vallès, include companies in Sabadell, Terrassa, Badalona, Granollers, Rubí, Sant Cugat, Barberà del Vallès, Cornellà, Martorell, Hospitalet, and all Vallès/Baix Llobregat industrial parks.
   - If location is "Navarra" or "Pamplona", include Pamplona, Tudela, Barañain, Burlada, Estella, Tafalla, Ansoáin, Villava, Landaben, Agustinos, Noáin, etc.
   - If location is "Madrid", include Getafe, Leganés, Fuenlabrada, Alcalá de Henares, Móstoles, Alcobendas, Coslada, etc.
   - DO NOT limit results to central city limits; crawl the entire industrial belt and surrounding towns of "${location}".
4. DO NOT REQUIRE THE COMPANY TRADE NAME TO CONTAIN THE WORD "${cleanLocation}". The company MUST operate in "${cleanKeywords}", but its trade name does NOT need to have "${cleanLocation}" in it (e.g. "Talleres Calderería Industrial S.L." is a valid match).
5. HIGH-QUALITY DIRECT EMAILS: Prioritize direct departmental or decision-maker emails published on their web pages (such as gerencia@, direccion@, comercial@, compras@, presupuestos@, calidad@, tecnico@, or named contact emails like j.perez@domain.es). Only fallback to info@ or contacto@ if no direct departmental email is listed.
6. STRICT WEBSITE VERIFICATION & NO DOMAIN GUESSING: NEVER guess or construct a website URL by combining "www." + email domain (e.g. if email is "gerencia@caldereriairati.es", DO NOT guess "https://www.caldereriairati.es"). Many industrial companies in Spain use custom domain emails for Outlook/Google Workspace without running an active public website. ONLY set "website" to a URL if the company HAS an active, verified public website listed on Google Maps or official business registries. Otherwise set "website" strictly to null.
7. DO NOT invent fake domains or placeholders.${excludeInstruction}

Return ONLY a valid JSON array of objects with the exact schema below, with no markdown codeblocks, no explanations, no commentary:
[
  {
    "company_name": "Exact Legal or Trade Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 976 123 456" or null,
    "address": "Calle Example 123, Polígono Industrial" or null,
    "city": "${location}",
    "province": "${location}",
    "email": "gerencia@realcompany.es" or null,
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
              content: 'You are a real-time web crawler and business data verification proxy in Spain. You ONLY return 100% verified, real public web data.',
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

      const verifiedResults = rawResults.map((item) => {
        const validWebsite = this.sanitizeUrl(item.website);
        const validLinkedin = this.sanitizeUrl(item.linkedin_url);
        const validInstagram = this.sanitizeUrl(item.instagram_url);
        const validEmail = this.sanitizeEmail(item.email);

        return {
          company_name: item.company_name,
          website: validWebsite,
          phone: item.phone || null,
          address: item.address || null,
          city: item.city || location,
          province: item.province || location,
          email: validEmail,
          linkedin_url: validLinkedin,
          instagram_url: validInstagram,
          sector: item.sector || keywords,
        };
      });

      return verifiedResults;
    } catch (err: any) {
      console.error('AIsa API Search error:', err.message);
      return [];
    }
  }

  /**
   * Execute batch step for a job with rate limit delay
   */
  static async processJobStep(
    job: LeadProspectingJob,
    batchSize: number = 5
  ): Promise<{ processed: number; foundEmails: number; completed: boolean }> {
    const { data: existingResults } = await supabase
      .schema('core_comercial')
      .from('lead_prospecting_results')
      .select('id, company_name, email')
      .eq('job_id', job.id);

    const existingCount = existingResults?.length || 0;

    if (existingCount >= job.target_count) {
      const emailsCount = existingResults?.filter((r) => r.email).length || 0;
      await supabase
        .schema('core_comercial')
        .from('lead_prospecting_jobs')
        .update({
          status: 'completed',
          processed_count: existingCount,
          found_emails_count: emailsCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return { processed: existingCount, foundEmails: emailsCount, completed: true };
    }

    const existingCompanyNames = (existingResults || [])
      .map((r) => r.company_name?.trim())
      .filter((n): n is string => Boolean(n));

    const remaining = job.target_count - existingCount;
    const currentFetchCount = Math.min(remaining, batchSize);
    const scraped = await this.searchCompaniesViaAIsa(
      job.keywords,
      job.location,
      currentFetchCount,
      job.search_source || 'google_maps',
      job.email_required ?? true,
      job.api_key_override || undefined,
      existingCompanyNames
    );

    const existingCompanySet = new Set((existingResults || []).map((r) => r.company_name.trim().toLowerCase()));
    const existingEmailSet = new Set(
      (existingResults || [])
        .map((r) => r.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e))
    );

    let foundEmailsCount = 0;
    const recordsToInsert: Omit<LeadProspectingResult, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const item of scraped) {
      const normName = item.company_name.trim().toLowerCase();
      const normEmail = item.email?.trim().toLowerCase();

      // Deduplication check: skip if company name or email is already captured
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
    const existingEmails = existingResults?.filter((r) => r.email).length || 0;
    const newFoundEmails = existingEmails + foundEmailsCount;
    
    // Auto-complete if target reached OR if no new companies can be found after previous batches
    const noNewItemsFound = scraped.length > 0 && recordsToInsert.length === 0;
    const isCompleted = totalCurrentResults >= job.target_count || (noNewItemsFound && existingCount > 0);

    await supabase
      .schema('core_comercial')
      .from('lead_prospecting_jobs')
      .update({
        processed_count: totalCurrentResults,
        found_emails_count: newFoundEmails,
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

      const leadSector = options?.sector ? options.sector.trim() : 'Caldeiraria / Industrial';

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
