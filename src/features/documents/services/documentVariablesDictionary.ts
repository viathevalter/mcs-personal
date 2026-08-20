export interface VariableDefinition {
    key: string;
    label: string;
    category: 'trabalhador' | 'cliente' | 'empresa' | 'geral';
    example: string;
}

export const DOCUMENT_VARIABLES: VariableDefinition[] = [
    // --- TRABALHADOR ---
    { key: '{{trabalhador.nome}}', label: 'Nome Completo do Trabalhador', category: 'trabalhador', example: 'João Silva Oliveira' },
    { key: '{{trabalhador.nif}}', label: 'NIF / Documento Fiscal / NIE', category: 'trabalhador', example: 'X1234567Y' },
    { key: '{{trabalhador.nss}}', label: 'Número de Segurança Social (NSS/NISS)', category: 'trabalhador', example: '98765432100' },
    { key: '{{trabalhador.documento_tipo}}', label: 'Tipo de Documento (NIE/DNI/Passaporte)', category: 'trabalhador', example: 'NIE' },
    { key: '{{trabalhador.documento_numero}}', label: 'Número do Documento de Identidade', category: 'trabalhador', example: 'X1234567Y' },
    { key: '{{trabalhador.data_nascimento}}', label: 'Data de Nascimento', category: 'trabalhador', example: '15/04/1990' },
    { key: '{{trabalhador.nacionalidade}}', label: 'Nacionalidade', category: 'trabalhador', example: 'Espanhola' },
    { key: '{{trabalhador.cargo}}', label: 'Cargo / Função', category: 'trabalhador', example: 'Encanador / Tubista' },
    { key: '{{trabalhador.email}}', label: 'E-mail do Trabalhador', category: 'trabalhador', example: 'joao.silva@email.com' },
    { key: '{{trabalhador.telefone}}', label: 'Telefone / Móvel', category: 'trabalhador', example: '+34 600 123 456' },
    { key: '{{trabalhador.endereco}}', label: 'Endereço Completo', category: 'trabalhador', example: 'Calle Mayor, 45, 2B' },
    { key: '{{trabalhador.codigo_postal}}', label: 'Código Postal', category: 'trabalhador', example: '28001' },
    { key: '{{trabalhador.cidade}}', label: 'Cidade / Localidade', category: 'trabalhador', example: 'Madrid' },
    { key: '{{trabalhador.iban}}', label: 'Conta Bancária / IBAN', category: 'trabalhador', example: 'ES91 2100 0418 4502 0005 1234' },
    { key: '{{trabalhador.salario_base}}', label: 'Salário Base', category: 'trabalhador', example: '1800.00 €' },
    { key: '{{trabalhador.data_admissao}}', label: 'Data de Admissão / Ingresso', category: 'trabalhador', example: '01/09/2026' },

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

    // --- ALIASES DO CLIENTE DO RODAPÉ / SIGNATÁRIO ---
    { key: '{{cliente_empresa}}', label: 'Empresa do Cliente (Rodapé)', category: 'cliente', example: 'Wiseowe LDA' },
    { key: '{{cliente_nome}}', label: 'Nome do Destinatário / Contato', category: 'cliente', example: 'Carlos Rodriguez' },
    { key: '{{cliente_email}}', label: 'E-mail do Destinatário', category: 'cliente', example: 'info@wiseowe.com' },
    { key: '{{cliente_telefone}}', label: 'Telefone do Destinatário', category: 'cliente', example: '+34 912 345 678' },
    { key: '{{cliente_endereco}}', label: 'Endereço do Destinatário', category: 'cliente', example: 'Rua S. Tomé e Príncipe, 267' },
    { key: '{{cliente_cidade}}', label: 'Cidade do Destinatário', category: 'cliente', example: 'Vila Nova de Gaia' },
    { key: '{{cliente_cif}}', label: 'CIF / NIF do Destinatário', category: 'cliente', example: '518599280' },

    // --- EMPRESA EMITENTE, CONTEÚDO LIVRE & GERAL ---
    { key: '{{empresa.nome}}', label: 'Nome da Sua Empresa', category: 'empresa', example: 'Mastercorp' },
    { key: '{{empresa.nif}}', label: 'NIF da Sua Empresa', category: 'empresa', example: 'B98765432' },
    { key: '{{empresa.endereco}}', label: 'Endereço da Sua Empresa', category: 'empresa', example: 'Plaza de España, 1' },
    { key: '{{acuerdo_codigo}}', label: 'Código do Acordo / Contrato', category: 'geral', example: 'AC-2026-001' },
    { key: '{{acuerdo_data}}', label: 'Data do Acordo', category: 'geral', example: '20/08/2026' },
    { key: '{{contenido}}', label: 'Conteúdo Livre / Cláusulas Especiais', category: 'geral', example: 'Acordo comercial e condições acordadas.' },
    { key: '{{conteudo}}', label: 'Conteúdo Livre (Alias)', category: 'geral', example: 'Cláusulas especiais do contrato' },
    { key: '{{geral.data_atual}}', label: 'Data de Hoje Por Extenso', category: 'geral', example: '20 de Agosto de 2026' },
    { key: '{{geral.data_curta}}', label: 'Data de Hoje (DD/MM/AAAA)', category: 'geral', example: '20/08/2026' },
    { key: '{{geral.cidade_emissao}}', label: 'Cidade de Emissão', category: 'geral', example: 'Madrid' },
    { key: '{{assinatura.nome}}', label: 'Nome do Signatário Registrado', category: 'geral', example: 'Christian Andrade' },
    { key: '{{assinatura.data}}', label: 'Data da Assinatura', category: 'geral', example: '20/08/2026' }
];

export function buildWorkerDataMap(worker: any, empresaName = 'Mastercorp'): Record<string, string> {
    const today = new Date();
    const formattedDateExtenso = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedDateCurta = today.toLocaleDateString('pt-BR');

    const birthDate = worker?.fecha_nacimiento
        ? new Date(worker.fecha_nacimiento).toLocaleDateString('pt-BR')
        : worker?.birth_date
            ? new Date(worker.birth_date).toLocaleDateString('pt-BR')
            : '';

    const hireDate = worker?.data_ingresso
        ? new Date(worker.data_ingresso).toLocaleDateString('pt-BR')
        : worker?.hire_date
            ? new Date(worker.hire_date).toLocaleDateString('pt-BR')
            : formattedDateCurta;

    const docType = worker?.nie
        ? 'NIE'
        : worker?.dni
            ? 'DNI'
            : worker?.pasaporte
                ? 'Passaporte'
                : 'NIF/NIE';

    const docNum = worker?.nif || worker?.nie || worker?.dni || worker?.pasaporte || worker?.document_number || '';
    const acuerdoCode = `AC-${Date.now().toString().slice(-6)}`;
    const workerName = worker?.nome || worker?.display_name || worker?.full_name || '';

    return {
        'trabalhador.nome': workerName,
        'trabalhador.nif': docNum,
        'trabalhador.nss': worker?.niss || worker?.nuss || worker?.nss || worker?.social_security || '',
        'trabalhador.documento_tipo': docType,
        'trabalhador.documento_numero': docNum,
        'trabalhador.data_nascimento': birthDate,
        'trabalhador.nacionalidade': worker?.nacionalidade || worker?.nationality || worker?.pais || '',
        'trabalhador.cargo': worker?.funcion || worker?.cod_funcion || worker?.job_function || worker?.cargo || worker?.category || '',
        'trabalhador.email': worker?.email || worker?.correo || '',
        'trabalhador.telefone': worker?.movil || worker?.phone || worker?.telefone || '',
        'trabalhador.endereco': worker?.address_line || worker?.morada_contrato || worker?.address || '',
        'trabalhador.codigo_postal': worker?.postal_code || worker?.cp || '',
        'trabalhador.cidade': worker?.location || worker?.city || worker?.cidade || '',
        'trabalhador.iban': worker?.iban || '',
        'trabalhador.salario_base': worker?.base_salary ? `${worker.base_salary} €` : '',
        'trabalhador.data_admissao': hireDate,
        
        // Aliases do Trabalhador como Destinatário
        'cliente_empresa': empresaName,
        'cliente_nome': workerName,
        'cliente_email': worker?.email || worker?.correo || '',
        'cliente_telefone': worker?.movil || worker?.phone || '',
        'cliente_endereco': worker?.address_line || worker?.morada_contrato || '',
        'cliente_cidade': worker?.location || worker?.city || '',
        'cliente_cif': docNum,

        'empresa.nome': empresaName || 'Mastercorp',
        'empresa.nif': 'B98765432',
        'empresa.endereco': 'Plaza de España, 1 - Madrid',
        'acuerdo_codigo': acuerdoCode,
        'acuerdo_data': formattedDateCurta,
        'contenido': 'Conforme estipulado pelas partes no presente acordo.',
        'conteudo': 'Conforme estipulado pelas partes no presente acordo.',
        'geral.data_atual': formattedDateExtenso,
        'geral.data_curta': formattedDateCurta,
        'geral.cidade_emissao': 'Madrid',
        'assinatura.nome': workerName,
        'assinatura.data': formattedDateCurta
    };
}

export function buildClientDataMap(client: any, empresaName = 'Mastercorp'): Record<string, string> {
    const today = new Date();
    const formattedDateExtenso = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedDateCurta = today.toLocaleDateString('pt-BR');
    const acuerdoCode = `AC-${Date.now().toString().slice(-6)}`;

    const legalName = client?.legal_name || client?.name || '';
    const tradeName = client?.trade_name || legalName;
    const contactPerson = client?.contact_name || client?.billing_contact_name || client?.collections_contact_name || legalName;
    const cifNum = client?.tax_id || client?.vat_number || client?.cif || client?.nif || '';
    const emailStr = client?.email || client?.billing_email || '';
    const phoneStr = client?.phone || client?.mobile || client?.contact_phone || '';
    const addressStr = client?.address_line || client?.address || '';
    const cityStr = client?.city || '';

    return {
        'cliente.nome_legal': legalName,
        'cliente.nome_comercial': tradeName,
        'cliente.nif': cifNum,
        'cliente.email': emailStr,
        'cliente.telefone': phoneStr,
        'cliente.endereco': addressStr,
        'cliente.cidade': cityStr,
        'cliente.codigo_postal': client?.postal_code || '',
        'cliente.pais': client?.country || 'Espanha',
        'cliente.contato_responsavel': contactPerson,
        'cliente.prazo_pagamento': client?.payment_terms || '30 dias',

        // Aliases Específicos do Rodapé / Modelo
        'cliente_empresa': legalName,
        'cliente_nome': contactPerson,
        'cliente_email': emailStr,
        'cliente_telefone': phoneStr,
        'cliente_endereco': addressStr,
        'cliente_cidade': cityStr,
        'cliente_cif': cifNum,

        'empresa.nome': empresaName || 'Mastercorp',
        'empresa.nif': 'B98765432',
        'empresa.endereco': 'Plaza de España, 1 - Madrid',
        'acuerdo_codigo': acuerdoCode,
        'acuerdo_data': formattedDateCurta,
        'contenido': 'Conforme estipulado pelas partes no presente acordo.',
        'conteudo': 'Conforme estipulado pelas partes no presente acordo.',
        'geral.data_atual': formattedDateExtenso,
        'geral.data_curta': formattedDateCurta,
        'geral.cidade_emissao': 'Madrid',
        'assinatura.nome': contactPerson,
        'assinatura.data': formattedDateCurta
    };
}
