# MASTERCorp Suite – Global Engineering Rules

## Stack Obrigatória
- Vite
- React
- TypeScript
- Supabase
- TanStack Query
- React Router
- react-hook-form + zod
- TailwindCSS
- shadcn/ui

## Arquitetura
- Estrutura por features
- Nunca acessar Supabase direto no componente
- Criar hooks por feature
- Usar QueryClient global
- Tratar erro de RLS
- Tipagem estrita

## Estrutura de Pastas
src/
  app/
  shared/
    ui/
    layout/
    supabase/
  features/
    dashboard/
    workers/
    benefits/
    ledger/
    settlements/
    documents/

## Padrões de Lista
Toda listagem deve conter:
- Busca (debounce 300ms)
- Filtros avançados
- Ordenação
- Paginação server-side
- Skeleton loading
- EmptyState
- DataTable reutilizável

## Segurança
- Considerar RLS sempre ativo
- Nunca expor service_role
- Usar env:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

## UI
- Enterprise clean
- Rounded-2xl
- Soft shadows
- Dark mode
- StatusBadge padronizado

## Qualidade
- Zero any implícito
- Componentização máxima
- Código reutilizável