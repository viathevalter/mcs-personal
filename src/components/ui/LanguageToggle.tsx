import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
    { code: 'pt', label: 'Português' },
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

export function LanguageToggle() {
    const { i18n, t } = useTranslation();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" title={t('topbar.language')}>
                    <Globe className="h-[1.2rem] w-[1.2rem] transition-all" />
                    <span className="sr-only">{t('topbar.language')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lng) => (
                    <DropdownMenuItem
                        key={lng.code}
                        onClick={() => i18n.changeLanguage(lng.code)}
                        className={i18n.resolvedLanguage === lng.code ? 'bg-muted font-bold' : ''}
                    >
                        {lng.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
