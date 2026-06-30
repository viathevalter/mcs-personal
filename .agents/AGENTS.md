# Regras do Projeto - Controle de Horas e Faturamento

## Regra de Ouro (Ambiente de Produção)
> [!CAUTION]
> **PROIBIDO SUBIR ALTERAÇÕES OU MIGRAR O BANCO DE DADOS EM PRODUÇÃO (PROD)**
> - Até que o período corrente de faturamento (final do mês) seja concluído, **NENHUMA** alteração de banco de dados (schema/migrações) ou deploy de frontend pode ser feito em produção.
> - O aplicativo atual em produção está ativamente em uso pelos trabalhadores e é integrado ao fluxo de sincronização com o SharePoint. Qualquer alteração em prod pode corromper essa integração de faturamento ativa.
> - Todas as modificações e testes devem ser mantidos estritamente confinados ao ambiente de **Desenvolvimento (Dev)**.
