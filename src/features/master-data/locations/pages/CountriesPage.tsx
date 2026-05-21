import { useCountries } from '../hooks/useLocations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export function CountriesPage() {
  const { data: countries, isLoading, error } = useCountries();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Países</h2>
        <p className="text-muted-foreground">
          Gestão de países do sistema. Apenas usuários super administradores podem criar ou editar registros nesta tabela.
        </p>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>ISO2</TableHead>
              <TableHead>ISO3</TableHead>
              <TableHead>DDI</TableHead>
              <TableHead>Moeda</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Carregando países...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  Erro ao carregar países.
                </TableCell>
              </TableRow>
            ) : countries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum país encontrado.
                </TableCell>
              </TableRow>
            ) : (
              countries?.map((country) => (
                <TableRow key={country.id}>
                  <TableCell className="font-medium">{country.name}</TableCell>
                  <TableCell>{country.iso2}</TableCell>
                  <TableCell>{country.iso3}</TableCell>
                  <TableCell>{country.phone_code || '-'}</TableCell>
                  <TableCell>{country.currency_code || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={country.status === 'active' ? 'default' : 'secondary'}>
                      {country.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
