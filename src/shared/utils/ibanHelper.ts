/**
 * Helper utilitário para validação, formatação e identificação automática
 * de Banco e Código BIC/SWIFT através do IBAN.
 */

export interface BankInfo {
  name: string;
  shortName: string;
  bic: string;
  country: string;
  logo?: string;
}

// Dicionário de Bancos da Espanha (Código de 4 dígitos do Banco no IBAN Espanhol ESxx BBBB...)
const SPANISH_BANKS: Record<string, BankInfo> = {
  '0182': { name: 'BBVA (Banco Bilbao Vizcaya Argentaria)', shortName: 'BBVA', bic: 'BBVAESMMXXX', country: 'ES' },
  '2100': { name: 'CaixaBank', shortName: 'CaixaBank', bic: 'CAIXESBBXXX', country: 'ES' },
  '0049': { name: 'Banco Santander', shortName: 'Santander', bic: 'BSCHESMMXXX', country: 'ES' },
  '0081': { name: 'Banco Sabadell', shortName: 'Sabadell', bic: 'BSABESBBXXX', country: 'ES' },
  '0128': { name: 'Bankinter', shortName: 'Bankinter', bic: 'BKBKESMMXXX', country: 'ES' },
  '2080': { name: 'Abanca Corporación Bancaria', shortName: 'Abanca', bic: 'CAGLESMMXXX', country: 'ES' },
  '2085': { name: 'Ibercaja Banco', shortName: 'Ibercaja', bic: 'CAZSES2ZXXX', country: 'ES' },
  '2103': { name: 'Unicaja Banco', shortName: 'Unicaja', bic: 'UNMCESMMXXX', country: 'ES' },
  '0075': { name: 'Banco Popular (Santander)', shortName: 'Banco Popular', bic: 'POPUESMMXXX', country: 'ES' },
  '1465': { name: 'ING Bank Spain', shortName: 'ING Direct', bic: 'INGDESMMXXX', country: 'ES' },
  '0073': { name: 'Openbank (Grupo Santander)', shortName: 'Openbank', bic: 'OPENESMMXXX', country: 'ES' },
  '0239': { name: 'EVO Banco (Bankinter)', shortName: 'EVO Banco', bic: 'EVOBESMMXXX', country: 'ES' },
  '2038': { name: 'Bankia (CaixaBank)', shortName: 'Bankia', bic: 'CAIXESBBXXX', country: 'ES' },
  '3058': { name: 'Cajamar Caja Rural', shortName: 'Cajamar', bic: 'CCMRES2MXXX', country: 'ES' },
  '3035': { name: 'Laboral Kutxa', shortName: 'Laboral Kutxa', bic: 'CLPEES2BXXX', country: 'ES' },
  '2095': { name: 'Kutxabank', shortName: 'Kutxabank', bic: 'BASKES2BXXX', country: 'ES' },
  '1491': { name: 'Triodos Bank España', shortName: 'Triodos Bank', bic: 'TRIOESMMXXX', country: 'ES' },
  '1547': { name: 'N26 Bank Spain', shortName: 'N26', bic: 'NTSPESM1XXX', country: 'ES' },
  '1548': { name: 'Revolut Bank Spain', shortName: 'Revolut', bic: 'REVUESM1XXX', country: 'ES' },
  '1545': { name: 'WiZink Bank', shortName: 'WiZink', bic: 'WIZKESMMXXX', country: 'ES' },
  '1546': { name: 'MyInvestor (Andbank)', shortName: 'MyInvestor', bic: 'ANDBESMMXXX', country: 'ES' },
  '0061': { name: 'Banca March', shortName: 'Banca March', bic: 'BMCRESMMXXX', country: 'ES' },
  '0237': { name: 'Cajasur Banco', shortName: 'Cajasur', bic: 'CSURES2CXX', country: 'ES' },
  '3059': { name: 'Caja Rural de Asturias', shortName: 'Caja Rural de Asturias', bic: 'CRASES2OXXX', country: 'ES' },
  '3008': { name: 'Caja Rural de Navarra', shortName: 'Caja Rural de Navarra', bic: 'CRNAES2PXXX', country: 'ES' },
  '3023': { name: 'Caja Rural de Granada', shortName: 'Caja Rural de Granada', bic: 'CRGRES2GXXX', country: 'ES' },
  '3029': { name: 'Caja Rural de Jaén', shortName: 'Caja Rural de Jaén', bic: 'CRJAES2JXXX', country: 'ES' },
  '3081': { name: 'Eurocaja Rural', shortName: 'Eurocaja Rural', bic: 'EUCARS22XXX', country: 'ES' },
  '3191': { name: 'Caja Rural de Aragón (Bantierra)', shortName: 'Caja Rural Aragón', bic: 'CRAGES2ZXXX', country: 'ES' },
  '0019': { name: 'Deutsche Bank España', shortName: 'Deutsche Bank', bic: 'DEUTESMMXXX', country: 'ES' },
  '0149': { name: 'BNP Paribas España', shortName: 'BNP Paribas', bic: 'BNPAESMMXXX', country: 'ES' },
  '0186': { name: 'Banco Mediolanum', shortName: 'Mediolanum', bic: 'MEDIESMMXXX', country: 'ES' },
  '0235': { name: 'Banco Pichincha España', shortName: 'Banco Pichincha', bic: 'PICHESMMXXX', country: 'ES' },
  '0216': { name: 'Targobank', shortName: 'Targobank', bic: 'CMCGESMMXXX', country: 'ES' },
  '0234': { name: 'Banco Caminos', shortName: 'Banco Caminos', bic: 'CAMIESMMXXX', country: 'ES' },
  '0232': { name: 'Banco Inversis', shortName: 'Inversis', bic: 'INVNESMMXXX', country: 'ES' },
  '0198': { name: 'Banco Cooperativo Español', shortName: 'Banco Cooperativo', bic: 'BCOPESMMXXX', country: 'ES' },
  '0030': { name: 'Banesto (Banco Español de Crédito)', shortName: 'Banesto', bic: 'ESPLESMMXXX', country: 'ES' },
  '1490': { name: 'Singular Bank (Self Bank)', shortName: 'Singular Bank', bic: 'SELHESMMXXX', country: 'ES' },
};

// Dicionário de Bancos de Portugal (Código de 4 dígitos PT50 BBBB...)
const PORTUGUESE_BANKS: Record<string, BankInfo> = {
  '0035': { name: 'Caixa Geral de Depósitos (CGD)', shortName: 'CGD', bic: 'CGDIPTPLXXX', country: 'PT' },
  '0033': { name: 'Banco Comercial Português (Millennium BCP)', shortName: 'Millennium BCP', bic: 'BCPOMMPTPPL', country: 'PT' },
  '0018': { name: 'Banco Santander Totta', shortName: 'Santander Totta', bic: 'TOTTPTLXXXX', country: 'PT' },
  '0010': { name: 'Banco BPI (Grupo CaixaBank)', shortName: 'Banco BPI', bic: 'BPIPPTPLXXX', country: 'PT' },
  '0007': { name: 'Novo Banco', shortName: 'Novo Banco', bic: 'BESCPTPLXXX', country: 'PT' },
  '0045': { name: 'Crédito Agrícola', shortName: 'Crédito Agrícola', bic: 'CCCAMMPTPPL', country: 'PT' },
  '0023': { name: 'ActivoBank (Millennium)', shortName: 'ActivoBank', bic: 'ACTVPTPLXXX', country: 'PT' },
  '0061': { name: 'Banco BIG', shortName: 'Banco BIG', bic: 'BIGIPTLXXXX', country: 'PT' },
  '0079': { name: 'Banco EuroBic', shortName: 'EuroBic', bic: 'BICEPTPLXXX', country: 'PT' },
  '0193': { name: 'Banco CTT', shortName: 'Banco CTT', bic: 'BCTTPTPLXXX', country: 'PT' },
  '0269': { name: 'Bankinter Portugal', shortName: 'Bankinter PT', bic: 'BKBKPTPLXXX', country: 'PT' },
};

/**
 * Remove espaços e pontuações do IBAN e transforma em letras maiúsculas
 */
export function cleanIban(iban: string): string {
  return (iban || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Formata um IBAN com espaços a cada 4 caracteres (Ex: ES09 0182 7307 4202 0009 3104)
 */
export function formatIban(iban: string): string {
  const clean = cleanIban(iban);
  if (!clean) return '';
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Identifica o Banco e o Código SWIFT/BIC com base no IBAN
 */
export function identifyBankFromIban(iban: string): BankInfo | null {
  const clean = cleanIban(iban);
  if (clean.length < 8) return null;

  const countryCode = clean.substring(0, 2);

  // Espanha (ES): Código do banco são os dígitos 4 a 8 (índices 4..8)
  // Exemplo: ES09 0182 ... -> Banco = 0182
  if (countryCode === 'ES') {
    const bankCode = clean.substring(4, 8);
    if (SPANISH_BANKS[bankCode]) {
      return SPANISH_BANKS[bankCode];
    }
  }

  // Portugal (PT): Código do banco são os dígitos 4 a 8 (índices 4..8)
  // Exemplo: PT50 0035 ... -> Banco = 0035
  if (countryCode === 'PT') {
    const bankCode = clean.substring(4, 8);
    if (PORTUGUESE_BANKS[bankCode]) {
      return PORTUGUESE_BANKS[bankCode];
    }
  }

  // Bancos digitais internacionais comuns
  if (clean.startsWith('LT') && clean.length >= 8) {
    // Lituânia - Revolut antigo
    return { name: 'Revolut Bank (LT)', shortName: 'Revolut', bic: 'REVULT21XXX', country: 'LT' };
  }

  if (clean.startsWith('DE') && clean.length >= 8) {
    const bankCode = clean.substring(4, 12);
    if (bankCode === '10011001') {
      return { name: 'N26 Bank Germany', shortName: 'N26', bic: 'NTSBDEB1XXX', country: 'DE' };
    }
    if (bankCode === '10070000') {
      return { name: 'Deutsche Bank Germany', shortName: 'Deutsche Bank', bic: 'DEUTDEDDXXX', country: 'DE' };
    }
  }

  if (clean.startsWith('FR') && clean.length >= 8) {
    const bankCode = clean.substring(4, 9);
    if (bankCode === '30004') return { name: 'BNP Paribas France', shortName: 'BNP Paribas', bic: 'BNPAFRPPXXX', country: 'FR' };
    if (bankCode === '30003') return { name: 'Société Générale France', shortName: 'Société Générale', bic: 'SOGEFRPPXXX', country: 'FR' };
    if (bankCode === '30002') return { name: 'Crédit Agricole France', shortName: 'Crédit Agricole', bic: 'AGRIFRPPXXX', country: 'FR' };
  }

  return null;
}
