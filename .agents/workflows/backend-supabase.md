---
description: Como estruturar e consultar tabelas no Supabase (Backend/PostgREST/RLS) para Aplicações Enterprise Escaláveis.
---

Se a aplicação (Mastercorp/Kotrik) for integrar novas tabelas ou migrar mais bases de dados vindas do SharePoint para o ecossistema Supabase, **TU DEVES** reger todo o código SQL e chamadas JS/TS de API pelas seguintes regras de Ouro:

### 1. RLS (Row Level Security)
- O Postgres do Supabase tem RLS ativado por defeito em todas as tabelas vitais.
- A regra (Policy) principal dita que "Utilizadores autenticados podem ver dados" mas DEVES associar a segurança à coluna `empresa_id` e/ou `user_id`.
- Se a tabela pertencer a um schema diferente de `public` (como `core_personal` ou `documents`), **Tens de** dar explicitamente Grant de Schema Usage para as roles da API (`GRANT USAGE ON SCHEMA [schema_name] TO anon, authenticated, service_role;`).
- Os Grantes também têm de transitar para tabelas específicas. O log de falhas do RLS recusa mostrar dados na Cloud se falhares esta permissão de Grants do esquema.

### 2. Contornar a Bomba-Relógio (O Hard-Limit de 1000 Linhas do PostgREST)
- **NUNCA, mas NUNCA**, chames uma lista total da tabela gigante de entidades principais (Ex: `supabase.from('workers').select('*')` seguido de filtros e varrimentos baseados no JavaScript em local memory).
- O backend do Supabase aborta e oculta nativamente (Limita a 1000 Linhas) qualquer busca paginada que não declare filtros, destruindo toda a integridade referencial dos Joins do frontend a partir do Trabalhador Número 1001. Aconteceu com trabalhadores de letra S para a frente no passado.
- **A Solução e o Padrão de Fetch OBRIGATÓRIO**:
  Se precisares da Tabela A e cruzar a Tabela B (ex: Benefícios Moradia para trabalhadores):
  1. Lês e varres a Tabela "Pequena" / "Específica do Contexto" primeiro usando os filtros da Empresa (`empresa_id`).
  2. Mapeias e constróis em JS (Map) os identificadores originais dos Workers / Entidades (`const workerIds = benefits.map(b => b.worker_id)`).
  3. Fazer o Request Supabase contra O Alvo "Grande" mas utilizando EXCLUSIVAMENTE a operação Sniper **`.in()`** -> `supabase.from('workers').select('*').in('id', workerIds)`. Isto ultrapassa a limitação de busca das linhas infinitas.

### 3. Evita Nested JOINs baseados em Foreign Keys não validados
- Em migrações com schemas diferentes (`core_personal`, `public`) a biblioteca JavaScript do `@supabase/supabase-js` poderá não extrair um Join Implicado (`table!fkey(fields)`) se a Schema Cache não identificar a tipologia exata de relacionamento no PostgREST entre chaves estrangeiras.
- Em caso de Join falhado "Could not find a relationship", separa as Fetch Queries do TypeScript em *Fetch 1* e *Fetch 2*, extrai a correspondência via um `.map(item => item.id)` do Fetch 1, injeta no Fetch 2 num `.in()`, e une localmente através de dicionário/Map de JS (`const colabMap = new Map()`).

### 4. Gestão de Nomes e Atribuições
- Utiliza os Stored Procedures RPC (Ex: `fn_get_active_client_for_worker`) programados dentro do SQL para extrair "A Verdade Máxima" sobre metadados complexos do trabalhador que envolvem cálculos históricos.
- Ficheiros devem ser marcados com Delete / Soft Delete mantendo preferencialmente integridade de foreign key.
