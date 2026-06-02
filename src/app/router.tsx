import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout } from '../shared/layout/BaseLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { WorkersPage } from '../features/workers/WorkersPage';
import { WorkerDetailsPage } from '../features/workers/WorkerDetailsPage';
import { MovementHistoryPage } from '../features/workers/MovementHistoryPage';
import { SalaryReportPage } from '../features/workers/pages/SalaryReportPage';
import { BenefitsPage } from '../features/benefits/BenefitsPage';
import { TaxesPage } from '../features/taxes/pages/TaxesPage';
import { DiscountsPage } from '../features/discounts/pages/DiscountsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { SeguridadePage } from '../features/seguridade/SeguridadePage';
import { HoleritesPage } from '../features/holerites/pages/HoleritesPage';
import { BankAccountsPage } from '../features/bank-accounts/pages/BankAccountsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ContractSigningPage } from '../features/documents/pages/ContractSigningPage';
import { WorkerDocCapturePage } from '../features/documents/pages/WorkerDocCapturePage';
import { ProposalSigningPage } from '../features/documents/pages/ProposalSigningPage';
import UsersPage from '../features/admin/UsersPage';
import { CategoriesSettingsPage } from '../features/settings/pages/CategoriesSettingsPage';
import { JobFunctionsPage } from '../features/master-data/job-functions/pages/JobFunctionsPage';
import { JobFunctionDetailPage } from '../features/master-data/job-functions/pages/JobFunctionDetailPage';
import { MasterDataLayout } from '../features/master-data/layout/MasterDataLayout';
import { MasterDataDashboard } from '../features/master-data/dashboard/MasterDataDashboard';
import { EmpresasPage } from '../features/master-data/empresas/pages/EmpresasPage';
import { ClientsPage } from '../features/master-data/clients/pages/ClientsPage';
import { ClientDetailPage } from '../features/master-data/clients/pages/ClientDetailPage';
import { ClientSitesPage } from '../features/master-data/client-sites/pages/ClientSitesPage';
import { SuppliersPage } from '../features/master-data/suppliers/pages/SuppliersPage';
import { CountriesPage } from '../features/master-data/locations/pages/CountriesPage';
import { RegionsPage } from '../features/master-data/locations/pages/RegionsPage';
import { EpisPage } from '../features/master-data/epis/pages/EpisPage';
import { ProtectedRoute } from './router/ProtectedRoute';
import { WorkerPortalLayout } from '../features/worker-portal/WorkerPortalLayout';
import { WorkerLoginPage } from '../features/worker-portal/WorkerLoginPage';
import { WorkerDashboardPage } from '../features/worker-portal/WorkerDashboardPage';
import { HoursControlPage } from '../features/hours-control/HoursControlPage';
import { ClientHoursDetail } from '../features/hours-control/ClientHoursDetail';
import { GlobalHubPage } from '../features/hub/GlobalHubPage';
import { ComingSoonPage } from '../shared/components/ComingSoonPage';
import { Navigate } from 'react-router-dom';

import { OperacoesLayout } from '../features/operacoes/layout/OperacoesLayout';
import { Dashboard as OperacoesDashboard } from '../features/operacoes/pages/Dashboard';
import { Estimaciones as OperacoesEstimaciones } from '../features/operacoes/pages/Estimaciones';
import { PedidosPage as OperacoesPedidos } from '../features/operacoes/pedidos/PedidosPage';
import { PedidoDetailPage as OperacoesPedidoDetail } from '../features/operacoes/pedidos/PedidoDetailPage';
import { Operacao as OperacoesOperacao } from '../features/operacoes/pages/Operacao';
import { Tasks as OperacoesTasks } from '../features/operacoes/pages/Tasks';
import { Incidencias as OperacoesIncidencias } from '../features/operacoes/pages/Incidencias';
import { IncidenciaDetail as OperacoesIncidenciaDetail } from '../features/operacoes/pages/IncidenciaDetail';
import { Playbooks as OperacoesPlaybooks } from '../features/operacoes/pages/Playbooks';
import { TaskTemplates as OperacoesTaskTemplates } from '../features/operacoes/pages/TaskTemplates';
import { Departamentos as OperacoesDepartamentos } from '../features/operacoes/pages/admin/Departamentos';
import { Funcionarios as OperacoesFuncionarios } from '../features/operacoes/pages/admin/Funcionarios';
import { ImportarFuncionarios as OperacoesImportarFuncionarios } from '../features/operacoes/pages/admin/ImportarFuncionarios';
import { UserManagement as OperacoesUserManagement } from '../features/operacoes/pages/admin/UserManagement';
import { Comissoes as OperacoesComissoes } from '../features/operacoes/pages/admin/Comissoes';
import { Clientes as OperacoesClientes } from '../features/operacoes/pages/Clientes';
import { Cliente360 as OperacoesCliente360 } from '../features/operacoes/pages/Cliente360';
import { Comercial360 as OperacoesComercial360 } from '../features/operacoes/pages/Comercial360';
import { SolicitudesPage } from '../features/operacoes/solicitudes/SolicitudesPage';
import { SolicitudDetailPage } from '../features/operacoes/solicitudes/SolicitudDetailPage';
import { NewSolicitudPage } from '../features/operacoes/solicitudes/NewSolicitudPage';
import { ComercialTasksPage } from '../features/comercial/pages/ComercialTasksPage';
import { HiringDashboardPage } from '../features/personal/contratacao/HiringDashboardPage';
import { AssignmentsPage } from '../features/personal/assignments/AssignmentsPage';
import { RhTasksPage } from '../features/workers/pages/RhTasksPage';
import { LogisticaTasksPage } from '../features/logistica/pages/LogisticaTasksPage';
import { DocumentacionTasksPage } from '../features/documents/pages/DocumentacionTasksPage';
import { FinanceiroTasksPage } from '../features/financeiro/pages/FinanceiroTasksPage';
import { OperacoesTasksPage } from '../features/operacoes/solicitudes/OperacoesTasksPage';
import { EstimacionesPage } from '../features/comercial/estimaciones/EstimacionesPage';
import { EstimacionDetailPage } from '../features/comercial/estimaciones/EstimacionDetailPage';
import { NewEstimacionPage } from '../features/comercial/estimaciones/NewEstimacionPage';
import { ComercialLayout } from '../features/comercial/layout/ComercialLayout';
import { LeadsPage } from '../features/comercial/leads/LeadsPage';

import { FinanceiroLayout } from '../features/financeiro/layout/FinanceiroLayout';
import { Dashboard as FinanceiroDashboard } from '../features/financeiro/pages/Dashboard';
import { Analises as FinanceiroAnalises } from '../features/financeiro/pages/Analises';
import { Titulos as FinanceiroTitulos } from '../features/financeiro/pages/Titulos';
import { TitleDetail as FinanceiroTitleDetail } from '../features/financeiro/pages/TitleDetail';
import { Settings as FinanceiroSettings } from '../features/financeiro/pages/Settings';

import { useRouteError } from 'react-router-dom';

function RootErrorBoundary() {
  const error = useRouteError() as any;
  console.error("ROUTER ERROR:", error);
  return <div style={{padding:'20px', color:'red'}}><h1>ROUTER CRASH</h1><pre>{error?.message || JSON.stringify(error)}</pre><pre>{error?.stack}</pre></div>;
}

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
        errorElement: <RootErrorBoundary />,
    },
    {
        path: '/assinar/:token',
        element: <ContractSigningPage />,
        errorElement: <RootErrorBoundary />,
    },
    {
        path: '/assinar-proposta/:token',
        element: <ProposalSigningPage />,
        errorElement: <RootErrorBoundary />,
    },
    {
        path: '/enviar-documentos/:token',
        element: <WorkerDocCapturePage />,
        errorElement: <RootErrorBoundary />,
    },
    {
        path: '/portal/login',
        element: <WorkerLoginPage />
    },
    {
        path: '/portal',
        element: <WorkerPortalLayout />,
        children: [
            {
                index: true,
                element: <WorkerDashboardPage />
            },
            {
                path: 'dashboard',
                element: <WorkerDashboardPage />
            }
        ]
    },
    {
        path: '/',
        element: <ProtectedRoute />,
        errorElement: <RootErrorBoundary />,
        children: [
            {
                path: '/hub',
                element: <GlobalHubPage />,
            },
            {
                path: '/cadastro',
                element: <ComingSoonPage moduleName="MCS Registro General" />,
            },
            {
                path: '/comercial',
                element: <ComercialLayout />,
                children: [
                    { index: true, element: <Navigate to="/comercial/estimaciones" replace /> },
                    { path: 'tarefas', element: <ComercialTasksPage /> },
                    { path: 'leads', element: <LeadsPage /> },
                    { path: 'estimaciones', element: <EstimacionesPage /> },
                    { path: 'estimaciones/nova', element: <NewEstimacionPage /> },
                    { path: 'estimaciones/:id', element: <EstimacionDetailPage /> }
                ]
            },
            {
                path: '/faturamento',
                element: <ComingSoonPage moduleName="MCS Facturacion" />,
            },
            {
                path: '/financeiro',
                element: <FinanceiroLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/financeiro/dashboard" replace />
                    },
                    {
                        path: 'dashboard',
                        element: <FinanceiroDashboard />
                    },
                    {
                        path: 'analises',
                        element: <FinanceiroAnalises />
                    },
                    {
                        path: 'titulos',
                        element: <FinanceiroTitulos />
                    },
                    {
                        path: 'titulos/:id',
                        element: <FinanceiroTitleDetail />
                    },
                    {
                        path: 'settings',
                        element: <FinanceiroSettings />
                    },
                    {
                        path: 'tarefas',
                        element: <FinanceiroTasksPage />
                    }
                ]
            },
            {
                path: '/chat',
                element: <ComingSoonPage moduleName="MCS Chat" />,
            },
            {
                path: '/logistica',
                children: [
                    { index: true, element: <ComingSoonPage moduleName="MCS Logistica" /> },
                    { path: 'tarefas', element: <LogisticaTasksPage /> }
                ]
            },
            {
                path: '/almacen',
                element: <ComingSoonPage moduleName="MCS Almacen" />,
            },
            {
                path: '/cierre-horas',
                element: <ComingSoonPage moduleName="MCS Cierre de Horas" />,
            },
            {
                path: '/operacoes',
                element: <OperacoesLayout />,
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
                        element: <OperacoesUserManagement />
                    },
                    {
                        path: 'admin/comissoes',
                        element: <OperacoesComissoes />
                    },
                    {
                        path: 'clientes',
                        element: <OperacoesClientes />
                    },
                    {
                        path: 'clientes/:id',
                        element: <OperacoesCliente360 />
                    },
                    {
                        path: 'comerciais/:id',
                        element: <OperacoesComercial360 />
                    }
                ]
            },
            {
                path: '/master-data',
                element: <MasterDataLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/master-data/dashboard" replace />
                    },
                    {
                        path: 'dashboard',
                        element: <MasterDataDashboard />,
                    },
                    {
                        path: 'empresas',
                        element: <EmpresasPage />,
                    },
                    {
                        path: 'clients',
                        element: <ClientsPage />,
                    },
                    {
                        path: 'clients/:id',
                        element: <ClientDetailPage />,
                    },
                    {
                        path: 'client-sites',
                        element: <ClientSitesPage />,
                    },
                    {
                        path: 'suppliers',
                        element: <SuppliersPage />,
                    },
                    {
                        path: 'countries',
                        element: <CountriesPage />,
                    },
                    {
                        path: 'regions',
                        element: <RegionsPage />,
                    },
                    {
                        path: 'epis',
                        element: <EpisPage />,
                    },
                    {
                        path: 'job-functions',
                        element: <JobFunctionsPage />,
                    },
                    {
                        path: 'job-functions/:id',
                        element: <JobFunctionDetailPage />,
                    }
                ]
            },
            {
                path: '/',
                element: <BaseLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/hub" replace />,
                    },
                    {
                        path: 'dashboard',
                        element: <DashboardPage />,
                    },
                    {
                        path: 'workers',
                        element: <WorkersPage />,
                    },
                    {
                        path: 'workers/history',
                        element: <MovementHistoryPage />,
                    },
                    {
                        path: 'workers/salary-report',
                        element: <SalaryReportPage />,
                    },
                    {
                        path: 'workers/:id',
                        element: <WorkerDetailsPage />,
                    },
                    {
                        path: 'hours-control',
                        element: <HoursControlPage />,
                    },
                    {
                        path: 'hours-control/client/:clientName',
                        element: <ClientHoursDetail />,
                    },
                    {
                        path: 'seguridade',
                        element: <SeguridadePage />,
                    },
                    {
                        path: 'holerites',
                        element: <HoleritesPage />,
                    },
                    {
                        path: 'benefits',
                        element: <BenefitsPage />,
                    },
                    {
                        path: 'bank-accounts',
                        element: <BankAccountsPage />,
                    },
                    {
                        path: 'discounts',
                        element: <DiscountsPage />,
                    },
                    {
                        path: 'taxes',
                        element: <TaxesPage />,
                    },
                    {
                        path: 'documents',
                        element: <DocumentsPage />,
                    },
                    {
                        path: 'admin/users',
                        element: <UsersPage />,
                    },
                    {
                        path: 'admin/categories',
                        element: <CategoriesSettingsPage />,
                    },
                    {
                        path: 'personal/tarefas',
                        element: <RhTasksPage />,
                    },
                    {
                        path: 'documentacion/tarefas',
                        element: <DocumentacionTasksPage />,
                    },
                ],
            }
        ]
    },
]);
