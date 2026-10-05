export const COMPANY_LOGOS: Record<string, { name: string; logoUrl: string; nif?: string }> = {
    LUMINOUS: {
        name: 'Luminous Alley, Unipessoal LDA',
        logoUrl: 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/company-logos/public/logo-1784273235854.png',
        nif: '518954021'
    },
    STOCCO: {
        name: 'Stocco LDA',
        logoUrl: 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/company-logos/public/logo-1784273190389.png',
        nif: '517884747'
    },
    TRIANGULO: {
        name: 'Triangulo Matizado, Unipessoal LDA',
        logoUrl: 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/company-logos/public/logo-1784273221245.png',
        nif: '518818799'
    },
    WISEOWE: {
        name: 'Wiseowe, Unipessoal LDA',
        logoUrl: 'https://unbepkdzvsfvylnysrcq.supabase.co/storage/v1/object/public/company-logos/public/logo-1784273204626.png',
        nif: '518599280'
    },
    KOTRIK: {
        name: 'Kotrik Industrial, LDA',
        logoUrl: '/logo_mcs_transparent.png',
        nif: '515660710'
    }
};

export function getCompanyBranding(companyName?: string) {
    if (!companyName) return null;
    const upper = companyName.toUpperCase();
    for (const [key, val] of Object.entries(COMPANY_LOGOS)) {
        if (upper.includes(key)) {
            return val;
        }
    }
    return {
        name: companyName,
        logoUrl: '/logo_mcs_transparent.png'
    };
}
