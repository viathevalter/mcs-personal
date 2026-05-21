import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { ComercialSidebar } from './ComercialSidebar';
import { Topbar } from '@/shared/layout/Topbar';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { cn } from '@/lib/utils';

export function ComercialLayout() {
    const { isExpanded } = useSidebar();
    const location = useLocation();

    // Redirect /comercial to /comercial/estimaciones
    if (location.pathname === '/comercial' || location.pathname === '/comercial/') {
        return <Navigate to="/comercial/estimaciones" replace />;
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-50 text-foreground dark:bg-background">
            <ComercialSidebar />
            <div className={cn("flex flex-1 flex-col transition-all duration-300", isExpanded ? "sm:pl-64" : "sm:pl-20")}>
                <Topbar />
                <div className="flex-1 w-full bg-slate-50 dark:bg-background">
                    <main className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8 md:gap-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
