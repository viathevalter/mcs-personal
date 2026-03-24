import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User, Building2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { useTranslation } from 'react-i18next';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function Topbar() {
    const { user, signOut } = useAuth();
    const { selectedEmpresaId, setSelectedEmpresaId, role: memberRole, currentMembership, empresas, isLoading } = useEmpresa();
    const { role: globalRole } = useRole();
    const { t } = useTranslation();

    const selectedEmpresa = empresas?.find(e => e.id === selectedEmpresaId);

    // Super admin fura fila do vínculo local (mostra tudo sem banner de erro)
    const showLinkError = user && selectedEmpresaId && !currentMembership && globalRole !== 'super_admin';

    return (
        <>
            {/* Vínculo Ausente Warning Banner */}
            {showLinkError && (
                <div className="w-full bg-red-500/15 text-red-600 dark:text-red-400 text-sm py-1.5 px-4 text-center font-medium flex items-center justify-center border-b border-red-500/20">
                    Usuário sem vínculo para esta empresa
                </div>
            )}
            <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-white shadow-sm dark:bg-slate-950 px-4 sm:static sm:h-auto sm:border-0 sm:px-6 sm:py-4 sm:mb-4 sm:shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] sm:rounded-b-2xl">
                <Button size="icon" variant="outline" className="sm:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>

                <div className="flex-1" id="topbar-title-portal">
                    {/* Espaço reservado para título dinâmico das páginas */}
                </div>

                <div className="flex items-center gap-2">
                    {user && (
                        isLoading ? (
                            <Button variant="outline" className="gap-2 opacity-50 cursor-not-allowed">
                                <Building2 className="h-4 w-4 animate-pulse" />
                                <span className="hidden sm:inline-block">Carregando empresas...</span>
                            </Button>
                        ) : empresas && empresas.length > 0 ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Building2 className="h-4 w-4" />
                                        <span className="hidden sm:inline-block">
                                            {selectedEmpresa ? `${selectedEmpresa.codigo} - ${selectedEmpresa.nome}` : 'Selecione a Empresa'}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                    <DropdownMenuLabel>Empresas</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {empresas.map((e) => (
                                        <DropdownMenuItem
                                            key={e.id}
                                            onClick={() => setSelectedEmpresaId(e.id)}
                                            className={e.id === selectedEmpresaId ? "bg-muted" : ""}
                                        >
                                            {e.codigo} - {e.nome}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button variant="outline" className="gap-2 text-muted-foreground" disabled>
                                <Building2 className="h-4 w-4" />
                                <span className="hidden sm:inline-block">Nenhuma empresa encontrada</span>
                            </Button>
                        )
                    )}
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                {user && (
                    <div className="flex items-center gap-3">
                        {(globalRole || memberRole) && (
                            <Badge variant="secondary" className="hidden sm:flex capitalize">
                                {globalRole === 'super_admin' ? 'Super Admin' : memberRole}
                            </Badge>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <User className="h-5 w-5" />
                                    <span className="sr-only">{t('topbar.profile')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={signOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{t('topbar.logout')}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </header>
        </>
    );
}
