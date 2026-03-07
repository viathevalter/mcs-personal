import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

export function HoleritesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Folha de Pagamento (Holerites)
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Gestão de recibos de vencimento, apontamento de horas e descontos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar Horas (Excel)
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral do Mês</CardTitle>
                    <CardDescription>
                        A funcionalidade de fechamento de folha está sendo desenvolvida. Em breve você poderá visualizar todos os holerites do mês aqui.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
                    <p>Módulo de Holerites em Construção</p>
                    <p className="text-sm mt-2 max-w-md text-center">
                        Nesta tela, o RH poderá importar as horas dos trabalhadores, aplicar descontos de carros, multas, e o sistema fará o cálculo automático do valor líquido.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
