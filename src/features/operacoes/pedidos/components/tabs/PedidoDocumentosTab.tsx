import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export function PedidoDocumentosTab() {
  const { t } = useTranslation();

  return (
    <Card className="mt-6 border-dashed border-2">
      <CardContent className="py-20 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <FileText size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {t('cockpit_pedidos.docs_tab.title')}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t('cockpit_pedidos.docs_tab.desc')}
        </p>
      </CardContent>
    </Card>
  );
}
