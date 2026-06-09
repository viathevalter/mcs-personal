---
description: Padrão Arquitetural para Criação de Novos Módulos ERP (Comercial, Faturamento, Financeiro, Cadastro Geral, Documentação)
---

# Padrão Arquitetural: Novos Módulos MasterCorp

Quando for solicitado para criar um "Novo Projeto" ou "Novo Módulo" (ex: Comercial, Faturamento, Documentação, Financeiro, Cadastro Geral) dentro do ecossistema MasterCorp, a IA deve **OBRIGATORIAMENTE** seguir esta Skill Padrão. O projeto não será um repositório isolado, mas sim um **submódulo (aplicativo interno)** dentro deste ecossistema monorepo React/Vite + Supabase.

## 1. Estrutura de Pastas e Nomenclatura (Frontend)

Cada novo aplicativo/módulo deve ser auto-contido e viver dentro de `src/features/`.
Exemplo para o módulo "Comercial":
```text
src/features/comercial/
├── components/          # Componentes visuais locais do módulo (formulários, tabelas, modais)
├── hooks/               # Custom Hooks (especialmente React Query para chamadas de API)
├── pages/               # Páginas principais que serão roteadas
│   ├── ComercialDashboardPage.tsx
│   └── ComercialSettingsPage.tsx
├── services/            # Funções de interação direta com o Supabase/APIs (ex: api.ts)
├── types/               # Interfaces e tipagens TypeScript exclusivas do módulo
└── utils/               # Funções auxiliares de transformação de dados (se houver)
```

## 2. Padrão de Integração e Roteamento
1. **Rotas (`src/app/router.tsx`):** O novo módulo deve ser importado e ter suas rotas injetadas sob o `BaseLayout` ou `ProtectedRoute`, dependendo do nível de acesso.
   - Exemplo: Rota `/comercial` deve apontar para `<ComercialDashboardPage />`.
2. **Navegação / Sidebar:** O link para o novo módulo deve ser adicionado ao Menu de Navegação Global (Sidebar/Header) utilizando ícones padronizados do `lucide-react`.

## 3. Padrão Backend (Supabase / Banco de Dados)
Como as informações têm base em tabelas do SharePoint que foram/estão sendo migradas, o padrão é:
1. **Tabelas e Tipagem:** Criar as tabelas no Supabase (MasterCorp Dev e Prod) caso não existam. A tipagem do banco de dados deve ser inferida corretamente no frontend.
2. **Row Level Security (RLS):** Garantir que apenas usuários com a "Role" adequada consigam visualizar os dados (ex: apenas setor comercial vê comercial).
3. **Serviços RPC / Edge Functions:** Se houver lógicas pesadas ou sincronizações com SharePoint, devem ser isoladas em chamadas RPC no banco ou Edge Functions.

## 4. UI/UX e Componentização (shadcn/ui)
1. **Reaproveitamento:** NUNCA criar componentes base do zero (botões, inputs, dialogs). Utilizar **sempre** os componentes primitivos da pasta `src/components/ui/` (Radix UI / shadcn).
2. **Formulários Seguros:** Todo formulário de novo cadastro (ex: Novo Pedido Comercial) deve:
   - Usar `react-hook-form`.
   - Ter validação rígida via `zod`.
   - Utilizar componentes de formulário integrados como `<Form>`, `<FormField>`, etc.
3. **Tabelas de Dados:** Listagens devem utilizar a inteligência do `@tanstack/react-table` se forem complexas, suportando ordenação e paginação.

## 5. Gerenciamento de Estado (React Query)
1. Não usar `useEffect` para fetch de dados.
2. Todo o Fetching e Mutation (Insert/Update) deve usar o `@tanstack/react-query`.
3. Criar os hooks localmente: `useComercialData()`, `useCreatePedido()`.
4. Após mutações de sucesso, invalidar as query keys relacionadas (`queryClient.invalidateQueries({ queryKey: ['comercial'] })`) para interface reativa sem reload.

## 6. Passo a Passo Inicial (Template de Ação)
Ao iniciar a criação de um desses 5 módulos, a IA deve:
1. Pedir/Definir a estrutura de dados (campos do banco) necessários para a funcionalidade.
2. Gerar o schema de Zod e as tipagens TypeScript (`types/`).
3. Gerar os hooks de requisição React Query (`hooks/`).
4. Criar as páginas base (`pages/`) contendo o esqueleto (Header + Tabela/Dashboard).
5. Criar os modais de formulário (`components/`).
6. Adicionar a rota em `router.tsx` e o link de acesso na interface.

---
*Este é o documento "Skill Padrão". Sempre que o desenvolvedor invocar a criação de um módulo como Comercial, Faturamento, Financeiro, Documentação ou Cadastro Geral, leia e aplique este workflow na íntegra.*
