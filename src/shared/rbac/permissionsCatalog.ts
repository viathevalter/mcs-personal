export type FeatureAccessLevel = 'default' | 'edit' | 'view' | 'hidden';
export type ModuleAccessLevel = 'default' | 'edit' | 'view' | 'blocked';

export interface PermissionItemDef {
    key: string;
    label: string;
    description?: string;
    isCritical?: boolean;
    /** If true, this is an action/button inside a screen (only 'default'/'edit' vs 'hidden' applies) */
    isActionOnly?: boolean;
}

export interface ModulePermissionGroup {
    moduleId: string;
    moduleTitle: string;
    items: PermissionItemDef[];
}

export const PERMISSIONS_CATALOG: ModulePermissionGroup[] = [
    {
        moduleId: 'rrhh',
        moduleTitle: 'MCS RRHH (Trabalhadores / Obra)',
        items: [
            // Chaves Especiais de Ação dentro de Trabalhadores
            {
                key: 'rh.workers.edit_status',
                label: '🔒 Alterar Status do Trabalhador (Ativo / Inativo / Baixa)',
                description: 'Permite mudar o status do trabalhador para Inativo, Desligado ou alterar status de Seguridade Social.',
                isCritical: true,
                isActionOnly: true,
            },
            {
                key: 'rh.workers.edit_cadastro',
                label: '🔒 Alterar Nome e Dados do Trabalhador',
                description: 'Permite editar o nome, documentos e dados cadastrais na ficha do trabalhador.',
                isCritical: true,
                isActionOnly: true,
            },
            // Telas Críticas / Restritas do RH
            {
                key: 'rh.tariffs',
                label: '🔒 Menu: Gestão de Tarifas',
                description: 'Acesso à tela de tarifas horárias, edição de valores e importação de planilhas de tarifas.',
                isCritical: true,
            },
            {
                key: 'rh.bank_accounts',
                label: '🔒 Menu: Gestão de Contas Bancárias (IBAN)',
                description: 'Acesso à tela de IBAN e permissão para cadastrar, trocar ou corrigir IBAN do trabalhador.',
                isCritical: true,
            },
            {
                key: 'rh.payment_orders',
                label: '🔒 Menu: Ordens de Pagamento (RRHH)',
                description: 'Acesso às ordens de pagamento do RH.',
                isCritical: true,
            },
            {
                key: 'rh.taxes',
                label: '🔒 Menu: Configuração de Impostos',
                description: 'Acesso às regras e tabelas de impostos.',
                isCritical: true,
            },
            // Menus Operacionais e Folha do RH
            {
                key: 'rh.dashboard',
                label: 'Menu: Dashboard RH',
            },
            {
                key: 'rh.workers',
                label: 'Menu: Trabalhadores (Lista e Ficha)',
                description: 'Em "Só Consultar", o usuário vê a lista e a ficha completa, mas não edita nada.',
            },
            {
                key: 'rh.history',
                label: 'Menu: Histórico de Atividade',
            },
            {
                key: 'rh.hours_control',
                label: 'Menu: Controle de Horas',
            },
            {
                key: 'rh.documents_tasks',
                label: 'Menu: Documentos e Contratos',
            },
            {
                key: 'rh.seguridade',
                label: 'Menu: Seguridade Social',
            },
            {
                key: 'rh.holerites',
                label: 'Menu: Gestão de Nóminas (Holerites)',
            },
            {
                key: 'rh.salary_report',
                label: 'Menu: Informe de Salários',
            },
            {
                key: 'rh.benefits',
                label: 'Menu: Proventos e Benefícios',
            },
            {
                key: 'rh.discounts',
                label: 'Menu: Gestão de Descontos',
            },
            {
                key: 'rh.cae',
                label: 'Menu: Conformidade CAE',
            },
        ],
    },
    {
        moduleId: 'comercial',
        moduleTitle: 'MCS Comercial',
        items: [
            {
                key: 'comercial.aprovacoes',
                label: '🔒 Menu: Mesa de Aprovações Comerciais',
                description: 'Permite visualizar e aprovar/rejeitar orçamentos pendentes da gerência.',
                isCritical: true,
            },
            {
                key: 'comercial.configuracion',
                label: '🔒 Menu: Configurações Comerciais',
                description: 'Parâmetros de margem, diretrizes e configurações do módulo comercial.',
                isCritical: true,
            },
            {
                key: 'comercial.discador_supervisao',
                label: '🔒 Menu: Supervisão, KPIs & Operadores (Power Dialer)',
                description: 'Telas de supervisão gerencial e gestão de operadores/scripts do discador.',
                isCritical: true,
            },
            {
                key: 'comercial.analises',
                label: '🔒 Menu: Análises & Simulações',
                description: 'Raio-X de rentabilidade por cliente, controle de prejuízos e simulador de tarifas.',
                isCritical: true,
            },
            {
                key: 'comercial.estimaciones',
                label: 'Menu: Orçamentos / Estimaciones',
            },
            {
                key: 'comercial.portfolio',
                label: 'Menu: Portfólio & Referências',
            },
            {
                key: 'comercial.tarefas',
                label: 'Menu: Tarefas Comerciais',
            },
            {
                key: 'comercial.leads',
                label: 'Menu: Leads de Marketing',
            },
            {
                key: 'comercial.prospector',
                label: 'Menu: Máquina de Leads (IA)',
            },
            {
                key: 'comercial.kanban',
                label: 'Menu: Funil de Vendas (Embudo)',
            },
            {
                key: 'comercial.campanhas',
                label: 'Menu: Campanhas de Marketing',
            },
            {
                key: 'comercial.discador',
                label: 'Menu: Cockpit Discador, Agenda & Filas',
            },
        ],
    },
    {
        moduleId: 'contratacao',
        moduleTitle: 'MCS Contratação',
        items: [
            {
                key: 'contratacao.relatorio',
                label: '🔒 Menu: Controle de Contratações (Relatório & Permanência)',
                description: 'Relatório gerencial de contratados, retenção, tarifas acordadas e inteligência comercial.',
                isCritical: true,
            },
            {
                key: 'contratacao.vagas',
                label: 'Menu: Contratação Inicial (Vagas)',
            },
            {
                key: 'contratacao.entrevistas',
                label: 'Menu: Controle de Entrevistas',
            },
            {
                key: 'contratacao.baixas_radar',
                label: 'Menu: Radar de Baixas & Na Manga',
            },
            {
                key: 'contratacao.curriculos',
                label: 'Menu: Banco de Currículos',
            },
            {
                key: 'contratacao.divulgacao',
                label: 'Menu: Divulgar Vagas (WA / FB)',
            },
            {
                key: 'contratacao.alocados',
                label: 'Menu: Trabalhadores Alocados',
            },
        ],
    },
    {
        moduleId: 'operacoes',
        moduleTitle: 'MCS Operações',
        items: [
            {
                key: 'operacoes.admin',
                label: '🔒 Seção: Administração (Usuários, Funcionários, Playbooks)',
                description: 'Acesso à gestão de usuários, departamentos, importação e playbooks.',
                isCritical: true,
            },
            {
                key: 'operacoes.dashboard',
                label: 'Menu: Tablero (Dashboard)',
            },
            {
                key: 'operacoes.estimaciones',
                label: 'Menu: Estimaciones',
            },
            {
                key: 'operacoes.pedidos',
                label: 'Menu: Pedidos',
            },
            {
                key: 'operacoes.torre',
                label: 'Menu: Torre de Controle (Solicitudes)',
            },
            {
                key: 'operacoes.clientes',
                label: 'Menu: Clientes',
            },
            {
                key: 'operacoes.documentos',
                label: 'Menu: Gerador de Documentos',
            },
            {
                key: 'operacoes.gestao_diaria',
                label: 'Seção: Gestão Diária (Reuniões, Tarefas, Incidências)',
            },
        ],
    },
    {
        moduleId: 'financeiro',
        moduleTitle: 'MCS Financeiro',
        items: [
            {
                key: 'financeiro.comissoes',
                label: '🔒 Menu: Gestão de Comissões',
                isCritical: true,
            },
            {
                key: 'financeiro.settings',
                label: '🔒 Menu: Configurações Financeiras',
                isCritical: true,
            },
            {
                key: 'financeiro.dashboard',
                label: 'Menu: Painel Diretoria',
            },
            {
                key: 'financeiro.titulos',
                label: 'Menu: Ordens de Pagamento',
            },
            {
                key: 'financeiro.pagos',
                label: 'Menu: Pagos / Contas a Pagar',
            },
            {
                key: 'financeiro.fundo_caixa',
                label: 'Menu: Fundo de Caixa',
            },
            {
                key: 'financeiro.cobros',
                label: 'Menu: Cobros / Recebimentos',
            },
            {
                key: 'financeiro.cobranca',
                label: 'Menu: Cobrança / Inadimplência',
            },
            {
                key: 'financeiro.analises',
                label: 'Menu: Análises Financeiras',
            },
        ],
    },
    {
        moduleId: 'logistica',
        moduleTitle: 'MCS Logística',
        items: [
            {
                key: 'logistica.financeiro',
                label: '🔒 Seção Financeira: Contratos, Suministros & Ordens de Pagamento',
                isCritical: true,
            },
            {
                key: 'logistica.dashboard',
                label: 'Menu: Ocupação (Gantt) & Demandas',
            },
            {
                key: 'logistica.alojamentos',
                label: 'Menu: Alojamentos & Provedores',
            },
        ],
    },
    {
        moduleId: 'facturacion',
        moduleTitle: 'MCS Facturación',
        items: [
            {
                key: 'faturamento.dashboard',
                label: 'Menu: Painel',
            },
            {
                key: 'faturamento.pendentes',
                label: 'Menu: Operacional / Pendentes',
            },
            {
                key: 'faturamento.tracking',
                label: 'Menu: Tracking',
            },
            {
                key: 'faturamento.historico',
                label: 'Menu: Histórico',
            },
        ],
    },
];

export const ALL_HUB_MODULES = [
    { id: 'cadastro', label: 'MCS Registro General' },
    { id: 'comercial', label: 'MCS Comercial' },
    { id: 'facturacion', label: 'MCS Facturación' },
    { id: 'financeiro', label: 'MCS Financeiro' },
    { id: 'chat', label: 'MCS Chat' },
    { id: 'logistica', label: 'MCS Logística' },
    { id: 'almacen', label: 'MCS Almacén' },
    { id: 'cierre_horas', label: 'MCS CentralCars' },
    { id: 'operacoes', label: 'MCS Operações' },
    { id: 'contratacao', label: 'MCS Contratação' },
    { id: 'rrhh', label: 'MCS RRHH (Trabalhadores / Obra)' },
    { id: 'escritorio', label: 'MCS RRHH Oficinas y Fichajes' },
    { id: 'patrimonio', label: 'MCS Activos y Patrimonio' },
    { id: 'bi', label: 'MCS BI & Diretoria' },
];

/**
 * Helpers to read/write granular permissions inside `blocked_modules: string[]`
 * without breaking backwards compatibility.
 *
 * Token conventions in `blocked_modules`:
 * - `<moduleId>`           => Module is completely blocked/hidden on Hub
 * - `mod_view:<moduleId>`  => Module is allowed on Hub in View-Only (Consulta) mode
 * - `mod_allow:<moduleId>` => Module is explicitly allowed on Hub in Edit mode
 * - `hide:<featureKey>`    => Feature/Menu/Action is explicitly hidden/blocked
 * - `view:<featureKey>`    => Feature/Menu is visible in View-Only (Consulta) mode
 * - `edit:<featureKey>`    => Feature/Menu/Action is explicitly allowed to edit
 */

export function getModuleAccessLevel(tokens: string[] = [], moduleId: string): ModuleAccessLevel {
    if (tokens.includes(moduleId)) return 'blocked';
    if (tokens.includes(`mod_view:${moduleId}`)) return 'view';
    if (tokens.includes(`mod_allow:${moduleId}`)) return 'edit';
    return 'default';
}

export function setModuleAccessLevel(tokens: string[] = [], moduleId: string, level: ModuleAccessLevel): string[] {
    const cleaned = tokens.filter(
        t => t !== moduleId && t !== `mod_view:${moduleId}` && t !== `mod_allow:${moduleId}`
    );
    if (level === 'blocked') return [...cleaned, moduleId];
    if (level === 'view') return [...cleaned, `mod_view:${moduleId}`];
    if (level === 'edit') return [...cleaned, `mod_allow:${moduleId}`];
    return cleaned;
}

export function getFeatureAccessLevel(tokens: string[] = [], featureKey: string): FeatureAccessLevel {
    if (tokens.includes(`hide:${featureKey}`)) return 'hidden';
    if (tokens.includes(`view:${featureKey}`)) return 'view';
    if (tokens.includes(`edit:${featureKey}`)) return 'edit';
    return 'default';
}

export function setFeatureAccessLevel(tokens: string[] = [], featureKey: string, level: FeatureAccessLevel): string[] {
    const cleaned = tokens.filter(
        t => t !== `hide:${featureKey}` && t !== `view:${featureKey}` && t !== `edit:${featureKey}`
    );
    if (level === 'hidden') return [...cleaned, `hide:${featureKey}`];
    if (level === 'view') return [...cleaned, `view:${featureKey}`];
    if (level === 'edit') return [...cleaned, `edit:${featureKey}`];
    return cleaned;
}
