import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LogExtracaoPage() {
  const simulatedLogs = [
    { id: 1, file: 'comprovante_semana1.jpg', date: '2026-06-20', confidence: 98, status: 'Processado' },
    { id: 2, file: 'scan001_cierre.pdf', date: '2026-06-21', confidence: 92, status: 'Processado' },
    { id: 3, file: 'foto_horas_joao.png', date: '2026-06-21', confidence: 76, status: 'Revisão Manual' },
    { id: 4, file: 'relatorio_assinado.pdf', date: '2026-06-21', confidence: null, status: 'Processando...' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico OCR</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o status das extrações feitas pela Inteligência Artificial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Extração</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Confiança (%)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.file}</TableCell>
                  <TableCell>{log.date}</TableCell>
                  <TableCell>
                    {log.confidence !== null ? (
                      <span className={log.confidence >= 95 ? "text-green-600 font-semibold" : log.confidence >= 80 ? "text-yellow-600 font-semibold" : "text-red-600 font-semibold"}>
                        {log.confidence}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'Processado' ? 'default' : log.status === 'Revisão Manual' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
