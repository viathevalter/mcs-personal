# Fluxos Operacionais: MCS Comercial e Integrações

Este documento mapeia o comportamento do sistema, detalhando o que acontece nos bastidores quando os usuários interagem com o Bloco Comercial. Nenhuma operação de impacto no negócio ocorre sem gerar rastreio (eventos/timeline) ou tarefas (solicitudes).

## User Review Required
> [!IMPORTANT]
> A modelagem abaixo detalha o comportamento da Máquina de Estados e das Automações por fluxo. Revise os gatilhos automáticos, as tarefas esperadas por departamento e as integrações listadas. Após aprovação desta camada comportamental e do motor de playbooks, estaremos finalmente prontos para gerar o SQL.

---

## Fluxo 1: Presupuesto / Estimación

A fase de prospecção, negociação e cálculo de margem de lucro.

- **Ações Humanas:**
  1. Comercial cria uma `estimacion`. Seleciona empresa (do grupo), cliente e obra/local.
  2. Adiciona perfis profissionais (Job Functions). Ajusta quantidades, dias, horas, custos variáveis, tarifas de venda e margens de negociação.
- **Gatilhos Automáticos do Sistema:**
  1. Ao selecionar a Função, o sistema busca no Master Data: Perguntas Técnicas, EPIs obrigatórios, Risco da função e Tarifas/Custos Base.
  2. A cada ajuste numérico (ex: mexer na margem), o sistema recalcula: *Custo Previsto, Receita Prevista e Margem Real*.
- **Status (Máquina de Estados):**
  - `draft`: Em edição inicial.
  - `review`: Pendente de aprovação interna (ex: gerente comercial).
  - `sent`: Enviado ao cliente (aguardando aceite).
  - `approved`: Cliente aceitou. *(Gatilho para Fluxo 2)*
  - `rejected`: Cliente recusou.
  - `expired`: Passou da validade.
  - `superseded`: Uma nova versão do orçamento foi criada e esta tornou-se obsoleta.
- **Rastreabilidade:** Nenhuma timeline complexa gerada, apenas logs transacionais e versionamento da estimativa em caso de alteração após envio (`estimacion_versions`).

---

## Fluxo 2: Conversão Estimación → Pedido

O momento mágico de "Venda Fechada" que aciona a esteira da fábrica.

- **Gatilhos Automáticos (Totalmente Sistêmico ao clicar em "Aprovar"):**
  1. O sistema cria a entidade `pedidos`.
  2. **Snapshot de Imutabilidade:** Copia perfeitamente todos os dados da versão da `estimacion` aprovada para o Pedido e `pedido_items` (tarifas, margens, descrição da função na data de hoje).
  3. **Bloqueio:** O Pedido nasce travado para edições livres. Ninguém altera quantidade ou tarifa digitando num campo.
  4. **Geração de Demanda:** Cria uma `solicitud_operativa` do tipo `new_order`.
  5. **Orquestração via Playbook:** O sistema lê o Playbook de `new_order` e instancia as `solicitud_tareas` para os departamentos:
     - *Tarefa RH:* "Recrutar X perfis" (Status: pending).
     - *Tarefa Logística:* "Separar EPIs para Obra Y" (Status: blocked_by_task_id -> RH).
     - *Tarefa Financeiro:* "Validar crédito e faturamento" (Status: pending).
  6. **Rastreabilidade:** Cria registro em `pedido_events` ("Conversão de Estimación") e no `pedido_status_history` (`draft` -> `active` / `pending_operations`).

---

## Fluxo 3: Pedido Direto

Quando o cliente liga e pede um perfil sem passar por formalização de orçamento.

- **Ações Humanas:**
  1. Comercial cria o Pedido manualmente, preenchendo as informações base e itens sem `source_estimacion_id`.
- **Gatilhos Automáticos:**
  1. O sistema força o congelamento (Snapshot) a partir do Master Data atual no momento do preenchimento.
  2. Registra origem como `direct_order`.
  3. Gera a `solicitud_operativa` do tipo `new_order` e dispara as tarefas via playbook idênticas ao Fluxo 2.

---

## Fluxo 4: Prueba Técnica

Quando um cliente ou o RH exige testar a capacidade técnica ou comportamental do trabalhador antes de consolidá-lo na alocação final.

- **Ações Humanas:**
  1. Usuário (RH/Cliente) solicita uma prova atrelando-a a um Cliente, Obra, Função e (opcional) a um Pedido.
  2. Responsável técnico avalia o candidato e marca resultado.
- **Gatilhos Automáticos:**
  1. Sistema cria `solicitud_operativa`.
  2. **Tipo de Prova (Diferenciação):** Define claramente entre `technical_test` (prova técnica laboratorial antes da contratação) ou `field_trial` (teste prático/experiência diretamente na obra).
  3. Gera tarefa para RH ("Acompanhar Prova") e Operações/Supervisor Técnico ("Aplicar Prova").
- **Status do Resultado:** `pending`, `approved`, `rejected`.
- **Desdobramento Automático:** Se aprovado, a prueba libera a contratação final no RH e pode se converter automaticamente no elo para um item de pedido. Se reprovado, gera notificação para buscar novo candidato.
- **Rastreabilidade:** Log na timeline da Solicitud e no histórico do candidato (`workers`).

---

## Fluxo 5: Reemplazo (Substituição)

Acontece quando um trabalhador abandona a obra, falta sucessivamente ou pede demissão, e a vaga do Pedido fica aberta novamente.

- **Ações Humanas:**
  1. Usuário de Operações/RH localiza o `worker_assignment` (Alocação) atual.
  2. Solicita Reemplazo, informando o Motivo e a Data Desejada de substituição.
- **Gatilhos Automáticos:**
  1. Cria `solicitud_operativa` do tipo `replacement`. Alvos definidos: `target_assignment_id` e `target_pedido_item_id`.
  2. Gera *Tarefa RH*: Buscar substituto (com as mesmas especificações de snapshot do pedido_item).
  3. Quando o RH seleciona e aprova um novo trabalhador para esta vaga:
     - O sistema cria o **novo** `worker_assignment`.
     - Atualiza o `worker_assignment` **antigo** obrigatoriamente para o status **`replaced`** (indicando inequivocamente que a saída gerou uma reposição). Se preferível sistemicamente, pode usar `completed` ou `cancelled` aliado ao motivo, mas `replaced` é altamente recomendado.
     - Alimenta o campo `replacement_of_assignment_id` no novo vínculo para criar a cadeia histórica.
- **Rastreabilidade:** Registra evento em `pedido_events` ("Substituição de Trabalhador"), e atualiza o histórico pessoal de ambos os trabalhadores no Personal.

---

## Fluxo 6: Reubicación (Transferência de Obra/Função)

Acontece quando um operário sai de uma obra/cliente e vai para outra, sem ser demitido.

- **Ações Humanas:**
  1. Usuário seleciona o `worker_assignment` atual.
  2. Define o novo destino (Cliente, Obra e Pedido/Vaga correspondente).
- **Gatilhos Automáticos:**
  1. Cria `solicitud_operativa` do tipo `relocation`.
  2. Playbook gera *Tarefas Departamentais*:
     - Documentação: "Emitir aditivo de transferência".
     - Logística: "Recolher ferramentas da obra X, enviar EPI novo para obra Y".
     - Financeiro: "Ajustar rubricas de custo entre os centros".
  3. **Ao concluir tarefas obrigatórias:** O sistema finaliza o `worker_assignment` original cravando o status **`relocated`** e cria o novo `worker_assignment` no pedido de destino nascendo como **`active`** (se imediato) ou **`planned`** (se data futura).
- **Rastreabilidade:** Log em `pedido_events` (em ambos os pedidos afetados) e no histórico do trabalhador.

---

## Fluxo 7: Integração com Personal (O Elo RH)

Define os limites de atuação: Comercial pede; Personal entrega o ser humano.

- **Regra Humana:** Comercial não pode criar trabalhadores na base nem alocá-los manualmente num pedido. O Comercial apenas cria a demanda (`quantity_requested`).
- **Gatilhos e Tarefas:**
  1. A demanda cria uma tarefa no Kanban do RH.
  2. O RH seleciona um candidato (já existente no `core_personal.workers` ou cadastra um novo).
  3. O RH confirma a contratação/seleção.
  4. **Automação de Sistema:** O sistema insere um registro forte na tabela `worker_assignments` conectando o `worker_id` com o `pedido_item_id`. O número de `quantity_fulfilled` do pedido avança.
  5. A partir desse momento, a gestão do status (ausências, horas, penalidades) passa a ser ditada estritamente pelo módulo Personal/Operações de campo.

---

## Fluxo 8: Integração com Financeiro

Garante a segurança contábil e de faturamento da empresa com base nos números do pedido aprovado.

- **Gatilhos e Eventos:**
  1. A aprovação do Pedido trava o `total_revenue_snapshot` e as `sell_rate_hour_snapshot` por função.
  2. O sistema gera uma notificação e permite (em módulo futuro) a geração de "Previsão de Faturamento" ou "Contas a Receber".
  3. Se houver variação no custo (ex: RH contratou um trabalhador mais caro que a margem prevista), o sistema não altera o Pedido, mas registra que o `worker_assignment` possui uma variação de margem em relação ao Snapshot da vaga.

---

## Fluxo 9: Integração com Logística

Prepara os insumos materiais antes do operário pisar na obra.

- **Gatilhos Automáticos:**
  1. No Playbook de `new_order` ou `relocation`, o sistema avalia os Snapshots do pedido (`includes_epi = true`, `includes_transport = true`).
  2. O sistema cruza as informações: pega o `job_function_id`, varre a matriz Master Data de EPIs (`core_logistica.job_function_epis`) e cria uma tarefa para o armazém.
  3. Tarefa: "Separar Kit de EPIs" constando a lista detalhada (Capacete, Luva Tátil, Bota de Aço, etc).
  4. **Regra de Bloqueio:** Esta tarefa nasce rigorosamente bloqueada (`blocked_by_task_id` apontando para a tarefa do RH), pois o armazém depende do RH efetivar o `worker_assignment` para saber informações físicas cruciais (como tamanho da bota ou numeração do uniforme do trabalhador real escalado).
