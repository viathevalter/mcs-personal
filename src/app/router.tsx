import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout } from '../shared/layout/BaseLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { WorkersPage } from '../features/workers/WorkersPage';
import { WorkerDetailsPage } from '../features/workers/WorkerDetailsPage';
import { BenefitsPage } from '../features/benefits/BenefitsPage';
import { LedgerPage } from '../features/ledger/LedgerPage';
import { SettlementsPage } from '../features/settlements/SettlementsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { SeguridadePage } from '../features/seguridade/SeguridadePage';
import { HoleritesPage } from '../features/holerites/HoleritesPage';
import { LoginPage } from '../features/auth/LoginPage';
import UsersPage from '../features/admin/UsersPage';
import { ProtectedRoute } from './router/ProtectedRoute';
import { WorkerPortalLayout } from '../features/worker-portal/WorkerPortalLayout';
import { WorkerLoginPage } from '../features/worker-portal/WorkerLoginPage';
import { WorkerDashboardPage } from '../features/worker-portal/WorkerDashboardPage';
import { HoursControlPage } from '../features/hours-control/HoursControlPage';
import { ClientHoursDetail } from '../features/hours-control/ClientHoursDetail';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
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
        children: [
            {
                path: '/',
                element: <BaseLayout />,
                children: [
                    {
                        index: true,
                        element: <DashboardPage />,
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
                        path: 'ledger',
                        element: <LedgerPage />,
                    },
                    {
                        path: 'settlements',
                        element: <SettlementsPage />,
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
                        path: '*',
                        element: <DashboardPage />,
                    }
                ],
            }
        ]
    },
]);
