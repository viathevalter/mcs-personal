export const COUNTRY_UUIDS: Record<string, string> = {
  ES: '2f487ab4-c7f5-4b70-9c37-995dc4cda125',
  PT: 'ed088451-cfb1-4fec-84ef-1115ce2af4c7',
  IT: '3623ec00-42ae-4673-a842-c20b47da0e5e',
  FR: 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd',
  BE: 'a61e8503-bbf4-4e1e-a0b3-14de34639317',
};

export const COUNTRY_LABELS: Record<string, { name: string; flag: string; lang: string }> = {
  ES: { name: 'Espanha', flag: '🇪🇸', lang: 'es' },
  FR: { name: 'França', flag: '🇫🇷', lang: 'fr' },
  PT: { name: 'Portugal', flag: '🇵🇹', lang: 'pt' },
  DE: { name: 'Alemanha', flag: '🇩🇪', lang: 'en' },
  IT: { name: 'Itália', flag: '🇮🇹', lang: 'it' },
  NL: { name: 'Holanda', flag: '🇳🇱', lang: 'en' },
  BE: { name: 'Bélgica', flag: '🇧🇪', lang: 'fr' },
  GB: { name: 'Reino Unido', flag: '🇬🇧', lang: 'en' },
  OTHER: { name: 'Outros', flag: '🌍', lang: 'es' },
};

export function detectLeadCountry(lead: any): string {
  if (!lead) return 'ES';

  if (lead.country_id) {
    const c = String(lead.country_id).toLowerCase();
    if (c === COUNTRY_UUIDS.ES.toLowerCase() || c === '8caaddaf-88cd-4a50-aff6-127b8979b1c3' || c === 'es') return 'ES';
    if (c === COUNTRY_UUIDS.FR.toLowerCase() || c === '690649b9-6bab-4605-8b3e-cbe4c4af73a3' || c === 'fr') return 'FR';
    if (c === COUNTRY_UUIDS.PT.toLowerCase() || c === 'd918a3b2-292e-474e-96ce-147f4ba756db' || c === 'pt') return 'PT';
    if (c === COUNTRY_UUIDS.IT.toLowerCase() || c === '86a91f2d-6e94-4085-8cce-4e17197979e2' || c === 'it') return 'IT';
    if (c === COUNTRY_UUIDS.BE.toLowerCase() || c === 'be') return 'BE';
    const cUpper = String(lead.country_id).toUpperCase();
    if (['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'BE', 'GB'].includes(cUpper)) {
      return cUpper;
    }
  }

  if (lead.phone) {
    const p = String(lead.phone).trim();
    if (p.startsWith('+34') || p.startsWith('34')) return 'ES';
    if (p.startsWith('+351') || p.startsWith('351')) return 'PT';
    if (p.startsWith('+33') || p.startsWith('33')) return 'FR';
    if (p.startsWith('+49') || p.startsWith('49')) return 'DE';
    if (p.startsWith('+39') || p.startsWith('39')) return 'IT';
    if (p.startsWith('+31') || p.startsWith('31')) return 'NL';
    if (p.startsWith('+32') || p.startsWith('32')) return 'BE';
    if (p.startsWith('+44') || p.startsWith('44')) return 'GB';
  }

  if (lead.email) {
    const em = String(lead.email).toLowerCase().trim();
    if (em.endsWith('.es')) return 'ES';
    if (em.endsWith('.fr')) return 'FR';
    if (em.endsWith('.pt')) return 'PT';
    if (em.endsWith('.de')) return 'DE';
    if (em.endsWith('.it')) return 'IT';
    if (em.endsWith('.nl')) return 'NL';
    if (em.endsWith('.be')) return 'BE';
    if (em.endsWith('.uk') || em.endsWith('.co.uk')) return 'GB';
  }

  if (Array.isArray(lead.tags)) {
    const tagStr = lead.tags.join(' ').toLowerCase();
    if (tagStr.includes('portugal') || tagStr.includes('🇵🇹')) return 'PT';
    if (tagStr.includes('frança') || tagStr.includes('france') || tagStr.includes('🇫🇷')) return 'FR';
    if (tagStr.includes('alemanha') || tagStr.includes('germany') || tagStr.includes('🇩🇪')) return 'DE';
    if (tagStr.includes('itália') || tagStr.includes('italia') || tagStr.includes('italy') || tagStr.includes('🇮🇹')) return 'IT';
    if (tagStr.includes('holanda') || tagStr.includes('netherlands') || tagStr.includes('🇳🇱')) return 'NL';
    if (tagStr.includes('bélgica') || tagStr.includes('belgium') || tagStr.includes('🇧🇪')) return 'BE';
    if (tagStr.includes('reino unido') || tagStr.includes('uk') || tagStr.includes('gb') || tagStr.includes('🇬🇧')) return 'GB';
  }

  if (lead.notes && typeof lead.notes === 'string') {
    const n = lead.notes.toLowerCase();
    if (n.includes('frança') || n.includes('france') || n.includes('🇫🇷') || n.includes('depto:')) return 'FR';
    if (n.includes('portugal') || n.includes('🇵🇹')) return 'PT';
    if (n.includes('espanha') || n.includes('spain') || n.includes('españa') || n.includes('🇪🇸')) return 'ES';
  }

  if (lead.province && typeof lead.province === 'string') {
    const provStr = lead.province.toLowerCase();
    if (provStr.includes('(mi)') || provStr.includes('(bs)') || provStr.includes('(bg)') || provStr.includes('(to)')) {
      return 'IT';
    }
  }

  return 'ES';
}
