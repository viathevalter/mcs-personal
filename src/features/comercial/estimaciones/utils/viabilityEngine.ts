import { differenceInDays, parseISO, isValid } from 'date-fns';

export interface ViabilityResult {
  diasObra: number;
  paxTotal: number;
  gastosFijos: number;
  segSocialTrabajadores: number;
  plataformas: number;
  operativos: number;
  neto: number;
  rentabilidad: number;
  indiceK: number;
  ivp: number;
  status: 'viable' | 'warning' | 'critical';
  reasons: string[];
  coastalSummerRisk: boolean;
  creditRisk: 'none' | 'warning' | 'blocked';
  marginRisk: boolean;
}

// Prefixos de códigos postais de províncias costeiras na Espanha (primeiros 2 dígitos)
const SPAIN_COASTAL_POSTAL_PREFIXES = new Set([
  '03', // Alicante
  '04', // Almería
  '07', // Baleares
  '08', // Barcelona
  '11', // Cádiz
  '12', // Castellón
  '15', // A Coruña
  '17', // Girona
  '18', // Granada
  '20', // Gipuzkoa
  '21', // Huelva
  '27', // Lugo
  '29', // Málaga
  '30', // Murcia
  '33', // Asturias
  '35', // Las Palmas
  '36', // Pontevedra
  '38', // S.C. Tenerife
  '39', // Cantabria
  '43', // Tarragona
  '46', // Valencia
  '48', // Bizkaia
]);

// Faro (Algarve), Setúbal, Lisboa, Porto, etc. em Portugal (primeiro dígito do código postal)
const PORTUGAL_COASTAL_POSTAL_PREFIXES = new Set([
  '8', // Faro / Algarve
  '2', // Setúbal / Santarém
  '1', // Lisboa
  '4', // Porto / Braga
]);

export function calculateViability(
  payload: any,
  client?: any,
  settings?: any
): ViabilityResult {
  const reasons: string[] = [];
  
  // 1. Obter número de dias e trabalhadores
  let diasObra = 1;
  if (payload.expected_start_date && payload.expected_end_date) {
    const start = parseISO(payload.expected_start_date);
    const end = parseISO(payload.expected_end_date);
    if (isValid(start) && isValid(end)) {
      diasObra = Math.max(1, differenceInDays(end, start) + 1);
    }
  }

  const paxTotal = (payload.items || []).reduce(
    (acc: number, item: any) => acc + Number(item.quantity || 0),
    0
  );

  // 2. Calcular Custos Operativos Indiretos (conforme fórmula do PowerApps)
  const gastosFijos = 1.32 * paxTotal * diasObra;
  const segSocialTrabajadores = 7.5 * diasObra * paxTotal;
  const plataformas = 10 * paxTotal;
  const operativos = gastosFijos + segSocialTrabajadores + plataformas;

  // 3. Calcular Rentabilidade e Margem Líquida
  const receita = Number(payload.total_estimated_revenue || 0);
  const custo = Number(payload.total_estimated_cost || 0);
  const neto = receita - custo - operativos;
  const rentabilidad = receita > 0 ? (neto / receita) * 100 : 0;
  
  // K index represents profit per man-month
  const manMonths = (diasObra * paxTotal) / 30;
  const indiceK = manMonths > 0 ? neto / manMonths : 0;

  // 4. Calcular o IVP (Índice de Viabilidade do Projeto)
  const cap = Math.min(90, diasObra) / Math.max(1, diasObra);
  
  // Encontrar o custo total do alojamento dentro da proposta
  let totalAlojamento = 0;
  if (payload.costs) {
    totalAlojamento = payload.costs
      .filter((c: any) => c.cost_category === 'housing')
      .reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
  }

  // Soma de outros custos (nominas + epis + operacionais + extras)
  const nominasEpisGastos = custo + operativos - totalAlojamento;

  let ivp = 0;
  if (paxTotal > 0) {
    ivp =
      rentabilidad * 0.4 +
      ((neto * cap) / 1000) * 0.3 +
      Math.min(1, indiceK / 500) * 10 -
      ((nominasEpisGastos * cap) / 5000) * 0.3 -
      ((totalAlojamento * cap) / 5000) * 0.3;
  }

  // 5. Verificar Risco de Alta Temporada Sazonal (Litoral no Verão)
  let coastalSummerRisk = false;
  const hasAccommodation = (payload.items || []).some((i: any) => !!i.includes_accommodation);
  
  if (hasAccommodation && payload.expected_start_date && payload.expected_end_date) {
    const start = parseISO(payload.expected_start_date);
    const end = parseISO(payload.expected_end_date);
    
    if (isValid(start) && isValid(end)) {
      // Checar se o período cruza os meses de Junho, Julho, Agosto ou Setembro (alta temporada)
      const startMonth = start.getMonth() + 1; // 0-indexed
      const endMonth = end.getMonth() + 1;
      
      const overlapsSummer = 
        (startMonth >= 6 && startMonth <= 9) || 
        (endMonth >= 6 && endMonth <= 9) ||
        (startMonth < 6 && endMonth > 9);

      if (overlapsSummer) {
        // Checar prefixo do CEP
        const postalCode = (payload.postal_code || '').trim();
        const prefix2 = postalCode.substring(0, 2);
        const prefix1 = postalCode.substring(0, 1);
        
        const isSpainCoast = SPAIN_COASTAL_POSTAL_PREFIXES.has(prefix2);
        const isPortugalCoast = PORTUGAL_COASTAL_POSTAL_PREFIXES.has(prefix1);

        if (isSpainCoast || isPortugalCoast) {
          coastalSummerRisk = true;
          reasons.push(
            'Alerta de Logística: Obra em região litorânea durante o verão europeu (alto risco de escassez e volatilidade nos preços de alojamento).'
          );
        }
      }
    }
  }

  // 6. Verificar Risco de Crédito do Cliente
  let creditRisk: 'none' | 'warning' | 'blocked' = 'none';
  if (client) {
    if (client.financial_status === 'blocked') {
      creditRisk = 'blocked';
      reasons.push(
        `Cliente Bloqueado: O cliente ${client.legal_name} possui restrição total de faturamento por inadimplência.`
      );
    } else if (client.financial_status === 'debtor') {
      creditRisk = 'warning';
      reasons.push(
        `Cliente Inadimplente: O cliente ${client.legal_name} possui faturas em atraso.`
      );
    }
  }

  // 7. Verificar Margem
  const minMargin = settings?.min_margin_percent !== undefined ? Number(settings.min_margin_percent) : 15.0;
  // Margem global informada no payload ou calculada
  const actualMargin = Number(payload.estimated_margin_percent || 0);
  const marginRisk = actualMargin < minMargin;
  
  if (marginRisk) {
    reasons.push(
      `Margem Baixa: A margem global (${actualMargin.toFixed(2)}%) está abaixo da margem mínima permitida (${minMargin}%).`
    );
  }

  // 8. Verificar Limiar do IVP
  const minIvp = settings?.ivp_min_threshold !== undefined ? Number(settings.ivp_min_threshold) : 5.0;
  if (ivp < minIvp && paxTotal > 0) {
    reasons.push(
      `Índice de Viabilidade Baixo: O IVP do projeto (${ivp.toFixed(2)}) está abaixo do limiar de risco aceitável (${minIvp}).`
    );
  }

  // 9. Classificar status geral da viabilidade
  let status: 'viable' | 'warning' | 'critical' = 'viable';
  if (creditRisk === 'blocked' || (marginRisk && settings?.block_debtor_estimations)) {
    status = 'critical';
  } else if (marginRisk || creditRisk === 'warning' || ivp < minIvp || coastalSummerRisk) {
    status = 'warning';
  }

  return {
    diasObra,
    paxTotal,
    gastosFijos,
    segSocialTrabajadores,
    plataformas,
    operativos,
    neto,
    rentabilidad,
    indiceK,
    ivp,
    status,
    reasons,
    coastalSummerRisk,
    creditRisk,
    marginRisk,
  };
}
