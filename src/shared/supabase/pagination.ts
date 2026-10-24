/**
 * Utilitários de Paginação Automática e Busca em Lotes (Chunks) para contornar:
 * 1) O limite padrão de 1.000 linhas por requisição da API PostgREST do Supabase.
 * 2) O limite de tamanho de URL (HTTP 400 / 414) ao passar centenas de IDs em `.in(column, values)`.
 */

export async function fetchAllPages<T = any>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
  maxPages = 50
): Promise<T[]> {
  const allRows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
  }
  return allRows;
}

export async function fetchInChunks<T = any, V = string>(
  values: V[],
  buildChunkQuery: (chunk: V[]) => PromiseLike<{ data: T[] | null; error: any }>,
  chunkSize = 150
): Promise<T[]> {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  if (uniqueValues.length === 0) return [];

  const chunks: V[][] = [];
  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    chunks.push(uniqueValues.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await buildChunkQuery(chunk);
      if (error) throw error;
      return data || [];
    })
  );

  return results.flat();
}
