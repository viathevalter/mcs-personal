import React from 'react';
import { Outlet } from 'react-router-dom';
import { EscritorioSidebar } from './EscritorioSidebar';
import { Topbar } from '@/shared/layout/Topbar';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { cn } from '@/lib/utils';

export const EscritorioLayout: React.FC = () => {
    const { isExpanded } = useSidebar();

    return (
        <div className="flex min-h-screen w-full bg-slate-50 text-foreground dark:bg-background">
            <EscritorioSidebar />
            <div className={cn("flex flex-1 flex-col transition-all duration-300", isExpanded ? "sm:pl-64" : "sm:pl-20")}>
                <Topbar />
                <div className="flex-1 w-full bg-slate-50 dark:bg-background">
                    <main className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};
