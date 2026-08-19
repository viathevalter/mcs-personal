export interface VariableDefinition {
    key: string;
    label: string;
    category: 'trabalhador' | 'cliente' | 'empresa' | 'geral';
    example: string;
}

export const DOCUMENT_VARIABLES: VariableDefinition[] = [
    // --- TRABALHADOR ---
    { key: '{{trabalhador.nome}}', label: 'Nome Completo do Trabalhador', category: 'trabalhador', example: 'João Silva Oliveira' },
    { key: '{{trabalhador.nif}}', label: 'NIF / Documento Fiscal', category: 'trabalhador', example: '123456789' },
    { key: '{{trabalhador.nss}}', label: 'Número de Segurança Social (NSS)', category: 'trabalhador', example: '98765432100' },
    { key: '{{trabalhador.documento_tipo}}', label: 'Tipo de Documento (NIE/DNI/Passaporte)', category: 'trabalhador', example: 'NIE' },
    { key: '{{trabalhador.documento_numero}}', label: 'Número do Documento de Identidade', category: 'trabalhador', example: 'X1234567Y' },
    { key: '{{trabalhador.data_nascimento}}', label: 'Data de Nascimento', category: 'trabalhador', example: '15/04/1990' },
    { key: '{{trabalhador.nacionalidade}}', label: 'Nacionalidade', category: 'trabalhador', example: 'Espanhola' },
    { key: '{{trabalhador.cargo}}', label: 'Cargo / Função', category: 'trabalhador', example: 'Encanador / Tubista' },
    { key: '{{trabalhador.email}}', label: 'E-mail do Trabalhador', category: 'trabalhador', example: 'joao.silva@email.com' },
    { key: '{{trabalhador.telefone}}', label: 'Telefone do Trabalhador', category: 'trabalhador', example: '+34 600 123 456' },
    { key: '{{trabalhador.endereco}}', label: 'Endereço Completo', category: 'trabalhador', example: 'Calle Mayor, 45, 2B' },
    { key: '{{trabalhador.codigo_postal}}', label: 'Código Postal', category: 'trabalhador', example: '28001' },
    { key: '{{trabalhador.cidade}}', label: 'Cidade / Município', category: 'trabalhador', example: 'Madrid' },
    { key: '{{trabalhador.iban}}', label: 'Conta Bancária / IBAN', category: 'trabalhador', example: 'ES91 2100 0418 4502 0005 1234' },
    { key: '{{trabalhador.salario_base}}', label: 'Salário Base', category: 'trabalhador', example: '1800.00 €' },
    { key: '{{trabalhador.data_admissao}}', label: 'Data de Admissão / Início', category: 'trabalhador', example: '01/09/2026' },

    // --- CLIENTE ---
    { key: '{{cliente.nome_legal}}', label: 'Razão Social / Nome Legal', category: 'cliente', example: 'Construcciones e Obras Madrid S.L.' },
    { key: '{{cliente.nome_comercial}}', label: 'Nome Comercial / Fantasia', category: 'cliente', example: 'Comadrid Obras' },
    { key: '{{cliente.nif}}', label: 'NIF / CIF do Cliente', category: 'cliente', example: 'B12345678' },
    { key: '{{cliente.email}}', label: 'E-mail Comercial do Cliente', category: 'cliente', example: 'comercial@comadrid.es' },
    { key: '{{cliente.telefone}}', label: 'Telefone do Cliente', category: 'cliente', example: '+34 912 345 678' },
    { key: '{{cliente.endereco}}', label: 'Endereço da Sede do Cliente', category: 'cliente', example: 'Av. de la Industria, 12' },
    { key: '{{cliente.cidade}}', label: 'Cidade do Cliente', category: 'cliente', example: 'Madrid' },
    { key: '{{cliente.codigo_postal}}', label: 'Código Postal do Cliente', category: 'cliente', example: '28080' },
    { key: '{{cliente.pais}}', label: 'País do Cliente', category: 'cliente', example: 'Espanha' },
    { key: '{{cliente.contato_responsavel}}', label: 'Contato / Representante Legal', category: 'cliente', example: 'Sr. Carlos Rodriguez' },
    { key: '{{cliente.prazo_pagamento}}', label: 'Prazo / Condição de Pagamento', category: 'cliente', example: '30 dias após faturamento' },

    // --- EMPRESA EMITENTE & GERAL ---
    { key: '{{empresa.nome}}', label: 'Nome da Sua Empresa', category: 'empresa', example: 'Mastercorp' },
    { key: '{{empresa.nif}}', label: 'NIF da Sua Empresa', category: 'empresa', example: 'B98765432' },
    { key: '{{empresa.endereco}}', label: 'Endereço da Sua Empresa', category: 'empresa', example: 'Plaza de España, 1' },
    { key: '{{geral.data_atual}}', label: 'Data de Hoje Por Extenso', category: 'geral', example: '19 de Agosto de 2026' },
    { key: '{{geral.data_curta}}', label: 'Data de Hoje (DD/MM/AAAA)', category: 'geral', example: '19/08/2026' },
    { key: '{{geral.cidade_emissao}}', label: 'Cidade de Emissão', category: 'geral', example: 'Madrid' }
];

export function buildWorkerDataMap(worker: any, empresaName = 'Mastercorp'): Record<string, string> {
    const today = new Date();
    const formattedDateExtenso = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedDateCurta = today.toLocaleDateString('pt-BR');

    return {
        'trabalhador.nome': worker?.nome || worker?.display_name || worker?.full_name || '',
        'trabalhador.nif': worker?.nif || worker?.dni || worker?.tax_id || '',
        'trabalhador.nss': worker?.nss || worker?.social_security || '',
        'trabalhador.documento_tipo': worker?.document_type || worker?.doc_type || 'NIF/NIE',
        'trabalhador.documento_numero': worker?.document_number || worker?.nif || '',
        'trabalhador.data_nascimento': worker?.birth_date ? new Date(worker.birth_date).toLocaleDateString('pt-BR') : '',
        'trabalhador.nacionalidade': worker?.nationality || worker?.pais || '',
        'trabalhador.cargo': worker?.job_function || worker?.cargo || worker?.category || '',
        'trabalhador.email': worker?.email || worker?.correo || '',
        'trabalhador.telefone': worker?.phone || worker?.telefone || '',
        'trabalhador.endereco': worker?.address || worker?.endereco || '',
        'trabalhador.codigo_postal': worker?.postal_code || worker?.cp || '',
        'trabalhador.cidade': worker?.city || worker?.cidade || '',
        'trabalhador.iban': worker?.iban || '',
        'trabalhador.salario_base': worker?.base_salary ? `${worker.base_salary} €` : '',
        'trabalhador.data_admissao': worker?.hire_date ? new Date(worker.hire_date).toLocaleDateString('pt-BR') : formattedDateCurta,
        
        'empresa.nome': empresaName,
        'empresa.nif': '',
        'empresa.endereco': '',
        'geral.data_atual': formattedDateExtenso,
        'geral.data_curta': formattedDateCurta,
        'geral.cidade_emissao': 'Madrid'
    };
}

export function buildClientDataMap(client: any, empresaName = 'Mastercorp'): Record<string, string> {
    const today = new Date();
    const formattedDateExtenso = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedDateCurta = today.toLocaleDateString('pt-BR');

    return {
        'cliente.nome_legal': client?.legal_name || client?.name || '',
        'cliente.nome_comercial': client?.trade_name || client?.name || '',
        'cliente.nif': client?.vat_number || client?.cif || client?.nif || '',
        'cliente.email': client?.email || '',
        'cliente.telefone': client?.phone || '',
        'cliente.endereco': client?.address || client?.address_line || '',
        'cliente.cidade': client?.city || '',
        'cliente.codigo_postal': client?.postal_code || '',
        'cliente.pais': client?.country || 'Espanha',
        'cliente.contato_responsavel': client?.contact_person || client?.contact_name || '',
        'cliente.prazo_pagamento': client?.payment_terms || '30 dias',

        'empresa.nome': empresaName,
        'empresa.nif': '',
        'empresa.endereco': '',
        'geral.data_atual': formattedDateExtenso,
        'geral.data_curta': formattedDateCurta,
        'geral.cidade_emissao': 'Madrid'
    };
}
