import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { RoleProvider } from './providers/RoleProvider';
import { EmpresaProvider } from './providers/EmpresaProvider';
import { QueryProvider } from './providers/QueryProvider';

// Layouts
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';
import { OperacoesLayout } from '@/features/operacoes/components/OperacoesLayout';

// Features / Pages
import { HubPage } from '@/features/hub/HubPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { UnauthorizedPage } from '@/shared/pages/UnauthorizedPage';
import { NotFoundPage } from '@/shared/pages/NotFoundPage';

// Comercial / Estimaciones
import { EstimacionesListPage } from '@/features/comercial/estimaciones/EstimacionesListPage';
import { NewEstimacionPage } from '@/features/comercial/estimaciones/NewEstimacionPage';
import { EstimacionDetailPage } from '@/features/comercial/estimaciones/EstimacionDetailPage';
import { CommercialProposalSigningPage } from '@/features/documents/pages/ProposalSigningPage';
import { CommercialContractSigningPage } from '@/features/documents/pages/ContractSigningPage';
import { DocumentacionTasksPage } from '@/features/documents/pages/DocumentacionTasksPage';

// Operations / Solicidades / Tasks
import { SolicitudesPage } from '@/features/operacoes/solicitudes/SolicitudesPage';
import { SolicitudDetailPage } from '@/features/operacoes/solicitudes/SolicitudDetailPage';
import { NewSolicitudPage } from '@/features/operacoes/solicitudes/NewSolicitudPage';
import { OperacoesDashboard } from '@/features/operacoes/pages/OperacoesDashboard';
import { OperacoesEstimaciones } from '@/features/operacoes/pages/OperacoesEstimaciones';
import { OperacoesPedidos } from '@/features/operacoes/pages/OperacoesPedidos';
import { OperacoesPedidoDetail } from '@/features/operacoes/pages/OperacoesPedidoDetail';
import { OperacoesOperacao } from '@/features/operacoes/pages/OperacoesOperacao';
import { OperacoesTasks } from '@/features/operacoes/pages/OperacoesTasks';
import { OperacoesTasksPage } from '@/features/operacoes/pages/OperacoesTasksPage';
import { OperacoesIncidencias } from '@/features/operacoes/pages/OperacoesIncidencias';
import { OperacoesIncidenciaDetail } from '@/features/operacoes/pages/OperacoesIncidenciaDetail';
import { OperacoesPlaybooks } from '@/features/operacoes/pages/OperacoesPlaybooks';
import { OperacoesTaskTemplates } from '@/features/operacoes/pages/OperacoesTaskTemplates';
import { OperacoesDepartamentos } from '@/features/operacoes/pages/OperacoesDepartamentos';
import { OperacoesFuncionarios } from '@/features/operacoes/pages/OperacoesFuncionarios';
import { OperacoesImportarFuncionarios } from '@/features/operacoes/pages/OperacoesImportarFuncionarios';
import { OperacoesUsuarios } from '@/features/operacoes/pages/OperacoesUsuarios';
import { OperacoesComissoes } from '@/features/operacoes/pages/OperacoesComissoes';
import { OperacoesClientes } from '@/features/operacoes/pages/OperacoesClientes';

// Master Data / Clients
import { ClientDetailPage } from '@/features/master-data/clients/pages/ClientDetailPage';

// CRM / Marketing / Formulários Públicos
import { LeadsPage } from '@/features/comercial/leads/LeadsPage';
import { CampaignsPage } from '@/features/comercial/leads/CampaignsPage';
import { ComercialSettingsPage } from '@/features/comercial/settings/ComercialSettingsPage';
import { ColetaDadosPublicaPage } from '@/features/comercial/leads/ColetaDadosPublicaPage';
import { PublicTechnicalFormPage } from '@/features/comercial/leads/PublicTechnicalFormPage';
import { SolicitarPresupuestoPage } from '@/features/comercial/leads/SolicitarPresupuestoPage';
import { WhatsAppRedirectPage } from '@/features/comercial/leads/WhatsAppRedirectPage';

// Financeiro
import { FinanceiroDashboard } from '@/features/financeiro/pages/Dashboard';
import { FinanceiroTitulos } from '@/features/financeiro/pages/Titulos';
import { FinanceiroPagos } from '@/features/financeiro/pages/Pagos';
import { FinanceiroTitleDetail } from '@/features/financeiro/pages/TitleDetail';

// Faturamento / Extração de Horas
import { FaturasPendentes } from '@/features/faturamento/pages/FaturasPendentes';
import { FaturasTracking } from '@/features/faturamento/pages/FaturasTracking';

// Benefits / Housing (Alojamentos)
import { HousingPage } from '@/features/benefits/pages/HousingPage';
import { WorkerDocCapturePage } from '@/features/documents/pages/WorkerDocCapturePage';

// Personal / RH
import { WorkersPage } from '@/features/personal/workers/WorkersPage';
import { WorkerProfilePage } from '@/features/personal/workers/WorkerProfilePage';
import { AssignmentsPage } from '@/features/personal/assignments/AssignmentsPage';
import { HiringDashboardPage } from '@/features/personal/hiring/HiringDashboardPage';
import { HiringReportPage } from '../features/personal/contratacao/HiringReportPage';

// Holerites (Folhas de Pagamento)
import { HoleritesPage } from '@/features/holerites/pages/HoleritesPage';

// Bank Accounts / IBAN
import { BankAccountsPage } from '@/features/bank-accounts/pages/BankAccountsPage';

// Discounts / Descontos
import { DiscountsPage } from '@/features/discounts/pages/DiscountsPage';

// Seguridade Social
import { SeguridadeSocialPage } from '@/features/seguridade-social/pages/SeguridadeSocialPage';

// Common / Utility
import { ProtectedRoute } from '@/shared/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
    {
        element: (
            <AuthProvider>
                <RoleProvider>
                    <EmpresaProvider>
                        <QueryProvider>
                            <Outlet />
                        </QueryProvider>
                    </EmpresaProvider>
                </RoleProvider>
            </AuthProvider>
        ),
        children: [
            // Public Routes
            {
                element: <AuthLayout />,
                children: [
                    {
                        path: '/login',
                        element: <LoginPage />
                    }
                ]
            },
            {
                path: '/coleta-dados',
                element: <ColetaDadosPublicaPage />
            },
            {
                path: '/formulario-tecnico',
                element: <PublicTechnicalFormPage />
            },
            {
                path: '/solicitar-presupuesto',
                element: <SolicitarPresupuestoPage />
            },
            {
                path: '/solicitar-orcamento',
                element: <SolicitarPresupuestoPage />
            },
            {
                path: '/whatsapp',
                element: <WhatsAppRedirectPage />
            },
            {
                path: '/doc-capture',
                element: <WorkerDocCapturePage />
            },
            {
                path: '/propostas/:id/assinar',
                element: <CommercialProposalSigningPage />
            },
            {
                path: '/proposta/:id/assinar',
                element: <CommercialProposalSigningPage />
            },
            {
                path: '/contratos/:id/assinar',
                element: <CommercialContractSigningPage />
            },
            {
                path: '/contrato/:id/assinar',
                element: <CommercialContractSigningPage />
            },
            {
                path: '/unauthorized',
                element: <UnauthorizedPage />
            },

            // Protected Routes (Wrapped in MainLayout)
            {
                element: (
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        path: '/',
                        element: <Navigate to="/hub" replace />
                    },
                    {
                        path: '/hub',
                        element: <HubPage />
                    },

                    // Comercial Module
                    {
                        path: '/comercial/estimaciones',
                        element: <EstimacionesListPage />
                    },
                    {
                        path: '/comercial/estimaciones/nova',
                        element: <NewEstimacionPage />
                    },
                    {
                        path: '/comercial/estimaciones/:id',
                        element: <EstimacionDetailPage />
                    },
                    {
                        path: '/comercial/leads',
                        element: <LeadsPage />
                    },
                    {
                        path: '/comercial/campanhas',
                        element: <CampaignsPage />
                    },
                    {
                        path: '/comercial/configuracoes',
                        element: <ComercialSettingsPage />
                    },

                    // Documents Module
                    {
                        path: '/documentos/tarefas',
                        element: <DocumentacionTasksPage />
                    },

                    // Master Data (Clientes)
                    {
                        path: '/master-data/clients/:id',
                        element: <ClientDetailPage />
                    },

                    // Financeiro Module
                    {
                        path: '/financeiro/dashboard',
                        element: <FinanceiroDashboard />
                    },
                    {
                        path: '/financeiro/titulos',
                        element: <FinanceiroTitulos />
                    },
                    {
                        path: '/financeiro/pagos',
                        element: <FinanceiroPagos />
                    },
                    {
                        path: '/financeiro/titulos/:id',
                        element: <FinanceiroTitleDetail />
                    },

                    // Faturamento Module
                    {
                        path: '/faturamento/pendentes',
                        element: <FaturasPendentes />
                    },
                    {
                        path: '/faturamento/tracking',
                        element: <FaturasTracking />
                    },

                    // Personal / RH Module
                    {
                        path: '/workers',
                        element: <WorkersPage />
                    },
                    {
                        path: '/workers/:id',
                        element: <WorkerProfilePage />
                    },
                    {
                        path: '/personal/assignments',
                        element: <AssignmentsPage />
                    },
                    {
                        path: '/personal/contratacoes',
                        element: <HiringReportPage />
                    },
                    {
                        path: '/benefits/housing',
                        element: <HousingPage />
                    },
                    {
                        path: '/holerites',
                        element: <HoleritesPage />
                    },
                    {
                        path: '/bank-accounts',
                        element: <BankAccountsPage />
                    },
                    {
                        path: '/discounts',
                        element: <DiscountsPage />
                    },
                    {
                        path: '/seguridade-social',
                        element: <SeguridadeSocialPage />
                    }
                ]
            },

            // Operações Layout Routes
            {
                path: '/operacoes',
                element: (
                    <ProtectedRoute>
                        <OperacoesLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <Navigate to="/operacoes/dashboard" replace />
                    },
                    {
                        path: 'dashboard',
                        element: <OperacoesDashboard />
                    },
                    {
                        path: 'estimaciones',
                        element: <OperacoesEstimaciones />
                    },
                    {
                        path: 'pedidos',
                        element: <OperacoesPedidos />
                    },
                    {
                        path: 'pedidos/:id',
                        element: <OperacoesPedidoDetail />
                    },
                    {
                        path: 'operacao',
                        element: <OperacoesOperacao />
                    },
                    {
                        path: 'operacao/tarefas',
                        element: <OperacoesTasks />
                    },
                    {
                        path: 'solicitudes',
                        element: <SolicitudesPage />
                    },
                    {
                        path: 'solicitudes/nova',
                        element: <NewSolicitudPage />
                    },
                    {
                        path: 'personal/contratacao',
                        element: <HiringDashboardPage />
                    },
                    {
                        path: 'personal/assignments',
                        element: <AssignmentsPage />
                    },
                    {
                        path: 'personal/contratacoes',
                        element: <HiringReportPage />
                    },
                    {
                        path: 'personal/relatorio-contratacoes',
                        element: <HiringReportPage />
                    },
                    {
                        path: 'contratacoes',
                        element: <HiringReportPage />
                    },
                    {
                        path: 'solicitudes/:id',
                        element: <SolicitudDetailPage />
                    },
                    {
                        path: 'tarefas',
                        element: <OperacoesTasksPage />
                    },
                    {
                        path: 'incidencias',
                        element: <OperacoesIncidencias />
                    },
                    {
                        path: 'incidencias/:id',
                        element: <OperacoesIncidenciaDetail />
                    },
                    {
                        path: 'admin/playbooks',
                        element: <OperacoesPlaybooks />
                    },
                    {
                        path: 'admin/tasks',
                        element: <OperacoesTaskTemplates />
                    },
                    {
                        path: 'admin/departamentos',
                        element: <OperacoesDepartamentos />
                    },
                    {
                        path: 'admin/funcionarios',
                        element: <OperacoesFuncionarios />
                    },
                    {
                        path: 'admin/importar-funcionarios',
                        element: <OperacoesImportarFuncionarios />
                    },
                    {
                        path: 'admin/usuarios',
                        element: <OperacoesUsuarios />
                    },
                    {
                        path: 'admin/comissoes',
                        element: <OperacoesComissoes />
                    },
                    {
                        path: 'clientes',
                        element: <OperacoesClientes />
                    }
                ]
            },

            // Fallbacks
            {
                path: '*',
                element: <NotFoundPage />
            }
        ]
    }
]);
