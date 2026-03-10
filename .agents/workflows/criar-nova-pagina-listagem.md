---
description: Como criar uma nova Funcionalidade de Grelha/Tabela no Frontend com o Padrão da Casa
---

Quando for solicitado a desenvolver uma nova página, funcionalidade ou tabela de listagem (ex: Colaboradores, Benefícios, Descontos, Equipamentos, Faturas), a IA e os desenvolvedores **DEVEM** estruturar o código de acordo com o padrão do projeto Mastercorp/Kotrik:

### 1. Localização e Naming Conventions
- A funcionalidade deve viver num sub-módulo dentro de `src/features/[featureName]`.
- Os componentes ficam em `src/features/[featureName]/components/`.
- Os ficheiros principais são chamados de `[FeatureName]Page.tsx`. *Exemplo: `EquipmentsPage.tsx`*.
- A integração na Sidebar é feita no `App.tsx` usando rotas devidamente vigiadas pelo sistema de Autenticação.

### 2. Cabeçalho, Search e Filtros
- Toda a "Data Grid" ou Listagem base do sistema tem de possuir um Header claro com o Título à Esquerda e Botões Principais de Ação à direita (ex: Importar, Novo Aluguer).
- Deve existir sempre um **Searchbar Textual** (Pesquisa Livre).
- Dependendo do domínio da feature, é vital conter combos/ selects de filtrados rápidos: **Filtrar por Cliente** e **Filtrar por Empresa**. Não reinventar estas ComboBoxes. *Usar os Hooks e Selects padronizados locais ou reconstrui-los à imagem dos Holerites / Benefits*.

### 3. Tabela de Dados (Data Grid)
- A tabela tem de suportar **Ordenação** (SortAsc / SortDesc) em cada cabeçalho da grelha de forma independente.
- Se a tabela estiver a tratar Dados de Preços/Moeda estrangeira, o formato nativo usado é *Euro / EU* (Moeda €). Formatação base `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' })` (pode ajustar consoante localização).
- Datas devem ser tratadas pelo `date-fns` ou formatações baseadas no TZX da Europa (pt-PT ou es-ES/pt-BR formatado `dd/MM/yyyy`).

### 4. Fetching e Reatividade (React Query)
- Todos os dados listados devem vir envelopados do Backend em *Hooks Custom* como `useEquipments()`, que utiliza React Query `useQuery` debaixo do véu.
- Este Hook Custom deve sempre viver em `src/features/[featureName]/hooks/`.
- Quando houver submissões de dados ou mutações de UI (Inserções, Updates, Apagados), deves acionar a *invalidação* exata das chaves do React Query para disparar F5 automático transparente (`queryClient.invalidateQueries({ queryKey: ['equipments'] })`).

### 5. Formulários, Inputs e Modais
- A adição ou edição de itens faz-se, de preferência, via `Dialog` (shadcn/ui pop-up modals).
- Usar form states ou react-hook-form local consoante a complexidade.
- Muito Importante: Prevenir UI Bug -> Para evitar o Autofill Agressivo e ecrãs pretos Google Pay nos inputs de Nome/Formulários Internos (comum no Chromium Múltiplo), utiliza sempre atributos de combate como `autoComplete="new-password"`.
- Modais em blocos `components/Edit[X]Dialog.tsx`.
- Usar `useImperativeHandle` se envolver o controle de aberturas de janelas parent->child ou estados subjacentes mais estritos.

### Resumo Operatório:
- Não deitar fora padrões de Tailwind CSS anteriores. Puzzles complexos baseiam-se em flex-layouts clássicos `flex flex-col gap-6` para Main View. Cores do tema derivam de classes como `text-muted-foreground` de acordo com a biblioteca subjacente do `shadcn`.
