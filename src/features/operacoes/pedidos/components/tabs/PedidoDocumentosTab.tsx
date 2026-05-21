import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export function PedidoDocumentosTab() {
  return (
    <Card className="mt-6 border-dashed border-2">
      <CardContent className="py-20 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <FileText size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Central de Documentos
        </h3>
        <p className="text-muted-foreground max-w-md">
          Documentos do pedido e contratos serão integrados ao bloco <strong>core_documents</strong> em uma sprint futura. 
          Você poderá gerenciar assinaturas, anexos e versionamento por aqui.
        </p>
      </CardContent>
    </Card>
  );
}
